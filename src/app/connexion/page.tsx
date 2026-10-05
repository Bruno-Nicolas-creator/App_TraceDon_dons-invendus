import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { connexionAction } from "./actions";

// Les comptes de démonstration (seed) existent encore en production, mais on ne les affiche
// et ne pré-remplit leur mot de passe qu'en local, pour ne pas les exposer aux visiteurs.
const AFFICHER_COMPTES_DEMO = process.env.NODE_ENV !== "production";

const MESSAGES_ERREUR: Record<string, string> = {
  trop_de_tentatives: "Trop de tentatives de connexion. Merci de réessayer dans quelques minutes.",
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand font-display text-xl font-bold text-white">
          T
        </div>
        <h1 className="font-display text-2xl font-semibold">Connexion</h1>
        <p className="mt-1 text-sm text-ink-muted">Espace entreprise, association ou coordinateur</p>
      </div>

      <form action={connexionAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        {erreur && (
          <div className="rounded-lg bg-accent-tint px-3 py-2 text-sm text-accent">
            {MESSAGES_ERREUR[erreur] ?? "Email ou mot de passe incorrect."}
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium text-ink-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.fr"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="motDePasse" className="mb-1 block text-xs font-medium text-ink-muted">
            Mot de passe
          </label>
          <input
            id="motDePasse"
            name="motDePasse"
            type="password"
            required
            autoComplete="current-password"
            defaultValue={AFFICHER_COMPTES_DEMO ? "demo1234" : undefined}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
          />
        </div>
        <SubmitButton className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white disabled:opacity-60">
          Se connecter
        </SubmitButton>
      </form>

      <p className="mt-4 text-center text-xs text-ink-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-ink underline">
          Entreprise ou association, créez le vôtre
        </Link>
      </p>

      {AFFICHER_COMPTES_DEMO && (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-4 text-xs text-ink-muted">
          <p className="mb-2 font-semibold text-ink">Comptes de démonstration</p>
          <ul className="space-y-1">
            <li>Entreprise — carrefour@exemple.fr</li>
            <li>Association — coeur@exemple.fr</li>
            <li>Coordinateur — bruno@exemple.fr</li>
          </ul>
          <p className="mt-2">Mot de passe : demo1234</p>
        </div>
      )}
    </div>
  );
}
