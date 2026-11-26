# Carmilla working context — 26 November 2026

## Purpose and boundary

The user requested a talent/synergy hardening pass, a review of their edited package, and a local HTML workbench. Scarlet and Aladdin are comparison cases for broad build connectivity. No new balance decisions are adopted and no game or package files were edited.

Reviewed input: `/Users/javan/Downloads/carmilla-rework/`, manifest version **0.4.2** by Arch. See `package-hashes.json` for exact hashes. The screenshot repeats the earlier inventory and is not independent evidence of game mechanics.

## Prior user choices versus this package

- Seductive Provocation: requested activation at the end of a completed dash, retaining its existing cooldown. This is still pending; the package keeps a directionless-DASH taunt controller with a six-second value.
- Blood Reserve: replace capacity with 10/15/20/25% attack speed above 50% blood. The supplied graph contains this threshold and modifier; gameplay behavior is untested.
- Onslaught: SPECIAL arms DASH; scale from a percentage of bite damage. Package values are 100/125/150/175% and its readiness timer is three seconds. These are observed edits, not newly approved tuning. Earlier offline demonstration values must not be treated as game evidence.

## Working assessment

Carmilla has meaningful bridges already: blood generation/spending, bleed into critical payoffs, SPECIAL into POWER through Injection, target-side damage through Victimization, and attack/ultimate links. Her problem may be reliability and reach rather than a shortage of links. Some bonuses ask for a particular casting history or a status that expires while the player channels. A capacity bonus can have real value without offering enough value per talent slot.

Scarlet's shared combo-point economy connects multiple generators and spenders to repeated general rewards. Aladdin connects movement, blade retrieval and enchantment to multiple follow-ups. Those are useful patterns, not guarantees of universal synergy: both received targeted talent replacements in 1.06, and both retain prerequisites and opportunity costs.

## Veteran feedback — verbatim, reported observations

> so like for example blood rage (starting talent) doesnt synergize with injection... for some reason.. clear design flaw if you asked me

**Working interpretation:** Plausible completion-bonus gap; not zero shared value. Blood Rage’s quest rewards general DMG, which can still help other attacks. Its completion condition checks POWER blood use and the hold chronometer. Injection uses the Power Orb spawner with an “explode now” value, so a held-cast reward is not automatically inherited. The final orb formula is missing.

**Check:** Compare Injection damage before/after quest completion at identical DMG, rarity, level and target; separately test a qualifying held POWER cast. Control for DMG earned during the quest.

> blood reserve is completely artificial, only impalement ultimate TRULY benefits from it.

**Working interpretation:** Strong concern about payoff, too absolute as a mechanics claim. Impalement directly converts blood spent into damage. Capacity also buys potential channel/winged uptime and reduces overflow, but only when blood generation can fill it. That makes the value less visible and less immediate. The submitted replacement turns reserve into an ATTACK payoff and introduces a new spend-versus-hold tension.

**Check:** Compare time at full blood, wasted generation, channel duration, and Impalement damage. Separate “has a benefit” from “worth a talent slot.”

> bleed ticks only for 5 seconds I believe, +-, so flesh rip and furious tempest have almost zero synergy.. by the time you stack your tempest, bleed fades out so your flesh rip is offline and you rely on your teammates applying bleed

**Working interpretation:** Timing friction supported; exact duration unverified. The package’s Tempest ramp duration is 3 seconds. If bleed lasts 5 seconds and POWER begins immediately, a 2-second full-ramp overlap is possible before animation and travel costs. That is fragile rather than inherently zero. Bleed duration, refresh rules and channel-end sampling need the missing status/orb data or a controlled run.

**Check:** Apply your own bleed, start POWER after a measured delay, and release before/after expiry. Repeat using Dispersion and teammate bleed. Log crit rate and damage separately.

> gust + life tap + angel & demon (will be fixed in next patch)

**Working interpretation:** Version-sensitive report; not a confirmed future patch. Official 1.06 notes (12 October 2026) already announce Life Tap triggering every TRAIT talent. The supplied Update6 layer calls Angel and Demon’s tester and selects a Gust-specific Life Tap clip. That supports intended connectivity, but a combined-path bug could still exist. No newer promised fix was established.

**Check:** Record game version/platform. Compare Life Tap alone, with Gust, with Angel and Demon, and with both, in day and night; check health cost, blood gain, healing/STRENGTH and knockback.

## Inventory rules

- 26 selectable talents: 4 starting, 18 standard, 4 ultimate. Official buildmaker tier values 0/1/3 establish these buckets; tier 2 records are the two ultimate abilities, not additional talents.
- Internal grouping is independent of acquisition tier and functional scope. Injection is in `Skill Power Special Bomb` but starts with a SPECIAL bite. Onslaught remains internally `Attack Special Rush` despite the mod's DASH input and SPECIAL category.
- Starters normally exclude one another. Do not suggest Life Tap + Blood Rage, Life Essence, or Bat Master as a normal selectable combination.
- Base and Update6 must be read together. Preserve both layer identities; this package does not prove there are no other active layers in the user's install.
- Blood Shards / `Power Projectile`, Tearing Slide / `Special Cross Damage`, and old `Passive Taunt` paths are present in the binary/text but absent from the official selectable list. They are not counted as live talents.
- Component references can sit in owned subobjects. A top-level decoder displaying `(none)` is not sufficient proof that a tester or collector is empty. Blood Reserve's threshold and the copied bite effects were inspected in those subobjects.
- Numeric union order, rounded card values and final damage are not interchangeable. In particular, the official buildmaker displays Dispersion differently from a wiki listing; do not promote a raw scalar to final damage.

