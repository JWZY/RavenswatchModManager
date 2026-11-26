# Carmilla rework: inventory and feasibility

Investigated 2026-11-25. This is a feasibility report, not a built or playtested mod.

There is enough SDK support to pursue a substantial Carmilla rework: numeric
changes, conditional bonuses, changes to existing attack selection, and replacement
talent effects. There is not enough game data in this checkout to produce a
verified, field-by-field Carmilla patch yet.

The local corpus reports `source() == "none"`; `find_game_dir()` returns `None`;
`data/uncooked/` is absent. The standard macOS Steam location was also absent.
The asset map is an index of filenames, not the contents of those files. No
gameplay asset was modified and no game was launched during this investigation.

## Complete named inventory

All 26 names and internal identifiers below come from the repository's
[talent lookup](../apps/docs/src/content/docs/reference/talent-names.md).
The identifier is the controller suffix used by talent operations; card text can
use `Skill_` followed by the identifier with spaces replaced by underscores. Use
the exact text keys in the lookup when casing differs.

**The final column lists candidate editing targets, not verified exposed fields.**
Each needs inspection of the installed game's effective entity graph, including
update overrides. These are useful starting points for discovery, not a promise
that every item is a one-line edit.

| Talent | Area | Internal identifier | Candidate editing targets |
|---|---|---|---|
| Cruel Strike | Attack | `Attack Last Combo Move` | Finisher bonus; dash/defense prerequisites; interaction with other attack replacements. |
| Onslaught | Attack | `Attack Special Rush` | Rush multiplier; activation condition; follow-up window; movement and hit geometry. |
| Razor Claws | Attack | `Attack Bleed` | Bleed scaling; which attack hits apply it. |
| Blood Rage | Power | `Power Quest` | Quest requirements, progress increments, and rewards. |
| Flesh Rip | Power | `Power Bleed Crit` | Critical-chance bonus; bleed condition. |
| Furious Tempest | Power | `Power Maintained Damage` | Damage ramp, cap, and timing. |
| Injection | Power | `Power Special Bomb` | Blood-seed explosion damage, delay, and radius; bite-to-explosion connection. |
| Wild Heart | Power | `Power Range` | Projectile speed and explosion size. |
| Go for the Throat | Special | `Special Critical Distance` | Distance thresholds and associated damage/critical bonuses. |
| Life Essence | Special | `Special Quest` | Quest requirements and rewards; subsequent healing. |
| Victimization | Special | `Special Marked` | Mark duration; application hit. Changing shared Marked rules requires separate scoping. |
| Aggressive Flock | Defense | `Defense Projectile` | Bat spawn interval, hit damage, and projectile behavior. |
| Bat Master | Defense | `Defense Master` | Existing defense bonuses; additional conditional stats. Also listed as a portable effect donor. |
| Dispersion | Defense | `Defense Aoe Bleed` | Burst/bleed damage and radius; defense-exit trigger. |
| Puncture | Dash | `Dash Blood` | Blood gain per qualifying target; target detection and repeat-hit conditions. |
| Seductive Provocation | Dash | `Dash Taunt` | Target cap, status duration, repeat limit, target filtering, and neutral-input condition. |
| Angel and Demon | Trait | `Trait Heal Buff` | Heal amount, buff duration, area, and day/night branches. |
| Gust | Trait | `Trait Push back` | Damage, area, and pushback behavior. |
| Life Tap | Trait | `Trait Life Tap` | Health cost, blood return, reuse interval, and trait-trigger interactions. |
| Blood Reserve | Passive | `Passive Blood Reserve` | Capacity scaling; additional talent-owned bonuses. Resource-dependent rules need more mapping. |
| Boiling Blood | Passive | `Passive Life Use Regen` | Regeneration amount and health-spending activation threshold. |
| Sadism | Passive | `Passive Critical Bleed` | Critical-damage bonus and bleed condition. |
| Heartbreak | Ultimate | `Ultimate 1 Combo Pike` | Added combo move, damage scaling, and attack selection. |
| Mass Punishment | Ultimate | `Ultimate 2 Add Zone Attack` | Added combo move, damage, and area. |
| Mistress of Pain | Ultimate | `Ultimate 2 Increase Max Attack` | Transformed-attack count and rarity progression. |
| Torture of the Pale | Ultimate | `Ultimate 1 Return` | Return-hit damage and projectile return behavior. |

