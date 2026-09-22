-- AlterEnum
ALTER TYPE "StatutDon" ADD VALUE 'ANNULE';

-- CreateTable
CREATE TABLE "PeriodeConges" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT,
    "associationId" TEXT,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodeConges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PeriodeConges" ADD CONSTRAINT "PeriodeConges_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodeConges" ADD CONSTRAINT "PeriodeConges_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;
