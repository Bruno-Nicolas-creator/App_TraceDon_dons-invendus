"use server";

import { revalidatePath } from "next/cache";
import { getSessionLimitee as getSession } from "@/lib/sessionLimitee";
import { prisma } from "@/lib/prisma";
import {
  bonsEligiblesParBeneficiaire,
  bornesAnnee,
  anneeCourante,
  lireMontant,
  LONGUEUR_MAX_MOTIF_CONTESTATION,
} from "@/lib/attestationFiscale";
import { emettreRecuAvecNumero } from "@/lib/numerotation";
import { envoyerAttestationPourSignature, obtenirUrlSignatureEmbarqueeAttestation } from "@/lib/docusign";
import { origineRequete } from "@/lib/requestOrigin";
import { tropDeTentatives, tropDEnvoisFichiers } from "@/lib/rateLimiter";
import { nomFichierSur, validerFichierDocument } from "@/lib/documents";
import { notifier } from "@/lib/notifications";

const MAX_TENTATIVES_DOCUSIGN = 10;
const FENETRE_DOCUSIGN_MS = 5 * 60 * 1000;
// Chaque demande prévient l'association : limite dédiée pour qu'on ne puisse pas l'inonder.
const MAX_DEMANDES_RECU = 20;
const FENETRE_DEMANDES_RECU_MS = 60 * 60 * 1000;

type Resultat = { ok: true } | { ok: false; error: string };

const formatEuros = (montant: number) => montant.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Justificatif facultatif joint par l'entreprise (export de son logiciel), mêmes règles que le coffre-fort. */
async function lireJustificatif(formData: FormData, userId: string) {
  const fichier = formData.get("justificatif");
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: true as const, donnees: null };
  if (await tropDEnvoisFichiers(userId)) {
    return { ok: false as const, error: "Trop de fichiers envoyés en peu de temps, merci de réessayer dans une heure." };
  }
  const validation = validerFichierDocument(fichier);
  if (!validation.ok) return validation;
  return {
    ok: true as const,
    donnees: {
      justificatifNomFichier: nomFichierSur(fichier.name),
      justificatifContentType: fichier.type,
      justificatifContenu: Buffer.from(new Uint8Array(await fichier.arrayBuffer())),
      justificatifTailleOctets: fichier.size,
    },
  };
}

async function sessionEntreprise() {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) return null;
  return session as typeof session & { entrepriseId: string };
}

async function sessionAssociation() {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) return null;
  return session as typeof session & { associationId: string };
}

/** L'entreprise demande un reçu à une association pour une année, avec la valeur qu'elle a calculée. */
export async function demanderRecuFiscalAction(formData: FormData): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await sessionEntreprise();
  if (!session) return { ok: false, error: "Action réservée aux entreprises." };

  const annee = Number(formData.get("annee"));
  const associationId = String(formData.get("associationId") ?? "");
  const montant = lireMontant(String(formData.get("montant") ?? ""));
  if (!Number.isInteger(annee) || annee < 2000 || annee > anneeCourante()) return { ok: false, error: "Année invalide." };
  if (!montant) return { ok: false, error: "Indiquez la valeur totale des dons, en euros (par exemple 1 250,50)." };

  if (await tropDeTentatives(`demande-recu:${session.userId}`, MAX_DEMANDES_RECU, FENETRE_DEMANDES_RECU_MS)) {
    return { ok: false, error: "Trop de demandes en peu de temps, merci de réessayer dans une heure." };
  }
  const justificatif = await lireJustificatif(formData, session.userId);
  if (!justificatif.ok) return justificatif;

  const groupe = (await bonsEligiblesParBeneficiaire(session.entrepriseId, annee)).find((g) => g.associationId === associationId);
  if (!groupe) return { ok: false, error: "Aucun don confirmé à cette association sur cette année, ou déjà rattaché à un reçu." };

  const { debut, fin } = bornesAnnee(annee);
  // Transaction : la demande n'existe que si les bons ont bien pu lui être rattachés (deux demandes
  // simultanées ne peuvent pas se partager les mêmes bons).
  const creee = await prisma.$transaction(async (tx) => {
    const attestation = await tx.attestationFiscale.create({
      data: {
        entrepriseId: session.entrepriseId,
        associationId,
        periodeDebut: debut,
        periodeFin: fin,
        annee,
        montantValorise: montant,
        demandeLe: new Date(),
        statut: "DEMANDEE",
        ...justificatif.donnees,
      },
    });
    const { count } = await tx.bonEnlevement.updateMany({
      where: { id: { in: groupe.bonIds }, attestationId: null, confirme: true },
      data: { attestationId: attestation.id },
    });
    if (count !== groupe.bonIds.length) throw new Error("Ces bons viennent d'être rattachés à une autre demande.");
    return attestation;
  }).catch((e: unknown) => (e instanceof Error ? e : new Error("Demande impossible.")));
  if (creee instanceof Error) return { ok: false, error: creee.message };

  const entreprise = await prisma.entreprise.findUniqueOrThrow({ where: { id: session.entrepriseId }, select: { raisonSociale: true } });
  await notifier(
    { associationId },
    "Demande de reçu fiscal",
    `${entreprise.raisonSociale} vous demande un reçu fiscal pour ses dons de ${annee}, valorisés à ${formatEuros(montant)}. Vérifiez la demande, puis émettez le reçu ou contestez-la.`,
    `/attestations/${creee.id}`
  );

  revalidatePath("/archives");
  return { ok: true, id: creee.id };
}

