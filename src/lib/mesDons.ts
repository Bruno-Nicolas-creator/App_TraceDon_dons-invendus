import "server-only";
import { prisma } from "@/lib/prisma";
import { formatDepuis } from "@/lib/formatDepuis";
import { etatDuBon, etatDuDon } from "@/lib/etatDon";
import { empechementAnnulation } from "@/lib/annulationDon";

// Dons annulés gardés visibles dans « Mes dons » (au-delà, ils restent en base mais quittent la liste).
const DUREE_AFFICHAGE_ANNULES_MS = 30 * 24 * 3600 * 1000;

/** Dons non archivés de l'entreprise (publiés, pris en charge, annulés récemment), avec leur état. */
export async function chargerMesDons(entrepriseId: string) {
  const dons = await prisma.don.findMany({
    where: {
      entrepriseId,
      OR: [
        { statut: { in: ["PUBLIE", "PRIS_EN_CHARGE"] } },
        { statut: "ANNULE", annuleLe: { gte: new Date(Date.now() - DUREE_AFFICHAGE_ANNULES_MS) } },
      ],
    },
    select: {
      id: true,
      statut: true,
      type: true,
      titre: true,
      divisible: true,
      createdAt: true,
      publieLe: true,
      annuleLe: true,
      motifAnnulation: true,
      _count: { select: { articles: true } },
      bonsEnlevement: {
        select: {
          id: true,
          numero: true,
          confirme: true,
          enAttenteValidationDonateur: true,
          signatureDonateurLe: true,
          signatureAssociationLe: true,
          association: { select: { denomination: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ publieLe: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });

  return dons.map((don) => {
    const bons = don.bonsEnlevement.map((b) => ({ ...b, associationNom: b.association.denomination }));
    const etat = etatDuDon({ statut: don.statut, publieDepuis: don.publieLe ? formatDepuis(don.publieLe) : null, bons });
    return {
      id: don.id,
      type: don.type,
      titre: don.titre,
      divisible: don.divisible,
      date: (don.annuleLe ?? don.publieLe ?? don.createdAt).toISOString(),
      nombreArticles: don._count.articles,
      motifAnnulation: don.motifAnnulation,
      etat,
      empechementAnnulation: don.statut === "ANNULE" ? null : empechementAnnulation({ statut: don.statut, bonsEnlevement: bons }),
      bons: bons.map((b) => ({
        id: b.id,
        numero: b.numero,
        associationNom: b.associationNom,
        etat: etatDuBon(b),
        // Une demande partielle se valide depuis l'écran du don matériel ; le reste se traite sur le bon.
        lien: b.enAttenteValidationDonateur ? "/nouveau-don-materiel" : `/bon-enlevement/${b.id}`,
      })),
    };
  });
}

export type MonDon = Awaited<ReturnType<typeof chargerMesDons>>[number];

export async function compterDonsATraiter(entrepriseId: string): Promise<number> {
  return (await chargerMesDons(entrepriseId)).filter((d) => d.etat.aTraiter).length;
}
