import Link from "next/link";
import DemandeLienForm from "./DemandeLienForm";

export default function MotDePasseOubliePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand font-display text-xl font-bold text-white">
          T
        </div>
        <h1 className="font-display text-2xl font-semibold">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-ink-muted">Recevez un lien par e-mail pour en choisir un nouveau.</p>
      </div>
      <DemandeLienForm />
      <p className="mt-4 text-center text-xs text-ink-muted">
        <Link href="/connexion" className="font-semibold text-ink underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
