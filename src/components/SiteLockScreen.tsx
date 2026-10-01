"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { deverrouillerSiteAction, type EtatDeverrouillageSite } from "@/app/site-lock-actions";

export default function SiteLockScreen() {
  const [etat, formAction] = useActionState<EtatDeverrouillageSite, FormData>(deverrouillerSiteAction, null);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand font-display text-xl font-bold text-white">
          D
        </div>
        <h1 className="font-display text-2xl font-semibold">Dons invendus</h1>
        <p className="mt-1 text-sm text-ink-muted">Ce site n&apos;est pas encore ouvert au public.</p>
      </div>

      <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        {etat?.erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-sm text-accent">{etat.erreur}</div>}
        <div>
          <label htmlFor="motDePasse" className="mb-1 block text-xs font-medium text-ink-muted">
            Mot de passe du site
          </label>
          <input
            id="motDePasse"
            name="motDePasse"
            type="password"
            required
            autoFocus
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
          />
        </div>
        <SubmitButton className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white disabled:opacity-60" pendingText="Vérification…">
          Entrer
        </SubmitButton>
      </form>
    </div>
  );
}
