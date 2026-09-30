"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type EntrepriseLigne = {
  id: string;
  nom: string;
  siret: string;
  nature: string;
  enseigne: string | null;
  kbisFourni: boolean;
  grandeSurface: boolean;
};

export default function EntreprisesClient({ entreprises }: { entreprises: EntrepriseLigne[] }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<"toutes" | "grande_surface" | "kbis_manquant">("toutes");

  const entreprisesFiltrees = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase();
    return entreprises.filter((ent) => {
      if (rechercheNormalisee && !ent.nom.toLowerCase().includes(rechercheNormalisee) && !ent.siret.includes(rechercheNormalisee)) {
        return false;
      }
      if (filtre === "grande_surface" && !ent.grandeSurface) return false;
      if (filtre === "kbis_manquant" && ent.kbisFourni) return false;
      return true;
    });
  }, [entreprises, recherche, filtre]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold lg:text-2xl">Entreprises</h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted lg:px-3.5 lg:py-2 lg:text-[13px]">
          {entreprisesFiltrees.length} / {entreprises.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par nom ou SIRET…"
          className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "toutes", label: "Toutes" },
              { id: "grande_surface", label: "Grande surface (loi Garot)" },
              { id: "kbis_manquant", label: "Kbis manquant" },
            ] as const
          ).map((f) => (
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
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">SIRET</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Nature</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Enseigne</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Loi Garot</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Kbis</th>
                <th className="border-b border-border pb-2" />
              </tr>
            </thead>
            <tbody>
              {entreprisesFiltrees.map((ent, i) => (
                <tr key={ent.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="border-b border-surface-alt py-3 text-[13px] font-semibold">{ent.nom}</td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">{ent.siret}</td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">{ent.nature}</td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">{ent.enseigne ?? "—"}</td>
                  <td className="border-b border-surface-alt py-3">
                    {ent.grandeSurface ? (
                      <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs text-ink-muted">&gt; 400 m²</span>
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="border-b border-surface-alt py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        ent.kbisFourni ? "bg-brand-tint text-brand-dark" : "bg-accent-tint text-accent"
                      }`}
                    >
                      {ent.kbisFourni ? "Fourni" : "Non fourni"}
                    </span>
                  </td>
                  <td className="border-b border-surface-alt py-3 text-right">
                    <Link
                      href={`/coordinateur/documents/entreprise/${ent.id}`}
                      className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                    >
                      Documents
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entreprisesFiltrees.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Aucune entreprise ne correspond à cette recherche.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
