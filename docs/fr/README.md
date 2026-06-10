# DiffDeck - Documentation française

DiffDeck est un tableau de bord local pour préparer des revues de code avec une IA, tout en gardant l'humain en contrôle.

Le README racine reste volontairement en anglais, car il sert de documentation publique principale. Cette page rassemble les explications françaises.

## Démarrage rapide

Depuis le dépôt DiffDeck :

```bash
cd <DIFFDECK_ROOT>
npm install
npm run dev:server
```

Dans un deuxième terminal :

```bash
npm run dev:web
```

Ouvre ensuite :

```text
http://127.0.0.1:5173
```

L'API locale tourne sur :

```text
http://127.0.0.1:4337
```

Au démarrage, le tableau de bord est vide. Les retours apparaissent quand une IA les pousse via MCP ou quand l'API locale est appelée directement.

Dans le deck de revue, les findings peuvent être filtrés par sévérité. Si aucun filtre n'est sélectionné, DiffDeck affiche tous les findings non archivés. Sélectionne une ou plusieurs sévérités pour restreindre l'affichage, et utilise `Archive` sur un finding pour le masquer sans le supprimer du paquet de session.

## Configurer MCP

DiffDeck fournit un assistant de configuration MCP.

Pour afficher la configuration sans modifier de fichier :

```powershell
npm run setup:mcp:print
```

Pour lancer l'assistant interactif :

```powershell
npm run setup:mcp
```

Pour Codex :

```powershell
npm run setup:mcp:codex
```

Ces commandes doivent être lancées depuis le dépôt DiffDeck, pas depuis le projet à relire.

Si tu es déjà dans le projet à analyser, tu peux lancer :

```powershell
npm --prefix <DIFFDECK_ROOT> run setup:mcp:codex
```

Après une modification de configuration MCP, il faut généralement redémarrer l'outil IA pour qu'il recharge les serveurs MCP.

## Configurer les logs

Utilise `DIFFDECK_LOG_LEVEL` pour contrôler les logs du serveur DiffDeck et du serveur MCP :

- `silent` : aucun log DiffDeck ;
- `error` : erreurs seulement ;
- `info` : démarrage et événements de conversation utiles ;
- `debug` : polling et diagnostics détaillés.

La valeur par défaut est `info`. Les logs répétitifs de polling, comme les vérifications `pending`, ne sont affichés qu'en `debug`.

Pour le serveur API local, définis la variable avant de démarrer le serveur :

```powershell
$env:DIFFDECK_LOG_LEVEL = "error"
npm run dev:server
```

## Utiliser DiffDeck sans MR ou PR

DiffDeck peut être utilisé avant la création d'une merge request ou pull request.

Il suffit de demander à l'IA de comparer une branche source à une branche cible :

```text
Analyse la branche feature/dose-validation avec DiffDeck. Branche cible : dev.
Contexte : implémente le ticket DOSITL-337.
```

Comportement attendu de l'agent :

- identifier la branche source ;
- identifier la branche cible ;
- demander la branche cible si elle n'est pas indiquée ;
- demander si un ticket, des règles métier ou des critères d'acceptation doivent être ajoutés ;
- analyser le diff local entre la source et la cible ;
- créer une revue DiffDeck, par exemple `Review feature/dose-validation -> dev` ;
- pousser des findings structurés avec chemin de fichier et ligne précise.

Le même principe fonctionne pour des changements locaux ou un fichier diff isolé. L'important est d'avoir un périmètre de revue clair et une base de comparaison explicite.

## Installer les skills DiffDeck dans un projet cible

DiffDeck fournit des skills destinés aux projets qui veulent utiliser DiffDeck.

Depuis DiffDeck, copie ces dossiers :

```text
<DIFFDECK_ROOT>\distributed\skills\diffdeck-code-review
<DIFFDECK_ROOT>\distributed\skills\diffdeck-browser-prefill
<DIFFDECK_ROOT>\distributed\skills\diffdeck-sync-distributed
```

Colle-les dans le projet cible :

```text
target-project\.agent\skills\
```

