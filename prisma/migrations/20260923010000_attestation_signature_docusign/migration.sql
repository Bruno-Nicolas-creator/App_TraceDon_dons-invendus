-- CreateEnum
CREATE TYPE "StatutAttestation" AS ENUM ('BROUILLON', 'ENVOYEE', 'SIGNEE');

-- AlterTable
ALTER TABLE "AttestationFiscale"
  ADD COLUMN "statut" "StatutAttestation" NOT NULL DEFAULT 'BROUILLON',
  ADD COLUMN "docusignEnvelopeId" TEXT,
  ADD COLUMN "signatureAssociationLe" TIMESTAMP(3);
