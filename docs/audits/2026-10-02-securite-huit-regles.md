# Audit sécurité — les huit règles de la liste rouge

- **Date :** 2026-10-02 (rapport rendu à 00:45 UTC)
- **Auteur :** Claude (assistant de développement du projet), à la demande de Bruno
- **Périmètre :** les 8 règles de la « ligne rouge » d'`AGENTS.md`, plus 3 contrôles de second rang (contenu affiché tel quel, dépendances, secrets dans l'historique Git)
- **Méthode :** lecture du code, commandes en lecture seule, requêtes simples sur la production (aucune attaque)

## Verdicts

| # | Règle | Verdict | Preuve principale |
|---|---|---|---|
| 1 | HTTPS partout | VRAI | `https://…/connexion` répond 200 ; la version `http://` est redirigée (308) vers https. |
| 2 | Mots de passe illisibles | VRAI | `bcrypt.hash(motDePasse, 10)` dans `src/lib/auth.ts` ; seul le hash est stocké. |
| 3 | Pas d'injection | VRAI | Aucune requête SQL brute à ce moment-là ; tout passe par Prisma. |
| 4 | Chacun ses données | VRAI | `estAutoriseSurRessource()` centralise le contrôle ; la condition `statut: "PUBLIE"` empêche deux associations de prendre le même don. |
| 5 | Clés jamais côté navigateur | VRAI | Seules deux variables `NEXT_PUBLIC_*` : la clé Google Maps navigateur et la clé publique des notifications. Aucun `.env` ni motif de clé dans l'historique Git. |
| 6 | Limite de fréquence partout | FAUX puis corrigé | Les téléchargements de documents n'avaient aucune limite : ajout d'une limite sur les 10 routes concernées. |
| 7 | Sauvegardes testées | PAS PU VÉRIFIER | Pas d'accès au compte Neon ; procédure de test donnée à Bruno (branche Neon isolée, jamais d'écrasement de la production). |
| 8 | Rien de bricolé ouvert | VRAI avec exception connue | La zone `/dev` est bloquée en production ; les comptes de démonstration restaient actifs (exception déjà acceptée dans `AGENTS.md`). |

## Contrôles de second rang

- Contenu affiché tel quel : aucun `dangerouslySetInnerHTML` dans le code. VRAI.
- Dépendances : 3 alertes hautes, toutes dans l'outil `prisma` (`deepmerge-ts`), sans correctif publié en amont. Non exploitable par un visiteur (outil de construction, pas du serveur en ligne).
- Secrets dans l'historique Git : aucun. VRAI.

## Incident signalé pendant l'audit

Une commande de l'assistant a affiché en clair le mot de passe de la base Neon dans la conversation (pas dans le code ni dans Git). Recommandation faite : le régénérer sur Neon puis mettre à jour `.env` et les variables Vercel. **Statut : régénération non confirmée.**

## Corrections

- Limite de fréquence sur les 10 routes de téléchargement : commit `088c30f` (2026-10-02).
