"use client";

import { useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { genererEtEnvoyerAttestationsAction } from "../actions";

type Groupe = {
  associationId: string;
  associationNom: string;
  nombreBons: number;
  poidsTotalKg: number;
  montantEstime: number;
};

type Etat = { ok: true; nombreCreees: number } | { ok: false; error: string } | null;

async function actionAvecEtat(_etat: Etat, formData: FormData): Promise<Etat> {
  return genererEtEnvoyerAttestationsAction(formData);
}

export default function NouvelleAttestationClient({
  debut,
  fin,
  groupes,
}: {
  debut: string;
  fin: string;
  groupes: Groupe[];
}) {
  const router = useRouter();
  const [debutForm, setDebutForm] = useState(debut);
  const [finForm, setFinForm] = useState(fin);
  const [etat, formAction, isPending] = useActionState(actionAvecEtat, null);

  const rechercher = (e: FormEvent) => {
    e.preventDefault();
    router.push(`/attestations/nouvelle?debut=${debutForm}&fin=${finForm}`);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Link
          href="/archives"
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-display text-xl font-semibold">Récapitulatif fiscal</h1>
      </header>

      <main className="flex-1 space-y-4 px-5 pb-4">
        <form onSubmit={rechercher} className="space-y-2.5 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Période</h2>
          <p className="text-xs text-ink-muted">
            Un récapitulatif fiscal distinct sera généré par association bénéficiaire ayant reçu au moins un don
            confirmé sur cette période, puis envoyé pour signature.
          </p>
          <div className="flex gap-2.5">
            <input
              type="date"
              value={debutForm}
              onChange={(e) => setDebutForm(e.target.value)}
              required
              aria-label="Date de début"
              className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
            />
            <input
              type="date"
              value={finForm}
              onChange={(e) => setFinForm(e.target.value)}
              required
              aria-label="Date de fin"
              className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full border border-border py-2.5 text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            Rechercher les dons éligibles
          </button>
        </form>

        {debut && fin && (
          <form action={formAction} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
            <input type="hidden" name="periodeDebut" value={debut} />
            <input type="hidden" name="periodeFin" value={fin} />
            <div>
              <h2 className="text-sm font-semibold">Bénéficiaires sur cette période</h2>
            </div>

            {groupes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
                Aucun don confirmé, pas encore rattaché à une attestation, sur cette période.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {groupes.map((g) => (
                  <li key={g.associationId} className="flex items-center gap-3 rounded-xl bg-surface-alt px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      name="associationId"
                      value={g.associationId}
                      defaultChecked
                      className="h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{g.associationNom}</div>
                      <div className="text-xs text-ink-muted">
                        {g.nombreBons} bon{g.nombreBons > 1 ? "s" : ""} · {g.poidsTotalKg.toLocaleString("fr-FR")} kg ·
                        {" ≈ "}
                        {g.montantEstime.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {etat && !etat.ok && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{etat.error}</div>}
            {etat && etat.ok && (
              <div className="rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-dark">
                {etat.nombreCreees} récapitulatif{etat.nombreCreees > 1 ? "s" : ""} généré
                {etat.nombreCreees > 1 ? "s" : ""} et envoyé{etat.nombreCreees > 1 ? "s" : ""} pour signature.
              </div>
            )}

            <button
              type="submit"
              disabled={groupes.length === 0 || isPending}
              className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? "Envoi en cours…" : "Générer et envoyer pour signature"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
