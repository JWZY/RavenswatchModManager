# Contributing

Thanks for helping. Bug reports, mods, docs fixes and reverse-engineering findings
are all welcome.

- **Building a mod?** If it needs something RSMM doesn't have, or you hit a bug, you
  or your AI agent open an issue. The pull request steps below are for people
  developing RSMM itself. Give your agent
  [Instructions for AI agents building mods](https://docs.rsmm.me/guides/agent-instructions/).
- **Set up:** [Development setup](https://docs.rsmm.me/contributing/setup/) covers the
  Python CLI, the desktop app, the website and the loader.
- **How it fits together:** [Architecture](https://docs.rsmm.me/architecture/overview/).
  `CLAUDE.md` is a dense technical brief of the whole repo.
- **Before you open a PR:**
  ```sh
  ruff check .                 # Python lint
  pnpm test:python:fast        # Python tests
  pnpm test:ts                 # TypeScript tests
  lua tests/lua/rsmm_spec.lua  # Lua SDK, if you touched src/loader/lib or src/loader/lua
  ```
  Edited `data/symbols.json`? Run `rsmm symbols gen`. CI runs all of the above, and
  a PR merges into `main` only once its `ci ok` check passes. Nobody pushes to `main`
  directly.
- **Keep PRs small** and say how you tested. In-game changes need a note on what you
  saw in game.

## Ground rules

- **No game files in the repo.** Commit code, manifests and your own assets only.
  Never commit anything extracted from Ravenswatch.
- **Nothing that unlocks paid content.** DLC heroes, outfits and other bought content
  stay behind their ownership check. PRs or mods that open them are closed.
- **Mods ship data, not code.** New capability goes into the SDK; mods consume it
  through a `manifest.toml` and high-level `R.*` calls. `rsmm lint` enforces this.
  A mod author asks for that capability in an issue.
- **No hardcoded engine addresses.** RSMM developers add a symbol to
  `data/symbols.json` instead.

Be kind, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Security issues go through
[SECURITY.md](SECURITY.md), not public issues.
