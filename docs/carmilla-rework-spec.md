# Carmilla rework: requested behavior

Requested 2026-11-25. Implementation is waiting on the current game assets;
this document does not describe a working mod. The broader inventory is in
[the feasibility report](carmilla-rework-feasibility.md).

An [offline preparation kit](../tools/carmilla_rework/README.md) now implements
the intended rules as an executable model and provides a read-only data exporter.
Its tests exercise the model and synthetic inputs, not the actual game.

## Confirmed direction

| Talent | Requested change |
|---|---|
| Seductive Provocation | Trigger when a dash ends. |
| Blood Reserve | Replace the capacity bonus with 10/15/20/25% attack speed while blood is above 50%. |
| Onslaught | Trigger through DASH after SPECIAL, dealing a percentage of SPECIAL's bite damage. |

All three effects require their respective talent to be owned. They belong in
one mod so changes to the same Carmilla files compose.

## Seductive Provocation

Move the existing effect's activation to the end of a completed dash. Apply it
from Carmilla's final position and facing, preserving its existing target
selection, statuses, and rarity scaling unless explicitly changed. Replace the
old neutral-DASH activation so one input cannot fire both paths.

Proposed interpretation: this also runs at the end of an Onslaught-enhanced dash.
A canceled dash or death should not cause a delayed extra proc. A normal dash
without Onslaught must still work.

Confirmed: retain the existing internal cooldown. A dash completion while the
cooldown is active does not proc the effect or restart the cooldown. Reuse the
current game's cooldown duration rather than inventing another balance value.

Implementation evidence:

- `talent_add_stat.add_stat` documents an actual state-exit path used by the
  dash's `Exit Event Sender`. The mechanically named state field is
  `disables_while_active?`, despite its misleading name. Do not choose
  `on_exit?` based on the name alone.
- The high-level `after = "DASH"` option begins at activation and does not
  implement this request.
- Carmilla overrides the dash controller but still points it at the shared
  dash state, according to `hero_ability.CONTROLLERS`. The patch must be scoped
  to Carmilla; an unguarded shared-state edit would affect other heroes.
- The effective `Dash Taunt` graph must include `Hero_Carmilla_Update6`.

## Blood Reserve

The gate is strictly `current_blood > 0.5 * effective_max_blood`, not an absolute
50 blood. Use the maximum after capacity bonuses. Exactly 50% does not qualify.
The attack-speed modifier should switch on/off as the threshold is crossed,
without accumulating copies. It must cease when the talent is absent.

Confirmed: remove the original capacity bonus. Grant 10/15/20/25% attack speed
at Common/Rare/Epic/Legendary while the threshold condition holds. Other sources
of maximum blood, if any, still affect the threshold. These values are implemented
in the offline model only; no game modifier has been changed.

Implementation evidence:

- `Basic Attack Speed` is a known data-defined stat, documented and covered by
  `tests/test_item_stats.py`. It is discovered from `ApplicationSettings.ot`,
  rather than listed in the static `data/stat_keys.json` registry.
- The SDK already constructs float comparisons and conditional modifiers.
  The missing information is which live Carmilla values expose current and
  effective maximum blood, and how those readers update.
- Blood Reserve's existing capacity effect is consumed elsewhere by Carmilla's
  own graph. Its controller is not itself the resource meter.
- A whole-hero animation-speed change is not an acceptable substitute: the
  request is attack speed, not faster dash, SPECIAL, or TRAIT animations.

Required data includes `ApplicationSettings.ot`, Carmilla's entity family, and
the shared hero/character entities. A main-entity dump alone may be insufficient.

## Onslaught

Working interpretation: SPECIAL arms one empowered DASH. The next DASH executes
the rush and consumes the armed state. Ordinary ATTACK no longer performs or
consumes the rush. A DASH without the armed state remains a normal dash.

The working interpretation is an empowered dash, not an extra rush appended
after a full normal dash; do not accidentally create double movement or a
second required input. Retain the existing arming lifetime if the current game
defines one, unless the user asks to change it. Additional SPECIAL uses refresh
the readiness rather than stacking multiple charges. These are implementation
assumptions to verify against the user's intent and current graph.

Damage needs two separate decisions:

1. **Ability classification:** the hit should use SPECIAL-specific bonuses,
   rather than ATTACK or DASH bonuses. `hero_ability.DAMAGE_TYPE` maps SPECIAL
   to the secondary category. The damage field is `_TYPE_FIELD` (`value_35`).
