-- Mot de passe oublié et invalidation des sessions (ajouts uniquement).
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "JetonReinitialisation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JetonReinitialisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JetonReinitialisation_empreinte_key" ON "JetonReinitialisation"("empreinte");

-- CreateIndex
CREATE INDEX "JetonReinitialisation_userId_idx" ON "JetonReinitialisation"("userId");

-- AddForeignKey
ALTER TABLE "JetonReinitialisation" ADD CONSTRAINT "JetonReinitialisation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

