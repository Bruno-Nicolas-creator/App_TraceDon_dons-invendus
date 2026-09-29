import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const BLEU = "#1F3B70";

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 9.5, fontFamily: "Helvetica", color: "#201F1B" },
  content: { padding: 36 },

  headerBar: { backgroundColor: BLEU, paddingVertical: 16, paddingHorizontal: 36, marginBottom: 18 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", textAlign: "center", marginBottom: 3 },
  subtitle: { fontSize: 9, fontStyle: "italic", color: "#DCE3F2", textAlign: "center" },

  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: BLEU, marginBottom: 8, marginTop: 6 },

  box: { backgroundColor: "#EEF1F8", border: "1pt solid #C7C1B0", padding: 10, marginBottom: 12 },
  boxHeading: { fontFamily: "Helvetica-Bold", fontSize: 9.5, marginBottom: 6 },
  fieldLabel: { fontSize: 9.5, marginBottom: 2 },
  fieldValue: { fontSize: 9.5, marginBottom: 8, paddingBottom: 2, borderBottom: "1pt solid #6B6459" },
  fieldValueBlank: { fontSize: 9.5, marginBottom: 8, paddingBottom: 2, color: "#6B6459", borderBottom: "1pt solid #6B6459" },
  fieldRow: { flexDirection: "row", gap: 20 },
  fieldCol: { flex: 1 },

  intro: { fontSize: 9, fontStyle: "italic", lineHeight: 1.4, marginBottom: 8 },
  checkRow: { flexDirection: "row", gap: 6, marginBottom: 8, alignItems: "flex-start" },
  checkbox: { width: 8, height: 8, marginTop: 1.5, border: "1pt solid #201F1B" },
  checkText: { flex: 1, fontSize: 9.5, lineHeight: 1.35 },
  blankLine: { borderBottom: "1pt solid #C7C1B0", height: 14, marginLeft: 14 },

  paragraph: { fontSize: 9.5, lineHeight: 1.45, marginBottom: 8 },
  bold: { fontFamily: "Helvetica-Bold" },

  bulletRow: { flexDirection: "row", gap: 6, marginBottom: 6, alignItems: "flex-start" },
  bullet: { fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.35 },

  faitRow: { flexDirection: "row", gap: 16, marginTop: 16, marginBottom: 20 },
  faitLabel: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  faitValue: { fontSize: 9.5, color: "#6B6459" },

  signRow: { flexDirection: "row", gap: 0, border: "1pt dashed #6B6459" },
  signCol: { flex: 1, padding: 10, minHeight: 90 },
  signColBorder: { borderRight: "1pt dashed #6B6459" },
  signLabel: { fontFamily: "Helvetica-Bold", fontSize: 9.5, marginBottom: 6 },
  signMention: { fontSize: 8.5, fontStyle: "italic", lineHeight: 1.4 },
});

export type MandatSignatureBenevolePdfData = {
  denomination: string;
  rna: string;
  adresse: string;
};

function Champ({ label, valeur }: { label: string; valeur?: string | null }) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={valeur ? styles.fieldValue : styles.fieldValueBlank}>
        {valeur ?? "…………………………………………………………………"}
      </Text>
    </>
  );
}

export default function MandatSignatureBenevoleDocument({ data }: { data: MandatSignatureBenevolePdfData }) {
  return (
    <Document title={`Mandat de signature ${data.denomination}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.title}>MANDAT / DÉLÉGATION DE SIGNATURE</Text>
          <Text style={styles.subtitle}>
            Association régie par la loi du 1er juillet 1901 — Articles 1984 et suivants du Code civil
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>1. Désignation des parties</Text>

          <View style={styles.box}>
            <Text style={styles.boxHeading}>LE MANDANT (Délégant) :</Text>
            <Champ label="Je soussigné(e), Madame / Monsieur :" />
            <Champ label="Agissant en qualité de Président(e) de l'association :" valeur={data.denomination} />
            <Champ label="Dont le siège social est situé à :" valeur={data.adresse} />
            <View style={styles.fieldRow}>
              <View style={styles.fieldCol}>
                <Champ label="Numéro RNA :" valeur={data.rna} />
              </View>
              <View style={styles.fieldCol}>
                <Champ label="Numéro SIREN/SIRET (si applicable) :" />
              </View>
            </View>
          </View>

          <View style={styles.box}>
            <Text style={styles.boxHeading}>Donne par la présente pouvoir à — LE MANDATAIRE (Bénévole délégataire) :</Text>
            <Champ label="Madame / Monsieur :" />
            <Champ label="Demeurant à :" />
            <Champ label="Qualité / Mission au sein de l'association :" />
          </View>

          <Text style={styles.sectionTitle}>2. Objet et étendue du mandat de signature</Text>
          <Text style={styles.intro}>
            Le Mandataire est autorisé à signer, au nom et pour le compte de l&apos;association, les documents et
            actes suivants (cocher et compléter les mentions utiles) :
          </Text>
          <View style={styles.checkRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkText}>
              Les bordereaux de remise ou attestations de réception de marchandises / dons en nature.
            </Text>
          </View>
          <View style={styles.checkRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkText}>Autre(s) acte(s) précisément désigné(s) :</Text>
          </View>
          <View style={[styles.blankLine, { marginBottom: 4 }]} />
          <View style={[styles.blankLine, { marginBottom: 12 }]} />

          <Text style={styles.sectionTitle}>3. Durée et validité</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Acte ponctuel : </Text>
            Le présent mandat est accordé uniquement pour la réalisation de l&apos;opération visée à
            l&apos;article 2.
          </Text>
          <Text style={styles.paragraph}>
            Il est révocable à tout moment par le Président, sans préavis ni indemnité, sur simple notification
            écrite.
          </Text>

          <Text style={styles.sectionTitle}>4. Modalités d&apos;exercice et engagements</Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Le Mandataire s&apos;engage à faire précéder chacune de ses signatures de la mention « Par délégation
              du Président ».
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Le présent mandat est strictement personnel : le Mandataire ne peut en aucun cas subdéléguer sa
              signature à un tiers.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Le Mandataire s&apos;engage à agir dans le strict respect de l&apos;objet social et des statuts de
              l&apos;association, et à rendre compte régulièrement au Président des actes signés (remise
              systématique d&apos;une copie ou d&apos;un double des documents signés).
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Les actes signés par le Mandataire dans le cadre et les limites du présent mandat engagent
              directement l&apos;association.
            </Text>
          </View>

          <View style={styles.faitRow}>
            <Text style={styles.faitLabel}>Fait en deux exemplaires originaux à :</Text>
            <Text style={styles.faitValue}>……………………………………………</Text>
            <Text style={styles.faitLabel}>Le :</Text>
            <Text style={styles.faitValue}>…… / …… / 20……</Text>
          </View>

          <View style={styles.signRow}>
            <View style={[styles.signCol, styles.signColBorder]}>
              <Text style={styles.signLabel}>LE PRÉSIDENT (Le Mandant)</Text>
              <Text style={styles.signMention}>
                Signature précédée de la mention manuscrite :{"\n"}« Bon pour pouvoir »
              </Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signLabel}>LE BÉNÉVOLE (Le Mandataire)</Text>
              <Text style={styles.signMention}>
                Signature précédée de la mention manuscrite :{"\n"}« Bon pour acceptation de pouvoir »
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
