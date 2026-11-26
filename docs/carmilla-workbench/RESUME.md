# Resume the Carmilla rework study

Saved on local branch `codex/carmilla-rework-study` on 26 November 2026.

## Start here

The current deliverable is a simple comparison table: all 78 talents from Carmilla, Scarlet, and Aladdin, with one hero per column and sections for Dash, Attack, Power, Special, Defense, Trait, both Ultimates, and General & resources. Talents repeat under each direct trigger, affected ability, or explicit scaling connection.

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/carmilla-workbench
```

Open http://127.0.0.1:8765/#talent-map . If the existing local server is still running, use that URL directly.

The Working read and Sources & session notes pages were removed at the user's request. The remaining pages are Talent comparison, Base kits, Carmilla details, Your mod, Build connections, and Player feedback.

## Current direction

First rework priorities, shown in red: Heartbreak, Mistress of Pain, Boiling Blood, Blood Reserve, Onslaught, Seductive Provocation, Puncture, Dream Scimitars, Sand Vortex, and Spinning Strikes.

Previously agreed behavior:

- Seductive Provocation should trigger at the end of DASH and retain the existing cooldown.
- Blood Reserve should replace capacity with 10/15/20/25% attack speed while blood is strictly above 50% of effective maximum.
- Onslaught should be armed by SPECIAL, trigger through DASH, and scale as a percentage of SPECIAL's bite damage. The supplied package contains 100/125/150/175%; these are observed edits, not a newly approved balance choice.

No further balance choices have been made. The comparison table currently uses the published game reference; modified Onslaught behavior is described in the package review rather than mixed into that baseline.

## Read in this order

1. `context.md`: decisions, player feedback, findings, uncertainty, and the sequence of UI requests.
2. `review.md`: the supplied Carmilla 0.4.2 package review and required gameplay checks.
3. `research.json`, `talent-atlas.json`, and `base-kits.json`: the detailed inventories.
4. `talent-groups.json`: explicit grouping for the simple comparison table.
5. `../../docs/carmilla-rework-spec.md` and `../../docs/carmilla-rework-feasibility.md`: earlier design and feasibility context; these predate receipt of the modified package.
6. `../../tools/carmilla_rework/README.md`: offline behavior model and read-only exporter. This is preparation tooling, not an installable mod.

## Preserved evidence

`evidence/` contains the decoded supplied Carmilla base/Update6 graphs, link-check results, English text, official hero snapshots, current UI screenshots, and the comparison-check report. `evidence/sha256.json` records their hashes. These are copies of the session's selected `.artifacts/carmilla-review/` files; scratch bundles and redundant screenshots are omitted.

The supplied original mod remains at `/Users/javan/Downloads/carmilla-rework/` on this machine and is not included in the branch. Its file hashes are recorded in `package-hashes.json`. Decoded snapshots are from that modified package, not a pristine game baseline.

Gameplay, exact effect inheritance, multiplayer behavior, and installation/restoration have not been validated. The official cards establish published intent; the group assignments are analysis. Retain those distinctions when continuing.
