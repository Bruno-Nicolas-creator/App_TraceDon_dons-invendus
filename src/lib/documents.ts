export type TypeDocument =
  | "KBIS"
  | "RECEPISSE_RNA"
  | "ATTESTATION_ASSURANCE"
  | "STATUTS_SIGNES"
  | "PREUVE_RESCRIT_FISCAL"
  | "HABILITATION_AIDE_ALIMENTAIRE"
  | "DECLARATION_DDPP";

export type DefinitionDocument = {
  type: TypeDocument;
  label: string;
  aide: string;
  obligatoire: boolean;
};

export const DOCUMENTS_ENTREPRISE: DefinitionDocument[] = [
  {
    type: "KBIS",
    label: "Extrait Kbis",
    aide: "Le document du registre du commerce et des sociétés qui identifie légalement votre entreprise. Obligatoire pour publier un don sur la plateforme.",
    obligatoire: true,
  },
];

export const DOCUMENTS_ASSOCIATION: DefinitionDocument[] = [
  {
    type: "RECEPISSE_RNA",
    label: "Récépissé RNA",
    aide: "Le récépissé remis par la préfecture lors de la déclaration de votre association, avec son numéro RNA. Obligatoire pour créer votre profil.",
    obligatoire: true,
  },
  {
    type: "STATUTS_SIGNES",
    label: "Statuts de l'association",
    aide: "Les statuts signés définissant l'objet et le fonctionnement de votre association. Obligatoire pour créer votre profil.",
    obligatoire: true,
  },
  {
    type: "ATTESTATION_ASSURANCE",
    label: "Attestation d'assurance",
    aide: "Prouve que votre association est couverte par une assurance responsabilité civile pour la collecte, le transport et la distribution des denrées.",
    obligatoire: false,
  },
  {
    type: "PREUVE_RESCRIT_FISCAL",
    label: "Preuve de rescrit fiscal",
    aide: "L'accusé de dépôt ou la réponse de l'administration à votre demande de rescrit mécénat. Sécurise la réduction d'impôt de vos donateurs (art. 238 bis du CGI).",
    obligatoire: false,
  },
  {
    type: "HABILITATION_AIDE_ALIMENTAIRE",
    label: "Habilitation aide alimentaire",
    aide: "L'arrêté préfectoral ou ministériel attestant votre habilitation nationale ou régionale (art. L. 266-2 du code de l'action sociale et des familles).",
    obligatoire: false,
  },
  {
    type: "DECLARATION_DDPP",
    label: "Déclaration DDPP",
    aide: "Le récépissé de votre déclaration d'activité de manipulation de denrées auprès de la Direction départementale de la protection des populations.",
    obligatoire: false,
  },
];

export function definitionDocument(type: TypeDocument): DefinitionDocument {
  const trouve = [...DOCUMENTS_ENTREPRISE, ...DOCUMENTS_ASSOCIATION].find((d) => d.type === type);
  if (!trouve) throw new Error(`Type de document inconnu : ${type}`);
  return trouve;
}

export const TAILLE_MAX_DOCUMENT_OCTETS = 5 * 1024 * 1024;
