"use client";

import { Fragment, useState, useTransition } from "react";
import { CRENEAUX, JOURS_SEMAINE, cleCreneau, resumeDisponibilites } from "@/lib/disponibilites";
import { definirDisponibilitesAction } from "@/app/profil/actions";

export default function SelecteurDisponibilites({ disponibilitesInitiales }: { disponibilitesInitiales: string[] }) {
  const [enregistrees, setEnregistrees] = useState(disponibilitesInitiales);
  const [selection, setSelection] = useState(disponibilitesInitiales);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const basculer = (cle: string) => {
    setSelection((prev) => (prev.includes(cle) ? prev.filter((c) => c !== cle) : [...prev, cle]));
  };

  const valider = () => {
    setErreur(null);
    startTransition(async () => {
      const resultat = await definirDisponibilitesAction(selection);
      if (!resultat.ok) {
        setErreur(resultat.error);
        return;
      }
      setEnregistrees(selection);
      setOuvert(false);
    });
  };

  const annuler = () => {
    setSelection(enregistrees);
    setErreur(null);
    setOuvert(false);
  };

  return (
    <div className="animate-fade-slide-in space-y-2 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold">Disponibilités pour le retrait</h2>
        <p className="mt-0.5 text-xs text-ink-muted">Jours et créneaux où votre association peut venir chercher un don.</p>
      </div>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors active:bg-surface-alt"
      >
        <span className={enregistrees.length ? "text-ink" : "text-ink-muted"}>{resumeDisponibilites(enregistrees)}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
          <path d="M9 6L15 12L9 18" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[1px]" onClick={annuler}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choisir les disponibilités de retrait"
            className="animate-fade-slide-in flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-base font-semibold">Disponibilités de retrait</h3>
              <button
                type="button"
                onClick={annuler}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-ink-muted transition-transform active:scale-90"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {erreur && <div className="mb-3 rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}
              <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-x-1.5 gap-y-2.5 text-center">
                <div />
                {JOURS_SEMAINE.map((jour) => (
                  <div key={jour.id} className="text-[11px] font-semibold text-ink-muted">
                    {jour.abrege}
                  </div>
                ))}
                {CRENEAUX.map((creneau) => (
                  <Fragment key={creneau.id}>
                    <div className="flex items-center justify-start pr-1 text-[11px] text-ink-muted">{creneau.label}</div>
                    {JOURS_SEMAINE.map((jour) => {
                      const cle = cleCreneau(jour.id, creneau.id);
                      const active = selection.includes(cle);
                      return (
                        <button
                          key={cle}
                          type="button"
                          onClick={() => basculer(cle)}
                          aria-pressed={active}
                          aria-label={`${jour.label} ${creneau.label.toLowerCase()}`}
                          className={`aspect-square rounded-lg border transition-all active:scale-90 ${
                            active ? "border-brand bg-brand-tint" : "border-border bg-surface"
                          }`}
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 gap-2.5 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={annuler}
                className="flex-1 rounded-full border border-border py-3 text-sm font-semibold text-ink transition-transform active:scale-[0.98]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={valider}
                disabled={isPending}
                className="flex-1 rounded-full bg-brand py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {isPending ? "Enregistrement…" : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
