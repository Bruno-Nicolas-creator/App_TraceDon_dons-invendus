"use client";

import { useActionState, useState } from "react";
import { accepterInvitationAction } from "./actions";

const champ = "w-full rounded-lg border border-border px-3 py-2.5 text-sm";

export default function AccepterInvitationForm({ jeton, email }: { jeton: string; email: string }) {
  const [etat, formAction, enCours] = useActionState(accepterInvitationAction, null);
  // Champ contrôlé : React vide les champs après chaque envoi ; le nom saisi reste ainsi en place après une erreur.
  const [nom, setNom] = useState("");
  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <input type="hidden" name="jeton" value={jeton} />
      {etat && !etat.ok && <div className="rounded-lg bg-accent-tint px-3 py-2 text-sm text-accent">{etat.error}</div>}
      <div>
        <div className="mb-1 text-xs font-medium text-ink-muted">Votre adresse e-mail de connexion</div>
        <div className="text-sm font-semibold break-all">{email}</div>
      </div>
      <div>
        <label htmlFor="nom" className="mb-1 block text-xs font-medium text-ink-muted">
          Votre nom
        </label>
        <input id="nom" name="nom" value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={100} autoComplete="name" className={champ} />
      </div>
      <div>
        <label htmlFor="motDePasse" className="mb-1 block text-xs font-medium text-ink-muted">
          Choisissez un mot de passe (8 caractères minimum)
        </label>
        <input id="motDePasse" name="motDePasse" type="password" required minLength={8} autoComplete="new-password" className={champ} />
      </div>
      <div>
        <label htmlFor="confirmation" className="mb-1 block text-xs font-medium text-ink-muted">
          Confirmez le mot de passe
        </label>
        <input id="confirmation" name="confirmation" type="password" required minLength={8} autoComplete="new-password" className={champ} />
      </div>
      <button type="submit" disabled={enCours} className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white disabled:opacity-60">
        {enCours ? "Création du compte…" : "Rejoindre"}
      </button>
    </form>
  );
}
