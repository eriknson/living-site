import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

const GUESTBOOK_KEY = "guestbook:entries";
const MAX_MESSAGE_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;

// Check if Redis is configured
const isRedisConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// GET - Fetch all guestbook entries
export async function GET() {
  // Return empty array if Redis isn't configured (local dev)
  if (!isRedisConfigured) {
    return NextResponse.json({ entries: [] });
  }

  try {
    // Use zrange to get entries in reverse chronological order (newest first)
    const entries = await redis.zrange<string>(GUESTBOOK_KEY, 0, -1, { rev: true });
    
    // Parse entries (stored as JSON strings)
    const parsedEntries: GuestbookEntry[] = entries
      .map((entry) => {
        try {
          return typeof entry === "string" ? JSON.parse(entry) : entry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is GuestbookEntry => entry !== null);

    return NextResponse.json({ entries: parsedEntries });
  } catch (error) {
    console.error("Error fetching guestbook entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch guestbook entries" },
      { status: 500 }
    );
  }
}

// POST - Add a new guestbook entry
export async function POST(request: Request) {
  // Return error if Redis isn't configured
  if (!isRedisConfigured) {
    return NextResponse.json(
      { error: "Guestbook is not available in this environment" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name, message } = body;

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Sanitize and validate length
    const sanitizedName = name.trim().slice(0, MAX_NAME_LENGTH);
    const sanitizedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);

    if (sanitizedName.length === 0) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (sanitizedMessage.length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    // Create entry
    const entry: GuestbookEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: sanitizedName,
      message: sanitizedMessage,
      createdAt: new Date().toISOString(),
    };

    // Store in Redis sorted set (score is timestamp for sorting)
    // Upstash Redis zadd syntax: zadd(key, score, member)
    const score = Date.now();
    await redis.zadd(GUESTBOOK_KEY, score, JSON.stringify(entry));

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Error creating guestbook entry:", error);
    return NextResponse.json(
      { error: "Failed to create guestbook entry" },
      { status: 500 }
    );
  }
}
