import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#201F1B" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#6B6459", marginBottom: 16 },
  row: { flexDirection: "row", gap: 16, marginBottom: 16 },
  col: { flex: 1, border: "1pt solid #E1DCCF", borderRadius: 4, padding: 10 },
  colTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 6, textTransform: "uppercase", color: "#6B6459" },
  line: { marginBottom: 2 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 6, marginTop: 4 },
  card: { border: "1pt solid #E1DCCF", borderRadius: 4, padding: 12, marginBottom: 16 },
  amountLine: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  amountWords: { fontSize: 9, fontStyle: "italic", color: "#6B6459" },
  table: { border: "1pt solid #E1DCCF", borderRadius: 4, marginBottom: 16 },
  tr: { flexDirection: "row", borderBottom: "1pt solid #E1DCCF" },
  trLast: { flexDirection: "row" },
  th: { padding: 6, fontFamily: "Helvetica-Bold", fontSize: 8.5, textTransform: "uppercase", color: "#6B6459" },
  td: { padding: 6, fontSize: 9 },
  cNumero: { flex: 1 },
  cDate: { flex: 1 },
  cPoids: { flex: 1 },
  legal: { fontSize: 8, color: "#6B6459", lineHeight: 1.4, marginBottom: 16 },
  signature: { marginTop: 24, fontSize: 9 },
});

export type AttestationPdfData = {
  numeroOrdre: string;
  entreprise: { raisonSociale: string; formeJuridique: string | null; adresse: string; siret: string };
  association: {
    denomination: string;
    adresse: string;
    rna: string;
    categorieEligibilite: string | null;
    declarationInteretGeneral: boolean;
    rescritStatut: string;
    rescritDateDepot: Date | null;
  };
  periodeDebut: Date;
  periodeFin: Date;
  montantCalcule: number;
  bons: { numero: string; date: Date | null; poids: number }[];
};

const formatDate = (date: Date) => date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function mentionInteretGeneral(a: AttestationPdfData["association"]): string {
  if (!a.declarationInteretGeneral) return "Organisme non déclaré d'intérêt général.";
  switch (a.rescritStatut) {
    case "ACCORD_TACITE":
      return "Organisme d'intérêt général (déclaration auto-déclarative ; demande de rescrit fiscal restée sans réponse de l'administration au-delà de 6 mois, valant accord tacite).";
    case "REPONSE_RECUE":
      return "Organisme d'intérêt général, confirmé par rescrit fiscal de l'administration.";
    case "EN_ATTENTE":
      return `Organisme d'intérêt général (déclaration auto-déclarative ; demande de rescrit fiscal déposée le ${
        a.rescritDateDepot ? formatDate(a.rescritDateDepot) : "—"
      }, réponse en attente).`;
    default:
      return "Organisme d'intérêt général (déclaration auto-déclarative ; aucune demande de rescrit fiscal déposée).";
  }
}

export default function AttestationFiscaleDocument({ data, montantEnLettres }: { data: AttestationPdfData; montantEnLettres: string }) {
  return (
    <Document title={`Attestation de don ${data.numeroOrdre}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Attestation de don en nature</Text>
        <Text style={styles.subtitle}>
          N° d&apos;ordre {data.numeroOrdre} — Article 238 bis du code général des impôts
        </Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Entreprise donatrice</Text>
            <Text style={styles.line}>{data.entreprise.raisonSociale}</Text>
            {data.entreprise.formeJuridique && <Text style={styles.line}>{data.entreprise.formeJuridique}</Text>}
            <Text style={styles.line}>{data.entreprise.adresse}</Text>
            <Text style={styles.line}>SIRET : {data.entreprise.siret}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Organisme bénéficiaire</Text>
            <Text style={styles.line}>{data.association.denomination}</Text>
            <Text style={styles.line}>{data.association.adresse}</Text>
            <Text style={styles.line}>RNA : {data.association.rna}</Text>
            {data.association.categorieEligibilite && (
              <Text style={styles.line}>Objet : {data.association.categorieEligibilite}</Text>
            )}
          </View>
        </View>

        <Text style={styles.legal}>{mentionInteretGeneral(data.association)}</Text>

        <Text style={styles.sectionTitle}>Période couverte</Text>
        <Text style={{ marginBottom: 16 }}>
          Du {formatDate(data.periodeDebut)} au {formatDate(data.periodeFin)}
        </Text>

        <Text style={styles.sectionTitle}>Nature et valeur du don</Text>
        <View style={styles.card}>
          <Text style={{ marginBottom: 8 }}>
            Don en nature de denrées alimentaires, dont la description physique détaillée figure en annexe
            (bons d&apos;enlèvement listés ci-dessous), sans mention de valeur sur ces bons.
          </Text>
          <Text style={styles.amountLine}>{data.montantCalcule.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</Text>
          <Text style={styles.amountWords}>({montantEnLettres})</Text>
        </View>

        <Text style={styles.sectionTitle}>Annexe — bons d&apos;enlèvement inclus</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.cNumero]}>N° de bon</Text>
            <Text style={[styles.th, styles.cDate]}>Date d&apos;enlèvement</Text>
            <Text style={[styles.th, styles.cPoids]}>Poids retenu (kg)</Text>
          </View>
          {data.bons.map((b, i) => (
            <View key={b.numero} style={i === data.bons.length - 1 ? styles.trLast : styles.tr}>
              <Text style={[styles.td, styles.cNumero]}>{b.numero}</Text>
              <Text style={[styles.td, styles.cDate]}>{b.date ? formatDate(b.date) : "—"}</Text>
              <Text style={[styles.td, styles.cPoids]}>{b.poids.toLocaleString("fr-FR")}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.legal}>
          Cette attestation est établie conformément aux dispositions de l&apos;article 238 bis du code général des
          impôts. L&apos;association bénéficiaire est seule responsable de l&apos;exactitude des informations qui y
          figurent. L&apos;entreprise donatrice ne peut prétendre à la réduction d&apos;impôt à raison des denrées
          qui auraient été refusées et non prises en charge par l&apos;association.
        </Text>

        <Text style={styles.signature}>
          Fait le {formatDate(new Date())}.{"\n"}Pour l&apos;association bénéficiaire,{"\n\n"}
          {data.association.denomination}
        </Text>
      </Page>
    </Document>
  );
}
