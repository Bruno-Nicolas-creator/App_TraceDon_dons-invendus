import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CoordinateurReseauxPage() {
  const [enseignes, reseaux] = await Promise.all([
    prisma.enseigne.findMany({
      orderBy: { denomination: "asc" },
      include: { entreprises: true, abonnement: true },
    }),
    prisma.reseau.findMany({
      orderBy: { denomination: "asc" },
      include: { associations: true },
    }),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold lg:text-2xl">Réseaux</h1>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 lg:p-5">
        <h2 className="mb-3.5 text-[15px] font-semibold">Enseignes (entreprises)</h2>
        <div className="space-y-2.5">
          {enseignes.map((enseigne) => (
            <div key={enseigne.id} className="rounded-xl border border-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-semibold">{enseigne.denomination}</div>
                {enseigne.abonnement && (
                  <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-dark">
                    {enseigne.abonnement.formule} · {enseigne.abonnement.montant} € / {enseigne.abonnement.periodicite}
                  </span>
                )}
              </div>
              <div className="mt-1.5 text-xs text-ink-muted">
                SIRET siège {enseigne.siretSiege} · {enseigne.nombreSieges} siège{enseigne.nombreSieges > 1 ? "s" : ""} déclaré{enseigne.nombreSieges > 1 ? "s" : ""}
              </div>
              {enseigne.entreprises.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {enseigne.entreprises.map((ent) => (
                    <li key={ent.id} className="text-xs text-ink-muted">
                      · {ent.raisonSociale}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {enseignes.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Aucune enseigne enregistrée sur la plateforme.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 lg:p-5">
        <h2 className="mb-3.5 text-[15px] font-semibold">Réseaux associatifs</h2>
        <div className="space-y-2.5">
          {reseaux.map((reseau) => (
            <div key={reseau.id} className="rounded-xl border border-border p-3.5">
              <div className="text-[13px] font-semibold">{reseau.denomination}</div>
              {reseau.perimetre && <div className="mt-1 text-xs text-ink-muted">{reseau.perimetre}</div>}
              {reseau.associations.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {reseau.associations.map((asso) => (
                    <li key={asso.id} className="text-xs text-ink-muted">
                      · {asso.denomination}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {reseaux.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Aucun réseau associatif enregistré sur la plateforme.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
