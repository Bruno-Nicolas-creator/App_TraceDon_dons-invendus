import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { associationHabilitee, libelleHabilitation } from "@/lib/conformite";
import { formatDepuis } from "@/lib/formatDepuis";
import CoordinateurClient, { type AssociationLigne, type DonNonAssigne } from "./CoordinateurClient";

export const dynamic = "force-dynamic";

function ligneRescrit(assoc: { rescritStatut: string; rescritDateDepot: Date | null }): {
  label: string;
  variant: AssociationLigne["rescritVariant"];
} {
  switch (assoc.rescritStatut) {
    case "ACCORD_TACITE":
      return { label: "Accord tacite", variant: "tacite" };
    case "REPONSE_RECUE":
      return { label: "Réponse reçue", variant: "tacite" };
    case "EN_ATTENTE":
      return {
        label: assoc.rescritDateDepot
          ? `Dépôt ${assoc.rescritDateDepot.toLocaleDateString("fr-FR")}`
          : "En attente",
        variant: "attente",
      };
    default:
      return { label: "Non déposée", variant: "absent" };
  }
}

export default async function CoordinateurDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "COORDINATEUR") redirect("/connexion");

  const [associations, donsNonAssignes, bonsConfirmes, articles] = await Promise.all([
    prisma.association.findMany({ orderBy: { denomination: "asc" } }),
    prisma.don.findMany({
      where: { statut: "PUBLIE" },
      include: { entreprise: true, articles: true },
      orderBy: { publieLe: "desc" },
    }),
    prisma.bonEnlevement.findMany({ where: { confirme: true } }),
    prisma.article.findMany({ select: { statut: true } }),
  ]);

  const associationsAffichees: AssociationLigne[] = associations.map((a) => {
    const rescrit = ligneRescrit(a);
    return {
      id: a.id,
      nom: a.denomination,
      rna: a.rna,
      rescrit: rescrit.label,
      rescritVariant: rescrit.variant,
      habilitation: libelleHabilitation(a.habilitationStatut),
      habilitationVariant: associationHabilitee(a.habilitationStatut) ? "habilitee" : "absente",
      verifiee: a.verifiee,
    };
  });

  const donsAffiches: DonNonAssigne[] = donsNonAssignes.map((don) => ({
    id: don.id,
    nom: don.entreprise.raisonSociale,
    poids: `${don.articles.reduce((t, a) => t + a.poidsKg, 0).toLocaleString("fr-FR")} kg`,
    depuis: don.publieLe ? formatDepuis(don.publieLe) : "—",
  }));

  const poidsMois = bonsConfirmes.reduce((t, b) => t + (b.poidsTotalRetenu ?? 0), 0);
  const totalArticles = articles.length;
  const totalRefuses = articles.filter((a) => a.statut === "REFUSE").length;
  const tauxRefus = totalArticles > 0 ? (totalRefuses / totalArticles) * 100 : 0;

  return (
    <CoordinateurClient
      associations={associationsAffichees}
      donsNonAssignes={donsAffiches}
      poidsMois={poidsMois}
      nombreDons={bonsConfirmes.length}
      tauxRefus={tauxRefus}
    />
  );
}