/** Après une contestation (ou avant toute réponse), l'entreprise corrige sa demande et la renvoie. */
export async function modifierDemandeRecuAction(attestationId: string, formData: FormData): Promise<Resultat> {
  const session = await sessionEntreprise();
  if (!session) return { ok: false, error: "Action réservée aux entreprises." };

  const montant = lireMontant(String(formData.get("montant") ?? ""));
  if (!montant) return { ok: false, error: "Indiquez la valeur totale des dons, en euros (par exemple 1 250,50)." };
  if (await tropDeTentatives(`demande-recu:${session.userId}`, MAX_DEMANDES_RECU, FENETRE_DEMANDES_RECU_MS)) {
    return { ok: false, error: "Trop de demandes en peu de temps, merci de réessayer dans une heure." };
  }
  const justificatif = await lireJustificatif(formData, session.userId);
  if (!justificatif.ok) return justificatif;

  const { count } = await prisma.attestationFiscale.updateMany({
    where: { id: attestationId, entrepriseId: session.entrepriseId, statut: { in: ["DEMANDEE", "CONTESTEE"] } },
    data: { montantValorise: montant, statut: "DEMANDEE", motifContestation: null, demandeLe: new Date(), ...justificatif.donnees },
  });
  if (count === 0) return { ok: false, error: "Cette demande ne peut plus être modifiée (reçu déjà émis)." };

  const attestation = await prisma.attestationFiscale.findUniqueOrThrow({
    where: { id: attestationId },
    include: { entreprise: { select: { raisonSociale: true } } },
  });
  await notifier(
    { associationId: attestation.associationId },
    "Demande de reçu fiscal modifiée",
    `${attestation.entreprise.raisonSociale} a modifié sa demande de reçu fiscal pour ${attestation.annee} : ${formatEuros(montant)}. Vérifiez-la, puis émettez le reçu ou contestez-la.`,
    `/attestations/${attestationId}`
  );

  revalidatePath("/archives");
  revalidatePath(`/attestations/${attestationId}`);
  return { ok: true };
}

/** L'entreprise retire une demande pas encore émise : ses bons redeviennent disponibles pour une nouvelle demande. */
export async function abandonnerDemandeRecuAction(attestationId: string): Promise<Resultat> {
  const session = await sessionEntreprise();
  if (!session) return { ok: false, error: "Action réservée aux entreprises." };

  const resultat = await prisma.$transaction(async (tx) => {
    const attestation = await tx.attestationFiscale.findFirst({
      where: { id: attestationId, entrepriseId: session.entrepriseId, statut: { in: ["DEMANDEE", "CONTESTEE"] } },
    });
    if (!attestation) return null;
    await tx.bonEnlevement.updateMany({ where: { attestationId }, data: { attestationId: null } });
    await tx.attestationFiscale.delete({ where: { id: attestationId } });
    return attestation;
  });
  if (!resultat) return { ok: false, error: "Cette demande ne peut plus être retirée (reçu déjà émis)." };

  const entreprise = await prisma.entreprise.findUniqueOrThrow({ where: { id: session.entrepriseId }, select: { raisonSociale: true } });
  await notifier(
    { associationId: resultat.associationId },
    "Demande de reçu fiscal retirée",
    `${entreprise.raisonSociale} a retiré sa demande de reçu fiscal pour ${resultat.annee}. Aucune action n'est attendue de votre part.`,
    "/archives"
  );

  revalidatePath("/archives");
  revalidatePath("/attestations/nouvelle");
  return { ok: true };
}

