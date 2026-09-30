"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { inscriptionAction, rechercherOrganismeAction, rechercherAdresseAction } from "./actions";
import type { SuggestionOrganisme } from "@/lib/rechercheEntreprises";
import type { SuggestionAdresse } from "@/lib/ignAdresse";
import PointsChargement from "@/components/PointsChargement";
import TogglePill from "@/components/TogglePill";
import InfoBulle from "@/components/InfoBulle";
import SubmitButton from "@/components/SubmitButton";
import SelecteurNatureActivite from "@/components/SelecteurNatureActivite";
import type { NatureActiviteEntrepriseId } from "@/lib/activiteEntreprise";

type TypeCompte = "ENTREPRISE" | "ASSOCIATION";

const MESSAGES_ERREUR: Record<string, string> = {
  email_pris: "Un compte existe déjà avec cet email.",
  mdp_court: "Le mot de passe doit contenir au moins 8 caractères.",
  mdp_different: "Les deux mots de passe ne correspondent pas.",
  champs_manquants: "Merci de renseigner tous les champs obligatoires (y compris les documents requis).",
  type_invalide: "Merci de choisir un type de compte.",
  fichier_trop_volumineux: "Un des documents dépasse la taille maximale autorisée (5 Mo).",
  fichier_type_invalide: "Un des documents n'est pas dans un format accepté (PDF, JPEG, PNG ou WebP).",
  champ_trop_long: "Un des champs dépasse la longueur maximale autorisée.",
  siret_invalide: "Le SIRET doit contenir exactement 14 chiffres.",
  rna_invalide: "Le numéro RNA doit être au format W suivi de 9 chiffres (ex. W751234567).",
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
  const [rescritDemande, setRescritDemande] = useState(false);
  const [natureActivite, setNatureActivite] = useState<NatureActiviteEntrepriseId>("ALIMENTAIRE");

  const [nomOrganisme, setNomOrganisme] = useState("");
  const [siret, setSiret] = useState("");
  const [formeJuridique, setFormeJuridique] = useState("");
  const [rna, setRna] = useState("");
  const [adresse, setAdresse] = useState("");
  const [adresseLat, setAdresseLat] = useState<number | null>(null);
  const [adresseLng, setAdresseLng] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionOrganisme[]>([]);
  const [suggestionsVisibles, setSuggestionsVisibles] = useState(false);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const requeteEnCours = useRef(0);

  const [suggestionsAdresse, setSuggestionsAdresse] = useState<SuggestionAdresse[]>([]);
  const [suggestionsAdresseVisibles, setSuggestionsAdresseVisibles] = useState(false);
  const [rechercheAdresseEnCours, setRechercheAdresseEnCours] = useState(false);
  const requeteAdresseEnCours = useRef(0);

  useEffect(() => {
    const id = ++requeteAdresseEnCours.current;
    const delai = setTimeout(() => {
      if (adresse.trim().length < 3) {
        if (requeteAdresseEnCours.current === id) setSuggestionsAdresse([]);
        return;
      }
      setRechercheAdresseEnCours(true);
      rechercherAdresseAction(adresse).then((resultats) => {
        if (requeteAdresseEnCours.current === id) {
          setSuggestionsAdresse(resultats);
          setRechercheAdresseEnCours(false);
        }
      });
    }, 300);
    return () => clearTimeout(delai);
  }, [adresse]);

  const changerAdresse = (v: string) => {
    setAdresse(v);
    setAdresseLat(null);
    setAdresseLng(null);
  };

  const choisirSuggestionAdresse = (s: SuggestionAdresse) => {
    setAdresse(s.adresse);
    setAdresseLat(s.latitude);
    setAdresseLng(s.longitude);
    setSuggestionsAdresse([]);
    setSuggestionsAdresseVisibles(false);
  };

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
    setAdresseLat(null);
    setAdresseLng(null);
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
    setAdresseLat(null);
    setAdresseLng(null);
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
        <TogglePill
          valeur={type}
          onChange={changerType}
          options={[
            { valeur: "ENTREPRISE", label: "Entreprise" },
            { valeur: "ASSOCIATION", label: "Association" },
          ]}
        />
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
            <div className="relative">
              <Champ
                id="adresse"
                name="adresse"
                label="Adresse"
                placeholder="12 rue de la Roquette, 75011 Paris"
                required
                value={adresse}
                onChange={changerAdresse}
                onFocus={() => setSuggestionsAdresseVisibles(true)}
                onBlur={() => setTimeout(() => setSuggestionsAdresseVisibles(false), 150)}
                autoComplete="off"
              />
              <SuggestionsAdresseDropdown
                visible={suggestionsAdresseVisibles}
                enCours={rechercheAdresseEnCours}
                suggestions={suggestionsAdresse}
                onChoisir={choisirSuggestionAdresse}
              />
            </div>
            <input type="hidden" name="adresseLatitude" value={adresseLat ?? ""} />
            <input type="hidden" name="adresseLongitude" value={adresseLng ?? ""} />
            <Champ id="secteurActivite" name="secteurActivite" label="Secteur d'activité" placeholder="Ex. Commerce de détail alimentaire" />
            <SelecteurNatureActivite name="natureActivite" valeur={natureActivite} onChange={setNatureActivite} />
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
              id="categoriesDon"
              name="categoriesDon"
              label="Catégories de dons proposées"
              placeholder="Ex. Fruits, légumes, conserves, boissons"
            />
            <div className="relative">
              <Champ
                id="adresse"
                name="adresse"
                label="Adresse"
                placeholder="8 rue de Charonne, 75011 Paris"
                required
                value={adresse}
                onChange={changerAdresse}
                onFocus={() => setSuggestionsAdresseVisibles(true)}
                onBlur={() => setTimeout(() => setSuggestionsAdresseVisibles(false), 150)}
                autoComplete="off"
              />
              <SuggestionsAdresseDropdown
                visible={suggestionsAdresseVisibles}
                enCours={rechercheAdresseEnCours}
                suggestions={suggestionsAdresse}
                onChoisir={choisirSuggestionAdresse}
              />
            </div>
            <input type="hidden" name="adresseLatitude" value={adresseLat ?? ""} />
            <input type="hidden" name="adresseLongitude" value={adresseLng ?? ""} />
            <label htmlFor="declarationInteretGeneral" className="flex items-start gap-2.5 text-xs text-ink-muted">
              <input id="declarationInteretGeneral" name="declarationInteretGeneral" type="checkbox" className="mt-0.5" />
              Nous déclarons agir en tant qu&apos;organisme d&apos;intérêt général (déclaration auto-déclarative).
            </label>

            <div className="space-y-3 rounded-xl border border-dashed border-border p-3.5">
              <FichierRequis
                id="recepisseRna"
                name="recepisseRna"
                label="Récépissé RNA"
                aide="Le récépissé remis par la préfecture lors de la déclaration de votre association, avec son numéro RNA. Obligatoire pour créer votre profil."
                required
              />
              <FichierRequis
                id="statutsSignes"
                name="statutsSignes"
                label="Statuts de l'association (signés)"
                aide="Les statuts signés définissant l'objet et le fonctionnement de votre association. Obligatoires pour créer votre profil."
                required
              />

              <label htmlFor="rescritDemande" className="flex items-start gap-2.5 text-xs text-ink-muted">
                <input
                  id="rescritDemande"
                  name="rescritDemande"
                  type="checkbox"
                  className="mt-0.5"
                  checked={rescritDemande}
                  onChange={(e) => setRescritDemande(e.target.checked)}
                />
                Nous avons déjà déposé une demande de rescrit fiscal auprès de l&apos;administration.
              </label>
              {rescritDemande && (
                <FichierRequis
                  id="preuveRescritFiscal"
                  name="preuveRescritFiscal"
                  label="Preuve de dépôt du rescrit"
                  aide="L'accusé de dépôt ou la réponse de l'administration à votre demande de rescrit mécénat."
                  required
                />
              )}
            </div>
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

      <SubmitButton
        pendingText="Création du compte…"
        className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        Créer mon compte
      </SubmitButton>

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

function FichierRequis({
  id,
  name,
  label,
  aide,
  required,
}: {
  id: string;
  name: string;
  label: string;
  aide: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-center gap-1.5 text-xs text-ink-muted">
        {label}
        {required && " *"}
        <InfoBulle texte={aide} />
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept="application/pdf,image/*"
        required={required}
        className="w-full text-xs text-ink-muted file:mr-2 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
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
    <ul className="animate-fade-slide-in absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
      {enCours && suggestions.length === 0 ? (
        <li className="flex items-center gap-2 px-3 py-2 text-xs text-ink-muted">
          Recherche <PointsChargement />
        </li>
      ) : (
        suggestions.map((s, i) => (
          <li key={`${s.siret ?? s.rna ?? s.nom}-${i}`}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChoisir(s)}
              className="block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface-alt active:bg-surface-alt"
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

function SuggestionsAdresseDropdown({
  visible,
  enCours,
  suggestions,
  onChoisir,
}: {
  visible: boolean;
  enCours: boolean;
  suggestions: SuggestionAdresse[];
  onChoisir: (s: SuggestionAdresse) => void;
}) {
  if (!visible || (!enCours && suggestions.length === 0)) return null;

  return (
    <ul className="animate-fade-slide-in absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
      {enCours && suggestions.length === 0 ? (
        <li className="flex items-center gap-2 px-3 py-2 text-xs text-ink-muted">
          Recherche <PointsChargement />
        </li>
      ) : (
        suggestions.map((s, i) => (
          <li key={`${s.adresse}-${i}`}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChoisir(s)}
              className="block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface-alt active:bg-surface-alt"
            >
              {s.adresse}
            </button>
          </li>
        ))
      )}
    </ul>
  );
}
