# Shared mod details screenshots

Before: upstream main at `b3e7ac7131ec8cb8dd0b039583029812998635a0`.
After: `codex/shared-mod-details` at `7b84a6c4aeb6ff902593a06e287b8f4ad6d84127`.

All before/after pairs use 1440 × 1000 viewports, an expanded sidebar,
English locale, default appearance, and the development browser preview.
The base screenshots were captured from the untouched base before applying
only the six files in this PR. Unrelated local sidebar/style edits are excluded.

- `library-before.png` / `library-after.png`: Raven’s Toolkit from the unchanged
  fictional Library fixtures, enabled in My mods.
- `registry-before.png` / `registry-after.png`: Damage Meter using one frozen
  public API response and one frozen review response for both captures.
- `history-before.png` / `history-after.png`: the same ten Damage Meter releases;
  the base is scrolled to Versions, while the after capture follows the new
  Version history link, which expands the section and scrolls to it.
- `minimum-window-after.png`: About navigation at the 960 × 600 minimum window.

No production writes were made. These captures exercise browser UI on macOS;
native installation and game launch were not exercised.
