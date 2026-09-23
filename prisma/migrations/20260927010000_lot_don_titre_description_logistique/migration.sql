-- Titre/description du lot de don, adresse de récupération (par défaut celle du donateur,
-- éditable) et pièce jointe (fichier ou photo prise avec l'appareil) au niveau du don —
-- initialement demandé pour le don alimentaire, mais générique sur Don comme
-- divisible/instructionsAcces l'étaient déjà pour le matériel.

ALTER TABLE "Don" ADD COLUMN "titre" TEXT;
ALTER TABLE "Don" ADD COLUMN "description" TEXT;
ALTER TABLE "Don" ADD COLUMN "adresseRecuperation" TEXT;
ALTER TABLE "Don" ADD COLUMN "pieceJointeNomFichier" TEXT;
ALTER TABLE "Don" ADD COLUMN "pieceJointeContentType" TEXT;
ALTER TABLE "Don" ADD COLUMN "pieceJointeContenu" BYTEA;
