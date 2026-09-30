import { prisma } from "@/lib/prisma";
import { associationHabilitee, libelleHabilitation } from "@/lib/conformite";
import AssociationsClient, { type AssociationLigne } from "./AssociationsClient";

export const dynamic = "force-dynamic";

function ligneRescrit(assoc: { rescritStatut: string; rescritDateDepot: Date | null }): {
  label: string;
  variant: AssociationLigne["rescritVariant"];
} {
  switch (assoc.rescritStatut) {
    case "ACCORD_TACITE":
      return { label: "Accord tacite", variant: "tacite" };
    case "REPONSE_RECUE":
      return { label: "Réponse reçue", variant: "tacite" };
    case "EN_ATTENTE":
      return {
        label: assoc.rescritDateDepot
          ? `Dépôt ${assoc.rescritDateDepot.toLocaleDateString("fr-FR")}`
          : "En attente",
        variant: "attente",
      };
    default:
      return { label: "Non déposée", variant: "absent" };
  }
}

export default async function CoordinateurAssociationsPage() {
  const associations = await prisma.association.findMany({ orderBy: { denomination: "asc" } });

  const associationsAffichees: AssociationLigne[] = associations.map((a) => {
    const rescrit = ligneRescrit(a);
    return {
      id: a.id,
      nom: a.denomination,
      rna: a.rna,
      rescrit: rescrit.label,
      rescritVariant: rescrit.variant,
      habilitation: libelleHabilitation(a.habilitationStatut),
      habilitationVariant: associationHabilitee(a.habilitationStatut) ? "habilitee" : "absente",
      verifiee: a.verifiee,
    };
  });

  return <AssociationsClient associations={associationsAffichees} />;
}
