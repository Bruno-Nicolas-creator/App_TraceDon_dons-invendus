import "server-only";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function isEmailConfigure(): boolean {
  return resend !== null;
}

/**
 * Envoie un email transactionnel si Resend est configuré sur ce déploiement, sinon ne fait rien.
 * N'échoue jamais bruyamment : une notification ratée ne doit pas casser l'action métier qui
 * vient de réussir (positionnement, signature, message...).
 */
export async function envoyerEmail(destinataires: string[], sujet: string, corpsTexte: string): Promise<void> {
  if (!resend || destinataires.length === 0) return;
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to: destinataires,
      subject: sujet,
      text: corpsTexte,
    });
  } catch (e) {
    console.error("Échec d'envoi d'email :", e);
  }
}

/** Adresses email des comptes rattachés à une entreprise, une association, ou du coordinateur. */
export async function emailsDestinataires(
  cible: { entrepriseId: string } | { associationId: string } | { coordinateur: true }
): Promise<string[]> {
  const where = "coordinateur" in cible ? { role: "COORDINATEUR" as const } : cible;
  const utilisateurs = await prisma.user.findMany({ where, select: { email: true } });
  return utilisateurs.map((u) => u.email);
}
