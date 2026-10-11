"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { NATURES_ACTIVITE_ENTREPRISE } from "@/lib/activiteEntreprise";
import { demanderChangementEmailAction, modifierInformationsOrganisationAction, modifierNomAction } from "./actions";

export type OrganisationModifiable =
  | {
      type: "ENTREPRISE";
      nom: string;
      identifiant: string;
      adresse: string;
      formeJuridique: string;
      secteurActivite: string;
      natureActivite: string;
    }
  | { type: "ASSOCIATION"; nom: string; identifiant: string; adresse: string; categorieEligibilite: string; categoriesDon: string };

const champ = "w-full rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm";
const libelle = "mb-1 block text-xs font-medium text-ink-muted";

function Message({ etat, succes }: { etat: { ok: boolean; error?: string } | null; succes: string }) {
  if (!etat) return null;
  return etat.ok ? (
    <div className="rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-dark">{succes}</div>
  ) : (
    <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{etat.error}</div>
  );
}

function MonCompte({ nom, email }: { nom: string; email: string }) {
  const [etatNom, actionNom, nomEnCours] = useActionState(modifierNomAction, null);
  const [etatEmail, actionEmail, emailEnCours] = useActionState(demanderChangementEmailAction, null);
  const [changerEmail, setChangerEmail] = useState(false);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Mon compte</h2>
      <form action={actionNom} className="space-y-2">
        <label className={libelle} htmlFor="nom-compte">
          Votre nom
        </label>
        <div className="flex gap-2">
          <input id="nom-compte" name="nom" defaultValue={nom} required maxLength={100} className={champ} />
          <button type="submit" disabled={nomEnCours} className="shrink-0 rounded-full bg-ink px-4 text-xs font-semibold text-white disabled:opacity-60">
            Enregistrer
          </button>
        </div>
        <Message etat={etatNom} succes="Nom enregistré." />
      </form>

      <div className="space-y-2">
        <div className={libelle}>Adresse e-mail de connexion</div>
        <div className="text-sm font-semibold break-all">{email}</div>
        {etatEmail?.ok ? (
          <div className="rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-dark">
            Un lien de confirmation vient d&apos;être envoyé à la nouvelle adresse (valable 1 heure). Votre adresse ne changera
            qu&apos;une fois ce lien ouvert et confirmé.
          </div>
        ) : changerEmail ? (
          <form action={actionEmail} className="space-y-2 rounded-xl border border-border p-3">
            <input name="nouvelEmail" type="email" required autoComplete="email" placeholder="Nouvelle adresse e-mail" className={champ} />
            <input name="motDePasse" type="password" required autoComplete="current-password" placeholder="Votre mot de passe actuel" className={champ} />
            <Message etat={etatEmail} succes="" />
            <div className="flex gap-2">
              <button type="submit" disabled={emailEnCours} className="flex-1 rounded-full bg-ink py-2.5 text-xs font-semibold text-white disabled:opacity-60">
                {emailEnCours ? "Envoi…" : "Recevoir le lien de confirmation"}
              </button>
              <button type="button" onClick={() => setChangerEmail(false)} className="flex-1 rounded-full border border-border py-2.5 text-xs font-semibold">
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setChangerEmail(true)} className="text-xs font-semibold underline">
            Changer d&apos;adresse e-mail
          </button>
        )}
      </div>
    </div>
  );
}

