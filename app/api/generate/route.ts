/**
 * POST /api/generate - Generate site via Cursor Cloud Agents API
 *
 * Flow:
 * 1. Launch cloud agent on the repo
 * 2. Poll for completion + conversation (streaming status + messages to client)
 * 3. Fetch generated file from branch
 * 4. Cleanup branch and agent
 * 5. Return HTML
 */

import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const CURSOR_API_KEY = process.env.CURSOR_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "eriknson/living-site";

// Rate limiting
let lastGeneration = 0;
const RATE_LIMIT_MS = 60 * 1000; // 1 minute between generations

// In-flight generation tracking
let generationInProgress = false;
let currentAgentId: string | null = null;

interface Brief {
  mood?: string;
  intro?: string;
  currently?: Array<{ label: string; value: string }>;
  listening?: string;
  footer?: string;
  weather_note?: string;
}

interface ConversationMessage {
  id: string;
  type: "user_message" | "assistant_message";
  text: string;
}

async function readJSON<T>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {} as T;
  }
}

async function loadReferenceHtml(): Promise<string> {
  const cwd = process.cwd();
  
  // Try local file first (for local dev)
  try {
    return await readFile(path.join(cwd, "fly-context/reference.html"), "utf-8");
  } catch {
    // Fallback: fetch from live site
    try {
      const response = await fetch("https://eriks.design/", {
        headers: { "User-Agent": "living-site-generator" },
      });
      if (response.ok) {
        return await response.text();
      }
    } catch {
      // Ignore fetch errors
    }
  }
  
  // Final fallback: minimal reference
  return `<!DOCTYPE html>
<html lang="en">
<head><title>Erik</title></head>
<body>
  <h1>Erik</h1>
  <p>Product designer building with AI. Based in Stockholm, Sweden.</p>
  <p>Links: <a href="https://x.com/flowstated">X</a>, <a href="https://github.com/eriknson">GitHub</a>, <a href="https://linkedin.com/in/eriknson">LinkedIn</a></p>
</body>
</html>`;
}

async function loadPromptContext(userDirection?: string | null): Promise<string> {
  const cwd = process.cwd();
  const brief = await readJSON<Brief>(path.join(cwd, "data/brief.json"));
  const referenceHtml = await loadReferenceHtml();

  const direction = userDirection?.trim() || "Create something fresh and surprising";

  // Embed reference HTML directly in prompt so agent doesn't need to find files
  const prompt = `Create a fresh variation of Erik's personal site.

## Reference HTML (the current live site - use this as your content baseline)
\`\`\`html
${referenceHtml}
\`\`\`

## Creative direction
${direction}

## Today's context
- Mood: ${brief.mood || "focused"}
${brief.weather_note ? `- Weather: ${brief.weather_note}` : ""}
${brief.listening ? `- Listening: ${brief.listening}` : ""}

## Task
Write generated/live.html with a fresh design interpretation. Vary layout, typography, colors.
Keep the same content and links from the reference above.

## Constraints
- Single HTML with embedded CSS
- Mobile responsive, dark mode via prefers-color-scheme
- No external dependencies

## Avoid
- AI slop (purple gradients, Inter font)
- Em dashes

## IMPORTANT: Isolation
Do NOT read or look at any files in generated/ or public/builds/.
Those contain outputs from other agents and previous runs.
Start fresh from the reference HTML provided above. Be original.`;

  return prompt;
}

// Helper to make Cursor API requests
async function cursorFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.cursor.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CURSOR_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return response;
}

// Helper to make GitHub API requests
async function githubFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      ...options.headers,
    },
  });
  return response;
}

// Create SSE message
function sseMessage(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Extract a short summary from assistant message
function summarizeMessage(text: string): string {
  // Get first line or first 100 chars
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length <= 100) return firstLine;
  return firstLine.slice(0, 97) + "...";
}

