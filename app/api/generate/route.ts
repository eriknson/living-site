/**
 * POST /api/generate - Generate remix site via Cursor Cloud Agents API
 *
 * Flow:
 * 1. Launch cloud agent on the repo
 * 2. Poll for completion + conversation (streaming status + messages to client)
 * 3. Fetch generated file from branch
 * 4. Cleanup branch and agent
 * 5. Return HTML
 */

import { NextRequest } from "next/server";

const CURSOR_API_KEY = process.env.CURSOR_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
const GITHUB_REPO = process.env.GITHUB_REPO || "eriknson/living-site";

// Rate limiting
let lastGeneration = 0;
const RATE_LIMIT_MS = 60 * 1000; // 1 minute between generations

// In-flight generation tracking
let generationInProgress = false;
let currentAgentId: string | null = null;

interface ConversationMessage {
  id: string;
  type: string;
  text?: string;
  // Tool call fields
  name?: string;
  input?: Record<string, unknown>;
  // For nested content
  content?: Array<{
    type: string;
    text?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
}

// Minimal fallback if live site fetch fails
const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head><title>Erik</title></head>
<body>
  <h1>Erik</h1>
  <p>Product designer building with AI. Based in Stockholm, Sweden.</p>
  <p>Links: <a href="https://x.com/flowstated">X</a>, <a href="https://github.com/eriknson">GitHub</a>, <a href="mailto:contact@eriks.design">Email</a></p>
</body>
</html>`;

// Default creative direction when user doesn't provide one
const DEFAULT_DIRECTION = `Create a beautiful, modern, and unique personal website. 
Be creative with the design - try something unexpected like a game-inspired UI, 
a retro aesthetic, brutalist design, or an elegant minimal approach.
Surprise me with something fresh and distinctive.`;

async function loadReferenceHtml(): Promise<string> {
  // Fetch from live site with ?reference=true for clean version (no menu bar, no disclaimer)
  try {
    const response = await fetch("https://eriks.design/?reference=true", {
      headers: { "User-Agent": "living-site-generator" },
    });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Ignore fetch errors
  }
  
  return FALLBACK_HTML;
}

async function buildRemixPrompt(userDirection?: string | null): Promise<string> {
  const referenceHtml = await loadReferenceHtml();
  const direction = userDirection?.trim() || DEFAULT_DIRECTION;

  const prompt = `You are an expert creative technologist and web designer.
Your task is to create a creative "remix" of Erik's personal website based on the user's direction.

## Reference Site (source of content)
Use the text content, links, and information from this HTML. You can completely change the structure, layout, colors, fonts, and CSS.
\`\`\`html
${referenceHtml}
\`\`\`

## Creative Direction
${direction}

## Output Requirements
1. Write a SINGLE HTML file to \`generated/live.html\`
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
- Do NOT read any files in generated/ or public/builds/ - start fresh
- Create something original and distinctive
- The output must be a valid, standalone HTML file`;

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

// Extract steps from a conversation message (handles nested content)
function extractStepsFromMessage(msg: ConversationMessage): Array<{ id: string; text: string; summary: string }> {
  const steps: Array<{ id: string; text: string; summary: string }> = [];
  
  // Handle direct text messages - split into paragraphs for more granular steps
  if (msg.text) {
    const paragraphs = msg.text.split(/\n\n+/).filter(p => p.trim().length > 10);
    
    if (paragraphs.length > 1) {
      // Multiple paragraphs - create a step for each meaningful one
      paragraphs.forEach((para, i) => {
        // Skip code blocks
        if (para.trim().startsWith("```")) return;
        // Skip numbered lists continuing
        if (/^\d+\.\s/.test(para.trim()) && i > 0) return;
        
        steps.push({
          id: `${msg.id}-p${i}`,
          text: para.trim(),
          summary: summarizeMessage(para.trim()),
        });
      });
    } else {
      // Single paragraph or short message
      steps.push({
        id: msg.id,
        text: msg.text,
        summary: summarizeMessage(msg.text),
      });
    }
  }
  
  // Handle tool calls at message level
  if (msg.type === "tool_use" || msg.type === "tool_call") {
    const toolName = msg.name || "tool";
    const input = msg.input || {};
    const filePath = (input.file_path || input.path || input.target_file || "") as string;
    const summary = filePath 
      ? `${toolName}: ${filePath.split("/").pop()}`
      : toolName;
    steps.push({
      id: `${msg.id}-tool`,
      text: `Using ${toolName}`,
      summary,
    });
  }
  
  // Handle nested content array (common in Claude/Anthropic API responses)
  if (msg.content && Array.isArray(msg.content)) {
    for (let i = 0; i < msg.content.length; i++) {
      const item = msg.content[i];
      
      if (item.type === "text" && item.text) {
        // Also split nested text content
        const paragraphs = item.text.split(/\n\n+/).filter(p => p.trim().length > 10);
        
        if (paragraphs.length > 1) {
          paragraphs.forEach((para, j) => {
            if (para.trim().startsWith("```")) return;
            steps.push({
              id: `${msg.id}-${i}-p${j}`,
              text: para.trim(),
              summary: summarizeMessage(para.trim()),
            });
          });
        } else {
          steps.push({
            id: `${msg.id}-${i}`,
            text: item.text,
            summary: summarizeMessage(item.text),
          });
        }
      }
      
      if (item.type === "tool_use" || item.type === "tool_call") {
        const toolName = item.name || "tool";
        const input = item.input || {};
        const filePath = (input.file_path || input.path || input.target_file || "") as string;
        const summary = filePath 
          ? `${toolName}: ${filePath.split("/").pop()}`
          : toolName;
        steps.push({
          id: `${msg.id}-${i}-tool`,
          text: `Using ${toolName}`,
          summary,
        });
      }
    }
  }
  
  return steps;
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

        const prompt = await buildRemixPrompt(userDirection);
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

              // Debug: Log message structure on first few polls
              if (pollCount <= 3) {
                console.log(`[Cursor API] Poll ${pollCount}:`);
                console.log(`  - Total messages: ${messages.length}`);
                console.log(`  - Message types: ${messages.map(m => m.type).join(", ")}`);
                if (messages.length > 0) {
                  console.log(`  - Sample message keys: ${Object.keys(messages[0]).join(", ")}`);
                }
                // Log raw convData structure too
                if (pollCount === 1) {
                  console.log(`  - convData keys: ${Object.keys(convData).join(", ")}`);
                  console.log(`  - Full sample:`, JSON.stringify(messages[0], null, 2));
                }
              }

              // Process all messages (not just assistant_message)
              for (const msg of messages) {
                // Skip user messages
                if (msg.type === "user_message" || msg.type === "human") continue;
                
                // Extract all steps from this message
                const steps = extractStepsFromMessage(msg);
                
                // Debug: Log extracted steps
                if (steps.length > 0 && !seenMessageIds.has(steps[0].id)) {
                  console.log(`[Cursor API] Extracted ${steps.length} steps from message type: ${msg.type}`);
                }
                
                for (const step of steps) {
                  if (!seenMessageIds.has(step.id)) {
                    seenMessageIds.add(step.id);
                    send({
                      type: "step",
                      id: step.id,
                      text: step.text,
                      summary: step.summary,
                    });
                  }
                }
              }
            }
          } catch (e) {
            // Log conversation fetch errors for debugging
            console.error("Conversation fetch error:", e);
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