2. **Base amount:** confirmed to be a percentage of SPECIAL's bite damage.
   Changing classification does not automatically replace the formula that reads
   ATTACK damage; trace that formula too. The percentage at each rarity remains
   undecided. Do not transfer the original ATTACK percentages unchanged to a
   much larger SPECIAL base. Resolve the bite's damage formula once and avoid
   applying SPECIAL modifiers twice. Whether a conditional bite bonus or its
   actual previous critical hit should be inherited has not been specified;
   the default implementation target is a calculated bite-damage basis, not a
   replay of damage dealt to the previous enemy.

Whether every SPECIAL-specific talent also affects the rush depends on its
implementation. A stat keyed to damage category can apply; a talent wired
specifically into the bite may not. Do not promise all SPECIAL synergies solely
because the category changes.

Implementation evidence:

- The old talent identifier is `Attack Special Rush`.
- The existing graph must be inspected to separate arming, input selection,
  attack/rush execution, movement, damage, and consumption.
- `next = "DASH"` can consume a timed stat window; it does not move Onslaught's
  attack onto the dash by itself.
- The old ATTACK selector must return to its normal behavior without breaking
  Cruel Strike, Heartbreak, or Mass Punishment.

## Acceptance checks once the mod can be built

| Scenario | Expected result |
|---|---|
| None of the talents owned | Carmilla behaves as the unmodified hero. |
| Seductive Provocation owned; complete a dash with its cooldown ready | One effect at the endpoint; no proc at dash start or along the path. |
| Complete a dash during seduction's internal cooldown | No proc and no cooldown refresh. |
| Dash canceled, interrupted, or hero dies | No orphaned timer or delayed duplicate proc. |
| Neutral DASH input | Does not run both the old and new seduction triggers. |
| Blood Reserve owned; blood below/equal/above half of effective capacity | Bonus absent/absent/present. |
| Pick or upgrade Blood Reserve | Original capacity increase absent; speed bonus follows 10/15/20/25% by rarity. |
| Capacity changes or talent rarity upgrades | Threshold and speed bonus update correctly. |
| Blood repeatedly crosses the threshold | Modifier toggles cleanly without stacking or lingering. |
| Onslaught owned; SPECIAL then DASH | One empowered dash; readiness consumed. |
| Onslaught owned; SPECIAL then ATTACK then DASH | ATTACK is normal; DASH still consumes readiness if its lifetime has not expired. |
| DASH again without another SPECIAL | Normal dash. |
| Isolate ATTACK, SPECIAL, and DASH damage bonuses | Rush follows the chosen SPECIAL formula/category; no unintended double scaling. |
| Onslaught and Seductive Provocation both owned | Rush movement completes, then one seduction proc at its endpoint if its cooldown is ready. |
| Cruel Strike or ultimate combo talents also owned | Combo selection still works without replaying the old Onslaught attack. |
| Day/night, Winged Form, death/revive, chapter transition | No stale readiness or speed modifiers; behavior remains consistent. |
| Disable and restore | Original assets and original talent behavior return. |

Solo validation comes first. Multiplayer ownership and event replication need a
separate check before claiming co-op support.

## Current implementation blocker

`rsmm.engine.corpus.source()` still returns `none`. No Carmilla gameplay bytes
are available in this checkout. The user confirmed no installation/extracted
assets are currently available. Without those bytes, a manifest that names the
exact trigger, resource reader, or damage component would be guessing.

Use a current installation through `RSMM_GAME_DIR`, or a matching extracted
corpus plus application settings. Inspect pristine originals and update-layer
overrides, build through the SDK, then run the checks above. No installable
manifest or live-game changes have been created yet.

## Work prepared without the assets

- Behavior, interactions, draft card wording, and the remaining balance decisions
  are documented here and in the preparation kit.
- The read-only exporter collects component graphs as separate layers and relevant
  pristine assets without applying a mod. It records missing data, parser warnings,
  explicit override identities, and hashes. It does not guess the effective graph.
- The executable offline model exercises threshold crossing, cooldowns, and
  SPECIAL-to-DASH arming. Tests validate the intended rules only, not the game's
  event timing or the actual mod.
- Reusable SDK changes remain dependent on verified readers and component bindings.
  Inventing Carmilla node names or resource accessors would not complete that work,
  even if a mock test passed.

The behavior spec is complete enough to guide implementation except for
Onslaught's damage percentages and any changes to the stated assumptions.
No further generic repository search can replace the missing entity contents.
