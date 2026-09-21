-- CreateTable
CREATE TABLE "AssignationRecurrente" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "jourSemaine" INTEGER NOT NULL,
    "associationId" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignationRecurrente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssignationRecurrente_entrepriseId_jourSemaine_associationI_key" ON "AssignationRecurrente"("entrepriseId", "jourSemaine", "associationId");

-- AddForeignKey
ALTER TABLE "AssignationRecurrente" ADD CONSTRAINT "AssignationRecurrente_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignationRecurrente" ADD CONSTRAINT "AssignationRecurrente_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
