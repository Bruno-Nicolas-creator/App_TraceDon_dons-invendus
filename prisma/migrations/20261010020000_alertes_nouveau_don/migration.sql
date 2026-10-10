-- Réglages des alertes « nouveau don » des associations (ajouts uniquement).
ALTER TABLE "Association"
  ADD COLUMN "alertesActives" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "alerteRayonKm" INTEGER,
  ADD COLUMN "alerteFamilles" TEXT[] DEFAULT ARRAY[]::TEXT[];
