import "server-only";
import { prisma } from "@/lib/prisma";
import { instantParis, partiesParis } from "@/lib/dateParis";

/**
 * Reçu fiscal (décision de Bruno du 2026-10-09, cahier des charges E14/A9) : l'application ne
 * calcule plus aucun montant. Une fois par an, l'entreprise valorise elle-même ses dons à une
 * association (avec son propre logiciel) et lui envoie une demande ; l'association émet et signe le
 * reçu, ou conteste la demande. Elle doit au minimum avoir déclaré son intérêt général.
 */

export const MONTANT_MAX_RECU = 100_000_000;
export const LONGUEUR_MAX_MOTIF_CONTESTATION = 1000;

/** Montant porté par le reçu : la valeur saisie par l'entreprise, ou l'ancien calcul (attestations d'avant le 2026-10-10). */
export function montantDuRecu(attestation: { montantValorise: number | null; montantCalcule: number }): number {
  return attestation.montantValorise ?? attestation.montantCalcule;
}

/** « 1 234,56 », « 1234.5 », « 1 234 € » → 1234.56 ; null si la saisie n'est pas un montant valable. */
export function lireMontant(saisie: string): number | null {
  const nettoye = saisie.replace(/[\s  €]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(nettoye)) return null;
  const montant = Number(nettoye);
  if (!(montant > 0) || montant > MONTANT_MAX_RECU) return null;
  return Math.round(montant * 100) / 100;
}

/** Bornes d'une année civile à l'heure de Paris (1er janvier 0 h → 31 décembre 23 h 59). */
export function bornesAnnee(annee: number): { debut: Date; fin: Date } {
  return { debut: instantParis(annee, 0, 1), fin: new Date(instantParis(annee + 1, 0, 1).getTime() - 1) };
}

export function anneeCourante(): number {
  return partiesParis().annee;
}

export type GroupeBeneficiaire = {
  associationId: string;
  associationNom: string;
  interetGeneralDeclare: boolean;
  bonIds: string[];
  poidsTotalKg: number;
  natures: ("ALIMENTAIRE" | "MATERIEL")[];
};

/**
 * Bons d'enlèvement confirmés d'une année, pas encore rattachés à un reçu, regroupés par
 * association bénéficiaire.
 */
export async function bonsEligiblesParBeneficiaire(entrepriseId: string, annee: number): Promise<GroupeBeneficiaire[]> {
  const { debut, fin } = bornesAnnee(annee);
  const bons = await prisma.bonEnlevement.findMany({
    where: { entrepriseId, confirme: true, attestationId: null, dateHeureEnlevement: { gte: debut, lte: fin } },
    include: {
      association: { select: { denomination: true, declarationInteretGeneral: true } },
      don: { select: { type: true } },
    },
    orderBy: { dateHeureEnlevement: "asc" },
  });

  const groupes = new Map<string, GroupeBeneficiaire>();
  for (const bon of bons) {
    const groupe =
      groupes.get(bon.associationId) ??
      groupes
        .set(bon.associationId, {
          associationId: bon.associationId,
          associationNom: bon.association.denomination,
          interetGeneralDeclare: bon.association.declarationInteretGeneral,
          bonIds: [],
          poidsTotalKg: 0,
          natures: [],
        })
        .get(bon.associationId)!;
    groupe.bonIds.push(bon.id);
    groupe.poidsTotalKg += bon.poidsTotalRetenu ?? 0;
    if (!groupe.natures.includes(bon.don.type)) groupe.natures.push(bon.don.type);
  }

  return [...groupes.values()].sort((a, b) => a.associationNom.localeCompare(b.associationNom, "fr"));
}

/** Années (heure de Paris) où l'entreprise a des bons confirmés pas encore rattachés à un reçu, plus récente d'abord. */
export async function anneesAvecBonsEligibles(entrepriseId: string): Promise<number[]> {
  const bons = await prisma.bonEnlevement.findMany({
    where: { entrepriseId, confirme: true, attestationId: null, dateHeureEnlevement: { not: null } },
    select: { dateHeureEnlevement: true },
  });
  const annees = new Set(bons.map((b) => partiesParis(b.dateHeureEnlevement!).annee));
  return [...annees].sort((a, b) => b - a);
}

export function libelleNatures(natures: string[]): string {
  const libelles = [
    natures.includes("ALIMENTAIRE") ? "denrées alimentaires" : null,
    natures.includes("MATERIEL") ? "biens matériels" : null,
  ].filter(Boolean);
  return libelles.length ? libelles.join(" et ") : "biens";
}
