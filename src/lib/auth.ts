import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthConfig } from "@/lib/env";

const COOKIE_NAME = "peixin_workbench_session";
const SESSION_LABEL = "peixin-workbench-v1";

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(): string {
  const { sessionSecret } = getAuthConfig();
  return hmac(SESSION_LABEL, sessionSecret);
}

export function validatePassword(input: string): boolean {
  const { password } = getAuthConfig();
  return safeEqual(input, password);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value || "";
  if (!token) return false;
  return safeEqual(token, createSessionToken());
}

export async function setSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
