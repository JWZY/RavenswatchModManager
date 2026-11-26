# Verification — 26 November 2026

- All 17 supplied package files retain their recorded SHA-256 hashes.
- Both entity containers parse and re-emit byte-for-byte. This does not validate behavior in the game; inherited dependencies remain absent.
- 26 unique talent records have mapped component evidence; acquisition tiers are 4 starting, 18 standard, 4 ultimate.
- Local page interaction checks passed: search, tier filtering, reference toggle, nested evidence, empty results/reset, hero comparison, timeline boundary, note persistence, note export.
- All six sections were checked at widths 1440, 768 and 390 pixels with no document overflow or JavaScript exceptions.
- Desktop and phone renders were visually inspected. Font weights and small labels were corrected during verification.
- The in-app browser control was unavailable. An app preview was requested and queued; isolated headless Chrome was used for rendering and interaction checks.

Evidence captures and the machine-readable page-check report are in `.artifacts/carmilla-review/` relative to the repository root. No gameplay, damage, or multiplayer pass is claimed.

## Base-kit and talent-map extension

- Matched 52 unique Scarlet/Aladdin talent IDs, trimmed names, acquisition tiers, and source hashes to fresh official buildmaker snapshots. Each hero has 4 starting, 18 standard, and 4 ultimate talents.
- Verified all 8 base ability slots and 24 hero cells, form selectors, slot filtering, and reset behavior.
- Verified combined hero/effect/resource/behavior filters, search, empty states, reset, and expanded resource details. Scarlet's added-spend filter returns Pulverize/Fan of Spikes rather than spend rewards such as Adrenaline.
- Verified exactly 7 Carmilla and 3 Aladdin priority names, red computed text color, and focus filtering. The canonical title is Dream Scimitars.
- Checked the three inventory/comparison pages at 1440, 1024, 768, 390, and 320 pixels; no horizontal page overflow or JavaScript exceptions. Inspected desktop and phone screenshots.
- Checked direct links, refresh, and independent dataset failure handling. A failed base-kit fetch does not block the talent map.
- Re-ran the original workbench smoke checks after shared navigation/rendering changes; search, reference toggle, evidence expansion, notes, timing, and original routes passed.
- New screenshots and `atlas-checks.json` are in `.artifacts/carmilla-review/`. The in-app preview request returned queued; the local server remains reachable on port 8765.

These checks cover the research page, not in-game behavior. No balance or mod-package changes were made in this extension.

## Navigation cleanup

Removed Working read and Sources & session notes, including their rendering and notes handlers. Base kits is the default; former page URLs redirect there. Checked all six remaining pages, both retired URLs, and the default URL in headless Chrome. Both talent inventories still render (26 Carmilla, 52 Scarlet/Aladdin), with no JavaScript exceptions.

## Simple all-hero table

- Confirmed 78 unique talents, 26 per hero, across 9 ability/general sections, with no duplicates within a single hero/section cell.
- Checked the user's DASH and POWER examples and repeated assignments for Cruel Strike, Leaping Strike, Injection, and Spinning Strikes.
- Confirmed all 10 unique priority names remain red and the former comparison filters are absent.
- Checked all six remaining pages, the new default landing page, refresh, and table scrolling at widths 1440, 1024, 768, and 390. No page overflow or JavaScript exceptions remain.
- Desktop and phone screenshots inspected. Evidence: `talent-comparison-*.png` and `talent-comparison-checks.json` in `.artifacts/carmilla-review/`.

## Branch snapshot

Saved the workbench, context, earlier design/specification, offline preparation tooling/tests, and selected source evidence on `codex/carmilla-rework-study`. Verified the preserved evidence hashes and that the staged file list contains only Carmilla study files. The offline Python tests were not rerun successfully during this save: neither the default Python nor the repository virtual environment has pytest installed. Earlier test results remain historical; this snapshot adds no changes to the model/exporter code.
