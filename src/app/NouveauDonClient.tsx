"use client";

import { useState, useTransition, type CSSProperties, type FormEvent } from "react";
import {
  ajouterArticleManuel,
  ajouterArticleScanne,
  changerModeDon,
  publierDon,
  rechercherProduitAction,
  retirerArticle,
} from "@/app/actions";
import Link from "next/link";
import BarcodeScanner from "@/components/BarcodeScanner";
import BottomTabBar from "@/components/BottomTabBar";
import PointsChargement from "@/components/PointsChargement";
import TogglePill from "@/components/TogglePill";

type Article = {
  id: string;
  designation: string;
  quantiteDeclaree: string;
  poidsKg: number;
};

type Don = {
  id: string;
  mode: "LISTE_PREALABLE" | "BORDEREAU_OUVERT";
  articles: Article[];
};

export default function NouveauDonClient({
  don,
  associationsAujourdhui,
}: {
  don: Don;
  associationsAujourdhui: string[];
}) {
  const [donId, setDonId] = useState(don.id);
  const [mode, setMode] = useState(don.mode);
  const [articles, setArticles] = useState<Article[]>(don.articles);
  const [afficherFormulaireManuel, setAfficherFormulaireManuel] = useState(false);
  const [designation, setDesignation] = useState("");
  const [poids, setPoids] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurPublication, setErreurPublication] = useState<string | null>(null);
  const [manqueKbis, setManqueKbis] = useState(false);
  const [vientDetrePublie, setVientDetrePublie] = useState(false);
  const [assigneA, setAssigneA] = useState<string | null>(null);
  const [donPublieId, setDonPublieId] = useState<string | null>(null);
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
  const [idsEnSortie, setIdsEnSortie] = useState<Set<string>>(new Set());

  const changerDeMode = (nouveauMode: typeof mode) => {
    setMode(nouveauMode);
    startTransition(() => {
      void changerModeDon(donId, nouveauMode);
    });
  };

  const retirer = (id: string) => {
    setErreur(null);
    setIdsEnSortie((prev) => new Set(prev).add(id));
    startTransition(async () => {
      try {
        await retirerArticle(id);
        setTimeout(() => {
          setArticles((prev) => prev.filter((a) => a.id !== id));
          setIdsEnSortie((prev) => {
            const suivant = new Set(prev);
            suivant.delete(id);
            return suivant;
          });
        }, 200);
      } catch (e) {
        setIdsEnSortie((prev) => {
          const suivant = new Set(prev);
          suivant.delete(id);
          return suivant;
        });
        setErreur(e instanceof Error ? e.message : "Impossible de retirer cet article.");
      }
    });
  };

  const ajouter = (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    startTransition(async () => {
      const resultat = await ajouterArticleManuel(donId, designation, poids);
      if (!resultat.ok) {
        setErreur(resultat.error ?? "Impossible d'ajouter cet article.");
        return;
      }
      setArticles((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, designation: designation.trim(), quantiteDeclaree: `${poids} kg`, poidsKg: Number(poids.replace(",", ".")) },
      ]);
      setDesignation("");
      setPoids("");
      setAfficherFormulaireManuel(false);
      setVientDetrePublie(false);
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
      setArticles((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          designation: designationScannee.trim(),
          quantiteDeclaree: `${unites} unité(s) × ${poidsUnitaire.toLocaleString("fr-FR")} kg`,
          poidsKg: resultat.poidsKg ?? poidsUnitaire * unites,
        },
      ]);
      setArticleScanne(null);
      setNombreUnites("1");
      setVientDetrePublie(false);
    });
  };

  const publier = () => {
    setErreurPublication(null);
    setManqueKbis(false);
    startTransition(async () => {
      const donPublieAvant = donId;
      const resultat = await publierDon(donId);
      if (!resultat.ok) {
        setErreurPublication(resultat.error);
        setManqueKbis(!!resultat.manqueKbis);
        return;
      }
      setDonId(resultat.id);
      setMode(resultat.mode as typeof mode);
      setArticles(resultat.articles);
      setAssigneA(resultat.assigneA);
      setDonPublieId(resultat.assigneA ? donPublieAvant : null);
      setVientDetrePublie(true);
    });
  };

  const poidsTotal = articles.reduce((total, a) => total + a.poidsKg, 0);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          type="button"
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="flex-1 font-display text-xl font-semibold">Nouveau don</h1>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted">Brouillon</span>
      </header>

      <div className="space-y-2.5 px-5 pb-4">
        <TogglePill
          valeur={mode}
          onChange={changerDeMode}
          options={[
            { valeur: "BORDEREAU_OUVERT", label: "Bordereau ouvert" },
            { valeur: "LISTE_PREALABLE", label: "Liste à l'avance" },
          ]}
        />
        <Link
          href="/associations"
          className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2.5 text-xs font-semibold text-ink transition-transform active:scale-[0.98]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 21C12 21 19 15.5 19 10.5C19 6.4 15.9 3 12 3C8.1 3 5 6.4 5 10.5C5 15.5 12 21 12 21Z"
              stroke="#201F1B"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="10.5" r="2.3" stroke="#201F1B" strokeWidth="1.6" />
          </svg>
          Voir les associations à proximité
        </Link>
      </div>

      <main className="flex-1 space-y-5 px-5 pb-4">
        {associationsAujourdhui.length === 1 && !vientDetrePublie && (
          <div className="rounded-xl bg-brand-tint px-4 py-3.5 text-sm leading-snug text-brand-dark">
            Aujourd&apos;hui, ce don sera directement remis à <strong>{associationsAujourdhui[0]}</strong> (planning
            récurrent).
          </div>
        )}
        {associationsAujourdhui.length > 1 && !vientDetrePublie && (
          <div className="rounded-xl bg-surface-alt px-4 py-3.5 text-sm leading-snug text-ink-muted">
            Plusieurs associations sont planifiées aujourd&apos;hui ({associationsAujourdhui.join(", ")}) : le don sera
            publié pour qu&apos;une d&apos;entre elles se positionne.
          </div>
        )}
        {vientDetrePublie && (
          <div className="space-y-2 rounded-xl bg-brand-tint px-4 py-3.5">
            <div className="flex items-start justify-between gap-2.5">
              <p className="text-sm leading-snug text-brand-dark">
                {assigneA
                  ? `Don enregistré et assigné à ${assigneA}. Le bon d'enlèvement est prêt pour la signature.`
                  : "Don publié ! Il est visible des associations. Un nouveau brouillon a été créé ci-dessous."}
              </p>
              <button
                type="button"
                onClick={() => setVientDetrePublie(false)}
                aria-label="Fermer"
                className="shrink-0 text-brand-dark"
              >
                &times;
              </button>
            </div>
            {donPublieId && (
              <Link
                href={`/bon-enlevement/${donPublieId}`}
                className="block w-full rounded-full bg-brand-dark py-2.5 text-center text-xs font-bold text-white transition-transform active:scale-[0.98]"
              >
                Voir et signer le bon d&apos;enlèvement
              </Link>
            )}
          </div>
        )}
        {mode === "LISTE_PREALABLE" && (
          <div className="flex items-start gap-2.5 rounded-xl bg-brand-tint px-4 py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
              <path d="M12 8V13" stroke="#2E6B4E" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1" fill="#2E6B4E" />
              <circle cx="12" cy="12" r="9" stroke="#2E6B4E" strokeWidth="2" />
            </svg>
            <p className="text-sm leading-snug text-brand-dark">
              En attente qu&apos;une association se positionne, ou assignation par le coordinateur.
            </p>
          </div>
        )}

        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Articles ajoutés</h2>
            <span className="text-sm text-ink-muted">{articles.length} articles</span>
          </div>

          <ul className="space-y-2.5">
            {articles.map((article, i) => (
              <li
                key={article.id}
                style={{ "--espace-sortie": "0.625rem", animationDelay: idsEnSortie.has(article.id) ? undefined : `${i * 40}ms` } as CSSProperties}
                className={`flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 ${
                  idsEnSortie.has(article.id) ? "animate-fade-out-collapse" : "animate-fade-slide-in"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7L12 3L20 7V17L12 21L4 17V7Z" stroke="#6B6459" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{article.designation}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {article.quantiteDeclaree} · {article.poidsKg.toLocaleString("fr-FR")} kg
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => retirer(article.id)}
                  aria-label={`Retirer ${article.designation}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg transition-transform active:scale-90"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6L18 18M18 6L6 18" stroke="#6B6459" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
            {articles.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-ink-muted">
                Aucun article pour l&apos;instant.
              </li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-semibold">Ajouter un article</h2>
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
                  Désignation (produit en vrac)
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
              <div>
                <label htmlFor="poids" className="mb-1 block text-xs text-ink-muted">
                  Poids net (kg)
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
        </section>
      </main>

      {afficherScanner && <BarcodeScanner onDetected={codeDetecte} onClose={() => setAfficherScanner(false)} />}

      <footer className="border-t border-border bg-surface px-5 pt-3.5 pb-5">
        {erreurPublication && (
          <div className="mb-3 rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">
            {erreurPublication}
            {manqueKbis && (
              <>
                {" "}
                <Link href="/profil" className="font-semibold underline">
                  Compléter mon coffre-fort
                </Link>
              </>
            )}
          </div>
        )}
        <div className="mb-3 flex justify-between text-sm text-ink-muted">
          <span>{articles.length} articles</span>
          <span>Poids estimé : {poidsTotal.toLocaleString("fr-FR")} kg</span>
        </div>
        <button
          type="button"
          onClick={publier}
          disabled={articles.length === 0 || isPending}
          className="w-full rounded-full bg-brand py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          Publier le don
        </button>
      </footer>
      <BottomTabBar active="dons" role="ENTREPRISE" />
    </div>
  );
}
