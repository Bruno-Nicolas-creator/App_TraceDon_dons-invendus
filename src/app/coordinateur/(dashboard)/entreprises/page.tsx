import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LIBELLE_NATURE: Record<string, string> = {
  ALIMENTAIRE: "Alimentaire",
  ALIMENTAIRE_ET_NON_ALIMENTAIRE: "Alimentaire et non alimentaire",
  NON_ALIMENTAIRE: "Non alimentaire",
};

export default async function CoordinateurEntreprisesPage() {
  const entreprises = await prisma.entreprise.findMany({
    orderBy: { raisonSociale: "asc" },
    include: { documents: { where: { type: "KBIS" } }, enseigne: true },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold lg:text-2xl">Entreprises</h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted lg:px-3.5 lg:py-2 lg:text-[13px]">
          {entreprises.length} entreprise{entreprises.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 lg:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="text-left">
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Entreprise</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">SIRET</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Nature</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Enseigne</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Kbis</th>
                <th className="border-b border-border pb-2" />
              </tr>
            </thead>
            <tbody>
              {entreprises.map((ent, i) => (
                <tr key={ent.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="border-b border-surface-alt py-3 text-[13px] font-semibold">{ent.raisonSociale}</td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">{ent.siret}</td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">
                    {LIBELLE_NATURE[ent.natureActivite] ?? ent.natureActivite}
                  </td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">
                    {ent.enseigne?.denomination ?? "—"}
                  </td>
                  <td className="border-b border-surface-alt py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        ent.documents.length > 0 ? "bg-brand-tint text-brand-dark" : "bg-accent-tint text-accent"
                      }`}
                    >
                      {ent.documents.length > 0 ? "Fourni" : "Non fourni"}
                    </span>
                  </td>
                  <td className="border-b border-surface-alt py-3 text-right">
                    <Link
                      href={`/coordinateur/documents/entreprise/${ent.id}`}
                      className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                    >
                      Documents
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entreprises.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Aucune entreprise enregistrée sur la plateforme.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
