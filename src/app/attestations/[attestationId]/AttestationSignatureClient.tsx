"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  abandonnerDemandeRecuAction,
  contesterRecuAction,
  demarrerSignatureAttestationAction,
  emettreRecuAction,
  modifierDemandeRecuAction,
} from "../actions";

export type AttestationSignatureAffichee = {
  id: string;
  numeroOrdre: string | null;
  statut: "BROUILLON" | "DEMANDEE" | "CONTESTEE" | "ENVOYEE" | "SIGNEE";
  entrepriseNom: string;
  associationNom: string;
  periode: string;
  montant: number;
  motifContestation: string | null;
  demandeLe: string | null;
  emisLe: string | null;
  justificatifNom: string | null;
  interetGeneralDeclare: boolean;
  bons: { numero: string; date: string; poids: string | null; nature: string }[];
  role: "ENTREPRISE" | "ASSOCIATION";
  /** Administrateur de l'organisation : seul niveau autorisé à demander, émettre ou signer un reçu. */
  peutAgir: boolean;
  vientDEtreEnvoyee: boolean;
};

const formatEuros = (montant: number) => montant.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-muted">{libelle}</span>
      <span className="text-right font-semibold">{valeur}</span>
    </div>
  );
}

function Erreur({ message }: { message: string | null }) {
  return message ? <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{message}</div> : null;
}

/** Côté entreprise : corriger le montant (et le justificatif) d'une demande pas encore émise, ou la retirer. */
function GestionDemande({ attestation }: { attestation: AttestationSignatureAffichee }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  // Action de formulaire React (et non onSubmit) : même avant le chargement complet de la page, le
  // navigateur n'envoie jamais le montant dans l'adresse de la page.
  const modifier = (formData: FormData) => {
    setErreur(null);
    startTransition(async () => {
      const resultat = await modifierDemandeRecuAction(attestation.id, formData);
      if (!resultat.ok) setErreur(resultat.error);
      else router.refresh();
    });
  };

  const retirer = () => {
    if (!window.confirm("Retirer cette demande ? Les bons concernés pourront faire l'objet d'une nouvelle demande.")) return;
    setErreur(null);
    startTransition(async () => {
      const resultat = await abandonnerDemandeRecuAction(attestation.id);
      if (!resultat.ok) setErreur(resultat.error);
      else router.push("/archives");
    });
  };

  return (
    <form key={attestation.montant} action={modifier} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">
        {attestation.statut === "CONTESTEE" ? "Corriger et renvoyer la demande" : "Modifier la demande"}
      </h2>
      <label className="block space-y-1">
        <span className="text-xs font-semibold">Valeur totale des dons (en euros)</span>
        <input
          name="montant"
          inputMode="decimal"
          required
          defaultValue={attestation.montant.toLocaleString("fr-FR")}
          className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold">
          {attestation.justificatifNom ? "Remplacer le justificatif (facultatif)" : "Justificatif (facultatif)"}
        </span>
        <input type="file" name="justificatif" accept="application/pdf,image/jpeg,image/png,image/webp" className="block w-full text-xs text-ink-muted" />
      </label>
      <Erreur message={erreur} />
      <button
        type="submit"
        disabled={enCours}
        className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {enCours ? "Envoi en cours…" : attestation.statut === "CONTESTEE" ? "Renvoyer la demande" : "Enregistrer la modification"}
      </button>
      <button type="button" onClick={retirer} disabled={enCours} className="w-full py-1 text-xs font-semibold text-ink-muted underline">
        Retirer la demande
      </button>
    </form>
  );
}

