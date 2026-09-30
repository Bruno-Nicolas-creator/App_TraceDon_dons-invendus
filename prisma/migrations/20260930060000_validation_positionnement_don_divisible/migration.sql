-- Un don matériel divisible : le positionnement d'une association sur une sélection d'articles
-- attend désormais l'accord du donateur avant de pouvoir être signé, pour éviter une répartition
-- trop petite ou trop grande à son goût. Par défaut à false (comportement inchangé pour tout le
-- reste : dons non divisibles, positionnement historique).
ALTER TABLE "BonEnlevement" ADD COLUMN "enAttenteValidationDonateur" BOOLEAN NOT NULL DEFAULT false;
