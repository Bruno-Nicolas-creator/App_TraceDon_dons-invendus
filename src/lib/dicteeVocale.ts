"use client";

import { useEffect, useRef, useState } from "react";

// L'API Web Speech n'est standardisée nulle part dans le DOM lib de TypeScript : on ne type que
// ce qu'on utilise, sans dépendre d'un paquet de types tiers pour une fonctionnalité optionnelle.
type ReconnaissanceVocale = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function creerReconnaissanceVocale(): ReconnaissanceVocale | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => ReconnaissanceVocale }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => ReconnaissanceVocale }).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Dictée vocale française réutilisable : dégrade silencieusement (bouton absent) si l'API Web
 * Speech n'est pas disponible dans le navigateur. `onTexte` reçoit le texte reconnu à chaque
 * fin de dictée ; c'est à l'appelant de décider comment le fusionner avec le texte existant.
 */
export function useDicteeVocale(onTexte: (texte: string) => void) {
  const [dictaphoneDisponible, setDictaphoneDisponible] = useState(false);
  const [dictEeEnCours, setDictEeEnCours] = useState(false);
  const reconnaissanceRef = useRef<ReconnaissanceVocale | null>(null);

  // Détection différée au montage (rendu serveur sans `window`) : décalage volontaire entre le
  // HTML serveur et le premier rendu client, résolu dès l'hydratation, propre aux API navigateur.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDictaphoneDisponible(creerReconnaissanceVocale() !== null);
  }, []);

  const basculerDictee = () => {
    if (dictEeEnCours) {
      reconnaissanceRef.current?.stop();
      return;
    }
    const reconnaissance = creerReconnaissanceVocale();
    if (!reconnaissance) return;
    reconnaissance.lang = "fr-FR";
    reconnaissance.interimResults = false;
    reconnaissance.onresult = (event) => {
      const texte = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (texte) onTexte(texte);
    };
    reconnaissance.onerror = () => setDictEeEnCours(false);
    reconnaissance.onend = () => setDictEeEnCours(false);
    reconnaissanceRef.current = reconnaissance;
    setDictEeEnCours(true);
    reconnaissance.start();
  };

  return { dictaphoneDisponible, dictEeEnCours, basculerDictee };
}
