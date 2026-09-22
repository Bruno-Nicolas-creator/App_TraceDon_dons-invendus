-- AlterTable
ALTER TABLE "Benevole"
  ADD COLUMN "assuranceRcAttestee" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "assuranceRcAttesteeLe" TIMESTAMP(3);
