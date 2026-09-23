"use client";

import { useMemo, useState } from "react";
import { basculerProfilDevAction } from "@/app/dev/actions";

type CompteDev = { email: string; nom: string; role: string };

const LABEL_ROLE: Record<string, string> = {
  ENTREPRISE: "Entreprise",
  ASSOCIATION: "Association",
  COORDINATEUR: "Coordinateur",
};

export default function DevProfilSwitcher({
  emailActif,
  comptes,
}: {
  emailActif: string | null;
  comptes: CompteDev[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");

  const comptesFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return comptes;
    return comptes.filter((c) => c.nom.toLowerCase().includes(q) || LABEL_ROLE[c.role]?.toLowerCase().includes(q));
  }, [comptes, recherche]);

  return (
    <div className="fixed bottom-20 right-3 z-[999]">
      {ouvert && (
        <div className="mb-2 w-64 rounded-2xl border border-[#C7C1B0] bg-surface shadow-lg">
          <div className="border-b border-border p-2.5">
            <div className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              Basculer de profil (dev)
            </div>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher une entreprise, une association…"
              className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs"
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto p-1.5">
            {comptesFiltres.map((compte) => {
              const actif = compte.email === emailActif;
              return (
                <form key={compte.email} action={basculerProfilDevAction.bind(null, compte.email)}>
                  <button
                    type="submit"
                    disabled={actif}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-transform active:scale-[0.98] disabled:cursor-default ${
                      actif ? "bg-brand-tint text-brand-dark" : "bg-surface-alt text-ink hover:bg-border/40"
                    }`}
                  >
                    <span className="truncate font-semibold">{compte.nom}</span>
                    <span className="ml-2 shrink-0 text-[10px] text-ink-muted">
                      {actif ? "actif" : LABEL_ROLE[compte.role] ?? compte.role}
                    </span>
                  </button>
                </form>
              );
            })}
            {comptesFiltres.length === 0 && (
              <div className="px-2.5 py-3 text-center text-xs text-ink-muted">Aucun compte trouvé.</div>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label="Basculer de profil (outil de développement)"
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[#C7C1B0] bg-ink text-white shadow-lg transition-transform active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 3H15M10 3V8L5.5 15.5C5 16.3 5.6 17.3 6.5 17.3H17.5C18.4 17.3 19 16.3 18.5 15.5L14 8V3"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M7.5 13H16.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
