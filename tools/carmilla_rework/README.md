# Carmilla rework preparation kit

This is an **offline prototype and read-only data exporter**, not an installable
mod. No game assets, runtime hooks, SDK internals, or mod manifests are changed.

The agreed design is recorded in [the spec](../../docs/carmilla-rework-spec.md):

- **Seductive Provocation:** activate at the end of DASH; retain its internal cooldown.
- **Blood Reserve:** remove capacity increase; above half of effective maximum
  blood, grant 10/15/20/25% ATTACK speed by rarity.
- **Onslaught:** SPECIAL arms the next DASH to perform the rush, with damage
  calculated as a percentage of SPECIAL's bite. Ordinary ATTACK no longer triggers it.

Onslaught's percentages are undecided. The native readiness duration, precise
resource readers, and effective component connections require game assets.

## Run the offline model

From the repository root, using Python 3.11 or later:

```sh
python tools/carmilla_rework/model.py --seduction-cooldown 6 --onslaught-window 4 --onslaught-percent 100 125 150 175
```

On macOS/Linux, use `python3` if `python` is not installed. These numbers are
**demonstration inputs**, not chosen mod balance or verified native timings.
The four percentages are in Common, Rare, Epic, Legendary order. The command prints
a JSON trace showing:

- no speed bonus at 49% or exactly 50% blood; +10% at 51% with Common Blood Reserve;
- SPECIAL → ordinary ATTACK → DASH still executes one empowered dash;
- seduction fires at the dash endpoint;
- the next dash is normal and cannot retrigger seduction during cooldown.

`model.py` can also be imported for other scenarios. `Rules` requires explicit
timings and damage percentages. It knows nothing about the engine: the caller
supplies blood, effective capacity, and a calculated noncritical SPECIAL bite
damage basis. The model applies the Onslaught percentage once. It does not replay
the previous enemy's damage number or double-apply SPECIAL bonuses.

The simulated capacity input must already exclude the old Blood Reserve bonus.
The model itself neither reads nor removes a game modifier. Likewise, a returned
`Seduction` describes where/when a proc is intended; it does not apply debuffs.

## Export the missing data from a game machine

Copy/use this repository checkout on a machine with Ravenswatch. No third-party
Python packages are required for the exporter; it imports the checkout's SDK.
Close the game while collecting so files do not change during the export.

PowerShell, from the repository root:

```powershell
py -3 tools/carmilla_rework/export_data.py --game-dir "C:\Program Files (x86)\Steam\steamapps\common\Ravenswatch" --output "$env:USERPROFILE\Desktop\carmilla-inspection.zip"
```

Replace the game path if installed elsewhere. On Linux:

```sh
python3 tools/carmilla_rework/export_data.py --game-dir "/path/to/Ravenswatch" --output "$HOME/Desktop/carmilla-inspection.zip"
```

Or use an already extracted corpus (the directory containing `EntitySettings`):

```sh
python3 tools/carmilla_rework/export_data.py --corpus "/path/to/uncooked" --app-settings "/path/to/ApplicationSettings.ot" --output "/path/outside/corpus/carmilla-inspection.zip"
```

An explicit corpus is read from that directory; missing files are not silently
filled with bytes from another install. Application settings are optional for
export but needed for the later data-defined stat inspection. Omit both source
options to use the existing corpus/game discovery. An existing ZIP is never
overwritten; choose a new output name for a repeat export.

The ZIP contains:

| Member | Purpose |
|---|---|
| `inspection.json` | File hashes, separate entity layers, named fields, references, incoming links, candidate components, and missing/undecoded inputs. |
| `corpus/` | Selected Carmilla entities/definitions/text, shared hero/character entities, and recursively discovered parent entities. |
| `application_settings/ApplicationSettings.ot` | Data-defined stat declarations, when available. |
| `README.txt` | How to interpret the bundle. |

Install reads prefer `.rsmm.bak` originals. Each file records whether a backup
was used; a backup may predate an update, so hashes must be checked before building.
Update layers remain separate, including explicit override identities. Keyword
matches are discovery leads, **not verified gameplay bindings**. References to
external scopes are listed rather than silently treated as resolved. This is not
a complete export of every dependency or a recreation of the engine's effective graph.

The exporter reads no saves, starts no process in the game, calls no apply command,
and writes only the new research ZIP outside the game/corpus/repo data/mods folders.
It does not include the game executable or textures. Do not install or publish the
ZIP as a mod; it is input for further inspection.

Exit codes:

- **0:** selected data collected, still unverified against gameplay.
- **1:** ZIP created, but missing inputs or decoding warnings need inspection.
- **2:** export could not complete; read the error. No ZIP is created when source
  assets are missing. An existing output remains untouched.

## What is tested

The focused suite currently has **39 passing cases**:

```sh
python -m pytest -q tests/test_carmilla_rework_model.py tests/test_carmilla_rework_inspect.py
```

Behavior cases cover all four speed tiers, strict threshold/changed capacity,
repeated threshold crossings, ownership loss, cooldown boundaries, cancellation,
duplicate/stale completion, death/revive, new-run reset, readiness expiry/refresh,
and SPECIAL-percentage damage. Export cases use synthetic cooked entities and
temporary game folders to check decoding, inheritance, update layers, backup
selection, raw hashes, malformed inputs, output protection, and exclusion of saves.
Both scripts are exercised directly outside the repository working directory.

These tests validate the design model and exporter only. They provide no evidence
that Carmilla's real state transitions, blood readers, or modified attack work in game.

## Draft card wording

These are drafts for eventual localization edits, not applied text patches:

- **Seductive Provocation:** “At the end of DASH, trigger Seductive Provocation
  if its cooldown is ready.” Retain the current card's targets, status durations,
  and cooldown details after reading its active text bank.
- **Blood Reserve:** “While BLOOD is above 50% of maximum, ATTACK speed increases
  by 10/15/20/25%.” Remove the capacity-increase sentence.
- **Onslaught:** “After SPECIAL, the next DASH rushes through enemies, dealing
  [chosen percentage] of SPECIAL's bite damage.” Add the actual readiness duration
  if the current talent imposes one.

## Work still requiring assets

1. Trace the effective dash-completion path, talent-owned gate, and seduction
   cooldown in Carmilla's base/update layers.
2. Find current/effective-max blood readers; disable the old capacity effect;
   wire the conditional `Basic Attack Speed` modifier and rarity values.
3. Move Onslaught selection from ATTACK to DASH, retaining one-charge readiness,
   and replace both the damage formula and ability classification.
4. Build a manifest through the SDK, update card text, and verify the emitted graph.
5. Playtest individual talents and their combinations, then verify restoration.
   Multiplayer requires its own validation.

Do not replace these steps with guessed component names, literal engine addresses,
or a mock test presented as a gameplay test.
