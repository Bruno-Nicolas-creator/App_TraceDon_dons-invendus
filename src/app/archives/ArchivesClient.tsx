"use client";

import { useState } from "react";
import BottomTabBar from "@/components/BottomTabBar";

type Onglet = "bons" | "attestations";

export type BonArchive = { id: string; titre: string; date: string; poids: string };
export type AttestationArchive = { id: string; titre: string; periode: string; montant: string };

function DocIcon({ variant }: { variant: "bon" | "attestation" }) {
  const color = variant === "bon" ? "#1E4B36" : "#8A4420";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3H14L19 8V21H6V3Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3V8H19" stroke={color} strokeWidth="1.6" />
      {variant === "attestation" && <path d="M9 13H15M9 16.5H15" stroke={color} strokeWidth="1.4" />}
    </svg>
  );
}

export default function ArchivesClient({
  bons,
  attestations,
  role,
}: {
  bons: BonArchive[];
  attestations: AttestationArchive[];
  role: "ENTREPRISE" | "ASSOCIATION" | "COORDINATEUR";
}) {
  const [onglet, setOnglet] = useState<Onglet>("bons");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="px-5 pt-5 pb-3">
        <h1 className="mb-3.5 font-display text-xl font-semibold">Mes archives</h1>
        <div className="flex gap-5 border-b border-border">
          <button
            type="button"
            onClick={() => setOnglet("bons")}
            className={`border-b-2 pb-2.5 text-[13px] font-semibold ${onglet === "bons" ? "border-ink text-ink" : "border-transparent text-ink-muted"}`}
          >
            Bons d&apos;enlèvement
          </button>
          <button
            type="button"
            onClick={() => setOnglet("attestations")}
            className={`border-b-2 pb-2.5 text-[13px] font-semibold ${onglet === "attestations" ? "border-ink text-ink" : "border-transparent text-ink-muted"}`}
          >
            Attestations fiscales
          </button>
        </div>
      </header>

      <div className="flex gap-2 px-5 py-3">
        <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">2026</span>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted">Tous partenaires</span>
      </div>

      <main className="flex-1 space-y-2.5 px-5 pb-4">
        {onglet === "bons"
          ? bons.map((bon) => (
              <a
                key={bon.id}
                href={`/api/bon-enlevement/${bon.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
              >
                <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg bg-brand-tint">
                  <DocIcon variant="bon" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{bon.titre}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">{bon.date} · {bon.poids}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                  <path d="M9 6L15 12L9 18" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))
          : attestations.map((att) => (
              <a
                key={att.id}
                href={`/api/attestations/${att.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
              >
                <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg bg-accent-tint">
                  <DocIcon variant="attestation" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{att.titre}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">{att.periode} · {att.montant}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                  <path d="M9 6L15 12L9 18" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}
        {onglet === "bons" && bons.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">Aucun bon archivé.</div>
        )}
        {onglet === "attestations" && attestations.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">Aucune attestation générée.</div>
        )}
      </main>

      <BottomTabBar active="archives" role={role} />
    </div>
  );
}
