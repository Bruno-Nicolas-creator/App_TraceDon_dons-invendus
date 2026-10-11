"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TogglePill from "@/components/TogglePill";
import { envoyerMessageAction } from "../actions";
import { useDroits } from "@/components/DroitsProvider";

export type MessageAffiche = {
  id: string;
  contenu: string | null;
  priorite: "NORMALE" | "IMPORTANTE" | "URGENTE";
  expediteurNom: string;
  estMonMessage: boolean;
  createdAt: string;
  pieceJointe: { nom: string; contentType: string } | null;
};

const formaterHeure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const BADGE_PRIORITE: Record<string, { emoji: string; label: string; classe: string }> = {
  IMPORTANTE: { emoji: "⭐", label: "Important", classe: "bg-brand-tint text-brand-dark" },
  URGENTE: { emoji: "🔴", label: "Urgent", classe: "bg-accent-tint text-accent" },
};

export default function ConversationClient({
  conversationId,
  nomPartenaire,
  messages,
}: {
  conversationId: string;
  nomPartenaire: string;
  messages: MessageAffiche[];
}) {
  const { peutOperer } = useDroits();
  const router = useRouter();
  const [contenu, setContenu] = useState("");
  const [priorite, setPriorite] = useState<"NORMALE" | "IMPORTANTE" | "URGENTE">("NORMALE");
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const finDesMessages = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finDesMessages.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (!contenu.trim() && !fichier) return;
    setErreur(null);
    setEnvoiEnCours(true);

    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("contenu", contenu.trim());
    formData.set("priorite", priorite);
    if (fichier) formData.set("fichier", fichier);

    const resultat = await envoyerMessageAction(formData);
    if (!resultat.ok) {
      setErreur(resultat.error);
      setEnvoiEnCours(false);
      return;
    }
    setContenu("");
    setPriorite("NORMALE");
    setFichier(null);
    setEnvoiEnCours(false);
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg">
      <header className="flex items-center gap-3 border-b border-border px-5 pt-5 pb-3">
        <Link
          href="/messages"
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#201F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-sm font-bold text-brand-dark">
          {nomPartenaire.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="truncate font-display text-base font-semibold">{nomPartenaire}</h1>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            Aucun message pour l&apos;instant. Dites bonjour !
          </div>
        )}
        {messages.map((m) => {
          const badge = BADGE_PRIORITE[m.priorite];
          return (
            <div key={m.id} className={`flex ${m.estMonMessage ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] space-y-1.5 rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.estMonMessage ? "rounded-tr-sm bg-brand text-white" : "rounded-tl-sm border border-border bg-surface"
                }`}
              >
                {!m.estMonMessage && <div className="text-[11px] font-semibold text-ink-muted">{m.expediteurNom}</div>}
                {badge && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      m.estMonMessage ? "bg-white/20 text-white" : badge.classe
                    }`}
                  >
                    {badge.emoji} {badge.label}
                  </span>
                )}
                {m.contenu && <p className="leading-relaxed whitespace-pre-wrap">{m.contenu}</p>}
                {m.pieceJointe && (
                  <a
                    href={`/api/messages/${m.id}/piece-jointe`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs ${
                      m.estMonMessage ? "bg-white/15" : "bg-surface-alt"
                    }`}
                  >
                    <span aria-hidden="true">📎</span>
                    <span className="truncate">{m.pieceJointe.nom}</span>
                  </a>
                )}
                <div className={`text-right text-[10px] ${m.estMonMessage ? "text-white/70" : "text-ink-muted"}`}>
                  {formaterHeure(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={finDesMessages} />
      </main>

      <footer className="space-y-2.5 border-t border-border bg-surface px-5 pt-3 pb-5">
        {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}

        {!peutOperer ? (
          <p className="text-center text-xs text-ink-muted">Accès en lecture seule : vous pouvez lire les messages, pas en envoyer.</p>
        ) : (
          <>
            <TogglePill
              valeur={priorite}
              onChange={setPriorite}
              options={[
                { valeur: "NORMALE", label: "Normal" },
                { valeur: "IMPORTANTE", label: "⭐ Important" },
                { valeur: "URGENTE", label: "🔴 Urgent" },
              ]}
            />

            {fichier && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-alt px-3 py-2 text-xs">
                <span className="truncate">📎 {fichier.name}</span>
                <button type="button" onClick={() => setFichier(null)} className="shrink-0 text-ink-muted">
                  &times;
                </button>
              </div>
            )}

            <form onSubmit={envoyer} className="flex items-end gap-2">
              <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-alt">
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                />
                <span aria-hidden="true">📎</span>
              </label>
              <textarea
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                placeholder="Écrire un message…"
                rows={1}
                maxLength={4000}
                className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={envoiEnCours || (!contenu.trim() && !fichier)}
                aria-label="Envoyer"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-transform active:scale-90 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12L20 4L14 20L11 13L4 12Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </>
        )}
      </footer>
    </div>
  );
}
