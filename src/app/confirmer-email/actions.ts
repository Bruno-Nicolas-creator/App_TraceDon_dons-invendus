"use server";

import { tropDeTentatives } from "@/lib/rateLimiter";
import { adresseIpRequete } from "@/lib/requestOrigin";
import { confirmerChangementEmail } from "@/lib/changementEmail";

type Etat = { ok: true } | { ok: false; error: string } | null;

export async function confirmerEmailAction(_etat: Etat, formData: FormData): Promise<Etat> {
  if (await tropDeTentatives(`confirmer-email:${await adresseIpRequete()}`, 10, 15 * 60 * 1000)) {
    return { ok: false, error: "Trop de tentatives. Merci de réessayer un peu plus tard." };
  }
  const erreur = await confirmerChangementEmail(String(formData.get("jeton") ?? ""));
  return erreur ? { ok: false, error: erreur } : { ok: true };
}
