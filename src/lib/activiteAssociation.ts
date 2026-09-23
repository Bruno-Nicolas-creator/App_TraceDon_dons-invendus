export type TypeActivite = { id: string; label: string };

export const TYPES_ACTIVITE: TypeActivite[] = [
  { id: "epicerie_sociale", label: "Épicerie sociale" },
  { id: "distribution_colis", label: "Distribution de colis" },
  { id: "repas_maraude", label: "Repas / Maraude" },
];

const IDS_CONNUS = new Set(TYPES_ACTIVITE.map((t) => t.id));

export function typesActiviteValides(ids: string[]): string[] {
  return ids.filter((id) => IDS_CONNUS.has(id));
}

export function libelleTypeActivite(id: string): string {
  return TYPES_ACTIVITE.find((t) => t.id === id)?.label ?? id;
}

export type PreferenceAlerte = "EMAIL" | "SMS" | "SMS_EMAIL";

export const LABEL_PREFERENCE_ALERTE: Record<PreferenceAlerte, string> = {
  EMAIL: "Email uniquement",
  SMS: "SMS uniquement",
  SMS_EMAIL: "SMS et email",
};
