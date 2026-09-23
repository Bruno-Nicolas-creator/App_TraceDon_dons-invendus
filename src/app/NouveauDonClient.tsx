"use client";

import { useState, useTransition } from "react";
import { publierDon } from "@/app/actions";
import Link from "next/link";
import BottomTabBar from "@/components/BottomTabBar";

type Don = {
  id: string;
};

export default function NouveauDonClient({
  don,
  associationsAujourdhui,
  congesJusquau,
  nonLusMessages = 0,
  peutDonnerMaterielAussi = false,
}: {
  don: Don;
  associationsAujourdhui: string[];
  congesJusquau: string | null;
  nonLusMessages?: number;
  peutDonnerMaterielAussi?: boolean;
}) {
  const [donId, setDonId] = useState(don.id);
  const [erreurPublication, setErreurPublication] = useState<string | null>(null);
  const [manqueKbis, setManqueKbis] = useState(false);
  const [vientDetrePublie, setVientDetrePublie] = useState(false);
  const [assigneA, setAssigneA] = useState<string | null>(null);
  const [donPublieId, setDonPublieId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const publier = () => {
    setErreurPublication(null);
    setManqueKbis(false);
    startTransition(async () => {
      const donPublieAvant = donId;
      const resultat = await publierDon(donId);
      if (!resultat.ok) {
        setErreurPublication(resultat.error);
        setManqueKbis(!!resultat.manqueKbis);
        return;
      }
      setDonId(resultat.id);
      setAssigneA(resultat.assigneA);
      setDonPublieId(resultat.assigneA ? donPublieAvant : null);
      setVientDetrePublie(true);
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          type="button"
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="flex-1 font-display text-xl font-semibold">Nouveau don</h1>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted">Brouillon</span>
      </header>

      <div className="px-5 pb-4">
        <Link
          href="/associations"
          className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2.5 text-xs font-semibold text-ink transition-transform active:scale-[0.98]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 21C12 21 19 15.5 19 10.5C19 6.4 15.9 3 12 3C8.1 3 5 6.4 5 10.5C5 15.5 12 21 12 21Z"
              stroke="#201F1B"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="10.5" r="2.3" stroke="#201F1B" strokeWidth="1.6" />
          </svg>
          Voir les associations à proximité
        </Link>
        {peutDonnerMaterielAussi && (
          <Link
            href="/nouveau-don-materiel"
            className="mt-2.5 flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2.5 text-xs font-semibold text-ink transition-transform active:scale-[0.98]"
          >
            Basculer vers un don matériel
          </Link>
        )}
      </div>

      <main className="flex-1 space-y-5 px-5 pb-4">
        {congesJusquau && !vientDetrePublie && (
          <div className="flex gap-3 rounded-xl bg-accent-tint px-4 py-3.5">
            <span aria-hidden="true" className="text-lg leading-none">🌴</span>
            <p className="text-xs leading-relaxed text-ink">
              <span className="font-semibold text-accent">Vous êtes en congés</span> jusqu&apos;au {congesJusquau}.
              Vous ne pouvez pas publier de don pendant cette période.
            </p>
          </div>
        )}
        {associationsAujourdhui.length === 1 && !vientDetrePublie && (
          <div className="rounded-xl bg-brand-tint px-4 py-3.5 text-sm leading-snug text-brand-dark">
            Aujourd&apos;hui, ce don sera directement remis à <strong>{associationsAujourdhui[0]}</strong> (planning
            récurrent).
          </div>
        )}
        {associationsAujourdhui.length > 1 && !vientDetrePublie && (
          <div className="rounded-xl bg-surface-alt px-4 py-3.5 text-sm leading-snug text-ink-muted">
            Plusieurs associations sont planifiées aujourd&apos;hui ({associationsAujourdhui.join(", ")}) : le don sera
            publié pour qu&apos;une d&apos;entre elles se positionne.
          </div>
        )}
        {vientDetrePublie && (
          <div className="space-y-2 rounded-xl bg-brand-tint px-4 py-3.5">
            <div className="flex items-start justify-between gap-2.5">
              <p className="text-sm leading-snug text-brand-dark">
                {assigneA
                  ? `Don enregistré et assigné à ${assigneA}. Le bon d'enlèvement est prêt pour la signature.`
                  : "Don publié ! Il est visible des associations. Un nouveau brouillon a été créé ci-dessous."}
              </p>
              <button
                type="button"
                onClick={() => setVientDetrePublie(false)}
                aria-label="Fermer"
                className="shrink-0 text-brand-dark"
              >
                &times;
              </button>
            </div>
            {donPublieId && (
              <Link
                href={`/bon-enlevement/${donPublieId}`}
                className="block w-full rounded-full bg-brand-dark py-2.5 text-center text-xs font-bold text-white transition-transform active:scale-[0.98]"
              >
                Voir et signer le bon d&apos;enlèvement
              </Link>
            )}
          </div>
        )}
        {associationsAujourdhui.length !== 1 && !vientDetrePublie && (
          <div className="flex items-start gap-2.5 rounded-xl bg-brand-tint px-4 py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
              <path d="M12 8V13" stroke="#2E6B4E" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1" fill="#2E6B4E" />
              <circle cx="12" cy="12" r="9" stroke="#2E6B4E" strokeWidth="2" />
            </svg>
            <p className="text-sm leading-snug text-brand-dark">
              En attente qu&apos;une association se positionne, ou assignation par le coordinateur.
            </p>
          </div>
        )}

        {!vientDetrePublie && (
          <div className="flex items-start gap-2.5 rounded-xl bg-surface-alt px-4 py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
              <path
                d="M4 8V6C4 4.9 4.9 4 6 4H8M20 8V6C20 4.9 19.1 4 18 4H16M4 16V18C4 19.1 4.9 20 6 20H8M20 16V18C20 19.1 19.1 20 18 20H16"
                stroke="#6B6459"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm leading-snug text-ink-muted">
              Vous n&apos;avez pas besoin de lister les articles maintenant. Vous les scannerez directement sur
              l&apos;écran du bon d&apos;enlèvement, juste avant le passage de l&apos;association.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-surface px-5 pt-3.5 pb-5">
        {erreurPublication && (
          <div className="mb-3 rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">
            {erreurPublication}
            {manqueKbis && (
              <>
                {" "}
                <Link href="/profil" className="font-semibold underline">
                  Compléter mon coffre-fort
                </Link>
              </>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={publier}
          disabled={isPending || !!congesJusquau}
          className="w-full rounded-full bg-brand py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          Publier le don
        </button>
      </footer>
      <BottomTabBar active="dons" role="ENTREPRISE" nonLusMessages={nonLusMessages} />
    </div>
  );
}
