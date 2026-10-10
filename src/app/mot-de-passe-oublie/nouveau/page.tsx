import Link from "next/link";
import { jetonValide } from "@/lib/reinitialisation";
import NouveauMotDePasseForm from "./NouveauMotDePasseForm";

export const dynamic = "force-dynamic";

export default async function NouveauMotDePassePage({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const jeton = (await searchParams).jeton ?? "";
  const valide = await jetonValide(jeton);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand font-display text-xl font-bold text-white">
          T
        </div>
        <h1 className="font-display text-2xl font-semibold">Nouveau mot de passe</h1>
      </div>
      {valide ? (
        <NouveauMotDePasseForm jeton={jeton} />
      ) : (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-6 text-sm">
          <p>Ce lien n&apos;est plus valable : il a déjà servi, ou il a expiré (1 heure).</p>
          <Link href="/mot-de-passe-oublie" className="inline-block font-semibold underline">
            Demander un nouveau lien
          </Link>
        </div>
      )}
      <p className="mt-4 text-center text-xs text-ink-muted">
        <Link href="/connexion" className="font-semibold text-ink underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
