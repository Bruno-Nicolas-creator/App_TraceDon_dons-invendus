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
  /** Année civile des dons (reçus valorisés) ; null pour les anciennes attestations par période. */
  annee: number | null;
  emisLe: Date;
  /** true : valeur déclarée par l'entreprise ; false : ancien calcul de l'application. */
  valeurSaisieParEntreprise: boolean;
  nature: string;
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
  montant: number;
  bons: { numero: string; date: Date | null; poids: number }[];
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

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

/**
 * Reçu des dons effectués par les entreprises (article 238 bis du CGI), reprenant les rubriques du
 * formulaire officiel (Cerfa n° 16216) : numéro d'ordre, bénéficiaire et sa qualité, donateur,
 * montant en chiffres et en lettres, date, forme et nature du don. Mentions et numérotation restent
 * à faire valider par un juriste (cahier des charges, annexe C).
 */
export default function AttestationFiscaleDocument({ data, montantEnLettres }: { data: AttestationPdfData; montantEnLettres: string }) {
  const periode = data.annee
    ? `Dons remis au cours de l'année ${data.annee} (du 1er janvier au 31 décembre ${data.annee})`
    : `Du ${formatDate(data.periodeDebut)} au ${formatDate(data.periodeFin)}`;
  return (
    <Document title={`Reçu fiscal ${data.numeroOrdre}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reçu des dons effectués par les entreprises</Text>
        <Text style={styles.subtitle}>
          Article 238 bis du code général des impôts · Reçu n° {data.numeroOrdre}
        </Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Organisme bénéficiaire</Text>
            <Text style={styles.line}>{data.association.denomination}</Text>
            <Text style={styles.line}>{data.association.adresse}</Text>
            <Text style={styles.line}>RNA : {data.association.rna}</Text>
            {data.association.categorieEligibilite && (
              <Text style={styles.line}>Objet : {data.association.categorieEligibilite}</Text>
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Entreprise donatrice</Text>
            <Text style={styles.line}>{data.entreprise.raisonSociale}</Text>
            {data.entreprise.formeJuridique && <Text style={styles.line}>{data.entreprise.formeJuridique}</Text>}
            <Text style={styles.line}>{data.entreprise.adresse}</Text>
            <Text style={styles.line}>SIRET : {data.entreprise.siret}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Qualité de l&apos;organisme</Text>
        <Text style={styles.legal}>{mentionInteretGeneral(data.association)}</Text>

        <Text style={styles.sectionTitle}>Don reçu</Text>
        <View style={styles.card}>
          <Text style={{ marginBottom: 8 }}>
            Le bénéficiaire reconnaît avoir reçu, au titre des dons ouvrant droit à réduction d&apos;impôt, des biens
            d&apos;une valeur de :
          </Text>
          {/* « euros » en toutes lettres : la police standard du PDF n'affiche pas le symbole € */}
          <Text style={styles.amountLine}>
            {data.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\s/g, " ")} euros
          </Text>
          <Text style={styles.amountWords}>({montantEnLettres})</Text>
        </View>
        <Text style={styles.line}>Date des dons : {periode}.</Text>
        <Text style={styles.line}>Forme du don : autre (remises successives constatées par les bons d&apos;enlèvement ci-dessous).</Text>
        <Text style={styles.line}>Nature du don : don en nature ({data.nature}).</Text>
        <Text style={[styles.line, { marginBottom: 16 }]}>
          {data.valeurSaisieParEntreprise
            ? "Valorisation : établie par l'entreprise donatrice, sous sa responsabilité, à partir de sa comptabilité (coût de revient des biens donnés)."
            : "Valorisation : estimation calculée par l'application (attestation établie avant le 10 octobre 2026)."}
        </Text>

        <Text style={styles.sectionTitle}>Annexe : bons d&apos;enlèvement inclus</Text>
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
              <Text style={[styles.td, styles.cPoids]}>{b.poids ? b.poids.toLocaleString("fr-FR") : "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.legal}>
          Reçu établi conformément aux dispositions de l&apos;article 238 bis du code général des impôts. Les biens
          refusés lors de l&apos;enlèvement et non pris en charge par l&apos;organisme ne sont pas couverts par ce reçu.
        </Text>

        <Text style={styles.signature}>
          Fait le {formatDate(data.emisLe)}.{"\n"}Pour l&apos;association bénéficiaire,{"\n\n"}
          {data.association.denomination}
        </Text>
      </Page>
    </Document>
  );
}