/** Côté association : émettre et signer le reçu, ou contester la demande. */
function ReponseDemande({ attestation, docusignConfigure }: { attestation: AttestationSignatureAffichee; docusignConfigure: boolean }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [declare, setDeclare] = useState(false);
  const [contestation, setContestation] = useState(false);
  const [motif, setMotif] = useState("");
  const [enCours, startTransition] = useTransition();

  const emettre = () => {
    setErreur(null);
    startTransition(async () => {
      const resultat = await emettreRecuAction(attestation.id, declare);
      if (!resultat.ok) {
        setErreur(resultat.error);
        router.refresh();
        return;
      }
      window.location.href = resultat.url;
    });
  };

  const contester = () => {
    setErreur(null);
    startTransition(async () => {
      const resultat = await contesterRecuAction(attestation.id, motif);
      if (!resultat.ok) setErreur(resultat.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Votre réponse</h2>
      <p className="text-xs text-ink-muted">
        Vérifiez que la valeur déclarée correspond aux dons reçus. En émettant le reçu, il reçoit son numéro d&apos;ordre et
        s&apos;ouvre à votre signature électronique.
      </p>
      {!attestation.interetGeneralDeclare && (
        <label className="flex items-start gap-2.5 rounded-lg bg-surface-alt px-3 py-2.5 text-xs">
          <input type="checkbox" checked={declare} onChange={(e) => setDeclare(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Je déclare que mon association est d&apos;intérêt général (condition minimale pour émettre un reçu fiscal). Cette
            déclaration sera enregistrée dans votre profil.
          </span>
        </label>
      )}
      {!docusignConfigure && (
        <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">
          Signature électronique DocuSign non configurée sur ce déploiement.
        </div>
      )}
      <Erreur message={erreur} />
      <button
        type="button"
        onClick={emettre}
        disabled={enCours || !docusignConfigure || (!attestation.interetGeneralDeclare && !declare)}
        className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {enCours && !contestation ? "Ouverture…" : "Émettre et signer le reçu"}
      </button>
      {contestation ? (
        <div className="space-y-2">
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Expliquez à l'entreprise ce qui ne va pas (montant, dons concernés…)"
            className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={contester}
            disabled={enCours || !motif.trim()}
            className="w-full rounded-full border border-border py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Envoyer la contestation
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setContestation(true)}
          className="w-full rounded-full border border-border py-2.5 text-sm font-semibold"
        >
          Contester la demande
        </button>
      )}
    </div>
  );
}

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
  const estAssociation = attestation.role === "ASSOCIATION";
  const demandeOuverte = attestation.statut === "DEMANDEE" || attestation.statut === "CONTESTEE";

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
        <h1 className="font-display text-xl font-semibold">{demandeOuverte ? "Demande de reçu fiscal" : "Reçu fiscal"}</h1>
      </header>

      <main className="flex-1 space-y-4 px-5 pb-4">
        {attestation.vientDEtreEnvoyee && (
          <div className="rounded-2xl bg-brand-tint p-4 text-xs text-brand-dark">
            Demande envoyée à <strong>{attestation.associationNom}</strong>. Vous serez prévenu dès qu&apos;elle aura émis le
            reçu, ou si elle conteste la demande.
          </div>
        )}
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
          <Ligne libelle="N° d'ordre" valeur={attestation.numeroOrdre ?? "Attribué à l'émission"} />
          <Ligne libelle="Donateur" valeur={attestation.entrepriseNom} />
          <Ligne libelle="Association" valeur={attestation.associationNom} />
          <Ligne libelle="Période" valeur={attestation.periode} />
          <Ligne libelle="Valeur des dons" valeur={formatEuros(attestation.montant)} />
          {attestation.demandeLe && <Ligne libelle="Demandé le" valeur={attestation.demandeLe} />}
          {attestation.emisLe && <Ligne libelle="Émis le" valeur={attestation.emisLe} />}
          {attestation.justificatifNom && (
            <a
              href={`/api/attestations/${attestation.id}/justificatif`}
              target="_blank"
              rel="noopener noreferrer"
              className="block pt-1 text-xs font-semibold underline"
            >
              Voir le justificatif de l&apos;entreprise
            </a>
          )}
        </div>

        {attestation.bons.length > 0 && (
          <details className="rounded-2xl border border-border bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-semibold">
              {attestation.bons.length} bon{attestation.bons.length > 1 ? "s" : ""} d&apos;enlèvement couvert
              {attestation.bons.length > 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-ink-muted">
              {attestation.bons.map((b) => (
                <li key={b.numero}>
                  Bon n°{b.numero} · {b.date} · {b.nature}
                  {b.poids && ` · ${b.poids}`}
                </li>
              ))}
            </ul>
          </details>
        )}

        {attestation.statut === "CONTESTEE" && attestation.motifContestation && (
          <div className="rounded-2xl bg-accent-tint p-4 text-xs text-accent">
            <div className="mb-1 font-semibold">Demande contestée par {attestation.associationNom}</div>« {attestation.motifContestation} »
          </div>
        )}

        {attestation.numeroOrdre && (
          <a
            href={`/api/attestations/${attestation.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-full border border-border bg-surface py-2.5 text-center text-sm font-semibold"
          >
            Consulter le PDF
          </a>
        )}

        {!attestation.peutAgir ? (
          <div className="rounded-xl bg-surface-alt px-3.5 py-2.5 text-xs text-ink-muted">
            Les reçus fiscaux sont gérés par les administrateurs de votre organisation.
          </div>
        ) : demandeOuverte ? (
          estAssociation ? (
            attestation.statut === "DEMANDEE" ? (
              <ReponseDemande attestation={attestation} docusignConfigure={docusignConfigure} />
            ) : (
              <div className="rounded-xl bg-surface-alt px-3.5 py-2.5 text-xs text-ink-muted">
                Vous avez contesté cette demande : {attestation.entrepriseNom} peut la corriger et vous la renvoyer.
              </div>
            )
          ) : (
            <>
              {attestation.statut === "DEMANDEE" && (
                <div className="rounded-xl bg-surface-alt px-3.5 py-2.5 text-xs text-ink-muted">
                  En attente de la réponse de {attestation.associationNom}.
                </div>
              )}
              <GestionDemande attestation={attestation} />
            </>
          )
        ) : attestation.statut === "SIGNEE" ? (
          <div className="animate-fade-slide-in flex flex-col items-center gap-2 rounded-2xl bg-brand-tint p-6 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-semibold text-brand-dark">Reçu émis et signé.</p>
          </div>
        ) : estAssociation ? (
          <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Signature</h2>
              <span className="text-[11px] font-semibold text-ink-muted">DocuSign</span>
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
              {signatureEnCours ? "Ouverture…" : "Signer le reçu"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-surface-alt px-3.5 py-2.5 text-xs text-ink-muted">
            En attente de signature par {attestation.associationNom}.
          </div>
        )}

        <Erreur message={erreur} />
      </main>
    </div>
  );
}
