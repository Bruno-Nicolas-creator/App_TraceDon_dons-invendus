import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
