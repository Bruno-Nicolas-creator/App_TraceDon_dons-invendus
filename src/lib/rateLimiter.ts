import "server-only";

/**
 * Limiteur de débit basique en mémoire (fenêtre glissante par clé). Suffisant pour dissuader
 * le bourrage d'identifiants sur un déploiement mono-instance ; ne survit pas à un redémarrage
 * ni ne se partage entre plusieurs instances serverless — pour une protection robuste en
 * production multi-instance, remplacer par un compteur partagé (ex. Redis).
 */
const tentatives = new Map<string, number[]>();

export function tropDeTentatives(cle: string, maxTentatives: number, fenetreMs: number): boolean {
  const maintenant = Date.now();
  const historique = (tentatives.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);

  if (historique.length >= maxTentatives) {
    tentatives.set(cle, historique);
    return true;
  }

  historique.push(maintenant);
  tentatives.set(cle, historique);
  return false;
}
