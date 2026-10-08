<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Brief de ce projet

## Le projet
- Ce que fait le produit : améliore et clarifie le processus de dons entre donateurs et donataires afin de faciliter le don.
- Pour qui : des entreprises donatrices (commerces / grande distribution, potentiellement soumises à la loi Garot au-delà de 400 m²) qui ont des invendus alimentaires ou matériels, des associations caritatives (aide alimentaire notamment), et un coordinateur qui supervise la plateforme.
- Ce qui est le plus important / ce que je ne veux jamais casser : le flux de don lui-même.

## Langue
- On se parle en français, et le code — noms de variables, de fichiers, commentaires — s'écrit aussi EN FRANÇAIS sur ce projet (convention déjà en place, à respecter).
- Même règle sur le repo : commits, titres d'issues et de pull requests en français.

## Comment je veux qu'on travaille (le tronc commun)
- Je pilote ce projet SANS lire le code. Je supervise le produit, pas les fichiers.
- Applique les meilleures pratiques par défaut, même si je ne les demande pas — c'est ton métier, pas le mien.
- Quand une tâche est finie, dis-moi précisément quoi tester à la main, comme un utilisateur.
- Les commits suivent le style déjà en place sur ce projet : une phrase en français à l'impératif ("Ajoute...", "Corrige...", "Simplifie..."), sans préfixe type feat:/fix:.

### Comme je débute (jamais codé, ou premiers pas avec un agent)
- Prends-moi par la main : explique tes choix en langage courant, jamais en jargon. Un mot technique = une définition en une phrase simple.
- Avant de te lancer sur quelque chose de gros, dis-moi ton plan en clair et attends mon feu vert.
- À chaque fois que tu touches à Git ou GitHub (commit, branche, pull request, workflow), dis-moi en UNE phrase simple ce que tu fais et à quoi ça sert — je veux comprendre mon poste de contrôle.

## RÈGLE VIVANTE
Chaque fois qu'une ligne de ce fichier me gêne à l'usage — trop de questions, pas assez, du jargon, des explications inutiles — je te demande de la modifier ici, et tu t'y tiens ensuite. Ce brief s'ajuste à moi, pas l'inverse.

## Garde-fous — demande-moi TOUJOURS avant de :
- toucher à l'authentification, aux comptes ou aux mots de passe des utilisateurs ;
- supprimer des données, des fichiers, ou faire une action irréversible ;
- déployer en production ;
- envoyer ou signer un document DocuSign réel (attestations, conventions, bons d'enlèvement) — ça crée une vraie enveloppe de signature électronique sur l'environnement partagé (pas de base de test séparée, voir plus bas) ;
- ajouter un nouveau service externe ou une nouvelle dépendance importante.
Dans ces cas : explique-moi le risque en langage simple, propose, et attends que je valide.

## La ligne rouge — sécurité non négociable (rappelle-la-toi à chaque fois)
Ce produit doit, en permanence, respecter ces règles. Si tu vois que l'une d'elles est violée, préviens-moi immédiatement.
1. Tout ce qui circule entre les utilisateurs et le produit est chiffré (HTTPS).
2. Les mots de passe des utilisateurs ne sont jamais lisibles par personne, même moi.
3. Personne ne peut parler directement à la base de données (pas d'injection).
4. Chaque utilisateur ne voit et ne modifie QUE ses propres données — même en trichant sur un identifiant dans l'URL.
5. Les clés d'accès (base de données, DocuSign, Google Maps serveur, ADEME) ne partent jamais vers le navigateur de l'utilisateur — seule la clé Google Maps dédiée au navigateur (NEXT_PUBLIC), restreinte par référent HTTP, est faite pour y être visible.
6. Chaque action a une limite de fréquence (personne ne peut se servir en boucle).
7. Les sauvegardes existent et ont été testées au moins une fois.
8. Rien de ce qui servait à tester ne reste ouvert en production — *exception connue et acceptée pour l'instant : les comptes de démo du seed (carrefour@exemple.fr, coeur@exemple.fr, resto@exemple.fr, mot de passe demo1234 ; le compte coordinateur bruno@exemple.fr a, depuis le 2026-10-08, un mot de passe personnel changé en base, plus demo1234 — le seed le remet à demo1234 s'il est relancé) existent en production car le produit n'est pas encore ouvert au public ; à corriger avant toute mise en ligne publique.*

## Conventions et décisions prises
- Pas de base de données de staging séparée : les tests en local (et par les agents Claude Code) écrivent directement dans la production (dons-invendus.vercel.app). Ne jamais déclencher de vraie signature DocuSign ni d'action irréversible pendant un test, sauf accord explicite.
- Style de commit : phrase en français à l'impératif, pas de conventional commits.

## Où on en est
- Dernière fonctionnalité livrée : l'attestation intérêt général signée par DocuSign (art. 238 bis du CGI), sur le même principe que l'attestation fiscale existante.
- Prochaine étape en attente : la vue détaillée du "dossier association" (habilitation, chaîne du froid, assurances...) affichée au donateur après qu'il se soit positionné sur un don — actuellement seul un badge résumé apparaît dans la liste des associations.