## What was checked

Both supplied entities parse and round-trip byte-for-byte (1,091 base components; 40 Update6 components). All 13 language banks were parsed; replacement rows 18 and 40 are English in every language. Basic Attack Speed's data-defined key was independently matched using the repo's key function. The Blood Reserve float test uses a strict greater-than comparison against 0.5. Dash-selector references and copied damage references were checked by GUID, not just their readable labels.

A full link check with only this package cannot resolve inherited game assets: Base returned 453 errors and one warning; Update6 returned 17 errors. These are not claimed to be 470 mod defects. Layout/round-trip validation is not an in-game pass.

## Evidence still needed

Matching pristine entities and exact game version/platform; Hero_Common/Character_Common and hero definitions; Carmilla's Power Orb, bat projectile and ultimate child entities; bleed and seed status data; actual timing, modifier lifetime, host/peer and gameplay tests. No pristine baseline exists here to prove all changes or confirm unchanged talents. Full entity replacements can carry unintended old data forward across patches or conflict with another mod.

## Sources

- Supplied package and repository readers: `entity_graph`, `entity_fields`, `entity_graph_edit`, `entity_check`, `talent_writer`, `item_effect`, `item_modifier`, `text_patches`.
- Official buildmaker: https://buildmaker.ravenswatch.com/ — its observed `/api/game-heroes/carmilla?lang=en`, `/scarlet?lang=en`, and `/aladdin?lang=en` endpoints were retrieved read-only on 26 November 2026. Card intent, tiers and selected comparison examples; not runtime proof.
- Official 1.06 notes: https://store.steampowered.com/news/app/2071280/view/713409051455653305 (12 October 2026); readable announcement mirror https://steamcommunity.com/app/2071280/allnews/?l=english . No future fix for the reported combined TRAIT issue was established.
- Repo name map: `apps/docs/src/content/docs/reference/talent-names.md`.

See `research.json` for the complete editable inventory and `review.md` for specific findings. All synergy descriptions are classified analysis unless a particular effect/link is explicitly confirmed.

## Comparison and rework-focus additions

The user requested a new Scarlet/Aladdin talent map and a shared base-kit map for all three heroes. These are now separate pages in the same workbench. Both retain the original package review and Carmilla inventory.

- 52 Scarlet/Aladdin talents, 26 each (4 starting, 18 standard, 4 ultimate), matched to the official buildmaker snapshots. Whitespace in two published names is trimmed for display.
- Eight base ability slots per hero, with Scarlet’s human/werewolf variants, Carmilla’s normal/Winged Form costs, and Aladdin’s separate wish outcomes.
- Base Scarlet ATTACK creates points; POWER spends them. Additional generators/spenders are talents. Base Aladdin SPECIAL generates enchantment, ATTACK uses it, and POWER/DEFENSE do not inherently spend it. Carmilla’s blood funds channels and Winged upkeep; Impalement still consumes all blood in Winged Form under 1.06.
- Passive/triggered behavior is separate from resource role. Adrenaline rewards an existing spend; it does not charge again. Enchanted Jinn adds spending to POWER. Some transformed Aladdin attacks have unspecified per-hit enchantment accounting, which remains marked as unverified.
- These pages use published descriptions and community base-ability references; they are not engine tracing or gameplay verification. The current official list takes precedence over older repo/wiki talent names.

User-selected first rework targets: **Heartbreak, Mistress of Pain, Boiling Blood, Blood Reserve, Onslaught, Seductive Provocation, Puncture, Dream Scimitars, Sand Vortex, Spinning Strikes.** “Dream Scimitar” was normalized to the official plural name. Names are red and carry a Rework focus label. This is prioritization only; no new changes to these talents were decided.

Additional base references: https://ravenswatch.wiki.gg/wiki/Scarlet and https://ravenswatch.wiki.gg/wiki/Aladdin . The Carmilla base map also uses supplied text and Update6 evidence checked against the official 1.06 notes. Raw official talent snapshots are in `.artifacts/carmilla-review/official-{Scarlet,Aladdin}-atlas.json`.

## Simplified all-hero talent comparison

The user clarified that the main comparison should be one simple table, with all three heroes as columns and ability sections as rows. The prior Scarlet/Aladdin filter-heavy view was replaced at `#talent-map`, and this comparison is now the landing page. Carmilla's detailed package inventory remains available separately.

All 78 talents are represented. Direct triggers, effects, and explicit scaling connections can put the same talent in multiple sections: Cruel Strike appears under DASH/ATTACK/DEFENSE; Leaping Strike under DASH/ATTACK; Injection under POWER/SPECIAL. Broad shared-resource or stat effects remain in General & resources rather than being expanded to every indirect beneficiary. Short annotations distinguish attack-speed bonuses, attack damage scaling, and wish-only effects.

The table uses the published game reference. In particular, Onslaught appears under SPECIAL and ATTACK; its modified 0.4.2 DASH path remains in the package review. All ten user-selected rework names retain red styling. `talent-groups.json` holds the explicit grouping map; original detailed datasets are retained.
