"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { conventionEstSignee, obtenirOuCreerConvention } from "@/lib/convention";
import { associationHabilitee, estGrandeSurface } from "@/lib/conformite";

async function requireEntreprise() {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) {
    throw new Error("Action réservée aux entreprises.");
  }
  return session;
}

export async function definirAssignation(
  jourSemaine: number,
  associationId: string,
  forcerMalgreAvertissement: boolean = false
): Promise<{ ok: true } | { ok: false; error: string; conventionId?: string; avertissementHabilitation?: boolean }> {
  const session = await requireEntreprise();
  if (jourSemaine < 0 || jourSemaine > 6) throw new Error("Jour invalide.");

  if (!(await conventionEstSignee(session.entrepriseId!, associationId))) {
    const convention = await obtenirOuCreerConvention(session.entrepriseId!, associationId);
    return {
      ok: false,
      error: "Une convention de don doit être signée avec cette association avant de l'ajouter au planning.",
      conventionId: convention.id,
    };
  }

  if (!forcerMalgreAvertissement) {
    const [entreprise, association] = await Promise.all([
      prisma.entreprise.findUniqueOrThrow({ where: { id: session.entrepriseId! } }),
      prisma.association.findUniqueOrThrow({ where: { id: associationId } }),
    ]);
    if (estGrandeSurface(entreprise.surfaceVenteM2) && !associationHabilitee(association.habilitationStatut)) {
      return {
        ok: false,
        avertissementHabilitation: true,
        error:
          "Votre surface de vente dépasse 400 m² : la loi Garot vous impose de céder vos invendus à une association habilitée. Cette association n'est pas déclarée habilitée.",
      };
    }
  }

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
  return { ok: true };
}

export async function retirerAssignation(assignationId: string) {
  const session = await requireEntreprise();
  const assignation = await prisma.assignationRecurrente.findUniqueOrThrow({ where: { id: assignationId } });
  if (assignation.entrepriseId !== session.entrepriseId) throw new Error("Assignation non autorisée.");

  await prisma.assignationRecurrente.delete({ where: { id: assignationId } });
  revalidatePath("/planning");
}
