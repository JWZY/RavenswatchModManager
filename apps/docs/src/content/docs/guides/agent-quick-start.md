---
title: Agent quick start
description: The first page every AI agent reads, whether it is building a mod, developing RSMM, reviewing a pull request or helping a player. It says what to read next.
---

For AI agents. Read this page before anything else in the project, then go to the row below that matches what you were asked to do. Each task has its own pages.

People: to send an agent here, paste `Read https://docs.rsmm.me/guides/agent-quick-start/ first.` at the start of the conversation. For a coding agent working outside an RSMM clone, put that line in an `AGENTS.md` (or `CLAUDE.md` for Claude Code) in the folder that holds your mods. Keep it out of the mod's own folder: everything in there is packed and published with the mod.

## What this project is

Ravenswatch Mod Manager (RSMM) is the mod manager and modding toolkit for Ravenswatch, which has no official mod support. The game runs on its own native C++ engine. It is not Unity, and BepInEx, Harmony, MelonLoader and DLL plugins do not load. A mod is a folder of data with a `manifest.toml`, and Lua where needed. Knowledge from modding other games will mislead you, so look things up instead of guessing.

## Pick your task

Go by what the person asked for, not by the folder you are in or what your account can push to. Modders work inside an RSMM clone too.

| You were asked to | Read next |
|---|---|
| **Build, change or fix a mod** | [Instructions for AI agents building mods](https://docs.rsmm.me/guides/agent-instructions/). They have the rules and the reading order. |
| **Change RSMM itself** (the CLI, SDK, loader, desktop app, website, docs) | [Contributing](https://docs.rsmm.me/contributing/contributing/) and [Development setup](https://docs.rsmm.me/contributing/setup/), then `AGENTS.md`, the root `CLAUDE.md` and the `CLAUDE.md` nearest the files you change. They apply to every agent, whichever tool loads them. |
| **Review a pull request** | "Review guidelines" in `AGENTS.md`, then [SECURITY.md](https://github.com/Ravenswatch-Modding/RavenswatchModManager/blob/main/SECURITY.md) |
| **Reverse engineer the game, or update symbols after a patch** | The "Change RSMM itself" pages, then `.claude/skills/re-workflow/SKILL.md`, or `.claude/skills/update-symbols/SKILL.md` on patch day. Both are plain Markdown. |
| **Publish a release** | The "Change RSMM itself" pages, then `.claude/skills/release/SKILL.md`. Publishing reaches every user, so do it only when a maintainer asks for that release. |
| **Help someone install or play with mods** | [Install the app](https://docs.rsmm.me/getting-started/install/), [Using the app](https://docs.rsmm.me/getting-started/desktop-app/), [FAQ](https://docs.rsmm.me/getting-started/faq/), [Troubleshooting](https://docs.rsmm.me/getting-started/troubleshooting/) |
| **Report a bug, or ask for a feature** | [When RSMM is missing something](https://docs.rsmm.me/guides/agent-instructions/#when-rsmm-is-missing-something) |

If more than one row could fit, ask the person which one they mean.

**Building a mod stays building a mod.** If it needs something RSMM doesn't have, or hits an RSMM bug, that is an issue. Never push to RSMM and never open a pull request against it for a mod, from a fork included. Move to "Change RSMM itself" only when the person says they are developing RSMM.

## Rules for every task

- **Don't invent a name.** Look up every manifest key, content kind, event, `R.*` call and command.
- **Leave the game's files to RSMM.** Change the game folder only through `rsmm` commands. Never write to `_Save/`, and never edit `DarkTalesResources/_Cooking/` by hand.
- **No game files and no unlocked paid content** in a mod or in the repository.
- **Ask before anything public:** an issue, a comment, a push, a pull request, an upload or a release.
- **Security problems** go through [SECURITY.md](https://github.com/Ravenswatch-Modding/RavenswatchModManager/blob/main/SECURITY.md), not a public issue.
- **Report honestly.** Say what was checked, what was seen in game and by whom, and what is untested.

## Where the docs are

- Web: `https://docs.rsmm.me`. [`/llms.txt`](https://docs.rsmm.me/llms.txt) is an index of every page.
- In a clone: Markdown under `apps/docs/src/content/docs/`. `guides/agent-instructions.md` there is `/guides/agent-instructions/` on the web.
- For a mod: [`/llms-mods.txt`](https://docs.rsmm.me/llms-mods.txt) is every authoring page in one file, over 500 KB. Search it rather than loading it whole.
- For RSMM itself: [`/llms-full.txt`](https://docs.rsmm.me/llms-full.txt) adds the reverse-engineering notes.