/** L'association refuse d'émettre le reçu en l'état, avec un motif que l'entreprise verra. */
export async function contesterRecuAction(attestationId: string, motif: string): Promise<Resultat> {
  const session = await sessionAssociation();
  if (!session) return { ok: false, error: "Action réservée aux associations." };

  const motifPropre = motif.trim();
  if (!motifPropre) return { ok: false, error: "Indiquez le motif de la contestation." };
  if (motifPropre.length > LONGUEUR_MAX_MOTIF_CONTESTATION) return { ok: false, error: "Motif trop long (1000 caractères maximum)." };

  const { count } = await prisma.attestationFiscale.updateMany({
    where: { id: attestationId, associationId: session.associationId, statut: "DEMANDEE" },
    data: { statut: "CONTESTEE", motifContestation: motifPropre },
  });
  if (count === 0) return { ok: false, error: "Cette demande n'est plus en attente de votre réponse." };

  const attestation = await prisma.attestationFiscale.findUniqueOrThrow({
    where: { id: attestationId },
    include: { association: { select: { denomination: true } } },
  });
  await notifier(
    { entrepriseId: attestation.entrepriseId },
    "Demande de reçu fiscal contestée",
    `${attestation.association.denomination} conteste votre demande de reçu fiscal pour ${attestation.annee} : « ${motifPropre} ». Vous pouvez la corriger ou la retirer.`,
    `/attestations/${attestationId}`
  );

  revalidatePath("/archives");
  revalidatePath(`/attestations/${attestationId}`);
  return { ok: true };
}

async function urlSignature(attestationId: string, userId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (await tropDeTentatives(`docusign:${attestationId}:${userId}`, MAX_TENTATIVES_DOCUSIGN, FENETRE_DOCUSIGN_MS)) {
    return { ok: false, error: "Trop de tentatives, merci de patienter quelques minutes." };
  }
  try {
    const origin = await origineRequete();
    return { ok: true, url: await obtenirUrlSignatureEmbarqueeAttestation(attestationId, origin) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur DocuSign inconnue." };
  }
}

/**
 * L'association accepte la demande : le reçu reçoit son numéro d'ordre, puis s'ouvre à la
 * signature. Exige qu'elle ait au moins déclaré son intérêt général — elle peut le faire ici en
 * cochant la déclaration, qui est alors enregistrée dans son profil.
 */
export async function emettreRecuAction(
  attestationId: string,
  declareInteretGeneral: boolean
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await sessionAssociation();
  if (!session) return { ok: false, error: "Action réservée aux associations." };

  const attestation = await prisma.attestationFiscale.findFirst({
    where: { id: attestationId, associationId: session.associationId },
    include: { association: { select: { declarationInteretGeneral: true } } },
  });
  if (!attestation) return { ok: false, error: "Reçu introuvable." };
  if (attestation.statut !== "DEMANDEE") return { ok: false, error: "Cette demande n'est plus en attente de votre réponse." };

  if (!attestation.association.declarationInteretGeneral) {
    if (!declareInteretGeneral) {
      return { ok: false, error: "Votre association doit déclarer être d'intérêt général pour émettre un reçu fiscal." };
    }
    await prisma.association.update({ where: { id: session.associationId }, data: { declarationInteretGeneral: true } });
  }

  if (!(await emettreRecuAvecNumero(attestationId))) {
    return { ok: false, error: "Cette demande n'est plus en attente de votre réponse." };
  }
  revalidatePath("/archives");
  revalidatePath(`/attestations/${attestationId}`);

  try {
    await envoyerAttestationPourSignature(attestationId);
  } catch (e) {
    // Le reçu est émis (numéro attribué) : la signature pourra être relancée depuis sa page.
    return { ok: false, error: e instanceof Error ? e.message : "Erreur DocuSign inconnue." };
  }
  return urlSignature(attestationId, session.userId);
}

/** Ouvre (ou rouvre) la signature d'un reçu déjà émis. */
export async function demarrerSignatureAttestationAction(
  attestationId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await sessionAssociation();
  if (!session) return { ok: false, error: "Action réservée aux associations." };

  const attestation = await prisma.attestationFiscale.findUnique({ where: { id: attestationId } });
  if (!attestation) return { ok: false, error: "Attestation introuvable." };
  if (attestation.associationId !== session.associationId) {
    return { ok: false, error: "Vous ne pouvez signer que les attestations qui vous sont adressées." };
  }
  if (attestation.statut === "DEMANDEE" || attestation.statut === "CONTESTEE" || !attestation.numeroOrdre) {
    return { ok: false, error: "Ce reçu n'est pas encore émis." };
  }
  return urlSignature(attestationId, session.userId);
}
