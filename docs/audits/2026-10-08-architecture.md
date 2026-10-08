# Analyse d'architecture — et suite donnée

- **Date :** 2026-10-08
- **Auteur du rapport :** une analyse d'architecture externe, transmise par Bruno (aucun fichier modifié par l'auteur)
- **Évaluation :** Claude, le même jour

## Rapport reçu (résumé fidèle)

| Priorité | Sujet | Effort annoncé |
|---|---|---|
| 1 | Règles d'attribution, de modification et d'accès dispersées ; `sePositionner` fait 154 lignes ; la route photo vérifie l'attribution du don entier alors que les articles divisibles sont attribués un par un | 2 à 4 jours |
| 2 | Écrans et base désynchronisés quand le serveur refuse un retrait d'article | 1 à 2 jours |
| 3 | Signature DocuSign recopiée quatre fois (`docusign.tsx`, 839 lignes) | 2 à 3 jours |
| 4 | Politique de fichiers dispersée (5 Mo, formats) | 1 à 1,5 jour |
| 5 | Chargements qui grossissent avec les données (distances, messages non lus, contenus binaires chargés pour rien) | 1 à 2 jours |
| 6 | Types et noms trompeurs (`temperatureHorsPlage` reçoit `dlcDepassee`, conversions `as unknown as never`) | ½ à 1 jour |
| 7 | Gros écrans (`profil/page.tsx` 791 lignes, `BonEnlevementClient.tsx` 723 lignes) | 1 à 2 jours |
| 8 | Code sans usage (`demarrerConventionAction`, `marquerConversationLueAction`) | 2 à 4 heures |

Préalable recommandé par l'auteur : des vérifications automatiques isolées du flux de don (le projet n'a aucun test et son environnement local utilise la production).

## Évaluation
Faits vérifiés exacts (tailles de fichiers, absence de tests, code mort, article non restauré à l'écran, champ température, accès aux photos des dons divisibles).

**Réalisé le 2026-10-08 (commit `79a58d0`) :** accès aux photos et pièces jointes des dons divisibles ; champ température retiré ; article restauré avec message d'erreur dans les trois écrans ; deux actions mortes supprimées.

**Volontairement non fait :** regroupement des règles d'attribution, fusion du code DocuSign, découpage des gros écrans, règles de fichiers, optimisation des chargements. Raison : peu de bénéfice visible, et risque de casser le flux de don sans filet de tests. À reconsidérer après mise en place de vérifications automatiques sur une base séparée de la production.
