/**
 * Redis Client
 * Shared Upstash Redis client for build streaming
 */

import { Redis } from "@upstash/redis";

// Create a singleton Redis client
// Uses KV_REST_API_* naming from Vercel Marketplace Upstash integration
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

