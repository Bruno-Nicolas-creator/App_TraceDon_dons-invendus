import Link from "next/link";
import { lireInvitation } from "@/lib/invitations";
import { libelleNiveau } from "@/lib/droits";
import AccepterInvitationForm from "./AccepterInvitationForm";

export const dynamic = "force-dynamic";

export default async function InvitationPage({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const jeton = (await searchParams).jeton ?? "";
  const invitation = await lireInvitation(jeton);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand font-display text-xl font-bold text-white">
          T
        </div>
        <h1 className="font-display text-2xl font-semibold">
          {invitation ? `Rejoindre ${invitation.organisation}` : "Invitation"}
        </h1>
        {invitation && (
          <p className="mt-1 text-sm text-ink-muted">
            {invitation.inviteParNom} vous invite sur TraceDon avec un accès « {libelleNiveau(invitation.niveau)} ».
          </p>
        )}
      </div>
      {invitation ? (
        <AccepterInvitationForm jeton={jeton} email={invitation.email} />
      ) : (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-6 text-sm">
          <p>Cette invitation n&apos;est plus valable : elle a déjà servi, a été annulée, ou a expiré (7 jours).</p>
          <p className="text-ink-muted">Demandez une nouvelle invitation à l&apos;administrateur de votre organisation.</p>
        </div>
      )}
      <p className="mt-4 text-center text-xs text-ink-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-ink underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
