-- Niveaux d'accès des utilisateurs et désactivation (ajouts uniquement ; comptes existants administrateurs).
-- CreateEnum
CREATE TYPE "NiveauAcces" AS ENUM ('ADMINISTRATEUR', 'OPERATEUR', 'LECTURE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "desactiveLe" TIMESTAMP(3),
ADD COLUMN     "niveauAcces" "NiveauAcces" NOT NULL DEFAULT 'ADMINISTRATEUR';

