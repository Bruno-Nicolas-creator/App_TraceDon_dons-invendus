import "server-only";
import { prisma } from "@/lib/prisma";
import type { Convention } from "@prisma/client";

export async function conventionEstSignee(entrepriseId: string, associationId: string): Promise<boolean> {
  const convention = await prisma.convention.findUnique({
    where: { entrepriseId_associationId: { entrepriseId, associationId } },
  });
  return convention?.statut === "SIGNEE";
}

export async function obtenirOuCreerConvention(entrepriseId: string, associationId: string): Promise<Convention> {
  return prisma.convention.upsert({
    where: { entrepriseId_associationId: { entrepriseId, associationId } },
    update: {},
    create: { entrepriseId, associationId },
  });
}
