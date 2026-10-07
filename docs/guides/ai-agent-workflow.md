# Working with Claude Code in this repo

The repo ships configuration so an AI agent follows the same conventions as a human contributor.

## What is configured

| Path                    | Purpose                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `CLAUDE.md`             | Short root guide: stack, commands, architecture, hard rules                           |
| `apps/*/CLAUDE.md`      | Area conventions; loaded when Claude works on files in that app                       |
| `.claude/rules/`        | Focused rules. Most have `paths:` so they load only when matching files are touched   |
| `.claude/agents/`       | Subagents with minimal tools: reviewer, test writer, migration and security reviewers |
| `.claude/commands/`     | Slash commands: `/new-module`, `/new-migration`, `/review`, `/verify`                 |
| `.claude/settings.json` | Shared permissions and a hook that runs Prettier on files Claude edits                |

Personal overrides go in `.claude/settings.local.json` and `CLAUDE.local.md`; both are git-ignored.

## Permissions

Allowed without asking: `pnpm`, `turbo`, read-only `git` commands and `docker compose`. Denied: reading
`.env` files, `rm -rf`, force pushes, `git reset --hard`, `git clean` and removing Docker volumes.
Everything else prompts.

## A typical session

1. Describe the change in terms of behaviour. For a new feature, `/new-module <name>`.
2. Claude makes the change in small steps and runs `/verify` before saying it is done.
3. Run `/review` on the result. It launches the code and security reviewers in parallel (and the
   migration reviewer when migrations changed) and merges their findings.
4. Commit with a Conventional Commit message; hooks run Prettier and check the message.

## Tips

- Point Claude at a reference: "follow `modules/vehicles`" beats a long description.
- For schema work use `/new-migration <Name>` so the SQL is generated and reviewed, not hand-written.
- Keep rules short and link to docs instead of repeating them; a rule that is long is a rule that is ignored.
- When a rule keeps being broken, make it a lint rule or a test rather than a longer paragraph.
- Hooks and permissions load at session start; restart Claude Code after editing `settings.json`.
