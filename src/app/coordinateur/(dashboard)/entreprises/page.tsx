import { prisma } from "@/lib/prisma";
import { estGrandeSurface } from "@/lib/conformite";
import EntreprisesClient, { type EntrepriseLigne } from "./EntreprisesClient";

export const dynamic = "force-dynamic";

const LIBELLE_NATURE: Record<string, string> = {
  ALIMENTAIRE: "Alimentaire",
  ALIMENTAIRE_ET_NON_ALIMENTAIRE: "Alimentaire et non alimentaire",
  NON_ALIMENTAIRE: "Non alimentaire",
};

export default async function CoordinateurEntreprisesPage() {
  const entreprises = await prisma.entreprise.findMany({
    orderBy: { raisonSociale: "asc" },
    include: { documents: { where: { type: "KBIS" } }, enseigne: true },
  });

  const entreprisesAffichees: EntrepriseLigne[] = entreprises.map((ent) => ({
    id: ent.id,
    nom: ent.raisonSociale,
    siret: ent.siret,
    nature: LIBELLE_NATURE[ent.natureActivite] ?? ent.natureActivite,
    enseigne: ent.enseigne?.denomination ?? null,
    kbisFourni: ent.documents.length > 0,
    grandeSurface: estGrandeSurface(ent.surfaceVenteM2),
  }));

  return <EntreprisesClient entreprises={entreprisesAffichees} />;
}
