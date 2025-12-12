/**
 * POST /api/build/events - Webhook for GitHub Actions to push build events
 * Verifies shared secret and updates build state in Redis
 */

import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";
import type { BuildState, BuildEvent, StreamEvent } from "@/lib/build-types";
import { parseStreamEvent } from "@/lib/build-types";

export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.BUILD_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error("BUILD_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: BuildEvent = await request.json();
    const { buildId, event, model, data, timestamp } = body;

    if (!buildId || !event) {
      return NextResponse.json({ error: "Missing buildId or event" }, { status: 400 });
    }

    // Get current state
    const state = await redis.get<BuildState>(`build:${buildId}:state`);
    if (!state) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    // Update state based on event type
    const updatedState = { ...state };

    switch (event) {
      case "aggregate.started":
        updatedState.workflow.aggregate = "running";
        updatedState.aggregateLog.push("=== Aggregate Started ===");
        break;

      case "aggregate.log":
        if (typeof data === "string") {
          updatedState.aggregateLog.push(data);
        }
        break;

      case "aggregate.complete":
        updatedState.workflow.aggregate = "complete";
        updatedState.aggregateLog.push("=== Aggregate Complete ===");
        updatedState.workflow.generate = "running";
        break;

      case "aggregate.error":
        updatedState.workflow.aggregate = "error";
        updatedState.status = "error";
        updatedState.error = typeof data === "string" ? data : "Aggregate failed";
        break;

      case "model.started":
        if (model && updatedState.models[model]) {
          updatedState.models[model].status = "running";
          updatedState.models[model].phase = "initializing";
          updatedState.models[model].rawLog.push(`=== ${model} Started ===`);
        }
        break;

      case "model.stream":
        if (model && updatedState.models[model] && data && typeof data === "object") {
          const streamEvent = data as StreamEvent;
          updatedState.models[model] = parseStreamEvent(
            streamEvent,
            updatedState.models[model]
          );
        }
        break;

      case "model.complete":
        if (model && updatedState.models[model]) {
          updatedState.models[model].status = "complete";
          updatedState.models[model].phase = "complete";
          updatedState.models[model].rawLog.push("=== Complete ===");
          
          // Check if all models are complete
          const allComplete = Object.values(updatedState.models).every(
            (m) => m.status === "complete" || m.status === "error"
          );
          if (allComplete) {
            updatedState.workflow.generate = "complete";
          }
        }
        break;

      case "model.error":
        if (model && updatedState.models[model]) {
          updatedState.models[model].status = "error";
          updatedState.models[model].phase = "error";
          updatedState.models[model].rawLog.push(`=== Error: ${typeof data === "string" ? data : "Unknown error"} ===`);
        }
        break;

      case "commit.started":
        updatedState.workflow.commit = "running";
        break;

      case "commit.complete":
        updatedState.workflow.commit = "complete";
        break;

      case "commit.error":
        updatedState.workflow.commit = "error";
        updatedState.status = "error";
        updatedState.error = typeof data === "string" ? data : "Commit failed";
        break;

      case "build.complete":
        updatedState.status = "complete";
        updatedState.completedAt = timestamp || new Date().toISOString();
        break;

      case "build.error":
        updatedState.status = "error";
        updatedState.error = typeof data === "string" ? data : "Build failed";
        updatedState.completedAt = timestamp || new Date().toISOString();
        break;
    }

    // Save updated state
    await redis.set(`build:${buildId}:state`, updatedState, { ex: 3600 });

    // Append event to list for history
    await redis.rpush(`build:${buildId}:events`, {
      ...body,
      timestamp: timestamp || new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing build event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

