"use server";

import { revalidatePath } from "next/cache";
import { getSessionLimitee as getSession } from "@/lib/sessionLimitee";
import { annulerDon } from "@/lib/annulationDon";

export async function annulerDonAction(donId: string, motif: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) return { ok: false, error: "Action réservée aux entreprises." };

  const refus = await annulerDon(donId, session.entrepriseId, motif);
  if (refus) return { ok: false, error: refus };

  revalidatePath("/mes-dons");
  revalidatePath("/dons");
  return { ok: true };
}
