"use client";

import { useState } from "react";
import { GROUPES_CATEGORIES_DON } from "@/lib/categoriesDon";
import IconeCategorieDon from "./IconeCategorieDon";
import ChevronIcon from "./ChevronIcon";

function CheckBadge() {
  return (
    <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-brand text-white shadow-sm">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 13L9 17L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function SelecteurCategoriesDon({
  name,
  selection,
  onChange,
  multiple = true,
  label = "Catégories de dons proposées",
  inline = false,
}: {
  name: string;
  selection: string[];
  onChange: (selection: string[]) => void;
  /** false : une seule catégorie à la fois (ex. catégorie d'un article), sans "Tout cocher". */
  multiple?: boolean;
  label?: string;
  /** true : tuiles affichées directement (pas de bouton à taper ni de fenêtre à ouvrir) —
   * pour un choix rapide et unique, ex. la catégorie d'un article qu'on vient d'ajouter. */
  inline?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [groupeOuvert, setGroupeOuvert] = useState<string>(GROUPES_CATEGORIES_DON[0].id);

  const basculerCategorie = (id: string) => {
    if (!multiple) {
      onChange(selection.includes(id) ? [] : [id]);
      return;
    }
    onChange(selection.includes(id) ? selection.filter((c) => c !== id) : [...selection, id]);
  };

  const basculerGroupe = (idsGroupe: string[], tousSelectionnes: boolean) => {
    onChange(
      tousSelectionnes
        ? selection.filter((id) => !idsGroupe.includes(id))
        : [...new Set([...selection, ...idsGroupe])]
    );
  };

  const libellePluriel = (n: number) => `${n} catégorie${n > 1 ? "s" : ""} sélectionnée${n > 1 ? "s" : ""}`;
  const libelleUnique = GROUPES_CATEGORIES_DON.flatMap((g) => g.categories).find((c) => c.id === selection[0])?.label;

  if (inline) {
    return (
      <div>
        <span className="mb-1.5 block text-xs text-ink-muted">{label}</span>
        <input type="hidden" name={name} value={selection.join(",")} />
        <div className="rounded-xl border border-border">
          {GROUPES_CATEGORIES_DON.map((groupe) => {
            const idsGroupe = groupe.categories.map((c) => c.id);
            const nbSelectionnes = idsGroupe.filter((id) => selection.includes(id)).length;
            const estOuvert = groupeOuvert === groupe.id;

            return (
              <div key={groupe.id} className="border-b border-border px-3.5 py-3 last:border-none">
                <button
                  type="button"
                  onClick={() => setGroupeOuvert(estOuvert ? "" : groupe.id)}
                  aria-expanded={estOuvert}
                  className="flex w-full items-center justify-between gap-2"
                >
                  <span className="flex flex-wrap items-center gap-2 text-left text-sm font-semibold">
                    {groupe.label}
                    {nbSelectionnes > 0 && (
                      <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                        {nbSelectionnes}/{idsGroupe.length}
                      </span>
                    )}
                  </span>
                  <ChevronIcon ouvert={estOuvert} />
                </button>

                {estOuvert && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {groupe.categories.map((cat) => {
                      const active = selection.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => basculerCategorie(cat.id)}
                          aria-pressed={active}
                          className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all active:scale-95 ${
                            active ? "border-brand bg-brand-tint" : "border-border bg-surface"
                          }`}
                        >
                          {active && <CheckBadge />}
                          <IconeCategorieDon id={cat.id} active={active} />
                          <span
                            className={`text-[11px] leading-tight ${active ? "font-semibold text-brand-dark" : "text-ink-muted"}`}
                          >
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-1 block text-xs text-ink-muted">{label}</span>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors active:bg-surface-alt"
      >
        <span className={selection.length ? "text-ink" : "text-ink-muted"}>
          {selection.length > 0
            ? multiple
              ? libellePluriel(selection.length)
              : libelleUnique
            : multiple
              ? "Choisir les catégories (optionnel)"
              : "Choisir une catégorie (optionnel)"}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
          <path d="M9 6L15 12L9 18" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <input type="hidden" name={name} value={selection.join(",")} />

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[1px] lg:items-stretch lg:justify-end"
          onClick={() => setOuvert(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choisir les catégories de dons"
            className="animate-fade-slide-in flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-surface lg:h-full lg:w-[420px] lg:max-w-none lg:max-h-none lg:animate-slide-in-right lg:rounded-none lg:rounded-l-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-base font-semibold">{multiple ? "Catégories de dons" : "Catégorie"}</h3>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-ink-muted transition-transform active:scale-90"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              {GROUPES_CATEGORIES_DON.map((groupe) => {
                const idsGroupe = groupe.categories.map((c) => c.id);
                const nbSelectionnes = idsGroupe.filter((id) => selection.includes(id)).length;
                const estOuvert = groupeOuvert === groupe.id;
                const tousSelectionnes = nbSelectionnes === idsGroupe.length;

                return (
                  <div key={groupe.id} className="border-b border-border py-3.5 last:border-none">
                    <button
                      type="button"
                      onClick={() => setGroupeOuvert(estOuvert ? "" : groupe.id)}
                      aria-expanded={estOuvert}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      <span className="flex flex-wrap items-center gap-2 text-left text-sm font-semibold">
                        {groupe.label}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            nbSelectionnes > 0 ? "bg-brand-tint text-brand-dark" : "bg-surface-alt text-ink-muted"
                          }`}
                        >
                          {nbSelectionnes}/{idsGroupe.length} sélectionnés
                        </span>
                      </span>
                      <ChevronIcon ouvert={estOuvert} />
                    </button>

                    {estOuvert && (
                      <div className="mt-3 space-y-3">
                        {multiple && (
                          <button
                            type="button"
                            onClick={() => basculerGroupe(idsGroupe, tousSelectionnes)}
                            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink transition-transform active:scale-95"
                          >
                            {tousSelectionnes ? "Tout décocher" : "Tout cocher"}
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                          {groupe.categories.map((cat) => {
                            const active = selection.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => basculerCategorie(cat.id)}
                                aria-pressed={active}
                                className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all active:scale-95 ${
                                  active ? "border-brand bg-brand-tint" : "border-border bg-surface"
                                }`}
                              >
                                {active && <CheckBadge />}
                                <IconeCategorieDon id={cat.id} active={active} />
                                <span
                                  className={`text-[11px] leading-tight ${
                                    active ? "font-semibold text-brand-dark" : "text-ink-muted"
                                  }`}
                                >
                                  {cat.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
              >
                Valider{selection.length > 0 ? ` (${selection.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
