import "server-only";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { envoyerPush } from "@/lib/webPush";

// niveauAcces (facultatif) restreint l'envoi aux membres de ce niveau (ex. prévenir les seuls administrateurs).
type Cible =
  | { entrepriseId: string; niveauAcces?: "ADMINISTRATEUR" }
  | { associationId: string; niveauAcces?: "ADMINISTRATEUR" }
  | { coordinateur: true };

/**
 * Prévient par email et par notification push (si activés sur ce déploiement, et si la personne
 * a activé le push sur au moins un appareil) tous les comptes rattachés à une entreprise, une
 * association, ou le coordinateur. N'échoue jamais bruyamment.
 */
export async function notifier(cible: Cible, sujet: string, corps: string, url: string = "/"): Promise<void> {
  // Les comptes désactivés ne reçoivent plus rien.
  const where = { ...("coordinateur" in cible ? { role: "COORDINATEUR" as const } : cible), desactiveLe: null };
  const utilisateurs = await prisma.user.findMany({ where, select: { id: true, email: true } });
  if (utilisateurs.length === 0) return;

  await Promise.all([
    envoyerEmail(utilisateurs.map((u) => u.email), sujet, corps),
    envoyerPush(utilisateurs.map((u) => u.id), sujet, corps, url),
  ]);
}
