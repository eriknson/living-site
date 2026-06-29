"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type DesignModeStatus = "idle" | "warming" | "ready" | "editing" | "error";

/**
 * Module-level session store. It survives client-side (soft) navigation because
 * the module stays loaded, and resets on a full page reload because the module
 * is re-evaluated — exactly the "session-only" behavior we want.
 */
interface DesignSession {
  agentId: string | null;
  original: string | null;
  workingHtml: string | null;
  past: string[];
  future: string[];
}

const session: DesignSession = {
  agentId: null,
  original: null,
  workingHtml: null,
  past: [],
  future: [],
};

export function getDesignSession(): DesignSession {
  return session;
}

export function resetDesignSession() {
  session.agentId = null;
  session.original = null;
  session.workingHtml = null;
  session.past = [];
  session.future = [];
}

interface DesignModeContextValue {
  active: boolean;
  status: DesignModeStatus;
  error: string | null;
  agentId: string | null;
  sessionId: string;
  activate: () => void;
  deactivate: () => void;
  setAgentId: (id: string) => void;
  setStatus: (status: DesignModeStatus) => void;
  setError: (error: string | null) => void;
}

const DesignModeContext = createContext<DesignModeContextValue | null>(null);

export function useDesignMode(): DesignModeContextValue {
  const ctx = useContext(DesignModeContext);
  if (!ctx) {
    throw new Error("useDesignMode must be used within a DesignModeProvider");
  }
  return ctx;
}

/** Safe variant for components (e.g. the global menu bar) that may render
 * outside a provider on other routes. Returns null instead of throwing. */
export function useDesignModeOptional(): DesignModeContextValue | null {
  return useContext(DesignModeContext);
}

export function DesignModeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<DesignModeStatus>(
    session.agentId ? "ready" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentIdState] = useState<string | null>(session.agentId);

  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current) {
    sessionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const setAgentId = useCallback((id: string) => {
    session.agentId = id;
    setAgentIdState(id);
  }, []);

  const activate = useCallback(() => {
    setActive(true);
    setError(null);
    // The first edit lazily creates the cloud agent (a cloud agent is only
    // resumable after a run, so pre-creating one yields unusable ids).
    setStatus("ready");
  }, []);

  const deactivate = useCallback(() => {
    setActive(false);
    setError(null);
    // Drop the working snapshot + agent so each design session starts clean.
    resetDesignSession();
    setAgentIdState(null);
    setStatus("idle");
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+Shift+D toggles Design Mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        setActive((prev) => {
          if (prev) {
            resetDesignSession();
            setAgentIdState(null);
            setStatus("idle");
            return false;
          }
          setError(null);
          setStatus("ready");
          return true;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <DesignModeContext.Provider
      value={{
        active,
        status,
        error,
        agentId,
        sessionId: sessionIdRef.current,
        activate,
        deactivate,
        setAgentId,
        setStatus,
        setError,
      }}
    >
      {children}
    </DesignModeContext.Provider>
  );
}
