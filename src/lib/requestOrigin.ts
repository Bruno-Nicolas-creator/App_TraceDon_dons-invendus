import "server-only";
import { headers } from "next/headers";

export async function origineRequete(): Promise<string> {
  const en = await headers();
  const proto = en.get("x-forwarded-proto") ?? "http";
  const host = en.get("host");
  return `${proto}://${host}`;
}

/** Adresse IP du visiteur, pour limiter la fréquence d'une action accessible sans compte
 * (ex. inscription, recherche à l'inscription). Vercel renseigne toujours x-forwarded-for. */
export async function adresseIpRequete(): Promise<string> {
  const en = await headers();
  return en.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnue";
}
