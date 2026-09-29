import InfoBulle from "@/components/InfoBulle";
import { DOCUMENTS_ENTREPRISE, DOCUMENTS_ASSOCIATION, type TypeDocument } from "@/lib/documents";
import DocumentUploadForm from "./DocumentUploadForm";

export type DocumentExistant = {
  id: string;
  type: TypeDocument;
  nomFichier: string;
  createdAt: Date;
};

export type ConventionSignee = {
  id: string;
  autrePartieNom: string;
  signatureLe: Date;
};

const formatDate = (date: Date) => date.toLocaleDateString("fr-FR");

export default function CoffreFort({
  role,
  documents,
  conventionsSignees,
}: {
  role: "ENTREPRISE" | "ASSOCIATION";
  documents: DocumentExistant[];
  conventionsSignees: ConventionSignee[];
}) {
  const definitions = role === "ENTREPRISE" ? DOCUMENTS_ENTREPRISE : DOCUMENTS_ASSOCIATION;
  const parType = new Map(documents.map((d) => [d.type, d]));

  return (
    <div className="animate-fade-slide-in space-y-4 rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: "150ms" }}>
      <div>
        <h2 className="text-sm font-semibold">Coffre-fort documentaire</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Ces documents sont consultables par le coordinateur de la plateforme.
        </p>
      </div>

      <div className="space-y-2.5">
        {definitions.map((def) => {
          const existant = parType.get(def.type);
          return (
            <div key={def.type} className="rounded-xl bg-surface-alt p-3">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {def.label}
                  <InfoBulle texte={def.aide} />
                  {def.obligatoire && <span aria-label="obligatoire" className="text-accent">*</span>}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    existant ? "bg-brand-tint text-brand-dark" : "bg-accent-tint text-accent"
                  }`}
                >
                  {existant ? "Fourni" : "Non fourni"}
                </span>
              </div>

              {existant && (
                <a
                  href={`/api/documents/${existant.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-1.5 block truncate text-[11px] text-ink-muted underline decoration-dotted underline-offset-2"
                >
                  {existant.nomFichier} · déposé le {formatDate(existant.createdAt)}
                </a>
              )}

              {def.type === "ATTESTATION_CHAINE_FROID" && !existant && (
                <a
                  href="/api/attestation-chaine-froid/pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-1.5 block text-[11px] text-ink-muted underline decoration-dotted underline-offset-2"
                >
                  Télécharger le modèle à faire signer par votre représentant légal
                </a>
              )}

              <DocumentUploadForm type={def.type} obligatoire={def.obligatoire} dejaFourni={!!existant} />
            </div>
          );
        })}
      </div>

      {conventionsSignees.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <span className="text-xs font-semibold">Conventions de mécénat signées</span>
          <ul className="space-y-1.5">
            {conventionsSignees.map((c) => (
              <li key={c.id}>
                <a
                  href={`/api/conventions/${c.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl bg-surface-alt px-3.5 py-2.5 text-xs"
                >
                  <span className="font-medium">{c.autrePartieNom}</span>
                  <span className="text-ink-muted underline decoration-dotted underline-offset-2">
                    Signée le {formatDate(c.signatureLe)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
