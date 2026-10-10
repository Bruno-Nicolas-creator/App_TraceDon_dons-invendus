"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BottomTabBar from "@/components/BottomTabBar";

type Onglet = "bons" | "attestations" | "interetGeneral";

// partenaire et annee servent aux filtres en haut de la liste.
type Filtrable = { partenaire: string; annee: number | null };

export type BonArchive = Filtrable & { id: string; titre: string; date: string; poids: string };
export type AttestationArchive = Filtrable & {
  id: string;
  titre: string;
  periode: string;
  montant: string;
  statut: "BROUILLON" | "ENVOYEE" | "SIGNEE";
};
export type AttestationInteretGeneralArchive = Filtrable & {
  id: string;
  titre: string;
  statut: "BROUILLON" | "ENVOYEE" | "SIGNEE";
};

function DocIcon({ variant }: { variant: "bon" | "attestation" }) {
  const fond = variant === "bon" ? "var(--brand-tint)" : "var(--accent-tint)";
  return (
    <span
      aria-hidden="true"
      className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full text-lg leading-none"
      style={{ backgroundColor: fond }}
    >
      {variant === "bon" ? "🧾" : "📜"}
    </span>
  );
}

export default function ArchivesClient({
  bons,
  attestations,
  attestationsInteretGeneral,
  role,
  nonLusMessages = 0,
}: {
  bons: BonArchive[];
  attestations: AttestationArchive[];
  attestationsInteretGeneral: AttestationInteretGeneralArchive[];
  role: "ENTREPRISE" | "ASSOCIATION" | "COORDINATEUR";
  nonLusMessages?: number;
}) {
  const [onglet, setOnglet] = useState<Onglet>("bons");
  const [annee, setAnnee] = useState<string>("toutes");
  const [partenaire, setPartenaire] = useState<string>("tous");

  // Années et partenaires proposés : ceux réellement présents dans les archives.
  const tous: Filtrable[] = useMemo(
    () => [...bons, ...attestations, ...attestationsInteretGeneral],
    [bons, attestations, attestationsInteretGeneral]
  );
  const annees = useMemo(
    () => [...new Set(tous.map((d) => d.annee).filter((a): a is number => a !== null))].sort((a, b) => b - a),
    [tous]
  );
  const partenaires = useMemo(
    () => [...new Set(tous.map((d) => d.partenaire))].sort((a, b) => a.localeCompare(b, "fr")),
    [tous]
  );
  const garder = (d: Filtrable) =>
    (annee === "toutes" || d.annee === Number(annee)) && (partenaire === "tous" || d.partenaire === partenaire);
  const bonsFiltres = bons.filter(garder);
  const attestationsFiltrees = attestations.filter(garder);
  const interetGeneralFiltrees = attestationsInteretGeneral.filter(garder);
  const filtreActif = annee !== "toutes" || partenaire !== "tous";
  const classeFiltre = (actif: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold ${actif ? "bg-ink text-white" : "border border-border bg-surface text-ink-muted"}`;

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
          <button
            type="button"
            onClick={() => setOnglet("interetGeneral")}
            className={`border-b-2 pb-2.5 text-[13px] font-semibold ${onglet === "interetGeneral" ? "border-ink text-ink" : "border-transparent text-ink-muted"}`}
          >
            Intérêt général
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 px-5 py-3">
        <label className="sr-only" htmlFor="filtreAnnee">Année</label>
        <select id="filtreAnnee" value={annee} onChange={(e) => setAnnee(e.target.value)} className={classeFiltre(annee !== "toutes")}>
          <option value="toutes">Toutes les années</option>
          {annees.map((a) => (
            <option key={a} value={String(a)}>
              {a}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filtrePartenaire">Partenaire</label>
        <select
          id="filtrePartenaire"
          value={partenaire}
          onChange={(e) => setPartenaire(e.target.value)}
          className={`max-w-[60%] truncate ${classeFiltre(partenaire !== "tous")}`}
        >
          <option value="tous">Tous partenaires</option>
          {partenaires.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {filtreActif && (
          <button
            type="button"
            onClick={() => {
              setAnnee("toutes");
              setPartenaire("tous");
            }}
            className="px-1 text-xs font-semibold text-ink-muted underline"
          >
            Effacer
          </button>
        )}
      </div>

      <main className="flex-1 space-y-2.5 px-5 pb-4">
        {onglet === "attestations" && role === "ENTREPRISE" && (
          <Link
            href="/attestations/nouvelle"
            className="block w-full rounded-full border border-dashed border-border bg-surface py-2.5 text-center text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            + Générer un récapitulatif fiscal
          </Link>
        )}
        {onglet === "interetGeneral" && role === "ENTREPRISE" && (
          <Link
            href="/attestation-interet-general/nouvelle"
            className="block w-full rounded-full border border-dashed border-border bg-surface py-2.5 text-center text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            + Générer une attestation intérêt général
          </Link>
        )}
        {onglet === "bons" &&
          bonsFiltres.map((bon) => (
            <a
              key={bon.id}
              href={`/api/bon-enlevement/${bon.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
            >
              <DocIcon variant="bon" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold">{bon.titre}</div>
                <div className="mt-0.5 text-xs text-ink-muted">{bon.date} · {bon.poids}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                <path d="M9 6L15 12L9 18" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
        {onglet === "attestations" &&
          attestationsFiltrees.map((att) => {
            const aSigner = role === "ASSOCIATION" && att.statut !== "SIGNEE";
            return (
              <a
                key={att.id}
                href={aSigner ? `/attestations/${att.id}` : `/api/attestations/${att.id}/pdf`}
                target={aSigner ? undefined : "_blank"}
                rel={aSigner ? undefined : "noopener noreferrer"}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
              >
                <DocIcon variant="attestation" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{att.titre}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">{att.periode} · {att.montant}</div>
                </div>
                {aSigner ? (
                  <span className="shrink-0 rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-semibold text-accent">
                    À signer
                  </span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                    <path d="M9 6L15 12L9 18" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>
            );
          })}
        {onglet === "interetGeneral" &&
          interetGeneralFiltrees.map((att) => {
            const aSigner = role === "ASSOCIATION" && att.statut !== "SIGNEE";
            return (
              <a
                key={att.id}
                href={
                  aSigner
                    ? `/attestation-interet-general/${att.id}`
                    : `/api/attestation-interet-general/${att.id}/pdf`
                }
                target={aSigner ? undefined : "_blank"}
                rel={aSigner ? undefined : "noopener noreferrer"}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
              >
                <DocIcon variant="attestation" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{att.titre}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">Statut d&apos;intérêt général</div>
                </div>
                {aSigner ? (
                  <span className="shrink-0 rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-semibold text-accent">
                    À signer
                  </span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                    <path d="M9 6L15 12L9 18" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>
            );
          })}
        {onglet === "bons" && bonsFiltres.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            {filtreActif ? "Aucun bon pour ces filtres." : "Aucun bon archivé."}
          </div>
        )}
        {onglet === "attestations" && attestationsFiltrees.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            {filtreActif ? "Aucune attestation pour ces filtres." : "Aucune attestation générée."}
          </div>
        )}
        {onglet === "interetGeneral" && interetGeneralFiltrees.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            Aucune attestation intérêt général générée.
          </div>
        )}
      </main>

      <BottomTabBar active="archives" role={role} nonLusMessages={nonLusMessages} />
    </div>
  );
}
