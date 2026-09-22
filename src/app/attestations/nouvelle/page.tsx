import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { bonsEligiblesParBeneficiaire } from "@/lib/attestationFiscale";
import NouvelleAttestationClient from "./NouvelleAttestationClient";

export const dynamic = "force-dynamic";

export default async function NouvelleAttestationPage({
  searchParams,
}: {
  searchParams: Promise<{ debut?: string; fin?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) redirect("/connexion");

  const { debut, fin } = await searchParams;
  let groupes: Awaited<ReturnType<typeof bonsEligiblesParBeneficiaire>> = [];

  if (debut && fin) {
    const periodeDebut = new Date(debut);
    const periodeFin = new Date(`${fin}T23:59:59`);
    if (!Number.isNaN(periodeDebut.getTime()) && !Number.isNaN(periodeFin.getTime()) && periodeFin >= periodeDebut) {
      groupes = await bonsEligiblesParBeneficiaire(session.entrepriseId, periodeDebut, periodeFin);
    }
  }

  return (
    <NouvelleAttestationClient
      debut={debut ?? ""}
      fin={fin ?? ""}
      groupes={groupes.map((g) => ({
        associationId: g.associationId,
        associationNom: g.associationNom,
        nombreBons: g.bonIds.length,
        poidsTotalKg: g.poidsTotalKg,
        montantEstime: g.montantEstime,
      }))}
    />
  );
}
