import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "auth_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "default-secret-change-in-production";

/**
 * Generate a session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a session cookie value (token + signature)
 */
function createSessionCookie(token: string): string {
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(token);
  const signature = hmac.digest("hex");
  return `${token}.${signature}`;
}

/**
 * Verify a session cookie
 */
function verifySessionCookie(cookieValue: string): boolean {
  const [token, signature] = cookieValue.split(".");
  if (!token || !signature) return false;

  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(token);
  const expectedSignature = hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie?.value) return false;
  
  return verifySessionCookie(sessionCookie.value);
}

/**
 * Create a session for authenticated user
 */
export async function createSession(): Promise<string> {
  const token = generateSessionToken();
  const cookieValue = createSessionCookie(token);
  
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  
  return token;
}

/**
 * Destroy the session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Verify admin credentials
 */
export function verifyCredentials(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  
  if (!adminUser || !adminPass) return false;
  
  return username === adminUser && password === adminPass;
}
