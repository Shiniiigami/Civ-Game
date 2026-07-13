# Tech & Research Audit — Crown Waters

**Cartridge:** 4.6 (Technology & research) · **Domain CSV:** `audit_out/tech.csv` (18,718 rows)
**Game version:** git `62523dc0` · script sha256_16 `4075d3270dbab183` · run `2026-07-13`
**Corpus:** 16 archetypes × 6 scenarios × seeds {7,19,42} = 288 runs, years 1–100.
**Columns audited:** `techs` (count known), `researchActive` (current study id or empty), `scholars` (dedicated scholar pool), `allTechDone` (0/1).

---

## Executive summary

The tech tree is **structurally sound but functionally a stub in play**. Three hard facts define the domain:

1. **`allTechDone` is reached in 0 of 18,718 rows.** No archetype, scenario or seed ever masters the 39-tech tree. The entire late-game that hangs off it — `advanceGoldenAge()`, the six **Golden-Age Edicts** (`EDICTS`), golden-age tiers/prestige — is **unreachable dead content** under realistic play.
2. **Research is far too slow.** The dedicated rusher (`techlord`) completes its **14th** tech around **year 61** (baseline/seed 7) and every surviving `techlord` run plateaus at **exactly 14/39** techs. The full tree costs **9,710 points**; the reachable pace implies **~200+ years** to finish.
3. **The tree dies in the mid-game.** Among survivors at **year ≥ 90, 100% (1,589/1,590 rows)** have **no active research**. Realms exhaust their reachable techs by ~year 40–60 and then sit idle for the rest of the game. Research is a short checklist, not a lifelong decision.

Supporting rot: **16+ of 39 techs are never researched in any of 288 runs** (the entire tier 3–5 except mathematics/scriptoria/scholarship); **15 of 16 archetypes never dedicate a single scholar** (`scholars`=0 for the whole run) so `scholarPool`-driven output is inert for everyone but `techlord`. Research is also **gold-gated** (`researchGold()` = 0.5 × output per season), so the economy-wide collapse (most archetypes die by ~year 22–27) starves research before it starts.

Verdict: the tree's *content* (costs, prereqs, tiers) is well-designed with no loops and no unreachable nodes; the *pacing and end-state* are broken. It reads as a linear checklist you abandon halfway, with an authored golden-age finale nobody ever sees.

---

## New this pass (first audit of this domain)

No prior `report_tech.md` or tech ledger rows exist — this is the inaugural pass, so everything is net-new. Findings below are ordered Critical → Polish.

---

## 1. Tech tree structure (cost / prereqs / tiers)

39 techs, total cost **9,710 pts**, 6 tiers (`techTier` / `TIER_NAME`):

| Tier | Name | #techs | Cost | Techs |
|---|---|---|---|---|
| 0 | Foundations | 4 | 255 | writing, currency, horsemanship, smelting |
| 1 | Early advances | 11 | 1,500 | warbeasts, irrigation, masonry, metallurgy, navigation, banking, philosophy, guilds, composite, law, espionage |
| 2 | Classical mastery | 7 | 1,220 | engineering, medicine, stirrups, doctrine, cartography, accounting, universities |
| 3 | High learning | 10 | 3,155 | bluewater, siegecraft, roadbuilding, sanitation, mathematics, astronomy, scriptoria, knighthood, bureaucracy, imperialcoinage |
| 4 | Advanced study | 6 | 2,820 | galleys, icebreaking, scholarship, agronomy, grandarch, legions |
| 5 | Height of learning | 1 | 760 | naturalphil |

**Structural health: good.** `techTier` recursion terminates for all 39 nodes → **no prereq loops**. Every node's prereq chain resolves to tier-0 roots → **no orphan/unreachable techs by construction**. Each tech has a real `desc` with a mechanical effect (verified against `researchOutput` multipliers, `BUILDING_TECH`, `fieldableUnit`, `lawCap`, `siegeBonus`, etc.). `naturalphil` (tier 5) is explicitly the gate to the Golden-Age era.

