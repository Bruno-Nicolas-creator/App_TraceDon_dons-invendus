"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import BottomTabBar from "@/components/BottomTabBar";
import GoogleMap from "@/components/GoogleMap";
import TogglePill from "@/components/TogglePill";
import { sePositionner } from "@/app/actions";

type Vue = "carte" | "liste";

export type DonAffiche = {
  id: string;
  nom: string;
  adresse: string;
  distance: string;
  categorie: string;
  poids: string;
  positionne: boolean;
  latitude: number | null;
  longitude: number | null;
};

export default function DonsDisponiblesClient({
  dons,
  centreCarte,
}: {
  dons: DonAffiche[];
  centreCarte: { lat: number; lng: number } | null;
}) {
  const [vue, setVue] = useState<Vue>("carte");
  const carteConfiguree = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) && centreCarte !== null;
  const marqueurs = dons
    .filter((d) => d.latitude != null && d.longitude != null)
    .map((d) => ({ id: d.id, lat: d.latitude as number, lng: d.longitude as number, label: `${d.nom} · ${d.distance}` }));
  const [positionnesLocal, setPositionnesLocal] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const positionner = (donId: string) => {
    setPositionnesLocal((prev) => ({ ...prev, [donId]: true }));
    startTransition(() => {
      void sePositionner(donId);
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="px-5 pt-5 pb-3">
        <div className="mb-3.5 flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">Dons disponibles</h1>
          <button type="button" aria-label="Filtrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6H20M8 12H16M11 18H13" stroke="#201F1B" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <TogglePill
          valeur={vue}
          onChange={setVue}
          options={[
            { valeur: "carte", label: "Carte" },
            { valeur: "liste", label: "Liste" },
          ]}
        />
      </header>

      <main className="flex-1 space-y-4 px-5 pb-4">
        {vue === "carte" && (
          carteConfiguree && centreCarte ? (
            <GoogleMap center={centreCarte} marqueurs={marqueurs} />
          ) : (
            <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-surface-alt">
              <svg width="100%" height="100%" viewBox="0 0 350 320" preserveAspectRatio="none" aria-hidden="true">
                <rect width="350" height="320" fill="#E7E3D6" />
                <path d="M0 60 H350 M0 140 H350 M0 220 H350" stroke="#DAD5C4" strokeWidth="2" />
                <path d="M70 0 V320 M180 0 V320 M280 0 V320" stroke="#DAD5C4" strokeWidth="2" />
                <rect x="20" y="90" width="60" height="40" fill="#D5D0BF" />
                <rect x="200" y="180" width="80" height="50" fill="#D5D0BF" />
              </svg>
              <div className="absolute left-[50%] top-[50%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brand shadow-[0_0_0_4px_rgba(46,107,78,0.2)]" />
              {dons.map((don, i) => (
                <div
                  key={don.id}
                  className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{ left: `${30 + i * 25}%`, top: `${28 + i * 22}%` }}
                >
                  {don.nom} · {don.distance}
                </div>
              ))}
            </div>
          )
        )}

        <ul className="space-y-3">
          {dons.map((don, i) => {
            const positionne = don.positionne || !!positionnesLocal[don.id];
            return (
              <li
                key={don.id}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-fade-slide-in rounded-2xl border border-border bg-surface p-4"
              >
                <div className="mb-2.5 flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-sm font-semibold">{don.nom}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">{don.adresse}</div>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-dark">{don.distance}</span>
                </div>
                <div className="mb-2.5 flex gap-2 text-xs text-ink-muted">
                  <span className="rounded-full bg-surface-alt px-2.5 py-1">{don.categorie}</span>
                  <span className="rounded-full bg-surface-alt px-2.5 py-1">&#8776; {don.poids}</span>
                </div>
                {positionne ? (
                  <div className="space-y-2">
                    <div className="w-full rounded-full bg-brand-tint py-2.5 text-center text-sm font-bold text-brand-dark">Positionné(e)</div>
                    <Link href={`/bon-enlevement/${don.id}`} className="block w-full rounded-full border border-border py-2.5 text-center text-sm font-semibold">
                      Voir le bon d&apos;enlèvement
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => positionner(don.id)}
                    disabled={isPending}
                    className="w-full rounded-full bg-brand py-2.5 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-50"
                  >
                    Se positionner
                  </button>
                )}
              </li>
            );
          })}
          {dons.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
              Aucun don disponible pour le moment.
            </li>
          )}
        </ul>
      </main>

      <BottomTabBar active="dons" role="ASSOCIATION" />
    </div>
  );
}
