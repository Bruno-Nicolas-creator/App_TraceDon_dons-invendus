"use client";

import { useSyncExternalStore } from "react";
import { appliquerChoix } from "@/lib/analytics";
import {
  abonnerAuChoix,
  enregistrerChoix,
  lireChoix,
  mesureAudienceConfiguree,
  type ChoixMesureAudience,
} from "@/lib/consentement";

const ENREGISTREMENT_ECRAN = process.env.NEXT_PUBLIC_POSTHOG_REPLAY === "1";

type EtatChoix = ChoixMesureAudience | "aucun" | "serveur";

function useChoix(): EtatChoix {
  return useSyncExternalStore<EtatChoix>(
    abonnerAuChoix,
    () => lireChoix() ?? "aucun",
    () => "serveur"
  );
}

function choisir(choix: ChoixMesureAudience) {
  enregistrerChoix(choix);
  appliquerChoix(choix);
}

function Description() {
  return (
    <>
      Avec votre accord, nous comptons les pages visitées et les dons publiés, et nous enregistrons les erreurs
      techniques{ENREGISTREMENT_ECRAN ? ", ainsi que des enregistrements d'écran dont tous les textes et champs sont masqués" : ""}.
      Aucun nom, email, numéro de téléphone ni contenu de document n&apos;est transmis. Service : PostHog, hébergé dans
      l&apos;Union européenne. Vous pouvez changer d&apos;avis à tout moment depuis votre profil.
    </>
  );
}

export default function BandeauMesureAudience() {
  const choix = useChoix();
  if (!mesureAudienceConfiguree || choix !== "aucun") return null;

  return (
    <div
      role="dialog"
      aria-label="Mesure d'audience"
      className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-border bg-surface p-4 shadow-lg"
    >
      <p className="text-xs leading-relaxed text-ink">
        <span className="font-semibold">Mesure d&apos;audience anonyme. </span>
        <Description />
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choisir("refuse")}
          className="flex-1 rounded-xl border border-border bg-surface-alt py-2.5 text-xs font-semibold text-ink"
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => choisir("accepte")}
          className="flex-1 rounded-xl border border-border bg-surface-alt py-2.5 text-xs font-semibold text-ink"
        >
          Accepter
        </button>
      </div>
    </div>
  );
}

export function ChoixMesureAudience() {
  const choix = useChoix();
  if (!mesureAudienceConfiguree || choix === "serveur") return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Mesure d&apos;audience</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        <Description />
      </p>
      <p className="mt-2 text-xs font-semibold" data-testid="etat-mesure-audience">
        {choix === "accepte" ? "Vous avez accepté." : choix === "refuse" ? "Vous avez refusé." : "Vous n'avez pas encore choisi."}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choisir("refuse")}
          className="flex-1 rounded-xl border border-border bg-surface-alt py-2.5 text-xs font-semibold text-ink"
        >
          Refuser / retirer mon accord
        </button>
        <button
          type="button"
          onClick={() => choisir("accepte")}
          className="flex-1 rounded-xl border border-border bg-surface-alt py-2.5 text-xs font-semibold text-ink"
        >
          Accepter
        </button>
      </div>
    </section>
  );
}
