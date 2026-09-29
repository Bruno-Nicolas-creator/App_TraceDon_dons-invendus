-- Dossier association enrichi (checklist justificatifs) : capacité chaîne du froid déclarée,
-- contact rappel produit, rôle des bénévoles (référent/collecteur) + mandat de signature,
-- et deux types de documents supplémentaires (PV d'AG, assurance transport/stockage).

CREATE TYPE "RoleBenevole" AS ENUM ('REFERENT', 'COLLECTEUR');

ALTER TABLE "Association" ADD COLUMN "chaineFroidMoyens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Association" ADD COLUMN "chaineFroidDeclareeLe" TIMESTAMP(3);
ALTER TABLE "Association" ADD COLUMN "contactRappelNom" TEXT;
ALTER TABLE "Association" ADD COLUMN "contactRappelTelephone" TEXT;
ALTER TABLE "Association" ADD COLUMN "contactRappelEmail" TEXT;

ALTER TABLE "Benevole" ADD COLUMN "role" "RoleBenevole" NOT NULL DEFAULT 'COLLECTEUR';
ALTER TABLE "Benevole" ADD COLUMN "mandatDonneLe" TIMESTAMP(3);

ALTER TYPE "TypeDocument" ADD VALUE 'PV_ASSEMBLEE_GENERALE';
ALTER TYPE "TypeDocument" ADD VALUE 'ASSURANCE_TRANSPORT_STOCKAGE';
