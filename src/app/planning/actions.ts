"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireEntreprise() {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) {
    throw new Error("Action réservée aux entreprises.");
  }
  return session;
}

export async function definirAssignation(jourSemaine: number, associationId: string) {
  const session = await requireEntreprise();
  if (jourSemaine < 0 || jourSemaine > 6) throw new Error("Jour invalide.");

  await prisma.assignationRecurrente.upsert({
    where: {
      entrepriseId_jourSemaine_associationId: {
        entrepriseId: session.entrepriseId!,
        jourSemaine,
        associationId,
      },
    },
    update: { actif: true },
    create: { entrepriseId: session.entrepriseId!, jourSemaine, associationId },
  });
  revalidatePath("/planning");
}

export async function retirerAssignation(assignationId: string) {
  const session = await requireEntreprise();
  const assignation = await prisma.assignationRecurrente.findUniqueOrThrow({ where: { id: assignationId } });
  if (assignation.entrepriseId !== session.entrepriseId) throw new Error("Assignation non autorisée.");

  await prisma.assignationRecurrente.delete({ where: { id: assignationId } });
  revalidatePath("/planning");
}
