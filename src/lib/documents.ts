export type TypeDocument =
  | "KBIS"
  | "RECEPISSE_RNA"
  | "ATTESTATION_ASSURANCE"
  | "STATUTS_SIGNES"
  | "PREUVE_RESCRIT_FISCAL"
  | "HABILITATION_AIDE_ALIMENTAIRE"
  | "DECLARATION_DDPP"
  | "PV_ASSEMBLEE_GENERALE"
  | "ASSURANCE_TRANSPORT_STOCKAGE"
  | "ATTESTATION_CHAINE_FROID"
  | "MANDAT_SIGNATURE_BENEVOLE";

export type DefinitionDocument = {
  type: TypeDocument;
  label: string;
  aide: string;
  obligatoire: boolean;
  // Documents pour lesquels l'appli propose un modèle pré-rempli (identité de l'association) à
  // télécharger, faire signer, puis téléverser — plutôt qu'une simple case à cocher en interne.
  modeleUrl?: string;
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
  {
    type: "PV_ASSEMBLEE_GENERALE",
    label: "PV d'assemblée générale",
    aide: "Le procès-verbal désignant les dirigeants (président, trésorier...) habilités à signer la convention, les bons de remise et les reçus fiscaux.",
    obligatoire: false,
  },
  {
    type: "ASSURANCE_TRANSPORT_STOCKAGE",
    label: "Assurance transport/stockage",
    aide: "Obligatoire uniquement si votre association assure elle-même la collecte (véhicules, entrepôts, chambres froides).",
    obligatoire: false,
  },
  {
    type: "ATTESTATION_CHAINE_FROID",
    label: "Attestation chaîne du froid",
    aide: "Attestation sur l'honneur de votre capacité matérielle à respecter la chaîne du froid, signée par votre représentant légal. Visible par les entreprises donatrices avant qu'elles ne se positionnent.",
    obligatoire: false,
    modeleUrl: "/api/attestation-chaine-froid/pdf",
  },
  {
    type: "MANDAT_SIGNATURE_BENEVOLE",
    label: "Mandat de signature à un bénévole",
    aide: "La délégation de pouvoir signée par le président habilitant un bénévole nommé à signer les bordereaux de remise au nom de l'association.",
    obligatoire: false,
    modeleUrl: "/api/mandat-signature-benevole/pdf",
  },
];

/** Vérifie que le type de document demandé appartient bien à la liste autorisée pour ce rôle. */
export function definitionDocumentPourRole(
  role: "ENTREPRISE" | "ASSOCIATION",
  type: string
): DefinitionDocument {
  const liste = role === "ENTREPRISE" ? DOCUMENTS_ENTREPRISE : DOCUMENTS_ASSOCIATION;
  const trouve = liste.find((d) => d.type === type);
  if (!trouve) throw new Error(`Type de document invalide pour ce profil : ${type}`);
  return trouve;
}

export const TAILLE_MAX_DOCUMENT_OCTETS = 5 * 1024 * 1024;

/**
 * Types MIME acceptés pour un document du coffre-fort. Restreint volontairement à des formats
 * qui ne s'exécutent jamais comme du contenu actif dans un navigateur (contrairement à
 * text/html, image/svg+xml, etc.), pour empêcher qu'un fichier téléversé serve de vecteur XSS
 * lorsqu'il est ensuite resservi avec Content-Disposition: inline.
 */
const TYPES_MIME_AUTORISES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validerFichierDocument(fichier: File): { ok: true } | { ok: false; error: string } {
  if (fichier.size === 0) return { ok: false, error: "Aucun fichier sélectionné." };
  if (fichier.size > TAILLE_MAX_DOCUMENT_OCTETS) return { ok: false, error: "Fichier trop volumineux (5 Mo maximum)." };
  if (!TYPES_MIME_AUTORISES.has(fichier.type)) {
    return { ok: false, error: "Format non accepté : seuls les PDF et images (JPEG, PNG, WebP) sont autorisés." };
  }
  return { ok: true };
}

/** Nettoie un nom de fichier fourni par l'utilisateur avant de le stocker/renvoyer dans un en-tête HTTP. */
export function nomFichierSur(nomOriginal: string): string {
  const base = nomOriginal.split(/[/\\]/).pop() ?? "document";
  const nettoye = base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-150);
  return nettoye || "document";
}
