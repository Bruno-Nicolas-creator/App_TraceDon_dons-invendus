# Vérification de la ligne de défense (rapport « tout non prouvé = NON VALIDÉ »)

- **Date :** 2026-10-08
- **Auteur :** Claude, à la demande de Bruno. **Pas indépendant** : l'assistant a lui-même réalisé une partie des corrections ; tous les contrôles ont donc été refaits ce jour-là.
- **Méthode :** lecture seule. Comptages et lectures dans la base partagée avec la production ; requêtes simples sur la production ; tests d'accès sur le site en local avec des sessions de test signées localement (jamais utilisées sur la production).

## Les huit règles

| # | Règle | Verdict | Preuve |
|---|---|---|---|
| 1 | HTTPS | VALIDÉ | https en 200 ; http redirigé (308) ; HSTS 2 ans avec preload. |
| 2 | Mots de passe | VALIDÉ | 12 comptes sur 12 avec un hash bcrypt ; coût 10 dans `src/lib/auth.ts`. |
| 3 | Injection | VALIDÉ | Une seule requête SQL brute (`src/lib/rateLimiter.ts`), paramétrée. |
| 4 | Chacun ses données | VALIDÉ (lectures) / PAS PU VÉRIFIER (écritures) | Test local, 6 profils sur 5 ressources : un compte étranger reçoit 403 ou 404, sans session 307, jeton falsifié refusé. Écritures relues dans le code uniquement. |
| 5 | Clés côté navigateur | VALIDÉ côté code, avec réserve | 0 des 14 valeurs secrètes dans le build local (42 fichiers) ni dans la production (12 fichiers) ; `.env` jamais commité ; 2 motifs dans l'historique = exemples de `.env.example`. Réserve : régénération du mot de passe Neon non confirmée. |
| 6 | Limite de fréquence partout | NON VALIDÉ | 10 routes de téléchargement sur 10 limitées, mais 10 appels au limiteur pour 56 actions serveur ; aucune limite sur les 18 actions du profil (dont l'envoi de documents de 5 Mo), `publierDon`, `sePositionner`, les ajouts d'articles, ni sur les pages Google Maps. |
| 7 | Sauvegardes testées | NON VALIDÉ | Aucune trace d'un test de restauration ; pas d'accès à Neon. |
| 8 | Restes de chantier | NON VALIDÉ | Voir plus bas. |

## Audits
- Audits sécurité et architecture exécutés et datés : VALIDÉ (voir les autres fichiers de ce dossier).
- Rapports archivés : NON VALIDÉ au moment de la vérification (c'est l'objet de ce dossier).
- Rendez-vous récurrents : NON VALIDÉ (0 tâche planifiée, 0 automatisation, aucun événement d'agenda, pas de GitHub Actions ni de Dependabot).
- Dépendances : NON VALIDÉ, 5 alertes hautes (`deepmerge-ts` via Prisma, `sharp`, `source-map-js` ; les deux derniers corrigeables sans risque).

## Vigie
- Code de suivi dans le produit : VALIDÉ.
- Des données remontent : NON VALIDÉ (aucune clé PostHog dans la production).
- Routine d'alerte : NON VALIDÉ (aucune).

## Restes de chantier
- Comptes de démo : 12 comptes en base, tous de démonstration, aucun réel ; 5 acceptent encore le mot de passe de démonstration ; le coordinateur ne l'accepte plus.
- Données de test : 25 dons en base dont 3 publiés, visibles des associations qui s'inscriraient.
- Zone `/dev`, `/__diag`, pages d'administration : VALIDÉ (redirigent vers la connexion en production ; aucun rôle n'autorise `/dev`).
- Verrou « mode caché » : NON VALIDÉ (inactif en production).
- DocuSign : PAS PU VÉRIFIER ; le `.env` local pointe vers l'environnement de démonstration.

## Non vérifié
Parcours utilisateur à la main ; sauvegardes et mot de passe Neon ; variables Vercel ; restriction de la clé Google Maps ; actions d'écriture à l'exécution ; issues et protection de branche GitHub.
