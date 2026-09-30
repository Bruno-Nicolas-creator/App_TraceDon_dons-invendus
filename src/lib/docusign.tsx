import "server-only";
import crypto from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import BonEnlevementDocument, { type ArticlePdf } from "@/lib/pdf/BonEnlevementDocument";
import { libelleHabilitation } from "@/lib/conformite";
import ConventionDocument, { type ConventionPdfData } from "@/lib/pdf/ConventionDocument";
import AttestationFiscaleDocument, { type AttestationPdfData } from "@/lib/pdf/AttestationFiscaleDocument";
import AttestationInteretGeneralDocument, {
  type AttestationInteretGeneralPdfData,
} from "@/lib/pdf/AttestationInteretGeneralDocument";
import { montantEnLettres } from "@/lib/nombreEnLettres";
import { articlesDuBon } from "@/lib/donDivisible";
import { notifier } from "@/lib/notifications";

export type RoleSignataire = "DONATEUR" | "ASSOCIATION";

const AUTH_SERVER = process.env.DOCUSIGN_AUTH_SERVER ?? "account-d.docusign.com";
const BASE_PATH = process.env.DOCUSIGN_BASE_PATH ?? "https://demo.docusign.net/restapi";

export function isDocuSignConfigured(): boolean {
  return !!(
    process.env.DOCUSIGN_INTEGRATION_KEY &&
    process.env.DOCUSIGN_USER_ID &&
    process.env.DOCUSIGN_ACCOUNT_ID &&
    process.env.DOCUSIGN_PRIVATE_KEY
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement ${name} manquante (configuration DocuSign).`);
  return value;
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * JWT Grant (RS256) signé manuellement avec la clé privée RSA DocuSign : évite une
 * dépendance à un SDK dont le format de clé attendu (PKCS#1 vs PKCS#8) est incertain —
 * `crypto.sign` de Node accepte les deux formats PEM tels quels.
 */
function creerAssertionJwt(): string {
  const integrationKey = requireEnv("DOCUSIGN_INTEGRATION_KEY");
  const userId = requireEnv("DOCUSIGN_USER_ID");
  const privateKey = requireEnv("DOCUSIGN_PRIVATE_KEY").replace(/\\n/g, "\n");

  const maintenant = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: AUTH_SERVER,
    iat: maintenant,
    exp: maintenant + 3600,
    scope: "signature impersonation",
  };

  const enteteEncodee = base64url(Buffer.from(JSON.stringify(header)));
  const chargeEncodee = base64url(Buffer.from(JSON.stringify(payload)));
  const donneesASigner = `${enteteEncodee}.${chargeEncodee}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(donneesASigner), privateKey);

  return `${donneesASigner}.${base64url(signature)}`;
}

let jetonEnCache: { valeur: string; expireLe: number } | null = null;

