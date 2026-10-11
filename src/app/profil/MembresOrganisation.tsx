"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NIVEAUX_ACCES, libelleNiveau, type NiveauAcces } from "@/lib/droits";
import { changerNiveauMembreAction, desactiverMembreAction, reactiverMembreAction } from "./utilisateurs-actions";

export type Membre = { id: string; nom: string; email: string; niveau: NiveauAcces; desactive: boolean };

/** Utilisateurs de l'organisation et leurs niveaux d'accès (administrateurs uniquement, chantier C4c). */
export default function MembresOrganisation({ membres, moiId }: { membres: Membre[]; moiId: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  const agir = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setErreur(null);
    startTransition(async () => {
      const resultat = await action();
      if (!resultat.ok) setErreur(resultat.error);
      router.refresh();
    });
  };

  return (
    <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold">Utilisateurs de l&apos;organisation</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Administrateur : tout. Opérateur : les dons, les bons et la messagerie. Lecture : consultation seule.
        </p>
      </div>
      {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}
      <ul className="space-y-2">
        {membres.map((m) => {
          const moi = m.id === moiId;
          return (
            <li key={m.id} className={`space-y-2 rounded-xl px-3 py-2.5 ${m.desactive ? "bg-surface-alt opacity-70" : "bg-surface-alt"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {m.nom}
                    {moi && <span className="font-normal text-ink-muted"> (vous)</span>}
                  </div>
                  <div className="truncate text-xs text-ink-muted">{m.email}</div>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold">
                  {m.desactive ? "Accès retiré" : libelleNiveau(m.niveau)}
                </span>
              </div>
              {!moi && (
                <div className="flex flex-wrap items-center gap-2">
                  {!m.desactive && (
                    <select
                      value={m.niveau}
                      disabled={enCours}
                      onChange={(e) => agir(() => changerNiveauMembreAction(m.id, e.target.value))}
                      aria-label={`Niveau d'accès de ${m.nom}`}
                      className="rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs"
                    >
                      {NIVEAUX_ACCES.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {m.desactive ? (
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() => agir(() => reactiverMembreAction(m.id))}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      Rétablir l&apos;accès
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() =>
                        agir(
                          () => desactiverMembreAction(m.id),
                          `Retirer l'accès de ${m.nom} ? Ses sessions seront fermées immédiatement ; son nom restera sur l'historique.`
                        )
                      }
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-accent"
                    >
                      Retirer l&apos;accès
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-ink-muted">Les invitations de collègues par e-mail arrivent dans la prochaine mise à jour.</p>
    </div>
  );
}
