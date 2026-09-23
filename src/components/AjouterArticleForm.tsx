"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ajouterArticleManuel, ajouterArticleScanne, rechercherProduitAction } from "@/app/actions";
import BarcodeScanner from "@/components/BarcodeScanner";
import PointsChargement from "@/components/PointsChargement";

export type ArticleAjoute = { id: string; designation: string; quantiteDeclaree: string; poidsKg: number };

export default function AjouterArticleForm({ donId, onAjoute }: { donId: string; onAjoute: (article: ArticleAjoute) => void }) {
  const [afficherFormulaireManuel, setAfficherFormulaireManuel] = useState(false);
  const [designation, setDesignation] = useState("");
  const [poids, setPoids] = useState("");
  const [unite, setUnite] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [afficherScanner, setAfficherScanner] = useState(false);
  const [scanEnCours, setScanEnCours] = useState(false);
  const [articleScanne, setArticleScanne] = useState<{
    codeBarres: string;
    designation: string;
    poidsUnitaireKg: string;
  } | null>(null);
  const [nombreUnites, setNombreUnites] = useState("1");
  const [erreurScan, setErreurScan] = useState<string | null>(null);

  const ajouter = (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    startTransition(async () => {
      const resultat = await ajouterArticleManuel(donId, designation, poids, unite);
      if (!resultat.ok) {
        setErreur(resultat.error ?? "Impossible d'ajouter cet article.");
        return;
      }
      onAjoute({
        id: resultat.id ?? `temp-${Date.now()}`,
        designation: designation.trim(),
        quantiteDeclaree: resultat.quantiteDeclaree ?? "Vrac",
        poidsKg: Number(poids.replace(",", ".")),
      });
      setDesignation("");
      setPoids("");
      setUnite("");
      setAfficherFormulaireManuel(false);
    });
  };

  const codeDetecte = (code: string) => {
    setAfficherScanner(false);
    setAfficherFormulaireManuel(false);
    setScanEnCours(true);
    setErreurScan(null);
    startTransition(async () => {
      const produit = await rechercherProduitAction(code);
      setScanEnCours(false);
      if (produit) {
        setArticleScanne({
          codeBarres: code,
          designation: produit.designation,
          poidsUnitaireKg: produit.poidsUnitaireKg != null ? String(produit.poidsUnitaireKg).replace(".", ",") : "",
        });
      } else {
        setArticleScanne({ codeBarres: code, designation: "", poidsUnitaireKg: "" });
        setErreurScan("Produit non trouvé sur Open Food Facts. Renseigne les informations manuellement.");
      }
      setNombreUnites("1");
    });
  };

  const poidsTotalScanne =
    articleScanne && nombreUnites
      ? (Number(articleScanne.poidsUnitaireKg.replace(",", ".")) || 0) * (Number(nombreUnites) || 0)
      : 0;

  const ajouterScanne = (event: FormEvent) => {
    event.preventDefault();
    if (!articleScanne) return;
    setErreur(null);
    setErreurScan(null);
    const poidsUnitaire = Number(articleScanne.poidsUnitaireKg.replace(",", "."));
    const unites = Number(nombreUnites);
    const designationScannee = articleScanne.designation;
    startTransition(async () => {
      const resultat = await ajouterArticleScanne(donId, articleScanne.codeBarres, designationScannee, poidsUnitaire, unites);
      if (!resultat.ok) {
        setErreurScan(resultat.error ?? "Impossible d'ajouter cet article.");
        return;
      }
      onAjoute({
        id: resultat.id ?? `temp-${Date.now()}`,
        designation: designationScannee.trim(),
        quantiteDeclaree: `${unites} unité(s) × ${poidsUnitaire.toLocaleString("fr-FR")} kg`,
        poidsKg: resultat.poidsKg ?? poidsUnitaire * unites,
      });
      setArticleScanne(null);
      setNombreUnites("1");
    });
  };

  return (
    <div>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => {
            setArticleScanne(null);
            setErreurScan(null);
            setAfficherScanner(true);
          }}
          className="flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-brand px-2.5 py-3.5 text-xs font-semibold text-white transition-transform active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 8V6C4 4.9 4.9 4 6 4H8M20 8V6C20 4.9 19.1 4 18 4H16M4 16V18C4 19.1 4.9 20 6 20H8M20 16V18C20 19.1 19.1 20 18 20H16"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <rect x="8" y="9" width="2" height="6" fill="#FFFFFF" />
            <rect x="11" y="9" width="1" height="6" fill="#FFFFFF" />
            <rect x="14" y="9" width="2" height="6" fill="#FFFFFF" />
          </svg>
          Scanner un code-barres
        </button>
        <button
          type="button"
          onClick={() => {
            setArticleScanne(null);
            setAfficherFormulaireManuel((v) => !v);
          }}
          className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-3.5 text-xs font-semibold transition-transform active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5V19M5 12H19" stroke="#201F1B" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Ajouter manuellement
        </button>
      </div>

      {afficherFormulaireManuel && (
        <form onSubmit={ajouter} className="mt-2.5 flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3.5">
          {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}
          <div>
            <label htmlFor="designation" className="mb-1 block text-xs text-ink-muted">
              Désignation
            </label>
            <input
              id="designation"
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Ex. Pommes Golden"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label htmlFor="unite" className="mb-1 block text-xs text-ink-muted">
                Quantité (unité) — optionnel
              </label>
              <input
                id="unite"
                type="text"
                inputMode="numeric"
                value={unite}
                onChange={(e) => setUnite(e.target.value)}
                placeholder="Ex. 6"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="poids" className="mb-1 block text-xs text-ink-muted">
                Poids total (kg)
              </label>
              <input
                id="poids"
                type="text"
                inputMode="decimal"
                value={poids}
                onChange={(e) => setPoids(e.target.value)}
                placeholder="Ex. 6"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <button type="submit" disabled={isPending} className="self-start rounded-full bg-ink px-4.5 py-2 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-50">
            Ajouter à la liste
          </button>
        </form>
      )}

      {scanEnCours && (
        <div className="mt-2.5 flex animate-fade-slide-in items-center justify-center gap-2 rounded-xl border border-border bg-surface p-3.5 text-center text-xs text-ink-muted">
          Recherche du produit <PointsChargement />
        </div>
      )}

      {articleScanne && (
        <form onSubmit={ajouterScanne} className="mt-2.5 flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3.5">
          {erreurScan && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreurScan}</div>}
          <div className="text-xs text-ink-muted">Code-barres scanné : {articleScanne.codeBarres}</div>
          <div>
            <label htmlFor="designationScan" className="mb-1 block text-xs text-ink-muted">
              Désignation
            </label>
            <input
              id="designationScan"
              type="text"
              value={articleScanne.designation}
              onChange={(e) => setArticleScanne((prev) => (prev ? { ...prev, designation: e.target.value } : prev))}
              placeholder="Ex. Nutella 400g"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="poidsUnitaire" className="mb-1 block text-xs text-ink-muted">
                Poids unitaire (kg)
              </label>
              <input
                id="poidsUnitaire"
                type="text"
                inputMode="decimal"
                value={articleScanne.poidsUnitaireKg}
                onChange={(e) => setArticleScanne((prev) => (prev ? { ...prev, poidsUnitaireKg: e.target.value } : prev))}
                placeholder="Ex. 0,4"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="nombreUnites" className="mb-1 block text-xs text-ink-muted">
                Nombre d&apos;unités remises
              </label>
              <input
                id="nombreUnites"
                type="text"
                inputMode="numeric"
                value={nombreUnites}
                onChange={(e) => setNombreUnites(e.target.value)}
                placeholder="Ex. 12"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="text-xs font-semibold text-ink">
            Poids total : {poidsTotalScanne.toLocaleString("fr-FR")} kg
          </div>
          <div className="flex gap-2.5">
            <button type="submit" disabled={isPending} className="rounded-full bg-ink px-4.5 py-2 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-50">
              Ajouter à la liste
            </button>
            <button type="button" onClick={() => setArticleScanne(null)} className="rounded-full px-4.5 py-2 text-sm font-semibold text-ink-muted transition-transform active:scale-95">
              Annuler
            </button>
          </div>
        </form>
      )}

      {afficherScanner && <BarcodeScanner onDetected={codeDetecte} onClose={() => setAfficherScanner(false)} />}
    </div>
  );
}
