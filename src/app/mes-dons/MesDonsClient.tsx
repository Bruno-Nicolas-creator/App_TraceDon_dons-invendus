"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomTabBar from "@/components/BottomTabBar";
import type { MonDon } from "@/lib/mesDons";
import { annulerDonAction } from "./actions";

type Filtre = "TOUS" | "A_TRAITER" | "EN_COURS" | "ANNULE";

const FILTRES: { id: Filtre; label: string }[] = [
  { id: "TOUS", label: "Tous" },
  { id: "A_TRAITER", label: "À traiter" },
  { id: "EN_COURS", label: "En cours" },
  { id: "ANNULE", label: "Annulés" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function AnnulationDon({ don }: { don: MonDon }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  if (don.empechementAnnulation) {
    return <p className="text-[11.5px] text-ink-muted">{don.empechementAnnulation}</p>;
  }
  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="text-xs font-semibold text-accent underline">
        Annuler ce don
      </button>
    );
  }

  const confirmer = () => {
    setErreur(null);
    startTransition(async () => {
      const resultat = await annulerDonAction(don.id, motif);
      if (!resultat.ok) setErreur(resultat.error);
      else {
        setOuvert(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2 rounded-xl bg-surface-alt p-3">
      <p className="text-xs">
        {don.bons.length > 0
          ? "L'association concernée sera prévenue avec votre motif. Cette annulation est définitive."
          : "Le don sera retiré de la place de marché. Cette annulation est définitive."}
      </p>
      <textarea
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Motif (obligatoire) : vendu entre-temps, produits abîmés, erreur de saisie…"
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
      />
      {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirmer}
          disabled={enCours || !motif.trim()}
          className="flex-1 rounded-full bg-accent py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {enCours ? "Annulation…" : "Confirmer l'annulation"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="flex-1 rounded-full border border-border py-2 text-xs font-semibold">
          Garder le don
        </button>
      </div>
    </div>
  );
}

function CarteDon({ don }: { don: MonDon }) {
  const nature = don.type === "MATERIEL" ? "Don matériel" : "Don alimentaire";
  const couleur =
    don.etat.famille === "ANNULE"
      ? "bg-surface-alt text-ink-muted"
      : don.etat.aTraiter
        ? "bg-accent-tint text-accent"
        : "bg-brand-tint text-brand-dark";
  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{don.titre || nature}</div>
          <div className="text-xs text-ink-muted">
            {don.titre ? `${nature} · ` : ""}
            {formatDate(don.date)} · {don.nombreArticles} article{don.nombreArticles > 1 ? "s" : ""}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${couleur}`}>{don.etat.libelle}</span>
      </div>

      {don.motifAnnulation && <p className="text-xs text-ink-muted">Motif : « {don.motifAnnulation} »</p>}

      {don.etat.famille !== "ANNULE" && don.bons.length > 0 && (
        <ul className="space-y-1.5">
          {don.bons.map((bon) => (
            <li key={bon.id}>
              <Link
                href={bon.lien}
                className="flex items-center justify-between gap-2 rounded-xl bg-surface-alt px-3 py-2 text-xs"
              >
                <span className="min-w-0 truncate">
                  <strong>{bon.associationNom}</strong> · bon n°{bon.numero}
                </span>
                <span className={`shrink-0 ${bon.etat.aTraiter ? "font-semibold text-accent" : "text-ink-muted"}`}>
                  {bon.etat.libelle} ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {don.etat.famille !== "ANNULE" && <AnnulationDon don={don} />}
    </div>
  );
}

export default function MesDonsClient({ dons, nonLusMessages }: { dons: MonDon[]; nonLusMessages: number }) {
  const [filtre, setFiltre] = useState<Filtre>("TOUS");
  const affiches = dons.filter((d) => filtre === "TOUS" || d.etat.famille === filtre);
  const compte = (f: Filtre) => (f === "TOUS" ? dons.length : dons.filter((d) => d.etat.famille === f).length);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg pb-24">
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Link
          href="/"
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-display text-xl font-semibold">Mes dons</h1>
      </header>

      <div className="flex flex-wrap gap-1.5 px-5 pb-3">
        {FILTRES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltre(f.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filtre === f.id ? "border-ink bg-ink text-white" : "border-border bg-surface text-ink-muted"
            }`}
          >
            {f.label} ({compte(f.id)})
          </button>
        ))}
      </div>

      <main className="flex-1 space-y-2.5 px-5">
        {affiches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            {dons.length === 0
              ? "Aucun don en cours. Les enlèvements confirmés se retrouvent dans vos Archives."
              : "Aucun don dans cette catégorie."}
          </div>
        ) : (
          affiches.map((don) => <CarteDon key={don.id} don={don} />)
        )}
        <p className="pt-2 text-center text-[11px] text-ink-muted">
          Les enlèvements confirmés sont dans vos <Link href="/archives" className="underline">Archives</Link>.
        </p>
      </main>

      <BottomTabBar active="dons" role="ENTREPRISE" nonLusMessages={nonLusMessages} />
    </div>
  );
}
