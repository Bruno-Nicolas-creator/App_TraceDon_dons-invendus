"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { inscriptionAction, rechercherOrganismeAction } from "./actions";
import type { SuggestionOrganisme } from "@/lib/rechercheEntreprises";

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

  const [nomOrganisme, setNomOrganisme] = useState("");
  const [siret, setSiret] = useState("");
  const [formeJuridique, setFormeJuridique] = useState("");
  const [rna, setRna] = useState("");
  const [adresse, setAdresse] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionOrganisme[]>([]);
  const [suggestionsVisibles, setSuggestionsVisibles] = useState(false);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const requeteEnCours = useRef(0);

  useEffect(() => {
    const id = ++requeteEnCours.current;
    const delai = setTimeout(() => {
      if (nomOrganisme.trim().length < 3) {
        if (requeteEnCours.current === id) setSuggestions([]);
        return;
      }
      setRechercheEnCours(true);
      rechercherOrganismeAction(nomOrganisme, type).then((resultats) => {
        if (requeteEnCours.current === id) {
          setSuggestions(resultats);
          setRechercheEnCours(false);
        }
      });
    }, 300);
    return () => clearTimeout(delai);
  }, [nomOrganisme, type]);

  const choisirSuggestion = (s: SuggestionOrganisme) => {
    setNomOrganisme(s.nom);
    setAdresse(s.adresse);
    if (type === "ENTREPRISE") {
      setSiret(s.siret ?? "");
      setFormeJuridique(s.formeJuridique ?? "");
    } else {
      setRna(s.rna ?? "");
    }
    setSuggestions([]);
    setSuggestionsVisibles(false);
  };

  const changerType = (nouveauType: TypeCompte) => {
    setType(nouveauType);
    setNomOrganisme("");
    setSiret("");
    setFormeJuridique("");
    setRna("");
    setAdresse("");
    setSuggestions([]);
  };

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
            onClick={() => changerType("ENTREPRISE")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              type === "ENTREPRISE" ? "bg-brand text-white" : "text-ink-muted"
            }`}
          >
            Entreprise
          </button>
          <button
            type="button"
            onClick={() => changerType("ASSOCIATION")}
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
          <div key="entreprise" className="space-y-4">
            <div className="relative">
              <Champ
                id="raisonSociale"
                name="raisonSociale"
                label="Raison sociale"
                placeholder="Ex. Carrefour City Bastille"
                required
                value={nomOrganisme}
                onChange={(v) => setNomOrganisme(v)}
                onFocus={() => setSuggestionsVisibles(true)}
                onBlur={() => setTimeout(() => setSuggestionsVisibles(false), 150)}
                autoComplete="off"
              />
              <SuggestionsDropdown
                visible={suggestionsVisibles}
                enCours={rechercheEnCours}
                suggestions={suggestions}
                onChoisir={choisirSuggestion}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Champ id="siret" name="siret" label="SIRET" placeholder="14 chiffres" required value={siret} onChange={setSiret} />
              <Champ
                id="formeJuridique"
                name="formeJuridique"
                label="Forme juridique"
                placeholder="Ex. SAS"
                value={formeJuridique}
                onChange={setFormeJuridique}
              />
            </div>
            <Champ
              id="adresse"
              name="adresse"
              label="Adresse"
              placeholder="12 rue de la Roquette, 75011 Paris"
              required
              value={adresse}
              onChange={setAdresse}
            />
            <Champ id="secteurActivite" name="secteurActivite" label="Secteur d'activité" placeholder="Ex. Commerce de détail alimentaire" />
          </div>
        ) : (
          <div key="association" className="space-y-4">
            <div className="relative">
              <Champ
                id="denomination"
                name="denomination"
                label="Dénomination"
                placeholder="Ex. Coeur Partage"
                required
                value={nomOrganisme}
                onChange={(v) => setNomOrganisme(v)}
                onFocus={() => setSuggestionsVisibles(true)}
                onBlur={() => setTimeout(() => setSuggestionsVisibles(false), 150)}
                autoComplete="off"
              />
              <SuggestionsDropdown
                visible={suggestionsVisibles}
                enCours={rechercheEnCours}
                suggestions={suggestions}
                onChoisir={choisirSuggestion}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Champ id="rna" name="rna" label="N° RNA / agrément" placeholder="W751234567" required value={rna} onChange={setRna} />
              <Champ id="categorieEligibilite" name="categorieEligibilite" label="Catégorie d'éligibilité" placeholder="Aide alimentaire" />
            </div>
            <Champ
              id="adresse"
              name="adresse"
              label="Adresse"
              placeholder="8 rue de Charonne, 75011 Paris"
              required
              value={adresse}
              onChange={setAdresse}
            />
            <label htmlFor="declarationInteretGeneral" className="flex items-start gap-2.5 text-xs text-ink-muted">
              <input id="declarationInteretGeneral" name="declarationInteretGeneral" type="checkbox" className="mt-0.5" />
              Nous déclarons agir en tant qu&apos;organisme d&apos;intérêt général (déclaration auto-déclarative ; un
              justificatif de rescrit fiscal pourra être ajouté ensuite).
            </label>
          </div>
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
  value,
  onChange,
  onFocus,
  onBlur,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (valeur: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
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
        defaultValue={onChange ? undefined : defaultValue}
        value={onChange ? value : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
      />
    </div>
  );
}

function SuggestionsDropdown({
  visible,
  enCours,
  suggestions,
  onChoisir,
}: {
  visible: boolean;
  enCours: boolean;
  suggestions: SuggestionOrganisme[];
  onChoisir: (s: SuggestionOrganisme) => void;
}) {
  if (!visible || (!enCours && suggestions.length === 0)) return null;

  return (
    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
      {enCours && suggestions.length === 0 ? (
        <li className="px-3 py-2 text-xs text-ink-muted">Recherche…</li>
      ) : (
        suggestions.map((s, i) => (
          <li key={`${s.siret ?? s.rna ?? s.nom}-${i}`}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChoisir(s)}
              className="block w-full px-3 py-2 text-left text-xs hover:bg-surface-alt"
            >
              <span className="block font-semibold text-ink">{s.nom}</span>
              <span className="block text-ink-muted">{s.adresse}</span>
            </button>
          </li>
        ))
      )}
    </ul>
  );
}
