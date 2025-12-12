/**
 * POST /api/build - Trigger a new build
 * Rate limited to 1 build per 5 minutes
 */

import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";
import { createInitialBuildState } from "@/lib/build-types";

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

export async function POST() {
  try {
    // Check rate limit
    const lastTrigger = await redis.get<number>("build:last_trigger");
    const now = Date.now();

    if (lastTrigger && now - lastTrigger < RATE_LIMIT_MS) {
      const remainingMs = RATE_LIMIT_MS - (now - lastTrigger);
      const remainingMins = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        {
          error: `Rate limited. Try again in ${remainingMins} minute${remainingMins > 1 ? "s" : ""}.`,
          retryAfter: remainingMs,
        },
        { status: 429 }
      );
    }

    // Generate build ID
    const buildId = `${now}-${Math.random().toString(36).slice(2, 8)}`;

    // Trigger GitHub workflow
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    const githubPat = process.env.GITHUB_PAT;

    if (!githubOwner || !githubRepo || !githubPat) {
      console.error("Missing GitHub configuration");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const workflowResponse = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/regenerate.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            build_id: buildId,
          },
        }),
      }
    );

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      console.error("GitHub API error:", workflowResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to trigger build" },
        { status: 500 }
      );
    }

    // Create initial build state in Redis
    const initialState = createInitialBuildState(buildId);
    await redis.set(`build:${buildId}:state`, initialState, { ex: 3600 }); // 1 hour TTL
    await redis.set("build:last_trigger", now);
    await redis.set("build:current", buildId, { ex: 3600 });

    return NextResponse.json({
      buildId,
      message: "Build triggered successfully",
    });
  } catch (error) {
    console.error("Error triggering build:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Check current build status
export async function GET() {
  try {
    const currentBuildId = await redis.get<string>("build:current");
    
    if (!currentBuildId) {
      return NextResponse.json({ currentBuild: null });
    }

    const state = await redis.get(`build:${currentBuildId}:state`);
    
    return NextResponse.json({
      currentBuild: currentBuildId,
      state,
    });
  } catch (error) {
    console.error("Error getting build status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

