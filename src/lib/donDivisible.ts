/**
 * Un don matériel peut être marqué "divisible" (cf. Don.divisible) : plusieurs associations se
 * partagent alors ses articles, chacune réclamant les siens (Article.associationAssigneeId) et
 * recevant son propre bon d'enlèvement. Un don non divisible (matériel ou alimentaire) garde le
 * fonctionnement d'origine : un seul bon, une seule association, tous les articles.
 */
export function articlesDuBon<A extends { associationAssigneeId: string | null }>(
  don: { divisible: boolean },
  articles: A[],
  bonAssociationId: string
): A[] {
  if (!don.divisible) return articles;
  return articles.filter((a) => a.associationAssigneeId === bonAssociationId);
}

/** Poids total (kg) d'un lot d'articles — même calcul répété à plusieurs endroits de l'app. */
export function poidsTotalArticles(articles: { poidsKg: number }[]): number {
  return articles.reduce((total, a) => total + a.poidsKg, 0);
}

/** Vrai si chaque article du don a désormais un attributaire (plus rien à réclamer). */
export function articlesEntierementReclames(don: {
  divisible: boolean;
  associationAssigneeId: string | null;
  articles: { associationAssigneeId: string | null }[];
}): boolean {
  if (!don.divisible) return don.associationAssigneeId != null;
  return don.articles.every((a) => a.associationAssigneeId != null);
}
