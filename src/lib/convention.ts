import "server-only";
import { prisma } from "@/lib/prisma";
import { notifier } from "@/lib/notifications";
import type { Convention } from "@prisma/client";

export async function conventionEstSignee(entrepriseId: string, associationId: string): Promise<boolean> {
  const convention = await prisma.convention.findUnique({
    where: { entrepriseId_associationId: { entrepriseId, associationId } },
  });
  return convention?.statut === "SIGNEE";
}

/**
 * Reprend ou crée la convention unique du couple entreprise/association. À la création, l'autre
 * partie que celle qui l'initie est prévenue qu'une convention l'attend (`initiateur` : qui a
 * déclenché la création — l'entreprise depuis son planning, l'association en se positionnant,
 * ou le coordinateur lors d'une attribution manuelle, auquel cas les deux parties sont prévenues).
 */
export async function obtenirOuCreerConvention(
  entrepriseId: string,
  associationId: string,
  initiateur: "ENTREPRISE" | "ASSOCIATION" | "COORDINATEUR"
): Promise<Convention> {
  const existante = await prisma.convention.findUnique({
    where: { entrepriseId_associationId: { entrepriseId, associationId } },
  });
  if (existante) return existante;

  const convention = await prisma.convention.upsert({
    where: { entrepriseId_associationId: { entrepriseId, associationId } },
    update: {},
    create: { entrepriseId, associationId },
    include: { entreprise: { select: { raisonSociale: true } }, association: { select: { denomination: true } } },
  });

  const lien = `/convention/${convention.id}`;
  if (initiateur !== "ENTREPRISE") {
    await notifier(
      { entrepriseId },
      "Convention de don à signer",
      `Une convention de don avec ${convention.association.denomination} vous attend. Elle doit être signée par les deux parties avant tout don entre vous.`,
      lien
    );
  }
  if (initiateur !== "ASSOCIATION") {
    await notifier(
      { associationId },
      "Convention de don à signer",
      `Une convention de don avec ${convention.entreprise.raisonSociale} vous attend. Elle doit être signée par les deux parties avant tout don entre vous.`,
      lien
    );
  }
  return convention;
}
