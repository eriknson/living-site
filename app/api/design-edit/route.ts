/**
 * POST /api/design-edit - Session-only "Design Mode" element editor.
 *
 * The first edit of a session creates a cloud agent (lazily) and returns its
 * `agentId`; later edits reuse it via `Agent.resume(agentId)` so the agent stays
 * warm for the session. If a stored agent has expired/gone away, the handler
 * transparently creates a fresh one and retries. Nothing is written to the repo
 * — edits live only in the visitor's browser session.
 *
 * Note: a cloud agent is only resumable after it has had at least one run, so we
 * do NOT pre-create an agent ahead of the first edit (that produced unusable,
 * `agent_not_found` ids).
 */

import { NextRequest } from "next/server";
import {
  buildEditPrompt,
  parseEditedHtml,
  sanitizeHtml,
  isWidgetHtml,
  type DesignElementPayload,
} from "@/lib/design-mode/prompt";

export const maxDuration = 300;

const CURSOR_API_KEY = process.env.CURSOR_API_KEY;
const MODEL = { id: "composer-2.5" };

// Best-effort rate limiting / cost control. Module-level state is per-instance
// on serverless, which is acceptable here (same caveat as /api/generate).
const EDIT_COOLDOWN_MS = 1500;
const MAX_CONCURRENT_EDITS = 6;
const sessionLastEdit = new Map<string, number>();
let activeEdits = 0;

function sseMessage(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/** True when an error indicates the (resumed) cloud agent no longer exists. */
function isAgentGone(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  const code = (e?.code || "").toLowerCase();
  const msg = (e?.message || "").toLowerCase();
  return (
    code.includes("not_found") ||
    code.includes("not-found") ||
    msg.includes("not found") ||
    msg.includes("agent not")
  );
}

/** Permissively pull HTML out of a write-style tool call (agent fallback). */
function extractWrittenHtml(toolCall: { name?: string; args?: unknown }): string | null {
  const name = (toolCall.name || "").toLowerCase();
  if (!name.includes("write") && !name.includes("edit")) return null;
  const args = toolCall.args as Record<string, unknown> | undefined;
  if (!args || typeof args !== "object") return null;
  for (const key of ["contents", "content", "text", "file_content", "new_string"]) {
    const val = args[key];
    if (typeof val === "string" && val.includes("<")) return val;
  }
  return null;
}

export async function GET() {
  return new Response(
    JSON.stringify({ configured: !!CURSOR_API_KEY }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(request: NextRequest) {
  if (!CURSOR_API_KEY) {
    return new Response(
      JSON.stringify({ error: "CURSOR_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // ----- Parse + validate request -----
  let body: {
    sessionId?: string;
    agentId?: string | null;
    instruction?: string;
    element?: DesignElementPayload;
    pageContext?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { sessionId, agentId, instruction, element, pageContext } = body;
  if (!instruction?.trim() || !element?.outerHTML) {
    return new Response(
      JSON.stringify({ error: "Missing instruction or element" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const sid = sessionId || "anon";
  const now = Date.now();
  const last = sessionLastEdit.get(sid) ?? 0;
  if (now - last < EDIT_COOLDOWN_MS) {
    return new Response(
      JSON.stringify({ error: "Slow down a moment, then try again." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }
  if (activeEdits >= MAX_CONCURRENT_EDITS) {
    return new Response(
      JSON.stringify({ error: "Too many edits in flight. Try again shortly." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }
  sessionLastEdit.set(sid, now);
  activeEdits++;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(sseMessage(data)));
        } catch {
          // controller closed
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let agent: any = null;
      try {
        const { Agent } = await import("@cursor/sdk");

        send({ type: "status", message: "Connecting…" });

        const prompt = buildEditPrompt({
          instruction: instruction.trim(),
          element,
          pageContext: pageContext || "",
        });

        let deltaText = "";
        let toolHtml: string | null = null;
        const onDelta = ({
          update,
        }: {
          update: { type: string; text?: string; toolCall?: { name?: string; args?: unknown } };
        }) => {
          if (update.type === "text-delta" && update.text) {
            deltaText += update.text;
          }
          if (
            (update.type === "partial-tool-call" || update.type === "tool-call-started") &&
            update.toolCall
          ) {
            const html = extractWrittenHtml(update.toolCall);
            if (html) toolHtml = html;
          }
        };

        // Resume the session's warm agent, else create one. `send()` (not
        // `resume()`) is what surfaces `agent_not_found`, so the whole attempt
        // is the unit we retry with a fresh agent.
        const attempt = async (
          useAgentId: string | null
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ): Promise<{ run: any; created: boolean }> => {
          let created = false;
          agent = null;
          if (useAgentId) {
            try {
              agent = await Agent.resume(useAgentId, { apiKey: CURSOR_API_KEY });
            } catch {
              agent = null;
            }
          }
          if (!agent) {
            agent = await Agent.create({ apiKey: CURSOR_API_KEY, model: MODEL, cloud: {} });
            created = true;
          }
          const run = await agent.send(prompt, { onDelta });
          return { run, created };
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let run: any;
        let created = false;
        try {
          ({ run, created } = await attempt(agentId ?? null));
        } catch (err) {
          if (agentId && isAgentGone(err)) {
            // Stale/expired agent id — discard it and start a clean session.
            deltaText = "";
            toolHtml = null;
            if (agent) {
              try {
                await agent[Symbol.asyncDispose]();
              } catch {
                // ignore
              }
              agent = null;
            }
            ({ run, created } = await attempt(null));
          } else {
            throw err;
          }
        }

        if (created) send({ type: "agentId", agentId: agent.agentId });
        send({ type: "status", message: "Editing…" });

        let assistantText = "";
        for await (const event of run.stream()) {
          if (event.type === "assistant") {
            for (const block of event.message.content) {
              if (block.type === "text") assistantText += block.text;
            }
          }
          if (event.type === "tool_call") {
            send({ type: "step", label: `Using ${event.name || "tool"}` });
          }
          if (event.type === "status") {
            send({ type: "status", message: event.message || "Working…" });
          }
        }

        const raw =
          parseEditedHtml(assistantText) ||
          parseEditedHtml(deltaText) ||
          (toolHtml ? parseEditedHtml(toolHtml) || toolHtml : null);

        if (raw) {
          if (isWidgetHtml(raw)) {
            // Interactive widget — JS is intended and will run inside a
            // sandboxed, network-blocked iframe on the client. Do not strip.
            send({ type: "complete", kind: "widget", html: raw });
          } else {
            // Plain visual/content edit spliced into the live page — strip JS.
            send({ type: "complete", kind: "element", html: sanitizeHtml(raw) });
          }
        } else {
          send({ type: "error", message: "Agent finished but produced no HTML edit." });
        }
      } catch (error) {
        const err = error as Error & { code?: string };
        const msg = err.code ? `[${err.code}] ${err.message}` : err.message || "Edit failed";
        console.error("[/api/design-edit] error:", msg);
        send({ type: "error", message: msg });
      } finally {
        activeEdits = Math.max(0, activeEdits - 1);
        if (agent) {
          try {
            await agent[Symbol.asyncDispose]();
          } catch {
            // ignore
          }
        }
        controller.close();
      }
    },
    cancel() {
      activeEdits = Math.max(0, activeEdits - 1);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
