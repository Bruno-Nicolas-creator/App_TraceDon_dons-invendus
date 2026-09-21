-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ENTREPRISE', 'ASSOCIATION', 'COORDINATEUR');

-- CreateEnum
CREATE TYPE "ModeDon" AS ENUM ('LISTE_PREALABLE', 'BORDEREAU_OUVERT');

-- CreateEnum
CREATE TYPE "StatutDon" AS ENUM ('BROUILLON', 'PUBLIE', 'PRIS_EN_CHARGE', 'CLOTURE');

-- CreateEnum
CREATE TYPE "StatutArticle" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REFUSE');

-- CreateEnum
CREATE TYPE "StatutRescrit" AS ENUM ('NON_DEPOSE', 'EN_ATTENTE', 'ACCORD_TACITE', 'REPONSE_RECUE');

-- CreateEnum
CREATE TYPE "RoleSignataire" AS ENUM ('DONATEUR', 'ASSOCIATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "entrepriseId" TEXT,
    "associationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enseigne" (
    "id" TEXT NOT NULL,
    "denomination" TEXT NOT NULL,
    "siretSiege" TEXT NOT NULL,
    "nombreSieges" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enseigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL,
    "enseigneId" TEXT NOT NULL,
    "formule" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "periodicite" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'actif',

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entreprise" (
    "id" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "formeJuridique" TEXT,
    "siret" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "secteurActivite" TEXT,
    "coutRevientKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enseigneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reseau" (
    "id" TEXT NOT NULL,
    "denomination" TEXT NOT NULL,
    "perimetre" TEXT,

    CONSTRAINT "Reseau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Association" (
    "id" TEXT NOT NULL,
    "denomination" TEXT NOT NULL,
    "rna" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "categorieEligibilite" TEXT,
    "declarationInteretGeneral" BOOLEAN NOT NULL DEFAULT false,
    "rescritStatut" "StatutRescrit" NOT NULL DEFAULT 'NON_DEPOSE',
    "rescritDateDepot" TIMESTAMP(3),
    "rescritPreuveUrl" TEXT,
    "verifiee" BOOLEAN NOT NULL DEFAULT false,
    "verifieeLe" TIMESTAMP(3),
    "verifieePar" TEXT,
    "reseauId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Association_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convention" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "dateSignature" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dureeAns" INTEGER NOT NULL DEFAULT 1,
    "statut" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "Convention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Don" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "mode" "ModeDon" NOT NULL DEFAULT 'BORDEREAU_OUVERT',
    "statut" "StatutDon" NOT NULL DEFAULT 'BROUILLON',
    "categorie" TEXT NOT NULL DEFAULT 'Alimentaire',
    "distanceLabel" TEXT,
    "associationAssigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publieLe" TIMESTAMP(3),

    CONSTRAINT "Don_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "donId" TEXT NOT NULL,
    "codeBarres" TEXT,
    "designation" TEXT NOT NULL,
    "quantiteDeclaree" TEXT NOT NULL,
    "quantiteConstatee" TEXT,
    "poidsKg" DOUBLE PRECISION NOT NULL,
    "dlcOuEtat" TEXT,
    "temperature" TEXT,
    "dlcDepassee" BOOLEAN NOT NULL DEFAULT false,
    "statut" "StatutArticle" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRefus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonEnlevement" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "donId" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "dateHeureEnlevement" TIMESTAMP(3),
    "poidsTotalRetenu" DOUBLE PRECISION,
    "signatureDonateurLe" TIMESTAMP(3),
    "signatureAssociationLe" TIMESTAMP(3),
    "confirme" BOOLEAN NOT NULL DEFAULT false,
    "docusignEnvelopeId" TEXT,
    "attestationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonEnlevement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "bonEnlevementId" TEXT NOT NULL,
    "role" "RoleSignataire" NOT NULL,
    "signataireNom" TEXT,
    "horodatage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceDocuSign" TEXT,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttestationFiscale" (
    "id" TEXT NOT NULL,
    "numeroOrdre" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "periodeDebut" TIMESTAMP(3) NOT NULL,
    "periodeFin" TIMESTAMP(3) NOT NULL,
    "montantCalcule" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttestationFiscale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_enseigneId_key" ON "Abonnement"("enseigneId");

-- CreateIndex
CREATE UNIQUE INDEX "BonEnlevement_numero_key" ON "BonEnlevement"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "BonEnlevement_donId_key" ON "BonEnlevement"("donId");

-- CreateIndex
CREATE UNIQUE INDEX "AttestationFiscale_numeroOrdre_key" ON "AttestationFiscale"("numeroOrdre");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_enseigneId_fkey" FOREIGN KEY ("enseigneId") REFERENCES "Enseigne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_enseigneId_fkey" FOREIGN KEY ("enseigneId") REFERENCES "Enseigne"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Association" ADD CONSTRAINT "Association_reseauId_fkey" FOREIGN KEY ("reseauId") REFERENCES "Reseau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Don" ADD CONSTRAINT "Don_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Don" ADD CONSTRAINT "Don_associationAssigneeId_fkey" FOREIGN KEY ("associationAssigneeId") REFERENCES "Association"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_donId_fkey" FOREIGN KEY ("donId") REFERENCES "Don"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonEnlevement" ADD CONSTRAINT "BonEnlevement_donId_fkey" FOREIGN KEY ("donId") REFERENCES "Don"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonEnlevement" ADD CONSTRAINT "BonEnlevement_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonEnlevement" ADD CONSTRAINT "BonEnlevement_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonEnlevement" ADD CONSTRAINT "BonEnlevement_attestationId_fkey" FOREIGN KEY ("attestationId") REFERENCES "AttestationFiscale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_bonEnlevementId_fkey" FOREIGN KEY ("bonEnlevementId") REFERENCES "BonEnlevement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttestationFiscale" ADD CONSTRAINT "AttestationFiscale_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttestationFiscale" ADD CONSTRAINT "AttestationFiscale_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