The problem is not the graph — it's that **57% of the tree's cost sits in tiers 3–5 (6,735 of 9,710 pts)** that the data shows are never reached.

## 2. Research rate & scholar economy

- `researchOutput()` = `2 + scholarPool×0.55 + academies×1.5`, times a stack of tech/wonder multipliers.
- `researchGold()` = `max(1, round(output × 0.5))` — **every season of research burns gold**; if the treasury can't pay, `advanceResearch()` scales output by the fraction paid (often to 0) and logs a stall.
- `scholarCap(s)` = `floor(pop×0.015) + academy×30×(universities?1.8:1)` — scholars come almost entirely from **academies**, gated behind building them.

**Observed pace (mean `techs` by year, surviving runs at each year):**

| archetype | y1 | y10 | y20 | y30 | y50 | y75 | y100 |
|---|---|---|---|---|---|---|---|
| techlord | 3.0 | 4.1 | 6.6 | 8.4 | 11.2 | 13.3 | **14.0** |
| merchant | 3.0 | 3.6 | 4.9 | 5.9 | 7.0 | 8.4 | 9.5 |
| nomad | 3.0 | 3.6 | 4.3 | 5.6 | 9.4 | 10.0 | 10.0 |
| faith | 3.0 | 3.4 | 4.3 | 6.2 | 8.7 | 9.0 | 9.0 |
| isolationist | 3.0 | 3.4 | 4.5 | 6.6 | 9.0 | 9.0 | 9.0 |
| balanced | 3.0 | 3.6 | 4.8 | 5.9 | 7.1 | 7.7 | 7.7 |
| conquest | 3.0 | 3.6 | 4.7 | 5.6 | 7.5 | 7.7 | 7.7 |
| builder | 3.0 | 3.3 | 4.1 | 5.2 | 5.7 | 5.7 | 5.7 |
| diplomat | 3.0 | 3.5 | 4.4 | 4.9 | 5.1 | 5.2 | 5.2 |
| thalassocrat | 3.0 | 3.3 | 4.5 | 4.7 | 5.0 | 5.0 | 5.0 |
| slaver | 3.0 | 3.4 | 4.3 | 4.7 | 4.7 | 4.8 | 4.8 |
| passive | 3.0 | 3.0 | 3.0 | 3.2 | 3.7 | 3.8 | 3.8 |
| survivor | 3.0 | 3.0 | 3.0 | 3.1 | 3.5 | 3.5 | 3.5 |

(baseline/pangaea/easy/hard/archipelago start at **2** techs; `kingdom` starts at **8**.)

**Scholar economy is inert for 15/16 archetypes.** `scholars` is **0 for the entire run** for every archetype except `techlord` (max 525). This is partly a **harness artifact** — only the `techlord` branch calls `setJob(...,'scholars',...)` (harness line 325) — but it exposes a **game finding**: nothing forces or rewards scholar assignment for anyone else, so the whole `scholarPool → researchOutput` amplifier is optional flavor most playstyles ignore. Base output (2/season + academy) carries everyone else to a 5–10 tech ceiling.

## 3. Gating — does tech gate meaningful things?

Yes, richly: `BUILDING_TECH` gates roads/hospital/shipyard/bazaar/aqueduct/academy/bridge/dam/stable/pen; `fieldableUnit`/`UNIT.tech` gates the whole military roster; `lawCap` (law, bureaucracy), `siegeBonus`/`siegeStrength` (siegecraft), `buyPriceMult`/`sellPriceMult` (currency, banking), plague resistance (medicine/sanitation/scholarship), interest (accounting), unity (scriptoria, philosophy). Gating is **not** the problem — the problem is that most of these gates sit in tiers 3–5 that are never opened, so their downstream systems are permanently locked in practice.

## 4. Tech end-game — `allTechDone → what then?`

