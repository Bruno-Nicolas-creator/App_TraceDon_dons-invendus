import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#201F1B", lineHeight: 1.4 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 2, textAlign: "center" },
  subtitle: { fontSize: 10, color: "#6B6459", marginBottom: 4, textAlign: "center" },
  base: { fontSize: 8, color: "#6B6459", marginBottom: 18, textAlign: "center" },
  h2: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 4, marginBottom: 6 },
  h3: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  h4: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 3 },
  p: { marginBottom: 6 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletMark: { width: 10 },
  bulletText: { flex: 1 },
  partie: { border: "1pt solid #E1DCCF", borderRadius: 4, padding: 10, marginBottom: 8 },
  signBlock: { flexDirection: "row", gap: 24, marginTop: 20 },
  signCol: { flex: 1 },
  signLabel: { fontFamily: "Helvetica-Bold", marginBottom: 24 },
  annexTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 4, marginBottom: 8 },
});

export type ConventionPdfData = {
  dureeAns: number;
  entreprise: {
    raisonSociale: string;
    formeJuridique: string | null;
    adresse: string;
    siret: string;
    secteurActivite: string | null;
  };
  association: {
    denomination: string;
    adresse: string;
    rna: string;
    categorieEligibilite: string | null;
  };
  representantEntreprise: string;
  representantAssociation: string;
};

const CONSIDERANTS = [
  "la loi n° 2016-138 du 11 février 2016 relative à la lutte contre le gaspillage alimentaire (« loi Garot »), qui pose le principe d'une hiérarchie des actions de lutte contre le gaspillage (prévention, don, alimentation animale, valorisation) et interdit la dénaturation volontaire des denrées consommables ;",
  "l'ordonnance n° 2019-1069 du 21 octobre 2019 relative à la lutte contre le gaspillage alimentaire, qui étend cette obligation aux opérateurs de la restauration collective, de l'industrie agroalimentaire et du commerce de gros dépassant certains seuils ;",
  "le règlement (CE) n° 178/2002 du 28 janvier 2002 posant le principe de la responsabilité des exploitants du secteur alimentaire à chaque étape de la production, de la transformation et de la distribution ;",
  "les règlements (CE) n° 852/2004 et n° 853/2004 du 29 avril 2004 relatifs à l'hygiène des denrées alimentaires et aux conditions d'agrément sanitaire ;",
  "le décret n° 2016-1962 du 28 décembre 2016 relatif aux dons de denrées alimentaires entre un commerce de détail et une association habilitée ;",
  "les arrêtés du 21 décembre 2009 et du 8 octobre 2013 fixant les températures maximales de conservation des denrées alimentaires ;",
  "l'arrêté du 8 juin 2006 relatif aux dérogations à l'agrément sanitaire, notamment pour la cession de denrées à des établissements caritatifs ;",
  "l'arrêté du 12 avril 2017 fixant les catégories de denrées exclues du don alimentaire ;",
  "l'instruction technique DGAL/SDSSA/2017-551 du 6 juillet 2017 relative aux dons alimentaires en faveur des associations caritatives ;",
  "les articles L. 266-1 et L. 266-2 du code de l'action sociale et des familles, relatifs à l'habilitation des associations d'aide alimentaire ;",
  "l'article 238 bis du code général des impôts, relatif à la réduction d'impôt applicable aux dons en nature consentis à des organismes d'intérêt général.",
];

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

