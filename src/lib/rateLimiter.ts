import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Limiteur de débit par fenêtre fixe, stocké dans la table LimiteFrequence. Une seule requête SQL
 * atomique (upsert avec incrémentation conditionnelle) : indispensable sur Vercel, où plusieurs
 * instances serverless peuvent traiter des requêtes concurrentes sans mémoire partagée — un simple
 * compteur en mémoire ne protégerait qu'une instance à la fois.
 */
export async function tropDeTentatives(cle: string, maxTentatives: number, fenetreMs: number): Promise<boolean> {
  const lignes = await prisma.$queryRaw<{ compteur: number }[]>`
    INSERT INTO "LimiteFrequence" ("cle", "compteur", "fenetreDebut")
    VALUES (${cle}, 1, now())
    ON CONFLICT ("cle") DO UPDATE SET
      "compteur" = CASE
        WHEN "LimiteFrequence"."fenetreDebut" < now() - (${fenetreMs}::text || ' milliseconds')::interval
        THEN 1
        ELSE "LimiteFrequence"."compteur" + 1
      END,
      "fenetreDebut" = CASE
        WHEN "LimiteFrequence"."fenetreDebut" < now() - (${fenetreMs}::text || ' milliseconds')::interval
        THEN now()
        ELSE "LimiteFrequence"."fenetreDebut"
      END
    RETURNING "compteur"
  `;

  return (lignes[0]?.compteur ?? 0) > maxTentatives;
}

// Plafond général pour toute action serveur d'un utilisateur connecté : très large pour un humain
// (2 actions par seconde en continu pendant 5 minutes), mais arrête un script qui boucle.
const MAX_ACTIONS = 600;
const FENETRE_ACTIONS_MS = 5 * 60 * 1000;

export function tropDActions(userId: string): Promise<boolean> {
  return tropDeTentatives(`action:${userId}`, MAX_ACTIONS, FENETRE_ACTIONS_MS);
}

// Envois de fichiers (jusqu'à 5 Mo chacun, stockés dans la base) : limite dédiée, plus stricte.
const MAX_ENVOIS_FICHIERS = 30;
const FENETRE_ENVOIS_FICHIERS_MS = 60 * 60 * 1000;

export function tropDEnvoisFichiers(userId: string): Promise<boolean> {
  return tropDeTentatives(`envoi-fichier:${userId}`, MAX_ENVOIS_FICHIERS, FENETRE_ENVOIS_FICHIERS_MS);
}

// Actions qui déclenchent des notifications (courriel, push) vers d'autres organisations :
// publier un don, se positionner sur un don. Sans limite, elles serviraient à inonder les autres.
const MAX_PUBLICATIONS = 30;
const FENETRE_PUBLICATIONS_MS = 60 * 60 * 1000;

export function tropDePublications(userId: string, action: "publication" | "positionnement"): Promise<boolean> {
  return tropDeTentatives(`${action}:${userId}`, MAX_PUBLICATIONS, FENETRE_PUBLICATIONS_MS);
}

// Limite partagée par les routes qui lisent/exportent un document (PDF, photo, pièce jointe) :
// assez généreuse pour consulter plusieurs documents de suite sans gêne, mais bloque un script
// qui boucleraient dessus pour aspirer des données.
const MAX_LECTURES_DOCUMENT = 60;
const FENETRE_LECTURES_DOCUMENT_MS = 5 * 60 * 1000;

export function tropDeLecturesDocument(userId: string): Promise<boolean> {
  return tropDeTentatives(`lecture-document:${userId}`, MAX_LECTURES_DOCUMENT, FENETRE_LECTURES_DOCUMENT_MS);
}
