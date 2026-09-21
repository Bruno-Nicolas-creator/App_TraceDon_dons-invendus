import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#201F1B" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#6B6459", marginBottom: 16 },
  row: { flexDirection: "row", gap: 16, marginBottom: 16 },
  col: { flex: 1, border: "1pt solid #E1DCCF", borderRadius: 4, padding: 10 },
  colTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 6, textTransform: "uppercase", color: "#6B6459" },
  line: { marginBottom: 2 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 6, marginTop: 4 },
  table: { border: "1pt solid #E1DCCF", borderRadius: 4, marginBottom: 12 },
  tr: { flexDirection: "row", borderBottom: "1pt solid #E1DCCF" },
  trLast: { flexDirection: "row" },
  th: { padding: 6, fontFamily: "Helvetica-Bold", fontSize: 8.5, textTransform: "uppercase", color: "#6B6459" },
  td: { padding: 6, fontSize: 9 },
  cDesignation: { flex: 2.4 },
  cQte: { flex: 1.2 },
  cPoids: { flex: 1 },
  cDlc: { flex: 1.3 },
  cTemp: { flex: 1 },
  cStatut: { flex: 1.3 },
  refuse: { color: "#8A4420" },
  totals: { flexDirection: "row", justifyContent: "flex-end", gap: 24, marginBottom: 16 },
  totalItem: { fontSize: 10 },
  totalLabel: { color: "#6B6459" },
  legal: { fontSize: 8, color: "#6B6459", lineHeight: 1.4, marginBottom: 16, border: "1pt solid #E1DCCF", borderRadius: 4, padding: 10 },
  signaturesRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  sigBox: { flex: 1, border: "1pt solid #E1DCCF", borderRadius: 4, padding: 10, minHeight: 60 },
  sigLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 4 },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  qr: { width: 64, height: 64 },
  footerText: { fontSize: 8, color: "#6B6459" },
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
  entreprise: { raisonSociale: string; adresse: string; siret: string };
  association: { denomination: string; adresse: string; rna: string };
  dateHeureEnlevement: Date | null;
  poidsTotalRetenu: number | null;
  articles: ArticlePdf[];
  signatureDonateurLe: Date | null;
  signatureAssociationLe: Date | null;
  qrDataUrl: string;
};

const formatDateHeure = (date: Date | null) =>
  date ? date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : "—";

export default function BonEnlevementDocument({ data }: { data: BonEnlevementPdfData }) {
  const nombreValides = data.articles.filter((a) => a.statut === "VALIDE").length;
  const nombreRefuses = data.articles.filter((a) => a.statut === "REFUSE").length;

  return (
    <Document title={`Bon d'enlevement ${data.numero}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Bon d&apos;enlèvement n°{data.numero}</Text>
        <Text style={styles.subtitle}>Horodaté le {formatDateHeure(data.dateHeureEnlevement)}</Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Donateur</Text>
            <Text style={styles.line}>{data.entreprise.raisonSociale}</Text>
            <Text style={styles.line}>{data.entreprise.adresse}</Text>
            <Text style={styles.line}>SIRET : {data.entreprise.siret}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Association bénéficiaire</Text>
            <Text style={styles.line}>{data.association.denomination}</Text>
            <Text style={styles.line}>{data.association.adresse}</Text>
            <Text style={styles.line}>RNA : {data.association.rna}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Détail des produits remis</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.cDesignation]}>Désignation</Text>
            <Text style={[styles.th, styles.cQte]}>Quantité</Text>
            <Text style={[styles.th, styles.cPoids]}>Poids (kg)</Text>
            <Text style={[styles.th, styles.cDlc]}>DLC / état</Text>
            <Text style={[styles.th, styles.cTemp]}>Temp.</Text>
            <Text style={[styles.th, styles.cStatut]}>Conformité</Text>
          </View>
          {data.articles.map((a, i) => {
            const estDernier = i === data.articles.length - 1;
            const estRefuse = a.statut === "REFUSE";
            return (
              <View key={i} style={estDernier ? styles.trLast : styles.tr}>
                <Text style={[styles.td, styles.cDesignation]}>{a.designation}</Text>
                <Text style={[styles.td, styles.cQte]}>{a.quantite}</Text>
                <Text style={[styles.td, styles.cPoids]}>{a.poidsKg.toLocaleString("fr-FR")}</Text>
                <Text style={[styles.td, styles.cDlc]}>{a.dlcOuEtat ?? "—"}</Text>
                <Text style={[styles.td, styles.cTemp]}>{a.temperature ?? "—"}</Text>
                <Text style={[styles.td, styles.cStatut, estRefuse ? styles.refuse : undefined]}>
                  {estRefuse ? `Refusé${a.motifRefus ? ` — ${a.motifRefus}` : ""}` : "Validé"}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totals}>
          <Text style={styles.totalItem}><Text style={styles.totalLabel}>Articles validés : </Text>{nombreValides} / {data.articles.length}</Text>
          <Text style={styles.totalItem}><Text style={styles.totalLabel}>Articles refusés : </Text>{nombreRefuses}</Text>
          <Text style={styles.totalItem}><Text style={styles.totalLabel}>Poids total retenu : </Text>{(data.poidsTotalRetenu ?? 0).toLocaleString("fr-FR")} kg</Text>
        </View>

        <Text style={styles.legal}>
          Rappel sanitaire et cadre légal (Code de la santé publique, Paquet Hygiène) : les denrées dont la DLC est
          expirée ne peuvent faire l&apos;objet d&apos;un don. Le maintien de la chaîne du froid relève de la
          responsabilité du donateur jusqu&apos;à la signature du présent bon. Conformément à la loi n° 2016-138 du
          11 février 2016 (loi Garot), la responsabilité du donateur s&apos;éteint lors de la remise physique des
          denrées à l&apos;association. Le donateur déclare remettre les denrées ci-dessus à titre gratuit, aux fins
          de don, dans le respect des conditions de conservation en vigueur. L&apos;association bénéficiaire
          reconnaît prendre possession des produits listés et en assumer la responsabilité à compter de la présente
          remise.
        </Text>

        <View style={styles.signaturesRow}>
          <View style={styles.sigBox}>
            <Text style={styles.sigLabel}>Remise — Donateur</Text>
            <Text>{formatDateHeure(data.signatureDonateurLe)}</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigLabel}>Prise en charge — Association</Text>
            <Text>{formatDateHeure(data.signatureAssociationLe)}</Text>
            <Text style={{ marginTop: 4 }}>Mention : marchandise contrôlée et conforme</Text>
          </View>
        </View>

        <View style={styles.footer}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop, this isn't an HTML img */}
          <Image src={data.qrDataUrl} style={styles.qr} />
          <Text style={styles.footerText}>
            Ce document a été généré et horodaté par la plateforme de traçabilité des dons. Le code QR permet de
            vérifier l&apos;authenticité du bon n°{data.numero}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
