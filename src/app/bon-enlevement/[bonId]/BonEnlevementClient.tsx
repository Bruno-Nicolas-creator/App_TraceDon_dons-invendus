"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  confirmerBon,
  constaterArticleAction,
  constaterDlcAction,
  definirBenevoleCollecteurAction,
  refuserArticle,
  retirerArticle,
  validerArticle,
} from "@/app/actions";
import { demarrerSignatureDocuSign } from "./docusign-actions";
import AjouterArticleForm from "@/components/AjouterArticleForm";
import CompteurAnime from "@/components/CompteurAnime";
import IconeArticle from "@/components/IconeArticle";

type Statut = "EN_ATTENTE" | "VALIDE" | "REFUSE";

export type ArticleAffiche = {
  id: string;
  nom: string;
  qte: string;
  poidsKg: number;
  temp: string;
  dlc: string;
  bloque: boolean;
  temperatureHorsPlage: boolean;
  statut: Statut;
  motifRefus: string;
  aUnePhoto?: boolean;
};

export type BonAffiche = {
  id: string;
  donId: string;
  numero: string;
  entrepriseNom: string;
  associationNom: string;
  articles: ArticleAffiche[];
  donateurSigne: boolean;
  associationSigne: boolean;
  confirme: boolean;
  enAttenteValidationDonateur: boolean;
  poidsTotalRetenu: number | null;
  typeDon?: "ALIMENTAIRE" | "MATERIEL";
  divisible?: boolean;
  instructionsAcces?: string | null;
  titre?: string | null;
  description?: string | null;
  adresseRecuperation?: string | null;
  aUnePieceJointe?: boolean;
  benevoleCollecteurId?: string | null;
  benevoleCollecteurNom?: string | null;
};

type ImpactCarbone = { co2EviteKg: number; equivalenceKm: number | null };
type BenevoleMandate = { id: string; nom: string };

