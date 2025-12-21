/**
 * POST /api/generate - Generate site live via Fly.io agent runner
 *
 * Minimal context approach: just reference.html + today.json for fast generation.
 */

import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const FLY_AGENT_URL =
  process.env.FLY_AGENT_URL || "https://living-site-agent.fly.dev";

// Rate limiting
let lastGeneration = 0;
const RATE_LIMIT_MS = 60 * 1000; // 1 minute between generations

// In-flight generation tracking
let generationInProgress = false;

interface TodayContext {
  mood?: string;
  weather?: string;
  listening?: string;
  note?: string;
}

async function loadPromptContext(): Promise<string> {
  const cwd = process.cwd();

  // Load today's minimal context
  let today: TodayContext = {};
  try {
    const todayRaw = await readFile(
      path.join(cwd, "fly-context/today.json"),
      "utf-8"
    );
    today = JSON.parse(todayRaw);
  } catch {
    // Use defaults
  }

  // Super minimal prompt - reference.html has all the stable info
  const prompt = `Create a fresh variation of Erik's personal site.

Read context/reference.html for the content and design reference, then write generated/live.html.

Today's context:
- Mood: ${today.mood || "focused"}
- Weather: ${today.weather || "Stockholm"}
${today.listening ? `- Listening: ${today.listening}` : ""}
${today.note ? `- Note: ${today.note}` : ""}

Requirements:
- Single self-contained HTML with embedded CSS
- Keep the same content/links from reference.html
- Create a fresh design interpretation (vary layout, colors, typography)
- Support dark mode via prefers-color-scheme
- Mobile responsive`;

  return prompt;
}

export async function POST(request: NextRequest) {
  // Check if Fly agent URL is configured
  if (!FLY_AGENT_URL) {
    return new Response(
      JSON.stringify({ error: "FLY_AGENT_URL not configured" }),
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

  try {
    // #region agent log
    const postStartTime = Date.now();
    fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:POST:entry',message:'POST /api/generate started',data:{},timestamp:postStartTime,sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Load minimal prompt context
    const prompt = await loadPromptContext();

    // #region agent log
    const flyFetchStart = Date.now();
    fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:POST:flyFetchStart',message:'Starting fetch to Fly.io',data:{promptMs:flyFetchStart-postStartTime},timestamp:flyFetchStart,sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Send to Fly.io agent runner
    const flyResponse = await fetch(FLY_AGENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:POST:flyResponseReceived',message:'Fly.io response headers received',data:{flyFetchMs:Date.now()-flyFetchStart,status:flyResponse.status,ok:flyResponse.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (!flyResponse.ok) {
      generationInProgress = false;
      const errorText = await flyResponse.text();
      return new Response(
        JSON.stringify({ error: `Fly agent error: ${errorText}` }),
        {
          status: flyResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if response has body to stream
    if (!flyResponse.body) {
      generationInProgress = false;
      return new Response(
        JSON.stringify({ error: "No response stream from Fly agent" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a pass-through stream that cleans up when done
    const reader = flyResponse.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    // #region agent log
    let firstChunkTime: number | null = null;
    let chunkCount = 0;
    // #endregion

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // #region agent log
            chunkCount++;
            if (!firstChunkTime) {
              firstChunkTime = Date.now();
              const text = decoder.decode(value, { stream: true });
              fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:POST:firstChunk',message:'First chunk from Fly.io',data:{msFromFetchStart:firstChunkTime-flyFetchStart,chunkSize:value.length,preview:text.slice(0,200)},timestamp:firstChunkTime,sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
            }
            // #endregion
            controller.enqueue(value);
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  error instanceof Error ? error.message : "Stream error",
              })}\n\n`
            )
          );
        } finally {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:POST:streamComplete',message:'Stream from Fly.io complete',data:{totalMs:Date.now()-flyFetchStart,chunkCount,msToFirstChunk:firstChunkTime?firstChunkTime-flyFetchStart:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E,G'})}).catch(()=>{});
          // #endregion
          generationInProgress = false;
          controller.close();
        }
      },
      cancel() {
        generationInProgress = false;
        reader.cancel();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    generationInProgress = false;
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// GET - Check if generation is available
export async function GET() {
  const hasFlyUrl = !!FLY_AGENT_URL;

  const now = Date.now();
  const cooldownRemaining = Math.max(0, RATE_LIMIT_MS - (now - lastGeneration));

  // Optionally check Fly agent health
  let flyReady = false;
  if (hasFlyUrl) {
    try {
      const healthCheck = await fetch(`${FLY_AGENT_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      flyReady = healthCheck.ok;
    } catch {
      flyReady = false;
    }
  }

  return new Response(
    JSON.stringify({
      available:
        hasFlyUrl &&
        flyReady &&
        cooldownRemaining === 0 &&
        !generationInProgress,
      hasApiKey: hasFlyUrl, // Keep for backwards compatibility
      flyReady,
      cooldownRemaining: Math.ceil(cooldownRemaining / 1000),
      inProgress: generationInProgress,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
