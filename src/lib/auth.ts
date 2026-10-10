import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "session";

export type Role = "ENTREPRISE" | "ASSOCIATION" | "COORDINATEUR";

export type SessionPayload = {
  userId: string;
  nom: string;
  role: Role;
  entrepriseId: string | null;
  associationId: string | null;
  /** Version de session du compte au moment de la connexion (absente des sessions plus anciennes = 0). */
  sv?: number;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET manquant dans les variables d'environnement.");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionCookie(payload: SessionPayload) {
  // La version de session courante du compte est inscrite dans le cookie : un changement de mot de
  // passe l'incrémente, ce qui déconnecte toutes les autres sessions (cf. getSession).
  const compte = await prisma.user.findUnique({ where: { id: payload.userId }, select: { sessionVersion: true } });
  const token = await new SignJWT({ ...payload, sv: compte?.sessionVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Session de la requête : cookie signé valide ET compte toujours existant avec la même version de
 * session (sinon le mot de passe a changé depuis la connexion, ou le compte a été supprimé). Une
 * seule lecture en base par requête grâce à cache().
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const compte = await prisma.user.findUnique({ where: { id: session.userId }, select: { sessionVersion: true } });
  if (!compte || compte.sessionVersion !== (session.sv ?? 0)) return null;
  return session;
});

/**
 * Vrai si la session est autorisée à consulter une ressource partagée entre une entreprise et
 * une association (bon d'enlèvement, attestation fiscale, convention) : le coordinateur voit
 * tout, chaque partie ne voit que ce qui la concerne.
 */
export function estAutoriseSurRessource(
  session: SessionPayload,
  ressource: { entrepriseId: string; associationId: string }
): boolean {
  return (
    session.role === "COORDINATEUR" ||
    (session.role === "ENTREPRISE" && session.entrepriseId === ressource.entrepriseId) ||
    (session.role === "ASSOCIATION" && session.associationId === ressource.associationId)
  );
}

export function landingPathForRole(role: Role): string {
  switch (role) {
    case "ASSOCIATION":
      return "/dons";
    case "COORDINATEUR":
      return "/coordinateur";
    default:
      return "/";
  }
}
