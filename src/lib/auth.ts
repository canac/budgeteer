import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { jwtVerify, SignJWT } from "jose";

const secret = new TextEncoder().encode(import.meta.env.VITE_JWT_SECRET);

export async function isAuthenticated(): Promise<boolean> {
  const jwt = getCookie("auth");
  if (!jwt) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(jwt, secret);
    return payload.authenticated === true;
  } catch {
    return false;
  }
}

export async function authenticateWithPassword(password: string): Promise<boolean> {
  if (password !== import.meta.env.VITE_AUTH_PASSWORD) {
    return false;
  }

  const jwt = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  setCookie("auth", jwt, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "strict",
    secure: true,
  });

  return true;
}

export function clearAuth(): void {
  deleteCookie("auth");
}
