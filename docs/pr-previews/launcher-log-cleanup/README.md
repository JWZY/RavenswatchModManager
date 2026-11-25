# Diagnostics disclosures and command cards

Before: `main` at `a08d35f1624ee3bc21fd428e836e6aa8bd519745`.
After: the implementation in this PR.

Comparisons use 1440 × 1100 viewports, English, default appearance,
the same Library preview fixtures, a signed-out session, and empty logs.
Screenshots use the actual desktop React UI in the browser preview, with
bundled fonts loaded. Both Before captures use the base branch's UI code.

- `before-default.png` / `after-default.png`: Diagnostics on entry. Game log
  starts expanded; Commands and Launcher log start collapsed.
- `before.png` / `after.png`: command cards before and after removing the
  wrapping command-ID badges. The After capture expands Commands, including
  Command log, and shows Launcher log below it.
- `after-collapsed.png`: all three sections collapsed independently.
- `after-expanded.png`: Launcher log opened with keyboard focus and its controls.
- `after-small-window.png`: expanded Commands at the 960 × 600 minimum window size.

Browser checks covered section order, all eight Run buttons, Enter/Space
activation, visible keyboard focus, hidden collapsed controls, preserved game
log filters and command results after reopening, initial states after reload,
no horizontal overflow at 960 × 600, and List local mods against preview fixtures.
Launcher filters and canceling Restore originals were checked in the initial
revision. Native game launches and log-file operations were not executed.

Validation: desktop type checking, 513 tests across 44 files, Vite production
build, Biome on changed components, and design detector. The supply-chain audit
passed in the initial revision; dependencies are unchanged.
