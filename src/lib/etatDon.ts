/**
 * État d'un don tel que l'entreprise le voit dans « Mes dons » (cahier des charges E10), et
 * l'action qu'on attend d'elle. Calculé à partir du statut du don et de ses bons d'enlèvement.
 */

export type BonPourEtat = {
  id: string;
  associationNom: string;
  confirme: boolean;
  enAttenteValidationDonateur: boolean;
  signatureDonateurLe: Date | null;
  signatureAssociationLe: Date | null;
};

export type EtatDon = {
  libelle: string;
  /** Une action de l'entreprise est attendue (affiché en avant, compté sur l'accueil). */
  aTraiter: boolean;
  famille: "A_TRAITER" | "EN_COURS" | "ANNULE";
};

export function etatDuBon(bon: BonPourEtat): EtatDon {
  if (bon.confirme) return { libelle: "Enlèvement confirmé", aTraiter: false, famille: "EN_COURS" };
  if (bon.enAttenteValidationDonateur) return { libelle: "Demande partielle à valider", aTraiter: true, famille: "A_TRAITER" };
  if (bon.signatureDonateurLe && bon.signatureAssociationLe) {
    return { libelle: "Signé par les deux, à confirmer", aTraiter: true, famille: "A_TRAITER" };
  }
  if (bon.signatureDonateurLe) return { libelle: "Signé par vous, en attente de l'association", aTraiter: false, famille: "EN_COURS" };
  if (bon.signatureAssociationLe) return { libelle: "Signé par l'association, à vous de signer", aTraiter: true, famille: "A_TRAITER" };
  return { libelle: "Pris en charge, à signer", aTraiter: true, famille: "A_TRAITER" };
}

export function etatDuDon(don: { statut: string; publieDepuis: string | null; bons: BonPourEtat[] }): EtatDon {
  if (don.statut === "ANNULE") return { libelle: "Annulé", aTraiter: false, famille: "ANNULE" };
  const enCours = don.bons.filter((b) => !b.confirme);
  const etats = enCours.map(etatDuBon);
  const urgent = etats.find((e) => e.aTraiter);
  if (urgent) return urgent;
  if (etats.length > 0) return etats[0];
  if (don.statut === "PUBLIE") {
    const depuis = don.publieDepuis ? ` (${don.publieDepuis})` : "";
    return {
      libelle: don.bons.length > 0 ? `Publié, en partie réservé${depuis}` : `Publié, en attente d'une association${depuis}`,
      aTraiter: false,
      famille: "EN_COURS",
    };
  }
  if (don.bons.length === 0) return { libelle: "Pris en charge, sans bon d'enlèvement", aTraiter: false, famille: "EN_COURS" };
  return { libelle: "Enlèvement confirmé, en attente des autres parts", aTraiter: false, famille: "EN_COURS" };
}
