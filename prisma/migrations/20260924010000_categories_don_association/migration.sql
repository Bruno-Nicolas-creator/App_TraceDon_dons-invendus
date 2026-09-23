-- AlterTable
ALTER TABLE "Association" ADD COLUMN "categoriesDon" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
