-- CreateEnum
CREATE TYPE "PrioriteMessage" AS ENUM ('NORMALE', 'IMPORTANTE', 'URGENTE');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT,
    "associationId" TEXT,
    "avecCoordinateur" BOOLEAN NOT NULL DEFAULT false,
    "luParEntrepriseLe" TIMESTAMP(3),
    "luParAssociationLe" TIMESTAMP(3),
    "luParCoordinateurLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "expediteurId" TEXT NOT NULL,
    "contenu" TEXT,
    "priorite" "PrioriteMessage" NOT NULL DEFAULT 'NORMALE',
    "pieceJointeNomFichier" TEXT,
    "pieceJointeContentType" TEXT,
    "pieceJointeContenu" BYTEA,
    "pieceJointeTailleOctets" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
