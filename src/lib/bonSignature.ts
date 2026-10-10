import "server-only";
import { prisma } from "@/lib/prisma";
import { annulerEnveloppe } from "@/lib/docusign";
import { notifier } from "@/lib/notifications";

/**
 * Règle de signature du bon d'enlèvement (décision de Bruno du 2026-10-10) :
 * - les deux parties signent dans l'ordre de leur choix ;
 * - la liste reste modifiable tant que les DEUX n'ont pas signé ;
 * - toute modification après une première signature l'annule : l'enveloppe DocuSign en cours
 *   (dont le PDF est figé) est annulée, et les deux parties signeront la version à jour ;
 * - une fois les deux signatures posées, plus aucune modification n'est possible.
 */

type BonSignatures = {
  confirme: boolean;
  signatureDonateurLe: Date | null;
  signatureAssociationLe: Date | null;
};

/** Signé par les deux parties (ou confirmé) : le bon ne peut plus être modifié. */
export function bonVerrouille(bon: BonSignatures): boolean {
  return bon.confirme || (!!bon.signatureDonateurLe && !!bon.signatureAssociationLe);
}

export function assurerBonModifiable(bon: BonSignatures | null | undefined) {
  if (bon && bonVerrouille(bon)) {
    throw new Error(
      "Le bon d'enlèvement est signé par les deux parties : la liste des articles ne peut plus être modifiée."
    );
  }
}

/**
 * À appeler APRÈS une modification du contenu d'un bon (articles, contrôle, bénévole, informations
 * du lot). Si une signature avait été posée ou une séance de signature ouverte, l'enveloppe est
 * annulée et les signatures sont effacées ; la partie dont la signature tombe est prévenue.
 * Les lignes de l'historique « Signature » sont conservées (trace de l'enveloppe annulée).
 */
export async function invaliderSignaturesBon(bonId: string, parRole: "ENTREPRISE" | "ASSOCIATION") {
  const bon = await prisma.bonEnlevement.findUnique({
    where: { id: bonId },
    include: { entreprise: { select: { raisonSociale: true } }, association: { select: { denomination: true } } },
  });
  if (!bon || bonVerrouille(bon)) return;
  if (!bon.docusignEnvelopeId && !bon.signatureDonateurLe && !bon.signatureAssociationLe) return;

  const signatureDonateurAnnulee = !!bon.signatureDonateurLe;
  const signatureAssociationAnnulee = !!bon.signatureAssociationLe;

  if (bon.docusignEnvelopeId) {
    try {
      await annulerEnveloppe(bon.docusignEnvelopeId, `Bon ${bon.numero} modifié : nouvelle signature requise sur la version à jour.`);
    } catch {
      // Enveloppe injoignable : on la détache quand même du bon, la suivante reprendra l'état à jour.
    }
  }

  await prisma.bonEnlevement.update({
    where: { id: bonId },
    data: { docusignEnvelopeId: null, signatureDonateurLe: null, signatureAssociationLe: null },
  });

  const auteur = parRole === "ENTREPRISE" ? bon.entreprise.raisonSociale : bon.association.denomination;
  const message = `${auteur} a modifié le bon d'enlèvement n°${bon.numero} après une signature : la signature déjà posée est annulée. Les deux parties doivent signer la version à jour.`;
  if (signatureDonateurAnnulee && parRole !== "ENTREPRISE") {
    await notifier({ entrepriseId: bon.entrepriseId }, "Votre signature du bon a été annulée", message, `/bon-enlevement/${bon.id}`);
  }
  if (signatureAssociationAnnulee && parRole !== "ASSOCIATION") {
    await notifier({ associationId: bon.associationId }, "Votre signature du bon a été annulée", message, `/bon-enlevement/${bon.id}`);
  }
}

/** Modification au niveau du don (articles, informations du lot) : tous ses bons non verrouillés. */
export async function invaliderSignaturesDuDon(donId: string, parRole: "ENTREPRISE" | "ASSOCIATION") {
  const bons = await prisma.bonEnlevement.findMany({
    where: { donId, confirme: false },
    select: { id: true },
  });
  for (const bon of bons) await invaliderSignaturesBon(bon.id, parRole);
}
