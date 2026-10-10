-- Motif et date d'annulation d'un don (ajouts uniquement).
ALTER TABLE "Don"
  ADD COLUMN "annuleLe" TIMESTAMP(3),
  ADD COLUMN "motifAnnulation" TEXT;
