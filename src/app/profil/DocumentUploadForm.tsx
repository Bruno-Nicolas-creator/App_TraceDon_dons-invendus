"use client";

import { useActionState } from "react";
import { televerserDocumentAction } from "./actions";

type Etat = { ok: boolean; error?: string };

const ETAT_INITIAL: Etat = { ok: true };

export default function DocumentUploadForm({
  type,
  obligatoire,
  dejaFourni,
}: {
  type: string;
  obligatoire: boolean;
  dejaFourni: boolean;
}) {
  const [etat, formAction, isPending] = useActionState(async (_prev: Etat, formData: FormData): Promise<Etat> => {
    const resultat = await televerserDocumentAction(formData);
    return resultat.ok ? { ok: true } : { ok: false, error: resultat.error };
  }, ETAT_INITIAL);

  return (
    <div>
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="type" value={type} />
        <input
          type="file"
          name="fichier"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required={obligatoire && !dejaFourni}
          disabled={isPending}
          className="min-w-0 flex-1 text-[11px] text-ink-muted file:mr-2 file:rounded-full file:border-0 file:bg-ink file:px-2.5 file:py-1.5 file:text-[11px] file:font-semibold file:text-white disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold transition-transform active:scale-95 disabled:opacity-60"
        >
          {isPending ? "Envoi…" : dejaFourni ? "Remplacer" : "Téléverser"}
        </button>
      </form>
      {etat.error && <p className="mt-1.5 text-[11px] text-accent">{etat.error}</p>}
    </div>
  );
}
