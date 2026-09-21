import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const MOT_DE_PASSE_DEMO = "demo1234";

async function main() {
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
      raisonSociale: "Carrefour City Bastille",
      formeJuridique: "SAS",
      siret: "40125333800234",
      adresse: "12 rue de la Roquette, 75011 Paris",
      secteurActivite: "Commerce de détail alimentaire",
      coutRevientKg: 2.8,
      enseigneId: enseigneCarrefour.id,
    },
  });

  const boulangerie = await prisma.entreprise.create({
    data: {
      id: "ent_boulangerie",
      raisonSociale: "Boulangerie Marceau",
      formeJuridique: "EI",
      siret: "80234511200019",
      adresse: "4 av. Marceau, 75008 Paris",
      secteurActivite: "Boulangerie-pâtisserie",
      coutRevientKg: 3.5,
    },
  });

  const superette = await prisma.entreprise.create({
    data: {
      id: "ent_superette",
      raisonSociale: "Supérette du Marché",
      formeJuridique: "SARL",
      siret: "81234567800045",
      adresse: "15 rue de la Fontaine, 75011 Paris",
      secteurActivite: "Commerce de détail alimentaire",
      coutRevientKg: 2.5,
    },
  });

  const bioMarche = await prisma.entreprise.create({
    data: {
      id: "ent_bio",
      raisonSociale: "Bio'Marché",
      formeJuridique: "SAS",
      siret: "82345678900012",
      adresse: "28 rue de Charonne, 75011 Paris",
      secteurActivite: "Commerce non alimentaire",
      coutRevientKg: 4.2,
    },
  });

  const coeurPartage = await prisma.association.create({
    data: {
      id: "assoc_coeur",
      denomination: "Coeur Partage",
      rna: "W751234567",
      adresse: "8 rue de Charonne, 75011 Paris",
      categorieEligibilite: "Aide alimentaire",
      declarationInteretGeneral: true,
      rescritStatut: "EN_ATTENTE",
      rescritDateDepot: new Date("2026-03-12"),
      verifiee: true,
      verifieeLe: new Date("2026-08-01"),
      verifieePar: "Bruno (coordinateur)",
    },
  });

  const restoSolidaire = await prisma.association.create({
    data: {
      id: "assoc_resto",
      denomination: "Resto Solidaire 11e",
      rna: "W759876543",
      adresse: "20 bd Voltaire, 75011 Paris",
      categorieEligibilite: "Aide alimentaire",
      declarationInteretGeneral: true,
      rescritStatut: "ACCORD_TACITE",
      rescritDateDepot: new Date("2025-09-01"),
      verifiee: true,
      verifieeLe: new Date("2026-07-15"),
      verifieePar: "Bruno (coordinateur)",
    },
  });

  await prisma.association.create({
    data: {
      id: "assoc_panier",
      denomination: "Panier Fraternité",
      rna: "W751122334",
      adresse: "5 rue Sedaine, 75011 Paris",
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
      rna: "W755566778",
      adresse: "3 rue de Lappe, 75011 Paris",
      categorieEligibilite: "Aide alimentaire et non alimentaire",
      declarationInteretGeneral: true,
      rescritStatut: "EN_ATTENTE",
      rescritDateDepot: new Date("2026-06-02"),
      verifiee: false,
    },
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
      distanceLabel: "900 m",
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
      distanceLabel: "1,1 km",
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
      distanceLabel: "1,4 km",
      publieLe: new Date(),
      articles: { create: [{ designation: "Produits d'hygiène invendus", quantiteDeclaree: "14 kg", poidsKg: 14 }] },
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