async function obtenirAccessToken(): Promise<string> {
  if (jetonEnCache && jetonEnCache.expireLe > Date.now() + 60_000) return jetonEnCache.valeur;

  const assertion = creerAssertionJwt();
  const res = await fetch(`https://${AUTH_SERVER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`Authentification DocuSign refusée (${res.status}) : ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  jetonEnCache = { valeur: data.access_token, expireLe: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function clientUserId(bonId: string, role: RoleSignataire): string {
  return `${bonId}-${role}`;
}

async function emailContact(entrepriseId: string | null, associationId: string | null): Promise<string> {
  const utilisateur = await prisma.user.findFirst({
    where: entrepriseId ? { entrepriseId } : { associationId: associationId! },
  });
  if (!utilisateur) throw new Error("Aucun compte utilisateur associé à cette organisation pour la signature.");
  return utilisateur.email;
}

export async function genererPdfBon(bonId: string, origin: string): Promise<Buffer> {
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({
    where: { id: bonId },
    include: {
      entreprise: true,
      association: true,
      benevoleCollecteur: true,
      don: { include: { articles: { orderBy: { createdAt: "asc" } } } },
    },
  });

  const qrDataUrl = await QRCode.toDataURL(`${origin}/bon-enlevement/${bon.id}`, { margin: 1, width: 200 });
  const articles: ArticlePdf[] = articlesDuBon(bon.don, bon.don.articles, bon.associationId).map((a) => ({
    designation: a.designation,
    quantite: a.quantiteConstatee ?? a.quantiteDeclaree,
    poidsKg: a.poidsKg,
    dlcOuEtat: a.dlcOuEtat,
    temperature: a.temperature,
    statut: a.statut,
    motifRefus: a.motifRefus,
    allergenes: a.allergenes,
  }));

  return renderToBuffer(
    <BonEnlevementDocument
      data={{
        numero: bon.numero,
        entreprise: {
          raisonSociale: bon.entreprise.raisonSociale,
          adresse: bon.entreprise.adresse,
          siret: bon.entreprise.siret,
          referentDonNom: bon.entreprise.referentDonNom,
        },
        association: {
          denomination: bon.association.denomination,
          rna: bon.association.rna,
          habilitationLabel: libelleHabilitation(bon.association.habilitationStatut),
        },
        benevoleCollecteurNom: bon.benevoleCollecteur?.nom ?? null,
        // Le modèle actuel n'attribue pas de numéro lisible aux conventions (identifiant
        // technique uniquement) : pas de valeur pertinente à afficher ici pour l'instant.
        numeroConvention: null,
        dateHeureEnlevement: bon.dateHeureEnlevement,
        poidsTotalRetenu: bon.poidsTotalRetenu,
        articles,
        signatureDonateurLe: bon.signatureDonateurLe,
        signatureAssociationLe: bon.signatureAssociationLe,
        qrDataUrl,
      }}
    />
  );
}

/** Crée l'enveloppe DocuSign (deux signataires, envoi séquentiel) si elle n'existe pas déjà. */
async function assurerEnveloppe(bonId: string, origin: string): Promise<string> {
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({
    where: { id: bonId },
    include: { entreprise: true, association: true },
  });
  if (bon.docusignEnvelopeId) return bon.docusignEnvelopeId;

  const [accessToken, pdfBuffer, emailDonateur, emailAssociation] = await Promise.all([
    obtenirAccessToken(),
    genererPdfBon(bonId, origin),
    emailContact(bon.entrepriseId, null),
    emailContact(null, bon.associationId),
  ]);
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const enveloppe = {
    emailSubject: `Bon d'enlèvement n°${bon.numero} — signature requise`,
    documents: [
      {
        documentBase64: pdfBuffer.toString("base64"),
        name: `Bon d'enlèvement ${bon.numero}`,
        fileExtension: "pdf",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: emailDonateur,
          name: bon.entreprise.raisonSociale,
          recipientId: "1",
          routingOrder: "1",
          clientUserId: clientUserId(bon.id, "DONATEUR"),
          tabs: {
            signHereTabs: [
              {
                documentId: "1",
                anchorString: "Pour l'entreprise donatrice,",
                anchorUnits: "pixels",
                anchorXOffset: "0",
                anchorYOffset: "30",
              },
            ],
          },
        },
        {
          email: emailAssociation,
          name: bon.association.denomination,
          recipientId: "2",
          routingOrder: "2",
          clientUserId: clientUserId(bon.id, "ASSOCIATION"),
          tabs: {
            signHereTabs: [
              {
                documentId: "1",
                anchorString: "Pour l'association réceptrice,",
                anchorUnits: "pixels",
                anchorXOffset: "0",
                anchorYOffset: "30",
              },
            ],
          },
        },
      ],
    },
    status: "sent",
  };

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${accountId}/envelopes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(enveloppe),
  });
  if (!res.ok) {
    throw new Error(`Création de l'enveloppe DocuSign échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { envelopeId: string };

  await prisma.bonEnlevement.update({ where: { id: bonId }, data: { docusignEnvelopeId: data.envelopeId } });
  return data.envelopeId;
}

/** Ouvre une session de signature intégrée (dans l'appli) pour le rôle demandé. */
export async function obtenirUrlSignatureEmbarquee(bonId: string, role: RoleSignataire, origin: string): Promise<string> {
  const envelopeId = await assurerEnveloppe(bonId, origin);
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({
    where: { id: bonId },
    include: { entreprise: true, association: true },
  });

  const accessToken = await obtenirAccessToken();
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const estDonateur = role === "DONATEUR";
  const email = await emailContact(estDonateur ? bon.entrepriseId : null, estDonateur ? null : bon.associationId);
  const nom = estDonateur ? bon.entreprise.raisonSociale : bon.association.denomination;
  const recipientId = estDonateur ? "1" : "2";
  const returnUrl = `${origin}/bon-enlevement/${bon.id}?docusignRole=${role}`;

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      returnUrl,
      authenticationMethod: "none",
      email,
      userName: nom,
      recipientId,
      clientUserId: clientUserId(bon.id, role),
    }),
  });
  if (!res.ok) {
    throw new Error(`Ouverture de la signature DocuSign échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

/**
 * À appeler au retour depuis DocuSign (returnUrl) : vérifie auprès de DocuSign que ce
 * signataire a bien terminé, puis enregistre la signature. Ne fait jamais confiance
 * au seul paramètre `event` de l'URL de retour, qui peut être falsifié côté client.
 */
export async function verifierEtEnregistrerSignature(bonId: string, role: RoleSignataire): Promise<boolean> {
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({
    where: { id: bonId },
    include: { entreprise: true, association: true, benevoleCollecteur: true },
  });
  if (!bon.docusignEnvelopeId) return false;

  const dejaEnregistree = role === "DONATEUR" ? bon.signatureDonateurLe : bon.signatureAssociationLe;
  if (dejaEnregistree) return true;

  const accessToken = await obtenirAccessToken();
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");
  const recipientId = role === "DONATEUR" ? "1" : "2";

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${accountId}/envelopes/${bon.docusignEnvelopeId}/recipients`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return false;

  const data = (await res.json()) as { signers?: { recipientId: string; status: string; signedDateTime?: string }[] };
  const signataire = data.signers?.find((s) => s.recipientId === recipientId);
  if (signataire?.status !== "completed") return false;

  const champ = role === "DONATEUR" ? "signatureDonateurLe" : "signatureAssociationLe";
  const horodatage = signataire.signedDateTime ? new Date(signataire.signedDateTime) : new Date();
  // Le bénévole mandaté choisi pour cet enlèvement (cf. definirBenevoleCollecteurAction) fait foi
  // pour notre propre registre, même si la session DocuSign reste ouverte via le compte association.
  const signataireNom =
    role === "ASSOCIATION" ? bon.benevoleCollecteur?.nom ?? bon.association.denomination : null;

  await prisma.$transaction([
    prisma.bonEnlevement.update({ where: { id: bonId }, data: { [champ]: horodatage } }),
    prisma.signature.create({
      data: { bonEnlevementId: bonId, role, horodatage, referenceDocuSign: bon.docusignEnvelopeId, signataireNom },
    }),
  ]);

  if (role === "DONATEUR") {
    await notifier(
      { associationId: bon.associationId },
      "Le donateur a signé, à vous de signer",
      `${bon.entreprise.raisonSociale} a signé le bon d'enlèvement n°${bon.numero}. Vous pouvez maintenant le signer à votre tour.`,
      `/bon-enlevement/${bon.id}`
    );
  } else {
    await notifier(
      { entrepriseId: bon.entrepriseId },
      "L'association a signé, vous pouvez confirmer l'enlèvement",
      `${bon.association.denomination} a signé le bon d'enlèvement n°${bon.numero}. Vous pouvez maintenant confirmer l'enlèvement.`,
      `/bon-enlevement/${bon.id}`
    );
  }

  return true;
}

export async function genererPdfConvention(conventionId: string): Promise<Buffer> {
  const convention = await prisma.convention.findUniqueOrThrow({
    where: { id: conventionId },
    include: { entreprise: true, association: true },
  });

  const [representantEntreprise, representantAssociation] = await Promise.all([
    prisma.user.findFirst({ where: { entrepriseId: convention.entrepriseId } }),
    prisma.user.findFirst({ where: { associationId: convention.associationId } }),
  ]);

  const data: ConventionPdfData = {
    dureeAns: convention.dureeAns,
    entreprise: {
      raisonSociale: convention.entreprise.raisonSociale,
      formeJuridique: convention.entreprise.formeJuridique,
      adresse: convention.entreprise.adresse,
      siret: convention.entreprise.siret,
      secteurActivite: convention.entreprise.secteurActivite,
    },
    association: {
      denomination: convention.association.denomination,
      adresse: convention.association.adresse,
      rna: convention.association.rna,
      categorieEligibilite: convention.association.categorieEligibilite,
    },
    representantEntreprise: representantEntreprise?.nom ?? convention.entreprise.raisonSociale,
    representantAssociation: representantAssociation?.nom ?? convention.association.denomination,
  };

  return renderToBuffer(<ConventionDocument data={data} />);
}

/** Crée l'enveloppe DocuSign de la convention (deux signataires, envoi séquentiel) si elle n'existe pas déjà. */
async function assurerEnveloppeConvention(conventionId: string): Promise<string> {
  const convention = await prisma.convention.findUniqueOrThrow({
    where: { id: conventionId },
    include: { entreprise: true, association: true },
  });
  if (convention.docusignEnvelopeId) return convention.docusignEnvelopeId;

  const [accessToken, pdfBuffer, emailDonateur, emailAssociation] = await Promise.all([
    obtenirAccessToken(),
    genererPdfConvention(conventionId),
    emailContact(convention.entrepriseId, null),
    emailContact(null, convention.associationId),
  ]);
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const enveloppe = {
    emailSubject: `Convention de don — signature requise`,
    documents: [
      {
        documentBase64: pdfBuffer.toString("base64"),
        name: "Convention de don",
        fileExtension: "pdf",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: emailDonateur,
          name: convention.entreprise.raisonSociale,
          recipientId: "1",
          routingOrder: "1",
          clientUserId: clientUserId(convention.id, "DONATEUR"),
          tabs: {
            signHereTabs: [
              { documentId: "1", anchorString: "Pour le DONATEUR,", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "36" },
            ],
          },
        },
        {
          email: emailAssociation,
          name: convention.association.denomination,
          recipientId: "2",
          routingOrder: "2",
          clientUserId: clientUserId(convention.id, "ASSOCIATION"),
          tabs: {
            signHereTabs: [
              { documentId: "1", anchorString: "Pour l'ASSOCIATION,", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "36" },
            ],
          },
        },
      ],
    },
    status: "sent",
  };

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${accountId}/envelopes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(enveloppe),
  });
  if (!res.ok) {
    throw new Error(`Création de l'enveloppe DocuSign échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { envelopeId: string };

  await prisma.convention.update({
    where: { id: conventionId },
    data: { docusignEnvelopeId: data.envelopeId, statut: "ENVOYEE" },
  });
  return data.envelopeId;
}

/** Ouvre une session de signature intégrée (dans l'appli) pour la convention, pour le rôle demandé. */
export async function obtenirUrlSignatureEmbarqueeConvention(
  conventionId: string,
  role: RoleSignataire,
  origin: string
): Promise<string> {
  const envelopeId = await assurerEnveloppeConvention(conventionId);
  const convention = await prisma.convention.findUniqueOrThrow({
    where: { id: conventionId },
    include: { entreprise: true, association: true },
  });

  const accessToken = await obtenirAccessToken();
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const estDonateur = role === "DONATEUR";
  const email = await emailContact(
    estDonateur ? convention.entrepriseId : null,
    estDonateur ? null : convention.associationId
  );
  const nom = estDonateur ? convention.entreprise.raisonSociale : convention.association.denomination;
  const recipientId = estDonateur ? "1" : "2";
  const returnUrl = `${origin}/convention/${convention.id}?docusignRole=${role}`;

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      returnUrl,
      authenticationMethod: "none",
      email,
      userName: nom,
      recipientId,
      clientUserId: clientUserId(convention.id, role),
    }),
  });
  if (!res.ok) {
    throw new Error(`Ouverture de la signature DocuSign échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

/** À appeler au retour depuis DocuSign : vérifie auprès de DocuSign puis enregistre la signature de la convention. */
export async function verifierEtEnregistrerSignatureConvention(
  conventionId: string,
  role: RoleSignataire
): Promise<boolean> {
  const convention = await prisma.convention.findUniqueOrThrow({ where: { id: conventionId } });
  if (!convention.docusignEnvelopeId) return false;

  const dejaEnregistree = role === "DONATEUR" ? convention.signatureEntrepriseLe : convention.signatureAssociationLe;
  if (dejaEnregistree) return true;

  const accessToken = await obtenirAccessToken();
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");
  const recipientId = role === "DONATEUR" ? "1" : "2";

  const res = await fetch(
    `${BASE_PATH}/v2.1/accounts/${accountId}/envelopes/${convention.docusignEnvelopeId}/recipients`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return false;

  const data = (await res.json()) as { signers?: { recipientId: string; status: string; signedDateTime?: string }[] };
  const signataire = data.signers?.find((s) => s.recipientId === recipientId);
  if (signataire?.status !== "completed") return false;

  const champ = role === "DONATEUR" ? "signatureEntrepriseLe" : "signatureAssociationLe";
  const horodatage = signataire.signedDateTime ? new Date(signataire.signedDateTime) : new Date();

  const conventionMaj = await prisma.convention.update({ where: { id: conventionId }, data: { [champ]: horodatage } });
  if (conventionMaj.signatureEntrepriseLe && conventionMaj.signatureAssociationLe) {
    await prisma.convention.update({ where: { id: conventionId }, data: { statut: "SIGNEE" } });
  }

  return true;
}

export async function genererPdfAttestation(attestationId: string): Promise<Buffer> {
  const attestation = await prisma.attestationFiscale.findUniqueOrThrow({
    where: { id: attestationId },
    include: { entreprise: true, association: true, bonsEnlevement: { orderBy: { dateHeureEnlevement: "asc" } } },
  });

  const data: AttestationPdfData = {
    numeroOrdre: attestation.numeroOrdre,
    entreprise: {
      raisonSociale: attestation.entreprise.raisonSociale,
      formeJuridique: attestation.entreprise.formeJuridique,
      adresse: attestation.entreprise.adresse,
      siret: attestation.entreprise.siret,
    },
    association: {
      denomination: attestation.association.denomination,
      adresse: attestation.association.adresse,
      rna: attestation.association.rna,
      categorieEligibilite: attestation.association.categorieEligibilite,
      declarationInteretGeneral: attestation.association.declarationInteretGeneral,
      rescritStatut: attestation.association.rescritStatut,
      rescritDateDepot: attestation.association.rescritDateDepot,
    },
    periodeDebut: attestation.periodeDebut,
    periodeFin: attestation.periodeFin,
    montantCalcule: attestation.montantCalcule,
    bons: attestation.bonsEnlevement.map((b) => ({
      numero: b.numero,
      date: b.dateHeureEnlevement,
      poids: b.poidsTotalRetenu ?? 0,
    })),
  };

  return renderToBuffer(
    <AttestationFiscaleDocument data={data} montantEnLettres={montantEnLettres(attestation.montantCalcule)} />
  );
}

/** Crée l'enveloppe DocuSign de l'attestation (signataire unique : l'association) si elle n'existe pas déjà. */
export async function envoyerAttestationPourSignature(attestationId: string): Promise<string> {
  const attestation = await prisma.attestationFiscale.findUniqueOrThrow({
    where: { id: attestationId },
    include: { association: true },
  });
  if (attestation.docusignEnvelopeId) return attestation.docusignEnvelopeId;

  const [accessToken, pdfBuffer, emailAssociation] = await Promise.all([
    obtenirAccessToken(),
    genererPdfAttestation(attestationId),
    emailContact(null, attestation.associationId),
  ]);
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const enveloppe = {
    emailSubject: `Attestation fiscale ${attestation.numeroOrdre} — signature requise`,
    documents: [
      {
        documentBase64: pdfBuffer.toString("base64"),
        name: `Attestation ${attestation.numeroOrdre}`,
        fileExtension: "pdf",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: emailAssociation,
          name: attestation.association.denomination,
          recipientId: "1",
          routingOrder: "1",
          clientUserId: clientUserId(attestation.id, "ASSOCIATION"),
          tabs: {
            signHereTabs: [
              {
                documentId: "1",
                anchorString: "Pour l'association bénéficiaire,",
                anchorUnits: "pixels",
                anchorXOffset: "0",
                anchorYOffset: "36",
              },
            ],
          },
        },
      ],
    },
    status: "sent",
  };

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${accountId}/envelopes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(enveloppe),
  });
  if (!res.ok) {
    throw new Error(`Création de l'enveloppe DocuSign échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { envelopeId: string };

  await prisma.attestationFiscale.update({
    where: { id: attestationId },
    data: { docusignEnvelopeId: data.envelopeId, statut: "ENVOYEE" },
  });
  return data.envelopeId;
}

/** Ouvre une session de signature intégrée (dans l'appli) pour l'association destinataire de l'attestation. */
export async function obtenirUrlSignatureEmbarqueeAttestation(attestationId: string, origin: string): Promise<string> {
  const envelopeId = await envoyerAttestationPourSignature(attestationId);
  const attestation = await prisma.attestationFiscale.findUniqueOrThrow({
    where: { id: attestationId },
    include: { association: true },
  });

  const accessToken = await obtenirAccessToken();
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const email = await emailContact(null, attestation.associationId);
  const returnUrl = `${origin}/attestations/${attestation.id}?event=signing_complete`;

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      returnUrl,
      authenticationMethod: "none",
      email,
      userName: attestation.association.denomination,
      recipientId: "1",
      clientUserId: clientUserId(attestation.id, "ASSOCIATION"),
    }),
  });
  if (!res.ok) {
    throw new Error(`Ouverture de la signature DocuSign échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

/** À appeler au retour depuis DocuSign : vérifie auprès de DocuSign puis enregistre la signature de l'attestation. */
export async function verifierEtEnregistrerSignatureAttestation(attestationId: string): Promise<boolean> {
  const attestation = await prisma.attestationFiscale.findUniqueOrThrow({ where: { id: attestationId } });
  if (!attestation.docusignEnvelopeId) return false;
  if (attestation.signatureAssociationLe) return true;

  const accessToken = await obtenirAccessToken();
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const res = await fetch(
    `${BASE_PATH}/v2.1/accounts/${accountId}/envelopes/${attestation.docusignEnvelopeId}/recipients`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return false;

  const data = (await res.json()) as { signers?: { recipientId: string; status: string; signedDateTime?: string }[] };
  const signataire = data.signers?.find((s) => s.recipientId === "1");
  if (signataire?.status !== "completed") return false;

  const horodatage = signataire.signedDateTime ? new Date(signataire.signedDateTime) : new Date();
  await prisma.attestationFiscale.update({
    where: { id: attestationId },
    data: { signatureAssociationLe: horodatage, statut: "SIGNEE" },
  });

  return true;
}

export async function genererPdfInteretGeneral(attestationId: string): Promise<Buffer> {
  const attestation = await prisma.attestationInteretGeneral.findUniqueOrThrow({
    where: { id: attestationId },
    include: { entreprise: true, association: true },
  });

  const data: AttestationInteretGeneralPdfData = {
    entreprise: {
      raisonSociale: attestation.entreprise.raisonSociale,
      siret: attestation.entreprise.siret,
    },
    association: {
      denomination: attestation.association.denomination,
      adresse: attestation.association.adresse,
      rna: attestation.association.rna,
      categorieEligibilite: attestation.association.categorieEligibilite,
    },
  };

  return renderToBuffer(<AttestationInteretGeneralDocument data={data} />);
}

/** Crée l'enveloppe DocuSign de l'attestation intérêt général (signataire unique : l'association) si elle n'existe pas déjà. */
export async function envoyerInteretGeneralPourSignature(attestationId: string): Promise<string> {
  const attestation = await prisma.attestationInteretGeneral.findUniqueOrThrow({
    where: { id: attestationId },
    include: { association: true, entreprise: true },
  });
  if (attestation.docusignEnvelopeId) return attestation.docusignEnvelopeId;

  const [accessToken, pdfBuffer, emailAssociation] = await Promise.all([
    obtenirAccessToken(),
    genererPdfInteretGeneral(attestationId),
    emailContact(null, attestation.associationId),
  ]);
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const enveloppe = {
    emailSubject: `Attestation intérêt général — ${attestation.entreprise.raisonSociale} — signature requise`,
    documents: [
      {
        documentBase64: pdfBuffer.toString("base64"),
        name: `Attestation interet general ${attestation.association.denomination}`,
        fileExtension: "pdf",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: emailAssociation,
          name: attestation.association.denomination,
          recipientId: "1",
          routingOrder: "1",
          clientUserId: clientUserId(attestation.id, "ASSOCIATION"),
          tabs: {
            signHereTabs: [
              {
                documentId: "1",
                anchorString: "Signature du/de la représentant(e) légal(e)",
                anchorUnits: "pixels",
                anchorXOffset: "0",
                anchorYOffset: "20",
              },
            ],
          },
        },
      ],
    },
    status: "sent",
  };

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${accountId}/envelopes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(enveloppe),
  });
  if (!res.ok) {
    throw new Error(`Création de l'enveloppe DocuSign échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { envelopeId: string };

  await prisma.attestationInteretGeneral.update({
    where: { id: attestationId },
    data: { docusignEnvelopeId: data.envelopeId, statut: "ENVOYEE" },
  });
  return data.envelopeId;
}

/** Ouvre une session de signature intégrée (dans l'appli) pour l'association destinataire de l'attestation. */
export async function obtenirUrlSignatureEmbarqueeInteretGeneral(attestationId: string, origin: string): Promise<string> {
  const envelopeId = await envoyerInteretGeneralPourSignature(attestationId);
  const attestation = await prisma.attestationInteretGeneral.findUniqueOrThrow({
    where: { id: attestationId },
    include: { association: true },
  });

  const accessToken = await obtenirAccessToken();
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const email = await emailContact(null, attestation.associationId);
  const returnUrl = `${origin}/attestation-interet-general/${attestation.id}?event=signing_complete`;

  const res = await fetch(`${BASE_PATH}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      returnUrl,
      authenticationMethod: "none",
      email,
      userName: attestation.association.denomination,
      recipientId: "1",
      clientUserId: clientUserId(attestation.id, "ASSOCIATION"),
    }),
  });
  if (!res.ok) {
    throw new Error(`Ouverture de la signature DocuSign échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

/** À appeler au retour depuis DocuSign : vérifie auprès de DocuSign puis enregistre la signature de l'attestation. */
export async function verifierEtEnregistrerSignatureInteretGeneral(attestationId: string): Promise<boolean> {
  const attestation = await prisma.attestationInteretGeneral.findUniqueOrThrow({ where: { id: attestationId } });
  if (!attestation.docusignEnvelopeId) return false;
  if (attestation.signatureAssociationLe) return true;

  const accessToken = await obtenirAccessToken();
  const accountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const res = await fetch(
    `${BASE_PATH}/v2.1/accounts/${accountId}/envelopes/${attestation.docusignEnvelopeId}/recipients`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return false;

  const data = (await res.json()) as { signers?: { recipientId: string; status: string; signedDateTime?: string }[] };
  const signataire = data.signers?.find((s) => s.recipientId === "1");
  if (signataire?.status !== "completed") return false;

  const horodatage = signataire.signedDateTime ? new Date(signataire.signedDateTime) : new Date();
  await prisma.attestationInteretGeneral.update({
    where: { id: attestationId },
    data: { signatureAssociationLe: horodatage, statut: "SIGNEE" },
  });

  return true;
}
