"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomTabBar from "@/components/BottomTabBar";
import { LIBELLES_JOURS } from "@/lib/planning";
import { definirAssignation, retirerAssignation } from "./actions";

export type AssignationAffichee = {
  id: string;
  jourSemaine: number;
  associationId: string;
  associationNom: string;
};

type Association = { id: string; nom: string };

export default function PlanningClient({
  assignations,
  associations,
  nonLusMessages = 0,
}: {
  assignations: AssignationAffichee[];
  associations: Association[];
  nonLusMessages?: number;
}) {
  const [liste, setListe] = useState(assignations);
  const [selection, setSelection] = useState<Record<number, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [avertissement, setAvertissement] = useState<{ jour: number; associationId: string; message: string } | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const ajouter = (jour: number, forcer: boolean = false) => {
    const associationId = selection[jour] ?? associations.find((a) => !liste.some((x) => x.jourSemaine === jour && x.associationId === a.id))?.id;
    if (!associationId) return;
    const association = associations.find((a) => a.id === associationId);
    if (!association) return;
    if (liste.some((a) => a.jourSemaine === jour && a.associationId === associationId)) return;

    setErreur(null);
    setAvertissement(null);
    const idTemporaire = `temp-${jour}-${associationId}`;
    setListe((prev) => [...prev, { id: idTemporaire, jourSemaine: jour, associationId, associationNom: association.nom }]);
    startTransition(async () => {
      const resultat = await definirAssignation(jour, associationId, forcer);
      if (!resultat.ok) {
        setListe((prev) => prev.filter((a) => a.id !== idTemporaire));
        if (resultat.conventionId) {
          router.push(`/convention/${resultat.conventionId}?retour=/planning`);
          return;
        }
        if (resultat.avertissementHabilitation) {
          setAvertissement({ jour, associationId, message: resultat.error });
          return;
        }
        setErreur(resultat.error);
      }
    });
  };

  const retirer = (id: string) => {
    setListe((prev) => prev.filter((a) => a.id !== id));
    if (!id.startsWith("temp-")) {
      startTransition(() => {
        void retirerAssignation(id);
      });
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="px-5 pt-5 pb-3">
        <h1 className="font-display text-xl font-semibold">Planning des enlèvements</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Associe une ou plusieurs associations à chaque jour de la semaine. Le don du jour leur sera assigné
          directement — la liste des articles se renseigne au moment de l&apos;enlèvement.
        </p>
      </header>

      <main className="flex-1 space-y-3 px-5 pb-4">
        <Link
          href="/associations"
          className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2.5 text-xs font-semibold text-ink transition-transform active:scale-[0.98]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 21C12 21 19 15.5 19 10.5C19 6.4 15.9 3 12 3C8.1 3 5 6.4 5 10.5C5 15.5 12 21 12 21Z"
              stroke="#201F1B"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="10.5" r="2.3" stroke="#201F1B" strokeWidth="1.6" />
          </svg>
          Voir les associations à proximité
        </Link>

        {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}

        {avertissement && (
          <div className="animate-fade-slide-in space-y-2.5 rounded-2xl bg-accent-tint p-4">
            <p className="text-xs leading-relaxed text-accent">{avertissement.message}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAvertissement(null)}
                className="flex-1 rounded-full border border-border bg-surface py-2 text-xs font-semibold transition-transform active:scale-95"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => ajouter(avertissement.jour, true)}
                className="flex-1 rounded-full bg-ink py-2 text-xs font-semibold text-white transition-transform active:scale-95"
              >
                Ajouter quand même
              </button>
            </div>
          </div>
        )}

        {LIBELLES_JOURS.map((libelle, jour) => {
          const associationsDuJour = liste.filter((a) => a.jourSemaine === jour);
          const disponibles = associations.filter(
            (a) => !associationsDuJour.some((assignee) => assignee.associationId === a.id)
          );
          return (
            <section
              key={libelle}
              style={{ animationDelay: `${jour * 40}ms` }}
              className="animate-fade-slide-in rounded-2xl border border-border bg-surface p-3.5"
            >
              <h2 className="mb-2.5 text-sm font-semibold">{libelle}</h2>
              <div className="flex flex-wrap gap-1.5">
                {associationsDuJour.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-dark"
                  >
                    {a.associationNom}
                    <button
                      type="button"
                      onClick={() => retirer(a.id)}
                      aria-label={`Retirer ${a.associationNom} le ${libelle}`}
                      className="text-brand-dark/70 transition-transform active:scale-90"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {associationsDuJour.length === 0 && (
                  <span className="text-xs text-ink-muted">Aucune association planifiée.</span>
                )}
              </div>

              {disponibles.length > 0 && (
                <div className="mt-2.5 flex gap-1.5">
                  <select
                    value={selection[jour] ?? disponibles[0]?.id ?? ""}
                    onChange={(e) => setSelection((prev) => ({ ...prev, [jour]: e.target.value }))}
                    className="min-w-0 flex-1 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs"
                  >
                    {disponibles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => ajouter(jour)}
                    className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white transition-transform active:scale-95"
                  >
                    + Ajouter
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </main>

      <BottomTabBar active="planning" role="ENTREPRISE" nonLusMessages={nonLusMessages} />
    </div>
  );
}
