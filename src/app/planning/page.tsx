import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import PlanningClient, { type AssignationAffichee } from "./PlanningClient";

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) redirect("/connexion");

  const [assignations, associations] = await Promise.all([
    prisma.assignationRecurrente.findMany({
      where: { entrepriseId: session.entrepriseId, actif: true },
      include: { association: true },
    }),
    prisma.association.findMany({ orderBy: { denomination: "asc" } }),
  ]);

  const assignationsAffichees: AssignationAffichee[] = assignations.map((a) => ({
    id: a.id,
    jourSemaine: a.jourSemaine,
    associationId: a.associationId,
    associationNom: a.association.denomination,
  }));

  return (
    <PlanningClient
      assignations={assignationsAffichees}
      associations={associations.map((a) => ({ id: a.id, nom: a.denomination }))}
    />
  );
}