function Organisation({ organisation, peutModifier }: { organisation: OrganisationModifiable; peutModifier: boolean }) {
  const [etat, formAction, enCours] = useActionState(modifierInformationsOrganisationAction, null);
  // Formulaire ouvert tant qu'aucun enregistrement n'a réussi depuis l'ouverture (une erreur le laisse ouvert).
  const [ouvertAvec, setOuvertAvec] = useState<typeof etat | undefined>(undefined);
  const edition = ouvertAvec !== undefined && (etat === ouvertAvec || !etat?.ok);
  const setEdition = (ouvrir: boolean) => setOuvertAvec(ouvrir ? etat : undefined);
  const entreprise = organisation.type === "ENTREPRISE";
  const natureLibelle = entreprise
    ? NATURES_ACTIVITE_ENTREPRISE.find((n) => n.id === organisation.natureActivite)?.label ?? organisation.natureActivite
    : "";

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Informations de l&apos;organisation</h2>
        {!edition && peutModifier && (
          <button type="button" onClick={() => setEdition(true)} className="text-xs font-semibold underline">
            Modifier
          </button>
        )}
      </div>
      <div className="space-y-0.5 text-sm">
        <div className="font-semibold">{organisation.nom}</div>
        <div className="text-xs text-ink-muted">
          {entreprise ? "SIRET" : "RNA"} : {organisation.identifiant}
        </div>
        <p className="pt-1 text-[11px] text-ink-muted">
          Le nom et le {entreprise ? "SIRET" : "RNA"} ne se modifient pas ici : pour les corriger, écrivez au coordinateur depuis{" "}
          <Link href="/messages" className="underline">
            Messages
          </Link>
          .
        </p>
      </div>

      {etat?.ok && !edition && <Message etat={etat} succes="Informations enregistrées." />}

      {edition ? (
        <form action={formAction} className="space-y-2.5">
          <div>
            <label className={libelle} htmlFor="org-adresse">
              Adresse
            </label>
            <input id="org-adresse" name="adresse" defaultValue={organisation.adresse} required maxLength={300} className={champ} />
            <p className="mt-1 text-[11px] text-ink-muted">
              La position sur la carte sera recalculée. Les documents déjà établis afficheront la nouvelle adresse s&apos;ils sont
              téléchargés à nouveau.
            </p>
          </div>
          {organisation.type === "ENTREPRISE" ? (
            <>
              <div>
                <label className={libelle} htmlFor="org-forme">
                  Forme juridique
                </label>
                <input id="org-forme" name="formeJuridique" defaultValue={organisation.formeJuridique} maxLength={200} className={champ} />
              </div>
              <div>
                <label className={libelle} htmlFor="org-secteur">
                  Secteur d&apos;activité
                </label>
                <input id="org-secteur" name="secteurActivite" defaultValue={organisation.secteurActivite} maxLength={200} className={champ} />
              </div>
              <fieldset>
                <legend className={libelle}>Nature des dons</legend>
                <div className="space-y-1.5">
                  {NATURES_ACTIVITE_ENTREPRISE.map((n) => (
                    <label key={n.id} className="flex items-center gap-2 text-sm">
                      <input type="radio" name="natureActivite" value={n.id} defaultChecked={organisation.natureActivite === n.id} required />
                      {n.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <div>
                <label className={libelle} htmlFor="org-eligibilite">
                  Catégorie d&apos;éligibilité
                </label>
                <input id="org-eligibilite" name="categorieEligibilite" defaultValue={organisation.categorieEligibilite} maxLength={200} className={champ} />
              </div>
              <div>
                <label className={libelle} htmlFor="org-categories">
                  Catégories de dons proposées (séparées par des virgules)
                </label>
                <input id="org-categories" name="categoriesDon" defaultValue={organisation.categoriesDon} className={champ} />
              </div>
            </>
          )}
          <Message etat={etat && !etat.ok ? etat : null} succes="" />
          <div className="flex gap-2">
            <button type="submit" disabled={enCours} className="flex-1 rounded-full bg-ink py-2.5 text-xs font-semibold text-white disabled:opacity-60">
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setEdition(false)} className="flex-1 rounded-full border border-border py-2.5 text-xs font-semibold">
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <dl className="space-y-1 text-xs">
          <div>
            <dt className="inline text-ink-muted">Adresse : </dt>
            <dd className="inline">{organisation.adresse}</dd>
          </div>
          {organisation.type === "ENTREPRISE" ? (
            <>
              {organisation.formeJuridique && (
                <div>
                  <dt className="inline text-ink-muted">Forme juridique : </dt>
                  <dd className="inline">{organisation.formeJuridique}</dd>
                </div>
              )}
              {organisation.secteurActivite && (
                <div>
                  <dt className="inline text-ink-muted">Secteur : </dt>
                  <dd className="inline">{organisation.secteurActivite}</dd>
                </div>
              )}
              <div>
                <dt className="inline text-ink-muted">Nature des dons : </dt>
                <dd className="inline">{natureLibelle}</dd>
              </div>
            </>
          ) : (
            <>
              {organisation.categorieEligibilite && (
                <div>
                  <dt className="inline text-ink-muted">Catégorie d&apos;éligibilité : </dt>
                  <dd className="inline">{organisation.categorieEligibilite}</dd>
                </div>
              )}
              {organisation.categoriesDon && (
                <div>
                  <dt className="inline text-ink-muted">Catégories de dons : </dt>
                  <dd className="inline">{organisation.categoriesDon}</dd>
                </div>
              )}
            </>
          )}
        </dl>
      )}
    </div>
  );
}

export default function InformationsCompte({
  nom,
  email,
  organisation,
  peutModifierOrganisation,
}: {
  nom: string;
  email: string;
  organisation: OrganisationModifiable | null;
  peutModifierOrganisation: boolean;
}) {
  return (
    <>
      <MonCompte nom={nom} email={email} />
      {organisation && <Organisation organisation={organisation} peutModifier={peutModifierOrganisation} />}
    </>
  );
}
