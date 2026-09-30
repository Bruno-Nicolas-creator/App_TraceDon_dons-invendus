"use client";

import { useMemo, useState } from "react";

export type DonLigne = {
  id: string;
  entreprise: string;
  associations: string[];
  statut: "PUBLIE" | "PRIS_EN_CHARGE" | "CLOTURE" | "ANNULE";
  partiel: boolean;
  poidsKg: number;
  publieLe: string;
};

const STATUT_LABELS: Record<DonLigne["statut"], string> = {
  PUBLIE: "Publié",
  PRIS_EN_CHARGE: "Pris en charge",
  CLOTURE: "Clôturé",
  ANNULE: "Annulé",
};

const STATUT_STYLES: Record<DonLigne["statut"], string> = {
  PUBLIE: "bg-accent-tint text-accent",
  PRIS_EN_CHARGE: "bg-surface-alt text-ink-muted",
  CLOTURE: "bg-brand-tint text-brand-dark",
  ANNULE: "bg-surface-alt text-ink-muted",
};

const FILTRES = [
  { id: "TOUS", label: "Tous" },
  { id: "PUBLIE", label: "Publié" },
  { id: "PRIS_EN_CHARGE", label: "Pris en charge" },
  { id: "CLOTURE", label: "Clôturé" },
  { id: "ANNULE", label: "Annulé" },
] as const;

export default function DonsClient({ dons }: { dons: DonLigne[] }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]["id"]>("TOUS");

  const donsFiltres = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase();
    return dons.filter((don) => {
      if (filtre !== "TOUS" && don.statut !== filtre) return false;
      if (!rechercheNormalisee) return true;
      return (
        don.entreprise.toLowerCase().includes(rechercheNormalisee) ||
        don.associations.some((a) => a.toLowerCase().includes(rechercheNormalisee))
      );
    });
  }, [dons, recherche, filtre]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold lg:text-2xl">Dons</h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted lg:px-3.5 lg:py-2 lg:text-[13px]">
          {donsFiltres.length} / {dons.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par entreprise ou association…"
          className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTRES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltre(f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95 ${
                filtre === f.id ? "border-brand bg-brand-tint text-brand-dark" : "border-border bg-surface text-ink-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 lg:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="text-left">
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Entreprise</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Association</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Statut</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Poids</th>
                <th className="border-b border-border pb-2 text-[11px] font-semibold uppercase text-ink-muted">Publié le</th>
              </tr>
            </thead>
            <tbody>
              {donsFiltres.map((don, i) => (
                <tr key={don.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="border-b border-surface-alt py-3 text-[13px] font-semibold">{don.entreprise}</td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">
                    {don.associations.length > 0 ? don.associations.join(", ") : "—"}
                  </td>
                  <td className="border-b border-surface-alt py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${STATUT_STYLES[don.statut]}`}>
                      {STATUT_LABELS[don.statut]}
                    </span>
                    {don.partiel && (
                      <span className="ml-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-xs text-ink-muted">Partiel</span>
                    )}
                  </td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">
                    {don.poidsKg.toLocaleString("fr-FR")} kg
                  </td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">{don.publieLe}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {donsFiltres.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Aucun don ne correspond à cette recherche.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