The authored finale: once `allTechDone()` is true, `advanceGoldenAge()` converts research output into a `golden` pool and tiers (every 300 pts), and `enactEdict()` unlocks six ranked **Golden-Age Edicts** (Prosperity/Plenty/Legions/Order/Devotion/Wisdom) with escalating cost (`edictCost` = 150 + rank×120). **None of this ever activates** — `allTechDone`=0 in all 18,718 rows, and `enactEdict`/`advanceGoldenAge` both early-return unless the full tree is done. This is genuinely nice content (the `wisdom` edict even compounds research) that **no player will ever reach** at the current pace.

## 5. Tech UI/UX

Not visible headless, but code review of `openResearch`/`techPanel` shows a legible tiered tree with progress meters, per-tech "seasons left" estimates, and "kept if you switch back" partial-progress — good. One concern surfaced by the data: the panel promises a Golden-Age payoff (`edictsPanelHTML`) that is effectively unreachable, so the UI advertises an end-state the game never delivers.

## 6. Balance — must-rush vs skippable

`masonry` is the most-studied tech by far (**1,068** active-rows), followed by philosophy (809), irrigation (594), engineering (565), accounting (541), currency (539), banking (458), guilds (356). These are the economic/infrastructure spine everyone converges on — i.e. the "live" part of the tree is a **narrow shared trunk of ~8 techs**, not a branching decision. The military branch (composite 187, stirrups 31, doctrine 21) and everything past tier 2 barely register.

## 7. Bugs / impossible states

- No prereq loops, no unreachable nodes (§1).
- **`techlord` hard-plateaus at exactly 14/39** in every surviving run (13/13 that reach y100 land on 14). Root cause is a **harness artifact**: the `techlord` research wishlist (harness line 319) lists `bureaucracy`, `accounting`, `astronomy`, `naturalphil` but **omits their prereqs** (`law`, `banking`, `navigation`), so those four + anything behind them can never satisfy `techAvailable`. After ~year 61 the auto-player idles with empty `researchActive` while scholars pile up uselessly (baseline/seed 7: scholars climb 22→58 from y65–100 with no active study). **This is a harness fidelity gap, not a game bug** — but it also means the corpus *understates* how far a real player could push, while the *rate* finding (§2) stands.

## 8. Archetype comparison

Final `techs` ceiling by archetype: techlord 14 · merchant 12 · exploit-hunter 11 · nomad/spymaster 10 · balanced/conquest/diplomat/faith/isolationist 9 · builder/expansionist/passive/slaver/survivor/thalassocrat 8. Spread is real but compressed into 8–14 of 39 — **no archetype has a distinct tech identity** beyond "how far up the same economic trunk did you get before collapsing." `techlord` is only marginally ahead and its lead is *never uncontestable in tech terms* because there is no tech victory and the tree caps out for everyone.

---

## Findings

### Critical

- **TECH-001 — Golden-Age / Edict end-game is unreachable dead content.** `allTechDone`=1 in **0/18,718** rows. `advanceGoldenAge()`, six `EDICTS`, golden tiers and edict prestige never fire. Authored finale, zero delivery.
- **TECH-002 — Research pace is ~2–3× too slow to finish the tree in a lifetime.** Best case (`techlord`) = 14 techs by ~year 61; full tree = 9,710 pts across 39 techs. At observed rates the tree needs **~200 years**. Tiers 3–5 (6,735 pts, 17 techs) are effectively unreachable.

### Major

