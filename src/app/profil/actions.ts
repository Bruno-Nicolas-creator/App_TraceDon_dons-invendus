"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { definitionDocumentPourRole, nomFichierSur, validerFichierDocument, type TypeDocument } from "@/lib/documents";

export async function deconnexionAction() {
  await clearSessionCookie();
  redirect("/connexion");
}

export async function definirReferentDonAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Non authentifié.");

  const nom = String(formData.get("referentDonNom") ?? "").trim();
  const telephone = String(formData.get("referentDonTelephone") ?? "").trim();
  const data = { referentDonNom: nom || null, referentDonTelephone: telephone || null };

  if (session.role === "ENTREPRISE" && session.entrepriseId) {
    await prisma.entreprise.update({ where: { id: session.entrepriseId }, data });
  } else if (session.role === "ASSOCIATION" && session.associationId) {
    await prisma.association.update({ where: { id: session.associationId }, data });
  } else {
    throw new Error("Action réservée aux entreprises et associations.");
  }
  revalidatePath("/profil");
}

export async function definirSurfaceVenteAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) {
    throw new Error("Action réservée aux entreprises.");
  }

  const brut = String(formData.get("surfaceVenteM2") ?? "").trim().replace(",", ".");
  const surfaceVenteM2 = brut ? Number(brut) : null;
  if (surfaceVenteM2 != null && (Number.isNaN(surfaceVenteM2) || surfaceVenteM2 < 0)) {
    throw new Error("Surface de vente invalide.");
  }

  await prisma.entreprise.update({ where: { id: session.entrepriseId }, data: { surfaceVenteM2 } });
  revalidatePath("/profil");
  revalidatePath("/planning");
}

export async function definirConformiteAssociationAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const habilitationStatut = String(formData.get("habilitationStatut") ?? "NON_HABILITEE");
  if (!["NON_HABILITEE", "REGIONALE", "NATIONALE"].includes(habilitationStatut)) {
    throw new Error("Statut d'habilitation invalide.");
  }
  const habilitationDateFinBrut = String(formData.get("habilitationDateFin") ?? "").trim();
  const declarationDdpp = formData.get("declarationDdpp") === "on";
  const declarationDdppDateBrut = String(formData.get("declarationDdppDate") ?? "").trim();

  await prisma.association.update({
    where: { id: session.associationId },
    data: {
      habilitationStatut: habilitationStatut as "NON_HABILITEE" | "REGIONALE" | "NATIONALE",
      habilitationDateFin: habilitationDateFinBrut ? new Date(habilitationDateFinBrut) : null,
      declarationDdpp,
      declarationDdppDate: declarationDdpp ? (declarationDdppDateBrut ? new Date(declarationDdppDateBrut) : new Date()) : null,
    },
  });
  revalidatePath("/profil");
  revalidatePath("/dons");
}

export async function ajouterBenevoleAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const nom = String(formData.get("benevoleNom") ?? "").trim();
  const telephone = String(formData.get("benevoleTelephone") ?? "").trim();
  if (!nom) return;

  await prisma.benevole.create({
    data: { associationId: session.associationId, nom, telephone: telephone || null },
  });
  revalidatePath("/profil");
}

export async function televerserDocumentAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };
  if (session.role !== "ENTREPRISE" && session.role !== "ASSOCIATION") {
    return { ok: false, error: "Action réservée aux entreprises et associations." };
  }

  const type = String(formData.get("type") ?? "") as TypeDocument;
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File)) return { ok: false, error: "Aucun fichier sélectionné." };

  const validation = validerFichierDocument(fichier);
  if (!validation.ok) return validation;

  try {
    // Valide que le type de document appartient bien au rôle de l'utilisateur.
    definitionDocumentPourRole(session.role, type);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Type de document invalide." };
  }

  const contenu = Buffer.from(new Uint8Array(await fichier.arrayBuffer()));
  const donneesCommunes = {
    type,
    nomFichier: nomFichierSur(fichier.name),
    contentType: fichier.type,
    contenu,
    tailleOctets: fichier.size,
  };

  if (session.role === "ENTREPRISE" && session.entrepriseId) {
    await prisma.document.upsert({
      where: { entrepriseId_type: { entrepriseId: session.entrepriseId, type } },
      update: donneesCommunes,
      create: { ...donneesCommunes, entrepriseId: session.entrepriseId },
    });
  } else if (session.role === "ASSOCIATION" && session.associationId) {
    await prisma.document.upsert({
      where: { associationId_type: { associationId: session.associationId, type } },
      update: donneesCommunes,
      create: { ...donneesCommunes, associationId: session.associationId },
    });
  }
  revalidatePath("/profil");
  return { ok: true };
}

export async function retirerBenevoleAction(benevoleId: string) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const benevole = await prisma.benevole.findUniqueOrThrow({ where: { id: benevoleId } });
  if (benevole.associationId !== session.associationId) throw new Error("Bénévole non autorisé.");

  await prisma.benevole.delete({ where: { id: benevoleId } });
  revalidatePath("/profil");
}
