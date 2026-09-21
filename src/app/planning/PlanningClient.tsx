"use client";

import { useState, useTransition } from "react";
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
}: {
  assignations: AssignationAffichee[];
  associations: Association[];
}) {
  const [liste, setListe] = useState(assignations);
  const [selection, setSelection] = useState<Record<number, string>>({});
  const [, startTransition] = useTransition();

  const ajouter = (jour: number) => {
    const associationId = selection[jour] ?? associations.find((a) => !liste.some((x) => x.jourSemaine === jour && x.associationId === a.id))?.id;
    if (!associationId) return;
    const association = associations.find((a) => a.id === associationId);
    if (!association) return;
    if (liste.some((a) => a.jourSemaine === jour && a.associationId === associationId)) return;

    setListe((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, jourSemaine: jour, associationId, associationNom: association.nom },
    ]);
    startTransition(() => {
      void definirAssignation(jour, associationId);
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

      <BottomTabBar active="planning" role="ENTREPRISE" />
    </div>
  );
}
