-- CreateTable
CREATE TABLE "LimiteFrequence" (
    "cle" TEXT NOT NULL,
    "compteur" INTEGER NOT NULL,
    "fenetreDebut" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimiteFrequence_pkey" PRIMARY KEY ("cle")
);
