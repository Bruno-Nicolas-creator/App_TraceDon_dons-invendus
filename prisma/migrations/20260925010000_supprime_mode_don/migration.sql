-- Supprime le mode "Liste à l'avance / Bordereau ouvert" : dans les faits, aucune
-- entreprise ne connaît le détail exact des invendus avant l'enlèvement, donc le
-- scan/ajout manuel se fait toujours au moment du bon de remise.
ALTER TABLE "Don" DROP COLUMN "mode";
DROP TYPE "ModeDon";