- **TECH-003 — 16+ techs are never researched in 288 runs (dead content).** Only **18 distinct techs** ever appear as `researchActive`. Never studied by anyone: warbeasts, navigation, medicine, bluewater, siegecraft, cartography, roadbuilding, law, sanitation, galleys, icebreaking, astronomy, knighthood, bureaucracy, agronomy, imperialcoinage, grandarch, legions, naturalphil. The entire naval, siege, high-governance, and capstone branches are dead in practice.
- **TECH-004 — Research goes fully idle in the mid/late game.** Among survivors at **year ≥ 90, 100% (1,589/1,590)** have no active research. Realms exhaust reachable techs by ~y40–60 and coast. The tree is a short checklist, not a standing decision — directly fires the cartridge's "stagnation" flag *before* `allTechDone`, not after.
- **TECH-005 — Scholar economy is inert for 15/16 archetypes.** `scholars`=0 for the whole run for everyone except `techlord`. `scholarPool` (the main `researchOutput` amplifier) contributes nothing for 94% of playstyles. Partly harness (only techlord assigns scholars) but underlyingly nothing pressures other archetypes to build the scholar/academy engine.

### Minor

- **TECH-006 — Research is gold-gated and dies with the economy.** `researchGold()` = 0.5 × output/season; `advanceResearch` scales output to the fraction the treasury can pay. With most archetypes collapsing by year ~22–27 (RUN_META), research stalls before tier 2. Ties the tech domain's failure to the economy/authority death-spiral — a cross-domain dependency worth flagging to `synthesis`.
- **TECH-007 — The "live" tree is a narrow shared trunk, not a branching choice.** ~8 econ/infra techs (masonry, philosophy, irrigation, engineering, currency, accounting, banking, guilds) dominate all study; branches (military, naval, law) are near-untouched. Meaningful-choice lens fails: research converges to one line.

### Polish

- **TECH-008 — Harness wishlist gaps cap `techlord` at 14.** Wishlist omits `law`/`banking`/`navigation`, orphaning `bureaucracy`/`accounting`/`astronomy`/`naturalphil`. Fix the harness list (and re-run `setup`) to measure the true ceiling; the pace finding (TECH-002) is independent of this.

---

## Flags that fired (cartridge 4.6)

- **techs that unlock nothing** — no; every tech has an effect (not fired).
- **prereq loops / unreachable tech** — not fired structurally (clean graph), but *effectively* unreachable via pace (TECH-002/003).
- **research too slow (never finishes)** — **FIRED hard** (TECH-001/002): 0/288 runs finish; tree needs ~200y.
- **single must-rush tech that dominates** — partial: `masonry`/econ trunk dominates study but no single tech is a hard gate to victory (TECH-007).
- **scholar cap trivial/impossible** — scholar *pool* is trivially zero for 15/16 archetypes (TECH-005).
- **stagnation after allTechDone** — worse: stagnation **without** allTechDone; late game is 100% idle research (TECH-004).

## Standing lenses applied

- **Balance & tuning (L1):** research cost curve is back-loaded so hard the top 57% never opens — mistuned.
- **Meaningful choice (L2):** research collapses to one econ trunk; branches are dead → false choice (TECH-007).
- **Pacing & arc (L5):** dead late-game — research is over by mid-game; the authored finale is never seen (TECH-001/004).
- **Feedback loops (L6):** gold-gating couples research to the economy's negative spiral (TECH-006).
- **Replayability (L7):** archetypes compress into 8–14 techs of the same 18; little tech-driven divergence.
- **Legibility (L4):** UI advertises a Golden Age the game can't deliver.

## Design-pattern lens — Civ 6 Snowball-inflection (flagged for tech)

**Verdict: no snowball inflection exists in tech, and that is itself the failure.** In Civ 6 a tech/science lead compounds into an uncontestable position; here the tree *caps out for everyone* at a fraction of its length, so there is no inflection point and no tech-based lead to contest — `techlord`'s 14 vs the field's 8–10 is a flavor difference, not a win condition. Research is a **linear checklist you abandon halfway**, not a live strategic decision. The opportunity-cost that makes Civ 6 tech a real choice (which branch, at what cost to others) is absent because the branches are never reached. **Comeback-viability (Civ/EU) corollary:** since tech never snowballs, it never punishes a slow start either — but that's the wrong kind of balance (flat because dead, not flat because rubber-banded).

---

## Opportunities

