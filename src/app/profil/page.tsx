import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BottomTabBar from "@/components/BottomTabBar";
import CompteurAnime from "@/components/CompteurAnime";
import { calculerImpactCarbone } from "@/lib/impactCo2";
import { deconnexionAction } from "./actions";

const LABEL_ROLE: Record<string, string> = {
  ENTREPRISE: "Entreprise donatrice",
  ASSOCIATION: "Association bénéficiaire",
  COORDINATEUR: "Coordinateur plateforme",
};

export default async function ProfilPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  let organisation: string | null = null;
  if (session.entrepriseId) {
    const entreprise = await prisma.entreprise.findUnique({ where: { id: session.entrepriseId } });
    organisation = entreprise?.raisonSociale ?? null;
  } else if (session.associationId) {
    const association = await prisma.association.findUnique({ where: { id: session.associationId } });
    organisation = association?.denomination ?? null;
  }

  let impactCumule: { co2EviteKg: number; equivalenceKm: number | null; poidsTotalKg: number } | null = null;
  if (session.role === "ENTREPRISE" && session.entrepriseId) {
    const bonsConfirmes = await prisma.bonEnlevement.findMany({
      where: { entrepriseId: session.entrepriseId, confirme: true },
      select: { poidsTotalRetenu: true },
    });
    const poidsTotalKg = bonsConfirmes.reduce((total, b) => total + (b.poidsTotalRetenu ?? 0), 0);
    const impact = poidsTotalKg > 0 ? await calculerImpactCarbone(poidsTotalKg) : null;
    if (impact) impactCumule = { ...impact, poidsTotalKg };
  }

  const carte = (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint font-display text-lg font-bold text-brand-dark">
          {session.nom.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="text-base font-semibold">{session.nom}</div>
          <div className="text-xs text-ink-muted">{LABEL_ROLE[session.role]}</div>
        </div>
      </div>
      {organisation && (
        <div className="rounded-xl bg-surface-alt px-4 py-3 text-sm">
          <div className="text-xs text-ink-muted">Organisation</div>
          <div className="font-semibold">{organisation}</div>
        </div>
      )}
      <form action={deconnexionAction}>
        <button
          type="submit"
          className="w-full rounded-full border border-border py-3 text-sm font-semibold text-accent transition-transform active:scale-[0.98]"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );

  if (session.role === "COORDINATEUR") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <h1 className="mb-4 font-display text-xl font-semibold">Mon profil</h1>
        {carte}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="px-5 pt-5 pb-3">
        <h1 className="font-display text-xl font-semibold">Mon profil</h1>
      </header>
      <main className="flex-1 space-y-4 px-5 pb-4">
        {carte}
        {impactCumule && (
          <div className="animate-fade-slide-in rounded-2xl bg-brand-tint p-4" style={{ animationDelay: "100ms" }}>
            <div className="mb-1 text-xs font-semibold uppercase text-brand-dark">Impact cumulé</div>
            <div className="mb-1 text-2xl font-bold text-brand-dark">
              <CompteurAnime valeur={impactCumule.co2EviteKg} suffixe=" kg de CO2 évités" duree={1000} />{" "}
              <span className="animate-pop-rebond">🌱</span>
            </div>
            <p className="text-xs leading-relaxed text-brand-dark">
              Grâce à <CompteurAnime valeur={impactCumule.poidsTotalKg} suffixe=" kg" duree={1000} /> de dons non
              jetés
              {impactCumule.equivalenceKm != null && (
                <>
                  {" "}
                  — soit l&apos;équivalent de{" "}
                  <span className="font-semibold">
                    <CompteurAnime valeur={impactCumule.equivalenceKm} suffixe=" km" duree={1000} />
                  </span>{" "}
                  en voiture 🚗
                </>
              )}
              .
            </p>
          </div>
        )}
      </main>
      <BottomTabBar
        active="profil"
        donsHref={session.role === "ENTREPRISE" ? "/" : "/dons"}
        donsLabel={session.role === "ENTREPRISE" ? "Nouveau don" : "Dons"}
      />
    </div>
  );
}
