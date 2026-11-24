---
title: Build a mod with an AI assistant
description: How to point ChatGPT, Claude, or a coding agent at RSMM so it builds a mod that actually loads.
---

Ravenswatch ships no official mod support — no Workshop, no loader, no
documented file format. An assistant asked "write me a Ravenswatch mod" with
nothing else to go on will either refuse or invent a plausible-looking mod
format that the game will never load. This page is how to give it the real one.

## The short version

Paste this at the start of the conversation:

```text
I'm modding Ravenswatch with the Ravenswatch Mod Manager (RSMM).
Read https://docs.rsmm.me/llms-mods.txt first — it is the complete
mod-authoring documentation in one file. Follow it exactly; do not
invent a mod format. Then help me build: <what you want>.
```

Any assistant that can fetch a URL will then be working from the real
manifest grammar, the real content kinds, and the real CLI.

**Coding agents (Claude Code, Codex, Cursor):** save [Instructions for AI agents
building mods](/guides/agent-instructions/) as `AGENTS.md` in the folder that
holds your mods.

**Chinese speakers / DeepSeek users:** [用 AI 助手制作 Mod（中文）](/guides/ai-assistant-zh/)
is a self-contained Chinese prompt for assistants that can't fetch URLs. It
covers installing mods, the `rsmm` tools, custom skins, 3D models and uploading.

## The machine-readable entry points

| URL | What it is | When to use it |
|-----|-----------|----------------|
| [`rsmm.me/llms.txt`](https://rsmm.me/llms.txt) | What RSMM is, and the shortest path from "I want a mod" to a working one | An assistant that has never heard of RSMM |
| [`docs.rsmm.me/llms-mods.txt`](https://docs.rsmm.me/llms-mods.txt) | Every authoring page, full text, one fetch | **Building a mod** |
| [`docs.rsmm.me/llms.txt`](https://docs.rsmm.me/llms.txt) | Link index of every docs page, grouped by section | Picking specific pages to read |
| [`docs.rsmm.me/llms-full.txt`](https://docs.rsmm.me/llms-full.txt) | The above plus ~30 pages of engine reverse-engineering notes | Working on RSMM itself |

Use `llms-mods.txt`, not `llms-full.txt`, to build a mod. The full corpus is
mostly vtable layouts and crash triage written for people extending RSMM's
engine support; feeding it to an assistant spends most of its context on
material it cannot act on, and dilutes the rules that matter.

## If it drifts

[Instructions for AI agents building mods](/guides/agent-instructions/) has every
rule the assistant works under. It is the first page of `llms-mods.txt`. If the
assistant suggests BepInEx, hands you a Python script, invents an `R.*` call, or
offers to change RSMM itself, paste this:

```text
Re-read https://docs.rsmm.me/guides/agent-instructions/ and follow it.
```

## Verify what it produced

An assistant's mod is a hypothesis until the toolchain agrees. Three commands,
in order — each one catches a different class of wrong:

```sh
rsmm lint            # manifest grammar, asset paths, the rules above
rsmm apply           # install into the game (rsmm restore --all rolls it back)
rsmm pack <mod-id>   # zip it for the registry
```

`rsmm schema <kind>` lists the vanilla ids available to clone; `rsmm items
list` does the same for magical objects specifically. Run one and paste the
output back rather than letting the assistant guess.

Every command that names a mod takes its **id**, not a path — `rsmm lint MyMod`,
not `rsmm lint mods/MyMod`, which fails with `no such mod`.

## Related

- [Your first mod](/getting-started/first-mod/) — the same loop, by hand.
- [Authoring mods](/guides/modding/) — scaffold through shipping.
- [CLI reference](/reference/cli/) — every command.
