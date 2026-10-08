import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BottomTabBar from "@/components/BottomTabBar";
import CompteurAnime from "@/components/CompteurAnime";
import LienTelephone from "@/components/LienTelephone";
import { calculerImpactCarboneDetaille } from "@/lib/impactCo2";
import { poidsTotalArticles } from "@/lib/donDivisible";
import { associationHabilitee, estGrandeSurface, SEUIL_GRANDE_SURFACE_M2 } from "@/lib/conformite";
import { formaterDateConges, periodeCongesActive } from "@/lib/conges";
import { compterMessagesNonLus } from "@/lib/messagerie";
import { TYPES_ACTIVITE } from "@/lib/activiteAssociation";
import { LABEL_ROLE_BENEVOLE, type RoleBenevole } from "@/lib/benevoles";
import SelecteurDisponibilites from "@/components/SelecteurDisponibilites";
import ActiverNotificationsPush from "@/components/ActiverNotificationsPush";
import { ChoixMesureAudience } from "@/components/BandeauMesureAudience";
import { isPushConfigure } from "@/lib/webPush";
import CoffreFort, { type ConventionSignee, type DocumentExistant } from "./CoffreFort";
import {
  ajouterBenevoleAction,
  ajouterPeriodeCongesAction,
  basculerAssuranceRcBenevoleAction,
  basculerMandatBenevoleAction,
  deconnexionAction,
  definirCapaciteAction,
  definirConformiteAssociationAction,
  definirContactRappelAction,
  definirPreferenceAlerteAction,
  definirPresentationAction,
  definirReferentDonAction,
  definirSurfaceVenteAction,
  retirerBenevoleAction,
  retirerPeriodeCongesAction,
} from "./actions";

const LABEL_ROLE: Record<string, string> = {
  ENTREPRISE: "Entreprise donatrice",
  ASSOCIATION: "Association bénéficiaire",
  COORDINATEUR: "Coordinateur plateforme",
};

