export type ChoixMesureAudience = "accepte" | "refuse";

const CLE_STOCKAGE = "tracedon_mesure_audience";
const EVENEMENT_CHOIX = "tracedon-choix-mesure-audience";

// Vrai seulement si une clé de projet PostHog est configurée : sans elle, aucune mesure n'existe
// et il n'y a donc rien à accepter ni à refuser (le bandeau ne s'affiche pas).
export const mesureAudienceConfiguree = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

export function lireChoix(): ChoixMesureAudience | null {
  try {
    const valeur = window.localStorage.getItem(CLE_STOCKAGE);
    return valeur === "accepte" || valeur === "refuse" ? valeur : null;
  } catch {
    return null;
  }
}

export function enregistrerChoix(choix: ChoixMesureAudience) {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, choix);
  } catch {
    // Stockage indisponible (navigation privée stricte) : le choix vaut pour cette page seulement.
  }
  window.dispatchEvent(new Event(EVENEMENT_CHOIX));
}

export function abonnerAuChoix(rappel: () => void): () => void {
  window.addEventListener(EVENEMENT_CHOIX, rappel);
  window.addEventListener("storage", rappel);
  return () => {
    window.removeEventListener(EVENEMENT_CHOIX, rappel);
    window.removeEventListener("storage", rappel);
  };
}
