# Archive des audits

Un fichier par rapport, nommé `AAAA-MM-JJ-sujet.md`. Chaque rapport indique sa date, son auteur, sa méthode, ses constats, les corrections (avec le commit) et ce qui n'a pas pu être vérifié.

Règle de ce dossier : **aucun mot de passe, aucune clé, aucun jeton, aucune valeur secrète, même masquée à moitié.** On y met le nom d'une variable, jamais sa valeur.

## Rapports

| Date | Rapport | Auteur |
|---|---|---|
| 2026-10-02 | [Sécurité — les huit règles](2026-10-02-securite-huit-regles.md) | Claude |
| 2026-10-02 | [Sécurité — mode attaquant](2026-10-02-securite-attaquant.md) | Claude |
| 2026-10-08 | [Audit externe n°1](2026-10-08-auditeur-externe-1.md) | Auditeur externe, vérifié par Claude |
| 2026-10-08 | [Audit externe n°2](2026-10-08-auditeur-externe-2.md) | Auditeur externe, vérifié par Claude |
| 2026-10-08 | [Analyse d'architecture](2026-10-08-architecture.md) | Analyse externe, évaluée par Claude |
| 2026-10-08 | [Vérification PostHog (consentement, masquage)](2026-10-08-verification-posthog-consentement.md) | Claude |
| 2026-10-08 | [Vérification de la ligne de défense](2026-10-08-verification-ligne-de-defense.md) | Claude |

## Registre des points encore ouverts (au 2026-10-08)

| Point | Origine | État |
|---|---|---|
| Comptes de démonstration : 5 acceptent encore le mot de passe de démonstration, données de test visibles des associations | règle 8, audit externe n°2 | **Décision de Bruno le 2026-10-08 : ne rien changer.** Seul le mot de passe du coordinateur a été modifié ; les autres comptes de démo et les données de test restent en l'état (exception déjà documentée dans `AGENTS.md`, à traiter avant l'ouverture au public). La vérification mensuelle continuera de le signaler comme point ouvert connu. |
| Limites de fréquence sur les actions d'écriture (envoi de documents, publication, positionnement, ajouts) | règle 6 | **Corrigé le 2026-10-08** (voir plus bas). Reste : les pages qui appellent Google Maps. |
| Cache et limite des calculs Google Maps | audit externe n°2, architecture | Ouvert. |
| Test de restauration de sauvegarde (Neon) | règle 7 | Ouvert : à faire par Bruno sur une branche Neon isolée. |
| Régénération du mot de passe de la base Neon exposé par erreur le 2026-10-02 | audit du 2026-10-02 | Non confirmée. |
| Verrou « mode caché » inactif en production | audit externe n°2 | Ouvert (variable `SITE_PASSWORD` jamais reçue par le serveur). |
| DocuSign : environnement de démonstration ou de production en ligne ? | vérification du 2026-10-08 | À vérifier dans Vercel. |
| Dépendances : 5 alertes hautes (`sharp` et `source-map-js` corrigeables sans risque) | vérification du 2026-10-08 | **Partiellement corrigé le 2026-10-08** : `sharp` et `source-map-js` mis à jour. Restent 3 alertes (`deepmerge-ts` via l'outil Prisma, sans correctif publié en amont, non exploitable par un visiteur) et 1 alerte dans un outil de développement (`braces`). |
| Vigie : clé PostHog absente, aucune alerte d'erreur ni de disponibilité | vérification du 2026-10-08 | **Partiel.** Surveillance de disponibilité en place depuis le 2026-10-08 (tâche planifiée quotidienne, alerte seulement en cas de problème). Reste ouvert : clé PostHog absente, donc aucune remontée d'erreurs des visiteurs ni alerte associée. |
| Rendez-vous récurrents d'audit | vérification du 2026-10-08 | **En place depuis le 2026-10-08** : tâche planifiée `verification-mensuelle-securite`, le 1er de chaque mois à 9 h, première exécution le 2026-11-01. Elle ne s'exécute que si l'application Claude est ouverte (sinon au prochain lancement) ; ses rapports arrivent dans ce dossier, sans commit. |
| Limite de fréquence resserrée sur la génération de PDF | audit externe n°1 | Refusé par Bruno le 2026-10-08. |
| Gros chantiers d'architecture (regroupement des règles, fusion DocuSign, découpage des écrans) | analyse d'architecture | Reportés, en attendant des vérifications automatiques sur une base séparée. |

## Corrigé

| Point | Commit | Date |
|---|---|---|
| Fuite SSRF (notifications push), contrôle d'appartenance du bon, limite de fréquence partagée en base, limites sur les téléchargements | `088c30f` | 2026-10-02 |
| Réservations d'articles sans bon, contrôle des articles figé après signature, limite sur l'IA | `70e9e2b` | 2026-10-08 |
| Photos et pièces jointes des dons divisibles, retrait refusé restauré à l'écran, champ température, code mort | `79a58d0` | 2026-10-08 |
| Mesure d'audience PostHog avec consentement | `2848fde` | 2026-10-08 |
| Mot de passe du compte coordinateur de démonstration | modification en base, sans commit | 2026-10-08 |
| Limites de fréquence : plafond général sur toutes les actions serveur (600 par 5 min), envois de fichiers (30 par heure), publication et positionnement (30 par heure), déverrouillage du site (10 par 10 min et par IP) | à commiter | 2026-10-08 |
| Dépendances `sharp` (0.35.5) et `source-map-js` (1.2.2) mises à jour | à commiter | 2026-10-08 |
| Surveillance quotidienne de disponibilité (tâche planifiée `surveillance-quotidienne-tracedon`, 8 h) | tâche locale, sans commit | 2026-10-08 |
