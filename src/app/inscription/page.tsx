import InscriptionForm from "./InscriptionForm";

export default function InscriptionPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand font-display text-xl font-bold text-white">
          T
        </div>
        <h1 className="font-display text-2xl font-semibold">Créer un compte</h1>
        <p className="mt-1 text-sm text-ink-muted">Entreprise donatrice ou association bénéficiaire</p>
      </div>

      <InscriptionForm />

      <p className="mt-4 text-center text-[11px] text-ink-muted">
        Les comptes coordinateur sont créés par l&apos;équipe de la plateforme, pas par auto-inscription.
      </p>
    </div>
  );
}
