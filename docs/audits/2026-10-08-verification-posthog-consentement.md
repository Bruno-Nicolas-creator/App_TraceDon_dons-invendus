# Vérification de l'intégration PostHog (consentement et masquage)

- **Date :** 2026-10-08
- **Auteur :** Claude, à la demande de Bruno
- **Méthode :** essais sur le site en local contre un **faux serveur PostHog** (aucune donnée envoyée au vrai service), avec un compte de démonstration et des données fictives
- **Commit :** `2848fde`

## Résultats des essais

| Situation | Requêtes reçues par le faux serveur |
|---|---|
| Avant tout accord (navigation, saisie d'un email fictif) | 0 (aucun cookie, rien d'écrit dans le navigateur) |
| Après un refus (rechargement, navigation) | 0 |
| Après accord, parcours complet | pages vues (adresses anonymisées), erreur technique, enregistrements d'écran |
| Après retrait de l'accord (clic, navigation, erreur provoquée, rechargement complet) | 0 nouvelle requête |

## Masquage de l'enregistrement d'écran (activé seulement pour l'essai)
- 777 textes enregistrés : 503 masqués (`****`), 274 lisibles qui sont uniquement des feuilles de style et des marqueurs de script ; 0 texte lisible destiné à l'utilisateur.
- Un IBAN, un numéro de téléphone, un nom et une saisie de champ fictifs n'apparaissent nulle part dans les données ; les liens sont remplacés par `*`.
- Pages enregistrables (liste blanche) : `/`, `/dons`, `/associations`, `/planning`, `/nouveau-don-materiel`. Aucune autre page n'est enregistrée.
- Une erreur fictive contenant un email et un téléphone est arrivée sous la forme « Erreur fictive pour [email] tel [nombre] ».

## Défauts trouvés pendant l'essai, corrigés avant livraison
1. PostHog contactait son serveur avant tout accord (expose déjà l'adresse IP) : il ne se charge plus du tout avant un accord.
2. L'enregistrement démarrait trop tôt et captait la page que l'on quittait (adresse complète d'un bon avec son identifiant) : démarrage après l'affichage de la nouvelle page, adresse anonymisée dans l'enregistrement.
3. Un champ d'adresse de session n'était pas nettoyé, et un événement d'accord partait à chaque page.

## Non vérifié
Comportement avec le vrai PostHog et ses réglages (région Europe, non-conservation de l'adresse IP, durée de conservation) ; bandeau sur mobile au-dessus de la barre d'onglets ; Safari et téléphone ; mention de PostHog dans la politique de confidentialité.

## Décision
L'enregistrement d'écran reste désactivé (`NEXT_PUBLIC_POSTHOG_REPLAY` absent). La mesure n'est active qu'avec une clé `phc_…` dans Vercel, qui n'existe pas encore.
