# Audit externe n°1 — et vérification dans le code

- **Date :** 2026-10-08
- **Auteur du rapport :** un premier auditeur externe, transmis par Bruno (sur une archive du code)
- **Vérification :** Claude, dans le code réel, le même jour

## Rapport reçu (résumé fidèle)

1. **Critique — accès aux pièces jointes d'un autre** (`api/dons/[donId]/piece-jointe`, `api/messages/[messageId]/piece-jointe`) : l'auditeur suppose que le code vérifie seulement l'authentification et propose de parcourir `/api/messages/1`, `/2`…
2. **Important — saturation par la génération de PDF** (`attestation-interet-general/…/pdf`, `bon-enlevement/…/pdf`) : appels en boucle ; limite jugée trop large ; file d'attente Redis suggérée.
3. **Important — données en trop renvoyées par les actions serveur** (`profil/actions.ts`, `messages/actions.ts`).
4. **Non vérifié par l'auditeur :** `AGENTS.md` et le middleware (protection de `/coordinateur`).

## Vérification dans le code

| Point | Verdict | Preuve |
|---|---|---|
| 1 | **Faux** | Les deux routes contrôlent l'appartenance (participant de la conversation ; propriétaire ou association attributaire). Tous les identifiants sont des `cuid` aléatoires, pas des numéros. La correction proposée utilise `participants` et `session.user.id`, qui n'existent pas dans le projet. |
| 2 | **À moitié juste** | Une limite par utilisateur existait déjà (60 par 5 minutes, partagée en base). La remarque de fond (le PDF coûte plus cher qu'un fichier) tient. |
| 3 | **Faux** | `profil/actions.ts` et `messages/actions.ts` ne renvoient que `{ ok: true }` ou rien ; aucune action ne renvoie un objet complet de la base. |
| 4 | **Vérifié** | Les pages `/coordinateur` contrôlent le rôle côté serveur, en plus du middleware. |

## Décision de Bruno
Ne pas resserrer la limite sur les PDF (« non »). Elle reste à 60 par 5 minutes et par utilisateur.
