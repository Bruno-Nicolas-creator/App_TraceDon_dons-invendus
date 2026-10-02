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

// Limite partagée par les routes qui lisent/exportent un document (PDF, photo, pièce jointe) :
// assez généreuse pour consulter plusieurs documents de suite sans gêne, mais bloque un script
// qui boucleraient dessus pour aspirer des données.
const MAX_LECTURES_DOCUMENT = 60;
const FENETRE_LECTURES_DOCUMENT_MS = 5 * 60 * 1000;

export function tropDeLecturesDocument(userId: string): Promise<boolean> {
  return tropDeTentatives(`lecture-document:${userId}`, MAX_LECTURES_DOCUMENT, FENETRE_LECTURES_DOCUMENT_MS);
}
