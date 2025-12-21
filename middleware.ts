import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"',
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) return unauthorized();

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return unauthorized();

  const decoded = Buffer.from(auth.slice("Basic ".length), "base64").toString();
  const idx = decoded.indexOf(":");
  const u = idx >= 0 ? decoded.slice(0, idx) : "";
  const p = idx >= 0 ? decoded.slice(idx + 1) : "";

  if (u !== user || p !== pass) return unauthorized();
  return NextResponse.next();
}

export const config = {
  // Only protect the old build API (GitHub Actions webhook)
  // /new and /api/generate are rate-limited instead
  matcher: ["/api/build/:path*"],
};

