"use client";

import { useActionState, useState } from "react";
import { changerMotDePasseAction } from "./actions";

/** Changement de mot de passe depuis le profil (ancien mot de passe exigé). */
export default function ChangerMotDePasse() {
  const [ouvert, setOuvert] = useState(false);
  const [etat, formAction, enCours] = useActionState(changerMotDePasseAction, null);

  if (etat?.ok && !ouvert) {
    return (
      <div className="rounded-xl bg-brand-tint px-4 py-3 text-xs text-brand-dark">
        Mot de passe modifié. Vos autres sessions ont été déconnectées.
      </div>
    );
  }
  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="w-full rounded-full border border-border py-2.5 text-sm font-semibold transition-transform active:scale-[0.98]"
      >
        Changer mon mot de passe
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2.5 rounded-xl border border-border p-3">
      {etat && !etat.ok && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{etat.error}</div>}
      {etat?.ok && <div className="rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-dark">Mot de passe modifié. Vos autres sessions ont été déconnectées.</div>}
      {!etat?.ok && (
        <>
          <input name="ancien" type="password" required autoComplete="current-password" placeholder="Mot de passe actuel" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
          <input name="motDePasse" type="password" required minLength={8} autoComplete="new-password" placeholder="Nouveau mot de passe (8 caractères minimum)" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
          <input name="confirmation" type="password" required minLength={8} autoComplete="new-password" placeholder="Confirmez le nouveau mot de passe" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
          <div className="flex gap-2">
            <button type="submit" disabled={enCours} className="flex-1 rounded-full bg-ink py-2.5 text-xs font-semibold text-white disabled:opacity-60">
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setOuvert(false)} className="flex-1 rounded-full border border-border py-2.5 text-xs font-semibold">
              Annuler
            </button>
          </div>
        </>
      )}
    </form>
  );
}
