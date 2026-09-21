"use client";

import { useState } from "react";
import Link from "next/link";
import BottomTabBar from "@/components/BottomTabBar";
import GoogleMap from "@/components/GoogleMap";
import TogglePill from "@/components/TogglePill";

type Vue = "carte" | "liste";

export type AssociationAffichee = {
  id: string;
  nom: string;
  adresse: string;
  distance: string;
  categorie: string;
  latitude: number | null;
  longitude: number | null;
};

export default function AssociationsProchesClient({
  associations,
  centreCarte,
}: {
  associations: AssociationAffichee[];
  centreCarte: { lat: number; lng: number } | null;
}) {
  const [vue, setVue] = useState<Vue>("carte");
  const carteConfiguree = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) && centreCarte !== null;
  const marqueurs = associations
    .filter((a) => a.latitude != null && a.longitude != null)
    .map((a) => ({ id: a.id, lat: a.latitude as number, lng: a.longitude as number, label: `${a.nom} · ${a.distance}` }));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="px-5 pt-5 pb-3">
        <div className="mb-3.5 flex items-center gap-3">
          <Link href="/" aria-label="Retour" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="font-display text-xl font-semibold">Associations à proximité</h1>
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

      <main className="flex-1 space-y-3 px-5 pb-4">
        {vue === "carte" &&
          (carteConfiguree && centreCarte ? (
            <GoogleMap center={centreCarte} marqueurs={marqueurs} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-surface-alt text-center text-xs text-ink-muted">
              Carte indisponible (clé Google Maps non configurée).
            </div>
          ))}

        <ul className="space-y-3">
          {associations.map((association, i) => (
            <li
              key={association.id}
              style={{ animationDelay: `${i * 50}ms` }}
              className="animate-fade-slide-in rounded-2xl border border-border bg-surface p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-sm font-semibold">{association.nom}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">{association.adresse}</div>
                </div>
                <span className="whitespace-nowrap rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-dark">
                  {association.distance}
                </span>
              </div>
              <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs text-ink-muted">{association.categorie}</span>
            </li>
          ))}
          {associations.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
              Aucune association enregistrée sur la plateforme.
            </li>
          )}
        </ul>

        <Link
          href="/planning"
          className="block w-full rounded-full border border-border bg-surface py-2.5 text-center text-sm font-semibold transition-transform active:scale-[0.98]"
        >
          Gérer le planning des enlèvements
        </Link>
      </main>

      <BottomTabBar active="dons" role="ENTREPRISE" />
    </div>
  );
}
