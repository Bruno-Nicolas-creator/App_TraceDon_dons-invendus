-- Un don matériel divisible peut désormais être réparti entre plusieurs associations,
-- chacune se positionnant sur une partie des articles plutôt que sur le don entier.

-- Chaque article peut porter sa propre association attributaire (uniquement utilisé pour
-- un don matériel divisible ; reste NULL sinon).
ALTER TABLE "Article" ADD COLUMN "associationAssigneeId" TEXT;
ALTER TABLE "Article" ADD CONSTRAINT "Article_associationAssigneeId_fkey" FOREIGN KEY ("associationAssigneeId") REFERENCES "Association"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Un don peut désormais avoir plusieurs bons d'enlèvement (un par association qui s'y positionne) :
-- on remplace la contrainte "un seul bon par don" par "un seul bon par (don, association)".
DROP INDEX "BonEnlevement_donId_key";
CREATE UNIQUE INDEX "BonEnlevement_donId_associationId_key" ON "BonEnlevement"("donId", "associationId");
