# Browse toolbar and heading preview

Before: `main` at `3904e22868e83e7233c18090ad708b4cfc8a8e8b`.
After: implementation at `6dbb94905ffa3516f610c8f2bca6661b571abd08`.

All eight screenshots use a 1280 × 720 browser viewport, expanded sidebar,
English locale, default appearance, and a signed-out session. Each pair uses
the same view and data:

- `mods-before.jpg` / `mods-after.jpg`: Browse → Mods, popular sort, cards.
- `collections-before.jpg` / `collections-after.jpg`: Browse → Collections.
- `library-before.jpg` / `library-after.jpg`: the built-in `?preview=library`
  fixtures, My mods profile, list view, Load order sort.
- `settings-before.jpg` / `settings-after.jpg`: Settings → General.

The Before app runs from an export of the base commit. Its UI source is
unchanged; Vite uses an isolated dependency cache. Browse uses the public
registry, with the same listings visible in each pair. Covers were loaded
before the final captures.

## Validation

- Desktop TypeScript check and Biome checks for the six changed source files pass.
- Search form bounds match exactly between Mods and Collections at both
  1280px and 960px viewport widths, including the scrollbar gutter.
- Mods/Collections remain keyboard operable with visible focus and
  `aria-pressed`; hidden sort/layout controls are inert on Collections.
- Settings, My mods, and Browse text toggles render at 24px.

These captures exercise the desktop UI in a macOS browser. Native Windows/Linux
packaging, installation, game launch, and native update flows were not exercised.
