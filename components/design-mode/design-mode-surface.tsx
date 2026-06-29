"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Undo2, Redo2, RotateCcw, X, ArrowUp, Loader2 } from "lucide-react";
import { useDesignMode, getDesignSession } from "./design-mode-provider";
import { computePath, findByPath, describe, meaningfulFrom } from "./element-picker";
import { buildWidgetSrcdoc } from "@/lib/design-mode/prompt";

const DESIGN_ROOT_SELECTOR = "[data-design-root]";
const MAX_HISTORY = 50;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Selection {
  path: number[];
  rect: Rect;
  tag: string;
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Build an isolated, sandboxed iframe for an interactive widget. `allow-scripts`
 * without `allow-same-origin` means the frame runs in a null origin: its JS
 * cannot read the page, cookies, or storage, and (with the srcdoc CSP) cannot
 * reach the network. Session-only, like every other design-mode edit.
 */
function createWidgetIframe(fragment: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("data-design-widget", "true");
  iframe.setAttribute("title", "Interactive widget");
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.height = "260px";
  iframe.style.margin = "1rem 0";
  iframe.srcdoc = buildWidgetSrcdoc(fragment);
  return iframe;
}

/**
 * DesignModeSurface wraps the editable homepage content. When inactive it
 * renders `children` untouched. When active it hides them, mounts a one-time
 * snapshot of the editable root into its own container, and overlays the
 * picker, prompt input, and toolbar. All edits are applied imperatively to the
 * snapshot (kept off React reconciliation) and are session-only.
 */
export function DesignModeSurface({ children }: { children: ReactNode }) {
  const { active, agentId, sessionId, setAgentId, setStatus, deactivate } =
    useDesignMode();

  const liveRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState<{ rect: Rect; label: string } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => setMounted(true), []);

  const refreshHistoryFlags = useCallback(() => {
    const s = getDesignSession();
    setCanUndo(s.past.length > 0);
    setCanRedo(s.future.length > 0);
  }, []);

  const captureRoot = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    rootRef.current =
      (host.querySelector(DESIGN_ROOT_SELECTOR) as HTMLElement | null) ??
      (host.firstElementChild as HTMLElement | null);
  }, []);

  // Snapshot the live content into the editable host once on activation.
  useEffect(() => {
    if (!active) {
      setSelection(null);
      setHover(null);
      setInstruction("");
      setErrorMsg(null);
      return;
    }
    const host = hostRef.current;
    const live = liveRef.current;
    if (!host || !live) return;

    const s = getDesignSession();
    let html = s.workingHtml;
    if (!html) {
      const root = live.querySelector(DESIGN_ROOT_SELECTOR);
      html = root ? root.outerHTML : live.innerHTML;
      s.original = html;
      s.workingHtml = html;
      s.past = [];
      s.future = [];
    }
    host.innerHTML = html;
    captureRoot();
    refreshHistoryFlags();
    setSelection(null);
    setHover(null);
  }, [active, captureRoot, refreshHistoryFlags]);

  const syncWorking = useCallback(() => {
    const host = hostRef.current;
    if (host) getDesignSession().workingHtml = host.innerHTML;
  }, []);

  const pushHistory = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const s = getDesignSession();
    s.past.push(host.innerHTML);
    if (s.past.length > MAX_HISTORY) s.past.shift();
    s.future = [];
    refreshHistoryFlags();
  }, [refreshHistoryFlags]);

  // ----- Picker interactions -----
  const onMove = useCallback(
    (e: MouseEvent) => {
      if (busy) return;
      const root = rootRef.current;
      if (!root) return;
      const el = meaningfulFrom(e.target, root);
      if (!el) {
        setHover(null);
        return;
      }
      setHover({ rect: rectOf(el), label: describe(el).tagName });
    },
    [busy]
  );

  const onLeave = useCallback(() => setHover(null), []);

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (busy) return;
      const root = rootRef.current;
      if (!root) return;
      const el = meaningfulFrom(e.target, root);
      if (!el) return;
      // Beat links / buttons inside the snapshot.
      e.preventDefault();
      e.stopPropagation();
      setSelection({ path: computePath(el, root), rect: rectOf(el), tag: describe(el).tagName });
      setHover(null);
      setErrorMsg(null);
    },
    [busy]
  );

  useEffect(() => {
    if (!active) return;
    const host = hostRef.current;
    if (!host) return;
    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);
    host.addEventListener("click", onClick, true);
    return () => {
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
      host.removeEventListener("click", onClick, true);
    };
  }, [active, onMove, onLeave, onClick]);

  // Keep highlight rects aligned on scroll / resize.
  useEffect(() => {
    if (!active) return;
    const update = () => {
      const root = rootRef.current;
      setSelection((sel) => {
        if (!sel || !root) return sel;
        const el = findByPath(root, sel.path);
        return el ? { ...sel, rect: rectOf(el) } : sel;
      });
      setHover(null);
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active]);

  // Auto-size widget iframes from height messages they post.
  useEffect(() => {
    if (!active) return;
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { __designWidget?: boolean; height?: number } | null;
      if (!data || data.__designWidget !== true || typeof data.height !== "number") return;
      const host = hostRef.current;
      if (!host) return;
      const frames = host.querySelectorAll<HTMLIFrameElement>("iframe[data-design-widget]");
      frames.forEach((frame) => {
        if (frame.contentWindow === e.source) {
          frame.style.height = `${Math.min(Math.max(data.height!, 80), 2000)}px`;
        }
      });
      // Keep the selection highlight aligned after a widget resizes.
      setSelection((sel) => {
        const root = rootRef.current;
        if (!sel || !root) return sel;
        const el = findByPath(root, sel.path);
        return el ? { ...sel, rect: rectOf(el) } : sel;
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [active]);

  // ----- History actions -----
  const restore = useCallback(
    (html: string) => {
      const host = hostRef.current;
      if (!host) return;
      host.innerHTML = html;
      captureRoot();
      syncWorking();
      setSelection(null);
      setHover(null);
    },
    [captureRoot, syncWorking]
  );

  const undo = useCallback(() => {
    const host = hostRef.current;
    const s = getDesignSession();
    if (!host || s.past.length === 0) return;
    s.future.push(host.innerHTML);
    restore(s.past.pop()!);
    refreshHistoryFlags();
  }, [restore, refreshHistoryFlags]);

  const redo = useCallback(() => {
    const host = hostRef.current;
    const s = getDesignSession();
    if (!host || s.future.length === 0) return;
    s.past.push(host.innerHTML);
    restore(s.future.pop()!);
    refreshHistoryFlags();
  }, [restore, refreshHistoryFlags]);

  const reset = useCallback(() => {
    const s = getDesignSession();
    if (!s.original) return;
    pushHistory();
    restore(s.original);
  }, [pushHistory, restore]);

  // ----- Submit an edit -----
  const submit = useCallback(async () => {
    const sel = selection;
    const root = rootRef.current;
    if (!sel || !root || busy || !instruction.trim()) return;
    const el = findByPath(root, sel.path);
    if (!el) {
      setErrorMsg("Lost track of that element — pick it again.");
      return;
    }

    setBusy(true);
    setStatus("editing");
    setStatusMsg("Thinking…");
    setErrorMsg(null);
    pushHistory();

    const payload = {
      mode: "edit",
      sessionId,
      agentId,
      instruction: instruction.trim(),
      element: {
        tagName: el.tagName.toLowerCase(),
        classes: Array.from(el.classList),
        text: (el.textContent || "").trim().slice(0, 200),
        outerHTML: el.outerHTML,
        selectorPath: sel.path,
      },
      pageContext: root.outerHTML,
    };

    let edited: string | null = null;
    let editedKind: "element" | "widget" = "element";
    try {
      const res = await fetch("/api/design-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Request failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let ev: Record<string, unknown> | null = null;
          try {
            ev = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (!ev) continue;
          if (ev.type === "agentId" && typeof ev.agentId === "string") {
            setAgentId(ev.agentId);
          } else if (ev.type === "status") {
            setStatusMsg((ev.message as string) || "Working…");
          } else if (ev.type === "step") {
            setStatusMsg((ev.label as string) || "Working…");
          } else if (ev.type === "complete") {
            edited = (ev.html as string) || null;
            if (ev.kind === "widget") editedKind = "widget";
          } else if (ev.type === "error") {
            throw new Error((ev.message as string) || "Edit failed");
          }
        }
      }

      if (!edited) throw new Error("No changes were produced.");

      // Apply the edit imperatively and re-select the changed node.
      const target = findByPath(rootRef.current!, sel.path);
      if (target) {
        if (editedKind === "widget") {
          // Add an isolated interactive widget right after the selection.
          const iframe = createWidgetIframe(edited);
          target.after(iframe);
          syncWorking();
          const root = rootRef.current!;
          setSelection({
            path: computePath(iframe, root),
            rect: rectOf(iframe),
            tag: "widget",
          });
        } else {
          target.outerHTML = edited;
          syncWorking();
          const re = findByPath(rootRef.current!, sel.path);
          if (re) {
            setSelection({ path: sel.path, rect: rectOf(re), tag: describe(re).tagName });
          }
        }
      }
      setInstruction("");
      setStatusMsg("");
    } catch (e) {
      // Roll back the optimistic history push since nothing was applied.
      const s = getDesignSession();
      if (s.past.length) {
        s.past.pop();
        refreshHistoryFlags();
      }
      setErrorMsg(e instanceof Error ? e.message : "Edit failed");
      setStatusMsg("");
    } finally {
      setBusy(false);
      setStatus("ready");
    }
  }, [
    selection,
    busy,
    instruction,
    sessionId,
    agentId,
    pushHistory,
    setStatus,
    setAgentId,
    syncWorking,
    refreshHistoryFlags,
  ]);

  // Escape clears selection, or exits design mode when nothing is selected.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (busy) return;
      if (selection) {
        setSelection(null);
        setInstruction("");
        setErrorMsg(null);
      } else {
        deactivate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, busy, selection, deactivate]);

  return (
    <>
      <div ref={liveRef} style={{ display: active ? "none" : "contents" }}>
        {children}
      </div>

      {active && (
        <div
          ref={hostRef}
          data-design-edit-host
          className="flex flex-col flex-1 min-h-0"
          style={{ userSelect: "none", cursor: busy ? "progress" : "crosshair" }}
        />
      )}

      {active && mounted &&
        createPortal(
          <DesignOverlay
            hover={hover}
            selection={selection}
            busy={busy}
            instruction={instruction}
            statusMsg={statusMsg}
            errorMsg={errorMsg}
            canUndo={canUndo}
            canRedo={canRedo}
            onInstruction={setInstruction}
            onSubmit={submit}
            onCancelSelection={() => {
              setSelection(null);
              setInstruction("");
              setErrorMsg(null);
            }}
            onUndo={undo}
            onRedo={redo}
            onReset={reset}
            onExit={deactivate}
          />,
          document.body
        )}
    </>
  );
}

// ---------- Overlay (portaled to body) ----------

interface OverlayProps {
  hover: { rect: Rect; label: string } | null;
  selection: Selection | null;
  busy: boolean;
  instruction: string;
  statusMsg: string;
  errorMsg: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onInstruction: (v: string) => void;
  onSubmit: () => void;
  onCancelSelection: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onExit: () => void;
}

function DesignOverlay(props: OverlayProps) {
  const {
    hover,
    selection,
    busy,
    instruction,
    statusMsg,
    errorMsg,
    canUndo,
    canRedo,
    onInstruction,
    onSubmit,
    onCancelSelection,
    onUndo,
    onRedo,
    onReset,
    onExit,
  } = props;

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      <style>{`[data-design-edit-host], [data-design-edit-host] * { cursor: ${busy ? "progress" : "crosshair"} !important; }`}</style>

      {hover && !selection && (
        <HighlightBox rect={hover.rect} label={hover.label} variant="hover" />
      )}
      {selection && (
        <HighlightBox rect={selection.rect} label={selection.tag} variant="selected" busy={busy} />
      )}

      {selection && (
        <PromptPanel
          rect={selection.rect}
          tag={selection.tag}
          value={instruction}
          busy={busy}
          statusMsg={statusMsg}
          errorMsg={errorMsg}
          onChange={onInstruction}
          onSubmit={onSubmit}
          onCancel={onCancelSelection}
        />
      )}

      <Toolbar
        busy={busy}
        statusMsg={statusMsg}
        hasSelection={!!selection}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onReset={onReset}
        onExit={onExit}
      />
    </div>
  );
}

function HighlightBox({
  rect,
  label,
  variant,
  busy,
}: {
  rect: Rect;
  label: string;
  variant: "hover" | "selected";
  busy?: boolean;
}) {
  const selected = variant === "selected";
  return (
    <div
      className="absolute pointer-events-none rounded-[3px] transition-[top,left,width,height] duration-75"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        border: selected ? "2px solid #2563eb" : "1.5px dashed rgba(37,99,235,0.7)",
        background: selected ? "rgba(37,99,235,0.08)" : "rgba(37,99,235,0.05)",
        boxShadow: selected ? "0 0 0 9999px rgba(0,0,0,0.02)" : undefined,
      }}
    >
      <span
        className="absolute -top-[22px] left-0 px-1.5 py-0.5 rounded text-[11px] font-medium leading-none text-white whitespace-nowrap"
        style={{ background: selected ? "#2563eb" : "rgba(37,99,235,0.85)" }}
      >
        {busy ? "editing…" : label}
      </span>
      {busy && (
        <div className="absolute inset-0 rounded-[3px] bg-blue-500/10 animate-pulse" />
      )}
    </div>
  );
}

