-- CreateEnum
CREATE TYPE "StatutConvention" AS ENUM ('BROUILLON', 'ENVOYEE', 'SIGNEE');

-- AlterTable
ALTER TABLE "Convention"
  DROP COLUMN "dateSignature",
  DROP COLUMN "statut",
  ADD COLUMN "statut" "StatutConvention" NOT NULL DEFAULT 'BROUILLON',
  ADD COLUMN "docusignEnvelopeId" TEXT,
  ADD COLUMN "signatureEntrepriseLe" TIMESTAMP(3),
  ADD COLUMN "signatureAssociationLe" TIMESTAMP(3),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Convention_entrepriseId_associationId_key" ON "Convention"("entrepriseId", "associationId");
