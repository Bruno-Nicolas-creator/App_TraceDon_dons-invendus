-- Capacité d'accueil déclarative (en complément de l'attestation chaîne du froid) et nombre de
-- bénéficiaires servis, purement informatif pour les entreprises donatrices. Les deux sont
-- optionnels : aucune donnée existante n'est affectée.
ALTER TABLE "Association" ADD COLUMN "capaciteAccueilKg" DOUBLE PRECISION;
ALTER TABLE "Association" ADD COLUMN "nombreBeneficiaires" INTEGER;
