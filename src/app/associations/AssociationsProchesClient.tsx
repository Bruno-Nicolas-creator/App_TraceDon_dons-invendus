"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BottomTabBar from "@/components/BottomTabBar";
import GoogleMap from "@/components/GoogleMap";
import TogglePill from "@/components/TogglePill";
import MapPinIcon from "@/components/MapPinIcon";
import { lienItineraire } from "@/lib/googleMapsLinks";
import { libelleTypeActivite } from "@/lib/activiteAssociation";

type Vue = "carte" | "liste";

export type AssociationAffichee = {
  id: string;
  nom: string;
  adresse: string;
  distance: string;
  categorie: string;
  habilitee: boolean;
  latitude: number | null;
  longitude: number | null;
  congesJusquau: string | null;
  typesActivite: string[];
  notreAction: string | null;
  chaineFroidAttestee: boolean;
};

const LONGUEUR_MAX_EXTRAIT = 140;

function extraitNotreAction(texte: string): string {
  if (texte.length <= LONGUEUR_MAX_EXTRAIT) return texte;
  return `${texte.slice(0, LONGUEUR_MAX_EXTRAIT).trimEnd()}…`;
}

export default function AssociationsProchesClient({
  associations,
  centreCarte,
  entrepriseGrandeSurface,
  nonLusMessages = 0,
}: {
  associations: AssociationAffichee[];
  centreCarte: { lat: number; lng: number } | null;
  entrepriseGrandeSurface: boolean;
  nonLusMessages?: number;
}) {
  const [vue, setVue] = useState<Vue>("carte");
  const [associationActiveId, setAssociationActiveId] = useState<string | null>(null);
  const [associationActiveSeq, setAssociationActiveSeq] = useState(0);
  const selectionnerAssociation = (id: string) => {
    setAssociationActiveId(id);
    setAssociationActiveSeq((n) => n + 1);
  };
  const carteConfiguree = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) && centreCarte !== null;
  // Mémoïsé : sans ça, chaque re-rendu (ex. cliquer une carte) recrée ce tableau, ce qui force
  // GoogleMap à détruire et recréer tous les repères (et rejouer leur animation d'apparition).
  const marqueurs = useMemo(
    () =>
      associations
        .filter((a) => a.latitude != null && a.longitude != null)
        .map((a) => ({ id: a.id, lat: a.latitude as number, lng: a.longitude as number, label: `${a.nom} · ${a.distance}` })),
    [associations]
  );

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
        {entrepriseGrandeSurface && (
          <div className="flex gap-3 rounded-2xl bg-accent-tint p-4">
            <span aria-hidden="true" className="text-lg leading-none">⚠️</span>
            <p className="text-xs leading-relaxed text-ink">
              Votre surface de vente dépasse 400 m² : la loi Garot vous impose de céder vos invendus à une
              association <strong>habilitée</strong>. Le statut d&apos;habilitation de chaque association est
              indiqué ci-dessous.
            </p>
          </div>
        )}

        {vue === "carte" && (
          <div className="sticky top-0 z-10 bg-bg pb-3">
            {carteConfiguree && centreCarte ? (
              <GoogleMap
                center={centreCarte}
                marqueurs={marqueurs}
                marqueurActifId={associationActiveId}
                marqueurActifSeq={associationActiveSeq}
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-surface-alt text-center text-xs text-ink-muted">
                Carte indisponible (clé Google Maps non configurée).
              </div>
            )}
          </div>
        )}

        <ul className="space-y-3">
          {associations.map((association, i) => (
            <li
              key={association.id}
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => selectionnerAssociation(association.id)}
              className="animate-fade-slide-in rounded-2xl border border-border bg-surface p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-sm font-semibold">{association.nom}</div>
                  <a
                    href={lienItineraire(association)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted underline decoration-dotted underline-offset-2"
                  >
                    <MapPinIcon />
                    {association.adresse}
                  </a>
                </div>
                <span className="whitespace-nowrap rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-dark">
                  {association.distance}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs text-ink-muted">{association.categorie}</span>
                {entrepriseGrandeSurface && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      association.habilitee ? "bg-brand-tint text-brand-dark" : "bg-accent-tint text-accent"
                    }`}
                  >
                    {association.habilitee ? "Habilitée" : "Non habilitée"}
                  </span>
                )}
                {association.chaineFroidAttestee && (
                  <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-dark">
                    ✓ Chaîne du froid
                  </span>
                )}
                {association.congesJusquau && (
                  <span className="rounded-full bg-accent-tint px-2.5 py-1 text-xs font-semibold text-accent">
                    🌴 En congés jusqu&apos;au {association.congesJusquau}
                  </span>
                )}
                {association.typesActivite.map((id) => (
                  <span key={id} className="rounded-full bg-surface-alt px-2.5 py-1 text-xs text-ink-muted">
                    {libelleTypeActivite(id)}
                  </span>
                ))}
              </div>
              {association.notreAction && (
                <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
                  {extraitNotreAction(association.notreAction)}
                </p>
              )}
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

      <BottomTabBar active="dons" role="ENTREPRISE" nonLusMessages={nonLusMessages} />
    </div>
  );
}
