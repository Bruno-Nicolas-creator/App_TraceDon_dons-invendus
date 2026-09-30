-- Allergènes connus par article (les 14 à déclaration obligatoire, règlement UE 1169/2011).
-- Additif : liste vide par défaut, aucune donnée existante n'est affectée.
ALTER TABLE "Article" ADD COLUMN "allergenes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