export default function BonEnlevementClient({
  bon,
  docusignConfigure,
  impact,
  role,
  benevolesMandates = [],
}: {
  bon: BonAffiche;
  docusignConfigure: boolean;
  impact: ImpactCarbone | null;
  role: "ENTREPRISE" | "ASSOCIATION";
  benevolesMandates?: BenevoleMandate[];
}) {
  const [ecran, setEcran] = useState<"revue" | "succes">(bon.confirme ? "succes" : "revue");
  const [articles, setArticles] = useState(bon.articles);
  const [motifs, setMotifs] = useState<Record<string, string>>(
    Object.fromEntries(bon.articles.map((a) => [a.id, a.motifRefus]))
  );
  const [constats, setConstats] = useState<Record<string, { qte: string; temp: string }>>(
    Object.fromEntries(bon.articles.map((a) => [a.id, { qte: a.qte, temp: a.temp === "—" ? "" : a.temp }]))
  );
  const [dlcs, setDlcs] = useState<Record<string, string>>(
    Object.fromEntries(bon.articles.map((a) => [a.id, a.dlc === "—" ? "" : a.dlc]))
  );
  const donateurSigne = bon.donateurSigne;
  const associationSigne = bon.associationSigne;
  const peutControlerArticles = role === "ASSOCIATION";
  // Le don matériel repose sur une liste établie avant publication : contrairement à
  // l'alimentaire, il n'y a pas de scan complémentaire à faire au moment de l'enlèvement.
  const peutAjouterArticles = role === "ENTREPRISE" && !bon.confirme && bon.typeDon !== "MATERIEL";
  const peutChoisirBenevole = role === "ASSOCIATION" && !associationSigne && !bon.confirme;
  const [benevoleCollecteurId, setBenevoleCollecteurId] = useState(bon.benevoleCollecteurId ?? "");
  const [erreurSignature, setErreurSignature] = useState<string | null>(null);
  const [signatureEnCours, setSignatureEnCours] = useState<"DONATEUR" | "ASSOCIATION" | null>(null);
  const [confirmationEnCours, setConfirmationEnCours] = useState(false);
  const [, startTransition] = useTransition();

  const valider = (article: ArticleAffiche) => {
    if (article.bloque) return;
    const statutPrecedent = article.statut;
    setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, statut: "VALIDE" } : a)));
    startTransition(async () => {
      try {
        await validerArticle(article.id);
      } catch (e) {
        setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, statut: statutPrecedent } : a)));
        setErreurSignature(e instanceof Error ? e.message : "Impossible de valider cet article.");
      }
    });
  };

  const refuser = (article: ArticleAffiche) => {
    const statutPrecedent = article.statut;
    setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, statut: "REFUSE" } : a)));
    startTransition(async () => {
      try {
        await refuserArticle(article.id, motifs[article.id] ?? "");
      } catch (e) {
        setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, statut: statutPrecedent } : a)));
        setErreurSignature(e instanceof Error ? e.message : "Impossible de refuser cet article.");
      }
    });
  };

  const retirer = (articleId: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
    startTransition(async () => {
      try {
        await retirerArticle(articleId);
      } catch (e) {
        setErreurSignature(e instanceof Error ? e.message : "Impossible de retirer cet article.");
      }
    });
  };

  const modifierConstat = (articleId: string, champ: "qte" | "temp", valeur: string) => {
    setConstats((prev) => ({ ...prev, [articleId]: { ...prev[articleId], [champ]: valeur } }));
  };

  const enregistrerConstat = (articleId: string) => {
    const constat = constats[articleId] ?? { qte: "", temp: "" };
    startTransition(async () => {
      try {
        await constaterArticleAction(articleId, constat.qte, constat.temp);
      } catch (e) {
        setErreurSignature(e instanceof Error ? e.message : "Impossible d'enregistrer la constatation.");
      }
    });
  };

  const modifierDlc = (articleId: string, valeur: string) => {
    setDlcs((prev) => ({ ...prev, [articleId]: valeur }));
  };

  const enregistrerDlc = (articleId: string) => {
    const valeur = dlcs[articleId] ?? "";
    startTransition(async () => {
      try {
        await constaterDlcAction(articleId, valeur, false);
        setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, dlc: valeur || "—" } : a)));
      } catch (e) {
        setErreurSignature(e instanceof Error ? e.message : "Impossible d'enregistrer la DLC.");
      }
    });
  };

  const basculerDlcDepassee = (article: ArticleAffiche) => {
    const nouvelleValeur = !article.bloque;
    setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, bloque: nouvelleValeur } : a)));
    startTransition(async () => {
      try {
        await constaterDlcAction(article.id, dlcs[article.id] ?? "", nouvelleValeur);
      } catch (e) {
        setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, bloque: article.bloque } : a)));
        setErreurSignature(e instanceof Error ? e.message : "Impossible d'enregistrer la DLC.");
      }
    });
  };

  const choisirBenevole = (id: string) => {
    setBenevoleCollecteurId(id);
    startTransition(async () => {
      try {
        await definirBenevoleCollecteurAction(bon.id, id || null);
      } catch (e) {
        setErreurSignature(e instanceof Error ? e.message : "Impossible d'enregistrer le bénévole collecteur.");
      }
    });
  };

  const demarrerSignature = (role: "DONATEUR" | "ASSOCIATION") => {
    setErreurSignature(null);
    setSignatureEnCours(role);
    startTransition(async () => {
      const resultat = await demarrerSignatureDocuSign(bon.id, role);
      if (!resultat.ok) {
        setErreurSignature(resultat.error);
        setSignatureEnCours(null);
        return;
      }
      window.location.href = resultat.url;
    });
  };

  const nombreValides = articles.filter((a) => a.statut === "VALIDE").length;
  const nombreRefuses = articles.filter((a) => a.statut === "REFUSE").length;
  const poidsRetenu = articles.filter((a) => a.statut === "VALIDE").reduce((total, a) => total + a.poidsKg, 0);

  const confirmer = () => {
    setConfirmationEnCours(true);
    startTransition(async () => {
      const resultat = await confirmerBon(bon.id);
      if (!resultat.ok) {
        setErreurSignature(resultat.error ?? "Impossible de confirmer.");
        setConfirmationEnCours(false);
        return;
      }
      setErreurSignature(null);
      setEcran("succes");
    });
  };

  if (ecran === "succes") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
        <header className="flex items-center gap-3 px-5 pt-5 pb-3">
          <h1 className="flex-1 font-display text-lg font-semibold">Bon n°{bon.numero}</h1>
        </header>
        <main className="flex flex-1 flex-col items-center gap-4 px-6 pt-6 text-center">
          <div className="mt-6 flex h-18 w-18 items-center justify-center rounded-full bg-brand-tint">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                className="animate-trait-check"
                d="M5 13L9.5 17.5L19 7"
                stroke="#1E4B36"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="mb-1.5 text-lg font-semibold">Bon d&apos;enlèvement confirmé</h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              N°{bon.numero} horodaté
              <br />
              par scan QR code
            </p>
          </div>
          <div className="w-full space-y-2 rounded-2xl border border-border bg-surface p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Articles validés</span>
              <span className="font-semibold">{nombreValides} / {articles.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Articles refusés</span>
              <span className="font-semibold">{nombreRefuses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Archivé dans</span>
              <Link href="/archives" className="font-semibold underline">
                Mes archives
              </Link>
            </div>
            {bon.benevoleCollecteurNom && (
              <div className="flex justify-between">
                <span className="text-ink-muted">Collecté par</span>
                <span className="font-semibold">{bon.benevoleCollecteurNom}</span>
              </div>
            )}
          </div>

          {impact && (
            <div className="w-full animate-fade-slide-in rounded-2xl bg-brand-tint p-4 text-left" style={{ animationDelay: "150ms" }}>
              <div className="mb-1 text-sm font-semibold text-brand-dark">
                <span className="animate-pop-rebond">🌱</span>{" "}
                <CompteurAnime valeur={impact.co2EviteKg} decimales={1} suffixe=" kg de CO2 évités" />
              </div>
              {impact.equivalenceKm != null && (
                <p className="text-xs leading-relaxed text-brand-dark">
                  Soit l&apos;équivalent de{" "}
                  <span className="font-semibold">
                    <CompteurAnime valeur={impact.equivalenceKm} suffixe=" km" />
                  </span>{" "}
                  parcourus en voiture 🚗
                </p>
              )}
            </div>
          )}
        </main>
        <footer className="space-y-2.5 px-6 pt-4 pb-6">
          <a
            href={`/api/bon-enlevement/${bon.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-full bg-ink py-3.5 text-center text-sm font-bold text-white"
          >
            Voir le PDF
          </a>
          <Link
            href={role === "ENTREPRISE" ? "/" : "/dons"}
            className="block w-full rounded-full border border-border bg-surface py-3.5 text-center text-sm font-semibold"
          >
            {role === "ENTREPRISE" ? "Retour à mes dons" : "Retour aux dons disponibles"}
          </Link>
        </footer>
      </div>
    );
  }

  if (bon.enAttenteValidationDonateur) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
        <header className="flex items-center gap-3 px-5 pt-5 pb-3">
          <Link
            href={role === "ENTREPRISE" ? "/" : "/dons"}
            aria-label="Retour"
            className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-[17px] font-semibold">Bon n°{bon.numero}</h1>
        </header>
        <main className="flex flex-1 flex-col items-center gap-4 px-6 pt-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-tint text-2xl">⏳</div>
          <div>
            <h2 className="mb-1.5 text-lg font-semibold">En attente de validation</h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              {role === "ENTREPRISE"
                ? "Acceptez ou refusez cette demande de positionnement depuis l'écran « Nouveau don matériel » pour continuer."
                : "Le donateur doit d'abord valider votre demande de positionnement sur cette sélection d'articles. Vous serez notifié(e) dès que ce sera fait."}
            </p>
          </div>
          <ul className="w-full space-y-1.5 rounded-2xl border border-border bg-surface p-4 text-left text-sm">
            {articles.map((a) => (
              <li key={a.id}>· {a.nom}</li>
            ))}
          </ul>
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="px-5 pt-5 pb-3">
        <div className="mb-2.5 flex items-center gap-3">
          <Link
            href={role === "ENTREPRISE" ? "/" : "/dons"}
            aria-label="Retour"
            className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-[17px] font-semibold">Bon n°{bon.numero}</h1>
            {bon.titre && <div className="text-sm font-medium text-ink">{bon.titre}</div>}
            <div className="text-xs text-ink-muted">{bon.entrepriseNom} &rarr; {bon.associationNom}</div>
          </div>
        </div>
        {bon.description && <p className="mb-2.5 text-xs leading-relaxed text-ink-muted">{bon.description}</p>}
        <div className="flex items-start gap-2 rounded-xl bg-accent-tint px-3 py-2.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
            <path d="M12 9V13.5" stroke="#C1622E" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.3" r="1" fill="#C1622E" />
            <circle cx="12" cy="12" r="9" stroke="#C1622E" strokeWidth="1.8" />
          </svg>
          <span className="text-[11.5px] leading-snug text-accent">
            {bon.typeDon === "MATERIEL"
              ? "État et quantité des articles : vérifiez chaque ligne avant signature."
              : "Chaîne du froid, DLC/DDM et état des produits : vérifiez chaque ligne avant signature."}
          </span>
        </div>
        {(bon.divisible || bon.instructionsAcces || bon.adresseRecuperation || bon.aUnePieceJointe) && (
          <div className="mt-2.5 space-y-1.5 rounded-xl bg-surface-alt px-3 py-2.5">
            {bon.divisible && (
              <div className="text-[11.5px] font-semibold text-ink">
                Ce don est divisible : vous pouvez n&apos;en emporter qu&apos;une partie.
              </div>
            )}
            {bon.adresseRecuperation && (
              <div className="text-[11.5px] leading-snug text-ink-muted">
                <span className="font-semibold text-ink">Adresse de récupération : </span>
                {bon.adresseRecuperation}
              </div>
            )}
            {bon.instructionsAcces && (
              <div className="text-[11.5px] leading-snug text-ink-muted">
                <span className="font-semibold text-ink">Accès : </span>
                {bon.instructionsAcces}
              </div>
            )}
            {bon.aUnePieceJointe && (
              <a
                href={`/api/dons/${bon.donId}/piece-jointe`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[11.5px] font-semibold text-ink underline decoration-dotted underline-offset-2"
              >
                Voir la pièce jointe
              </a>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 space-y-5 overflow-y-auto px-5 pb-4">
        {peutAjouterArticles && (
          <section>
            <h2 className="mb-2.5 text-sm font-semibold">Ajouter un article</h2>
            <AjouterArticleForm
              donId={bon.donId}
              onAjoute={(article) => {
                setArticles((prev) => [
                  ...prev,
                  {
                    id: article.id,
                    nom: article.designation,
                    qte: article.quantiteDeclaree,
                    poidsKg: article.poidsKg,
                    temp: "—",
                    dlc: "—",
                    bloque: false,
                    temperatureHorsPlage: false,
                    statut: "EN_ATTENTE",
                    motifRefus: "",
                  },
                ]);
                setMotifs((prev) => ({ ...prev, [article.id]: "" }));
              }}
            />
          </section>
        )}

        <ul className="space-y-2.5">
          {articles.map((article, i) => {
            const estRefuse = article.statut === "REFUSE";
            const estValide = article.statut === "VALIDE";
            return (
              <li
                key={article.id}
                style={{ animationDelay: `${i * 50}ms` }}
                className={`animate-fade-slide-in space-y-2.5 rounded-2xl border bg-surface p-3.5 ${estRefuse ? "border-[#E7C4AE]" : "border-border"}`}
              >
                <div className="flex justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {article.aUnePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element -- image servie par une route API authentifiée, pas un asset statique optimisable
                      <img
                        src={`/api/articles/${article.id}/photo`}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <IconeArticle designation={article.nom} />
                    )}
                    <div className="truncate text-sm font-semibold">{article.nom}</div>
                  </div>
                  <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${article.bloque ? "bg-accent-tint text-accent" : "bg-brand-tint text-brand-dark"}`}>
                    {article.dlc}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[11px] text-ink-muted">Quantité constatée</label>
                    <input
                      type="text"
                      value={constats[article.id]?.qte ?? ""}
                      onChange={(e) => modifierConstat(article.id, "qte", e.target.value)}
                      onBlur={() => enregistrerConstat(article.id)}
                      disabled={!peutControlerArticles}
                      className="w-full rounded-lg border border-border px-2.5 py-2 text-[13px] disabled:bg-surface-alt disabled:text-ink-muted"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[11px] text-ink-muted">Température</label>
                    <input
                      type="text"
                      value={constats[article.id]?.temp ?? ""}
                      onChange={(e) => modifierConstat(article.id, "temp", e.target.value)}
                      onBlur={() => enregistrerConstat(article.id)}
                      disabled={!peutControlerArticles}
                      className={`w-full rounded-lg border px-2.5 py-2 text-[13px] disabled:bg-surface-alt disabled:text-ink-muted ${article.temperatureHorsPlage ? "border-[#E7C4AE] text-accent" : "border-border"}`}
                    />
                  </div>
                </div>
                {bon.typeDon !== "MATERIEL" && (
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-0.5 block text-[11px] text-ink-muted">DLC / DDM</label>
                      <input
                        type="text"
                        value={dlcs[article.id] ?? ""}
                        onChange={(e) => modifierDlc(article.id, e.target.value)}
                        onBlur={() => enregistrerDlc(article.id)}
                        disabled={!peutControlerArticles}
                        placeholder="Ex. 12/10/2026"
                        className="w-full rounded-lg border border-border px-2.5 py-2 text-[13px] disabled:bg-surface-alt disabled:text-ink-muted"
                      />
                    </div>
                    <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[11.5px] text-ink-muted has-[:disabled]:bg-surface-alt">
                      <input
                        type="checkbox"
                        checked={article.bloque}
                        onChange={() => basculerDlcDepassee(article)}
                        disabled={!peutControlerArticles}
                      />
                      Dépassée
                    </label>
                  </div>
                )}
                {article.bloque && (
                  <div className="rounded-lg bg-accent-tint px-2.5 py-1.5 text-[11.5px] text-accent">
                    DLC dépassée : le refus est obligatoire, la validation est désactivée.
                  </div>
                )}
                {peutControlerArticles ? (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => valider(article)}
                        disabled={article.bloque}
                        className={`flex-1 rounded-full border-[1.5px] py-2 text-xs font-bold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                          estValide ? "border-brand bg-brand text-white" : "border-border bg-surface text-ink-muted"
                        }`}
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => refuser(article)}
                        className={`flex-1 rounded-full border-[1.5px] py-2 text-xs font-bold transition-transform active:scale-95 ${
                          estRefuse ? "border-accent bg-accent text-white" : "border-border bg-surface text-ink-muted"
                        }`}
                      >
                        Refuser
                      </button>
                    </div>
                    {estRefuse && (
                      <input
                        type="text"
                        value={motifs[article.id] ?? ""}
                        onChange={(e) => setMotifs((prev) => ({ ...prev, [article.id]: e.target.value }))}
                        onBlur={() => startTransition(() => void refuserArticle(article.id, motifs[article.id] ?? ""))}
                        placeholder="Motif du refus (ex. DLC dépassée)"
                        className="w-full rounded-lg border border-[#E7C4AE] bg-accent-tint/40 px-2.5 py-2 text-xs"
                      />
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        estValide ? "bg-brand-tint text-brand-dark" : estRefuse ? "bg-accent-tint text-accent" : "bg-surface-alt text-ink-muted"
                      }`}
                    >
                      {estValide ? "Validé par l'association" : estRefuse ? "Refusé par l'association" : "En attente de contrôle"}
                    </span>
                    {estRefuse && article.motifRefus && <span className="text-[11px] text-ink-muted">{article.motifRefus}</span>}
                    {peutAjouterArticles && article.statut === "EN_ATTENTE" && (
                      <button
                        type="button"
                        onClick={() => retirer(article.id)}
                        className="text-[11px] font-semibold text-ink-muted underline"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="space-y-1.5 rounded-2xl border border-border bg-surface p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Articles validés</span>
            <span className="font-semibold">{nombreValides} / {articles.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Articles refusés</span>
            <span className={`font-semibold ${nombreRefuses > 0 ? "text-accent" : ""}`}>{nombreRefuses}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Poids total retenu</span>
            <span className="font-semibold">{poidsRetenu.toLocaleString("fr-FR")} kg</span>
          </div>
        </div>

        <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Signatures</h2>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 15V17M6 10V8C6 4.7 8.7 2 12 2C15.3 2 18 4.7 18 8V10M5 10H19L18 21H6L5 10Z" stroke="#6B6459" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              DocuSign
            </span>
          </div>

          {!docusignConfigure && (
            <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">
              Signature électronique DocuSign non configurée sur ce déploiement (voir .env.example).
            </div>
          )}

          {peutChoisirBenevole && benevolesMandates.length > 0 && (
            <div>
              <label htmlFor="benevoleCollecteur" className="mb-1 block text-[11px] text-ink-muted">
                Bénévole mandaté qui collecte (signera en son nom)
              </label>
              <select
                id="benevoleCollecteur"
                value={benevoleCollecteurId}
                onChange={(e) => choisirBenevole(e.target.value)}
                className="w-full rounded-lg border border-border px-2.5 py-2 text-[13px]"
              >
                <option value="">— Moi-même (compte association) —</option>
                {benevolesMandates.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!peutChoisirBenevole && bon.benevoleCollecteurNom && (
            <div className="text-[11.5px] leading-snug text-ink-muted">
              <span className="font-semibold text-ink">Collecté par : </span>
              {bon.benevoleCollecteurNom}
            </div>
          )}

          <div className="flex gap-2.5">
            {role === "ENTREPRISE" ? (
              <button
                type="button"
                onClick={() => demarrerSignature("DONATEUR")}
                disabled={donateurSigne || !docusignConfigure || signatureEnCours !== null}
                className={`flex-1 rounded-xl border-[1.5px] border-dashed border-[#C7C1B0] py-3.5 text-xs font-semibold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                  donateurSigne ? "bg-brand-tint text-brand-dark" : "bg-surface"
                }`}
              >
                {donateurSigne ? "Donateur signé" : signatureEnCours === "DONATEUR" ? "Ouverture…" : "Signer (donateur)"}
              </button>
            ) : (
              <div
                className={`flex flex-1 items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#C7C1B0] py-3.5 text-xs font-semibold ${
                  donateurSigne ? "bg-brand-tint text-brand-dark" : "bg-surface-alt text-ink-muted"
                }`}
              >
                {donateurSigne ? "Donateur signé" : "Donateur : en attente"}
              </div>
            )}
            {role === "ASSOCIATION" ? (
              <button
                type="button"
                onClick={() => demarrerSignature("ASSOCIATION")}
                disabled={associationSigne || !donateurSigne || !docusignConfigure || signatureEnCours !== null}
                className={`flex-1 rounded-xl border-[1.5px] border-dashed border-[#C7C1B0] py-3.5 text-xs font-semibold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                  associationSigne ? "bg-brand-tint text-brand-dark" : "bg-surface"
                }`}
              >
                {associationSigne
                  ? "Association signé"
                  : !donateurSigne
                    ? "En attente du donateur"
                    : signatureEnCours === "ASSOCIATION"
                      ? "Ouverture…"
                      : "Signer (association)"}
              </button>
            ) : (
              <div
                className={`flex flex-1 items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#C7C1B0] py-3.5 text-xs font-semibold ${
                  associationSigne ? "bg-brand-tint text-brand-dark" : "bg-surface-alt text-ink-muted"
                }`}
              >
                {associationSigne ? "Association signé" : "Association : en attente"}
              </div>
            )}
          </div>
          <p className="text-[11px] text-ink-muted">
            Votre signature ouvre la cérémonie de signature électronique qualifiée DocuSign, directement dans
            l&apos;application.
          </p>
        </div>
      </main>

      <footer className="space-y-2.5 border-t border-border bg-surface px-5 pt-3 pb-5">
        {erreurSignature && (
          <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreurSignature}</div>
        )}
        <button
          type="button"
          onClick={confirmer}
          disabled={confirmationEnCours}
          className="w-full rounded-full bg-brand py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirmationEnCours ? "Confirmation…" : "Confirmer l'enlèvement"}
        </button>
      </footer>
    </div>
  );
}
