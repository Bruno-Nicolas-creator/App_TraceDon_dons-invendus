"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { demarrerSignatureAttestationAction } from "../actions";

export type AttestationSignatureAffichee = {
  id: string;
  numeroOrdre: string;
  entrepriseNom: string;
  associationNom: string;
  periodeDebut: string;
  periodeFin: string;
  montantCalcule: number;
  signee: boolean;
  peutSigner: boolean;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function AttestationSignatureClient({
  attestation,
  docusignConfigure,
}: {
  attestation: AttestationSignatureAffichee;
  docusignConfigure: boolean;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [signatureEnCours, setSignatureEnCours] = useState(false);
  const [, startTransition] = useTransition();

  const signer = () => {
    setErreur(null);
    setSignatureEnCours(true);
    startTransition(async () => {
      const resultat = await demarrerSignatureAttestationAction(attestation.id);
      if (!resultat.ok) {
        setErreur(resultat.error);
        setSignatureEnCours(false);
        return;
      }
      window.location.href = resultat.url;
    });
  };

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
        <h1 className="font-display text-xl font-semibold">Récapitulatif fiscal</h1>
      </header>

      <main className="flex-1 space-y-4 px-5 pb-4">
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">N° d&apos;ordre</span>
            <span className="font-semibold">{attestation.numeroOrdre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Donateur</span>
            <span className="font-semibold">{attestation.entrepriseNom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Association</span>
            <span className="font-semibold">{attestation.associationNom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Période</span>
            <span className="font-semibold">
              {formatDate(attestation.periodeDebut)} – {formatDate(attestation.periodeFin)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Montant</span>
            <span className="font-semibold">
              {attestation.montantCalcule.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </span>
          </div>
        </div>

        <a
          href={`/api/attestations/${attestation.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-full border border-border bg-surface py-2.5 text-center text-sm font-semibold"
        >
          Consulter le PDF
        </a>

        {attestation.signee ? (
          <div className="animate-fade-slide-in flex flex-col items-center gap-2 rounded-2xl bg-brand-tint p-6 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-semibold text-brand-dark">Attestation signée.</p>
          </div>
        ) : attestation.peutSigner ? (
          <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Signature</h2>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 15V17M6 10V8C6 4.7 8.7 2 12 2C15.3 2 18 4.7 18 8V10M5 10H19L18 21H6L5 10Z"
                    stroke="#6B6459"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
                DocuSign
              </span>
            </div>

            {!docusignConfigure && (
              <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">
                Signature électronique DocuSign non configurée sur ce déploiement.
              </div>
            )}

            <button
              type="button"
              onClick={signer}
              disabled={!docusignConfigure || signatureEnCours}
              className="w-full rounded-xl border-[1.5px] border-dashed border-[#C7C1B0] bg-surface py-3.5 text-sm font-semibold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signatureEnCours ? "Ouverture…" : "Signer l'attestation"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-surface-alt px-3.5 py-2.5 text-xs text-ink-muted">
            En attente de signature par {attestation.associationNom}.
          </div>
        )}

        {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}
      </main>
    </div>
  );
}
