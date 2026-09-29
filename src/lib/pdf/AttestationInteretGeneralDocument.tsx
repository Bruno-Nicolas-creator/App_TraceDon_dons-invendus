import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#201F1B" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 18 },

  paragraph: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 10 },
  bold: { fontFamily: "Helvetica-Bold" },

  bulletRow: { flexDirection: "row", gap: 6, marginBottom: 6, marginLeft: 8 },
  bullet: { fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },

  sectionHeading: { fontFamily: "Helvetica-Bold", fontSize: 9.5, marginTop: 6, marginBottom: 6 },

  faitA: { fontSize: 9.5, marginTop: 20, marginBottom: 28 },

  signBlock: { alignItems: "flex-end" },
  signText: { fontSize: 9.5, textAlign: "right" },
});

export type AttestationInteretGeneralPdfData = {
  entreprise: { raisonSociale: string; siret: string };
  association: { denomination: string; adresse: string; rna: string; categorieEligibilite: string | null };
};

const formatDate = (date: Date) => date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function AttestationInteretGeneralDocument({ data }: { data: AttestationInteretGeneralPdfData }) {
  const domaine = data.association.categorieEligibilite ?? "social et solidaire";

  return (
    <Document title={`Attestation interet general ${data.association.denomination}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>ATTESTATION SUR L&apos;HONNEUR</Text>
        <Text style={styles.subtitle}>Statut d&apos;association d&apos;intérêt général &amp; Mécénat d&apos;entreprise</Text>

        <Text style={styles.paragraph}>
          Je soussigné(e), agissant en qualité de représentant légal de l&apos;association{" "}
          <Text style={styles.bold}>{data.association.denomination}</Text>,
        </Text>

        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bold}>Siège social : </Text>
            {data.association.adresse}
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bold}>Numéro RNA : </Text>
            {data.association.rna}
          </Text>
        </View>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>
            Certifie sur l&apos;honneur que l&apos;association remplit l&apos;ensemble des conditions fixées par
            l&apos;article 238 bis du Code général des impôts (CGI) lui conférant le caractère d&apos;intérêt
            général :
          </Text>
        </Text>

        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bold}>Gestion désintéressée : </Text>
            L&apos;association est gérée de manière totalement bénévole et ses dirigeants ne perçoivent aucune part
            des bénéfices ou des actifs de la structure.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bold}>But non lucratif : </Text>
            Les activités et l&apos;objet de l&apos;association ne revêtent pas un caractère lucratif ou commercial
            prépondérant.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bold}>Cercle étendu de bénéficiaires : </Text>
            Les actions menées au titre de son objet ({domaine}) ne sont pas réservées à un cercle restreint de
            personnes et profitent à la collectivité.
          </Text>
        </View>

        <Text style={styles.sectionHeading}>Conséquences fiscales pour le donateur :</Text>
        <Text style={styles.paragraph}>
          En vertu de ce statut, <Text style={styles.bold}>l&apos;association est pleinement habilitée à recevoir
          des dons d&apos;entreprises</Text> (numéraire, compétences ou dons en nature/invendus){" "}
          <Text style={styles.bold}>et à émettre le reçu fiscal réglementaire Cerfa n° 16216*03</Text> permettant au
          donateur de bénéficier de la réduction d&apos;impôt sur les sociétés prévue par la législation en vigueur.
        </Text>

        <Text style={styles.paragraph}>
          Cette attestation est délivrée à l&apos;entreprise{" "}
          <Text style={styles.bold}>{data.entreprise.raisonSociale}</Text> (SIRET : {data.entreprise.siret}) pour
          faire valoir ce que de droit.
        </Text>

        <Text style={styles.faitA}>Fait le {formatDate(new Date())}</Text>

        <View style={styles.signBlock}>
          <Text style={styles.signText}>Signature du/de la représentant(e) légal(e){"\n"}Tampon de l&apos;association :</Text>
        </View>
      </Page>
    </Document>
  );
}