function PromptPanel({
  rect,
  tag,
  value,
  busy,
  statusMsg,
  errorMsg,
  onChange,
  onSubmit,
  onCancel,
}: {
  rect: Rect;
  tag: string;
  value: string;
  busy: boolean;
  statusMsg: string;
  errorMsg: string | null;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const PANEL_WIDTH = 320;

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const left = Math.min(Math.max(rect.left, 8), vw - PANEL_WIDTH - 8);
  const belowTop = rect.top + rect.height + 8;
  const placeBelow = belowTop + 150 < vh;
  const top = placeBelow ? belowTop : Math.max(8, rect.top - 158);

  return (
    <div
      className="absolute pointer-events-auto rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#161616] shadow-xl shadow-black/20"
      style={{ top, left, width: PANEL_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
          {`<${tag}>`}
        </span>
        <button
          onClick={onCancel}
          className="text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-colors"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <textarea
          ref={inputRef}
          value={value}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Restyle it, or add a feature (e.g. a calculator)…"
          rows={2}
          className="w-full resize-none bg-transparent text-[14px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none leading-relaxed"
        />

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[12px] text-gray-400 dark:text-gray-500 truncate pr-2">
            {busy ? statusMsg || "Working…" : errorMsg ? (
              <span className="text-red-500">{errorMsg}</span>
            ) : (
              "Enter to apply"
            )}
          </span>
          <button
            onClick={onSubmit}
            disabled={busy || !value.trim()}
            className="w-7 h-7 shrink-0 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Apply edit"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toolbar({
  busy,
  statusMsg,
  hasSelection,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onExit,
}: {
  busy: boolean;
  statusMsg: string;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onExit: () => void;
}) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1 rounded-full border border-black/10 dark:border-white/15 bg-white/95 dark:bg-[#161616]/95 backdrop-blur-sm shadow-lg shadow-black/10 px-1.5 py-1"
      style={{ top: "calc(0.75rem + env(safe-area-inset-top) + 3.5rem)" }}
    >
      <span className="flex items-center gap-1.5 px-2.5 text-[13px] font-medium text-blue-600 dark:text-blue-400">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Design
      </span>

      <span className="text-[12px] text-black/40 dark:text-white/40 px-1 hidden sm:inline max-w-[180px] truncate">
        {busy ? statusMsg || "Working…" : hasSelection ? "Restyle or add a feature" : "Click an element"}
      </span>

      <div className="w-px h-4 bg-black/10 dark:bg-white/15 mx-0.5" />

      <ToolbarButton onClick={onUndo} disabled={!canUndo || busy} label="Undo">
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onRedo} disabled={!canRedo || busy} label="Redo">
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onReset} disabled={busy} label="Reset">
        <RotateCcw className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-4 bg-black/10 dark:bg-white/15 mx-0.5" />

      <button
        onClick={onExit}
        disabled={busy}
        className="flex items-center gap-1 px-2.5 h-7 rounded-full text-[13px] text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
      >
        Done
      </button>
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-7 h-7 flex items-center justify-center rounded-full text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black/90 dark:hover:text-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
