"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { demarrerSignatureConventionAction } from "../actions";

export type ConventionAffichee = {
  id: string;
  entrepriseNom: string;
  associationNom: string;
  dureeAns: number;
  entrepriseSignee: boolean;
  associationSignee: boolean;
  signee: boolean;
};

export default function ConventionClient({
  convention,
  role,
  docusignConfigure,
  retour,
}: {
  convention: ConventionAffichee;
  role: "ENTREPRISE" | "ASSOCIATION";
  docusignConfigure: boolean;
  retour: string | null;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [signatureEnCours, setSignatureEnCours] = useState<"DONATEUR" | "ASSOCIATION" | null>(null);
  const [, startTransition] = useTransition();

  const monRole: "DONATEUR" | "ASSOCIATION" = role === "ENTREPRISE" ? "DONATEUR" : "ASSOCIATION";
  const monStatutSigne = role === "ENTREPRISE" ? convention.entrepriseSignee : convention.associationSignee;
  const autreNom = role === "ENTREPRISE" ? convention.associationNom : convention.entrepriseNom;
  const autreStatutSigne = role === "ENTREPRISE" ? convention.associationSignee : convention.entrepriseSignee;

  const demarrerSignature = () => {
    setErreur(null);
    setSignatureEnCours(monRole);
    startTransition(async () => {
      const resultat = await demarrerSignatureConventionAction(convention.id, monRole);
      if (!resultat.ok) {
        setErreur(resultat.error);
        setSignatureEnCours(null);
        return;
      }
      window.location.href = resultat.url;
    });
  };

  const retourHref = retour ?? (role === "ENTREPRISE" ? "/planning" : "/dons");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="px-5 pt-5 pb-3">
        <h1 className="font-display text-xl font-semibold">Convention de don</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Avant tout premier don entre {convention.entrepriseNom} et {convention.associationNom}, la convention de
          don doit être signée par les deux parties.
        </p>
      </header>

      <main className="flex-1 space-y-4 px-5 pb-4">
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Donateur</span>
            <span className="font-semibold">{convention.entrepriseNom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Association</span>
            <span className="font-semibold">{convention.associationNom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Durée</span>
            <span className="font-semibold">
              {convention.dureeAns} an{convention.dureeAns > 1 ? "s" : ""}, renouvelable par tacite reconduction
            </span>
          </div>
        </div>

        {convention.signee ? (
          <div className="animate-fade-slide-in flex flex-col items-center gap-2 rounded-2xl bg-brand-tint p-6 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-semibold text-brand-dark">Convention signée par les deux parties.</p>
            <p className="text-xs text-brand-dark">Les dons entre {convention.entrepriseNom} et {convention.associationNom} peuvent maintenant être organisés.</p>
            <Link
              href={retourHref}
              className="mt-2 w-full rounded-full bg-brand py-3 text-center text-sm font-bold text-white transition-transform active:scale-[0.98]"
            >
              Continuer
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Signature</h2>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 15V17M6 10V8C6 4.7 8.7 2 12 2C15.3 2 18 4.7 18 8V10M5 10H19L18 21H6L5 10Z" stroke="#6B6459" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
                DocuSign
              </span>
            </div>

            {!docusignConfigure && (
              <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">
                Signature électronique DocuSign non configurée sur ce déploiement (voir .env.example).
              </div>
            )}

            <div className="rounded-xl bg-surface-alt px-3 py-2.5 text-xs text-ink-muted">
              {autreStatutSigne
                ? `${autreNom} a déjà signé. Votre signature finalisera la convention.`
                : `${autreNom} n'a pas encore signé.`}
            </div>

            <button
              type="button"
              onClick={demarrerSignature}
              disabled={monStatutSigne || !docusignConfigure || signatureEnCours !== null}
              className={`w-full rounded-xl border-[1.5px] border-dashed border-[#C7C1B0] py-3.5 text-sm font-semibold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                monStatutSigne ? "bg-brand-tint text-brand-dark" : "bg-surface"
              }`}
            >
              {monStatutSigne ? "Vous avez signé" : signatureEnCours ? "Ouverture…" : "Signer la convention"}
            </button>
            <p className="text-[11px] text-ink-muted">
              La signature ouvre la cérémonie de signature électronique qualifiée DocuSign, directement dans
              l&apos;application.
            </p>
          </div>
        )}

        {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}
      </main>
    </div>
  );
}
