-- AlterTable
ALTER TABLE "Association" DROP COLUMN "rescritPreuveUrl";

-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('KBIS', 'RECEPISSE_RNA', 'ATTESTATION_ASSURANCE', 'STATUTS_SIGNES', 'PREUVE_RESCRIT_FISCAL', 'HABILITATION_AIDE_ALIMENTAIRE', 'DECLARATION_DDPP');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "type" "TypeDocument" NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contenu" BYTEA NOT NULL,
    "tailleOctets" INTEGER NOT NULL,
    "entrepriseId" TEXT,
    "associationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_entrepriseId_type_key" ON "Document"("entrepriseId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Document_associationId_type_key" ON "Document"("associationId", "type");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;
