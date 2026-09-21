export type SuggestionOrganisme = {
  nom: string;
  siret: string | null;
  adresse: string;
  formeJuridique: string | null;
  rna: string | null;
};

// Codes "nature juridique" INSEE les plus fréquents. Liste non exhaustive :
// le champ reste éditable si le code n'y figure pas.
const LIBELLES_NATURE_JURIDIQUE: Record<string, string> = {
  "1000": "Entrepreneur individuel",
  "5202": "SNC",
  "5410": "SARL",
  "5415": "EURL",
  "5498": "SARL",
  "5499": "SA à conseil d'administration",
  "5599": "SA à conseil d'administration",
  "5605": "SA à directoire",
  "5710": "SAS",
  "5720": "SASU",
  "9220": "Association déclarée",
  "9221": "Association déclarée d'insertion par l'économie",
  "9222": "Association intermédiaire",
  "9230": "Association reconnue d'utilité publique",
  "9260": "Fondation",
  "9300": "Fondation d'entreprise",
};

function libelleFormeJuridique(codeNatureJuridique: string | null | undefined): string | null {
  if (!codeNatureJuridique) return null;
  return LIBELLES_NATURE_JURIDIQUE[codeNatureJuridique] ?? null;
}

type ResultatApi = {
  nom_complet: string;
  nature_juridique?: string;
  siege?: { siret?: string; adresse?: string };
  complements?: { est_association?: boolean; identifiant_association?: string | null };
};

export async function rechercherOrganismes(
  q: string,
  type: "ENTREPRISE" | "ASSOCIATION"
): Promise<SuggestionOrganisme[]> {
  const requete = q.trim();
  if (requete.length < 3) return [];

  const url = new URL("https://recherche-entreprises.api.gouv.fr/search");
  url.searchParams.set("q", requete);
  url.searchParams.set("per_page", "8");
  url.searchParams.set("est_association", type === "ASSOCIATION" ? "true" : "false");

  const reponse = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!reponse || !reponse.ok) return [];

  const donnees = await reponse.json().catch(() => null);
  const resultats: ResultatApi[] = donnees?.results ?? [];

  return resultats
    .filter((r) => r.siege?.adresse)
    .map((r) => ({
      nom: r.nom_complet,
      siret: r.siege?.siret ?? null,
      adresse: r.siege!.adresse!,
      formeJuridique: libelleFormeJuridique(r.nature_juridique),
      rna: r.complements?.identifiant_association ?? null,
    }));
}
