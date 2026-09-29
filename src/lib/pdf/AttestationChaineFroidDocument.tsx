import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const BLEU = "#1F3B70";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#201F1B" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLEU, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 10.5, fontStyle: "italic", color: BLEU, textAlign: "center", marginBottom: 18 },

  identTable: { border: "1pt solid #C7C1B0", marginBottom: 14 },
  identRow: { flexDirection: "row", borderBottom: "1pt solid #C7C1B0" },
  identRowLast: { flexDirection: "row" },
  identLabel: { flex: 1, padding: 6, fontFamily: "Helvetica-Bold", fontSize: 9.5, color: BLEU, backgroundColor: "#EEF1F8", borderRight: "1pt solid #C7C1B0" },
  identValue: { flex: 1.4, padding: 6, fontSize: 9.5 },
  identValueBlank: { flex: 1.4, padding: 6, fontSize: 9.5, color: "#6B6459" },

  intro: { fontSize: 9.5, lineHeight: 1.45, marginBottom: 14 },

  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: BLEU, marginBottom: 6, marginTop: 4 },
  checkRow: { flexDirection: "row", gap: 6, marginBottom: 5, alignItems: "flex-start" },
  checkbox: { width: 8, height: 8, marginTop: 1.5, border: "1pt solid #201F1B" },
  checkText: { flex: 1, fontSize: 9.5, lineHeight: 1.35 },

  bulletRow: { flexDirection: "row", gap: 6, marginBottom: 4, alignItems: "flex-start" },
  bullet: { fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.35 },

  faitPour: { fontSize: 9.5, fontStyle: "italic", color: "#6B6459", marginTop: 18, marginBottom: 14 },

  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  signLeft: { fontSize: 9.5, lineHeight: 2 },
  signRight: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLEU, textAlign: "right" },
});

export type AttestationChaineFroidPdfData = {
  denomination: string;
  rna: string;
  adresse: string;
};

function LigneIdentite({
  label,
  valeur,
  dernier,
}: {
  label: string;
  valeur: string | null;
  dernier?: boolean;
}) {
  return (
    <View style={dernier ? styles.identRowLast : styles.identRow}>
      <Text style={styles.identLabel}>{label}</Text>
      <Text style={valeur ? styles.identValue : styles.identValueBlank}>{valeur ?? "…………………………………………………"}</Text>
    </View>
  );
}

export default function AttestationChaineFroidDocument({ data }: { data: AttestationChaineFroidPdfData }) {
  return (
    <Document title={`Attestation chaine du froid ${data.denomination}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>ATTESTATION SUR L&apos;HONNEUR</Text>
        <Text style={styles.subtitle}>Capacité matérielle au respect de la chaîne du froid</Text>

        <View style={styles.identTable}>
          <LigneIdentite label="Nom de l'association :" valeur={data.denomination} />
          <LigneIdentite label="Numéro RNA / SIRET :" valeur={data.rna} />
          <LigneIdentite label="Adresse du siège :" valeur={data.adresse} />
          <LigneIdentite label="Représentée par :" valeur={null} />
          <LigneIdentite label="En qualité de :" valeur={null} dernier />
        </View>

        <Text style={styles.intro}>
          Je soussigné(e), agissant en qualité de représentant légal de l&apos;association susnommée, atteste sur
          l&apos;honneur que celle-ci dispose des moyens matériels et organisationnels requis pour assurer le
          strict respect de la chaîne du froid dès la prise en charge des denrées alimentaires jusqu&apos;à leur
          redistribution finale, conformément aux dispositions réglementaires en vigueur (Paquet Hygiène / arrêté
          ministériel du 21 décembre 2009).
        </Text>

        <Text style={styles.sectionTitle}>1. Moyens logistiques et de transport</Text>
        <View style={styles.checkRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkText}>
            Véhicule frigorifique ou isotherme agréé (Immatriculation : ……………………………)
          </Text>
        </View>
        <View style={styles.checkRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkText}>
            Conteneurs / caissons isothermes rigides équipés d&apos;accumulateurs de froid (plaques eutectiques)
          </Text>
        </View>
        <View style={styles.checkRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkText}>Glacières professionnelles adaptées aux volumes transportés</Text>
        </View>
        <View style={styles.checkRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkText}>
            Thermomètre à sonde / thermomètre infrarouge pour contrôle des températures à réception
          </Text>
        </View>

        <Text style={styles.sectionTitle}>2. Moyens d&apos;entreposage et de stockage sur site</Text>
        <View style={styles.checkRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkText}>
            Réfrigérateur(s) / armoire(s) froide(s) positive(s) (température maintenue entre 0 °C et +4 °C)
          </Text>
        </View>
        <View style={styles.checkRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkText}>
            Congélateur(s) / conservateur(s) négatif(s) (température maintenue à -18 °C ou inférieure)
          </Text>
        </View>
        <View style={styles.checkRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkText}>
            Fiche de contrôle et de relevé quotidien des températures affichée et tenue à jour
          </Text>
        </View>

        <Text style={styles.sectionTitle}>3. Engagements opérationnels</Text>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Refuser systématiquement toute denrée réfrigérée ou surgelée non conforme aux seuils thermiques
            réglementaires lors du retrait.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Réduire au strict minimum les délais de transport et de mise sous froid positif/négatif.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>Ne procéder à aucune recongélation d&apos;un produit décongelé.</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Assurer la traçabilité des dons et veiller à une distribution rapide et sécurisée aux bénéficiaires.
          </Text>
        </View>

        <Text style={styles.faitPour}>Fait pour servir et valoir ce que de droit.</Text>

        <View style={styles.signRow}>
          <Text style={styles.signLeft}>
            À : ……………………………………………{"\n"}Le : _____ / _____ / 20___
          </Text>
          <Text style={styles.signRight}>
            Signature du représentant légal{"\n"}et cachet de l&apos;association :
          </Text>
        </View>
      </Page>
    </Document>
  );
}
