import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";

const VERT = "#1E4B36";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, fontFamily: "Helvetica", color: "#201F1B" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: VERT, textAlign: "center", marginBottom: 2 },
  subtitle: { fontSize: 9, fontStyle: "italic", color: "#6B6459", textAlign: "center", marginBottom: 16 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: VERT, marginBottom: 6, marginTop: 14 },

  // Section 1 : tableau identité 2 colonnes x 6 lignes (label + valeur, x2)
  identTable: { border: "1pt solid #201F1B" },
  identRow: { flexDirection: "row", borderBottom: "1pt solid #201F1B" },
  identRowLast: { flexDirection: "row" },
  identLabel: { flex: 1.3, padding: 5, fontFamily: "Helvetica-Bold", fontSize: 8.5, borderRight: "1pt solid #201F1B" },
  identValue: { flex: 1.5, padding: 5, fontSize: 8.5, borderRight: "1pt solid #201F1B" },
  identValueLast: { flex: 1.5, padding: 5, fontSize: 8.5 },

  // Section 2 : tableau produits
  table: { border: "1pt solid #201F1B", marginBottom: 4 },
  thRow: { flexDirection: "row", backgroundColor: VERT },
  th: { padding: 5, fontFamily: "Helvetica-Bold", fontSize: 8, color: "#FFFFFF" },
  tr: { flexDirection: "row", borderTop: "1pt solid #201F1B" },
  td: { padding: 5, fontSize: 8.5, borderRight: "1pt solid #201F1B" },
  tdLast: { padding: 5, fontSize: 8.5 },
  cNum: { flex: 0.4, borderRight: "1pt solid #201F1B" },
  cDesignation: { flex: 2.2, borderRight: "1pt solid #201F1B" },
  cQte: { flex: 1, borderRight: "1pt solid #201F1B" },
  cPoids: { flex: 1, borderRight: "1pt solid #201F1B" },
  cDlc: { flex: 1, borderRight: "1pt solid #201F1B" },
  cTemp: { flex: 1, borderRight: "1pt solid #201F1B" },
  cObs: { flex: 1.6 },
  refuse: { color: "#8A4420" },

  // Section 3 : contrôles (cases + texte légal)
  controle: { flexDirection: "row", gap: 6, marginBottom: 6, alignItems: "flex-start" },
  case_: { fontSize: 10, marginTop: -1 },
  controleTexte: { flex: 1, fontSize: 8.5, lineHeight: 1.35 },

  // Section 4 : totaux
  totauxTable: { border: "1pt solid #201F1B", width: "55%" },
  totauxRow: { flexDirection: "row", borderBottom: "1pt solid #201F1B" },
  totauxRowLast: { flexDirection: "row" },
  totauxLabel: { flex: 1, padding: 5, fontFamily: "Helvetica-Bold", fontSize: 8.5, backgroundColor: "#EFEBE1", borderRight: "1pt solid #201F1B" },
  totauxValue: { flex: 1, padding: 5, fontSize: 8.5 },

  // Section 5 : observations
  observations: { border: "1pt solid #201F1B", padding: 8, minHeight: 70 },
  observationsPlaceholder: { fontSize: 8, fontStyle: "italic", color: "#6B6459", marginBottom: 8 },
  observationsLine: { borderBottom: "1pt solid #C7C1B0", height: 16 },

  // Section 6 (page 2) : signatures
  signIntro: { fontSize: 9, marginBottom: 8 },
  signRow: { flexDirection: "row", border: "1pt solid #201F1B" },
  signCol: { flex: 1, padding: 8, minHeight: 110 },
  signColBorder: { borderRight: "1pt solid #201F1B" },
  signLabel: { fontFamily: "Helvetica-Bold", fontSize: 9.5, marginBottom: 6 },
  signSub: { fontSize: 8.5, marginBottom: 4 },
  signHorodatage: { fontSize: 8, color: "#6B6459" },

  footerRule: { borderTop: "1pt solid #E1DCCF", marginTop: 20, paddingTop: 8 },
  footerText: { fontSize: 7.5, fontStyle: "italic", color: "#6B6459" },

  qrFooter: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  qr: { width: 56, height: 56 },
  qrText: { fontSize: 7.5, color: "#6B6459", flex: 1 },
});