export default async function ProfilPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const nonLusMessages = await compterMessagesNonLus(session);

  let organisation: string | null = null;
  let rescritNonDepose = false;
  let referentDonNom = "";
  let referentDonTelephone = "";
  let benevoles: {
    id: string;
    nom: string;
    telephone: string | null;
    role: RoleBenevole;
    assuranceRcAttestee: boolean;
    mandatDonneLe: Date | null;
  }[] = [];
  let surfaceVenteM2: number | null = null;
  let habilitationStatut = "NON_HABILITEE";
  let habilitationDateFin: Date | null = null;
  let declarationDdpp = false;
  let declarationDdppDate: Date | null = null;
  let documents: DocumentExistant[] = [];
  let conventionsSignees: ConventionSignee[] = [];
  let periodesConges: { id: string; debut: Date; fin: Date; motif: string | null }[] = [];
  let disponibilitesRetrait: string[] = [];
  let typesActivite: string[] = [];
  let notreAction = "";
  let preferenceAlerte: "EMAIL" | "SMS" | "SMS_EMAIL" = "EMAIL";
  let telephoneAlerteSms = "";
  let contactRappelNom = "";
  let contactRappelTelephone = "";
  let contactRappelEmail = "";
  let capaciteAccueilKg: number | null = null;
  let nombreBeneficiaires: number | null = null;
  if (session.entrepriseId) {
    const entreprise = await prisma.entreprise.findUnique({
      where: { id: session.entrepriseId },
      include: {
        documents: true,
        conventions: { where: { statut: "SIGNEE" }, include: { association: true } },
        periodesConges: { orderBy: { debut: "asc" } },
      },
    });
    organisation = entreprise?.raisonSociale ?? null;
    referentDonNom = entreprise?.referentDonNom ?? "";
    referentDonTelephone = entreprise?.referentDonTelephone ?? "";
    surfaceVenteM2 = entreprise?.surfaceVenteM2 ?? null;
    documents = entreprise?.documents ?? [];
    conventionsSignees = (entreprise?.conventions ?? []).map((c) => ({
      id: c.id,
      autrePartieNom: c.association.denomination,
      signatureLe: c.signatureAssociationLe ?? c.signatureEntrepriseLe ?? c.createdAt,
    }));
    periodesConges = entreprise?.periodesConges ?? [];
  } else if (session.associationId) {
    const association = await prisma.association.findUnique({
      where: { id: session.associationId },
      include: {
        benevoles: { orderBy: { createdAt: "asc" } },
        documents: true,
        conventions: { where: { statut: "SIGNEE" }, include: { entreprise: true } },
        periodesConges: { orderBy: { debut: "asc" } },
      },
    });
    organisation = association?.denomination ?? null;
    rescritNonDepose = association?.rescritStatut === "NON_DEPOSE";
    referentDonNom = association?.referentDonNom ?? "";
    referentDonTelephone = association?.referentDonTelephone ?? "";
    benevoles = association?.benevoles ?? [];
    habilitationStatut = association?.habilitationStatut ?? "NON_HABILITEE";
    habilitationDateFin = association?.habilitationDateFin ?? null;
    declarationDdpp = association?.declarationDdpp ?? false;
    declarationDdppDate = association?.declarationDdppDate ?? null;
    documents = association?.documents ?? [];
    conventionsSignees = (association?.conventions ?? []).map((c) => ({
      id: c.id,
      autrePartieNom: c.entreprise.raisonSociale,
      signatureLe: c.signatureAssociationLe ?? c.signatureEntrepriseLe ?? c.createdAt,
    }));
    periodesConges = association?.periodesConges ?? [];
    disponibilitesRetrait = association?.disponibilitesRetrait ?? [];
    typesActivite = association?.typesActivite ?? [];
    notreAction = association?.notreAction ?? "";
    preferenceAlerte = association?.preferenceAlerte ?? "EMAIL";
    telephoneAlerteSms = association?.telephoneAlerteSms ?? "";
    contactRappelNom = association?.contactRappelNom ?? "";
    contactRappelTelephone = association?.contactRappelTelephone ?? "";
    contactRappelEmail = association?.contactRappelEmail ?? "";
    capaciteAccueilKg = association?.capaciteAccueilKg ?? null;
    nombreBeneficiaires = association?.nombreBeneficiaires ?? null;
  }

  const grandeSurface = estGrandeSurface(surfaceVenteM2);
  const habilitationManquante = session.role === "ASSOCIATION" && !associationHabilitee(habilitationStatut);
  const ddppNonDeclaree = session.role === "ASSOCIATION" && !declarationDdpp;
  const congesEnCours = periodeCongesActive(periodesConges);
  const dateInputValue = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "");

  let impactCumule: { co2EviteKg: number; equivalenceKm: number | null; poidsTotalKg: number } | null = null;
  if (session.role === "ENTREPRISE" && session.entrepriseId) {
    // Uniquement les dons alimentaires effectivement remis : le facteur CO2/kg ne s'applique
    // pas au matériel, et seuls les articles validés ont réellement été collectés.
    const articlesConfirmes = await prisma.article.findMany({
      where: {
        statut: "VALIDE",
        don: { entrepriseId: session.entrepriseId, type: { not: "MATERIEL" }, bonsEnlevement: { some: { confirme: true } } },
      },
      select: { poidsKg: true, categorie: true },
    });
    const poidsTotalKg = poidsTotalArticles(articlesConfirmes);
    const impact = poidsTotalKg > 0 ? await calculerImpactCarboneDetaille(articlesConfirmes) : null;
    if (impact) impactCumule = { ...impact, poidsTotalKg };
  }

  const carte = (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint font-display text-lg font-bold text-brand-dark">
          {session.nom.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="text-base font-semibold">{session.nom}</div>
          <div className="text-xs text-ink-muted">{LABEL_ROLE[session.role]}</div>
        </div>
      </div>
      {organisation && (
        <div className="rounded-xl bg-surface-alt px-4 py-3 text-sm">
          <div className="text-xs text-ink-muted">Organisation</div>
          <div className="font-semibold">{organisation}</div>
        </div>
      )}
      <form action={deconnexionAction}>
        <button
          type="submit"
          className="w-full rounded-full border border-border py-3 text-sm font-semibold text-accent transition-transform active:scale-[0.98]"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );

  if (session.role === "COORDINATEUR") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="font-display text-xl font-semibold">Mon profil</h1>
        {carte}
        {isPushConfigure() && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
          <ActiverNotificationsPush vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="px-5 pt-5 pb-3">
        <h1 className="font-display text-xl font-semibold">Mon profil</h1>
      </header>
      <main className="flex-1 space-y-4 px-5 pb-4">
        {carte}

        {isPushConfigure() && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
          <ActiverNotificationsPush vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        )}

        {impactCumule && (
          <div className="animate-fade-slide-in rounded-2xl bg-brand-tint p-4">
            <div className="mb-1 text-xs font-semibold uppercase text-brand-dark">Impact cumulé</div>
            <div className="mb-1 text-2xl font-bold text-brand-dark">
              <CompteurAnime valeur={impactCumule.co2EviteKg} suffixe=" kg de CO2 évités" duree={1000} />{" "}
              <span className="animate-pop-rebond">🌱</span>
            </div>
            <p className="text-xs leading-relaxed text-brand-dark">
              Grâce à <CompteurAnime valeur={impactCumule.poidsTotalKg} suffixe=" kg" duree={1000} /> de dons non
              jetés
              {impactCumule.equivalenceKm != null && (
                <>
                  {" "}
                  — soit l&apos;équivalent de{" "}
                  <span className="font-semibold">
                    <CompteurAnime valeur={impactCumule.equivalenceKm} suffixe=" km" duree={1000} />
                  </span>{" "}
                  en voiture 🚗
                </>
              )}
              .
            </p>
          </div>
        )}

        {session.role === "ASSOCIATION" && (
          <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4">
            <div>
              <h2 className="text-sm font-semibold">Notre association</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Ces informations sont visibles par les entreprises donatrices.
              </p>
            </div>
            <form action={definirPresentationAction} className="space-y-3">
              <div>
                <span className="mb-1.5 block text-xs text-ink-muted">Type d&apos;activité</span>
                <div className="flex flex-wrap gap-2">
                  {TYPES_ACTIVITE.map((t) => (
                    <label key={t.id} className="cursor-pointer">
                      <input
                        type="checkbox"
                        name="typesActivite"
                        value={t.id}
                        defaultChecked={typesActivite.includes(t.id)}
                        className="peer hidden"
                      />
                      <span className="block rounded-full border border-border bg-surface-alt px-3 py-2 text-xs font-semibold text-ink-muted transition-colors peer-checked:border-brand peer-checked:bg-brand-tint peer-checked:text-brand-dark">
                        {t.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="notreAction" className="mb-1.5 block text-xs text-ink-muted">
                  Notre action
                </label>
                <textarea
                  id="notreAction"
                  name="notreAction"
                  defaultValue={notreAction}
                  rows={4}
                  maxLength={2000}
                  placeholder="Présentez votre association aux entreprises donatrices : votre activité, votre public, votre fonctionnement…"
                  className="w-full resize-none rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Enregistrer
              </button>
            </form>
          </div>
        )}

        <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div>
            <h2 className="text-sm font-semibold">Référent don</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              La personne à contacter pour organiser les enlèvements.
            </p>
          </div>
          <form action={definirReferentDonAction} className="space-y-2.5">
            <input
              type="text"
              name="referentDonNom"
              defaultValue={referentDonNom}
              placeholder="Nom du référent"
              className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
            />
            <input
              type="tel"
              name="referentDonTelephone"
              defaultValue={referentDonTelephone}
              placeholder="Téléphone"
              className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              Enregistrer
            </button>
          </form>
        </div>

        {session.role === "ASSOCIATION" && <SelecteurDisponibilites disponibilitesInitiales={disponibilitesRetrait} />}

        {congesEnCours && (
          <div className="animate-fade-slide-in flex gap-3 rounded-2xl bg-accent-tint p-4">
            <span aria-hidden="true" className="text-lg leading-none">🌴</span>
            <p className="text-xs leading-relaxed text-ink">
              <span className="font-semibold text-accent">Vous êtes actuellement en congés</span> jusqu&apos;au{" "}
              {formaterDateConges(congesEnCours.fin)}.{" "}
              {session.role === "ENTREPRISE"
                ? "Vos dons en cours ont été annulés et vous ne pouvez pas en publier de nouveaux pendant cette période."
                : "Vous ne pouvez pas vous positionner sur des dons ni valider d'articles pendant cette période."}
            </p>
          </div>
        )}

        <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div>
            <h2 className="text-sm font-semibold">Congés / Fermeture</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Visible par vos partenaires. Pendant ces périodes,{" "}
              {session.role === "ENTREPRISE"
                ? "vos dons en cours sont annulés et vous ne pouvez pas en publier de nouveaux."
                : "vous ne pouvez ni vous positionner sur un don ni valider d'articles."}
            </p>
          </div>

          {periodesConges.length > 0 && (
            <ul className="space-y-1.5">
              {periodesConges.map((periode) => (
                <li
                  key={periode.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-surface-alt px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      Du {formaterDateConges(periode.debut)} au {formaterDateConges(periode.fin)}
                    </div>
                    {periode.motif && <div className="text-xs text-ink-muted">{periode.motif}</div>}
                  </div>
                  <form action={retirerPeriodeCongesAction.bind(null, periode.id)}>
                    <button
                      type="submit"
                      aria-label="Retirer cette période"
                      className="text-ink-muted/70 transition-transform active:scale-90"
                    >
                      &times;
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={ajouterPeriodeCongesAction} className="space-y-2.5">
            <div className="flex gap-2.5">
              <input
                type="date"
                name="congesDebut"
                required
                aria-label="Date de début"
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
              <input
                type="date"
                name="congesFin"
                required
                aria-label="Date de fin"
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
            </div>
            <input
              type="text"
              name="congesMotif"
              placeholder="Motif (optionnel)"
              maxLength={200}
              className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-full border border-border py-2.5 text-sm font-semibold transition-transform active:scale-[0.98]"
            >
              + Déclarer une période de congés
            </button>
          </form>
        </div>

        {session.role === "ASSOCIATION" && (
          <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4">
            <div>
              <h2 className="text-sm font-semibold">Préférences d&apos;alerte</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Comment souhaitez-vous être prévenu(e) des nouveaux dons disponibles ?
              </p>
            </div>
            <form action={definirPreferenceAlerteAction} className="space-y-2.5">
              <select
                name="preferenceAlerte"
                defaultValue={preferenceAlerte}
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              >
                <option value="EMAIL">Email uniquement</option>
                <option value="SMS">SMS uniquement</option>
                <option value="SMS_EMAIL">SMS et email</option>
              </select>
              <input
                type="tel"
                name="telephoneAlerteSms"
                defaultValue={telephoneAlerteSms}
                placeholder="Numéro pour réception SMS"
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Enregistrer
              </button>
            </form>
          </div>
        )}

        {session.role === "ASSOCIATION" && (
          <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: "140ms" }}>
            <div>
              <h2 className="text-sm font-semibold">Capacité d&apos;accueil</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                En complément de votre attestation chaîne du froid ci-dessous : indiquez la quantité maximale que
                vous pouvez gérer par collecte. Ce n&apos;est jamais vérifié — juste un repère pour vous avertir
                avant de vous positionner sur un don qui dépasserait cette quantité (vous pourrez toujours passer
                outre). Le nombre de bénéficiaires est visible par les entreprises donatrices pour les aider à
                choisir leurs partenaires.
              </p>
            </div>
            <form action={definirCapaciteAction} className="space-y-2.5">
              <label className="block text-xs text-ink-muted">
                Quantité maximale par collecte (kg) — optionnel
                <input
                  type="text"
                  inputMode="decimal"
                  name="capaciteAccueilKg"
                  defaultValue={capaciteAccueilKg ?? ""}
                  placeholder="Ex. 30"
                  className="mt-1 w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
                />
              </label>
              <label className="block text-xs text-ink-muted">
                Nombre de bénéficiaires servis — optionnel
                <input
                  type="text"
                  inputMode="numeric"
                  name="nombreBeneficiaires"
                  defaultValue={nombreBeneficiaires ?? ""}
                  placeholder="Ex. 150"
                  className="mt-1 w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Enregistrer
              </button>
            </form>
          </div>
        )}

        <CoffreFort role={session.role === "ENTREPRISE" ? "ENTREPRISE" : "ASSOCIATION"} documents={documents} conventionsSignees={conventionsSignees} />

        {session.role === "ENTREPRISE" && (
          <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: "50ms" }}>
            <div>
              <h2 className="text-sm font-semibold">Surface de vente</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Détermine si vous êtes soumis à l&apos;obligation légale de don (loi Garot, au-delà de{" "}
                {SEUIL_GRANDE_SURFACE_M2} m²).
              </p>
            </div>
            <form action={definirSurfaceVenteAction} className="flex gap-2.5">
              <input
                type="number"
                name="surfaceVenteM2"
                min="0"
                step="1"
                defaultValue={surfaceVenteM2 ?? ""}
                placeholder="Surface en m²"
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Enregistrer
              </button>
            </form>
          </div>
        )}

        {session.role === "ENTREPRISE" && grandeSurface && (
          <div className="animate-fade-slide-in flex gap-3 rounded-2xl bg-accent-tint p-4" style={{ animationDelay: "75ms" }}>
            <span aria-hidden="true" className="text-lg leading-none">⚠️</span>
            <p className="text-xs leading-relaxed text-ink">
              <span className="font-semibold text-accent">Surface &gt; {SEUIL_GRANDE_SURFACE_M2} m² : obligation légale de don.</span>{" "}
              La loi Garot (art. L. 541-15-5 du code de l&apos;environnement, décret n° 2016-1962) vous interdit de
              détruire des denrées encore consommables et vous impose de proposer, dans l&apos;année suivant le
              franchissement du seuil, une convention de don à <strong>au moins une</strong> association
              d&apos;aide alimentaire habilitée. Cette obligation porte sur la proposition, pas sur l&apos;exclusivité
              : vous pouvez tout à fait donner aussi à des associations non habilitées en parallèle. Vérifiez le
              statut d&apos;habilitation de vos associations partenaires dans votre{" "}
              <a href="/planning" className="font-semibold underline">
                planning
              </a>
              .
            </p>
          </div>
        )}

        {session.role === "ASSOCIATION" && (
          <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: "50ms" }}>
            <div>
              <h2 className="text-sm font-semibold">Bénévoles qui se déplacent</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Les personnes susceptibles d&apos;effectuer les enlèvements chez les donateurs.
              </p>
            </div>

            {benevoles.length > 0 && (
              <ul className="space-y-1.5">
                {benevoles.map((benevole) => (
                  <li key={benevole.id} className="rounded-xl bg-surface-alt px-3.5 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{benevole.nom}</span>
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                            {LABEL_ROLE_BENEVOLE[benevole.role]}
                          </span>
                        </div>
                        {benevole.telephone && (
                          <div className="text-xs text-ink-muted">
                            <LienTelephone numero={benevole.telephone} />
                          </div>
                        )}
                      </div>
                      <form action={retirerBenevoleAction.bind(null, benevole.id)}>
                        <button
                          type="submit"
                          aria-label={`Retirer ${benevole.nom}`}
                          className="text-ink-muted/70 transition-transform active:scale-90"
                        >
                          &times;
                        </button>
                      </form>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <form action={basculerAssuranceRcBenevoleAction.bind(null, benevole.id)}>
                        <button
                          type="submit"
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-transform active:scale-95 ${
                            benevole.assuranceRcAttestee
                              ? "bg-brand/15 text-brand"
                              : "bg-amber-500/15 text-amber-700"
                          }`}
                        >
                          {benevole.assuranceRcAttestee
                            ? "✓ Assurance RC attestée"
                            : "⚠ Assurance RC non attestée"}
                        </button>
                      </form>
                      <form action={basculerMandatBenevoleAction.bind(null, benevole.id)}>
                        <button
                          type="submit"
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-transform active:scale-95 ${
                            benevole.mandatDonneLe ? "bg-brand/15 text-brand" : "bg-surface text-ink-muted"
                          }`}
                        >
                          {benevole.mandatDonneLe ? "✓ Mandaté pour signer" : "Pas encore mandaté"}
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form action={ajouterBenevoleAction} className="space-y-2.5">
              <input
                type="text"
                name="benevoleNom"
                placeholder="Nom du bénévole"
                required
                maxLength={200}
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
              <input
                type="tel"
                name="benevoleTelephone"
                placeholder="Téléphone (optionnel)"
                maxLength={200}
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
              <select
                name="benevoleRole"
                defaultValue="COLLECTEUR"
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              >
                <option value="REFERENT">Référent don</option>
                <option value="COLLECTEUR">Collecteur</option>
              </select>
              <label className="flex items-start gap-2 text-xs text-ink-muted">
                <input type="checkbox" name="benevoleAssuranceRc" className="mt-0.5" />
                <span>
                  J&apos;atteste que ce bénévole dispose d&apos;une assurance responsabilité civile en cours de
                  validité pour ses déplacements.
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs text-ink-muted">
                <input type="checkbox" name="benevoleMandat" className="mt-0.5" />
                <span>
                  Le président lui donne mandat pour signer les bordereaux de remise au nom de l&apos;association.
                </span>
              </label>
              <button
                type="submit"
                className="w-full rounded-full border border-border py-2.5 text-sm font-semibold transition-transform active:scale-[0.98]"
              >
                + Ajouter un bénévole
              </button>
            </form>
          </div>
        )}

        {session.role === "ASSOCIATION" && (
          <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: "75ms" }}>
            <div>
              <h2 className="text-sm font-semibold">Habilitation &amp; conformité sanitaire</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Habilitation aide alimentaire (art. L. 266-2 du code de l&apos;action sociale et des familles) et
                déclaration d&apos;activité auprès de la DDPP.
              </p>
            </div>
            <form action={definirConformiteAssociationAction} className="space-y-2.5">
              <select
                name="habilitationStatut"
                defaultValue={habilitationStatut}
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              >
                <option value="NON_HABILITEE">Non habilitée</option>
                <option value="REGIONALE">Habilitation régionale (DREETS)</option>
                <option value="NATIONALE">Habilitation nationale</option>
              </select>
              <label className="block text-xs text-ink-muted">
                Fin de validité de l&apos;habilitation
                <input
                  type="date"
                  name="habilitationDateFin"
                  defaultValue={dateInputValue(habilitationDateFin)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm text-ink"
                />
              </label>

              <label className="flex items-center gap-2.5 text-xs text-ink-muted">
                <input type="checkbox" name="declarationDdpp" defaultChecked={declarationDdpp} />
                Déclaration d&apos;activité (denrées d&apos;origine animale ou végétale) déposée auprès de la DDPP
              </label>
              <label className="block text-xs text-ink-muted">
                Date de déclaration
                <input
                  type="date"
                  name="declarationDdppDate"
                  defaultValue={dateInputValue(declarationDdppDate)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm text-ink"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Enregistrer
              </button>
            </form>
          </div>
        )}

        {session.role === "ASSOCIATION" && (
          <div className="animate-fade-slide-in space-y-3 rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: "90ms" }}>
            <div>
              <h2 className="text-sm font-semibold">Contact en cas de rappel produit</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                La personne à prévenir immédiatement (email et téléphone) en cas de retrait/rappel d&apos;un produit
                déjà distribué.
              </p>
            </div>
            <form action={definirContactRappelAction} className="space-y-2.5">
              <input
                type="text"
                name="contactRappelNom"
                defaultValue={contactRappelNom}
                placeholder="Nom de la personne à prévenir"
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
              <input
                type="tel"
                name="contactRappelTelephone"
                defaultValue={contactRappelTelephone}
                placeholder="Téléphone"
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
              <input
                type="email"
                name="contactRappelEmail"
                defaultValue={contactRappelEmail}
                placeholder="Email"
                className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Enregistrer
              </button>
            </form>
          </div>
        )}

        {habilitationManquante && (
          <div className="animate-fade-slide-in flex gap-3 rounded-2xl bg-accent-tint p-4" style={{ animationDelay: "100ms" }}>
            <span aria-hidden="true" className="text-lg leading-none">ℹ️</span>
            <p className="text-xs leading-relaxed text-ink">
              <span className="font-semibold text-accent">Aucune habilitation aide alimentaire déclarée.</span> Elle
              est nécessaire pour recevoir des financements publics, et c&apos;est aussi la condition légale pour
              qu&apos;un commerce de plus de {SEUIL_GRANDE_SURFACE_M2} m² puisse valablement vous céder ses invendus
              dans le cadre de son obligation de don (art. L. 266-2 du code de l&apos;action sociale et des
              familles).
            </p>
          </div>
        )}

        {ddppNonDeclaree && (
          <div className="animate-fade-slide-in flex gap-3 rounded-2xl bg-accent-tint p-4" style={{ animationDelay: "125ms" }}>
            <span aria-hidden="true" className="text-lg leading-none">ℹ️</span>
            <p className="text-xs leading-relaxed text-ink">
              <span className="font-semibold text-accent">Aucune déclaration DDPP enregistrée.</span> Toute
              association qui manipule, entrepose ou distribue des denrées d&apos;origine animale — même à titre
              gratuit — doit préalablement se déclarer auprès de la Direction départementale de la protection des
              populations (DDPP).
            </p>
          </div>
        )}

        {rescritNonDepose && (
          <div className="animate-fade-slide-in flex gap-3 rounded-2xl bg-accent-tint p-4" style={{ animationDelay: "100ms" }}>
            <span aria-hidden="true" className="text-lg leading-none">ℹ️</span>
            <p className="text-xs leading-relaxed text-ink">
              <span className="font-semibold text-accent">Aucune demande de rescrit fiscal déposée.</span> Vos
              reçus fiscaux reposent pour l&apos;instant sur votre seule auto-déclaration d&apos;intérêt général.
              Sans confirmation de l&apos;administration, un contrôle peut les remettre en cause a posteriori.
              Il est recommandé de déposer un rescrit &laquo;&nbsp;mécénat&nbsp;&raquo; sur{" "}
              <a
                href="https://demarche.numerique.gouv.fr/commencer/d996ffa8-c0a9-45fb-82bf-23431d5b125f"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                demarche.numerique.gouv.fr
              </a>
              .
            </p>
          </div>
        )}

        <ChoixMesureAudience />
      </main>
      <BottomTabBar active="profil" role={session.role} nonLusMessages={nonLusMessages} />
    </div>
  );
}
