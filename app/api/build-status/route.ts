/**
 * GET /api/build-status - Public endpoint to check current build status
 * This is intentionally not behind auth so the /builds page can show status
 */

import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

// Check if Redis is configured
const isRedisConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export async function GET() {
  // Return null state if Redis isn't configured (local dev)
  if (!isRedisConfigured) {
    return NextResponse.json({ currentBuild: null, state: null });
  }

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

