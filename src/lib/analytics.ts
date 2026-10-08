import posthog from "posthog-js";
import { lireChoix, type ChoixMesureAudience } from "./consentement";

// Mesure d'audience soumise au consentement. Rien n'est envoyé tant que le visiteur n'a pas
// accepté, ni après un refus ou un retrait. La clé ci-dessous est la clé PUBLIQUE du projet
// (phc_…), faite pour être visible du navigateur. Une clé personnelle d'API (phx_…) ne doit jamais
// être placée ici ni dans une variable NEXT_PUBLIC_ : elle donne accès en lecture/écriture aux données.
const CLE_PROJET = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const ENREGISTREMENT_ECRAN_ACTIF = process.env.NEXT_PUBLIC_POSTHOG_REPLAY === "1";

// Pages dont l'enregistrement d'écran est autorisé (liste blanche : toute nouvelle page est exclue
// par défaut). Les pages avec des documents, des messages, des coordonnées ou des formulaires
// d'identité (profil, inscription, connexion, bons, conventions, attestations, coordinateur...) n'y sont pas.
const PAGES_ENREGISTRABLES = new Set(["/", "/dons", "/associations", "/planning", "/nouveau-don-materiel"]);

const ATTRIBUTS_MASQUES = new Set(["href", "src", "srcset", "action", "formaction", "poster", "data-src", "data-href"]);

const MOTIF_IDENTIFIANT = /\/c[a-z0-9]{24}(?=\/|$)/g;

// Les identifiants de dons, bons, conventions... apparaissent dans les adresses : on les remplace
// et on retire les paramètres d'adresse, pour que seule la page visitée soit connue.
export function anonymiserAdresse(valeur: string): string {
  return valeur.split(/[?#]/)[0].replace(MOTIF_IDENTIFIANT, "/:id");
}

function cheminDe(adresse: string): string {
  try {
    return new URL(adresse, window.location.origin).pathname;
  } catch {
    return adresse;
  }
}

function nettoyerEvenement<T extends { properties?: Record<string, unknown> } | null>(evenement: T): T {
  if (!evenement?.properties) return evenement;
  const proprietes = evenement.properties;
  for (const [nom, valeur] of Object.entries(proprietes)) {
    if (typeof valeur === "string" && (nom.includes("url") || nom.includes("referrer") || nom.includes("pathname"))) {
      proprietes[nom] = anonymiserAdresse(valeur);
    }
  }
  // Les enregistrements d'écran portent l'adresse de la page dans leurs évènements de départ.
  const instantanes = proprietes["$snapshot_data"];
  if (Array.isArray(instantanes)) {
    for (const element of instantanes as { type?: number; data?: { href?: unknown } }[]) {
      if (element?.type === 4 && typeof element.data?.href === "string") element.data.href = anonymiserAdresse(element.data.href);
    }
  }
  // Chaîne complète du navigateur : inutile pour compter des visites, et propice à l'identification.
  delete proprietes["$raw_user_agent"];
  // Un message d'erreur peut contenir du texte saisi : on garde le type et la pile, pas plus de 200 caractères de message.
  const erreurs = proprietes["$exception_list"];
  if (Array.isArray(erreurs)) {
    for (const erreur of erreurs as { value?: unknown }[]) {
      if (typeof erreur.value === "string") {
        erreur.value = erreur.value
          .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
          .replace(/\d[\d\s.-]{5,}\d/g, "[nombre]")
          .slice(0, 200);
      }
    }
  }
  return evenement;
}

// Au chargement d'une page : PostHog n'est démarré que si le visiteur a déjà accepté. Sans accord
// (premier passage ou refus), la bibliothèque n'est même pas initialisée : aucune requête ne part,
// pas même le téléchargement de sa configuration, qui exposerait déjà l'adresse IP du visiteur.
export function initialiserMesureAudience() {
  if (lireChoix() === "accepte") demarrer();
}

function demarrer() {
  if (!CLE_PROJET || CLE_PROJET.startsWith("phx_") || posthog.__loaded) return;
  try {
    posthog.init(CLE_PROJET, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      // Désactivé par défaut : aucune requête ne part avant un accord explicite.
      opt_out_capturing_by_default: true,
      persistence: "memory",
      person_profiles: "identified_only",
      autocapture: false,
      capture_pageview: "history_change",
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_exceptions: { capture_unhandled_errors: true, capture_unhandled_rejections: true, capture_console_errors: false },
      disable_session_recording: true,
      disable_surveys: true,
      respect_dnt: true,
      session_recording: {
        // Tout texte et tout champ sont masqués ; images, cartes et cadres externes sont remplacés par un bloc vide.
        maskAllInputs: true,
        maskTextSelector: "*",
        blockSelector: "img, canvas, iframe, video, picture, [data-ph-no-capture]",
        recordCrossOriginIframes: false,
        // Les liens et sources d'images peuvent contenir des identifiants ou des coordonnées (itinéraires) : masqués.
        maskAttributeFn: (nom, valeur) => (ATTRIBUTS_MASQUES.has(nom) ? "*" : valeur),
      },
      before_send: (evenement) => nettoyerEvenement(evenement),
    });
    // Pas d'évènement "$opt_in" : on ne veut compter que de vraies actions, pas chaque chargement de page.
    posthog.opt_in_capturing({ captureEventName: false });
    ajusterEnregistrement(window.location.pathname);
  } catch {
    // La mesure d'audience ne doit jamais empêcher le site de fonctionner.
  }
}

// Applique le choix du visiteur (bandeau ou profil) : accord = collecte active, refus ou retrait = arrêt immédiat.
export function appliquerChoix(choix: ChoixMesureAudience) {
  try {
    if (choix === "accepte") {
      demarrer();
    } else if (posthog.__loaded) {
      posthog.stopSessionRecording();
      posthog.opt_out_capturing();
    }
  } catch {
    // voir ci-dessus
  }
}

// À appeler AU DÉBUT d'une navigation : si la page visée n'est pas enregistrable, on arrête avant de l'afficher.
// Le démarrage, lui, se fait seulement une fois la nouvelle page affichée (cf. SuiviNavigation) : démarrer ici
// enregistrerait encore la page que l'on quitte, qui peut être une page sensible.
export function preparerNavigation(adresse: string) {
  if (!posthog.__loaded) return;
  try {
    if (!PAGES_ENREGISTRABLES.has(cheminDe(adresse))) posthog.stopSessionRecording();
  } catch {
    // voir ci-dessus
  }
}

// L'enregistrement d'écran n'est actif que si : option activée, accord donné, page dans la liste blanche.
export function ajusterEnregistrement(adresse: string) {
  if (!posthog.__loaded) return;
  try {
    const autorise =
      ENREGISTREMENT_ECRAN_ACTIF && posthog.has_opted_in_capturing() && PAGES_ENREGISTRABLES.has(cheminDe(adresse));
    if (autorise) posthog.startSessionRecording(true);
    else posthog.stopSessionRecording();
  } catch {
    // voir ci-dessus
  }
}

// Compte un évènement métier (sans aucune donnée personnelle). Ne fait rien sans accord.
export function suivre(evenement: "don_publie" | "positionnement_envoye", proprietes?: { type?: "alimentaire" | "materiel" }) {
  try {
    if (posthog.__loaded && posthog.has_opted_in_capturing()) posthog.capture(evenement, proprietes);
  } catch {
    // voir ci-dessus
  }
}
