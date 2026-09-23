"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ajouterArticleMateriel } from "@/app/actions";
import BarcodeScanner from "@/components/BarcodeScanner";

export type ArticleMaterielAjoute = { id: string; designation: string; quantiteDeclaree: string; aUnePhoto: boolean };

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

export default function AjouterArticleMaterielForm({
  donId,
  onAjoute,
}: {
  donId: string;
  onAjoute: (article: ArticleMaterielAjoute) => void;
}) {
  const [designation, setDesignation] = useState("");
  const [quantiteDeclaree, setQuantiteDeclaree] = useState("");
  const [codeBarres, setCodeBarres] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [afficherScanner, setAfficherScanner] = useState(false);
  const [dictEeEnCours, setDictEeEnCours] = useState(false);
  const [dictaphoneDisponible, setDictaphoneDisponible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const reconnaissanceRef = useRef<ReconnaissanceVocale | null>(null);

  // Détection différée au montage (rendu serveur sans `window`) : décalage volontaire entre le
  // HTML serveur et le premier rendu client, résolu dès l'hydratation, propre aux API navigateur.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDictaphoneDisponible(creerReconnaissanceVocale() !== null);
  }, []);

  // useMemo (pas un effect) pour l'URL elle-même : seule la révocation, un vrai effet de bord,
  // a besoin d'un useEffect.
  const apercuPhoto = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => {
    return () => {
      if (apercuPhoto) URL.revokeObjectURL(apercuPhoto);
    };
  }, [apercuPhoto]);

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
      if (texte) setDesignation((prev) => (prev ? `${prev} ${texte}` : texte));
    };
    reconnaissance.onerror = () => setDictEeEnCours(false);
    reconnaissance.onend = () => setDictEeEnCours(false);
    reconnaissanceRef.current = reconnaissance;
    setDictEeEnCours(true);
    reconnaissance.start();
  };

  const soumettre = (event: FormEvent) => {
    event.preventDefault();
    if (!designation.trim()) {
      setErreur("Merci de décrire le don.");
      return;
    }
    setErreur(null);
    setEnvoiEnCours(true);
    const formData = new FormData();
    formData.set("donId", donId);
    formData.set("designation", designation.trim());
    formData.set("quantiteDeclaree", quantiteDeclaree.trim());
    formData.set("codeBarres", codeBarres.trim());
    if (photo) formData.set("photo", photo);

    ajouterArticleMateriel(formData).then((resultat) => {
      setEnvoiEnCours(false);
      if (!resultat.ok) {
        setErreur(resultat.error ?? "Impossible d'ajouter ce don.");
        return;
      }
      onAjoute({
        id: resultat.id ?? `temp-${Date.now()}`,
        designation: designation.trim(),
        quantiteDeclaree: resultat.quantiteDeclaree ?? quantiteDeclaree.trim() ?? "1",
        aUnePhoto: !!photo,
      });
      setDesignation("");
      setQuantiteDeclaree("");
      setCodeBarres("");
      setPhoto(null);
    });
  };

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3.5">
      {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="designationMateriel" className="text-xs text-ink-muted">
            Description du don
          </label>
          {dictaphoneDisponible && (
            <button
              type="button"
              onClick={basculerDictee}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-transform active:scale-95 ${
                dictEeEnCours ? "bg-accent text-white" : "bg-surface-alt text-ink-muted"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {dictEeEnCours ? "Écoute…" : "Dicter"}
            </button>
          )}
        </div>
        <textarea
          id="designationMateriel"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="Ex. Lot de vaisselle en céramique, état neuf, cartons scellés"
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label htmlFor="quantiteMateriel" className="mb-1 block text-xs text-ink-muted">
          Quantité — optionnel
        </label>
        <input
          id="quantiteMateriel"
          type="text"
          value={quantiteDeclaree}
          onChange={(e) => setQuantiteDeclaree(e.target.value)}
          placeholder="Ex. 12 cartons, 1 lot, 30 pièces"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
        />
      </div>

      <div className="flex items-center gap-2.5">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-alt px-2.5 py-3 text-xs font-semibold text-ink transition-transform active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 8.5C4 7.4 4.9 6.5 6 6.5H8L9.2 4.5H14.8L16 6.5H18C19.1 6.5 20 7.4 20 8.5V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V8.5Z"
              stroke="#201F1B"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="12.5" r="3.4" stroke="#201F1B" strokeWidth="1.6" />
          </svg>
          {photo ? "Changer la photo" : "Ajouter une photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          onClick={() => setAfficherScanner(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-alt px-2.5 py-3 text-xs font-semibold text-ink transition-transform active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 8V6C4 4.9 4.9 4 6 4H8M20 8V6C20 4.9 19.1 4 18 4H16M4 16V18C4 19.1 4.9 20 6 20H8M20 16V18C20 19.1 19.1 20 18 20H16"
              stroke="#201F1B"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          {codeBarres ? "Code scanné ✓" : "Scanner (neuf)"}
        </button>
      </div>

      {apercuPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- aperçu local d'un fichier pas encore envoyé, pas une image optimisable par next/image
        <img src={apercuPhoto} alt="Aperçu de la photo du don" className="h-24 w-24 rounded-lg object-cover" />
      )}

      <button
        type="submit"
        disabled={envoiEnCours}
        className="self-start rounded-full bg-ink px-4.5 py-2 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
      >
        Ajouter à la liste
      </button>

      {afficherScanner && (
        <BarcodeScanner
          onDetected={(code) => {
            setCodeBarres(code);
            setAfficherScanner(false);
          }}
          onClose={() => setAfficherScanner(false)}
        />
      )}
    </form>
  );
}
