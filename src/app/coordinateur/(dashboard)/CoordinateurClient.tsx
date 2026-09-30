"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { assignerDon, verifierAssociation } from "@/app/actions";
import CompteurAnime from "@/components/CompteurAnime";

export type AssociationLigne = {
  id: string;
  nom: string;
  rna: string;
  rescrit: string;
  rescritVariant: "attente" | "tacite" | "absent";
  habilitation: string;
  habilitationVariant: "habilitee" | "absente";
  verifiee: boolean;
};

export type DonNonAssigne = {
  id: string;
  nom: string;
  poids: string;
  depuis: string;
};

const RESCRIT_STYLES: Record<AssociationLigne["rescritVariant"], string> = {
  attente: "bg-surface-alt text-ink-muted",
  tacite: "bg-brand-tint text-brand-dark",
  absent: "bg-accent-tint text-accent",
};

const HABILITATION_STYLES: Record<AssociationLigne["habilitationVariant"], string> = {
  habilitee: "bg-brand-tint text-brand-dark",
  absente: "bg-accent-tint text-accent",
};

export default function CoordinateurClient({
  associations,
  donsNonAssignes,
  poidsMois,
  nombreDons,
  tauxRefus,
}: {
  associations: AssociationLigne[];
  donsNonAssignes: DonNonAssigne[];
  poidsMois: number;
  nombreDons: number;
  tauxRefus: number;
}) {
  const [verifieesLocal, setVerifieesLocal] = useState<Record<string, boolean>>({});
  const [assignesLocal, setAssignesLocal] = useState<Record<string, string>>({});
  const [selectionAssociation, setSelectionAssociation] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleVerifie = (id: string, actuel: boolean) => {
    const prochain = !actuel;
    setErreur(null);
    setVerifieesLocal((prev) => ({ ...prev, [id]: prochain }));
    startTransition(async () => {
      try {
        await verifierAssociation(id, prochain);
      } catch (e) {
        setVerifieesLocal((prev) => {
          const suivant = { ...prev };
          delete suivant[id];
          return suivant;
        });
        setErreur(e instanceof Error ? e.message : "Impossible de mettre à jour la vérification.");
      }
    });
  };

  const assigner = (donId: string) => {
    const associationId = selectionAssociation[donId] ?? associations[0]?.id;
    if (!associationId) return;
    const nomAssociation = associations.find((a) => a.id === associationId)?.nom ?? "";
    setErreur(null);
    setAssignesLocal((prev) => ({ ...prev, [donId]: nomAssociation }));
    startTransition(async () => {
      try {
        await assignerDon(donId, associationId);
      } catch (e) {
        setAssignesLocal((prev) => {
          const suivant = { ...prev };
          delete suivant[donId];
          return suivant;
        });
        setErreur(e instanceof Error ? e.message : "Impossible d'assigner ce don.");
      }
    });
  };

  const enAttente = associations.filter((a) => !(verifieesLocal[a.id] ?? a.verifiee)).length;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold lg:text-2xl">Tableau de bord</h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted lg:px-3.5 lg:py-2 lg:text-[13px]">
          Septembre 2026
        </span>
      </div>

      {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-border bg-surface p-3.5 lg:p-4.5">
          <div className="mb-2 text-xs text-ink-muted">Poids donné ce mois</div>
          <div className="font-display text-xl font-bold lg:text-[26px]">
            <CompteurAnime valeur={poidsMois} decimales={1} suffixe=" kg" />
          </div>
          <div className="mt-1 text-xs text-brand-dark">Cumul des bons confirmés</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3.5 lg:p-4.5">
          <div className="mb-2 text-xs text-ink-muted">Dons réalisés</div>
          <div className="font-display text-xl font-bold lg:text-[26px]">
            <CompteurAnime valeur={nombreDons} />
          </div>
          <div className="mt-1 text-xs text-ink-muted">Bons d&apos;enlèvement confirmés</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3.5 lg:p-4.5">
          <div className="mb-2 text-xs text-ink-muted">Taux de refus</div>
          <div className="font-display text-xl font-bold lg:text-[26px]">
            <CompteurAnime valeur={tauxRefus} decimales={1} suffixe="%" />
          </div>
          <div className="mt-1 text-xs text-ink-muted">Articles refusés / total</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3.5 lg:p-4.5">
          <div className="mb-2 text-xs text-ink-muted">Associations à vérifier</div>
          <div className="font-display text-xl font-bold text-accent lg:text-[26px]">
            <CompteurAnime valeur={enAttente} />
          </div>
          <div className="mt-1 text-xs text-ink-muted">Vérification manuelle requise</div>
        </div>
      </div>

      {/* Carte prioritaire : un don sans association assignée reste bloqué, donc c'est la
          première chose que le coordinateur doit voir et traiter. */}
      <div className="rounded-2xl border-2 border-accent/30 bg-surface p-4 lg:p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Dons sans association</h2>
          {donsNonAssignes.length > 0 && (
            <span className="rounded-full bg-accent-tint px-2.5 py-1 text-xs font-semibold text-accent">
              {donsNonAssignes.length} à traiter
            </span>
          )}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {donsNonAssignes.map((don, i) => {
            const nomAssigne = assignesLocal[don.id];
            return (
              <div
                key={don.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-fade-slide-in rounded-xl border border-border p-3"
              >
                <div className="text-[13px] font-semibold">{don.nom}</div>
                <div className="my-1.5 text-xs text-ink-muted">{don.poids} · publié {don.depuis}</div>
                {nomAssigne ? (
                  <div className="w-full rounded-full bg-brand-tint py-2 text-center text-xs font-bold text-brand-dark">
                    Assigné à {nomAssigne}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 sm:flex-row">
                    <select
                      value={selectionAssociation[don.id] ?? associations[0]?.id ?? ""}
                      onChange={(e) => setSelectionAssociation((prev) => ({ ...prev, [don.id]: e.target.value }))}
                      className="min-w-0 flex-1 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs"
                    >
                      {associations.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nom}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => assigner(don.id)}
                      disabled={isPending}
                      className="shrink-0 rounded-full bg-brand px-3.5 py-2 text-xs font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Assigner
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {donsNonAssignes.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted sm:col-span-2 lg:col-span-3">
              Tous les dons sont assignés.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 lg:p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Associations à vérifier</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted">{enAttente} en attente</span>
            <Link href="/coordinateur/associations" className="text-xs font-semibold text-brand-dark">
              Voir toutes les associations
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="text-left">
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Association</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">RNA</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Rescrit fiscal</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Habilitation</th>
                <th className="border-b border-border pb-2" />
                <th className="border-b border-border pb-2" />
              </tr>
            </thead>
            <tbody>
              {associations.map((asso, i) => {
                const verifiee = verifieesLocal[asso.id] ?? asso.verifiee;
                return (
                  <tr key={asso.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="border-b border-surface-alt py-3 text-[13px] font-semibold">{asso.nom}</td>
                    <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">{asso.rna}</td>
                    <td className="border-b border-surface-alt py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${RESCRIT_STYLES[asso.rescritVariant]}`}>{asso.rescrit}</span>
                    </td>
                    <td className="border-b border-surface-alt py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${HABILITATION_STYLES[asso.habilitationVariant]}`}>{asso.habilitation}</span>
                    </td>
                    <td className="border-b border-surface-alt py-3 text-right">
                      <Link
                        href={`/coordinateur/documents/association/${asso.id}`}
                        className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                      >
                        Documents
                      </Link>
                    </td>
                    <td className="border-b border-surface-alt py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleVerifie(asso.id, verifiee)}
                        disabled={isPending}
                        className={`rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${verifiee ? "bg-brand-tint text-brand-dark" : "bg-surface"}`}
                      >
                        {verifiee ? "Vérifiée" : "Vérifier"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {associations.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Aucune association enregistrée sur la plateforme.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