export async function POST(request: NextRequest) {
  // Check configuration
  if (!CURSOR_API_KEY) {
    return new Response(
      JSON.stringify({ error: "CURSOR_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({ error: "GITHUB_TOKEN not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limiting
  const now = Date.now();
  if (now - lastGeneration < RATE_LIMIT_MS) {
    const remainingSec = Math.ceil(
      (RATE_LIMIT_MS - (now - lastGeneration)) / 1000
    );
    return new Response(
      JSON.stringify({
        error: `Rate limited. Try again in ${remainingSec} seconds.`,
        retryAfter: remainingSec,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if generation already in progress
  if (generationInProgress) {
    return new Response(
      JSON.stringify({ error: "Generation already in progress" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  lastGeneration = now;
  generationInProgress = true;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(sseMessage(data)));
      };

      try {
        // Parse user's creative direction
        let userDirection: string | null = null;
        try {
          const body = await request.json();
          userDirection = body.prompt || null;
        } catch {
          // No body or invalid JSON
        }

        const prompt = await loadPromptContext(userDirection);
        const branchName = `cursor/live-gen-${Date.now()}`;

        send({ type: "status", status: "launching", message: "Launching cloud agent..." });

        // 1. Launch cloud agent
        const createResponse = await cursorFetch("/v0/agents", {
          method: "POST",
          body: JSON.stringify({
            prompt: { text: prompt },
            source: {
              repository: `https://github.com/${GITHUB_REPO}`,
              ref: "main",
            },
            target: {
              branchName,
              autoCreatePr: false,
            },
          }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.error?.message || `Failed to create agent: ${createResponse.status}`);
        }

        const agent = await createResponse.json();
        currentAgentId = agent.id;

        send({
          type: "status",
          status: "running",
          message: "Agent is starting...",
          agentId: agent.id,
          agentUrl: agent.target?.url,
        });

        // 2. Poll for completion + conversation
        let status = agent.status;
        let pollCount = 0;
        const maxPolls = 120; // 6 minutes max (3s intervals)
        const seenMessageIds = new Set<string>();

        while (status === "CREATING" || status === "RUNNING") {
          if (pollCount >= maxPolls) {
            throw new Error("Generation timed out");
          }

          await new Promise((resolve) => setTimeout(resolve, 3000));
          pollCount++;

          // Poll status
          const statusResponse = await cursorFetch(`/v0/agents/${agent.id}`);
          if (!statusResponse.ok) {
            throw new Error("Failed to get agent status");
          }

          const statusData = await statusResponse.json();
          status = statusData.status;

          // Poll conversation for new messages
          try {
            const convResponse = await cursorFetch(`/v0/agents/${agent.id}/conversation`);
            if (convResponse.ok) {
              const convData = await convResponse.json();
              const messages = (convData.messages || []) as ConversationMessage[];

              // Send new assistant messages as steps
              for (const msg of messages) {
                if (msg.type === "assistant_message" && !seenMessageIds.has(msg.id)) {
                  seenMessageIds.add(msg.id);
                  send({
                    type: "step",
                    id: msg.id,
                    text: msg.text,
                    summary: summarizeMessage(msg.text),
                  });
                }
              }
            }
          } catch {
            // Conversation fetch failed, continue with status polling
          }

          // Send status update
          send({
            type: "status",
            status: status.toLowerCase(),
            message: status === "RUNNING" ? `Agent working... (${pollCount * 3}s)` : `Status: ${status}`,
            elapsed: pollCount * 3,
          });
        }

        if (status === "ERROR" || status === "EXPIRED") {
          throw new Error(`Agent failed with status: ${status}`);
        }

        send({ type: "status", status: "fetching", message: "Fetching generated file..." });

        // 3. Fetch generated file from branch
        const fileResponse = await githubFetch(
          `/repos/${GITHUB_REPO}/contents/generated/live.html?ref=${branchName}`,
          {
            headers: {
              Accept: "application/vnd.github.raw",
            },
          }
        );

        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch generated file: ${fileResponse.status}`);
        }

        const html = await fileResponse.text();

        send({ type: "status", status: "cleanup", message: "Cleaning up..." });

        // 4. Cleanup: delete branch and agent (fire and forget)
        Promise.all([
          githubFetch(`/repos/${GITHUB_REPO}/git/refs/heads/${branchName}`, {
            method: "DELETE",
          }).catch(() => {}),
          cursorFetch(`/v0/agents/${agent.id}`, {
            method: "DELETE",
          }).catch(() => {}),
        ]).catch(() => {});

        // 5. Send complete with HTML
        send({ type: "complete", html, message: "Generation complete!" });

      } catch (error) {
        console.error("Generation error:", error);
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Generation failed",
        });
      } finally {
        generationInProgress = false;
        currentAgentId = null;
        controller.close();
      }
    },
    cancel() {
      generationInProgress = false;
      // Try to stop the agent if it's running
      if (currentAgentId) {
        cursorFetch(`/v0/agents/${currentAgentId}/stop`, { method: "POST" }).catch(() => {});
        currentAgentId = null;
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

// GET - Check if generation is available
export async function GET() {
  const hasApiKey = !!CURSOR_API_KEY;
  const hasGithubToken = !!GITHUB_TOKEN;

  const now = Date.now();
  const cooldownRemaining = Math.max(0, RATE_LIMIT_MS - (now - lastGeneration));

  return new Response(
    JSON.stringify({
      available:
        hasApiKey &&
        hasGithubToken &&
        cooldownRemaining === 0 &&
        !generationInProgress,
      configured: hasApiKey && hasGithubToken,
      cooldownRemaining: Math.ceil(cooldownRemaining / 1000),
      inProgress: generationInProgress,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
