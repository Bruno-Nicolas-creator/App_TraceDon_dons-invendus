"use client";

import { useActionState } from "react";
import { nouveauMotDePasseAction } from "../actions";

export default function NouveauMotDePasseForm({ jeton }: { jeton: string }) {
  const [etat, formAction, enCours] = useActionState(nouveauMotDePasseAction, null);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <input type="hidden" name="jeton" value={jeton} />
      {etat && !etat.ok && <div className="rounded-lg bg-accent-tint px-3 py-2 text-sm text-accent">{etat.error}</div>}
      <div>
        <label htmlFor="motDePasse" className="mb-1 block text-xs font-medium text-ink-muted">
          Nouveau mot de passe (8 caractères minimum)
        </label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label htmlFor="confirmation" className="mb-1 block text-xs font-medium text-ink-muted">
          Confirmez le nouveau mot de passe
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
        />
      </div>
      <button type="submit" disabled={enCours} className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}
      </button>
    </form>
  );
}
