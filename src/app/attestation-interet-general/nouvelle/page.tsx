import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import NouvelleAttestationInteretGeneralClient from "./NouvelleAttestationInteretGeneralClient";

export const dynamic = "force-dynamic";

export default async function NouvelleAttestationInteretGeneralPage() {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) redirect("/connexion");
  if (session.niveau !== "ADMINISTRATEUR") redirect("/archives");

  const [conventions, attestations] = await Promise.all([
    prisma.convention.findMany({
      where: { entrepriseId: session.entrepriseId, statut: "SIGNEE" },
      include: { association: true },
    }),
    prisma.attestationInteretGeneral.findMany({ where: { entrepriseId: session.entrepriseId } }),
  ]);

  const statutParAssociation = new Map(attestations.map((a) => [a.associationId, a.statut]));

  const associations = conventions
    .map((c) => ({
      associationId: c.associationId,
      associationNom: c.association.denomination,
      statut: statutParAssociation.get(c.associationId) ?? null,
    }))
    .filter((a) => a.statut !== "SIGNEE");

  return <NouvelleAttestationInteretGeneralClient associations={associations} />;
}
