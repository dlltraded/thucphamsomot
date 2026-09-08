import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "tps1_admin_session";

export interface AdminSession {
  id: string;
  name: string;
  role: string;
}

export async function setAdminSession(session: AdminSession) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
