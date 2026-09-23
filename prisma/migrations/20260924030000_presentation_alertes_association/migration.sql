-- CreateEnum
CREATE TYPE "PreferenceAlerte" AS ENUM ('EMAIL', 'SMS', 'SMS_EMAIL');

-- AlterTable
ALTER TABLE "Association"
  ADD COLUMN "typesActivite" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "notreAction" TEXT,
  ADD COLUMN "preferenceAlerte" "PreferenceAlerte" NOT NULL DEFAULT 'EMAIL',
  ADD COLUMN "telephoneAlerteSms" TEXT;