export type ArticlePdf = {
  designation: string;
  quantite: string;
  poidsKg: number;
  dlcOuEtat: string | null;
  temperature: string | null;
  statut: "EN_ATTENTE" | "VALIDE" | "REFUSE";
  motifRefus: string | null;
};

export type BonEnlevementPdfData = {
  numero: string;
  entreprise: { raisonSociale: string; adresse: string; siret: string; referentDonNom: string | null };
  association: { denomination: string; rna: string; habilitationLabel: string };
  benevoleCollecteurNom: string | null;
  numeroConvention: string | null;
  dateHeureEnlevement: Date | null;
  poidsTotalRetenu: number | null;
  articles: ArticlePdf[];
  signatureDonateurLe: Date | null;
  signatureAssociationLe: Date | null;
  qrDataUrl: string;
};

const formatDate = (date: Date | null) => (date ? date.toLocaleDateString("fr-FR", { dateStyle: "long" }) : "—");
const formatHeure = (date: Date | null) => (date ? date.toLocaleTimeString("fr-FR", { timeStyle: "short" }) : "—");
const formatDateHeure = (date: Date | null) =>
  date ? date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : "—";

function LigneIdentite({
  labelGauche,
  valeurGauche,
  labelDroite,
  valeurDroite,
  dernier,
}: {
  labelGauche: string;
  valeurGauche: string;
  labelDroite: string;
  valeurDroite: string;
  dernier?: boolean;
}) {
  return (
    <View style={dernier ? styles.identRowLast : styles.identRow}>
      <Text style={styles.identLabel}>{labelGauche}</Text>
      <Text style={styles.identValue}>{valeurGauche}</Text>
      <Text style={styles.identLabel}>{labelDroite}</Text>
      <Text style={styles.identValueLast}>{valeurDroite}</Text>
    </View>
  );
}

