import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { partiesParis } from "@/lib/dateParis";

/** Année en cours à l'heure de Paris (le 31 décembre à 23 h 30 reste dans l'année qui finit). */
const anneeParis = () => partiesParis().annee;

/**
 * Prochain numéro d'une séquence annuelle (« 2026-0144 », « 2026-ATT-0007 »…) : on repart du plus
 * grand numéro déjà attribué cette année, plutôt que du nombre de lignes (qui donnait des doublons
 * après une suppression, et ne repartait jamais à zéro au changement d'année).
 */
function prochainNumero(existants: string[], prefixe: string): string {
  const motif = new RegExp(`^${prefixe.replace(/[-]/g, "\\-")}(\\d+)$`);
  const max = existants.reduce((m, numero) => {
    const trouve = numero.match(motif);
    return trouve ? Math.max(m, Number(trouve[1])) : m;
  }, 0);
  return `${prefixe}${String(max + 1).padStart(4, "0")}`;
}

const estDoublon = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/**
 * Crée une ligne avec le prochain numéro de la séquence ; en cas de création simultanée du même
 * numéro (contrainte d'unicité), recalcule et réessaie.
 */
async function creerAvecNumero<T>(lireExistants: (prefixe: string) => Promise<string[]>, prefixe: string, creer: (numero: string) => Promise<T>): Promise<T> {
  for (let essai = 0; essai < 5; essai++) {
    const numero = prochainNumero(await lireExistants(prefixe), prefixe);
    try {
      return await creer(numero);
    } catch (e) {
      if (!estDoublon(e) || essai === 4) throw e;
    }
  }
  throw new Error("Numérotation impossible, merci de réessayer.");
}

export function creerBonEnlevement(data: Omit<Prisma.BonEnlevementUncheckedCreateInput, "numero">) {
  return creerAvecNumero(
    async (prefixe) =>
      (await prisma.bonEnlevement.findMany({ where: { numero: { startsWith: prefixe } }, select: { numero: true } })).map((b) => b.numero),
    `${anneeParis()}-`,
    (numero) => prisma.bonEnlevement.create({ data: { ...data, numero } })
  );
}

/**
 * Attribue son numéro d'ordre à un reçu fiscal au moment où l'association l'émet (et pas à la
 * demande de l'entreprise : une demande contestée ou abandonnée ne laisse pas de trou). La mise à
 * jour ne passe que si le reçu est encore une demande sans numéro : deux clics simultanés ne
 * peuvent pas lui attribuer deux numéros. Renvoie false si le reçu n'était plus une demande.
 */
export async function emettreRecuAvecNumero(attestationId: string): Promise<boolean> {
  let emis = false;
  await creerAvecNumero(
    async (prefixe) =>
      (
        await prisma.attestationFiscale.findMany({ where: { numeroOrdre: { startsWith: prefixe } }, select: { numeroOrdre: true } })
      ).flatMap((a) => (a.numeroOrdre ? [a.numeroOrdre] : [])),
    `${anneeParis()}-ATT-`,
    async (numeroOrdre) => {
      const { count } = await prisma.attestationFiscale.updateMany({
        where: { id: attestationId, statut: "DEMANDEE", numeroOrdre: null },
        data: { numeroOrdre, statut: "ENVOYEE", emisLe: new Date(), motifContestation: null },
      });
      emis = count === 1;
    }
  );
  return emis;
}
