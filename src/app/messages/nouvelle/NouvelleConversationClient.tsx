"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demarrerConversationAction } from "../actions";

export type CibleAffichee = { type: "ASSOCIATION" | "ENTREPRISE"; id: string; nom: string };

export default function NouvelleConversationClient({
  cibles,
  avecCoordinateur,
}: {
  cibles: CibleAffichee[];
  avecCoordinateur: boolean;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const choisir = (type: "ASSOCIATION" | "ENTREPRISE" | "COORDINATEUR", id?: string) => {
    setErreur(null);
    setEnCours(id ?? "COORDINATEUR");
    startTransition(async () => {
      const resultat = await demarrerConversationAction(type, id);
      if (!resultat.ok) {
        setErreur(resultat.error);
        setEnCours(null);
        return;
      }
      router.push(`/messages/${resultat.conversationId}`);
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Link
          href="/messages"
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-display text-xl font-semibold">Nouvelle conversation</h1>
      </header>

      <main className="flex-1 space-y-1 px-5 pb-4">
        {avecCoordinateur && (
          <button
            type="button"
            onClick={() => choisir("COORDINATEUR")}
            disabled={enCours !== null}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors active:bg-surface-alt disabled:opacity-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-base font-bold text-white">
              C
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">Coordinateur</div>
              <div className="text-xs text-ink-muted">Support et questions sur la plateforme</div>
            </div>
            {enCours === "COORDINATEUR" && <span className="text-xs text-ink-muted">…</span>}
          </button>
        )}

        {cibles.length === 0 && !avecCoordinateur && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            Aucun partenaire disponible.
          </div>
        )}
        {cibles.length === 0 && avecCoordinateur && (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            Aucun partenaire avec convention signée pour l&apos;instant.
          </div>
        )}

        {cibles.map((cible) => (
          <button
            key={cible.id}
            type="button"
            onClick={() => choisir(cible.type, cible.id)}
            disabled={enCours !== null}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors active:bg-surface-alt disabled:opacity-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-base font-bold text-brand-dark">
              {cible.nom.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{cible.nom}</div>
              <div className="text-xs text-ink-muted">{cible.type === "ASSOCIATION" ? "Association" : "Entreprise"}</div>
            </div>
            {enCours === cible.id && <span className="text-xs text-ink-muted">…</span>}
          </button>
        ))}

        {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}
      </main>
    </div>
  );
}
