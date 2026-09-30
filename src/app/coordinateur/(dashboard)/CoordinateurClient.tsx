"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  articlesReclames: { reclames: number; total: number } | null;
};

export type EntrepriseNonConforme = {
  id: string;
  nom: string;
  surfaceM2: number;
  nombrePartenaires: number;
};

export type MoisTendance = { mois: string; poidsKg: number };

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
  poidsMoisCourant,
  libelleMoisCourant,
  nombreDons,
  tauxRefus,
  tendance,
  entreprisesNonConformes,
  co2EviteKg,
  equivalenceKm,
}: {
  associations: AssociationLigne[];
  donsNonAssignes: DonNonAssigne[];
  poidsMoisCourant: number;
  libelleMoisCourant: string;
  nombreDons: number;
  tauxRefus: number;
  tendance: MoisTendance[];
  entreprisesNonConformes: EntrepriseNonConforme[];
  co2EviteKg: number | null;
  equivalenceKm: number | null;
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
  // Les non-vérifiées remontent en premier : ce sont elles que le compteur ci-dessus annonce,
  // le tableau doit montrer la même chose en priorité plutôt qu'un simple ordre alphabétique.
  const associationsTriees = [...associations].sort((a, b) => {
    const verifieeA = verifieesLocal[a.id] ?? a.verifiee;
    const verifieeB = verifieesLocal[b.id] ?? b.verifiee;
    return Number(verifieeA) - Number(verifieeB);
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold lg:text-2xl">Tableau de bord</h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold capitalize text-ink-muted lg:px-3.5 lg:py-2 lg:text-[13px]">
          {libelleMoisCourant}
        </span>
      </div>

      {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <div className="rounded-2xl border border-border bg-surface p-3.5 lg:p-4.5">
          <div className="mb-2 text-xs text-ink-muted">Poids donné ce mois</div>
          <div className="font-display text-xl font-bold lg:text-[26px]">
            <CompteurAnime valeur={poidsMoisCourant} decimales={1} suffixe=" kg" />
          </div>
          <div className="mt-1 text-xs text-brand-dark">Bons confirmés du mois</div>
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
        <div className="rounded-2xl border border-border bg-surface p-3.5 lg:p-4.5">
          <div className="mb-2 text-xs text-ink-muted">Impact CO2 évité</div>
          <div className="font-display text-xl font-bold text-brand-dark lg:text-[26px]">
            {co2EviteKg != null ? <CompteurAnime valeur={co2EviteKg} decimales={0} suffixe=" kg" /> : "—"}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {equivalenceKm != null ? (
              <>≈ <CompteurAnime valeur={equivalenceKm} decimales={0} suffixe=" km" /> en voiture</>
            ) : (
              "Dons alimentaires, tous confondus"
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 lg:p-5">
        <h2 className="mb-3.5 text-[15px] font-semibold">Poids donné, 6 derniers mois</h2>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <AreaChart data={tendance} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="degradeVert" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E4B36" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1E4B36" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#EFEBE1" />
              <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6B6459" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6B6459" }} width={48} />
              <Tooltip
                formatter={(valeur) => [`${Number(valeur).toLocaleString("fr-FR")} kg`, "Poids donné"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #DDD8C9", fontSize: 13 }}
              />
              <Area type="monotone" dataKey="poidsKg" stroke="#1E4B36" strokeWidth={2} fill="url(#degradeVert)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Carte prioritaire : un don encore publié reste bloqué (ou partiellement bloqué, pour un
          don matériel divisible dont il reste des articles libres), donc c'est la première chose
          que le coordinateur doit voir et traiter. */}
      <div className="rounded-2xl border-2 border-accent/30 bg-surface p-4 lg:p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Dons à traiter</h2>
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
                {don.articlesReclames && (
                  <div className="mb-1.5 inline-block rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                    {don.articlesReclames.reclames}/{don.articlesReclames.total} articles déjà réclamés
                  </div>
                )}
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

      {/* Loi Garot : une entreprise de plus de 400 m² doit avoir au moins une association
          habilitée à l'aide alimentaire parmi ses partenaires (convention signée). Celles qui
          n'en ont aucune sont en défaut. */}
      <div className="rounded-2xl border-2 border-accent/30 bg-surface p-4 lg:p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Conformité loi Garot</h2>
          {entreprisesNonConformes.length > 0 && (
            <span className="rounded-full bg-accent-tint px-2.5 py-1 text-xs font-semibold text-accent">
              {entreprisesNonConformes.length} à risque
            </span>
          )}
        </div>
        {entreprisesNonConformes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
            Toutes les entreprises de plus de 400 m² ont au moins une association habilitée parmi
            leurs partenaires.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-ink-muted">
              Ces entreprises dépassent 400&nbsp;m² mais n&apos;ont aucune association habilitée à
              l&apos;aide alimentaire parmi leurs partenaires conventionnés.
            </p>
            {entreprisesNonConformes.map((ent, i) => (
              <div
                key={ent.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-fade-slide-in flex items-center justify-between rounded-xl border border-border p-3"
              >
                <div>
                  <div className="text-[13px] font-semibold">{ent.nom}</div>
                  <div className="text-xs text-ink-muted">
                    {ent.surfaceM2.toLocaleString("fr-FR")} m² ·{" "}
                    {ent.nombrePartenaires === 0
                      ? "aucun partenaire conventionné"
                      : `${ent.nombrePartenaires} partenaire${ent.nombrePartenaires > 1 ? "s" : ""} conventionné${ent.nombrePartenaires > 1 ? "s" : ""}, aucun habilité`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
              {associationsTriees.map((asso, i) => {
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
