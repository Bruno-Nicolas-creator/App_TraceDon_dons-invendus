"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmerEmailAction } from "./actions";

/**
 * La confirmation demande un clic : certains logiciels de messagerie ouvrent les liens
 * automatiquement pour les analyser, ce qui consommerait le lien si l'ouverture suffisait.
 */
export default function ConfirmerEmailForm({ jeton }: { jeton: string }) {
  const [etat, formAction, enCours] = useActionState(confirmerEmailAction, null);

  if (etat?.ok) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-6 text-sm">
        <p className="font-semibold">Adresse e-mail confirmée.</p>
        <p className="text-ink-muted">Utilisez désormais cette adresse pour vous connecter.</p>
        <Link href="/connexion" className="inline-block font-semibold underline">
          Aller à la connexion
        </Link>
      </div>
    );
  }
  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <input type="hidden" name="jeton" value={jeton} />
      {etat && !etat.ok && <div className="rounded-lg bg-accent-tint px-3 py-2 text-sm text-accent">{etat.error}</div>}
      <p className="text-sm text-ink-muted">Cette adresse deviendra l&apos;adresse de connexion de votre compte TraceDon.</p>
      <button type="submit" disabled={enCours} className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white disabled:opacity-60">
        {enCours ? "Confirmation…" : "Confirmer ma nouvelle adresse"}
      </button>
    </form>
  );
}
