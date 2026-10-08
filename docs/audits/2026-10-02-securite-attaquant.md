# Audit sécurité en mode attaquant

- **Date :** 2026-10-02 (rapport rendu à 00:51 UTC)
- **Auteur :** Claude, à la demande de Bruno (consigne : se comporter en attaquant, ne rien modifier, ne rien lancer contre la production)
- **Périmètre :** tout le code ; liste rouge d'`AGENTS.md` repassée

## Trouvailles

### 1. Critique — fuite SSRF via les notifications push
- **Fichiers :** `src/app/profil/actions.ts` (enregistrement de l'abonnement), `src/lib/webPush.ts` (envoi)
- **Attaque :** n'importe quel compte appelle directement l'action d'enregistrement avec une adresse arbitraire ; à la prochaine notification, le serveur envoie lui-même une requête vers cette adresse.
- **Correction :** n'accepter que les domaines des vrais services de notification (Google, Mozilla, Apple, Windows).

### 2. Important — contrôle d'appartenance exécuté trop tard sur le bon d'enlèvement
- **Fichier :** `src/app/bon-enlevement/[bonId]/page.tsx`
- **Attaque :** la vérification DocuSign (écriture en base et notification) avait lieu avant le contrôle « ce bon m'appartient-il ? ». Un compte étranger connaissant l'identifiant (visible dans le QR code imprimé) pouvait déclencher cette vérification.
- **Correction :** déplacer le contrôle d'appartenance avant l'appel DocuSign (les 3 pages sœurs le faisaient déjà).

### 3. Important — limites de fréquence en mémoire, non partagées entre instances Vercel
- **Fichier :** `src/lib/rateLimiter.ts`
- **Attaque :** des requêtes parallèles atterrissent sur des instances différentes et obtiennent chacune leur propre quota.
- **Correction :** compteur stocké en base (table `LimiteFrequence`, requête atomique).

## Preuve de la correction n°3
Essai contre la base réelle : séquentiel, 5 passent puis blocage ; 7 appels simultanés avec une limite de 5 : exactement 5 passent, 2 sont bloqués, compteur final exact (7).

## Corrections
Commit `088c30f` (2026-10-02). La migration `20261002005524_limite_frequence` a été appliquée à la base de production avec l'accord explicite de Bruno.

## Non vérifié à l'époque
- Exploitation réelle du SSRF (non exécutée, par prudence).
- Comportement sous charge réelle sur plusieurs instances Vercel.
