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
  paragraph: { marginBottom: 10, lineHeight: 1.4 },
  bullet: { marginBottom: 8, lineHeight: 1.4 },
  legal: { fontSize: 8, color: "#6B6459", lineHeight: 1.4, marginBottom: 16 },
  signature: { marginTop: 24, fontSize: 9 },
});

export type AttestationInteretGeneralPdfData = {
  entreprise: { raisonSociale: string; siret: string };
  association: {
    denomination: string;
    adresse: string;
    rna: string;
    categorieEligibilite: string | null;
    declarationInteretGeneral: boolean;
    rescritStatut: string;
    rescritDateDepot: Date | null;
  };
};

const formatDate = (date: Date) => date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function mentionRescrit(a: AttestationInteretGeneralPdfData["association"]): string {
  switch (a.rescritStatut) {
    case "ACCORD_TACITE":
      return "Cette qualification a fait l'objet d'une demande de rescrit fiscal restée sans réponse de l'administration au-delà de 6 mois, valant accord tacite.";
    case "REPONSE_RECUE":
      return "Cette qualification a été confirmée par rescrit fiscal de l'administration.";
    case "EN_ATTENTE":
      return `Une demande de rescrit fiscal a été déposée le ${
        a.rescritDateDepot ? formatDate(a.rescritDateDepot) : "—"
      } ; la présente attestation vaut déclaration auto-déclarative dans l'attente de la réponse de l'administration.`;
    default:
      return "Aucune demande de rescrit fiscal n'a été déposée à ce jour ; la présente attestation vaut déclaration auto-déclarative.";
  }
}

export default function AttestationInteretGeneralDocument({ data }: { data: AttestationInteretGeneralPdfData }) {
  const domaine = data.association.categorieEligibilite ?? "social et solidaire";

  return (
    <Document title={`Attestation intérêt général — ${data.association.denomination}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Attestation sur l&apos;honneur</Text>
        <Text style={styles.subtitle}>
          Statut d&apos;association d&apos;intérêt général — Article 238 bis du code général des impôts (CGI)
        </Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Association déclarante</Text>
            <Text style={styles.line}>{data.association.denomination}</Text>
            <Text style={styles.line}>{data.association.adresse}</Text>
            <Text style={styles.line}>RNA : {data.association.rna}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Entreprise donatrice</Text>
            <Text style={styles.line}>{data.entreprise.raisonSociale}</Text>
            <Text style={styles.line}>SIRET : {data.entreprise.siret}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          L&apos;association {data.association.denomination}, par l&apos;intermédiaire de son représentant légal,
          certifie sur l&apos;honneur que l&apos;association remplit l&apos;ensemble des conditions fixées par
          l&apos;article 238 bis du code général des impôts lui conférant le caractère d&apos;intérêt général :
        </Text>

        <Text style={styles.bullet}>
          • Gestion désintéressée : l&apos;association est gérée de manière bénévole et ses dirigeants ne perçoivent
          aucune part des bénéfices ou des actifs de la structure.
        </Text>
        <Text style={styles.bullet}>
          • But non lucratif : les activités et l&apos;objet de l&apos;association ne revêtent pas un caractère
          lucratif ou commercial prépondérant.
        </Text>
        <Text style={styles.bullet}>
          • Cercle étendu de bénéficiaires : les actions menées au titre de son objet ({domaine}) ne sont pas
          réservées à un cercle restreint de personnes et profitent à la collectivité.
        </Text>

        <Text style={styles.paragraph}>
          En vertu de ce statut, l&apos;association est habilitée à recevoir des dons de l&apos;entreprise{" "}
          {data.entreprise.raisonSociale} (SIRET : {data.entreprise.siret}), en numéraire, en compétences ou en
          nature (invendus), et à lui permettre de bénéficier de la réduction d&apos;impôt sur les sociétés prévue
          par la législation en vigueur.
        </Text>

        <Text style={styles.legal}>{mentionRescrit(data.association)}</Text>

        <Text style={styles.legal}>
          Cette attestation est délivrée à l&apos;entreprise {data.entreprise.raisonSociale} pour faire valoir ce
          que de droit. L&apos;association bénéficiaire est seule responsable de l&apos;exactitude des informations
          qui y figurent.
        </Text>

        <Text style={styles.signature}>
          Fait le {formatDate(new Date())}.{"\n"}Pour l&apos;association,{"\n\n"}
          {data.association.denomination}
        </Text>
      </Page>
    </Document>
  );
}