Le projet cible doit ensuite contenir :

```text
target-project/
  .agent/
    skills/
      diffdeck-code-review/
        SKILL.md
      diffdeck-browser-prefill/
        SKILL.md
      diffdeck-sync-distributed/
        SKILL.md
```

Ajoute aussi une courte note dans les instructions agent du projet cible, par exemple dans `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` ou un fichier d'instructions partagé :

```md
DiffDeck:
- For AI code review, MR/PR analysis, branch analysis, or diff analysis, use `.agent/skills/diffdeck-code-review` by default, even if the user does not explicitly mention DiffDeck.
- For browser prefill of approved comments in GitLab/GitHub, use `.agent/skills/diffdeck-browser-prefill`; retrieve the queue with `list_approved_findings` and use `suggestion` as the final human-edited comment.
- For installing or updating DiffDeck distributed skills and this project's DiffDeck instruction block, use `.agent/skills/diffdeck-sync-distributed`; run a dry-run first and do not overwrite local edits unless explicitly requested.
- For questions asked from the DiffDeck UI conversation, use `.agent/skills/diffdeck-code-review` and the MCP conversation tools. For one-shot replies, use `list_pending_conversation` then `add_conversation_reply`. For live chat, loop on `wait_for_conversation_message`, answer with the current agent's project context, then send the reply back to DiffDeck with `add_conversation_reply`.
- If DiffDeck MCP is unavailable, stop before the review, propose MCP configuration as the main next step, then mention chat-only review only as fallback.
- If MCP configuration requires restarting the AI tool, give a clear resume phrase with the source, target branch, and context, for example: "Analyze <SOURCE> with DiffDeck. Target branch: <TARGET>. Feature/fix context: <ticket, acceptance criteria, business description, or useful knowledge>."
```

La note est en anglais pour rester cohérente avec les skills distribués. Le script de synchronisation sait maintenir cette note dans un bloc géré par DiffDeck. Par défaut, il met à jour les fichiers `AGENTS.md`, `CLAUDE.md` ou `GEMINI.md` existants; s'il n'en trouve aucun, il crée `AGENTS.md`. Les fichiers dans `distributed/snippets` restent des exemples et ne sont pas copiés automatiquement.

## Synchroniser les skills plus tard

Après la première copie manuelle, le skill `diffdeck-sync-distributed` permet de rafraîchir les skills DiffDeck distribués et le bloc d'instructions DiffDeck dans un projet cible.

Dry-run :

```bash
node .agent/skills/diffdeck-sync-distributed/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> --dry-run
```

Application des changements sans conflit :

```bash
node .agent/skills/diffdeck-sync-distributed/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT>
```

Le script écrit `.agent/diffdeck/sync-manifest.json` et ignore les fichiers modifiés localement depuis la synchronisation précédente. Utilise `--force` seulement si l'écrasement des adaptations locales est volontaire.

Pour cibler un autre fichier d'instructions du projet :

```bash
node .agent/skills/diffdeck-sync-distributed/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> --instructions-file .agent/instructions/00-index.md
```

Pour synchroniser seulement les skills sans toucher aux instructions :

```bash
node .agent/skills/diffdeck-sync-distributed/scripts/sync-diffdeck-distributed.mjs --diffdeck-root <DIFFDECK_ROOT> --skip-instructions
```

## Flux recommandé

1. Lancer l'API et l'UI DiffDeck.
2. Ouvrir le projet cible dans l'outil IA configuré avec MCP.
3. Demander une revue DiffDeck sur une MR/PR, une branche, un diff ou des changements locaux.
4. L'IA lit les règles du projet et analyse les changements.
5. L'IA pousse les retours structurés dans DiffDeck.
6. L'humain peut poser une question depuis le chat principal; l'agent lit `list_pending_conversation` ou surveille avec `wait_for_conversation_message`, puis répond avec `add_conversation_reply`.
7. L'humain édite les commentaires finaux, approuve, rejette ou résout les cartes.
8. Si besoin, l'humain demande à l'IA de préremplir les commentaires approuvés dans GitLab/GitHub.

