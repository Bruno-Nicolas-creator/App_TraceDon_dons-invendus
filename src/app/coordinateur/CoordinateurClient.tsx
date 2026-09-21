"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { assignerDon, verifierAssociation } from "@/app/actions";

export type AssociationLigne = {
  id: string;
  nom: string;
  rna: string;
  rescrit: string;
  rescritVariant: "attente" | "tacite" | "absent";
  verifiee: boolean;
};

export type DonNonAssigne = {
  id: string;
  nom: string;
  poids: string;
  depuis: string;
};

const RESCRIT_STYLES: Record<AssociationLigne["rescritVariant"], string> = {
  attente: "bg-surface-alt text-ink-muted",
  tacite: "bg-brand-tint text-brand-dark",
  absent: "bg-accent-tint text-accent",
};

const NAV_ITEMS = ["Tableau de bord", "Entreprises", "Associations", "Dons", "Réseaux"];

export default function CoordinateurClient({
  associations,
  donsNonAssignes,
  poidsMois,
  nombreDons,
  tauxRefus,
  nomCoordinateur,
}: {
  associations: AssociationLigne[];
  donsNonAssignes: DonNonAssigne[];
  poidsMois: string;
  nombreDons: number;
  tauxRefus: string;
  nomCoordinateur: string;
}) {
  const [verifieesLocal, setVerifieesLocal] = useState<Record<string, boolean>>({});
  const [assignesLocal, setAssignesLocal] = useState<Record<string, string>>({});
  const [selectionAssociation, setSelectionAssociation] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  const toggleVerifie = (id: string, actuel: boolean) => {
    const prochain = !actuel;
    setVerifieesLocal((prev) => ({ ...prev, [id]: prochain }));
    startTransition(() => {
      void verifierAssociation(id, prochain);
    });
  };

  const assigner = (donId: string) => {
    const associationId = selectionAssociation[donId] ?? associations[0]?.id;
    if (!associationId) return;
    const nomAssociation = associations.find((a) => a.id === associationId)?.nom ?? "";
    setAssignesLocal((prev) => ({ ...prev, [donId]: nomAssociation }));
    startTransition(() => {
      void assignerDon(donId, associationId);
    });
  };

  const enAttente = associations.filter((a) => !(verifieesLocal[a.id] ?? a.verifiee)).length;

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-58 shrink-0 flex-col bg-brand-dark p-4">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-brand-tint font-display text-sm font-bold text-brand-dark">D</div>
          <span className="font-display text-base font-semibold text-white">DonSolidaire</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item, i) => (
            <div key={item} className={`rounded-lg px-3 py-2.5 text-[13.5px] ${i === 0 ? "bg-white/10 font-semibold text-white" : "text-white/70"}`}>
              {item}
            </div>
          ))}
        </nav>
        <div className="flex-1" />
        <Link href="/profil" className="flex items-center gap-2.5 border-t border-white/15 px-2 pt-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand-dark">
            {nomCoordinateur.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">{nomCoordinateur} — Coordinateur</div>
            <div className="text-[11px] text-white/60">Voir le profil</div>
          </div>
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border px-8">
          <div className="flex max-w-90 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="#6B6459" strokeWidth="1.8" />
              <path d="M20 20L16.5 16.5" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] text-ink-muted">Rechercher une entreprise, association...</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 overflow-y-auto px-8 py-7">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-semibold">Tableau de bord</h1>
            <span className="rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-muted">Septembre 2026</span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-surface p-4.5">
              <div className="mb-2 text-xs text-ink-muted">Poids donné ce mois</div>
              <div className="font-display text-[26px] font-bold">{poidsMois}</div>
              <div className="mt-1 text-xs text-brand-dark">Cumul des bons confirmés</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4.5">
              <div className="mb-2 text-xs text-ink-muted">Dons réalisés</div>
              <div className="font-display text-[26px] font-bold">{nombreDons}</div>
              <div className="mt-1 text-xs text-ink-muted">Bons d&apos;enlèvement confirmés</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4.5">
              <div className="mb-2 text-xs text-ink-muted">Taux de refus</div>
              <div className="font-display text-[26px] font-bold">{tauxRefus}</div>
              <div className="mt-1 text-xs text-ink-muted">Articles refusés / total</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4.5">
              <div className="mb-2 text-xs text-ink-muted">Associations à vérifier</div>
              <div className="font-display text-[26px] font-bold text-accent">{enAttente}</div>
              <div className="mt-1 text-xs text-ink-muted">Vérification manuelle requise</div>
            </div>
          </div>

          <div className="flex items-start gap-5">
            <div className="flex-[1.4] rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Associations à vérifier</h2>
                <span className="text-xs text-ink-muted">{enAttente} en attente</span>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Association</th>
                    <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">RNA</th>
                    <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Rescrit fiscal</th>
                    <th className="border-b border-border pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {associations.map((asso) => {
                    const verifiee = verifieesLocal[asso.id] ?? asso.verifiee;
                    return (
                      <tr key={asso.id}>
                        <td className="border-b border-surface-alt py-3 text-[13px] font-semibold">{asso.nom}</td>
                        <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">{asso.rna}</td>
                        <td className="border-b border-surface-alt py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs ${RESCRIT_STYLES[asso.rescritVariant]}`}>{asso.rescrit}</span>
                        </td>
                        <td className="border-b border-surface-alt py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleVerifie(asso.id, verifiee)}
                            className={`rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold ${verifiee ? "bg-brand-tint text-brand-dark" : "bg-surface"}`}
                          >
                            {verifiee ? "Vérifiée" : "Vérifier"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex-1 rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-3.5 text-[15px] font-semibold">Dons sans association</h2>
              <div className="space-y-2.5">
                {donsNonAssignes.map((don) => {
                  const nomAssigne = assignesLocal[don.id];
                  return (
                    <div key={don.id} className="rounded-xl border border-border p-3">
                      <div className="text-[13px] font-semibold">{don.nom}</div>
                      <div className="my-1.5 text-xs text-ink-muted">{don.poids} · publié {don.depuis}</div>
                      {nomAssigne ? (
                        <div className="w-full rounded-full bg-brand-tint py-2 text-center text-xs font-bold text-brand-dark">
                          Assigné à {nomAssigne}
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <select
                            value={selectionAssociation[don.id] ?? associations[0]?.id ?? ""}
                            onChange={(e) => setSelectionAssociation((prev) => ({ ...prev, [don.id]: e.target.value }))}
                            className="min-w-0 flex-1 rounded-full border border-border bg-surface px-2.5 text-xs"
                          >
                            {associations.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nom}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => assigner(don.id)}
                            className="shrink-0 rounded-full bg-brand px-3.5 py-2 text-xs font-bold text-white"
                          >
                            Assigner
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {donsNonAssignes.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">Tous les dons sont assignés.</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
