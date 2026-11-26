# Review of Carmilla Rework 0.4.2

Reviewed 26 November 2026, from the user-supplied folder. Read-only: no mod edits applied. No pristine baseline or live game is available.

## Result

The Blood Reserve stat, rarity values, strict threshold and detached capacity path are present. Onslaught has the requested new input/damage direction, but two concrete routing/reset concerns conflict with the package README. Copying the bite also copies additional talent hooks. This is a static review, not a gameplay certification.

## [P2] Puncture and Winged Form can win the dash selection

The README promises the rush in either form, including with Blood Dash equipped. Under the existing ordered-selector convention, those earlier branches bypass it.

**Location / evidence:** Base #59 and Update6 #3: entries select Puncture, then Winged Form, then Onslaught, then normal dash. Puncture’s nested selector (#63) contains only its normal and winged clips. State references were checked by GUID and use the active-state accessor.

**Next action:** Validate SPECIAL → DASH in normal form, Winged Form, with Puncture, and with both. If this matches the graph, adjust both selectors and retain Puncture’s blood gain deliberately.

**Confidence:** Static control-flow finding; not reproduced in game.

## [P2] Blood Lash attacks still clear Onslaught readiness

SPECIAL → Blood Lash ATTACK → DASH can lose the armed rush even though the README says ATTACK keeps it ready.

**Location / evidence:** Base #231 State Ultimate 2 Basic Attack keeps Event Skill Attack Special Rush Reset (#109) in while_active. The reset clears both the flag and timer.

**Next action:** Test that sequence with Blood Lash active. Review the inherited reset before claiming that all attacks preserve the charge.

**Confidence:** Direct reference in supplied bytes; gameplay timing untested.

## [Review] Copying the bite also copies its talent effects

The rush can attempt bite-side effects on enemies it crosses. This is broader than “scale from bite damage” and may make Injection multi-target. Life Essence credit still depends on how its kill flag is consumed.

**Location / evidence:** Base #2032 Skill Attack Special Rush Damage owns five copied damage-debuff objects (object IDs 2032–2036). They reference bleed detection, Sadism, Go for the Throat, Injection, and Victimization; its impact/kill callbacks also point to SPECIAL events.

**Next action:** Decide later whether these are desired bridges. First record per-target seed/mark application, distance scaling, and kill-credit behavior. Do not strip them just because they are unexpected.

**Confidence:** Hooks confirmed; resulting procs and damage require runtime verification.

## [P2] The replacement descriptions are English in every language

Players using those languages see English cards. README calls the package “localized card text,” which overstates what is shipped.

**Location / evidence:** Both modified description rows (18 and 40) are identical English text in all 13 supplied language banks, including FR, DE, JA and ZH-S. manifest.toml also provides English replacements.

**Next action:** Describe these as English fallback strings, or supply actual translations and ensure the manifest text step preserves them.

**Confidence:** Confirmed from all supplied text banks.

## [Scope] The dash-end Seductive request remains separate

Installing this package does not establish the earlier request to taunt at the end of a completed directional dash.

**Location / evidence:** Update6 #4 routes directionless DASH into a dedicated taunt controller. The six-second cooldown value remains. The package README limits its stated rework to Blood Reserve and Onslaught.

**Next action:** Keep this visible as earlier requested work, not as a regression introduced by 0.4.2.

**Confidence:** Current controller/card path confirmed; no vanilla binary diff available.

## Validation matrix for the next game session

| Area | Controlled sequence | Record |
|---|---|---|
| Blood Reserve threshold | No talent; each rarity at 49%, 50%, 51%; cross both directions; change maximum blood | Attack interval, capacity, disappearance of modifier below threshold |
| Blood Reserve lifecycle | Acquire/upgrade, Winged Form, blood gain/spend, death/revive, chapter transition | Correct stat, no lingering or stacking bonus; effective maximum used |
| Onslaught routing | SPECIAL → DASH; normal/winged; Puncture off/on | Rush selected, charge spent only by intended action, Puncture gain retained if intended |
| Onslaught retention | SPECIAL → ordinary ATTACK → DASH; repeat under Blood Lash | Readiness remains until dash or timeout |
| Onslaught damage | Fixed target/level/rarity, vary ATTACK and SPECIAL bonuses independently | SPECIAL scaling once, no leftover ATTACK multiplier |
| Copied bite effects | Rush through several targets with Injection, Victimization, Go for the Throat, Life Essence | Seed/mark per target, distance bonus source, bite kill credit, no unwanted rearming |
| Seductive | Directionless input vs completed directional dash; cooldown; cancel/interruption | Existing behavior vs requested endpoint proc; boss exclusion and debuffs |
| POWER bridges | Injection before/after Blood Rage completion, controlled DMG; varied channel and bleed timings | Which bonus applies, timing and crit sampling; no conflation with general DMG quest reward |
| TRAIT trio | Life Tap alone, +Gust, +Angel and Demon, +both; day/night | Health/blood exchange, heal/STRENGTH, pushback, cooldown; installed version |
| Multiplayer | Same validated package on host and peer | Trigger, target, damage and charge consistency |

## Known limitations

Two byte-stable round trips confirm the container can be read/re-emitted. Missing inherited assets prevent a full graph validation. Field names ending in `?` are decoder interpretations; ordered-selector behavior is inferred from the existing engine convention and needs an actual sequence test. Neither a card description nor a SPECIAL category proves all SPECIAL talent effects should fire. The package's full entity replacements lack an included build recipe and pristine hashes, so later rebasing and conflict analysis require additional provenance.

The 13 supplied language banks contain English fallback strings for the two changed descriptions. This is independently verified, not just inferred from the manifest.

See `evidence.txt` for component fields and owned-object references; `package-hashes.json` identifies the reviewed bytes. Do not treat this review as a request to implement all suggested changes: the user asked to evaluate, log context and inspect the design before deciding.
