-- Invitations de collègues dans une organisation (nouvelle table uniquement).
-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "niveau" "NiveauAcces" NOT NULL,
    "entrepriseId" TEXT,
    "associationId" TEXT,
    "empreinte" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "acceptee" TIMESTAMP(3),
    "annulee" TIMESTAMP(3),
    "inviteParId" TEXT NOT NULL,
    "inviteParNom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_empreinte_key" ON "Invitation"("empreinte");

-- CreateIndex
CREATE INDEX "Invitation_entrepriseId_idx" ON "Invitation"("entrepriseId");

-- CreateIndex
CREATE INDEX "Invitation_associationId_idx" ON "Invitation"("associationId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;

