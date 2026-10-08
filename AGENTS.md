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

## Habitude : garder ce fichier à jour
- À la fin de chaque tâche, et AVANT chaque commit, Claude se demande si AGENTS.md doit changer : nouvelle règle ou convention, décision de Bruno, nouvelle variable d'environnement, tâche planifiée créée ou modifiée, point ouvert ou résolu, section « Où on en est ». Si oui, il le met à jour dans le même commit ; si non, il le dit en une phrase.
- Rappel automatique : un réglage du projet (.claude/settings.json, script .claude/hooks/rappel-agents-md.js) rappelle cette question à Claude quand il commite du code ou de la configuration (et rappelle aussi la rubrique des idées en dernière partie du fichier, même si AGENTS.md est déjà modifié). Il ne bloque jamais.
- Filet de sécurité : la vérification mensuelle (tâche planifiée verification-mensuelle-securite) contrôle aussi que ce fichier reflète l'état réel du projet.
- Jamais de secret dans ce fichier : seulement des noms de variables, jamais leurs valeurs.

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
- Mesure d'audience PostHog : soumise au consentement (bandeau + choix modifiable dans le profil), inactive tant que NEXT_PUBLIC_POSTHOG_KEY est absente, aucune requête vers PostHog avant accord ni après refus. L'enregistrement d'écran reste désactivé (NEXT_PUBLIC_POSTHOG_REPLAY) tant que Bruno ne l'active pas explicitement. Ne jamais mettre de clé personnelle PostHog (phx_) dans le code, un fichier versionné ou une variable NEXT_PUBLIC_.

