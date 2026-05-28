# DiffDeck Distributed Assets

These files are meant to be copied into projects that want to use DiffDeck.

- `skills/`: skills that teach AI agents how to push code review findings to DiffDeck.
- `snippets/`: small instruction snippets for target project agent files.

These files are not for developing DiffDeck itself. Internal DiffDeck development instructions live in `.agent/`.

## Install In A Target Project

In the project that will use DiffDeck, copy these two folders:

```text
DiffDeck\distributed\skills\diffdeck-code-review
DiffDeck\distributed\skills\diffdeck-browser-prefill
```

Paste them into:

```text
target-project\.agent\skills\
```

The target project should then contain:

```text
target-project/
  .agent/
    skills/
      diffdeck-code-review/
        SKILL.md
      diffdeck-browser-prefill/
        SKILL.md
```

Then add this note to the target project's shared agent/development instructions:

```md
DiffDeck:
- Pour une revue IA, une analyse de MR/PR, branche ou diff, utiliser le skill `.agent/skills/diffdeck-code-review` par defaut, meme si l'utilisateur ne mentionne pas explicitement DiffDeck.
- Pour preremplir des commentaires approuves dans GitLab/GitHub via navigateur, utiliser le skill `.agent/skills/diffdeck-browser-prefill`; l'agent doit recuperer la queue via `list_approved_findings` et utiliser le champ `suggestion` comme commentaire final edite par l'humain.
- Si DiffDeck MCP n'est pas disponible, s'arreter avant l'analyse, proposer la configuration MCP comme prochaine etape principale, puis mentionner la revue chat seulement en fallback.
- Si la configuration MCP impose de redemarrer l'outil IA, donner une phrase de reprise claire a completer avec la branche cible et le contexte, par exemple : "Analyse la MR <SOURCE> avec DiffDeck. Branche cible de la MR: <TARGET>. Contexte feature/corrections: <ticket, criteres d'acceptation, description metier ou connaissances utiles>."
```

For MCP setup, run this from the DiffDeck repository:

```bash
npm run setup:mcp
```

For Codex specifically:

```bash
npm run setup:mcp:codex
```

These commands must be run from the DiffDeck repository root, not from the target project being reviewed.

From another folder, use:

```bash
npm --prefix <DIFFDECK_ROOT> run setup:mcp:codex
```

To only print the config:

```bash
npm run setup:mcp:print
```
