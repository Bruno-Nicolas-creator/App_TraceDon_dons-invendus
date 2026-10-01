"use client";

import { useState, useTransition } from "react";
import {
  definirDetailsLotAction,
  extraireArticlesAction,
  publierDon,
  retirerArticle,
  retirerPieceJointeDonAction,
  televerserPieceJointeDonAction,
} from "@/app/actions";
import Link from "next/link";
import BottomTabBar from "@/components/BottomTabBar";
import BoutonDictee from "@/components/BoutonDictee";
import AjouterArticleForm, { type ArticleAjoute } from "@/components/AjouterArticleForm";
import ChevronIcon from "@/components/ChevronIcon";
import { libelleCategorieDon } from "@/lib/categoriesDon";
import { useDicteeVocale } from "@/lib/dicteeVocale";

type SectionId = "infos" | "articles" | "logistique";

type Don = {
  id: string;
  titre: string;
  description: string;
  adresseRecuperation: string;
  instructionsAcces: string;
  pieceJointeNomFichier: string | null;
};

export default function NouveauDonClient({
  don,
  articles: articlesInitiaux = [],
  adresseEntreprise,
  associationsAujourdhui,
  congesJusquau,
  nonLusMessages = 0,
  peutDonnerMaterielAussi = false,
  extractionConfiguree = false,
}: {
  don: Don;
  articles?: ArticleAjoute[];
  adresseEntreprise: string;
  associationsAujourdhui: string[];
  congesJusquau: string | null;
  nonLusMessages?: number;
  peutDonnerMaterielAussi?: boolean;
  extractionConfiguree?: boolean;
}) {
  const [donId, setDonId] = useState(don.id);
  const [erreurPublication, setErreurPublication] = useState<string | null>(null);
  const [manqueKbis, setManqueKbis] = useState(false);
  const [vientDetrePublie, setVientDetrePublie] = useState(false);
  const [assigneA, setAssigneA] = useState<string | null>(null);
  const [bonPublieId, setBonPublieId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [titre, setTitre] = useState(don.titre);
  const [description, setDescription] = useState(don.description);
  const [adresseRecuperation, setAdresseRecuperation] = useState(don.adresseRecuperation || adresseEntreprise);
  const [instructionsAcces, setInstructionsAcces] = useState(don.instructionsAcces);
  const [pieceJointeNomFichier, setPieceJointeNomFichier] = useState(don.pieceJointeNomFichier);
  const [erreurPieceJointe, setErreurPieceJointe] = useState<string | null>(null);
  const [articles, setArticles] = useState(articlesInitiaux);
  const [extractionEnCours, setExtractionEnCours] = useState(false);
  const [erreurExtraction, setErreurExtraction] = useState<string | null>(null);
  const [sectionsOuvertes, setSectionsOuvertes] = useState<Record<SectionId, boolean>>({
    infos: true,
    articles: articlesInitiaux.length > 0,
    logistique: false,
  });
  const { dictaphoneDisponible, dictEeEnCours, basculerDictee } = useDicteeVocale((texte) =>
    setDescription((prev) => (prev ? `${prev} ${texte}` : texte))
  );

  const basculerSection = (id: SectionId) => setSectionsOuvertes((prev) => ({ ...prev, [id]: !prev[id] }));

  const extraireArticles = () => {
    setErreurExtraction(null);
    setExtractionEnCours(true);
    startTransition(async () => {
      const resultat = await extraireArticlesAction(donId);
      setExtractionEnCours(false);
      if (!resultat.ok) {
        setErreurExtraction(resultat.error);
        return;
      }
      setArticles((prev) => [...prev, ...resultat.articles.map((a) => ({ ...a, allergenes: [] }))]);
    });
  };

  const retirerUnArticle = (articleId: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
    startTransition(() => void retirerArticle(articleId));
  };

  const enregistrerDetailsLot = (champs: Partial<{ titre: string; description: string; adresseRecuperation: string; instructionsAcces: string }>) => {
    const suivant = {
      titre,
      description,
      adresseRecuperation,
      instructionsAcces,
      ...champs,
    };
    startTransition(() => {
      void definirDetailsLotAction(donId, suivant.titre, suivant.description, suivant.adresseRecuperation, suivant.instructionsAcces);
    });
  };

  const televerserFichier = (fichier: File) => {
    setErreurPieceJointe(null);
    const formData = new FormData();
    formData.set("donId", donId);
    formData.set("fichier", fichier);
    startTransition(async () => {
      const resultat = await televerserPieceJointeDonAction(formData);
      if (!resultat.ok) {
        setErreurPieceJointe(resultat.error ?? "Impossible d'envoyer ce fichier.");
        return;
      }
      setPieceJointeNomFichier(fichier.name);
    });
  };

  const retirerFichier = () => {
    setPieceJointeNomFichier(null);
    startTransition(() => {
      void retirerPieceJointeDonAction(donId);
    });
  };

  const publier = () => {
    setErreurPublication(null);
    setManqueKbis(false);
    startTransition(async () => {
      const resultat = await publierDon(donId);
      if (!resultat.ok) {
        setErreurPublication(resultat.error);
        setManqueKbis(!!resultat.manqueKbis);
        return;
      }
      setDonId(resultat.id);
      setAssigneA(resultat.assigneA);
      setBonPublieId(resultat.bonId);
      setVientDetrePublie(true);
      setTitre("");
      setDescription("");
      setAdresseRecuperation(adresseEntreprise);
      setInstructionsAcces("");
      setPieceJointeNomFichier(null);
      setArticles([]);
    });
  };

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

      {peutDonnerMaterielAussi && (
        <div className="px-5 pb-4">
          <Link
            href="/nouveau-don-materiel"
            className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2.5 text-xs font-semibold text-ink transition-transform active:scale-[0.98]"
          >
            Basculer vers un don matériel
          </Link>
        </div>
      )}

      <main className="flex-1 space-y-5 px-5 pb-4">
        {congesJusquau && !vientDetrePublie && (
          <div className="flex gap-3 rounded-xl bg-accent-tint px-4 py-3.5">
            <span aria-hidden="true" className="text-lg leading-none">🌴</span>
            <p className="text-xs leading-relaxed text-ink">
              <span className="font-semibold text-accent">Vous êtes en congés</span> jusqu&apos;au {congesJusquau}.
              Vous ne pouvez pas publier de don pendant cette période.
            </p>
          </div>
        )}
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
            {bonPublieId && (
              <Link
                href={`/bon-enlevement/${bonPublieId}`}
                className="block w-full rounded-full bg-brand-dark py-2.5 text-center text-xs font-bold text-white transition-transform active:scale-[0.98]"
              >
                Voir et signer le bon d&apos;enlèvement
              </Link>
            )}
          </div>
        )}
        {associationsAujourdhui.length !== 1 && !vientDetrePublie && (
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

        {!vientDetrePublie && (
          <section className="rounded-xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => basculerSection("infos")}
              aria-expanded={sectionsOuvertes.infos}
              className="flex w-full items-center justify-between gap-2 p-3.5"
            >
              <span className="text-sm font-semibold">Informations du lot</span>
              <ChevronIcon ouvert={sectionsOuvertes.infos} />
            </button>
            {sectionsOuvertes.infos && (
              <div className="space-y-3.5 border-t border-border p-3.5">
                <div>
                  <label htmlFor="titreLot" className="mb-1 block text-xs text-ink-muted">
                    Titre du lot
                  </label>
                  <input
                    id="titreLot"
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    onBlur={() => enregistrerDetailsLot({ titre })}
                    placeholder="Ex. Invendus du jour — rayon frais"
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="descriptionLot" className="text-xs text-ink-muted">
                      Description — optionnel
                    </label>
                    <BoutonDictee disponible={dictaphoneDisponible} enCours={dictEeEnCours} onClick={basculerDictee} />
                  </div>
                  <textarea
                    id="descriptionLot"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => enregistrerDetailsLot({ description })}
                    placeholder="Ex. Fruits et légumes du rayon frais, à récupérer en fin de journée"
                    rows={3}
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
                    <span>Joindre ou prendre une photo d&apos;une liste détaillée ou du don</span>
                    {pieceJointeNomFichier && (
                      <a
                        href={`/api/dons/${donId}/piece-jointe`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate underline decoration-dotted underline-offset-2"
                      >
                        {pieceJointeNomFichier}
                      </a>
                    )}
                  </div>
                  {erreurPieceJointe && (
                    <div className="mb-2 rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreurPieceJointe}</div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-alt px-2.5 py-3 text-xs font-semibold text-ink transition-transform active:scale-95">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M8 4H14L19 9V19C19 20.1 18.1 21 17 21H8C6.9 21 6 20.1 6 19V6C6 4.9 6.9 4 8 4Z"
                          stroke="#201F1B"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                        <path d="M14 4V9H19" stroke="#201F1B" strokeWidth="1.6" strokeLinejoin="round" />
                      </svg>
                      Joindre un fichier
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const fichier = e.target.files?.[0];
                          if (fichier) televerserFichier(fichier);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-alt px-2.5 py-3 text-xs font-semibold text-ink transition-transform active:scale-95">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M4 8.5C4 7.4 4.9 6.5 6 6.5H8L9.2 4.5H14.8L16 6.5H18C19.1 6.5 20 7.4 20 8.5V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V8.5Z"
                          stroke="#201F1B"
                          strokeWidth="1.6"
                        />
                        <circle cx="12" cy="12.5" r="3.4" stroke="#201F1B" strokeWidth="1.6" />
                      </svg>
                      Prendre une photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const fichier = e.target.files?.[0];
                          if (fichier) televerserFichier(fichier);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {pieceJointeNomFichier && (
                    <button
                      type="button"
                      onClick={retirerFichier}
                      className="mt-2 text-xs font-semibold text-ink-muted underline"
                    >
                      Retirer la pièce jointe
                    </button>
                  )}
                  {pieceJointeNomFichier && extractionConfiguree && (
                    <button
                      type="button"
                      onClick={extraireArticles}
                      disabled={extractionEnCours}
                      className="mt-2.5 w-full rounded-xl border border-dashed border-border bg-surface-alt py-2.5 text-xs font-semibold text-ink transition-transform active:scale-[0.98] disabled:opacity-60"
                    >
                      {extractionEnCours ? "Lecture de la pièce jointe…" : "✨ Extraire les articles de la pièce jointe"}
                    </button>
                  )}
                  {erreurExtraction && (
                    <div className="mt-2 rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreurExtraction}</div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {!vientDetrePublie && (
          <section className="rounded-xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => basculerSection("articles")}
              aria-expanded={sectionsOuvertes.articles}
              className="flex w-full items-center justify-between gap-2 p-3.5"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                Articles
                {articles.length > 0 && (
                  <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                    {articles.length}
                  </span>
                )}
              </span>
              <ChevronIcon ouvert={sectionsOuvertes.articles} />
            </button>
            {sectionsOuvertes.articles && (
              <div className="space-y-3.5 border-t border-border p-3.5">
                <p className="text-xs leading-relaxed text-ink-muted">
                  Vous n&apos;êtes pas obligé de lister les articles maintenant : vous pouvez extraire une liste
                  jointe, scanner ou saisir manuellement, ou attendre et scanner directement sur l&apos;écran du
                  bon d&apos;enlèvement juste avant le passage de l&apos;association.
                </p>

                {articles.length > 0 && (
                  <ul className="space-y-1.5">
                    {articles.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-alt px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">{a.designation}</div>
                          <div className="text-[11px] text-ink-muted">
                            {a.quantiteDeclaree} · {a.poidsKg.toLocaleString("fr-FR")} kg
                            {a.categorie && ` · ${libelleCategorieDon(a.categorie)}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => retirerUnArticle(a.id)}
                          aria-label="Retirer cet article"
                          className="shrink-0 text-ink-muted"
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <AjouterArticleForm donId={donId} onAjoute={(article) => setArticles((prev) => [...prev, article])} />
              </div>
            )}
          </section>
        )}

        {!vientDetrePublie && (
          <section className="rounded-xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => basculerSection("logistique")}
              aria-expanded={sectionsOuvertes.logistique}
              className="flex w-full items-center justify-between gap-2 p-3.5"
            >
              <span className="text-sm font-semibold">Logistique</span>
              <ChevronIcon ouvert={sectionsOuvertes.logistique} />
            </button>
            {sectionsOuvertes.logistique && (
              <div className="space-y-3.5 border-t border-border p-3.5">
                <div>
                  <label htmlFor="adresseRecuperation" className="mb-1 block text-xs text-ink-muted">
                    Adresse de récupération
                  </label>
                  <input
                    id="adresseRecuperation"
                    type="text"
                    value={adresseRecuperation}
                    onChange={(e) => setAdresseRecuperation(e.target.value)}
                    onBlur={() => enregistrerDetailsLot({ adresseRecuperation })}
                    placeholder={adresseEntreprise}
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="instructionsAcces" className="mb-1 block text-xs text-ink-muted">
                    Détails logistiques — optionnel
                  </label>
                  <textarea
                    id="instructionsAcces"
                    value={instructionsAcces}
                    onChange={(e) => setInstructionsAcces(e.target.value)}
                    onBlur={() => enregistrerDetailsLot({ instructionsAcces })}
                    placeholder="Ex. Accès par le quai de livraison, demander M. Martin à l'accueil."
                    rows={3}
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
            )}
          </section>
        )}
      </main>

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
        <button
          type="button"
          onClick={publier}
          disabled={isPending || !!congesJusquau}
          className="w-full rounded-full bg-brand py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          Publier le don
        </button>
      </footer>
      <BottomTabBar active="dons" role="ENTREPRISE" nonLusMessages={nonLusMessages} />
    </div>
  );
}
