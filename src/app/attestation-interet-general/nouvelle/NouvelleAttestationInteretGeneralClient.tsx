"use client";

import { useActionState } from "react";
import Link from "next/link";
import { genererEtEnvoyerInteretGeneralAction } from "../actions";

type AssociationEligible = {
  associationId: string;
  associationNom: string;
  statut: "BROUILLON" | "ENVOYEE" | "SIGNEE" | null;
};

type Etat = { ok: true; nombreEnvoyees: number } | { ok: false; error: string } | null;

async function actionAvecEtat(_etat: Etat, formData: FormData): Promise<Etat> {
  return genererEtEnvoyerInteretGeneralAction(formData);
}

export default function NouvelleAttestationInteretGeneralClient({
  associations,
}: {
  associations: AssociationEligible[];
}) {
  const [etat, formAction, isPending] = useActionState(actionAvecEtat, null);

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
        <h1 className="font-display text-xl font-semibold">Attestation intérêt général</h1>
      </header>

      <main className="flex-1 space-y-4 px-5 pb-4">
        <p className="text-xs text-ink-muted">
          Une attestation sur l&apos;honneur sera générée et envoyée pour signature à chaque association
          sélectionnée, attestant de son statut d&apos;intérêt général vis-à-vis de votre entreprise
          (art. 238 bis du CGI).
        </p>

        <form action={formAction} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          {associations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Aucune association partenaire (convention signée) sans attestation intérêt général déjà signée.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {associations.map((a) => (
                <li key={a.associationId} className="flex items-center gap-3 rounded-xl bg-surface-alt px-3.5 py-2.5">
                  <input
                    type="checkbox"
                    name="associationId"
                    value={a.associationId}
                    defaultChecked={a.statut === null}
                    className="h-4 w-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{a.associationNom}</div>
                    <div className="text-xs text-ink-muted">
                      {a.statut === null ? "Nouvelle attestation" : "Déjà envoyée — relancer la signature"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {etat && !etat.ok && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{etat.error}</div>}
          {etat && etat.ok && (
            <div className="rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-dark">
              {etat.nombreEnvoyees} attestation{etat.nombreEnvoyees > 1 ? "s" : ""} envoyée
              {etat.nombreEnvoyees > 1 ? "s" : ""} pour signature.
            </div>
          )}

          <button
            type="submit"
            disabled={associations.length === 0 || isPending}
            className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Envoi en cours…" : "Générer et envoyer pour signature"}
          </button>
        </form>
      </main>
    </div>
  );
}
