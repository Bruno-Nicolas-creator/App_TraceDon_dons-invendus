-- Bénévole mandaté qui signe effectivement le bon d'enlèvement au nom de l'association
-- (cf. Mandat_Signature_Association_Benevole).

ALTER TABLE "BonEnlevement" ADD COLUMN "benevoleCollecteurId" TEXT;

ALTER TABLE "BonEnlevement"
  ADD CONSTRAINT "BonEnlevement_benevoleCollecteurId_fkey"
  FOREIGN KEY ("benevoleCollecteurId") REFERENCES "Benevole"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
