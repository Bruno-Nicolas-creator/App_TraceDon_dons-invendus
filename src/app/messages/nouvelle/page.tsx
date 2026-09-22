import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import NouvelleConversationClient, { type CibleAffichee } from "./NouvelleConversationClient";

export const dynamic = "force-dynamic";

export default async function NouvelleConversationPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  let cibles: CibleAffichee[] = [];

  if (session.role === "ENTREPRISE" && session.entrepriseId) {
    const conventions = await prisma.convention.findMany({
      where: { entrepriseId: session.entrepriseId, statut: "SIGNEE" },
      include: { association: true },
    });
    cibles = conventions.map((c) => ({ type: "ASSOCIATION" as const, id: c.associationId, nom: c.association.denomination }));
  } else if (session.role === "ASSOCIATION" && session.associationId) {
    const conventions = await prisma.convention.findMany({
      where: { associationId: session.associationId, statut: "SIGNEE" },
      include: { entreprise: true },
    });
    cibles = conventions.map((c) => ({ type: "ENTREPRISE" as const, id: c.entrepriseId, nom: c.entreprise.raisonSociale }));
  } else if (session.role === "COORDINATEUR") {
    const [entreprises, associations] = await Promise.all([
      prisma.entreprise.findMany({ orderBy: { raisonSociale: "asc" } }),
      prisma.association.findMany({ orderBy: { denomination: "asc" } }),
    ]);
    cibles = [
      ...entreprises.map((e) => ({ type: "ENTREPRISE" as const, id: e.id, nom: e.raisonSociale })),
      ...associations.map((a) => ({ type: "ASSOCIATION" as const, id: a.id, nom: a.denomination })),
    ];
  }

  return <NouvelleConversationClient cibles={cibles} avecCoordinateur={session.role !== "COORDINATEUR"} />;
}
