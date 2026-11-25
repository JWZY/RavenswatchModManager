# Launcher log and command cards

Before: `main` at `a08d35f1624ee3bc21fd428e836e6aa8bd519745`.
After: the implementation in this PR.

The main comparison uses 1440 × 1100 viewports, English, default appearance,
the same Library preview fixtures, a signed-out session, and empty logs.
Both captures start at the first section after Game log. Screenshots use the
actual desktop React UI in the browser preview, with bundled fonts loaded.

- `before.png`: expanded Launcher log above Commands, with wrapping command-ID badges.
- `after.png`: Commands without ID badges, followed by command output and the collapsed Launcher log.
- `after-expanded.png`: Launcher log opened with the keyboard, showing its focus indicator and existing controls.
- `after-small-window.png`: command cards at the 960 × 600 minimum window size.

Browser checks covered section order, all eight Run buttons, Enter/Space
disclosure activation, visible keyboard focus, hidden collapsed controls,
preserved search/filter values after reopening, collapse after reload, no
horizontal overflow at 960 × 600, and List local mods against preview fixtures.
Native game launches and log-file operations were not executed.

Validation: desktop type checking, 513 tests across 44 files, Vite production
build, Biome on changed components, supply-chain audit, and design detector.
