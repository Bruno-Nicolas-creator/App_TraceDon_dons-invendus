-- AlterTable
ALTER TABLE "Association" ADD COLUMN "disponibilitesRetrait" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
