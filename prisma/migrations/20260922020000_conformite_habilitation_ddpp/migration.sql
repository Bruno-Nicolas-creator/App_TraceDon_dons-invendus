-- CreateEnum
CREATE TYPE "StatutHabilitation" AS ENUM ('NON_HABILITEE', 'REGIONALE', 'NATIONALE');

-- AlterTable
ALTER TABLE "Entreprise"
  ADD COLUMN "surfaceVenteM2" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Association"
  ADD COLUMN "habilitationStatut" "StatutHabilitation" NOT NULL DEFAULT 'NON_HABILITEE',
  ADD COLUMN "habilitationDateFin" TIMESTAMP(3),
  ADD COLUMN "declarationDdpp" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "declarationDdppDate" TIMESTAMP(3);
