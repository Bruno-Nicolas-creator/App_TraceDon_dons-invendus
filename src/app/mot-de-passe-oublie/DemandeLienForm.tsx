"use client";

import { useActionState } from "react";
import { demanderReinitialisationAction } from "./actions";

export default function DemandeLienForm() {
  const [etat, formAction, enCours] = useActionState(demanderReinitialisationAction, null);

  if (etat?.ok) {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-surface p-6 text-sm">
        <p className="font-semibold">Vérifiez votre boîte e-mail.</p>
        <p className="text-ink-muted">
          Si un compte TraceDon existe pour cette adresse, un lien pour choisir un nouveau mot de passe vient d&apos;y être
          envoyé. Il est valable 1 heure. Pensez à regarder dans les indésirables.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      {etat && !etat.ok && <div className="rounded-lg bg-accent-tint px-3 py-2 text-sm text-accent">{etat.error}</div>}
      <div>
        <label htmlFor="email" className="mb-1 block text-xs font-medium text-ink-muted">
          Adresse e-mail de votre compte
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@exemple.fr"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
        />
      </div>
      <button type="submit" disabled={enCours} className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white disabled:opacity-60">
        {enCours ? "Envoi…" : "Recevoir un lien"}
      </button>
    </form>
  );
}
