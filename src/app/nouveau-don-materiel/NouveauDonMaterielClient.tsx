"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  definirDetailsDonMaterielAction,
  definirDetailsLotAction,
  publierDon,
  refuserPositionnementAction,
  retirerArticle,
  retirerPieceJointeDonAction,
  televerserPieceJointeDonAction,
  validerPositionnementAction,
} from "@/app/actions";
import AjouterArticleMaterielForm, { type ArticleMaterielAjoute } from "@/components/AjouterArticleMaterielForm";
import BottomTabBar from "@/components/BottomTabBar";
import BoutonDictee from "@/components/BoutonDictee";
import { suivre } from "@/lib/analytics";
import { useDicteeVocale } from "@/lib/dicteeVocale";

type Don = {
  id: string;
  titre: string;
  description: string;
  adresseRecuperation: string;
  pieceJointeNomFichier: string | null;
  divisible: boolean;
  instructionsAcces: string;
  articles: ArticleMaterielAjoute[];
};

export type DemandePositionnement = {
  bonId: string;
  associationNom: string;
  articles: { designation: string; quantiteDeclaree: string }[];
};

export default function NouveauDonMaterielClient({
  don,
  demandesEnAttente,
  adresseEntreprise,
  peutDonnerAlimentaireAussi,
  congesJusquau,
  nonLusMessages = 0,
}: {
  don: Don;
  demandesEnAttente: DemandePositionnement[];
  adresseEntreprise: string;
  peutDonnerAlimentaireAussi: boolean;
  congesJusquau: string | null;
  nonLusMessages?: number;
}) {
  const [donId, setDonId] = useState(don.id);
  const [articles, setArticles] = useState<ArticleMaterielAjoute[]>(don.articles);
  const [divisible, setDivisible] = useState(don.divisible);
  const [instructionsAcces, setInstructionsAcces] = useState(don.instructionsAcces);
  // Informations du lot : mêmes champs que pour un don alimentaire (titre, description, adresse de
  // récupération, pièce jointe), sans pré-remplissage puisqu'un don matériel change à chaque fois.
  const [titre, setTitre] = useState(don.titre);
  const [description, setDescription] = useState(don.description);
  const [adresseRecuperation, setAdresseRecuperation] = useState(don.adresseRecuperation || adresseEntreprise);
  const [pieceJointeNomFichier, setPieceJointeNomFichier] = useState(don.pieceJointeNomFichier);
  const [erreurPieceJointe, setErreurPieceJointe] = useState<string | null>(null);
  const [erreurPublication, setErreurPublication] = useState<string | null>(null);
  const [manqueKbis, setManqueKbis] = useState(false);
  const [erreurRetrait, setErreurRetrait] = useState<string | null>(null);
  const [vientDetrePublie, setVientDetrePublie] = useState(false);
  const [assigneA, setAssigneA] = useState<string | null>(null);
  const [bonPublieId, setBonPublieId] = useState<string | null>(null);
  const [demandesLocal, setDemandesLocal] = useState(demandesEnAttente);
  const [demandesTraitees, setDemandesTraitees] = useState<Record<string, boolean>>({});
  const [erreurDemande, setErreurDemande] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { dictaphoneDisponible, dictEeEnCours, basculerDictee } = useDicteeVocale((texte) =>
    setDescription((prev) => (prev ? `${prev} ${texte}` : texte))
  );

  const enregistrerDetailsLot = (champs: Partial<{ titre: string; description: string; adresseRecuperation: string }>) => {
    const suivant = { titre, description, adresseRecuperation, ...champs };
    startTransition(() => {
      void definirDetailsLotAction(donId, suivant.titre, suivant.description, suivant.adresseRecuperation, instructionsAcces);
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

  const traiterDemande = (bonId: string, accepter: boolean) => {
    setErreurDemande(null);
    setDemandesTraitees((prev) => ({ ...prev, [bonId]: true }));
    startTransition(async () => {
      try {
        await (accepter ? validerPositionnementAction(bonId) : refuserPositionnementAction(bonId));
        setDemandesLocal((prev) => prev.filter((d) => d.bonId !== bonId));
      } catch (e) {
        setDemandesTraitees((prev) => {
          const suivant = { ...prev };
          delete suivant[bonId];
          return suivant;
        });
        setErreurDemande(e instanceof Error ? e.message : "Impossible de traiter cette demande.");
      }
    });
  };

  const enregistrerDetails = (nouveauDivisible: boolean, nouvellesInstructions: string) => {
    startTransition(() => {
      void definirDetailsDonMaterielAction(donId, nouveauDivisible, nouvellesInstructions);
    });
  };

  const retirer = (id: string) => {
    setErreurRetrait(null);
    const position = articles.findIndex((a) => a.id === id);
    const articleRetire = articles[position];
    setArticles((prev) => prev.filter((a) => a.id !== id));
    startTransition(async () => {
      try {
        await retirerArticle(id);
      } catch (e) {
        if (articleRetire) {
          setArticles((prev) => {
            const copie = [...prev];
            copie.splice(Math.min(position, copie.length), 0, articleRetire);
            return copie;
          });
        }
        setErreurRetrait(e instanceof Error ? e.message : "Impossible de retirer ce don.");
      }
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
      setArticles([]);
      setDivisible(false);
      setInstructionsAcces("");
      setTitre("");
      setDescription("");
      setAdresseRecuperation(adresseEntreprise);
      setPieceJointeNomFichier(null);
      setAssigneA(resultat.assigneA);
      setBonPublieId(resultat.bonId);
      setVientDetrePublie(true);
      suivre("don_publie", { type: "materiel" });
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
        <h1 className="flex-1 font-display text-xl font-semibold">Nouveau don matériel</h1>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted">Brouillon</span>
      </header>

      {peutDonnerAlimentaireAussi && (
        <div className="px-5 pb-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2.5 text-xs font-semibold text-ink transition-transform active:scale-[0.98]"
          >
            Basculer vers un don alimentaire
          </Link>
        </div>
      )}

      <main className="flex-1 space-y-5 px-5 pb-4">
        {demandesLocal.length > 0 && (
          <section className="space-y-2.5 rounded-2xl border-2 border-accent/30 bg-surface p-4">
            <h2 className="text-sm font-semibold">Demandes de positionnement en attente</h2>
            <p className="text-xs leading-relaxed text-ink-muted">
              Une association souhaite récupérer une partie d&apos;un de vos dons divisibles. Vérifiez que la
              sélection vous convient (ni trop petite, ni trop grande) avant d&apos;accepter.
            </p>
            {erreurDemande && (
              <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreurDemande}</div>
            )}
            <ul className="space-y-2.5">
              {demandesLocal.map((demande) => (
                <li key={demande.bonId} className="rounded-xl border border-border bg-bg p-3.5">
                  <div className="mb-1.5 text-sm font-semibold">{demande.associationNom}</div>
                  <ul className="mb-2.5 space-y-0.5 text-xs text-ink-muted">
                    {demande.articles.map((a, i) => (
                      <li key={i}>
                        · {a.designation} — {a.quantiteDeclaree}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => traiterDemande(demande.bonId, false)}
                      disabled={!!demandesTraitees[demande.bonId]}
                      className="flex-1 rounded-full border border-border bg-surface py-2 text-xs font-semibold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Refuser
                    </button>
                    <button
                      type="button"
                      onClick={() => traiterDemande(demande.bonId, true)}
                      disabled={!!demandesTraitees[demande.bonId]}
                      className="flex-1 rounded-full bg-brand py-2 text-xs font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Accepter
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {congesJusquau && !vientDetrePublie && (
          <div className="flex gap-3 rounded-xl bg-accent-tint px-4 py-3.5">
            <span aria-hidden="true" className="text-lg leading-none">🌴</span>
            <p className="text-xs leading-relaxed text-ink">
              <span className="font-semibold text-accent">Vous êtes en congés</span> jusqu&apos;au {congesJusquau}.
              Vous ne pouvez pas publier de don pendant cette période.
            </p>
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

        <section className="space-y-3.5 rounded-xl border border-border bg-surface p-3.5">
          <h2 className="text-sm font-semibold">Informations du lot</h2>
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
              placeholder="Ex. Mobilier de bureau — fin de bail"
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
              placeholder="Ex. Bureaux, chaises et armoires en bon état, à récupérer avant la fin du mois"
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
              <span>Joindre ou prendre une photo du lot ou d&apos;une liste</span>
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
              <button type="button" onClick={retirerFichier} className="mt-2 text-xs font-semibold text-ink-muted underline">
                Retirer la pièce jointe
              </button>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Dons ajoutés</h2>
            <span className="text-sm text-ink-muted">{articles.length} don(s)</span>
          </div>
          {erreurRetrait && (
            <div className="mb-2.5 rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreurRetrait}</div>
          )}

          <ul className="space-y-2.5">
            {articles.map((article) => (
              <li
                key={article.id}
                className="flex animate-fade-slide-in items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
              >
                {article.aUnePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- image servie par une route API authentifiée, pas un asset statique optimisable
                  <img
                    src={`/api/articles/${article.id}/photo`}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-ink-muted">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4 8.5C4 7.4 4.9 6.5 6 6.5H8L9.2 4.5H14.8L16 6.5H18C19.1 6.5 20 7.4 20 8.5V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V8.5Z"
                        stroke="#6B6459"
                        strokeWidth="1.4"
                      />
                      <circle cx="12" cy="12.5" r="3.2" stroke="#6B6459" strokeWidth="1.4" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{article.designation}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">{article.quantiteDeclaree}</div>
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
                Aucun don ajouté pour l&apos;instant.
              </li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-semibold">Ajouter un don</h2>
          <p className="mb-2.5 text-xs leading-relaxed text-ink-muted">
            Vous pouvez détailler chaque objet séparément, ou regrouper l&apos;ensemble sous une
            seule description si vous ne souhaitez pas faire de liste précise.
          </p>
          <AjouterArticleMaterielForm donId={donId} onAjoute={(article) => setArticles((prev) => [...prev, article])} />
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-surface p-3.5">
          <label htmlFor="divisible" className="flex items-start gap-2.5">
            <input
              id="divisible"
              type="checkbox"
              checked={divisible}
              onChange={(e) => {
                setDivisible(e.target.checked);
                enregistrerDetails(e.target.checked, instructionsAcces);
              }}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="block font-semibold">Don divisible</span>
              <span className="block text-xs text-ink-muted">
                Plusieurs associations pourront se partager les articles, chacune choisissant ceux
                qui l&apos;intéressent, sans qu&apos;une seule ait à tout emporter.
              </span>
            </span>
          </label>

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
              Comment accéder à ce don ? (accueil, personne à demander, emplacement…)
            </label>
            <textarea
              id="instructionsAcces"
              value={instructionsAcces}
              onChange={(e) => setInstructionsAcces(e.target.value)}
              onBlur={() => enregistrerDetails(divisible, instructionsAcces)}
              placeholder="Ex. Se présenter à l'accueil et demander M. Martin, entrepôt à l'arrière du bâtiment."
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
            />
          </div>
        </section>
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
          disabled={articles.length === 0 || isPending || !!congesJusquau}
          className="w-full rounded-full bg-brand py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          Publier le don
        </button>
      </footer>
      <BottomTabBar active="dons" role="ENTREPRISE" nonLusMessages={nonLusMessages} />
    </div>
  );
}
