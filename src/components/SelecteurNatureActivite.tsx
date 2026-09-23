"use client";

import { NATURES_ACTIVITE_ENTREPRISE, type NatureActiviteEntrepriseId } from "@/lib/activiteEntreprise";

export default function SelecteurNatureActivite({
  name,
  valeur,
  onChange,
}: {
  name: string;
  valeur: NatureActiviteEntrepriseId;
  onChange: (v: NatureActiviteEntrepriseId) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs text-ink-muted">
        Nature de votre activité : quels types de dons ferez-vous ? *
      </span>
      <div className="space-y-2">
        {NATURES_ACTIVITE_ENTREPRISE.map((nature) => {
          const selectionne = valeur === nature.id;
          return (
            <button
              key={nature.id}
              type="button"
              onClick={() => onChange(nature.id)}
              aria-pressed={selectionne}
              className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                selectionne ? "border-brand bg-brand-tint" : "border-border bg-surface"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  selectionne ? "border-brand bg-brand" : "border-border"
                }`}
              >
                {selectionne && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span>
                <span className={`block text-sm font-semibold ${selectionne ? "text-brand-dark" : "text-ink"}`}>
                  {nature.label}
                </span>
                <span className="block text-xs text-ink-muted">{nature.exemple}</span>
              </span>
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={valeur} />
    </div>
  );
}
