"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { verifierAssociation } from "@/app/actions";

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

const RESCRIT_STYLES: Record<AssociationLigne["rescritVariant"], string> = {
  attente: "bg-surface-alt text-ink-muted",
  tacite: "bg-brand-tint text-brand-dark",
  absent: "bg-accent-tint text-accent",
};

const HABILITATION_STYLES: Record<AssociationLigne["habilitationVariant"], string> = {
  habilitee: "bg-brand-tint text-brand-dark",
  absente: "bg-accent-tint text-accent",
};

export default function AssociationsClient({ associations }: { associations: AssociationLigne[] }) {
  const [verifieesLocal, setVerifieesLocal] = useState<Record<string, boolean>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<"toutes" | "a_verifier" | "non_habilitee">("toutes");

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

  const enAttente = associations.filter((a) => !(verifieesLocal[a.id] ?? a.verifiee)).length;

  const associationsAffichees = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase();
    return [...associations]
      .filter((a) => {
        if (rechercheNormalisee && !a.nom.toLowerCase().includes(rechercheNormalisee) && !a.rna.toLowerCase().includes(rechercheNormalisee)) {
          return false;
        }
        const verifiee = verifieesLocal[a.id] ?? a.verifiee;
        if (filtre === "a_verifier" && verifiee) return false;
        if (filtre === "non_habilitee" && a.habilitationVariant !== "absente") return false;
        return true;
      })
      // Les non-vérifiées remontent en premier : ce sont elles qui demandent une action.
      .sort((a, b) => Number(verifieesLocal[a.id] ?? a.verifiee) - Number(verifieesLocal[b.id] ?? b.verifiee));
  }, [associations, recherche, filtre, verifieesLocal]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold lg:text-2xl">Associations</h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted lg:px-3.5 lg:py-2 lg:text-[13px]">
          {associations.length} association{associations.length > 1 ? "s" : ""} · {enAttente} en attente
        </span>
      </div>

      {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par nom ou RNA…"
          className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "toutes", label: "Toutes" },
              { id: "a_verifier", label: "À vérifier" },
              { id: "non_habilitee", label: "Non habilitées" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltre(f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95 ${
                filtre === f.id ? "border-brand bg-brand-tint text-brand-dark" : "border-border bg-surface text-ink-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 lg:p-5">
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
              {associationsAffichees.map((asso, i) => {
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
          {associationsAffichees.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Aucune association ne correspond à cette recherche.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
