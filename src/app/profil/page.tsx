import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BottomTabBar from "@/components/BottomTabBar";
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
        <button type="submit" className="w-full rounded-full border border-border py-3 text-sm font-semibold text-accent">
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
      <main className="flex-1 px-5 pb-4">{carte}</main>
      <BottomTabBar active="profil" />
    </div>
  );
}
