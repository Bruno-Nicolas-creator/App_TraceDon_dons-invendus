"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NIVEAUX_ACCES, libelleNiveau, type NiveauAcces } from "@/lib/droits";
import {
  annulerInvitationAction,
  changerNiveauMembreAction,
  desactiverMembreAction,
  inviterCollegueAction,
  reactiverMembreAction,
  renvoyerInvitationAction,
} from "./utilisateurs-actions";

export type Membre = { id: string; nom: string; email: string; niveau: NiveauAcces; desactive: boolean };
export type InvitationEnAttente = { id: string; email: string; niveau: NiveauAcces; expireLe: string };

/** Utilisateurs de l'organisation et leurs niveaux d'accès (administrateurs uniquement, chantier C4c). */
export default function MembresOrganisation({
  membres,
  invitations,
  moiId,
}: {
  membres: Membre[];
  invitations: InvitationEnAttente[];
  moiId: string;
}) {
  const [etatInvitation, actionInviter, invitationEnCours] = useActionState(inviterCollegueAction, null);
  // Formulaire ouvert tant qu'aucune invitation n'a réussi depuis son ouverture (une erreur le laisse ouvert).
  const [ouvertAvec, setOuvertAvec] = useState<typeof etatInvitation | undefined>(undefined);
  const formulaireOuvert = ouvertAvec !== undefined && (etatInvitation === ouvertAvec || !etatInvitation?.ok);
  // Champs contrôlés : conservés après une invitation refusée (React vide les champs après chaque envoi).
  const [emailInvite, setEmailInvite] = useState("");
  const [niveauInvite, setNiveauInvite] = useState<NiveauAcces>("OPERATEUR");
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  const agir = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setErreur(null);
    startTransition(async () => {
      const resultat = await action();
      if (!resultat.ok) setErreur(resultat.error);
      router.refresh();
    });
  };

  return (
    <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold">Utilisateurs de l&apos;organisation</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Administrateur : tout. Opérateur : les dons, les bons et la messagerie. Lecture : consultation seule.
        </p>
      </div>
      {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}
      <ul className="space-y-2">
        {membres.map((m) => {
          const moi = m.id === moiId;
          return (
            <li key={m.id} className={`space-y-2 rounded-xl px-3 py-2.5 ${m.desactive ? "bg-surface-alt opacity-70" : "bg-surface-alt"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {m.nom}
                    {moi && <span className="font-normal text-ink-muted"> (vous)</span>}
                  </div>
                  <div className="truncate text-xs text-ink-muted">{m.email}</div>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold">
                  {m.desactive ? "Accès retiré" : libelleNiveau(m.niveau)}
                </span>
              </div>
              {!moi && (
                <div className="flex flex-wrap items-center gap-2">
                  {!m.desactive && (
                    <select
                      value={m.niveau}
                      disabled={enCours}
                      onChange={(e) => agir(() => changerNiveauMembreAction(m.id, e.target.value))}
                      aria-label={`Niveau d'accès de ${m.nom}`}
                      className="rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs"
                    >
                      {NIVEAUX_ACCES.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {m.desactive ? (
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() => agir(() => reactiverMembreAction(m.id))}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      Rétablir l&apos;accès
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() =>
                        agir(
                          () => desactiverMembreAction(m.id),
                          `Retirer l'accès de ${m.nom} ? Ses sessions seront fermées immédiatement ; son nom restera sur l'historique.`
                        )
                      }
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-accent"
                    >
                      Retirer l&apos;accès
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {invitations.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold">Invitations en attente</div>
          <ul className="space-y-1.5">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs">
                <span className="min-w-0 truncate">
                  {inv.email} · {libelleNiveau(inv.niveau)} · jusqu&apos;au{" "}
                  {new Date(inv.expireLe).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}
                </span>
                <span className="flex gap-2">
                  <button type="button" disabled={enCours} onClick={() => agir(() => renvoyerInvitationAction(inv.id))} className="font-semibold underline">
                    Renvoyer
                  </button>
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => agir(() => annulerInvitationAction(inv.id), `Annuler l'invitation de ${inv.email} ?`)}
                    className="font-semibold text-accent underline"
                  >
                    Annuler
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {etatInvitation?.ok && !formulaireOuvert && (
        <div className="rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-dark">
          Invitation envoyée. Votre collègue a 7 jours pour l&apos;accepter.
        </div>
      )}
      {formulaireOuvert ? (
        <form action={actionInviter} className="space-y-2 rounded-xl border border-border p-3">
          <input name="email" type="email" value={emailInvite} onChange={(e) => setEmailInvite(e.target.value)} required placeholder="Adresse e-mail du collègue" className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm" />
          <select name="niveau" value={niveauInvite} onChange={(e) => setNiveauInvite(e.target.value as NiveauAcces)} className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm">
            {NIVEAUX_ACCES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label} — {n.description}
              </option>
            ))}
          </select>
          {etatInvitation && !etatInvitation.ok && (
            <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{etatInvitation.error}</div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={invitationEnCours} className="flex-1 rounded-full bg-ink py-2.5 text-xs font-semibold text-white disabled:opacity-60">
              {invitationEnCours ? "Envoi…" : "Envoyer l'invitation"}
            </button>
            <button type="button" onClick={() => setOuvertAvec(undefined)} className="flex-1 rounded-full border border-border py-2.5 text-xs font-semibold">
              Fermer
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEmailInvite("");
            setOuvertAvec(etatInvitation);
          }}
          className="w-full rounded-full border border-dashed border-border py-2.5 text-sm font-semibold"
        >
          + Inviter un collègue
        </button>
      )}
    </div>
  );
}
