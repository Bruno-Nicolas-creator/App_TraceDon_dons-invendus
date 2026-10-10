import "server-only";
import { prisma } from "@/lib/prisma";
import { notifier } from "@/lib/notifications";
import { annulerEnveloppe } from "@/lib/docusign";

/**
 * Annulation d'un don (cahier des charges E13, chantier C3 du 2026-10-10) :
 * - don publié, ou pris en charge sans aucune signature : annulable, motif obligatoire ;
 * - dès qu'un bon est signé par au moins une partie, ou confirmé : annulation impossible
 *   (décision de Bruno ; on refuse alors les articles au contrôle, ou on passe par le coordinateur).
 * Les bons restent en base (historique) ; un don annulé bloque déjà toute signature ou
 * confirmation de ses bons. Les associations concernées sont prévenues avec le motif.
 */

export const LONGUEUR_MAX_MOTIF_ANNULATION = 500;

type BonPourAnnulation = { confirme: boolean; signatureDonateurLe: Date | null; signatureAssociationLe: Date | null };

/** Raison pour laquelle le don ne peut pas être annulé, ou null s'il peut l'être. */
export function empechementAnnulation(don: { statut: string; bonsEnlevement: BonPourAnnulation[] }): string | null {
  if (don.statut === "ANNULE") return "Ce don est déjà annulé.";
  if (don.statut !== "PUBLIE" && don.statut !== "PRIS_EN_CHARGE") return "Seul un don publié ou pris en charge peut être annulé.";
  if (don.bonsEnlevement.some((b) => b.confirme)) return "L'enlèvement a déjà été confirmé : le don ne peut plus être annulé.";
  if (don.bonsEnlevement.some((b) => b.signatureDonateurLe || b.signatureAssociationLe)) {
    return "Le bon d'enlèvement est déjà signé : le don ne peut plus être annulé. Refusez les articles concernés lors du contrôle, ou contactez le coordinateur.";
  }
  return null;
}

/**
 * Annule le don s'il est encore annulable. Renvoie null si c'est fait, sinon le motif du refus.
 * `entrepriseId` garantit que l'entreprise n'annule que ses propres dons.
 */
export async function annulerDon(donId: string, entrepriseId: string, motif: string): Promise<string | null> {
  const motifPropre = motif.trim();
  if (!motifPropre) return "Indiquez le motif de l'annulation.";
  if (motifPropre.length > LONGUEUR_MAX_MOTIF_ANNULATION) return "Motif trop long (500 caractères maximum).";

  const don = await prisma.don.findFirst({
    where: { id: donId, entrepriseId },
    include: {
      entreprise: { select: { raisonSociale: true } },
      bonsEnlevement: {
        select: { id: true, associationId: true, docusignEnvelopeId: true, confirme: true, signatureDonateurLe: true, signatureAssociationLe: true },
      },
    },
  });
  if (!don) return "Don introuvable.";
  const empechement = empechementAnnulation(don);
  if (empechement) return empechement;

  // Mise à jour conditionnelle : si une signature ou une confirmation arrive entre-temps, rien n'est annulé.
  const { count } = await prisma.don.updateMany({
    where: {
      id: donId,
      statut: { in: ["PUBLIE", "PRIS_EN_CHARGE"] },
      bonsEnlevement: {
        none: { OR: [{ confirme: true }, { signatureDonateurLe: { not: null } }, { signatureAssociationLe: { not: null } }] },
      },
    },
    data: { statut: "ANNULE", annuleLe: new Date(), motifAnnulation: motifPropre },
  });
  if (count === 0) return "Le don vient de changer d'état : il ne peut plus être annulé.";

  // Séances de signature ouvertes (aucune signature posée) : fermées chez DocuSign.
  for (const bon of don.bonsEnlevement.filter((b) => b.docusignEnvelopeId)) {
    try {
      await annulerEnveloppe(bon.docusignEnvelopeId!, `Don annulé par l'entreprise : ${motifPropre}`.slice(0, 200));
    } catch {
      // Enveloppe injoignable : sans effet, le don annulé bloque déjà toute signature.
    }
  }

  const associations = new Set([...don.bonsEnlevement.map((b) => b.associationId), ...(don.associationAssigneeId ? [don.associationAssigneeId] : [])]);
  const titre = don.titre ? ` « ${don.titre} »` : "";
  for (const associationId of associations) {
    await notifier(
      { associationId },
      "Don annulé par l'entreprise",
      `${don.entreprise.raisonSociale} a annulé le don${titre} qui vous était attribué. Motif : « ${motifPropre} ». Aucun enlèvement n'est à prévoir.`,
      "/dons"
    );
  }
  return null;
}

/**
 * Fermeture pour congés déjà en cours : annule les dons encore annulables de l'entreprise avec le
 * motif « Fermeture pour congés » (les dons dont le bon est déjà signé ne sont pas touchés).
 */
export async function annulerDonsPourConges(entrepriseId: string, jusquau: string): Promise<number> {
  const dons = await prisma.don.findMany({
    where: { entrepriseId, statut: { in: ["PUBLIE", "PRIS_EN_CHARGE"] } },
    select: { id: true },
  });
  let annules = 0;
  for (const { id } of dons) {
    if ((await annulerDon(id, entrepriseId, `Fermeture pour congés jusqu'au ${jusquau}.`)) === null) annules += 1;
  }
  return annules;
}
