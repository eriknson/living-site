/**
 * POST /api/generate - Generate remix site via Cursor SDK
 *
 * Flow:
 * 1. Create cloud agent on the repo
 * 2. Stream events via onDelta (partial HTML) + run.stream() (steps/status)
 * 3. Download final artifact
 * 4. Return HTML
 */

import { NextRequest } from "next/server";

export const maxDuration = 300;

const CURSOR_API_KEY = process.env.CURSOR_API_KEY;

// Rate limiting
let lastGeneration = 0;
const RATE_LIMIT_MS = 60 * 1000;

// In-flight generation tracking
let generationInProgress = false;
let currentRunCancel: (() => Promise<void>) | null = null;

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head><title>Erik</title></head>
<body>
  <h1>Erik</h1>
  <p>Product designer building with AI. Based in Stockholm, Sweden.</p>
  <p>Links: <a href="https://x.com/flowstated">X</a>, <a href="https://github.com/eriknson">GitHub</a>, <a href="mailto:contact@eriks.design?subject=Hej">Email</a></p>
</body>
</html>`;

const DEFAULT_DIRECTION = `Create a beautiful, modern, and unique personal website. 
Be creative with the design - try something unexpected like a game-inspired UI, 
a retro aesthetic, brutalist design, or an elegant minimal approach.
Surprise me with something fresh and distinctive.`;

async function loadReferenceHtml(): Promise<string> {
  try {
    const response = await fetch("https://eriks.design/reference", {
      headers: { "User-Agent": "living-site-generator" },
    });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // fall through
  }
  return FALLBACK_HTML;
}

async function buildRemixPrompt(userDirection?: string | null): Promise<string> {
  const referenceHtml = await loadReferenceHtml();
  const direction = userDirection?.trim() || DEFAULT_DIRECTION;

  return `You are an expert creative technologist and web designer.
Your task is to create a creative "remix" of Erik's personal website based on the user's direction.

## Reference Site (source of content)
Use the text content, links, and information from this HTML. You can completely change the structure, layout, colors, fonts, and CSS.
\`\`\`html
${referenceHtml}
\`\`\`

## Creative Direction
${direction}

## Output Requirements
1. Use the Write tool to create a SINGLE HTML file at \`generated/live.html\` in one shot — do NOT use edit_file or patch the file incrementally.
2. Include ALL CSS inline within a <style> tag (no external stylesheets)
3. Include any JS inline within a <script> tag if needed
4. The site must be fully responsive and look great on mobile
5. Support dark mode with @media (prefers-color-scheme: dark)

## Design Guidelines
- Be BOLD and creative - don't make a generic website
- If the user asks for "8-bit", make it look like a retro pixel game
- If they ask for "brutalist", make it raw and industrial
- If they ask for "luxury", make it feel premium and elegant
- Match the aesthetic to the creative direction

## Content to Keep
- Name: Erik
- Role: Product designer building with AI
- Location: Stockholm, Sweden
- Links: X (@flowstated), GitHub (eriknson), Email (contact@eriks.design)

## IMPORTANT
- Create something original and distinctive
- The output must be a valid, standalone HTML file
- Write the entire file content in a single Write tool call`;
}

/**
 * Defensively extract HTML content from a write tool call's args.
 * The SDK warns that tool arg shapes are not stable — be permissive.
 */
function extractWrittenHtml(toolCall: { name?: string; args?: unknown }): string | null {
  const name = (toolCall.name || "").toLowerCase();
  if (!name.includes("write")) return null;

  const args = toolCall.args as Record<string, unknown> | undefined;
  if (!args || typeof args !== "object") return null;

  const pathField = (args.file_path || args.path || args.target_file || "") as string;
  if (pathField && !pathField.includes("live.html")) return null;

  for (const key of ["contents", "content", "text", "file_content", "new_string"]) {
    const val = args[key];
    if (typeof val === "string" && val.length > 20) return val;
  }
  return null;
}

