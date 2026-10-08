# Audit externe n°2 — et vérification dans le code

- **Date :** 2026-10-08
- **Auteur du rapport :** un second auditeur externe (démonstrations exécutées sur une copie du code avec base et services simulés), transmis par Bruno
- **Vérification et corrections :** Claude, le même jour

## Rapport reçu (résumé fidèle)

1. **Critique — le verrou du site ne protège pas les accès directs** : le cookie de déverrouillage n'est contrôlé que dans l'affichage des pages ; avec un compte coordinateur de démonstration à mot de passe connu, les documents de toutes les organisations sont lisibles. L'auditeur note que les comptes de démo sont une exception acceptée dans `AGENTS.md`.
2. **Important — un appel malformé réserve des articles sans créer de bon** : `sePositionner(donId, true, [articleId, articleId])` laisse l'article réservé sans demande.
3. **Important — données d'un bon modifiables après les signatures** : les contrôles ne bloquent que lorsque le bon est confirmé ; le PDF reconstruit peut diverger du document signé chez DocuSign.
4. **Important — traitements coûteux en boucle** : l'analyse de pièce jointe par l'IA est rappelable sans limite (61 appels acceptés en essai) ; les pages `/associations` et `/dons` appellent Google Maps sans cache ni limite.

## Vérification dans le code, et suite donnée

| Point | Verdict | Détail et correction |
|---|---|---|
| 1 | **Vrai, en pire** | Le verrou n'est pas actif en production (page de connexion publique), donc aucun contournement n'est nécessaire : le compte coordinateur de démo était utilisable par tous. Aucune donnée réelle ne fuyait (12 comptes en base, tous de démo, aucun réel). **Action :** mot de passe du compte coordinateur changé directement dans la base à la demande de Bruno (contrôlé : l'ancien mot de passe est refusé). Les autres comptes de démo restent à traiter. |
| 2 | **Vrai, corrigé** | Doublons retirés avant toute écriture ; réservation partielle libérée. Commit `70e9e2b`. |
| 3 | **Vrai, corrigé** | Contrôle des articles refusé dès que l'association a signé (Bruno a confirmé que ce contrôle se fait toujours avant sa signature). Commit `70e9e2b`. La reconstruction du PDF depuis des données modifiables reste telle quelle. |
| 4 | **Vrai, corrigé pour l'IA** | Limite de 10 analyses par heure et par utilisateur. Commit `70e9e2b`. **Reste ouvert :** cache et limite sur les calculs Google Maps. |

## Réserves de l'auditeur
Exploitation HTTP complète, état réel des comptes de démo et des secrets, restrictions des clés Google Maps, sauvegardes, vulnérabilités des dépendances : non vérifiés par lui.
