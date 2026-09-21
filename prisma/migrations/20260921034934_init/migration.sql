-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "entrepriseId" TEXT,
    "associationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enseigne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "denomination" TEXT NOT NULL,
    "siretSiege" TEXT NOT NULL,
    "nombreSieges" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enseigneId" TEXT NOT NULL,
    "formule" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "periodicite" TEXT NOT NULL,
    "dateDebut" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'actif',
    CONSTRAINT "Abonnement_enseigneId_fkey" FOREIGN KEY ("enseigneId") REFERENCES "Enseigne" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Entreprise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raisonSociale" TEXT NOT NULL,
    "formeJuridique" TEXT,
    "siret" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "secteurActivite" TEXT,
    "coutRevientKg" REAL NOT NULL DEFAULT 0,
    "enseigneId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Entreprise_enseigneId_fkey" FOREIGN KEY ("enseigneId") REFERENCES "Enseigne" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reseau" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "denomination" TEXT NOT NULL,
    "perimetre" TEXT
);

-- CreateTable
CREATE TABLE "Association" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "denomination" TEXT NOT NULL,
    "rna" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "categorieEligibilite" TEXT,
    "declarationInteretGeneral" BOOLEAN NOT NULL DEFAULT false,
    "rescritStatut" TEXT NOT NULL DEFAULT 'NON_DEPOSE',
    "rescritDateDepot" DATETIME,
    "rescritPreuveUrl" TEXT,
    "verifiee" BOOLEAN NOT NULL DEFAULT false,
    "verifieeLe" DATETIME,
    "verifieePar" TEXT,
    "reseauId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Association_reseauId_fkey" FOREIGN KEY ("reseauId") REFERENCES "Reseau" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Convention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entrepriseId" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "dateSignature" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dureeAns" INTEGER NOT NULL DEFAULT 1,
    "statut" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "Convention_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Convention_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Don" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entrepriseId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'BORDEREAU_OUVERT',
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "categorie" TEXT NOT NULL DEFAULT 'Alimentaire',
    "distanceLabel" TEXT,
    "associationAssigneeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publieLe" DATETIME,
    CONSTRAINT "Don_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Don_associationAssigneeId_fkey" FOREIGN KEY ("associationAssigneeId") REFERENCES "Association" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donId" TEXT NOT NULL,
    "codeBarres" TEXT,
    "designation" TEXT NOT NULL,
    "quantiteDeclaree" TEXT NOT NULL,
    "quantiteConstatee" TEXT,
    "poidsKg" REAL NOT NULL,
    "dlcOuEtat" TEXT,
    "temperature" TEXT,
    "dlcDepassee" BOOLEAN NOT NULL DEFAULT false,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRefus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Article_donId_fkey" FOREIGN KEY ("donId") REFERENCES "Don" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BonEnlevement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "donId" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "dateHeureEnlevement" DATETIME,
    "poidsTotalRetenu" REAL,
    "signatureDonateurLe" DATETIME,
    "signatureAssociationLe" DATETIME,
    "confirme" BOOLEAN NOT NULL DEFAULT false,
    "attestationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BonEnlevement_donId_fkey" FOREIGN KEY ("donId") REFERENCES "Don" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BonEnlevement_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BonEnlevement_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BonEnlevement_attestationId_fkey" FOREIGN KEY ("attestationId") REFERENCES "AttestationFiscale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bonEnlevementId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "signataireNom" TEXT,
    "horodatage" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceDocuSign" TEXT,
    CONSTRAINT "Signature_bonEnlevementId_fkey" FOREIGN KEY ("bonEnlevementId") REFERENCES "BonEnlevement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttestationFiscale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroOrdre" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "periodeDebut" DATETIME NOT NULL,
    "periodeFin" DATETIME NOT NULL,
    "montantCalcule" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttestationFiscale_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttestationFiscale_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
