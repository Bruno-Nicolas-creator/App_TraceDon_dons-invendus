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
- TraceDon est le nom commercial de l'application (affiché partout depuis le 2026-10-05). Son site vitrine est un projet séparé (dépôt tracedon-vitrine, publié sur www.tracedon.fr).
- Décision de Bruno (2026-10-09) : l'application sera **entièrement reconstruite** par un développeur. La référence est le cahier des charges docs/cahier-des-charges-parcours.md (sa version illustrée est copiée dans docs/cahier-des-charges-parcours.html à chaque mise à jour) (parcours des trois rôles, règles R1 à R21, diagrammes, écarts de la V1 en annexe A) ; docs/manuel.html décrit la V1 telle qu'elle fonctionne (mis à jour le 2026-10-09, avec ses limites connues). Toute évolution des parcours se reporte dans ce cahier des charges.
- Décision de Bruno (2026-10-09) : **la V1 est gelée fonctionnellement**. Les décisions du cahier des charges ne sont pas implémentées dans la V1 et ne doivent pas l'être : elles sont réservées à la reconstruction. Dans la V1, seuls se font désormais les correctifs que Bruno demande explicitement (sécurité, panne).
- Exception décidée par Bruno le 2026-10-10 : il a demandé des évolutions précises de la V1 (bon d'enlèvement, annuaire, archives, notifications, convention, limites connues). Elles sont faites dans la V1 ET reportées dans le cahier des charges (version 1.3) et le manuel. Le gel reste la règle pour tout ce qu'il ne demande pas explicitement.
- Bon d'enlèvement (2026-10-10) : signatures dans l'ordre libre ; liste modifiable tant que les deux n'ont pas signé ; toute modification après une première signature annule la signature et la séance DocuSign en cours, et prévient la partie concernée (src/lib/bonSignature.ts) ; plus rien de modifiable après les deux signatures. Toute nouvelle action qui modifie un bon doit appeler assurerBonModifiable puis invaliderSignaturesBon.
- Reçu fiscal (chantier C1, 2026-10-10) : l'entreprise demande un reçu par association et par année avec la valeur qu'elle a calculée (justificatif facultatif) ; l'association l'émet et le signe, ou le conteste avec un motif ; l'application ne calcule plus de montant (src/lib/attestationFiscale.ts, src/app/attestations/). Le numéro d'ordre est attribué à l'émission seulement (emettreRecuAvecNumero). Les anciennes attestations calculées restent consultables.
- Alertes « nouveau don » (chantier C2, 2026-10-10) : envoyées après la réponse (after de next/server) par src/lib/alertesDon.ts à la publication sur la place de marché et quand des articles d'un don divisible redeviennent libres ; réglages de l'association dans son profil (alertesActives, alerteRayonKm, alerteFamilles ; src/lib/famillesAlerte.ts). Sans regroupement ni désinscription en un clic (décision de Bruno). E-mails : domaine tracedon.fr vérifié chez Resend le 2026-10-10 (3 enregistrements DNS ajoutés par Bruno chez o2switch : resend._domainkey en TXT, send et rsend en CNAME — ne pas les supprimer) ; RESEND_FROM_EMAIL = « TraceDon <notifications@tracedon.fr> » en local et dans Vercel (Production). La clé RESEND_API_KEY locale ne peut qu'envoyer (clé restreinte).
- « Mes dons » et annulation (chantier C3, 2026-10-10) : écran /mes-dons de l'entreprise (src/lib/mesDons.ts, état calculé par src/lib/etatDon.ts) ; toute annulation de don passe par src/lib/annulationDon.ts (motif obligatoire, impossible dès qu'un bon est signé ou confirmé, associations prévenues, enveloppes DocuSign ouvertes fermées), y compris l'annulation automatique pour congés.
- Mots de passe (chantier C4a, 2026-10-10) : « mot de passe oublié » par lien e-mail (1 h, usage unique, seule l'empreinte SHA-256 est stockée, table JetonReinitialisation, src/lib/reinitialisation.ts) et changement depuis le profil. Chaque compte a une version de session (User.sessionVersion) inscrite dans le cookie ; getSession la revérifie en base à chaque requête : tout changement de mot de passe l'incrémente et déconnecte les autres sessions. Tout nouveau code qui change un mot de passe doit faire de même.
- Informations modifiables (chantier C4b, 2026-10-11) : nom de l'utilisateur, e-mail de connexion (lien de confirmation vers la nouvelle adresse, table JetonReinitialisation avec nouvelEmail, src/lib/changementEmail.ts, page publique /confirmer-email qui exige un clic), adresse et informations secondaires de l'organisation (src/app/profil/InformationsCompte.tsx). Décision de Bruno (option A) : nom de l'organisation, SIRET et RNA corrigés seulement par le coordinateur.
- Numéros de bon et d'attestation : séquence annuelle sans doublon (src/lib/numerotation.ts) ; dates « du jour », mois et périodes saisies à l'heure de Paris (src/lib/dateParis.ts), jamais à l'heure du serveur. Exception demandée par Bruno le 2026-10-10 : le don matériel a les mêmes informations de lot que l'alimentaire (titre, description, adresse de récupération, pièce jointe), et le PDF du bon affiche une « Description du lot » et le type de don.
- Décisions fonctionnelles du 2026-10-09 (détail en annexe C du cahier des charges) : le reçu fiscal est valorisé une fois par an par l'entreprise avec son propre logiciel (montant total saisi ou fichier importé), puis émis et signé par l'association, qui doit au minimum avoir auto-déclaré son intérêt général ; l'application ne calcule plus de montant. Alertes « nouveau don » par e-mail et notification (rayon et catégories choisis par l'association, pas de SMS pour l'instant). Le bénévole ne signe pas lui-même : l'association signe pour lui. Convention signée dans n'importe quel ordre et reconduite tacitement ; attestation d'intérêt général sans limite de durée. Badge « Vérifiée » informatif. Congés : dons récurrents suspendus, réactivables à la main. Plusieurs utilisateurs par organisation avec niveaux d'accès ; e-mail vérifié à l'inscription ; documents des associations visibles par les entreprises.

## Où on en est
- Dernière fonctionnalité livrée : l'attestation intérêt général signée par DocuSign (art. 238 bis du CGI), sur le même principe que l'attestation fiscale existante.
- Dernières évolutions (2026-10-08) : durcissement sécurité (SSRF, contrôle d'accès du bon, limites de fréquence partout, dépendances), mesure d'audience PostHog avec consentement (inactive tant que la clé n'est pas dans Vercel), archive des audits et surveillance planifiée.
- Avant l'ouverture au public : lire le registre des points ouverts dans docs/audits/README.md (sauvegarde Neon à tester, mot de passe Neon à régénérer, comptes de démo, verrou du site, DocuSign, clé PostHog).
- Cahier des charges de la reconstruction rédigé le 2026-10-09 : docs/cahier-des-charges-parcours.md, et sa version illustrée partageable au développeur (page privée https://claude.ai/artifact/Je2vwCwVEZZF6fxeKwfu94, à partager depuis le bouton Partager). Toutes les hypothèses ont été tranchées par Bruno (version 1.2). Restent à faire valider par des tiers : mentions, numérotation du reçu fiscal et durées de conservation (juriste) ; niveau de signature électronique (le développeur explique les options à Bruno avant de coder).
- 2026-10-10 : demandes de Bruno appliquées à la V1 (lots A et B) : bon d'enlèvement à signature libre avec re-signature après modification, badges retirés de l'annuaire, filtres des archives, notifications d'attribution et de convention, convention sans ordre, limites simples corrigées (DLC, republication, planning, don divisible, numérotation, heure de Paris). Manuel, PDF et cahier des charges 1.3 à jour.
- 2026-10-10 : chantier C1 (reçu fiscal valorisé) livré, avec la migration 20261010010000_recu_fiscal_valorise appliquée à la base avec l'accord de Bruno.
- 2026-10-10 : chantier C2 (alertes nouveau don) livré, avec la migration 20261010020000_alertes_nouveau_don appliquée à la base avec l'accord de Bruno.
- 2026-10-10 : chantier C3 (« Mes dons » et annulation) livré, avec la migration 20261010030000_annulation_don appliquée à la base avec l'accord de Bruno.
- 2026-10-10 : e-mails réparés (domaine tracedon.fr vérifié chez Resend, RESEND_FROM_EMAIL et RESEND_API_KEY ajoutées dans Vercel par Bruno, avec une clé d'envoi dédiée à la production) ; alertes des 5 associations de démo coupées (choix de Bruno, pour ne pas écrire aux adresses @exemple.fr) ; chantier C4a (mot de passe oublié et changement de mot de passe) livré, avec la migration 20261010040000_reinitialisation_mot_de_passe appliquée avec l'accord de Bruno.
- 2026-10-11 : chantier C4b (informations modifiables) livré, avec la migration 20261010050000_changement_email appliquée avec l'accord de Bruno.
- Prochaine étape : suite du lot C, présentée chantier par chantier avant de commencer (C4c plusieurs utilisateurs par organisation avec niveaux d'accès, fichiers hors base et base de test séparée) ; puis transmettre le cahier des charges au développeur.

## Idées de Claude, pas encore demandées (toujours en dernière rubrique)
Règles de cette rubrique (décidées par Bruno le 2026-10-08) :
- Elle liste ce que Claude a repéré d'utile et que Bruno n'a pas encore demandé. Claude n'exécute RIEN de cette liste sans que Bruno le demande.
- Plafond : 15 lignes au maximum dans « À proposer ». Quand c'est plein, Claude regroupe des lignes ou demande à Bruno de trancher.
- Une ligne = une phrase : `[urgence] action — pourquoi — effort — repéré le AAAA-MM-JJ`. Urgences : « avant ouverture », « utile », « confort ». Classées de la plus urgente à la moins urgente. La sécurité détaillée reste dans docs/audits/README.md ; cette rubrique le référence sans le dupliquer.
- Mise à jour : à chaque commit (le rappel automatique le demande), Claude ajoute ce qu'il a repéré et retire ce que Bruno vient de demander ou de faire. Si Bruno dit « non », la ligne passe dans « Écartées par Bruno » avec la date, et Claude ne la repropose pas. La vérification mensuelle propose de nouvelles idées dans son rapport, sans modifier ce fichier.
- Aucun secret : des noms, jamais des valeurs.

### À proposer (8 sur 15)
- [avant ouverture] Trancher le sort des comptes de démo carrefour, coeur, resto et des 25 dons de test visibles des associations — ils sont utilisables par tous avec un mot de passe connu — 1 h — repéré le 2026-10-08
- [avant ouverture] Tester une restauration de sauvegarde Neon sur une branche isolée, et régénérer le mot de passe de la base exposé par erreur le 2026-10-02 — gestes de Bruno sur Neon, Claude le guide — 30 min — repéré le 2026-10-02
- [avant ouverture] Vérifier dans Vercel si DocuSign pointe vers la démo (signatures sans valeur légale) ou la production — 15 min — repéré le 2026-10-08
- [avant ouverture] Faire marcher le verrou « mode caché » (SITE_PASSWORD) ou y renoncer : le site est public avec l'inscription ouverte — il faut une capture des variables Vercel — 1 h — repéré le 2026-10-01
- [avant ouverture] Créer le projet PostHog (région Europe), mettre la clé phc_ dans Vercel, et citer PostHog dans la politique de confidentialité — 30 min — repéré le 2026-10-08
- [utile] Donner au coordinateur un écran pour corriger le nom, le SIRET ou le RNA d'une organisation — sinon une correction demandée par un utilisateur passe par une modification directe en base — 1 h — repéré le 2026-10-11
- [utile] Ajouter chez o2switch un enregistrement DMARC pour tracedon.fr (ligne TXT _dmarc) — aide les messageries à ne pas classer les e-mails de TraceDon en indésirables — geste de Bruno guidé par Claude — 10 min — repéré le 2026-10-10
- [utile] Ajouter une alerte sur les erreurs des visiteurs une fois PostHog branché — pour réagir avant qu'un utilisateur ne se plaigne — 1 h — repéré le 2026-10-08

### Écartées par Bruno (ne pas reproposer)
- Corriger dans la V1 ses défauts du flux de don pendant la reconstruction — écarté le 2026-10-09 (la V1 reste en l'état, tout est pour la reconstruction)
- Resserrer la limite de téléchargement des PDF à environ 10 par minute — écarté le 2026-10-08
- Supprimer ou changer le mot de passe des comptes de démo autres que le coordinateur — écarté pour l'instant le 2026-10-08 (voir la première ligne ci-dessus : à retrancher avant l'ouverture)
