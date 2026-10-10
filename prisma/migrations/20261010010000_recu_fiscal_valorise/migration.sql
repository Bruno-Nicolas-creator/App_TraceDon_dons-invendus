-- Reçu fiscal valorisé par l'entreprise et émis par l'association (ajouts uniquement).
ALTER TYPE "StatutAttestation" ADD VALUE 'DEMANDEE';
ALTER TYPE "StatutAttestation" ADD VALUE 'CONTESTEE';

ALTER TABLE "AttestationFiscale"
  ALTER COLUMN "numeroOrdre" DROP NOT NULL,
  ALTER COLUMN "montantCalcule" SET DEFAULT 0,
  ADD COLUMN "annee" INTEGER,
  ADD COLUMN "montantValorise" DOUBLE PRECISION,
  ADD COLUMN "demandeLe" TIMESTAMP(3),
  ADD COLUMN "motifContestation" TEXT,
  ADD COLUMN "emisLe" TIMESTAMP(3),
  ADD COLUMN "justificatifNomFichier" TEXT,
  ADD COLUMN "justificatifContentType" TEXT,
  ADD COLUMN "justificatifContenu" BYTEA,
  ADD COLUMN "justificatifTailleOctets" INTEGER;
