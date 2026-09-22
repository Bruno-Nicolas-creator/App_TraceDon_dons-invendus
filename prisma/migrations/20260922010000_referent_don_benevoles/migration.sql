-- AlterTable
ALTER TABLE "Entreprise"
  ADD COLUMN "referentDonNom" TEXT,
  ADD COLUMN "referentDonTelephone" TEXT;

-- AlterTable
ALTER TABLE "Association"
  ADD COLUMN "referentDonNom" TEXT,
  ADD COLUMN "referentDonTelephone" TEXT;

-- CreateTable
CREATE TABLE "Benevole" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Benevole_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Benevole" ADD CONSTRAINT "Benevole_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;
