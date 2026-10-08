#!/usr/bin/env node
// Avant chaque `git commit` lancé par Claude : si du code ou de la configuration a changé mais pas
// AGENTS.md, rappelle à Claude de se demander si le brief doit être mis à jour. Rappel non bloquant.
// On regarde l'état du dossier de travail (et non l'index) car Claude enchaîne souvent `git add && git commit`
// dans une seule commande : au moment du contrôle, rien n'est encore indexé.
const { execSync } = require("node:child_process");

const FICHIERS_CONCERNES = /^(src\/|prisma\/|\.env\.example$|package\.json$|next\.config\.ts$)/;

let brut = "";
process.stdin.on("data", (morceau) => (brut += morceau));
process.stdin.on("end", () => {
  try {
    const entree = JSON.parse(brut);
    const commande = entree?.tool_input?.command ?? "";
    if (!/\bgit\s+commit\b/.test(commande)) return;

    const dossier = entree.cwd || process.cwd();
    const sortie = execSync("git status --porcelain", { cwd: dossier, encoding: "utf8" });
    const fichiers = sortie
      .split("\n")
      .filter(Boolean)
      .map((ligne) => ligne.slice(3).replace(/^"|"$/g, "").split(" -> ").pop());

    const codeOuConfiguration = fichiers.some((f) => FICHIERS_CONCERNES.test(f));
    const agentsModifie = fichiers.includes("AGENTS.md");
    if (!codeOuConfiguration) return;

    const questionIdees =
      "Rubrique « Idées de Claude, pas encore demandées » (dernière rubrique d'AGENTS.md, 15 lignes maximum) : " +
      "as-tu repéré pendant ce travail une action utile que Bruno n'a pas demandée (à ajouter, avec urgence, effort et date) ? " +
      "Bruno vient-il d'en demander ou d'en faire une de la liste (à retirer), ou d'en refuser une (à déplacer dans « Écartées par Bruno » avec la date) ? " +
      "N'exécute jamais une idée de cette liste sans demande de Bruno.";
    const rappel = agentsModifie
      ? "Rappel (habitude du projet) : AGENTS.md est modifié dans ce commit, bien. Vérifie seulement la rubrique des idées. " + questionIdees
      : "Rappel (habitude du projet) : tu es sur le point de commiter du code ou de la configuration sans modification d'AGENTS.md. " +
        "Avant de commiter, demande-toi si AGENTS.md doit changer : nouvelle règle ou convention, décision de Bruno, nouvelle variable d'environnement, " +
        "tâche planifiée, point ouvert ou résolu, section « Où on en est ». Si oui, mets-le à jour avant ce commit (sans aucun secret) ; " +
        "si non, dis-le en une phrase dans ta réponse à Bruno. " + questionIdees;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: rappel } }));
  } catch {
    // Ne jamais bloquer ni perturber un commit à cause de ce rappel.
  }
});
