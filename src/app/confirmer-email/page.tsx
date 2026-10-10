import ConfirmerEmailForm from "./ConfirmerEmailForm";

export const dynamic = "force-dynamic";

export default async function ConfirmerEmailPage({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const jeton = (await searchParams).jeton ?? "";
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand font-display text-xl font-bold text-white">
          T
        </div>
        <h1 className="font-display text-2xl font-semibold">Nouvelle adresse e-mail</h1>
      </div>
      <ConfirmerEmailForm jeton={jeton} />
    </div>
  );
}
