import "server-only";
import crypto from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import BonEnlevementDocument, { type ArticlePdf } from "@/lib/pdf/BonEnlevementDocument";

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

async function genererPdfBon(bonId: string, origin: string): Promise<Buffer> {
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({
    where: { id: bonId },
    include: { entreprise: true, association: true, don: { include: { articles: { orderBy: { createdAt: "asc" } } } } },
  });

  const qrDataUrl = await QRCode.toDataURL(`${origin}/bon-enlevement/${bon.donId}`, { margin: 1, width: 200 });
  const articles: ArticlePdf[] = bon.don.articles.map((a) => ({
    designation: a.designation,
    quantite: a.quantiteConstatee ?? a.quantiteDeclaree,
    poidsKg: a.poidsKg,
    dlcOuEtat: a.dlcOuEtat,
    temperature: a.temperature,
    statut: a.statut,
    motifRefus: a.motifRefus,
  }));

  return renderToBuffer(
    <BonEnlevementDocument
      data={{
        numero: bon.numero,
        entreprise: { raisonSociale: bon.entreprise.raisonSociale, adresse: bon.entreprise.adresse, siret: bon.entreprise.siret },
        association: { denomination: bon.association.denomination, adresse: bon.association.adresse, rna: bon.association.rna },
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
          tabs: { signHereTabs: [{ documentId: "1", pageNumber: "1", xPosition: "60", yPosition: "660" }] },
        },
        {
          email: emailAssociation,
          name: bon.association.denomination,
          recipientId: "2",
          routingOrder: "2",
          clientUserId: clientUserId(bon.id, "ASSOCIATION"),
          tabs: { signHereTabs: [{ documentId: "1", pageNumber: "1", xPosition: "310", yPosition: "660" }] },
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
  const returnUrl = `${origin}/bon-enlevement/${bon.donId}?docusignRole=${role}`;

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
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({ where: { id: bonId } });
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

  await prisma.$transaction([
    prisma.bonEnlevement.update({ where: { id: bonId }, data: { [champ]: horodatage } }),
    prisma.signature.create({
      data: { bonEnlevementId: bonId, role, horodatage, referenceDocuSign: bon.docusignEnvelopeId },
    }),
  ]);

  return true;
}