## Conversation avec l'IA

Le chat principal permet d'ajouter une question à la session. Une question peut être attachée à la revue active, liée à un finding précis, ou détachée quand elle ne concerne pas la revue courante.

DiffDeck ne contacte pas directement un fournisseur IA. L'outil IA configuré avec MCP utilise son propre abonnement et son propre contexte projet, lit la conversation avec `list_conversation` ou `list_pending_conversation`, peut attendre une question avec `wait_for_conversation_message`, puis renvoie la réponse dans l'UI avec `add_conversation_reply`.

L'agent peut appeler `record_usage` en fin de revue. Si l'outil IA expose ses compteurs de tokens, il les enregistre; sinon il marque le total fournisseur comme `unavailable` et DiffDeck ajoute des estimations locales à partir des payloads de revue observés. L'interface affiche alors la consommation totale et une attribution DiffDeck / projet / hote avec un niveau de confiance : `exact`, `estimated`, `observed` ou `unavailable`. Cette attribution sert d'aide de transparence, pas de garantie de facturation.

Pour obtenir une reponse dans l'interface, il faut donc garder un agent ouvert cote outil IA et lui demander explicitement de traiter ou surveiller le chat DiffDeck, par exemple : `Surveille le chat DiffDeck avec wait_for_conversation_message, reponds a la question humaine en attente, puis ajoute la reponse avec add_conversation_reply. Repete jusqu'a ce que je te demande d'arreter.`

Si la configuration MCP vient d'etre ajoutee ou modifiee, redemarre l'outil IA pour qu'il recharge le serveur MCP DiffDeck.

## Reprise de session

Le MVP stocke l'état en mémoire. Avant d'arrêter l'API, utilise le panneau `Session` pour copier un paquet `diffdeck.session.v1`.

Plus tard, colle ce paquet dans le même panneau et clique sur `Restore` pour recharger la session.

Ce paquet n'est pas un coffre-fort : il ne faut pas y mettre de token, mot de passe, clé API ou variable d'environnement sensible.

## Export et partage

Quand GitLab ou GitHub n'est pas disponible, le panneau `Share report` permet :

- de copier les commentaires approuvés en Markdown ;
- d'exporter un fichier `.md` ;
- d'exporter un fichier `.html` autonome ;
- de conserver les retours à la ligne et les références précises du type `backend/src/main/java/.../ValidationDosesDetailControllerImpl.java:99`.

## Préremplissage navigateur

DiffDeck conserve seulement trois modes :

- A : piloter le navigateur Chrome/Edge par défaut déjà connecté via Chrome DevTools MCP ou une extension MCP ;
- B : utiliser le navigateur intégré de l'outil IA, avec une session séparée ;
- C : fournir les commentaires approuvés prêts à coller manuellement.

Pour le mode A avec Chrome DevTools MCP, utiliser Chrome 144 ou plus récent, ouvrir `chrome://inspect/#remote-debugging`, activer le remote debugging, accepter la demande d'accès DevTools MCP, puis réessayer avec `--autoConnect`.

Pour GitLab, le mode recommandé pour plusieurs commentaires est le brouillon de review : remplir le textarea, cliquer `Start a review` pour le premier commentaire, puis `Add to review` pour les suivants. Il ne faut pas cliquer `Add comment now`, `Submit review`, `Publish` ou `Merge` sans demande explicite.

Si des fichiers ou lignes GitLab sont repliés ou chargés paresseusement, l'agent doit utiliser les contrôles visibles comme `Expand all files`, `Show file` ou les boutons d'ouverture équivalents avant de poser des commentaires inline.

Avec Chrome DevTools MCP en mode navigateur réel, l'agent doit éviter l'injection JavaScript, les scripts de mutation DOM et les appels génériques `evaluate_script` pendant le préremplissage GitLab. Préférer les snapshots, les clics locator/accessibilité, la saisie clavier et le remplissage de texte. Si le transport DevTools se ferme après un appel de type injection, reconnecter au plus une fois, puis continuer uniquement avec des actions sans injection ou signaler une connexion navigateur instable.
