import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { anneesAvecBonsEligibles, bonsEligiblesParBeneficiaire, libelleNatures } from "@/lib/attestationFiscale";
import NouvelleAttestationClient from "./NouvelleAttestationClient";

export const dynamic = "force-dynamic";

export default async function NouvelleAttestationPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) redirect("/connexion");
  if (session.niveau !== "ADMINISTRATEUR") redirect("/archives");

  const annees = await anneesAvecBonsEligibles(session.entrepriseId);
  const demandee = Number((await searchParams).annee);
  const annee = annees.includes(demandee) ? demandee : (annees[0] ?? null);
  const groupes = annee ? await bonsEligiblesParBeneficiaire(session.entrepriseId, annee) : [];

  return (
    <NouvelleAttestationClient
      annees={annees}
      annee={annee}
      groupes={groupes.map((g) => ({
        associationId: g.associationId,
        associationNom: g.associationNom,
        interetGeneralDeclare: g.interetGeneralDeclare,
        nombreBons: g.bonIds.length,
        poidsTotalKg: g.poidsTotalKg,
        nature: libelleNatures(g.natures),
      }))}
    />
  );
}
