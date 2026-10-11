/**
 * Niveaux d'accès au sein d'une organisation (chantier C4c, décision de Bruno) :
 * - ADMINISTRATEUR : tout (informations, documents, utilisateurs, conventions, reçus, planning…) ;
 * - OPERATEUR : le quotidien (dons, positionnement, contrôle et signature des bons, messagerie) ;
 * - LECTURE : consultation seule.
 * Le serveur vérifie le niveau à chaque action (src/lib/sessionLimitee.ts) ; les écrans masquent
 * les boutons non permis (décision B2 : tous les boutons). Le coordinateur n'est pas concerné.
 * Chacun garde la main sur son propre compte (nom, mot de passe, e-mail, notifications).
 */

export type NiveauAcces = "ADMINISTRATEUR" | "OPERATEUR" | "LECTURE";

export const NIVEAUX_ACCES: { id: NiveauAcces; label: string; description: string }[] = [
  { id: "ADMINISTRATEUR", label: "Administrateur", description: "Tout, y compris les informations, les documents et les utilisateurs" },
  { id: "OPERATEUR", label: "Opérateur", description: "Le quotidien : dons, bons, signatures, messagerie" },
  { id: "LECTURE", label: "Lecture", description: "Consulter, sans rien modifier" },
];

const RANG: Record<NiveauAcces, number> = { LECTURE: 0, OPERATEUR: 1, ADMINISTRATEUR: 2 };

export function niveauSuffisant(niveau: NiveauAcces | undefined, minimum: NiveauAcces): boolean {
  return RANG[niveau ?? "ADMINISTRATEUR"] >= RANG[minimum];
}

export function libelleNiveau(niveau: NiveauAcces): string {
  return NIVEAUX_ACCES.find((n) => n.id === niveau)?.label ?? niveau;
}

export function niveauValide(valeur: string): valeur is NiveauAcces {
  return NIVEAUX_ACCES.some((n) => n.id === valeur);
}

export const MESSAGE_RESERVE: Record<Exclude<NiveauAcces, "LECTURE">, string> = {
  OPERATEUR: "Votre accès est en lecture seule : cette action est réservée aux opérateurs et administrateurs.",
  ADMINISTRATEUR: "Cette action est réservée aux administrateurs de votre organisation.",
};
