/**
 * GET /api/build/stream - Server-Sent Events endpoint for build progress
 * Polls Redis every 500ms and streams updates to the browser
 */

import { Redis } from "@upstash/redis";
import type { BuildState, BuildEvent } from "@/lib/build-types";

// Create Redis client inline for Edge runtime compatibility
// Uses KV_REST_API_* naming from Vercel Marketplace Upstash integration
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const buildId = url.searchParams.get("id");

  if (!buildId) {
    return new Response("Missing build ID", { status: 400 });
  }

  const encoder = new TextEncoder();
  let lastEventIndex = 0;
  let isComplete = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state
      const initialState = await redis.get<BuildState>(`build:${buildId}:state`);
      if (initialState) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "state", data: initialState })}\n\n`)
        );
      } else {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", data: "Build not found" })}\n\n`)
        );
        controller.close();
        return;
      }

      // Poll for updates
      const poll = async () => {
        if (isComplete) return;

        try {
          // Get new events since last check
          const events = await redis.lrange<BuildEvent>(
            `build:${buildId}:events`,
            lastEventIndex,
            -1
          );

          if (events && events.length > 0) {
            for (const event of events) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "event", data: event })}\n\n`)
              );
            }
            lastEventIndex += events.length;
          }

          // Check current state
          const state = await redis.get<BuildState>(`build:${buildId}:state`);
          if (state) {
            // Send periodic state update
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "state", data: state })}\n\n`)
            );

            // Check if build is complete
            if (state.status === "complete" || state.status === "error") {
              isComplete = true;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", data: state.status })}\n\n`)
              );
              controller.close();
              return;
            }
          }

          // Schedule next poll (500ms)
          setTimeout(poll, 500);
        } catch (error) {
          console.error("SSE poll error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", data: "Poll error" })}\n\n`)
          );
          // Continue polling despite errors
          setTimeout(poll, 1000);
        }
      };

      // Start polling
      poll();
    },

    cancel() {
      isComplete = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
    },
  });
}

