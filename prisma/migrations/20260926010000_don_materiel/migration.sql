-- Don matériel (invendus non alimentaires, loi AGEC art. 35 / L541-15-8) :
-- nature d'activité déclarée par l'entreprise, type de don, don divisible,
-- instructions d'accès au lieu d'enlèvement, photo par article.

CREATE TYPE "TypeDon" AS ENUM ('ALIMENTAIRE', 'MATERIEL');
CREATE TYPE "NatureActiviteEntreprise" AS ENUM ('ALIMENTAIRE', 'ALIMENTAIRE_ET_NON_ALIMENTAIRE', 'NON_ALIMENTAIRE');

ALTER TABLE "Entreprise" ADD COLUMN "natureActivite" "NatureActiviteEntreprise" NOT NULL DEFAULT 'ALIMENTAIRE';

ALTER TABLE "Don" ADD COLUMN "type" "TypeDon" NOT NULL DEFAULT 'ALIMENTAIRE';
ALTER TABLE "Don" ADD COLUMN "divisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Don" ADD COLUMN "instructionsAcces" TEXT;

ALTER TABLE "Article" ADD COLUMN "photoNomFichier" TEXT;
ALTER TABLE "Article" ADD COLUMN "photoContentType" TEXT;
ALTER TABLE "Article" ADD COLUMN "photoContenu" BYTEA;