- Limites de fréquence (règle 6) : stockées en base (table LimiteFrequence, src/lib/rateLimiter.ts), partagées entre toutes les instances Vercel. Toute action serveur doit récupérer la session avec getSessionLimitee (src/lib/sessionLimitee.ts, importée sous le nom getSession dans les fichiers d'actions), jamais avec getSession de src/lib/auth.ts ; toute route de téléchargement appelle tropDeLecturesDocument ; les envois de fichiers, la publication et le positionnement ont leurs limites dédiées. Toute nouvelle action ou route doit suivre ce modèle.
- Audits : les rapports sont archivés dans docs/audits/ (index et registre des points ouverts dans docs/audits/README.md), sans aucun secret. Deux tâches planifiées existent (visibles dans la section « Scheduled » de l'application Claude) : verification-mensuelle-securite (le 1er de chaque mois à 9 h, écrit un rapport sans commit) et surveillance-quotidienne-tracedon (chaque matin à 8 h, alerte seulement en cas de problème). Elles ne tournent que si l'application Claude est ouverte.
- Décision de Bruno (2026-10-08) : on garde les comptes de démo carrefour, coeur, resto et les données de test en production, pour l'instant. À trancher avant toute ouverture au public.
- Le verrou « mode caché » (SITE_PASSWORD) n'est pas actif en production : la variable n'arrive pas au serveur sur Vercel, cause non élucidée. Le site est donc accessible à tous, inscription ouverte.
- DocuSign : l'environnement local pointe vers la démo (demo.docusign.net), dont les signatures n'ont pas de valeur légale ; à vérifier côté Vercel avant l'ouverture au public.

## Où on en est
- Dernière fonctionnalité livrée : l'attestation intérêt général signée par DocuSign (art. 238 bis du CGI), sur le même principe que l'attestation fiscale existante.
- Dernières évolutions (2026-10-08) : durcissement sécurité (SSRF, contrôle d'accès du bon, limites de fréquence partout, dépendances), mesure d'audience PostHog avec consentement (inactive tant que la clé n'est pas dans Vercel), archive des audits et surveillance planifiée.
- Avant l'ouverture au public : lire le registre des points ouverts dans docs/audits/README.md (sauvegarde Neon à tester, mot de passe Neon à régénérer, comptes de démo, verrou du site, DocuSign, clé PostHog).
- Prochaine étape en attente : la vue détaillée du "dossier association" (habilitation, chaîne du froid, assurances...) affichée au donateur après qu'il se soit positionné sur un don — actuellement seul un badge résumé apparaît dans la liste des associations.

## Idées de Claude, pas encore demandées (toujours en dernière rubrique)
Règles de cette rubrique (décidées par Bruno le 2026-10-08) :
- Elle liste ce que Claude a repéré d'utile et que Bruno n'a pas encore demandé. Claude n'exécute RIEN de cette liste sans que Bruno le demande.
- Plafond : 15 lignes au maximum dans « À proposer ». Quand c'est plein, Claude regroupe des lignes ou demande à Bruno de trancher.
- Une ligne = une phrase : `[urgence] action — pourquoi — effort — repéré le AAAA-MM-JJ`. Urgences : « avant ouverture », « utile », « confort ». Classées de la plus urgente à la moins urgente. La sécurité détaillée reste dans docs/audits/README.md ; cette rubrique le référence sans le dupliquer.
- Mise à jour : à chaque commit (le rappel automatique le demande), Claude ajoute ce qu'il a repéré et retire ce que Bruno vient de demander ou de faire. Si Bruno dit « non », la ligne passe dans « Écartées par Bruno » avec la date, et Claude ne la repropose pas. La vérification mensuelle propose de nouvelles idées dans son rapport, sans modifier ce fichier.
- Aucun secret : des noms, jamais des valeurs.

### À proposer (12 sur 15)
- [avant ouverture] Trancher le sort des comptes de démo carrefour, coeur, resto et des 25 dons de test visibles des associations — ils sont utilisables par tous avec un mot de passe connu — 1 h — repéré le 2026-10-08
- [avant ouverture] Tester une restauration de sauvegarde Neon sur une branche isolée, et régénérer le mot de passe de la base exposé par erreur le 2026-10-02 — gestes de Bruno sur Neon, Claude le guide — 30 min — repéré le 2026-10-02
- [avant ouverture] Vérifier dans Vercel si DocuSign pointe vers la démo (signatures sans valeur légale) ou la production — 15 min — repéré le 2026-10-08
- [avant ouverture] Faire marcher le verrou « mode caché » (SITE_PASSWORD) ou y renoncer : le site est public avec l'inscription ouverte — il faut une capture des variables Vercel — 1 h — repéré le 2026-10-01
- [avant ouverture] Créer le projet PostHog (région Europe), mettre la clé phc_ dans Vercel, et citer PostHog dans la politique de confidentialité — 30 min — repéré le 2026-10-08
- [utile] Ajouter une alerte sur les erreurs des visiteurs une fois PostHog branché — pour réagir avant qu'un utilisateur ne se plaigne — 1 h — repéré le 2026-10-08
- [utile] Mettre en cache les distances Google Maps des pages /associations et /dons — économise le quota Google et accélère l'affichage — 2 à 3 h — repéré le 2026-10-08
- [utile] Mettre en place des tests automatiques du flux de don sur une base séparée de la production — prérequis pour tout gros nettoyage du code sans casser le don — 1 à 2 jours — repéré le 2026-10-08
- [utile] Afficher le « dossier association » détaillé au donateur après son positionnement (c'est la « prochaine étape en attente » ci-dessus) — il manque aujourd'hui un détail sur l'habilitation et la chaîne du froid — 1 à 2 jours — repéré le 2026-09-29
- [confort] Fusionner les quatre copies du code de signature DocuSign (docusign.tsx, 839 lignes) — une correction n'aurait plus à être répétée — 2 à 3 jours, après les tests automatiques — repéré le 2026-10-08
- [confort] Découper les gros écrans profil/page.tsx (791 lignes) et BonEnlevementClient.tsx (723 lignes) — modifications plus sûres — 1 à 2 jours, après les tests automatiques — repéré le 2026-10-08
- [confort] Regrouper la politique de fichiers (5 Mo, formats) aujourd'hui répétée en plusieurs endroits — ajouter un format ne demanderait qu'une modification — 1 jour — repéré le 2026-10-08

### Écartées par Bruno (ne pas reproposer)
- Resserrer la limite de téléchargement des PDF à environ 10 par minute — écarté le 2026-10-08
- Supprimer ou changer le mot de passe des comptes de démo autres que le coordinateur — écarté pour l'instant le 2026-10-08 (voir la première ligne ci-dessus : à retrancher avant l'ouverture)