Ability group names are the repository's grouping, not a restriction on what an
effect can touch. Injection, for example, connects SPECIAL to a POWER explosion.
Brief gameplay context was cross-checked against the
[talent reference](https://ravenswatch.wiki.gg/wiki/Carmilla/Talents).
Exact current balance values must come from the user's installed build.

## What the SDK actually supports

The implementation is in [talents.py](../src/rsmm/sdk/kinds/talents.py).
The [advanced tutorial](../apps/docs/src/content/docs/guides/talent-tutorial-advanced.mdx)
records evidence for individual techniques. Its labels matter more than assuming
every feature has been proven because the overall talent kind has been used.

| Operation | What it enables | Evidence and limit |
|---|---|---|
| `value_patches`, `union_patches`, `int_patches` | Edit authored numbers, counts, and rarity tiers. | Established numeric patching path. Must identify the effective value and supply the expected old value. |
| `kind = "skill"` | Rename a card, replace its description, optionally change its icon. | Relabeling has in-game evidence; changing text alone does not change behavior. |
| `add_stats` | Add damage, crit, movement, cooldown, or other mapped stat bonuses. | General arrangement labeled partly tested; specific conditional variants below have in-game evidence. |
| `during`, `after`, `seconds`, `cooldown`, `next` | Bonus during an ability; a timed bonus after ability activation; an internal cooldown; consume a bonus with the next ability. | Tutorial labels these variants tested in game. This does not establish a Carmilla-specific combination. |
| `scale` | Enlarge a mapped radius, width, or length while a talent is owned. | Tested technique. Collision size and visuals may need separate inspection. |
| `rewires`, `clone_nodes` | Reuse existing states, attack clips, tests, counters, and modifiers with different connections. | Some attack-swap and conditional recipes are tested; other compositions are partly tested. |
| `include` | Make one talent enable another effect. | Tested technique. Same-hero borrowed rarity values default to Common; supported cross-hero effects can follow the receiving card's rarity. |
| `on_hit` | Add Chilled, Ignite, Bleed, Vulnerable, Weak, or Rooted to a specific damage record while a talent is owned. | Implemented, but tutorial labels it untested. Donor status retains its strength/duration; no arbitrary status-duration field in this convenience operation. |
| `rebuild` | Turn off a talent's original owned state, retaining its card for replacement effects. | Implemented, but tutorial labels it untested. Must prove the original effect is actually gone. |
| `kind = "ability"` | Deeper edits to an existing hero's numbers and connections. | See the [kind confidence table](api/kinds.md). This path refuses `clone` steps; it is not an unrestricted ability-copy system. |

An `after = "SPECIAL"` window begins when the ability activates. It is not a
generic “after a successful bite,” “after landing,” or “after hitting an enemy”
trigger. Those distinctions require the actual graph or event mapping.

`on_hit` is attached to a damage record, not an ability name. If Onslaught shares
its damage record with another attack, we must isolate that hit before claiming a
status affects only the rush. The lower-level status machinery also has a Marked
donor, but that requires an explicit duration; the talent convenience operation
does not provide that parameter.

## The three requested talents

### Seductive Provocation

Known identifier: `Dash Taunt` / `Skill_Dash_Taunt`.

Version matters here. Passtech's Update 1.6 notes describe four non-boss targets,
duration scaling, added stun/stagger, a faster animation, and no dash consumption.
Older accounts describing a rarity-scaled target cap are outdated for that update.
See the [official patch notes](https://steamcommunity.com/app/2071280/allnews/?l=english).

The asset map includes `Hero_Carmilla_Update6`. The editor explicitly gives
Carmilla's reworked Dash Taunt card format precedence over its base format in
[content.py](../src/rsmm/cli/editor/content.py#L903). That is evidence we must inspect
the layered version, not evidence that we already know its current editable fields.

- **First candidates:** target count, effect duration, and reuse timer, provided
  they resolve to authored values in the current assets.
- **Behavioral rework candidates:** trigger from a regular dash, trigger alongside
  SPECIAL, or change the targeting shape. These require inspecting input tests,
  target collectors, and activation links. A general DASH stat bonus does not
  automatically move the seduction effect onto DASH.
- **Larger unknowns:** allowing bosses, replacing the control effect with true
  enemy allegiance changes, or creating a new persistent charm AI. Removing one
  non-boss filter may still leave independent status immunity checks. I found no
  supported public “charm enemy” operation.

### Blood Reserve

Known identifier: `Passive Blood Reserve` / `Skill_Passive_Blood_Reserve`.
The current public talent reference describes a maximum-blood bonus of
20/25/30/35%; these are gameplay reference numbers, not verified binary literals.
See the [talent reference](https://ravenswatch.wiki.gg/wiki/Carmilla/Talents).

- **First candidate:** change the existing capacity bonus and rarity progression.
- **Supported composition candidate:** retain capacity and add a damage, crit,
  movement, or cooldown bonus while the talent is owned, or for a window following
  an ability. This is ordinary `add_stats` composition and does not need to know
  current blood.
- **Needs further mapping:** bonuses above a blood threshold, blood regeneration,
  refunding blood on kills, overflow conversion, or spending blood for extra damage.
  Puncture and Life Tap are sensible existing mechanisms to inspect for blood gain;
  that does not establish that their effect can be transplanted freely.

The registered stat list contains `Blood bomb`, but no named Carmilla current-blood
or maximum-blood stat. No dedicated public `R.blood` API was found. Crucially,
[talent_add_stat.py](../src/rsmm/engine/talent_add_stat.py#L363) specifically names
Blood Reserve as a passive whose numbers are consumed elsewhere by its own hero.
It cannot simply be copied to another hero and expected to work. This also means
tracing its consumer is necessary before designing blood-dependent rules.

### Onslaught

Known identifier: `Attack Special Rush` / `Skill_Attack_Special_Rush`.
The public reference describes a post-SPECIAL rush on the next ATTACK, scaling at
800/1000/1200/1400% ATTACK damage. Those are displayed mechanics, not assumed
stored multipliers. See the
[talent reference](https://ravenswatch.wiki.gg/wiki/Carmilla/Talents).

- **First candidate:** its damage progression.
- **Supported composition candidate:** a timed next-ATTACK bonus after SPECIAL,
  retaining the existing rush. The SDK already builds that kind of bonus window.
- **Graph-dependent candidates:** arm the rush after DASH or DEFENSE instead,
  extend its availability window, change movement distance/speed, or adjust its
  collision width. None of those exact Carmilla fields has been verified here.
- **Experimental candidates:** give the rush an additional status, or make it an
  every-N-attacks move using existing counters. These have different evidence
  levels; neither should be sold as already working on Carmilla.

Attack selection needs testing with Cruel Strike, Heartbreak, and Mass Punishment.
They may compete for the same selection branches. Changing a clip alone also does
not prove damage timing and movement stay aligned.

This is a concrete supported-schema sketch of an *additional* bonus, with arbitrary
example values. It preserves Onslaught's existing effect. It has not been built
against Carmilla's assets or tested in game:

```toml
[[content]]
kind = "talent"
id = "carmilla_onslaught_followup"
hero = "Carmilla"
add_stats = [
  { talent = "Attack Special Rush", stat = "Attack power basic", values = [0.10, 0.15, 0.20, 0.25], after = "SPECIAL", seconds = 4, next = "ATTACK" },
]
```

Its new card number would also need a matching description edit. The bonus window
starts on SPECIAL activation and expires after four seconds or after the next
ATTACK finishes, whichever happens first. It does not prove that Onslaught's
particular rush reads that stat in every form; that is a playtest requirement.

## Boundaries and the next concrete step

- We have **26 named talents**, not 26 fully audited editable parameter sheets.
- Extra rows in the hero's native talent roster are deliberately unsupported:
  the skill builder records a crash from adding a row. Replace existing cards.
- Cross-hero effects are only portable when their dependencies can travel with
  them. Bat Master is listed as portable; Blood Reserve is explicitly not.
- New behavior may be possible through graph work or the public Lua SDK, but Lua
  does not make an unmapped blood resource or an unknown event payload mapped.
  New engine access belongs in the SDK, not raw memory operations inside a mod.
- Keep the Carmilla changes in one mod. Multiple blocks within one mod compose;
  separate mods overriding the same hero file can overwrite each other's changes.

The next prerequisite is a current game install readable by `rsmm.engine.corpus`,
or a matching extracted corpus. Full hero/definition/common resources are better
than only the main Carmilla file because status donors and inherited components
may live elsewhere. Text banks are needed for accurate card descriptions.

Once available, the existing read-only tools can begin discovery:

```sh
rsmm talents Carmilla --grep "Dash Taunt"
rsmm talents Carmilla --grep "Passive Blood Reserve"
rsmm talents Carmilla --grep "Attack Special Rush"
rsmm entity-graph Carmilla --group "Skill Attack Special Rush"
rsmm entity-graph 'Heroes\Hero_Carmilla\Hero_Carmilla_Update6.entity.ot'
```

The plain talent list is only the beginning: inspect rarity selectors, inherited
references, and shadowed values as well. Editing a shadowed inline number has no
effect. Record effective labels and old values, build one small change per talent,
then test ownership, rarity upgrades, day/night and Winged Form, attack-replacement
interactions, and restoration. Multiplayer behavior requires its own test.

No ready-to-install mod is attached because the required source assets and
Carmilla-specific validation are missing. The initial research is complete;
implementation can start with concrete desired behaviors and the matching game data.
