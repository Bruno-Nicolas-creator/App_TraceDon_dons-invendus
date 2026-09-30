import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { associationHabilitee, libelleHabilitation, SEUIL_GRANDE_SURFACE_M2 } from "@/lib/conformite";
import { formatDepuis } from "@/lib/formatDepuis";
import { calculerImpactCarboneDetaille } from "@/lib/impactCo2";
import CoordinateurClient, {
  type AssociationLigne,
  type DonNonAssigne,
  type EntrepriseNonConforme,
  type MoisTendance,
} from "./CoordinateurClient";

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

// 6 derniers mois glissants, du plus ancien au plus récent (inclus le mois en cours).
function moisGlissants(nombre: number): { debut: Date; libelle: string; cle: string }[] {
  const maintenant = new Date();
  const mois: { debut: Date; libelle: string; cle: string }[] = [];
  for (let i = nombre - 1; i >= 0; i--) {
    const debut = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    mois.push({
      debut,
      cle: `${debut.getFullYear()}-${debut.getMonth()}`,
      libelle: debut.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
    });
  }
  return mois;
}

export default async function CoordinateurDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "COORDINATEUR") redirect("/connexion");

  const debutMoisCourant = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const debutHistorique = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

  const [associations, donsNonAssignes, bonsConfirmes, bonsHistorique, articles, entreprisesGrandeSurface, articlesAlimentairesConfirmes] =
    await Promise.all([
      prisma.association.findMany({ orderBy: { denomination: "asc" } }),
      prisma.don.findMany({
        where: { statut: "PUBLIE" },
        include: { entreprise: true, articles: true },
        orderBy: { publieLe: "desc" },
      }),
      prisma.bonEnlevement.findMany({ where: { confirme: true } }),
      // Historique glissant pour la courbe de tendance : uniquement le poids et la date, pas
      // besoin de charger le reste du bon.
      prisma.bonEnlevement.findMany({
        where: { confirme: true, dateHeureEnlevement: { gte: debutHistorique } },
        select: { dateHeureEnlevement: true, poidsTotalRetenu: true },
      }),
      prisma.article.findMany({ select: { statut: true } }),
      // Loi Garot : entreprises "grande surface" (>400 m²) et leurs conventions signées, pour
      // vérifier si au moins une association habilitée figure parmi leurs partenaires.
      prisma.entreprise.findMany({
        where: { surfaceVenteM2: { gt: SEUIL_GRANDE_SURFACE_M2 } },
        include: { conventions: { where: { statut: "SIGNEE" }, include: { association: true } } },
      }),
      // Impact CO2 plateforme : uniquement les articles alimentaires validés, sur un bon confirmé.
      prisma.article.findMany({
        where: { statut: "VALIDE", don: { type: { not: "MATERIEL" }, bonsEnlevement: { some: { confirme: true } } } },
        select: { poidsKg: true, categorie: true },
      }),
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

  const donsAffiches: DonNonAssigne[] = donsNonAssignes.map((don) => {
    const nbReclames = don.articles.filter((a) => a.associationAssigneeId != null).length;
    return {
      id: don.id,
      nom: don.entreprise.raisonSociale,
      poids: `${don.articles.reduce((t, a) => t + a.poidsKg, 0).toLocaleString("fr-FR")} kg`,
      depuis: don.publieLe ? formatDepuis(don.publieLe) : "—",
      // Don matériel divisible : certains articles peuvent déjà avoir trouvé preneur alors que
      // le don reste au statut "Publié" tant qu'il n'est pas entièrement réclamé — sans cette
      // info, le don a l'air délaissé alors qu'il est déjà en partie pris en charge.
      articlesReclames: don.divisible && nbReclames > 0 ? { reclames: nbReclames, total: don.articles.length } : null,
    };
  });

  const totalArticles = articles.length;
  const totalRefuses = articles.filter((a) => a.statut === "REFUSE").length;
  const tauxRefus = totalArticles > 0 ? (totalRefuses / totalArticles) * 100 : 0;

  const poidsMoisCourant = bonsConfirmes
    .filter((b) => b.dateHeureEnlevement && b.dateHeureEnlevement >= debutMoisCourant)
    .reduce((t, b) => t + (b.poidsTotalRetenu ?? 0), 0);
  const libelleMoisCourant = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const moisRecents = moisGlissants(6);
  const tendance: MoisTendance[] = moisRecents.map((m) => ({ mois: m.libelle, poidsKg: 0 }));
  const indexParCle = new Map(moisRecents.map((m, i) => [m.cle, i]));
  for (const bon of bonsHistorique) {
    if (!bon.dateHeureEnlevement) continue;
    const cle = `${bon.dateHeureEnlevement.getFullYear()}-${bon.dateHeureEnlevement.getMonth()}`;
    const index = indexParCle.get(cle);
    if (index != null) tendance[index].poidsKg += bon.poidsTotalRetenu ?? 0;
  }

  const entreprisesNonConformes: EntrepriseNonConforme[] = entreprisesGrandeSurface
    .filter((e) => !e.conventions.some((c) => associationHabilitee(c.association.habilitationStatut)))
    .map((e) => ({
      id: e.id,
      nom: e.raisonSociale,
      surfaceM2: e.surfaceVenteM2 ?? 0,
      nombrePartenaires: e.conventions.length,
    }));

  const impactPlateforme = await calculerImpactCarboneDetaille(articlesAlimentairesConfirmes);

  return (
    <CoordinateurClient
      associations={associationsAffichees}
      donsNonAssignes={donsAffiches}
      poidsMoisCourant={poidsMoisCourant}
      libelleMoisCourant={libelleMoisCourant}
      nombreDons={bonsConfirmes.length}
      tauxRefus={tauxRefus}
      tendance={tendance}
      entreprisesNonConformes={entreprisesNonConformes}
      co2EviteKg={impactPlateforme?.co2EviteKg ?? null}
      equivalenceKm={impactPlateforme?.equivalenceKm ?? null}
    />
  );
}
