import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { connectMongoDB } from "@/lib/db/mongoose";
import { AdminUserModel, type IAdminUser } from "@/models";

const COOKIE_NAME = "esppd_session";
const COOKIE_MAX_AGE = 60 * 60 * 12;

interface SessionPayload {
  userId: string;
  username: string;
  role: "Admin" | "Operator";
  exp: number;
}

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "esppd-fallback-secret";
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">) {
  const body = JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE,
  } satisfies SessionPayload);
  const encodedPayload = toBase64Url(body);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (expectedSignature !== signature) {
    return null;
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export async function setSession(user: Pick<IAdminUser, "_id" | "username" | "role">) {
  const token = createSessionToken({
    userId: String(user._id),
    username: user.username,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);

  if (!payload) {
    return null;
  }

  await connectMongoDB();

  const user = await AdminUserModel.findById(payload.userId)
    .select("_id nama username role is_active")
    .lean<
      | {
          _id: unknown;
          nama: string;
          username: string;
          role: "Admin" | "Operator";
          is_active: boolean;
        }
      | null
    >();

  if (!user || !user.is_active) {
    return null;
  }

  return {
    userId: String(user._id),
    nama: user.nama,
    username: user.username,
    role: user.role,
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(roles: Array<"Admin" | "Operator">) {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    redirect("/");
  }

  return session;
}