1. **Re-scale the tree to finish in a lifetime (S).** Either cut total cost ~40–50% (target: a focused rusher completes all 39 by ~year 80, a generalist by never) or split cost from time by having research advance partly on a flat per-season tick independent of gold. Concretely: reduce tier 3–5 costs by ~35% and/or raise base `researchOutput` floor. Expected: tiers 3–5 stop being dead; the Golden-Age finale becomes a real goal for `techlord`. Addresses TECH-001/002/003.
2. **Make the tree branch, with visible opportunity cost (M).** Introduce 2–3 mutually-constraining research foci (e.g. a "one active great-project tech per era" limit, or era-locked branches where committing to the naval line delays the military line). Borrow Civ 6 district-adjacency logic: each choice should *close* another. Expected: archetypes develop distinct tech identities instead of all walking the econ trunk. Addresses TECH-007.
3. **Give the late game a real destination short of the full tree (M).** Golden-Age Edicts are good content locked behind an impossible gate. Unlock a *scaled* golden age at, e.g., completing any full tier or 25/39 techs, so mature realms have something to spend research on before y100. Expected: kills the 100%-idle late game (TECH-004). Addresses TECH-001/004.
4. **Make scholars a standing decision, not a techlord quirk (S).** Tie a visible bonus (unity, prestige, or a research-speed breakpoint) to sustained scholar dedication so every archetype has a reason to feed the academy engine, and surface `scholarPool/scholarCap` pressure in the season report. Expected: revives the dormant scholar economy (TECH-005).
5. **Decouple research from the treasury death-spiral (S).** Replace or soften `researchGold` (0.5×output/season) with a flat, low, or scholar-paid cost so a struggling realm can still creep up the tree instead of freezing at tier 1. Expected: research survives economic hard times; fewer runs stuck at 3–5 techs (TECH-006).

---

## Experiments to try next pass

1. **Fix the `techlord` harness wishlist** (add `law`, `banking`, `navigation`; order prereqs first) and re-run `setup`. Hypothesis: the true rusher ceiling is ~22–26 techs, still short of 39 — confirming TECH-002 is a game problem, not a harness one.
2. **Halve tier 3–5 costs** in a scratch build and re-run one `techlord` seed. Hypothesis: `allTechDone` becomes reachable around year ~85–95, and `advanceGoldenAge`/edicts finally fire — measuring exactly how much re-scaling the finale needs.
3. **Add a flat +N research/season floor** (economy-independent) and re-run the collapse-prone archetypes. Hypothesis: median final `techs` for non-tech archetypes rises from ~5 to ~8–9 even under economic collapse, testing TECH-006.

---

## Appendix

- **Seeds:** 7, 19, 42 (frozen subset of the 10-seed set; RUN_META `mode: full`).
- **Scenarios:** baseline, archipelago, pangaea, easy, hard, kingdom. Starting techs: 2 for all except `kingdom` (8).
- **Archetypes (16):** passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced, exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor.
- **Version:** index.html git `62523dc0f0b808f4501acf35acf074d3f9acf36f`, script sha256_16 `4075d3270dbab183`; harness run 6,825s, 288 runs, 18,718 tech rows.
- **Harness caveats:** (a) only `techlord` assigns scholars → `scholars`=0 elsewhere is partly artifactual; (b) `techlord` wishlist omits some prereqs → caps at 14 (TECH-008); (c) many runs end early via `advanceSeason` collapse (esp. archipelago, faith, expansionist ~y19–27), truncating late-year tech data — the y50–100 means reflect survivors only.
- **Key source lines (index.html):** TECH def @740; `hasTech`@781; `techAvailable`@791; `scholarCap`@832; `researchOutput`@834; `researchGold`@835; `allTechDone`@837; `advanceGoldenAge`@838; `EDICTS`@839; `enactEdict`@841; `setResearch`@842; `advanceResearch`@843; `techTier`@844; `openResearch`@847.
