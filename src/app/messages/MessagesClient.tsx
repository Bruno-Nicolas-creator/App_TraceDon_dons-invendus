"use client";

import Link from "next/link";
import BottomTabBar from "@/components/BottomTabBar";

export type ConversationAffichee = {
  id: string;
  nom: string;
  dernierMessage: string;
  dernierMessageLe: string;
  prioriteDernierMessage: "NORMALE" | "IMPORTANTE" | "URGENTE";
  nombreNonLus: number;
};

function formaterHorodatage(iso: string): string {
  const date = new Date(iso);
  const maintenant = new Date();
  const memeJour = date.toDateString() === maintenant.toDateString();
  if (memeJour) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function PastilleInitiale({ nom }: { nom: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-base font-bold text-brand-dark">
      {nom.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function MessagesClient({
  conversations,
  role,
  nonLusMessages = 0,
}: {
  conversations: ConversationAffichee[];
  role: "ENTREPRISE" | "ASSOCIATION" | "COORDINATEUR";
  nonLusMessages?: number;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="font-display text-xl font-semibold">Messages</h1>
        <Link
          href="/messages/nouvelle"
          aria-label="Nouvelle conversation"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white transition-transform active:scale-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
      </header>

      <main className="flex-1 space-y-1 px-2 pb-4">
        {conversations.map((c, i) => (
          <Link
            key={c.id}
            href={`/messages/${c.id}`}
            style={{ animationDelay: `${i * 40}ms` }}
            className="animate-fade-slide-in flex items-center gap-3 rounded-xl px-3 py-3 transition-colors active:bg-surface-alt"
          >
            <PastilleInitiale nom={c.nom} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-[15px] ${c.nombreNonLus > 0 ? "font-bold text-ink" : "font-semibold text-ink"}`}>
                  {c.nom}
                </span>
                <span className={`shrink-0 text-[11px] ${c.nombreNonLus > 0 ? "font-semibold text-brand" : "text-ink-muted"}`}>
                  {formaterHorodatage(c.dernierMessageLe)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className={`truncate text-[13px] ${c.nombreNonLus > 0 ? "font-medium text-ink" : "text-ink-muted"}`}>
                  {c.prioriteDernierMessage === "URGENTE" && <span className="mr-1">🔴</span>}
                  {c.prioriteDernierMessage === "IMPORTANTE" && <span className="mr-1">⭐</span>}
                  {c.dernierMessage || "Aucun message"}
                </span>
                {c.nombreNonLus > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                    {c.nombreNonLus}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {conversations.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            Aucune conversation. Démarrez-en une avec le bouton +.
          </div>
        )}
      </main>

      <BottomTabBar active="messages" role={role} nonLusMessages={nonLusMessages} />
    </div>
  );
}