function sseMessage(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  if (!CURSOR_API_KEY) {
    return new Response(
      JSON.stringify({ error: "CURSOR_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const now = Date.now();
  if (now - lastGeneration < RATE_LIMIT_MS) {
    const remainingSec = Math.ceil(
      (RATE_LIMIT_MS - (now - lastGeneration)) / 1000
    );
    return new Response(
      JSON.stringify({ error: `Rate limited. Try again in ${remainingSec} seconds.`, retryAfter: remainingSec }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  if (generationInProgress) {
    return new Response(
      JSON.stringify({ error: "Generation already in progress" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  lastGeneration = now;
  generationInProgress = true;

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
        let userDirection: string | null = null;
        try {
          const body = await request.json();
          userDirection = body.prompt || null;
        } catch {
          // no body
        }

        const prompt = await buildRemixPrompt(userDirection);

        send({ type: "status", status: "launching", message: "Launching cloud agent..." });

        const { Agent } = await import("@cursor/sdk");

        console.log("[/api/generate] SDK imported, creating agent...");
        agent = await Agent.create({
          apiKey: CURSOR_API_KEY,
          model: {
            id: "grok-4.5",
            params: [
              { id: "effort", value: "high" },
              { id: "fast", value: "true" },
            ],
          },
          cloud: {},
        });
        console.log("[/api/generate] Agent created:", agent.agentId);

        send({
          type: "status",
          status: "running",
          message: "Agent is starting...",
          agentId: agent.agentId,
        });

        let stepIdx = 0;
        // Track the most recent HTML extracted from the agent's tool calls.
        // Used as a fallback if downloadArtifact fails after the run completes.
        let lastStreamedHtml: string | null = null;

        console.log("[/api/generate] Sending prompt, length:", prompt.length);
        const run = await agent.send(prompt, {
          onDelta: ({ update }: { update: { type: string; text?: string; toolCall?: { name?: string; args?: unknown } } }) => {
            if (update.type === "partial-tool-call" || update.type === "tool-call-started") {
              if (update.toolCall) {
                const html = extractWrittenHtml(update.toolCall);
                if (html) {
                  lastStreamedHtml = html;
                  send({ type: "partial_html", html });
                }
              }
            }
            if (update.type === "text-delta" && update.text) {
              send({ type: "text_delta", text: update.text });
            }
          },
        });

        currentRunCancel = () => run.cancel();
        console.log("[/api/generate] Run started:", run.id);

        for await (const event of run.stream()) {
          if (event.type === "assistant") {
            for (const block of event.message.content) {
              if (block.type === "text" && block.text.trim().length > 10) {
                const firstLine = block.text.split("\n")[0].trim();
                const summary = firstLine.length > 60 ? firstLine.slice(0, 57) + "..." : firstLine;
                send({
                  type: "step",
                  id: `${event.run_id}-${stepIdx++}`,
                  text: block.text,
                  summary,
                });
              }
            }
          }
          if (event.type === "tool_call") {
            const toolName = event.name || "tool";
            send({
              type: "step",
              id: `${event.run_id}-tool-${event.call_id}`,
              text: `Using ${toolName}`,
              summary: toolName,
            });
          }
          if (event.type === "status") {
            send({
              type: "status",
              status: (event.status || "running").toLowerCase(),
              message: event.message || "Working...",
            });
          }
        }

        // Fetch final canonical HTML from artifact
        let finalHtml: string | undefined;
        let downloadError: string | undefined;
        try {
          const buf = await agent.downloadArtifact("generated/live.html");
          finalHtml = buf.toString("utf8");
        } catch (e) {
          const err = e as Error;
          downloadError = err.message || String(err);
          console.warn("[/api/generate] downloadArtifact('generated/live.html') failed:", downloadError);

          // Try to discover what the agent actually wrote and grab the largest HTML-ish artifact.
          try {
            const artifacts = await agent.listArtifacts();
            console.log(
              "[/api/generate] Available artifacts:",
              artifacts.map((a: { path: string; sizeBytes: number }) => `${a.path} (${a.sizeBytes}b)`)
            );
            const htmlArtifacts = artifacts
              .filter((a: { path: string }) => a.path.toLowerCase().endsWith(".html"))
              .sort((a: { sizeBytes: number }, b: { sizeBytes: number }) => b.sizeBytes - a.sizeBytes);
            if (htmlArtifacts.length > 0) {
              const buf = await agent.downloadArtifact(htmlArtifacts[0].path);
              finalHtml = buf.toString("utf8");
              console.log("[/api/generate] Recovered HTML from fallback artifact:", htmlArtifacts[0].path);
            }
          } catch (listErr) {
            console.warn("[/api/generate] listArtifacts fallback failed:", (listErr as Error).message);
          }
        }

        // Last resort: use the most recent HTML we captured during streaming.
        if (!finalHtml && lastStreamedHtml && (lastStreamedHtml as string).length > 100) {
          console.log("[/api/generate] Falling back to last streamed HTML, length:", (lastStreamedHtml as string).length);
          finalHtml = lastStreamedHtml;
        }

        if (finalHtml) {
          send({ type: "complete", html: finalHtml, message: "Generation complete!" });
        } else {
          const detail = downloadError
            ? `Agent finished but no HTML was generated (artifact: ${downloadError})`
            : "Agent finished but no HTML was generated";
          send({ type: "error", message: detail });
        }
      } catch (error) {
        const err = error as Error & { code?: string; cause?: unknown; protoErrorCode?: string };
        const msg = err.message || "Generation failed";
        const detail = err.code ? `[${err.code}] ${msg}` : msg;
        console.error("[/api/generate] Error:", detail);
        console.error("[/api/generate] Stack:", err.stack);
        console.error("[/api/generate] cause:", JSON.stringify(err.cause));
        console.error("[/api/generate] protoErrorCode:", err.protoErrorCode);
        send({ type: "error", message: detail });
      } finally {
        generationInProgress = false;
        currentRunCancel = null;
        if (agent) {
          try {
            await agent[Symbol.asyncDispose]();
          } catch {
            // ignore disposal errors
          }
        }
        controller.close();
      }
    },
    cancel() {
      generationInProgress = false;
      if (currentRunCancel) {
        currentRunCancel().catch(() => {});
        currentRunCancel = null;
      }
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

export async function GET() {
  const hasApiKey = !!CURSOR_API_KEY;
  const now = Date.now();
  const cooldownRemaining = Math.max(0, RATE_LIMIT_MS - (now - lastGeneration));

  return new Response(
    JSON.stringify({
      available: hasApiKey && cooldownRemaining === 0 && !generationInProgress,
      configured: hasApiKey,
      cooldownRemaining: Math.ceil(cooldownRemaining / 1000),
      inProgress: generationInProgress,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
