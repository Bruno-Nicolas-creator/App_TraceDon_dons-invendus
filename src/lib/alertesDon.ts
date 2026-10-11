import "server-only";
import { prisma } from "@/lib/prisma";
import { notifier } from "@/lib/notifications";
import { geocoderAdresse, isGoogleMapsServerConfigured, type Coordonnees } from "@/lib/googleMaps";
import { famillesDuDon } from "@/lib/famillesAlerte";
import { poidsTotalArticles } from "@/lib/donDivisible";

/**
 * Alertes « nouveau don » (décision de Bruno, cahier des charges A3, chantier C2 du 2026-10-10).
 * Quand un don arrive sur la place de marché — ou que des articles d'un don à partager redeviennent
 * libres — chaque association concernée est prévenue par e-mail et notification : alertes
 * activées, don dans son rayon et dans les familles qu'elle suit (aucun réglage = tout), pas en
 * congés, et pas déjà positionnée sur ce don. Une seule alerte par don et par association.
 * Pas de regroupement des dons rapprochés (prévu pour la reconstruction).
 */

/** Distance à vol d'oiseau, en km (formule de haversine). */
export function distanceKm(a: Coordonnees, b: Coordonnees): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Coordonnées enregistrées, ou calculées une fois à partir de l'adresse puis mémorisées. */
async function coordonnees(
  ligne: { latitude: number | null; longitude: number | null; adresse: string },
  enregistrer: (c: Coordonnees) => Promise<unknown>
): Promise<Coordonnees | null> {
  if (ligne.latitude != null && ligne.longitude != null) return { lat: ligne.latitude, lng: ligne.longitude };
  if (!isGoogleMapsServerConfigured()) return null;
  const c = await geocoderAdresse(ligne.adresse);
  if (c) await enregistrer(c);
  return c;
}

export type MotifAlerte = "PUBLICATION" | "ARTICLES_LIBERES";

/** Associations à prévenir pour ce don, avec leur distance (null si elle n'a pas pu être calculée). */
export async function destinatairesAlerte(donId: string) {
  const don = await prisma.don.findUnique({
    where: { id: donId },
    include: {
      entreprise: { select: { id: true, latitude: true, longitude: true, adresse: true } },
      bonsEnlevement: { select: { associationId: true } },
    },
  });
  if (!don || don.statut !== "PUBLIE") return { don: null, destinataires: [] };

  const maintenant = new Date();
  const associations = await prisma.association.findMany({
    where: {
      alertesActives: true,
      id: { notIn: don.bonsEnlevement.map((b) => b.associationId) },
      periodesConges: { none: { debut: { lte: maintenant }, fin: { gte: maintenant } } },
      users: { some: { desactiveLe: null } },
    },
    select: { id: true, adresse: true, latitude: true, longitude: true, alerteRayonKm: true, alerteFamilles: true },
  });

  const familles = famillesDuDon(don);
  const parFamille = associations.filter((a) => a.alerteFamilles.length === 0 || a.alerteFamilles.some((f) => familles.includes(f)));

  const origine = await coordonnees(don.entreprise, (c) =>
    prisma.entreprise.update({ where: { id: don.entreprise.id }, data: { latitude: c.lat, longitude: c.lng } })
  );

  const destinataires: { associationId: string; distance: number | null }[] = [];
  for (const a of parFamille) {
    const position = origine
      ? await coordonnees(a, (c) => prisma.association.update({ where: { id: a.id }, data: { latitude: c.lat, longitude: c.lng } }))
      : null;
    const distance = origine && position ? distanceKm(origine, position) : null;
    // Distance inconnue (adresse introuvable) : on prévient quand même, plutôt que de faire rater un don.
    if (a.alerteRayonKm != null && distance != null && distance > a.alerteRayonKm) continue;
    destinataires.push({ associationId: a.id, distance });
  }
  return { don, destinataires };
}

const formatDistance = (km: number) => (km < 1 ? "à moins d'1 km" : `à environ ${Math.round(km)} km`);

/** Envoie les alertes ; ne lève jamais d'erreur (appelée après la réponse, cf. after() dans les actions). */
export async function alerterNouveauDon(donId: string, motif: MotifAlerte, origineSite: string): Promise<number> {
  try {
    const { don, destinataires } = await destinatairesAlerte(donId);
    if (!don || destinataires.length === 0) return 0;

    const details = await prisma.don.findUniqueOrThrow({
      where: { id: donId },
      select: {
        titre: true,
        type: true,
        divisible: true,
        entreprise: { select: { raisonSociale: true } },
        articles: { select: { poidsKg: true, associationAssigneeId: true } },
      },
    });
    const articles = details.divisible ? details.articles.filter((a) => a.associationAssigneeId == null) : details.articles;
    const poids = poidsTotalArticles(articles);
    const nature = details.type === "MATERIEL" ? "matériel" : "alimentaire";
    const lien = `${origineSite}/dons`;

    const sujet =
      motif === "PUBLICATION"
        ? `Nouveau don ${nature} : ${details.entreprise.raisonSociale}`
        : `Articles de nouveau disponibles : ${details.entreprise.raisonSociale}`;

    let envoyees = 0;
    // Par petits paquets, pour ne pas saturer le service d'envoi d'e-mails.
    for (let i = 0; i < destinataires.length; i += 5) {
      await Promise.all(
        destinataires.slice(i, i + 5).map(async ({ associationId, distance }) => {
          const ou = distance != null ? ` ${formatDistance(distance)} de chez vous` : "";
          const titre = details.titre ? ` « ${details.titre} »` : "";
          const quantite = poids > 0 ? ` (${poids.toLocaleString("fr-FR")} kg)` : "";
          const debut =
            motif === "PUBLICATION"
              ? `${details.entreprise.raisonSociale} vient de publier un don ${nature}${titre}${quantite}${ou}.`
              : `Des articles du don ${nature}${titre} de ${details.entreprise.raisonSociale} sont de nouveau disponibles${quantite}${ou}.`;
          const corps = `${debut}\n\nVoir le don et se positionner : ${lien}\n\nVous recevez cette alerte car elle correspond à vos réglages. Pour changer votre rayon, vos types de dons ou couper les alertes : TraceDon → Profil → Alertes nouveaux dons.`;
          await notifier({ associationId }, sujet, corps, "/dons");
          envoyees += 1;
        })
      );
    }
    return envoyees;
  } catch (e) {
    console.error("Échec des alertes nouveau don :", e);
    return 0;
  }
}
