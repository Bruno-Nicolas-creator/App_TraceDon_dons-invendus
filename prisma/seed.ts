import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const MOT_DE_PASSE_DEMO = "demo1234";

/**
 * Génère un PDF minimal (une page, quelques lignes de texte) sans dépendance externe :
 * @react-pdf/renderer échoue au chargement depuis un script tsx autonome (résolution ESM
 * stricte de node_modules/@react-pdf/hyphenate), alors qu'il fonctionne dans l'app Next.js.
 */
function normaliserPourPdf(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[()\\]/g, "");
}

function genererPdfBrut(titre: string, sousTitre: string, lignes: string[]): Buffer {
  const toutesLignes = [titre, sousTitre, "", ...lignes].map(normaliserPourPdf);
  const contenuTexte = toutesLignes
    .map((ligne, i) => (i === 0 ? `(${ligne}) Tj` : `0 -16 Td (${ligne}) Tj`))
    .join("\n");
  const stream = `BT /F1 12 Tf 50 780 Td\n${contenuTexte}\nET`;

  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objets.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

async function creerDocument(
  proprietaire: { entrepriseId: string } | { associationId: string },
  type: string,
  titre: string,
  sousTitre: string,
  lignes: string[]
) {
  const buffer = genererPdfBrut(titre, sousTitre, lignes);
  await prisma.document.create({
    data: {
      ...proprietaire,
      type: type as never,
      nomFichier: `${normaliserPourPdf(titre).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
      contentType: "application/pdf",
      contenu: buffer as unknown as never,
      tailleOctets: buffer.length,
    },
  });
}

async function main() {
  await prisma.document.deleteMany();
  await prisma.assignationRecurrente.deleteMany();
  await prisma.benevole.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.article.deleteMany();
  await prisma.bonEnlevement.deleteMany();
  await prisma.attestationFiscale.deleteMany();
  await prisma.don.deleteMany();
  await prisma.convention.deleteMany();
  await prisma.user.deleteMany();
  await prisma.entreprise.deleteMany();
  await prisma.association.deleteMany();
  await prisma.abonnement.deleteMany();
  await prisma.enseigne.deleteMany();
  await prisma.reseau.deleteMany();

  const enseigneCarrefour = await prisma.enseigne.create({
    data: {
      id: "ens_carrefour",
      denomination: "Carrefour City",
      siretSiege: "40125333800234",
      nombreSieges: 1,
      abonnement: {
        create: {
          formule: "Standard",
          montant: 49,
          periodicite: "mensuel",
        },
      },
    },
  });

  const carrefour = await prisma.entreprise.create({
    data: {
      id: "ent_carrefour",
      raisonSociale: "Carrefour City Nice Masséna",
      formeJuridique: "SAS",
      siret: "40125333800234",
      adresse: "20 Avenue Jean Médecin, 06000 Nice",
      latitude: 43.700263,
      longitude: 7.268397,
      secteurActivite: "Commerce de détail alimentaire",
      coutRevientKg: 2.8,
      surfaceVenteM2: 650,
      referentDonNom: "Cécile Dubois",
      referentDonTelephone: "06 12 34 56 78",
      enseigneId: enseigneCarrefour.id,
    },
  });

  const boulangerie = await prisma.entreprise.create({
    data: {
      id: "ent_boulangerie",
      raisonSociale: "Boulangerie du Palais",
      formeJuridique: "EI",
      siret: "80234511200019",
      adresse: "8 Rue de France, 06000 Nice",
      latitude: 43.6966,
      longitude: 7.264117,
      secteurActivite: "Boulangerie-pâtisserie",
      coutRevientKg: 3.5,
      surfaceVenteM2: 45,
    },
  });

  const superette = await prisma.entreprise.create({
    data: {
      id: "ent_superette",
      raisonSociale: "Supérette Masséna",
      formeJuridique: "SARL",
      siret: "81234567800045",
      adresse: "15 Rue Masséna, 06000 Nice",
      latitude: 43.697483,
      longitude: 7.266847,
      secteurActivite: "Commerce de détail alimentaire",
      coutRevientKg: 2.5,
      surfaceVenteM2: 380,
    },
  });

  const bioMarche = await prisma.entreprise.create({
    data: {
      id: "ent_bio",
      raisonSociale: "Bio'Marché Nice Centre",
      formeJuridique: "SAS",
      siret: "82345678900012",
      adresse: "12 Rue Paradis, 06000 Nice",
      latitude: 43.697374,
      longitude: 7.267328,
      secteurActivite: "Commerce non alimentaire",
      coutRevientKg: 4.2,
      surfaceVenteM2: 220,
    },
  });

  const epicerie = await prisma.entreprise.create({
    data: {
      id: "ent_epicerie",
      raisonSociale: "Épicerie Fine Gambetta",
      formeJuridique: "SARL",
      siret: "83456789000021",
      adresse: "30 Boulevard Gambetta, 06000 Nice",
      latitude: 43.697291,
      longitude: 7.25631,
      secteurActivite: "Épicerie fine",
      surfaceVenteM2: 90,
      coutRevientKg: 3.9,
    },
  });

  const coeurPartage = await prisma.association.create({
    data: {
      id: "assoc_coeur",
      denomination: "Coeur Partage",
      rna: "W061234567",
      adresse: "12 Rue Pastorelli, 06000 Nice",
      latitude: 43.702315,
      longitude: 7.273499,
      categorieEligibilite: "Aide alimentaire",
      declarationInteretGeneral: true,
      rescritStatut: "EN_ATTENTE",
      rescritDateDepot: new Date("2026-03-12"),
      verifiee: true,
      verifieeLe: new Date("2026-08-01"),
      verifieePar: "Bruno (coordinateur)",
      habilitationStatut: "REGIONALE",
      habilitationDateFin: new Date("2029-08-01"),
      declarationDdpp: true,
      declarationDdppDate: new Date("2025-06-10"),
      referentDonNom: "Karim Haddad",
      referentDonTelephone: "06 98 76 54 32",
    },
  });

  const restoSolidaire = await prisma.association.create({
    data: {
      id: "assoc_resto",
      denomination: "Resto Solidaire Nice",
      rna: "W069876543",
      adresse: "18 Rue Gioffrédo, 06000 Nice",
      latitude: 43.701507,
      longitude: 7.275996,
      categorieEligibilite: "Aide alimentaire",
      declarationInteretGeneral: true,
      rescritStatut: "ACCORD_TACITE",
      rescritDateDepot: new Date("2025-09-01"),
      verifiee: true,
      verifieeLe: new Date("2026-07-15"),
      verifieePar: "Bruno (coordinateur)",
      habilitationStatut: "NATIONALE",
      habilitationDateFin: new Date("2028-07-15"),
      declarationDdpp: true,
      declarationDdppDate: new Date("2025-05-02"),
      referentDonNom: "Julie Renard",
      referentDonTelephone: "06 45 67 89 10",
    },
  });

  await prisma.benevole.createMany({
    data: [
      { associationId: coeurPartage.id, nom: "Amina Bensalem", telephone: "06 11 22 33 44" },
      { associationId: coeurPartage.id, nom: "Marc Lefèvre", telephone: "06 22 33 44 55" },
      { associationId: restoSolidaire.id, nom: "Sofia Ricci", telephone: "06 33 44 55 66" },
    ],
  });

  await prisma.association.create({
    data: {
      id: "assoc_panier",
      denomination: "Panier Fraternité",
      rna: "W061122334",
      adresse: "6 Avenue Thiers, 06000 Nice",
      latitude: 43.70497,
      longitude: 7.263615,
      categorieEligibilite: "Aide alimentaire",
      declarationInteretGeneral: true,
      rescritStatut: "NON_DEPOSE",
      verifiee: false,
    },
  });

  await prisma.association.create({
    data: {
      id: "assoc_mains",
      denomination: "Les Mains Tendues",
      rna: "W065566778",
      adresse: "10 Rue Alphonse Karr, 06000 Nice",
      latitude: 43.699109,
      longitude: 7.265568,
      categorieEligibilite: "Aide alimentaire et non alimentaire",
      declarationInteretGeneral: true,
      rescritStatut: "EN_ATTENTE",
      rescritDateDepot: new Date("2026-06-02"),
      verifiee: false,
    },
  });

  await prisma.association.create({
    data: {
      id: "assoc_partage06",
      denomination: "Partage Côte d'Azur",
      rna: "W064433221",
      adresse: "2 Boulevard Victor Hugo, 06000 Nice",
      latitude: 43.700455,
      longitude: 7.26723,
      categorieEligibilite: "Aide alimentaire",
      declarationInteretGeneral: true,
      rescritStatut: "REPONSE_RECUE",
      rescritDateDepot: new Date("2025-11-04"),
      verifiee: true,
      verifieeLe: new Date("2025-12-01"),
      verifieePar: "Bruno (coordinateur)",
      habilitationStatut: "REGIONALE",
      habilitationDateFin: new Date("2027-12-01"),
      declarationDdpp: true,
      declarationDdppDate: new Date("2025-10-20"),
    },
  });

  // Conventions déjà signées entre Carrefour et ses deux partenaires historiques
  // (relation antérieure à la plateforme) : le planning et le positionnement ne sont
  // bloqués que pour un tout nouveau binôme entreprise/association.
  await prisma.convention.createMany({
    data: [
      {
        entrepriseId: carrefour.id,
        associationId: coeurPartage.id,
        statut: "SIGNEE",
        signatureEntrepriseLe: new Date("2025-09-01"),
        signatureAssociationLe: new Date("2025-09-02"),
      },
      {
        entrepriseId: carrefour.id,
        associationId: restoSolidaire.id,
        statut: "SIGNEE",
        signatureEntrepriseLe: new Date("2025-09-01"),
        signatureAssociationLe: new Date("2025-09-02"),
      },
    ],
  });

  // Planning récurrent : Carrefour City Nice Masséna reçoit Coeur Partage les jours
  // impairs de la semaine et Resto Solidaire Nice les autres ; le week-end reste ouvert
  // à la place de marché pour montrer les deux fonctionnements.
  await prisma.assignationRecurrente.createMany({
    data: [
      { entrepriseId: carrefour.id, jourSemaine: 0, associationId: coeurPartage.id }, // lundi
      { entrepriseId: carrefour.id, jourSemaine: 1, associationId: restoSolidaire.id }, // mardi
      { entrepriseId: carrefour.id, jourSemaine: 2, associationId: coeurPartage.id }, // mercredi
      { entrepriseId: carrefour.id, jourSemaine: 3, associationId: restoSolidaire.id }, // jeudi
      { entrepriseId: carrefour.id, jourSemaine: 4, associationId: coeurPartage.id }, // vendredi
    ],
  });

  // Don en brouillon pour l'écran "Nouveau don" (entreprise Carrefour)
  await prisma.don.create({
    data: {
      id: "don_brouillon_carrefour",
      entrepriseId: carrefour.id,
      mode: "BORDEREAU_OUVERT",
      statut: "BROUILLON",
      articles: {
        create: [
          { designation: "Yaourts nature x12", quantiteDeclaree: "12 unités", poidsKg: 1.5 },
          { designation: "Pain de mie complet", quantiteDeclaree: "6 unités", poidsKg: 2.4 },
          { designation: "Salade de fruits en vrac", quantiteDeclaree: "8 kg", poidsKg: 8 },
        ],
      },
    },
  });

  // Dons publiés, disponibles pour les associations
  await prisma.don.create({
    data: {
      entrepriseId: boulangerie.id,
      mode: "BORDEREAU_OUVERT",
      statut: "PUBLIE",
      categorie: "Alimentaire",
      distanceLabel: "1 km",
      publieLe: new Date(),
      articles: { create: [{ designation: "Viennoiseries invendues", quantiteDeclaree: "3 kg", poidsKg: 3 }] },
    },
  });

  await prisma.don.create({
    data: {
      entrepriseId: superette.id,
      mode: "BORDEREAU_OUVERT",
      statut: "PUBLIE",
      categorie: "Alimentaire",
      distanceLabel: "760 m",
      publieLe: new Date(),
      articles: { create: [{ designation: "Produits frais divers", quantiteDeclaree: "11 kg", poidsKg: 11 }] },
    },
  });

  await prisma.don.create({
    data: {
      entrepriseId: bioMarche.id,
      mode: "BORDEREAU_OUVERT",
      statut: "PUBLIE",
      categorie: "Non alimentaire",
      distanceLabel: "740 m",
      publieLe: new Date(),
      articles: { create: [{ designation: "Produits d'hygiène invendus", quantiteDeclaree: "14 kg", poidsKg: 14 }] },
    },
  });

  await prisma.don.create({
    data: {
      entrepriseId: epicerie.id,
      mode: "BORDEREAU_OUVERT",
      statut: "PUBLIE",
      categorie: "Alimentaire",
      distanceLabel: "1,5 km",
      publieLe: new Date(),
      articles: { create: [{ designation: "Conserves et épicerie sèche", quantiteDeclaree: "9 kg", poidsKg: 9 }] },
    },
  });

  // Don pris en charge, en cours de contrôle (écran Bon d'enlèvement) : Carrefour -> Coeur Partage
  const donEnCours = await prisma.don.create({
    data: {
      id: "don_en_cours",
      entrepriseId: carrefour.id,
      associationAssigneeId: coeurPartage.id,
      mode: "BORDEREAU_OUVERT",
      statut: "PRIS_EN_CHARGE",
      publieLe: new Date(),
      articles: {
        create: [
          { designation: "Yaourts nature x12", quantiteDeclaree: "12 unités", quantiteConstatee: "12 unités", poidsKg: 1.5, dlcOuEtat: "DLC 3 jours", temperature: "4 °C", statut: "VALIDE" },
          { designation: "Pain de mie complet", quantiteDeclaree: "6 unités", quantiteConstatee: "6 unités", poidsKg: 2.4, dlcOuEtat: "DDM 5 jours", temperature: "Ambiant", statut: "VALIDE" },
          { designation: "Salade de fruits en vrac", quantiteDeclaree: "8 kg", quantiteConstatee: "8 kg", poidsKg: 8, dlcOuEtat: "DLC dépassée", temperature: "9 °C", dlcDepassee: true, statut: "REFUSE", motifRefus: "DLC dépassée" },
        ],
      },
    },
  });

  await prisma.bonEnlevement.create({
    data: {
      numero: "2026-0145",
      donId: donEnCours.id,
      entrepriseId: carrefour.id,
      associationId: coeurPartage.id,
    },
  });

  // Historique (archives) : bons d'enlèvement et attestations déjà finalisés
  const historique: { numero: string; poids: number; assoc: string; date: string }[] = [
    { numero: "2026-0143", poids: 21.9, assoc: coeurPartage.id, date: "2026-09-18" },
    { numero: "2026-0142", poids: 18.4, assoc: coeurPartage.id, date: "2026-09-17" },
    { numero: "2026-0140", poids: 9.2, assoc: restoSolidaire.id, date: "2026-09-15" },
    { numero: "2026-0137", poids: 24.0, assoc: coeurPartage.id, date: "2026-06-12" },
  ];

  const bonsQ3: string[] = [];
  for (const h of historique) {
    const don = await prisma.don.create({
      data: {
        entrepriseId: carrefour.id,
        associationAssigneeId: h.assoc,
        statut: "CLOTURE",
        publieLe: new Date(h.date),
      },
    });
    const bon = await prisma.bonEnlevement.create({
      data: {
        numero: h.numero,
        donId: don.id,
        entrepriseId: carrefour.id,
        associationId: h.assoc,
        dateHeureEnlevement: new Date(h.date),
        poidsTotalRetenu: h.poids,
        signatureDonateurLe: new Date(h.date),
        signatureAssociationLe: new Date(h.date),
        confirme: true,
      },
    });
    if (h.numero !== "2026-0137") bonsQ3.push(bon.id);
  }

  await prisma.attestationFiscale.create({
    data: {
      numeroOrdre: "2026-ATT-Q3",
      entrepriseId: carrefour.id,
      associationId: coeurPartage.id,
      periodeDebut: new Date("2026-07-01"),
      periodeFin: new Date("2026-09-30"),
      montantCalcule: 842,
      bonsEnlevement: { connect: bonsQ3.map((id) => ({ id })) },
    },
  });

  const bon0137 = await prisma.bonEnlevement.findUnique({ where: { numero: "2026-0137" } });
  await prisma.attestationFiscale.create({
    data: {
      numeroOrdre: "2026-ATT-Q2",
      entrepriseId: carrefour.id,
      associationId: coeurPartage.id,
      periodeDebut: new Date("2026-04-01"),
      periodeFin: new Date("2026-06-30"),
      montantCalcule: 765,
      bonsEnlevement: bon0137 ? { connect: [{ id: bon0137.id }] } : undefined,
    },
  });

  const passwordHash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 10);
  await prisma.user.createMany({
    data: [
      { email: "carrefour@exemple.fr", passwordHash, nom: "Cécile Dubois", role: "ENTREPRISE", entrepriseId: carrefour.id },
      { email: "coeur@exemple.fr", passwordHash, nom: "Karim Haddad", role: "ASSOCIATION", associationId: coeurPartage.id },
      { email: "resto@exemple.fr", passwordHash, nom: "Julie Renard", role: "ASSOCIATION", associationId: restoSolidaire.id },
      { email: "bruno@exemple.fr", passwordHash, nom: "Bruno", role: "COORDINATEUR" },
    ],
  });

  // Coffre-fort documentaire : en mode démo, les obligations documentaires sont toujours
  // déjà remplies, pour ne jamais bloquer les parcours de démonstration.
  const toutesEntreprises = await prisma.entreprise.findMany();
  for (const entreprise of toutesEntreprises) {
    await creerDocument(
      { entrepriseId: entreprise.id },
      "KBIS",
      `Extrait Kbis — ${entreprise.raisonSociale}`,
      `SIRET ${entreprise.siret}`,
      ["Document généré automatiquement pour les besoins de la démonstration.", `Siège : ${entreprise.adresse}`]
    );
  }

  const toutesAssociations = await prisma.association.findMany();
  for (const association of toutesAssociations) {
    await creerDocument(
      { associationId: association.id },
      "RECEPISSE_RNA",
      `Récépissé RNA — ${association.denomination}`,
      `RNA ${association.rna}`,
      ["Document généré automatiquement pour les besoins de la démonstration."]
    );
    await creerDocument(
      { associationId: association.id },
      "STATUTS_SIGNES",
      `Statuts signés — ${association.denomination}`,
      "Statuts de l'association",
      ["Document généré automatiquement pour les besoins de la démonstration."]
    );
    if (association.rescritStatut !== "NON_DEPOSE") {
      await creerDocument(
        { associationId: association.id },
        "PREUVE_RESCRIT_FISCAL",
        `Preuve de rescrit fiscal — ${association.denomination}`,
        "Accusé de dépôt / réponse de l'administration",
        ["Document généré automatiquement pour les besoins de la démonstration."]
      );
    }
    if (association.verifiee) {
      await creerDocument(
        { associationId: association.id },
        "ATTESTATION_ASSURANCE",
        `Attestation d'assurance — ${association.denomination}`,
        "Responsabilité civile",
        ["Document généré automatiquement pour les besoins de la démonstration."]
      );
    }
    if (association.habilitationStatut !== "NON_HABILITEE") {
      await creerDocument(
        { associationId: association.id },
        "HABILITATION_AIDE_ALIMENTAIRE",
        `Habilitation aide alimentaire — ${association.denomination}`,
        "Art. L. 266-2 du code de l'action sociale et des familles",
        ["Document généré automatiquement pour les besoins de la démonstration."]
      );
    }
    if (association.declarationDdpp) {
      await creerDocument(
        { associationId: association.id },
        "DECLARATION_DDPP",
        `Déclaration DDPP — ${association.denomination}`,
        "Déclaration d'activité de manipulation de denrées",
        ["Document généré automatiquement pour les besoins de la démonstration."]
      );
    }
  }

  console.log("Seed terminé. Comptes de démonstration (mot de passe : demo1234) :");
  console.log("  Entreprise    carrefour@exemple.fr");
  console.log("  Association   coeur@exemple.fr");
  console.log("  Association   resto@exemple.fr");
  console.log("  Coordinateur  bruno@exemple.fr");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