export default function ConventionDocument({ data }: { data: ConventionPdfData }) {
  const { entreprise, association } = data;
  const activite = entreprise.secteurActivite ?? "une activité commerciale";
  const finBail = `${data.dureeAns} an${data.dureeAns > 1 ? "s" : ""}`;

  return (
    <Document title={`Convention de don — ${entreprise.raisonSociale} / ${association.denomination}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONVENTION DE DON DE DENRÉES ALIMENTAIRES</Text>
        <Text style={styles.subtitle}>
          Entre {entreprise.raisonSociale} et {association.denomination}
        </Text>
        <Text style={styles.base}>
          Établie en application des articles L. 541-15-5 et L. 541-15-6 du code de l&apos;environnement, de
          l&apos;article L. 230-6 du code rural et de la pêche maritime, des articles L. 266-1 et L. 266-2 du code
          de l&apos;action sociale et des familles, et de l&apos;article 238 bis du code général des impôts.
        </Text>

        <Text style={styles.h2}>ENTRE LES SOUSSIGNÉS :</Text>

        <View style={styles.partie}>
          <Text>
            La société {entreprise.raisonSociale}{entreprise.formeJuridique ? `, ${entreprise.formeJuridique},` : ","}{" "}
            dont le siège social est situé {entreprise.adresse}, immatriculée sous le numéro SIRET{" "}
            {entreprise.siret}, représentée par {data.representantEntreprise}, dûment habilité(e) aux fins des
            présentes,
          </Text>
          <Text style={{ marginTop: 4, fontFamily: "Helvetica-Bold" }}>
            Ci-après dénommée le « DONATEUR », d&apos;une part,
          </Text>
        </View>

        <Text style={{ textAlign: "center", marginBottom: 8, fontFamily: "Helvetica-Bold" }}>ET</Text>

        <View style={styles.partie}>
          <Text>
            L&apos;association {association.denomination}, association régie par la loi du 1er juillet 1901,
            domiciliée {association.adresse}, enregistrée sous le numéro RNA {association.rna}, représentée par{" "}
            {data.representantAssociation}, dûment habilité(e) aux fins des présentes,
          </Text>
          <Text style={{ marginTop: 4, fontFamily: "Helvetica-Bold" }}>
            Ci-après dénommée l&apos;« ASSOCIATION », d&apos;autre part,
          </Text>
        </View>

        <Text style={styles.p}>
          Ci-après désignées ensemble les « Parties » ou individuellement une « Partie ».
        </Text>

        <Text style={styles.h2}>CONSIDÉRANT :</Text>
        <Bullets items={CONSIDERANTS} />

        <Text style={styles.h2}>IL A ÉTÉ EXPOSÉ QUE :</Text>
        <Text style={styles.p}>
          Le DONATEUR exerce {activite}, dans le cadre de laquelle il peut être conduit à retirer de la vente ou de
          la production des denrées encore consommables. Dans une démarche de lutte contre le gaspillage alimentaire
          et de solidarité, il souhaite céder ces denrées à titre gratuit à l&apos;ASSOCIATION.
        </Text>
        <Text style={styles.p}>
          L&apos;ASSOCIATION déclare être habilitée, conformément aux articles L. 266-1 et L. 266-2 du code de
          l&apos;action sociale et des familles, à recevoir des denrées alimentaires destinées à la mise en œuvre de
          l&apos;aide alimentaire{association.categorieEligibilite ? ` (${association.categorieEligibilite})` : ""},
          et disposer des moyens humains et matériels nécessaires à la réception, au transport et, le cas échéant,
          au stockage de ces denrées dans le respect des règles d&apos;hygiène et de sécurité sanitaire en vigueur.
        </Text>
        <Text style={styles.p}>
          Les Parties se sont rapprochées afin de formaliser les modalités de leur partenariat dans les conditions
          ci-après définies.
        </Text>

        <Text style={styles.h2}>CECI EXPOSÉ, IL A ÉTÉ CONVENU CE QUI SUIT :</Text>

        <Text style={styles.h3}>ARTICLE 1 — OBJET</Text>
        <Text style={styles.p}>
          La présente convention a pour objet de définir les conditions dans lesquelles le DONATEUR cède à
          l&apos;ASSOCIATION, à titre gratuit et sans contrepartie, des denrées alimentaires encore consommables
          mais qu&apos;il ne commercialise plus.
        </Text>
        <Text style={styles.p}>
          Ce don est librement consenti par le DONATEUR et librement accepté par l&apos;ASSOCIATION. La présente
          convention ne comporte aucune obligation de quantité minimale à donner ou à collecter, et ne revêt aucun
          caractère d&apos;exclusivité : le DONATEUR conserve la faculté de conclure des conventions similaires avec
          d&apos;autres associations habilitées.
        </Text>
        <Text style={styles.p}>
          La présente convention ne constitue en aucune manière un contrat de société, un contrat de travail, ni un
          contrat de vente. L&apos;ASSOCIATION devient propriétaire des denrées, et en assume la responsabilité, à
          compter de la signature contradictoire du bordereau d&apos;enlèvement visé à l&apos;article 4.3.
        </Text>

        <Text style={styles.h3}>ARTICLE 2 — DENRÉES CONCERNÉES</Text>
        <Text style={styles.h4}>2.1 Nature des denrées</Text>
        <Text style={styles.p}>
          Le DONATEUR est seul décisionnaire, en fonction de ses stocks et disponibilités, du choix des denrées
          proposées au don. Il garantit que les denrées cédées sont conformes, au jour de leur retrait, aux
          dispositions réglementaires relatives à la sécurité sanitaire des aliments, et qu&apos;aucune denrée
          relevant des catégories exclues par l&apos;arrêté du 12 avril 2017 modifié ne figure dans les lots donnés.
        </Text>
        <Text style={styles.p}>
          Le don de denrées à date limite de consommation (DLC) courte doit demeurer exceptionnel. Dans ce cas, le
          DONATEUR s&apos;engage à ne mettre à disposition que des denrées dont la DLC est égale ou supérieure à 24
          heures au moment de la prise en charge ; l&apos;ASSOCIATION ne récupère de telles denrées que si elle est
          en mesure de les redistribuer avant leur péremption.
        </Text>
        <Text style={styles.h4}>2.2 Conditionnement et étiquetage</Text>
        <Text style={styles.p}>
          Les denrées cédées doivent comporter un étiquetage conforme aux mentions obligatoires en vigueur. Par
          exception, l&apos;ASSOCIATION peut accepter un lot dont l&apos;étiquetage est erroné ou incomplet, à
          condition que le DONATEUR lui communique par écrit les mentions rectifiées, que l&apos;ASSOCIATION devra
          rendre accessibles aux bénéficiaires finaux de façon claire et lisible.
        </Text>
        <Text style={styles.h4}>2.3 Droit de refus de l&apos;ASSOCIATION</Text>
        <Text style={styles.p}>
          L&apos;ASSOCIATION se réserve le droit de refuser, ponctuellement, tout ou partie d&apos;un don, en
          fonction des besoins des personnes accueillies, du résultat du contrôle visé à l&apos;article 4.2, ou de
          ses capacités logistiques du moment. Elle en informe alors le DONATEUR dans les meilleurs délais afin
          qu&apos;une solution alternative puisse, le cas échéant, être recherchée.
        </Text>

        <Text style={styles.h3}>ARTICLE 3 — DURÉE — RÉSILIATION</Text>
        <Text style={styles.p}>
          La présente convention est conclue pour une durée de {finBail} à compter de sa signature. Elle est
          renouvelable par tacite reconduction, par périodes successives d&apos;un an, sauf dénonciation par
          l&apos;une des Parties par lettre recommandée avec accusé de réception, moyennant un préavis d&apos;un
          mois avant l&apos;échéance.
        </Text>
        <Text style={styles.p}>
          Elle peut également être résiliée, sans indemnité, par l&apos;une ou l&apos;autre des Parties en cas de
          manquement de l&apos;autre Partie à l&apos;une quelconque de ses obligations, après mise en demeure restée
          sans effet pendant quinze jours.
        </Text>

        <Text style={styles.h3}>
          ARTICLE 4 — CONDITIONS DE RETRAIT, D&apos;ENLÈVEMENT, DE TRANSPORT, DE STOCKAGE ET D&apos;UTILISATION
        </Text>
        <Text style={styles.h4}>4.1 Interlocuteurs référents</Text>
        <Text style={styles.p}>
          Chaque Partie désigne un référent chargé, pour le DONATEUR, de la gestion physique et administrative de la
          remise des dons, et pour l&apos;ASSOCIATION, de leur collecte. Les personnes chargées de la collecte pour
          le compte de l&apos;ASSOCIATION doivent être informées ou formées aux règles de base d&apos;hygiène et de
          sécurité des aliments.
        </Text>
        <Text style={styles.h4}>4.2 Qualité des denrées et contrôle</Text>
        <Text style={styles.p}>
          Avant chaque enlèvement, l&apos;ASSOCIATION vérifie que le DONATEUR a mis les denrées à disposition dans
          les conditions définies à l&apos;article 2, et contrôle la conformité des températures de conservation.
          Elle peut refuser tout produit dont l&apos;aspect général ne satisferait pas à ces exigences.
        </Text>
        <Text style={styles.h4}>4.3 Traçabilité du don — bordereau d&apos;enlèvement</Text>
        <Text style={styles.p}>
          Pour chaque enlèvement, un bordereau d&apos;enlèvement contradictoire est établi par les référents des
          deux Parties. Il mentionne a minima : la désignation du produit ; la quantité (en unité de vente, en
          poids, ou toute autre unité pertinente) ; la date limite de consommation ou d&apos;utilisation optimale ;
          la température relevée pour les denrées réfrigérées ou surgelées ; le nom et la signature du référent du
          DONATEUR ; le nom et la signature du référent de l&apos;ASSOCIATION.
        </Text>
        <Text style={styles.p}>
          L&apos;ASSOCIATION confirme, après contrôle, la conformité des denrées reçues en apposant la mention «
          marchandise contrôlée et conforme » ainsi que sa signature sur le bordereau ; elle raye, le cas échéant,
          les denrées non acceptées. Tout litige sur cet inventaire donne lieu à un rapprochement amiable entre les
          Parties.
        </Text>
        <Text style={styles.p}>
          Les Parties conviennent que ce bordereau, ainsi que l&apos;attestation fiscale visée à l&apos;article 6,
          peuvent être établis et conservés au moyen d&apos;une plateforme numérique de traçabilité des dons dès lors
          que celle-ci permet l&apos;horodatage, la signature électronique des deux référents et l&apos;archivage
          des données pendant la durée légale de conservation.
        </Text>
        <Text style={styles.h4}>4.4 Enlèvement, transport et stockage</Text>
        <Text style={styles.p}>
          Le DONATEUR garantit des conditions de stockage appropriées, notamment le respect de la chaîne du froid,
          jusqu&apos;à l&apos;enlèvement par l&apos;ASSOCIATION. Celle-ci s&apos;engage à enlever les denrées aux
          date, heure et lieu convenus, et à prévenir le DONATEUR, sauf force majeure, au moins 24 heures à
          l&apos;avance en cas d&apos;impossibilité.
        </Text>
        <Text style={styles.p}>
          Sauf stipulation contraire convenue entre les Parties, l&apos;ASSOCIATION prend à sa charge la
          responsabilité et les frais des opérations d&apos;enlèvement, de chargement, de transport et de
          déchargement des denrées ; le DONATEUR ne saurait voir sa responsabilité engagée à ce titre. Le DONATEUR
          peut néanmoins proposer, à titre gracieux, d&apos;assurer lui-même le transport jusqu&apos;à
          l&apos;entrepôt désigné par l&apos;ASSOCIATION, auquel cas ce transport demeure sous sa responsabilité.
        </Text>
        <Text style={styles.h4}>4.5 Utilisation des denrées</Text>
        <Text style={styles.p}>
          L&apos;ASSOCIATION s&apos;engage à n&apos;utiliser les denrées reçues que dans le cadre de son activité
          d&apos;aide alimentaire, à les distribuer dans les meilleurs délais, et à éliminer à sa charge toute denrée
          dont la date de péremption serait dépassée dans son propre circuit de distribution ou qui présenterait un
          signe d&apos;altération. Elle informe les bénéficiaires des conditions de conservation et
          d&apos;utilisation appropriées.
        </Text>
        <Text style={styles.h4}>4.6 Alerte sanitaire</Text>
        <Text style={styles.p}>
          En cas de mesure de retrait-rappel affectant des denrées données, le DONATEUR en informe sans délai
          l&apos;ASSOCIATION par tout moyen écrit. L&apos;ASSOCIATION s&apos;engage à isoler immédiatement les
          denrées concernées et à en informer les personnes qui en seraient déjà destinataires, conformément au
          guide des bonnes pratiques d&apos;hygiène en vigueur.
        </Text>

        <Text style={styles.h3}>ARTICLE 5 — COMMUNICATION</Text>
        <Text style={styles.p}>
          Toute communication, interne ou externe, relative au présent partenariat est soumise à l&apos;accord
          préalable et écrit des deux Parties.
        </Text>

        <Text style={styles.h3}>ARTICLE 6 — DISPOSITION FISCALE</Text>
        <Text style={styles.p}>
          Afin de permettre au DONATEUR de justifier, auprès de l&apos;administration fiscale, de l&apos;existence
          d&apos;un don ouvrant droit à la réduction d&apos;impôt prévue à l&apos;article 238 bis du code général des
          impôts, l&apos;ASSOCIATION lui délivre, pour chaque don accepté, une attestation conforme aux dispositions
          fiscales applicables.
        </Text>
        <Text style={styles.p}>
          Cette attestation comporte notamment : l&apos;identification des Parties ; la description physique
          détaillée des denrées effectivement acceptées et prises en charge, sans mention de leur valeur ; la date
          de prise en charge ; et le numéro du bordereau d&apos;enlèvement correspondant.
        </Text>
        <Text style={styles.p}>
          L&apos;ASSOCIATION est seule responsable de l&apos;exactitude des informations portées sur
          l&apos;attestation. Le DONATEUR ne peut prétendre à la réduction d&apos;impôt à raison des denrées que
          l&apos;ASSOCIATION a refusées et n&apos;a pas prises en charge. Les Parties sont invitées à vérifier, à
          chaque exercice fiscal, le taux et le plafond de réduction d&apos;impôt applicables, ceux-ci étant
          susceptibles d&apos;évoluer d&apos;une loi de finances à l&apos;autre.
        </Text>

        <Text style={styles.h3}>ARTICLE 7 — ASSURANCE — RESPONSABILITÉ</Text>
        <Text style={styles.p}>
          Chacune des Parties déclare être titulaire d&apos;une assurance responsabilité civile couvrant
          l&apos;ensemble de ses activités et les conséquences dommageables qui pourraient en résulter.
        </Text>
        <Text style={styles.p}>
          L&apos;ASSOCIATION assume la responsabilité des denrées à compter de la signature du bordereau
          d&apos;enlèvement. Toute opération postérieure à cette remise (transport, stockage, remise en température,
          préparation, distribution) s&apos;effectue sous sa seule responsabilité, dans le respect de la
          réglementation applicable en matière d&apos;hygiène et de sécurité sanitaire.
        </Text>

        <Text style={styles.h3}>ARTICLE 8 — COLLABORATION</Text>
        <Text style={styles.p}>
          Les Parties s&apos;engagent à s&apos;informer mutuellement de toute difficulté rencontrée dans
          l&apos;exécution de la présente convention. Un bilan annuel du partenariat, incluant un état des lieux de
          la qualité des dons, est établi conjointement.
        </Text>

        <Text style={styles.h3}>ARTICLE 9 — FORCE MAJEURE</Text>
        <Text style={styles.p}>
          En cas de force majeure, au sens de l&apos;article 1218 du code civil, empêchant l&apos;une des Parties
          d&apos;exécuter ses obligations, l&apos;exécution de la convention est suspendue pour la durée de cet
          événement, dont chaque Partie s&apos;engage à informer immédiatement l&apos;autre. Si cette situation
          perdure au-delà d&apos;un mois, la Partie non empêchée peut mettre fin à la convention de plein droit et
          sans indemnité.
        </Text>

        <Text style={styles.h3}>ARTICLE 10 — MODIFICATION</Text>
        <Text style={styles.p}>
          Toute modification de la présente convention fait l&apos;objet d&apos;un avenant signé des deux Parties.
        </Text>

        <Text style={styles.h3}>ARTICLE 11 — INCESSIBILITÉ</Text>
        <Text style={styles.p}>
          La présente convention est conclue intuitu personae ; elle est incessible et intransmissible, sauf accord
          exprès des Parties. Le DONATEUR conserve toutefois la faculté de la céder à toute société appartenant au
          même groupe, à charge d&apos;en informer l&apos;ASSOCIATION.
        </Text>

        <Text style={styles.h3}>ARTICLE 12 — INDÉPENDANCE DES CLAUSES</Text>
        <Text style={styles.p}>
          Si l&apos;une des stipulations de la présente convention était déclarée nulle ou inapplicable, elle serait
          réputée non écrite, sans affecter la validité des autres stipulations.
        </Text>

        <Text style={styles.h3}>ARTICLE 13 — DOMICILIATION</Text>
        <Text style={styles.p}>
          Les Parties élisent domicile en leur siège social respectif. Tout changement d&apos;adresse doit être
          notifié à l&apos;autre Partie par lettre recommandée avec accusé de réception.
        </Text>

        <Text style={styles.h3}>ARTICLE 14 — RÈGLEMENT DES DIFFÉRENDS</Text>
        <Text style={styles.p}>
          En cas de différend relatif à la validité, à l&apos;interprétation ou à l&apos;exécution de la présente
          convention, les Parties s&apos;efforcent de trouver un accord amiable dans un délai d&apos;un mois à
          compter de la notification écrite du différend par la Partie la plus diligente. À défaut d&apos;accord
          dans ce délai, le litige est porté devant la juridiction compétente du ressort du siège social du
          défendeur.
        </Text>

        <Text style={{ marginTop: 12, marginBottom: 2 }}>
          Fait le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}, en
          deux exemplaires originaux.
        </Text>

        <View style={styles.signBlock}>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>Pour le DONATEUR,</Text>
            <Text>{entreprise.raisonSociale}</Text>
            <Text>{data.representantEntreprise}</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>Pour l&apos;ASSOCIATION,</Text>
            <Text>{association.denomination}</Text>
            <Text>{data.representantAssociation}</Text>
          </View>
        </View>

        <Text style={styles.annexTitle}>ANNEXE 1</Text>
        <Text style={{ ...styles.p, fontFamily: "Helvetica-Bold" }}>
          Modèle indicatif d&apos;attestation de don (justificatif fiscal — art. 238 bis du CGI)
        </Text>
        <Text style={styles.p}>
          Je soussigné(e) [NOM, PRÉNOM], agissant en qualité de [FONCTION] de l&apos;association{" "}
          {association.denomination}, certifie que celle-ci a reçu, dans le cadre de la présente convention, un don
          en nature de la part de {entreprise.raisonSociale}, correspondant au bordereau d&apos;enlèvement n°
          [NUMÉRO], établi le [DATE].
        </Text>
        <Text style={styles.p}>
          Description physique détaillée des denrées acceptées et prises en charge (sans mention de valeur) :
          [Désignation des produits, quantités, et le cas échéant numéros de lot — reprises du bordereau
          d&apos;enlèvement correspondant]
        </Text>
        <Text style={styles.p}>
          Cette attestation est établie conformément aux dispositions de l&apos;article 238 bis du code général des
          impôts. Elle ne dispense pas, le cas échéant, de l&apos;établissement du reçu fiscal normalisé (Cerfa n°
          2041-MEC-SD).
        </Text>
        <Text style={styles.p}>Fait à [VILLE], le [DATE]. Signature et cachet de l&apos;association :</Text>
      </Page>
    </Document>
  );
}
