import "server-only";
import { prisma } from "@/lib/prisma";

/** Réduction d'impôt mécénat (article 238 bis du CGI) : 60 % de la valeur de revient du don. */
export const TAUX_REDUCTION_DON = 0.6;

export function calculerMontantAttestation(poidsTotalKg: number, coutRevientKg: number): number {
  return Math.round(poidsTotalKg * coutRevientKg * TAUX_REDUCTION_DON * 100) / 100;
}

export type GroupeBeneficiaire = {
  associationId: string;
  associationNom: string;
  bonIds: string[];
  poidsTotalKg: number;
  montantEstime: number;
};

/**
 * Regroupe par association bénéficiaire les bons d'enlèvement confirmés, pas encore
 * rattachés à une attestation, dont l'enlèvement est survenu dans la période donnée.
 */
export async function bonsEligiblesParBeneficiaire(
  entrepriseId: string,
  periodeDebut: Date,
  periodeFin: Date
): Promise<GroupeBeneficiaire[]> {
  const [entreprise, bons] = await Promise.all([
    prisma.entreprise.findUniqueOrThrow({ where: { id: entrepriseId } }),
    prisma.bonEnlevement.findMany({
      where: {
        entrepriseId,
        confirme: true,
        attestationId: null,
        dateHeureEnlevement: { gte: periodeDebut, lte: periodeFin },
      },
      include: { association: true },
      orderBy: { dateHeureEnlevement: "asc" },
    }),
  ]);

  const groupes = new Map<string, Omit<GroupeBeneficiaire, "montantEstime">>();
  for (const bon of bons) {
    const poids = bon.poidsTotalRetenu ?? 0;
    const existant = groupes.get(bon.associationId);
    if (existant) {
      existant.bonIds.push(bon.id);
      existant.poidsTotalKg += poids;
    } else {
      groupes.set(bon.associationId, {
        associationId: bon.associationId,
        associationNom: bon.association.denomination,
        bonIds: [bon.id],
        poidsTotalKg: poids,
      });
    }
  }

  return [...groupes.values()]
    .map((g) => ({ ...g, montantEstime: calculerMontantAttestation(g.poidsTotalKg, entreprise.coutRevientKg) }))
    .sort((a, b) => a.associationNom.localeCompare(b.associationNom, "fr"));
}
