// Attestation sur l'honneur de capacité matérielle à respecter la chaîne du froid : le donateur
// peut refuser de céder ses invendus s'il n'a pas cette assurance (cf. checklist justificatifs
// associations). Les items reprennent le modèle "Attestation chaîne du froid".

export type GroupeChaineFroid = { id: string; titre: string; items: { id: string; label: string }[] };

export const GROUPES_CHAINE_FROID: GroupeChaineFroid[] = [
  {
    id: "logistique",
    titre: "Moyens logistiques et de transport",
    items: [
      { id: "vehicule_frigo", label: "Véhicule frigorifique ou isotherme agréé" },
      { id: "contenants_isothermes", label: "Conteneurs/caissons isothermes avec accumulateurs de froid" },
      { id: "glacieres", label: "Glacières professionnelles adaptées aux volumes transportés" },
      { id: "thermometre", label: "Thermomètre à sonde ou infrarouge pour contrôle à réception" },
    ],
  },
  {
    id: "stockage",
    titre: "Moyens d'entreposage et de stockage sur site",
    items: [
      { id: "refrigerateur", label: "Réfrigérateur(s)/armoire(s) froide(s) positive(s) (0 °C à +4 °C)" },
      { id: "congelateur", label: "Congélateur(s)/conservateur(s) négatif(s) (-18 °C ou inférieur)" },
      { id: "fiche_releve", label: "Fiche de contrôle et de relevé quotidien des températures tenue à jour" },
    ],
  },
  {
    id: "engagements",
    titre: "Engagements opérationnels",
    items: [
      { id: "refus_non_conforme", label: "Refuser systématiquement toute denrée hors des seuils thermiques réglementaires" },
      { id: "delais_reduits", label: "Réduire au minimum les délais de transport et de mise sous froid" },
      { id: "pas_recongelation", label: "Ne procéder à aucune recongélation d'un produit décongelé" },
    ],
  },
];

export const TOUS_ITEMS_CHAINE_FROID: string[] = GROUPES_CHAINE_FROID.flatMap((g) => g.items.map((i) => i.id));

export function itemsChaineFroidValides(ids: string[]): string[] {
  const connus = new Set(TOUS_ITEMS_CHAINE_FROID);
  return ids.filter((id) => connus.has(id));
}

/** Vrai si tous les moyens/engagements du modèle sont cochés : condition du badge affiché au donateur. */
export function chaineFroidComplete(moyens: string[]): boolean {
  return TOUS_ITEMS_CHAINE_FROID.every((id) => moyens.includes(id));
}
