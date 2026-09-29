-- La chaîne du froid n'est plus une déclaration auto-éditable dans le profil (String[] cochée
-- librement à tout moment) mais un document signé à téléverser, comme les autres pièces du
-- coffre-fort (cf. Attestation chaine du froid.pdf) : on retire les colonnes devenues obsolètes
-- et on ajoute le type de document correspondant.

-- AlterEnum
ALTER TYPE "TypeDocument" ADD VALUE 'ATTESTATION_CHAINE_FROID';

-- AlterTable
ALTER TABLE "Association" DROP COLUMN "chaineFroidMoyens";
ALTER TABLE "Association" DROP COLUMN "chaineFroidDeclareeLe";
