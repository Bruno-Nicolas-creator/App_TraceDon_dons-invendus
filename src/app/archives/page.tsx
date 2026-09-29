import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { compterMessagesNonLus } from "@/lib/messagerie";
import ArchivesClient, {
  type AttestationArchive,
  type AttestationInteretGeneralArchive,
  type BonArchive,
} from "./ArchivesClient";

export const dynamic = "force-dynamic";

const formatDate = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function ArchivesPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const nonLusMessages = await compterMessagesNonLus(session);

  const bonWhere =
    session.role === "ENTREPRISE"
      ? { entrepriseId: session.entrepriseId! }
      : session.role === "ASSOCIATION"
        ? { associationId: session.associationId! }
        : {};
  const attestationWhere = bonWhere;

  const [bons, attestations, attestationsInteretGeneral] = await Promise.all([
    prisma.bonEnlevement.findMany({
      where: { ...bonWhere, confirme: true },
      include: { association: true, entreprise: true },
      orderBy: { dateHeureEnlevement: "desc" },
    }),
    prisma.attestationFiscale.findMany({
      where: attestationWhere,
      include: { association: true, entreprise: true },
      orderBy: { periodeDebut: "desc" },
    }),
    prisma.attestationInteretGeneral.findMany({
      where: attestationWhere,
      include: { association: true, entreprise: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const nomPartenaire = (partenaires: { entreprise: { raisonSociale: string }; association: { denomination: string } }) => {
    if (session.role === "ENTREPRISE") return partenaires.association.denomination;
    if (session.role === "ASSOCIATION") return partenaires.entreprise.raisonSociale;
    return `${partenaires.entreprise.raisonSociale} → ${partenaires.association.denomination}`;
  };

  const bonsAffiches: BonArchive[] = bons.map((bon) => ({
    id: bon.id,
    titre: `Bon n°${bon.numero} — ${nomPartenaire(bon)}`,
    date: bon.dateHeureEnlevement ? formatDate(bon.dateHeureEnlevement) : "—",
    poids: `${(bon.poidsTotalRetenu ?? 0).toLocaleString("fr-FR")} kg`,
  }));

  const attestationsAffichees: AttestationArchive[] = attestations.map((att) => ({
    id: att.id,
    titre: `Attestation ${att.numeroOrdre} — ${nomPartenaire(att)}`,
    periode: `${formatDate(att.periodeDebut)} – ${formatDate(att.periodeFin)}`,
    montant: `${att.montantCalcule.toLocaleString("fr-FR")} €`,
    statut: att.statut,
  }));

  const attestationsInteretGeneralAffichees: AttestationInteretGeneralArchive[] = attestationsInteretGeneral.map(
    (att) => ({
      id: att.id,
      titre: nomPartenaire(att),
      statut: att.statut,
    })
  );

  return (
    <ArchivesClient
      bons={bonsAffiches}
      attestations={attestationsAffichees}
      attestationsInteretGeneral={attestationsInteretGeneralAffichees}
      role={session.role}
      nonLusMessages={nonLusMessages}
    />
  );
}
