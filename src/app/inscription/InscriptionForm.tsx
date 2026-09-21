"use client";

import { useState } from "react";
import Link from "next/link";
import { inscriptionAction } from "./actions";

type TypeCompte = "ENTREPRISE" | "ASSOCIATION";

const MESSAGES_ERREUR: Record<string, string> = {
  email_pris: "Un compte existe déjà avec cet email.",
  mdp_court: "Le mot de passe doit contenir au moins 8 caractères.",
  mdp_different: "Les deux mots de passe ne correspondent pas.",
  champs_manquants: "Merci de renseigner tous les champs obligatoires.",
  type_invalide: "Merci de choisir un type de compte.",
};

export default function InscriptionForm({
  erreur,
  emailPrecedent,
  typePrecedent,
}: {
  erreur?: string;
  emailPrecedent?: string;
  typePrecedent?: string;
}) {
  const [type, setType] = useState<TypeCompte>(typePrecedent === "ASSOCIATION" ? "ASSOCIATION" : "ENTREPRISE");

  return (
    <form action={inscriptionAction} className="space-y-5 rounded-2xl border border-border bg-surface p-6">
      {erreur && (
        <div className="rounded-lg bg-accent-tint px-3 py-2 text-sm text-accent">
          {MESSAGES_ERREUR[erreur] ?? "Une erreur est survenue, réessaie."}
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink-muted">Type de compte</span>
        <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
          <button
            type="button"
            onClick={() => setType("ENTREPRISE")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              type === "ENTREPRISE" ? "bg-brand text-white" : "text-ink-muted"
            }`}
          >
            Entreprise
          </button>
          <button
            type="button"
            onClick={() => setType("ASSOCIATION")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              type === "ASSOCIATION" ? "bg-brand text-white" : "text-ink-muted"
            }`}
          >
            Association
          </button>
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <h2 className="text-xs font-semibold uppercase text-ink-muted">
          {type === "ENTREPRISE" ? "Votre établissement" : "Votre association"}
        </h2>

        {type === "ENTREPRISE" ? (
          <>
            <Champ id="raisonSociale" name="raisonSociale" label="Raison sociale" placeholder="Ex. Carrefour City Bastille" required />
            <div className="grid grid-cols-2 gap-3">
              <Champ id="siret" name="siret" label="SIRET" placeholder="14 chiffres" required />
              <Champ id="formeJuridique" name="formeJuridique" label="Forme juridique" placeholder="Ex. SAS" />
            </div>
            <Champ id="adresse" name="adresse" label="Adresse" placeholder="12 rue de la Roquette, 75011 Paris" required />
            <Champ id="secteurActivite" name="secteurActivite" label="Secteur d'activité" placeholder="Ex. Commerce de détail alimentaire" />
          </>
        ) : (
          <>
            <Champ id="denomination" name="denomination" label="Dénomination" placeholder="Ex. Coeur Partage" required />
            <div className="grid grid-cols-2 gap-3">
              <Champ id="rna" name="rna" label="N° RNA / agrément" placeholder="W751234567" required />
              <Champ id="categorieEligibilite" name="categorieEligibilite" label="Catégorie d'éligibilité" placeholder="Aide alimentaire" />
            </div>
            <Champ id="adresse" name="adresse" label="Adresse" placeholder="8 rue de Charonne, 75011 Paris" required />
            <label htmlFor="declarationInteretGeneral" className="flex items-start gap-2.5 text-xs text-ink-muted">
              <input id="declarationInteretGeneral" name="declarationInteretGeneral" type="checkbox" className="mt-0.5" />
              Nous déclarons agir en tant qu&apos;organisme d&apos;intérêt général (déclaration auto-déclarative ; un
              justificatif de rescrit fiscal pourra être ajouté ensuite).
            </label>
          </>
        )}
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <h2 className="text-xs font-semibold uppercase text-ink-muted">Votre accès</h2>
        <Champ id="nomContact" name="nomContact" label="Votre nom" placeholder="Ex. Cécile Dubois" required />
        <Champ id="email" name="email" label="Email" type="email" autoComplete="email" defaultValue={emailPrecedent} required />
        <div className="grid grid-cols-2 gap-3">
          <Champ id="motDePasse" name="motDePasse" label="Mot de passe" type="password" autoComplete="new-password" required />
          <Champ
            id="motDePasseConfirmation"
            name="motDePasseConfirmation"
            label="Confirmer"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <button type="submit" className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white">
        Créer mon compte
      </button>

      <p className="text-center text-xs text-ink-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-ink underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

function Champ({
  id,
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  required,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-ink-muted">
        {label}
        {required && " *"}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
      />
    </div>
  );
}
