import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DOCUMENTS_ENTREPRISE, DOCUMENTS_ASSOCIATION, type TypeDocument } from "@/lib/documents";

const formatDate = (date: Date) => date.toLocaleDateString("fr-FR");

export default async function DocumentsProprietairePage({
  params,
}: {
  params: Promise<{ proprietaireType: string; id: string }>;
}) {
  const { proprietaireType, id } = await params;

  const session = await getSession();
  if (!session || session.role !== "COORDINATEUR") redirect("/connexion");

  if (proprietaireType !== "entreprise" && proprietaireType !== "association") notFound();

  const nom =
    proprietaireType === "entreprise"
      ? (await prisma.entreprise.findUnique({ where: { id }, select: { raisonSociale: true } }))?.raisonSociale
      : (await prisma.association.findUnique({ where: { id }, select: { denomination: true } }))?.denomination;
  if (!nom) notFound();

  const [documents, conventions] = await Promise.all([
    prisma.document.findMany({
      where: proprietaireType === "entreprise" ? { entrepriseId: id } : { associationId: id },
    }),
    prisma.convention.findMany({
      where:
        proprietaireType === "entreprise"
          ? { entrepriseId: id, statut: "SIGNEE" }
          : { associationId: id, statut: "SIGNEE" },
      include: { entreprise: true, association: true },
    }),
  ]);

  const definitions = proprietaireType === "entreprise" ? DOCUMENTS_ENTREPRISE : DOCUMENTS_ASSOCIATION;
  const parType = new Map(documents.map((d) => [d.type as TypeDocument, d]));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-bg px-5 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/coordinateur" aria-label="Retour" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-lg font-semibold">{nom}</h1>
          <p className="text-xs text-ink-muted">Coffre-fort documentaire</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {definitions.map((def) => {
          const existant = parType.get(def.type);
          return (
            <div key={def.type} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {def.label}
                  {def.obligatoire && <span className="ml-1 text-accent">*</span>}
                </div>
                {existant ? (
                  <div className="truncate text-xs text-ink-muted">
                    {existant.nomFichier} · déposé le {formatDate(existant.createdAt)}
                  </div>
                ) : (
                  <div className="text-xs text-ink-muted">Non fourni</div>
                )}
              </div>
              {existant ? (
                <a
                  href={`/api/documents/${existant.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-dark"
                >
                  Voir
                </a>
              ) : (
                <span className="shrink-0 rounded-full bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent">Manquant</span>
              )}
            </div>
          );
        })}
      </div>

      {conventions.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <h2 className="text-sm font-semibold">Conventions de mécénat signées</h2>
          <ul className="space-y-1.5">
            {conventions.map((c) => (
              <li key={c.id}>
                <a
                  href={`/api/conventions/${c.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs"
                >
                  <span className="font-medium">
                    {proprietaireType === "entreprise" ? c.association.denomination : c.entreprise.raisonSociale}
                  </span>
                  <span className="text-ink-muted underline decoration-dotted underline-offset-2">
                    Signée le {formatDate(c.signatureAssociationLe ?? c.signatureEntrepriseLe ?? c.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
