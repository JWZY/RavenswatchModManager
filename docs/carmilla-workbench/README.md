# Carmilla kit study

Local, read-only research workbench prepared 26 November 2026. No changes to the submitted mod, game installation, saves, or desktop application.

To pick up this work later, read [RESUME.md](RESUME.md). Selected source snapshots and the final comparison screenshots are preserved in `evidence/`.

Run from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/carmilla-workbench
```

Open http://127.0.0.1:8765/. The page needs HTTP because it loads the local JSON inventories. All page assets are local; external links open only on request. Talent comparison is the landing page.

- `research.json`: 26 selectable talent records, file/component locations, review findings, player feedback.
- `context.md`: durable session context, source boundaries, open questions.
- `review.md`: package review and test matrix.
- `evidence.txt`: decoded field index and selected owned subobject references.
- `package-hashes.json`: SHA-256 hashes of the supplied files.
- `fonts/`: Newsreader and DM Sans from Google Fonts, with their OFL licenses.

The rendered inventory deliberately distinguishes internal group, acquisition tier, trigger, effect, and dependency. Current game reference comes from published card data. Supplied binaries are modified and lack a pristine baseline, so unchanged behavior cannot be certified by diff.

## Comparison pages

- `/#base-kits`: eight aligned ability slots for Carmilla, Scarlet, and Aladdin. Compare both Carmilla forms and both Scarlet forms, or narrow to one slot/form. Aladdin’s wishes are explicitly separate from ordinary ability casts.
- `/#talent-map`: one simple table containing all 78 talents across Carmilla, Scarlet, and Aladdin. Rows group Dash, Attack, Power, Special, Defense, Trait, both Ultimates, and General & resources. Talents repeat under each direct trigger, affected ability, or explicit scaling connection.
- `base-kits.json`: base ability map and source references. This is a functional map, not a complete damage/cooldown table.
- `talent-atlas.json`: published talent identities with curated behavior/resource classifications and official source IDs.
- `focus.js`: the ten user-selected rework priorities. Their names remain red in the comparison. Carmilla’s detailed inventory also retains its focus filter.
- `talent-groups.json`: explicit section assignments for all 78 talents and short annotations for ambiguous connections.
- `atlas.js`: independent loading and rendering of the base kits and simple talent table.

“No added cost” does not mean the triggering action is free. Passive behavior, resource generation/spending, and resource conditions are separate axes. New talent effects do not imply that all other effects on that ability are inherited. Source limits are kept on the pages and beside expanded talent details.

The Working read and Sources & session notes pages were removed at the user’s request. Existing source citations stay beside the relevant talent and comparison content. Old links to the removed pages resolve to Talent comparison.
