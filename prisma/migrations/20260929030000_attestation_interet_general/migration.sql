-- Attestation sur l'honneur du statut d'intérêt général (art. 238 bis du CGI), signée par
-- l'association et adressée à une entreprise donatrice nommée (une seule par couple
-- entreprise/association, cf. Attestation sur l_honneur association intérêt générale).

-- CreateEnum
CREATE TYPE "StatutAttestationInteretGeneral" AS ENUM ('BROUILLON', 'ENVOYEE', 'SIGNEE');

-- CreateTable
CREATE TABLE "AttestationInteretGeneral" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "statut" "StatutAttestationInteretGeneral" NOT NULL DEFAULT 'BROUILLON',
    "docusignEnvelopeId" TEXT,
    "signatureAssociationLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttestationInteretGeneral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttestationInteretGeneral_entrepriseId_associationId_key" ON "AttestationInteretGeneral"("entrepriseId", "associationId");

-- AddForeignKey
ALTER TABLE "AttestationInteretGeneral" ADD CONSTRAINT "AttestationInteretGeneral_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttestationInteretGeneral" ADD CONSTRAINT "AttestationInteretGeneral_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
