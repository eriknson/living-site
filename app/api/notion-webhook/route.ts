import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Webhook endpoint for Notion native webhooks
 *
 * Handles:
 * 1. Verification requests (when setting up the webhook)
 * 2. Event notifications (when posts are created/updated/deleted)
 *
 * Environment variables needed:
 * - NOTION_WEBHOOK_SECRET: The signing secret from Notion's webhook settings
 * - GITHUB_TOKEN: Token with repo scope to trigger workflows
 * - GITHUB_REPO: Repository in format "owner/repo" (e.g., "eriknson/living-site")
 */

/**
 * Verify the webhook signature from Notion
 */
function verifySignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let body: any = {};

    try {
      body = JSON.parse(rawBody);
    } catch {
      // Body might be malformed, log and continue
      console.error("Failed to parse webhook body");
    }

    console.log("Notion webhook received:", {
      timestamp: new Date().toISOString(),
      type: body?.type,
      bodyPreview: rawBody.slice(0, 300),
    });

    // Handle verification request
    // Notion sends this when you first set up the webhook
    if (body?.type === "url_verification" || body?.verification_token) {
      console.log("Handling verification request");
      // Echo back the verification token
      return NextResponse.json({
        challenge: body.challenge || body.verification_token,
      });
    }

    // For actual events, verify the signature
    const signature = request.headers.get("x-notion-signature");
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const isValid = verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (webhookSecret && !signature) {
      // If we have a secret configured but no signature, still allow
      // during initial setup/testing
      console.warn("No signature provided, but secret is configured");
    }

    // Handle actual webhook events
    const eventType = body?.type;
    console.log("Processing event:", eventType);

    // Only trigger sync for relevant events
    const syncEvents = [
      "page.created",
      "page.updated",
      "page.content_updated",
      "page.properties_updated",
      "page.deleted",
      "page.undeleted",
    ];

    if (!eventType || !syncEvents.some((e) => eventType.includes(e) || eventType === e)) {
      console.log("Ignoring event type:", eventType);
      return NextResponse.json({
        ok: true,
        message: "Event ignored",
        eventType,
      });
    }

    // Trigger GitHub workflow
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO || "eriknson/living-site";

    if (!githubToken) {
      console.error("GITHUB_TOKEN not configured");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.github.com/repos/${githubRepo}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "notion-posts-updated",
          client_payload: {
            triggered_at: new Date().toISOString(),
            source: "notion-webhook",
            event_type: eventType,
            page_id: body?.data?.id || body?.entity?.id || null,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to trigger GitHub workflow:", {
        status: response.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: "Failed to trigger sync" },
        { status: 500 }
      );
    }

    console.log("GitHub workflow triggered successfully");

    return NextResponse.json({
      ok: true,
      message: "Sync triggered",
      eventType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET for testing/health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "notion-webhook",
    message: "Send POST requests to trigger Notion sync",
  });
}
