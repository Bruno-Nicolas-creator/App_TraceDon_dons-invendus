"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demanderRecuFiscalAction } from "../actions";

type Groupe = {
  associationId: string;
  associationNom: string;
  interetGeneralDeclare: boolean;
  nombreBons: number;
  poidsTotalKg: number;
  nature: string;
};

type Etat = { ok: false; error: string } | null;

/** Une demande par association : la valeur se saisit séparément pour chacune. */
function DemandeAssociation({ annee, groupe }: { annee: number; groupe: Groupe }) {
  const router = useRouter();
  // Une fois envoyée, on ouvre la page de la demande (qui confirme l'envoi et permet de la suivre).
  const [etat, formAction, isPending] = useActionState(async (_etat: Etat, formData: FormData): Promise<Etat> => {
    const resultat = await demanderRecuFiscalAction(formData);
    if (!resultat.ok) return resultat;
    router.push(`/attestations/${resultat.id}?envoyee=1`);
    return null;
  }, null);

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <input type="hidden" name="annee" value={annee} />
      <input type="hidden" name="associationId" value={groupe.associationId} />
      <div>
        <div className="text-sm font-semibold">{groupe.associationNom}</div>
        <div className="text-xs text-ink-muted">
          {groupe.nombreBons} bon{groupe.nombreBons > 1 ? "s" : ""} confirmé{groupe.nombreBons > 1 ? "s" : ""} · {groupe.nature}
          {groupe.poidsTotalKg > 0 && ` · ${groupe.poidsTotalKg.toLocaleString("fr-FR")} kg`}
        </div>
      </div>
      {!groupe.interetGeneralDeclare && (
        <div className="rounded-lg bg-surface-alt px-3 py-2 text-xs text-ink-muted">
          Cette association n&apos;a pas encore déclaré être d&apos;intérêt général : elle devra le faire avant d&apos;émettre le
          reçu.
        </div>
      )}
      <label className="block space-y-1">
        <span className="text-xs font-semibold">Valeur totale des dons {annee} (en euros)</span>
        <input
          name="montant"
          inputMode="decimal"
          required
          placeholder="Ex. 1 250,50"
          className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold">Justificatif (facultatif)</span>
        <input
          type="file"
          name="justificatif"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="block w-full text-xs text-ink-muted"
        />
        <span className="block text-[11px] text-ink-muted">PDF ou image, 5 Mo maximum — par exemple l&apos;export de votre logiciel.</span>
      </label>
      {etat && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{etat.error}</div>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {isPending ? "Envoi en cours…" : "Envoyer la demande de reçu"}
      </button>
    </form>
  );
}

export default function NouvelleAttestationClient({
  annees,
  annee,
  groupes,
}: {
  annees: number[];
  annee: number | null;
  groupes: Groupe[];
}) {
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Link
          href="/archives"
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-display text-xl font-semibold">Demander un reçu fiscal</h1>
      </header>

      <main className="flex-1 space-y-4 px-5 pb-4">
        <div className="space-y-2.5 rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-ink-muted">
            Une fois par an, valorisez avec votre propre logiciel les dons remis à chaque association (en général à leur coût
            de revient), puis indiquez ici la valeur totale. L&apos;association vérifie votre demande, puis émet et signe le
            reçu fiscal — ou la conteste en vous expliquant pourquoi.
          </p>
          {annees.length > 0 && annee && (
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Année des dons</span>
              <select
                value={annee}
                onChange={(e) => router.push(`/attestations/nouvelle?annee=${e.target.value}`)}
                className="rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm"
              >
                {annees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {!annee || groupes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
            Aucun don confirmé qui ne soit pas déjà couvert par un reçu ou une demande en cours.
          </div>
        ) : (
          groupes.map((g) => <DemandeAssociation key={`${annee}-${g.associationId}`} annee={annee} groupe={g} />)
        )}
      </main>
    </div>
  );
}
