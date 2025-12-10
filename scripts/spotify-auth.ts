/**
 * Spotify OAuth Helper
 * 
 * Run this locally once to get a refresh token for the GitHub Action.
 * 
 * Setup:
 * 1. Create a Spotify app at https://developer.spotify.com/dashboard
 * 2. Ensure http://127.0.0.1:3000/api/spotify/callback is in redirect URIs
 * 3. Set environment variables:
 *    - SPOTIFY_CLIENT_ID
 *    - SPOTIFY_CLIENT_SECRET
 * 4. Run: npx tsx scripts/spotify-auth.ts
 * 5. Open the URL in your browser and authorize
 * 6. Copy the refresh token and add it as SPOTIFY_REFRESH_TOKEN in GitHub secrets
 */

import { createServer } from "http";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "http://127.0.0.1:3000/api/spotify/callback";
const SCOPES = ["user-top-read"];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Error: Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables");
  console.error("");
  console.error("Example:");
  console.error("  SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy npx tsx scripts/spotify-auth.ts");
  process.exit(1);
}

const authUrl = new URL("https://accounts.spotify.com/authorize");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("scope", SCOPES.join(" "));

console.log("\n🎵 Spotify OAuth Setup\n");
console.log("1. Open this URL in your browser:\n");
console.log(`   ${authUrl.toString()}\n`);
console.log("2. Authorize the app\n");
console.log("3. You'll be redirected back here\n");
console.log("Waiting for callback...\n");

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  
  if (url.pathname !== "/api/spotify/callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400);
    res.end(`Error: ${error}`);
    console.error(`\n❌ Authorization failed: ${error}`);
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400);
    res.end("Missing authorization code");
    return;
  }

  // Exchange code for tokens
  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenResponse.json();

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1>✅ Success!</h1>
          <p>Check your terminal for the refresh token.</p>
          <p>You can close this window.</p>
        </body>
      </html>
    `);

    console.log("\n✅ Authorization successful!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nYour refresh token (add this to GitHub secrets as SPOTIFY_REFRESH_TOKEN):\n");
    console.log(`${tokens.refresh_token}\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Also show access token for immediate testing
    console.log("Access token (expires in 1 hour, for testing):\n");
    console.log(`${tokens.access_token}\n`);

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500);
    res.end(`Error: ${(err as Error).message}`);
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exit(1);
  }
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Server listening on http://127.0.0.1:3000");
});

