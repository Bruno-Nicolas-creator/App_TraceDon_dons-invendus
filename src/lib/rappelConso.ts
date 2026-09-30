import "server-only";

export type InfoRappel = {
  motif: string;
  dateRappel: string;
  lienFiche: string | null;
};

type ChampsRappel = {
  identification_produits?: string;
  motif_rappel?: string;
  date_publication?: string;
  date_de_fin_de_la_procedure_de_rappel?: string;
  lien_vers_la_fiche_rappel?: string;
};

/**
 * `identification_produits` liste un ou plusieurs lots séparés par "|", chacun sous la forme
 * "GTIN$lot$type de date$date". On exige une correspondance exacte du code-barres sur ce premier
 * segment plutôt que de se fier au classement de la recherche plein texte de l'API.
 */
function gtinCorrespond(identificationProduits: string | undefined, codeBarres: string): boolean {
  if (!identificationProduits) return false;
  return identificationProduits.split("|").some((entree) => entree.split("$")[0]?.trim() === codeBarres);
}

/**
 * Un rappel ancien dont la procédure est terminée ne concerne plus les lots en circulation
 * aujourd'hui : seuls les rappels encore actifs (ou sans date de fin connue) doivent bloquer un don.
 */
function rappelActif(dateFin: string | undefined): boolean {
  if (!dateFin) return true;
  const fin = new Date(dateFin);
  return Number.isNaN(fin.getTime()) || fin.getTime() >= Date.now();
}

/**
 * Un GTIN valide (EAN-8, UPC-A, EAN-13 ou GTIN-14) ne contient que des chiffres. On exclut aussi
 * les valeurs à chiffre unique répété ("0000000000000") : constaté en pratique dans RappelConso
 * comme valeur par défaut d'une fiche sans code-barres renseigné, ce qui produirait un faux
 * positif pour n'importe quel scan malformé.
 */
function codeBarresPlausible(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  return new Set(code).size > 1;
}

/**
 * Vérifie sur RappelConso (data.economie.gouv.fr, base officielle gratuite, sans clé) si un
 * code-barres correspond à un rappel de produit encore en cours. N'échoue jamais bruyamment :
 * une panne de ce service ne doit jamais empêcher un scan (échec ouvert), exactement comme la
 * recherche Open Food Facts voisine.
 */
export async function verifierRappel(codeBarres: string): Promise<InfoRappel | null> {
  const code = codeBarres.trim();
  if (!codeBarresPlausible(code)) return null;

  try {
    const url = `https://data.economie.gouv.fr/api/records/1.0/search/?dataset=rappelconso-v2-gtin-espaces&q=${encodeURIComponent(code)}&rows=5`;
    const reponse = await fetch(url, { cache: "no-store" }).catch(() => null);
    if (!reponse || !reponse.ok) return null;

    const donnees = (await reponse.json().catch(() => null)) as { records?: { fields?: ChampsRappel }[] } | null;
    const records = donnees?.records ?? [];

    const correspondance = records.find(
      (r) => gtinCorrespond(r.fields?.identification_produits, code) && rappelActif(r.fields?.date_de_fin_de_la_procedure_de_rappel)
    );
    if (!correspondance?.fields) return null;

    return {
      motif: correspondance.fields.motif_rappel ?? "Rappel officiel signalé pour ce produit.",
      dateRappel: correspondance.fields.date_publication ?? "",
      lienFiche: correspondance.fields.lien_vers_la_fiche_rappel ?? null,
    };
  } catch {
    return null;
  }
}
