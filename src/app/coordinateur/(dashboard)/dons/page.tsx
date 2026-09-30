import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUT_LABELS: Record<string, string> = {
  PUBLIE: "Publié",
  PRIS_EN_CHARGE: "Pris en charge",
  CLOTURE: "Clôturé",
  ANNULE: "Annulé",
};

const STATUT_STYLES: Record<string, string> = {
  PUBLIE: "bg-accent-tint text-accent",
  PRIS_EN_CHARGE: "bg-surface-alt text-ink-muted",
  CLOTURE: "bg-brand-tint text-brand-dark",
  ANNULE: "bg-surface-alt text-ink-muted",
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function CoordinateurDonsPage() {
  const dons = await prisma.don.findMany({
    where: { statut: { not: "BROUILLON" } },
    include: { entreprise: true, associationAssignee: true, articles: { include: { associationAssignee: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold lg:text-2xl">Dons</h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted lg:px-3.5 lg:py-2 lg:text-[13px]">
          {dons.length} don{dons.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 lg:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="text-left">
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Entreprise</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Association</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Statut</th>
                <th className="border-b border-border pb-2 pr-3 text-[11px] font-semibold uppercase text-ink-muted">Poids</th>
                <th className="border-b border-border pb-2 text-[11px] font-semibold uppercase text-ink-muted">Publié le</th>
              </tr>
            </thead>
            <tbody>
              {dons.map((don, i) => {
                // Don matériel divisible : plusieurs associations peuvent s'être partagé les
                // articles, chacune avec son propre bon — on les liste toutes.
                const associationsDuLot = don.divisible
                  ? [...new Set(don.articles.map((a) => a.associationAssignee?.denomination).filter((n): n is string => !!n))]
                  : don.associationAssignee
                    ? [don.associationAssignee.denomination]
                    : [];
                return (
                <tr key={don.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="border-b border-surface-alt py-3 text-[13px] font-semibold">{don.entreprise.raisonSociale}</td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">
                    {associationsDuLot.length > 0 ? associationsDuLot.join(", ") : "—"}
                  </td>
                  <td className="border-b border-surface-alt py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${STATUT_STYLES[don.statut] ?? "bg-surface-alt text-ink-muted"}`}>
                      {STATUT_LABELS[don.statut] ?? don.statut}
                    </span>
                  </td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">
                    {don.articles.reduce((t, a) => t + a.poidsKg, 0).toLocaleString("fr-FR")} kg
                  </td>
                  <td className="border-b border-surface-alt py-3 text-[13px] text-ink-muted">
                    {don.publieLe ? formatDate(don.publieLe) : "—"}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {dons.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Aucun don publié sur la plateforme.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