export default function BonEnlevementDocument({ data }: { data: BonEnlevementPdfData }) {
  const nombreValides = data.articles.filter((a) => a.statut === "VALIDE").length;

  return (
    <Document title={`Bordereau de collecte ${data.numero}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>BORDEREAU DE COLLECTE DE DONS ALIMENTAIRES</Text>
        <Text style={styles.subtitle}>Document établi en application de la convention de don en vigueur entre les parties</Text>

        <Text style={styles.sectionTitle}>1. Identification des parties</Text>
        <View style={styles.identTable}>
          <LigneIdentite
            labelGauche="Entreprise donatrice"
            valeurGauche={data.entreprise.raisonSociale}
            labelDroite="Nom Association réceptrice"
            valeurDroite={data.association.denomination}
          />
          <LigneIdentite
            labelGauche="SIRET"
            valeurGauche={data.entreprise.siret}
            labelDroite="RNA"
            valeurDroite={data.association.rna}
          />
          <LigneIdentite
            labelGauche="Adresse du site"
            valeurGauche={data.entreprise.adresse}
            labelDroite="Nom du bénévole mandaté"
            valeurDroite={data.benevoleCollecteurNom ?? "—"}
          />
          <LigneIdentite
            labelGauche="N° de convention"
            valeurGauche={data.numeroConvention ?? "—"}
            labelDroite="Habilitation"
            valeurDroite={data.association.habilitationLabel}
          />
          <LigneIdentite
            labelGauche="N° bordereau"
            valeurGauche={data.numero}
            labelDroite="Date de la collecte"
            valeurDroite={formatDate(data.dateHeureEnlevement)}
          />
          <LigneIdentite
            labelGauche="Nom du référent don"
            valeurGauche={data.entreprise.referentDonNom ?? "—"}
            labelDroite="Heure de la collecte"
            valeurDroite={formatHeure(data.dateHeureEnlevement)}
            dernier
          />
        </View>

        <Text style={styles.sectionTitle}>2. Détail des produits collectés ou liste jointe</Text>
        <View style={styles.table}>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.cNum]}>N°</Text>
            <Text style={[styles.th, styles.cDesignation]}>Désignation du produit</Text>
            <Text style={[styles.th, styles.cQte]}>Quantité (unités)</Text>
            <Text style={[styles.th, styles.cPoids]}>Poids net (kg)</Text>
            <Text style={[styles.th, styles.cDlc]}>DLC / DDM</Text>
            <Text style={[styles.th, styles.cTemp]}>T° relevée</Text>
            <Text style={[styles.th, styles.cObs]}>Observations</Text>
          </View>
          {data.articles.map((a, i) => {
            const estRefuse = a.statut === "REFUSE";
            return (
              <View key={i} style={styles.tr}>
                <Text style={[styles.td, styles.cNum]}>{i + 1}</Text>
                <Text style={[styles.td, styles.cDesignation]}>{a.designation}</Text>
                <Text style={[styles.td, styles.cQte]}>{a.quantite}</Text>
                <Text style={[styles.td, styles.cPoids]}>{a.poidsKg.toLocaleString("fr-FR")}</Text>
                <Text style={[styles.td, styles.cDlc]}>{a.dlcOuEtat ?? "—"}</Text>
                <Text style={[styles.td, styles.cTemp]}>{a.temperature ?? "—"}</Text>
                <Text style={[styles.tdLast, styles.cObs, estRefuse ? styles.refuse : undefined]}>
                  {estRefuse ? `Refusé${a.motifRefus ? ` — ${a.motifRefus}` : ""}` : "Validé"}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>3. Contrôles effectués lors de la collecte</Text>
        <View style={styles.controle}>
          <Text style={styles.case_}>☐</Text>
          <Text style={styles.controleTexte}>
            Auto contrôle préalable du magasin : tri préalable, vérification de l&apos;intégrité des emballages,
            DLC non dépassée, lisibilité des étiquettes et allergènes, absence de lots sous alerte sanitaire.
          </Text>
        </View>
        <View style={styles.controle}>
          <Text style={styles.case_}>☐</Text>
          <Text style={styles.controleTexte}>
            Aucune DLC &lt; 48 h dans ce lot au moment où l&apos;association prend en charge le don (article D.
            541-310 du Code de l&apos;environnement).
          </Text>
        </View>
        <View style={styles.controle}>
          <Text style={styles.case_}>☐</Text>
          <Text style={styles.controleTexte}>
            Dérogation : ce lot contient des produits à DLC &lt; 48h (expirant au plus tôt ce jour à minuit).
            L&apos;association les accepte et atteste être en mesure de les distribuer immédiatement avant
            l&apos;expiration de leur DLC.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>4. Quantité totale</Text>
        <View style={styles.totauxTable}>
          <View style={styles.totauxRow}>
            <Text style={styles.totauxLabel}>Articles validés (unités)</Text>
            <Text style={styles.totauxValue}>{nombreValides} / {data.articles.length}</Text>
          </View>
          <View style={styles.totauxRowLast}>
            <Text style={styles.totauxLabel}>Poids total collecté (kg)</Text>
            <Text style={styles.totauxValue}>{(data.poidsTotalRetenu ?? 0).toLocaleString("fr-FR")}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>5. Observations du bénéficiaire du don</Text>
        <View style={styles.observations}>
          <Text style={styles.observationsPlaceholder}>
            (état des produits, rupture de chaîne du froid, refus partiel — voir aussi la colonne Observations
            ci-dessus)
          </Text>
          <View style={styles.observationsLine} />
          <View style={styles.observationsLine} />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>6. Validation et signatures</Text>
        <Text style={styles.signIntro}>Fait en deux exemplaires originaux, un pour chaque partie.</Text>

        <View style={styles.signRow}>
          <View style={[styles.signCol, styles.signColBorder]}>
            <Text style={styles.signLabel}>Pour l&apos;entreprise donatrice,</Text>
            <Text style={styles.signSub}>Nom et signature :</Text>
            <Text style={styles.signHorodatage}>{formatDateHeure(data.signatureDonateurLe)}</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>Pour l&apos;association réceptrice,</Text>
            <Text style={styles.signSub}>Nom et signature / Cachet :</Text>
            <Text style={styles.signSub}>Mention « marchandise contrôlée et conforme »</Text>
            <Text style={styles.signHorodatage}>{formatDateHeure(data.signatureAssociationLe)}</Text>
          </View>
        </View>

        <View style={styles.footerRule}>
          <Text style={styles.footerText}>
            Ce bordereau et ses annexes doivent être conservés par les deux parties pendant au moins 6 ans, à des
            fins de justification fiscale et sanitaire.
          </Text>
        </View>

        <View style={styles.qrFooter}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop, this isn't an HTML img */}
          <Image src={data.qrDataUrl} style={styles.qr} />
          <Text style={styles.qrText}>
            Ce document a été généré et horodaté par la plateforme de traçabilité des dons. Le code QR permet de
            vérifier l&apos;authenticité du bordereau n°{data.numero}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
