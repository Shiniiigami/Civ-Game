# Economy Audit — Crown Waters (cartridge 4.1)

**Game version:** index.html git SHA `62523dc0f0b808f4501acf35acf074d3f9acf36f` · script sha256/16 `4075d3270dbab183`
**Data:** `audit_out/economy.csv`, 18,718 year-rows = 288 runs (16 archetypes × 6 scenarios × 3 seeds), years 1–100.
**Pass:** #1 (first economy audit — no prior report/ledger).

## Exec summary
The economy is a **two-outcome machine**: cross a treasury floor and you snowball forever; touch it and you die. 220/288 runs hit treasury <= 1 at some point and **65% of those collapsed**, versus 6% of runs that never emptied — the empty-treasury -> authority death-spiral is the single dominant loss condition, and it is silent. At the other end there is **no working sink**: the only brake, "graft" above 12,000g, skims 0.4% and is a rounding error (72g/season on a 30,000g hoard), so treasuries run to **149,854g** (spymaster/kingdom). Merchant sits at ~2x the field's mean treasury from year 10 onward and never gives it back. **Tax dominates income (73–92%); trade is a passive drip** — and the game's richest trade mechanic (multi-factor `routeIncome`) contributed **exactly 0 across all 288 runs** (harness never opened a route), while goods *sales* bypass the trade ledger entirely. The **kingdom** start trivializes the whole domain (45/48 survive to yr100, mean final treasury 33,580g vs 1,000–3,000g elsewhere). Several archetypes (slaver, nomad, faith, conquest) run chronic structural deficits (53–75% of seasons net-negative) and are economically unsurvivable by design of their lever mix.

## New this pass
Everything below is net-new (first pass). Findings are tagged and grounded in specific numbers/rows/code.

---

## 1. Resources (source + sink)
- **`gold` commodity is near-dead. [Minor — likely GAME]** `S.resources.gold` changes in only **4/288 runs**; range 3–29, mean 3.1, ~7 distinct values, while `iron`/`timber`/`horses` move in ~200/288 runs. Its price is high (`GOODS_PRICE.gold=20`) but it is essentially never mined or traded. Either gold deposits are far too rare to be a lever, or the harness never worked them — but the contrast with iron/timber/horses points to a genuinely inert luxury. `pearls/gems/amber/silver` (prices 11–24) are not even logged; worth confirming they aren't equally inert (see Experiments).
- **`horses` swings enormously** — min 4, max 3,070 (mean 75) via `breedMounts()`. That's a live, compounding stock; flag as a potential runaway feeder for horse-selling economies (price 6) but not audited deeply this pass.
- **`resTotal` moves in 288/288 runs** — the aggregate resource economy is alive; the deadness is specific to `gold`.

## 2. Production & outputs
Production (`production()`, `refineGoods()`, `breedMounts()`) runs every season and `resTotal` is universally dynamic, so the supply side functions. The issue is not production volume but that **surplus goods have only one exit** — `doSellGoods` -> instant treasury — and that exit is a frictionless drip, not a decision (Section 4).

## 3. Consumption & upkeep
- **Upkeep is real and bites for war/expansion archetypes. [Major — GAME]** Chronic-deficit share (rows with net<0): **slaver 75%, faith 58%, nomad 57%, conquest 53%, isolationist 53%, expansionist 53%, exploit-hunter 49%**. These archetypes' lever mix (levies/camps/settlers via `S.econ.upkeep`) outruns their income every season. Contrast merchant/builder at **2%**. This is the "conquest-collapses-on-upkeep" trap from setup, now measured across 16 styles: **militarism and expansion are economic traps, not costed choices**.
- **`adminCost()` scales with pop, settlements, boroughs, and *tech count* (`+2/tech`).** Techlord pays 286g/season mean upkeep — the tech-count term makes teching itself an upkeep tax. Reasonable, but note it stacks against the tall/wide balance.

## 4. Trade & markets — the decision that isn't
- **The trade-route system is fully coded but never fires. [Major — HARNESS artifact, with a GAME tail]** `routeIncome()` is the game's richest economic formula — 8 stacked multipliers (distance, sea+fleet-escort, roads, coinage, complementary goods, relations, republic gov, imperial coinage, prosperity edict). Yet the `routes` column is **0 in 100.0% of 18,718 rows** and `processRoutes()` added nothing anywhere. Cause: the auto-play policies use `doSellGoods/doForeignTrade/doCaravan` but **never call `openRouteOrder`** — a harness lever gap, not a dead mechanic. The GAME tail: this means the deepest trade decision in the game was never exercised, so we cannot yet confirm it's balanced — and if AI factions also lean on simple sales, the route system is decorative in practice.
- **Goods sales bypass the trade ledger. [Major — legibility/GAME]** `doSellGoods` does `S.treasury += gain` but **does not touch `S.econ.trade`**. So the logged `trade` column (mean 32g, max 335) is *not* merchant activity — it's the passive drip from wonders (`arsenal`, `forum`) and `accounting` interest. Real selling shows up only as unexplained treasury growth. Consequence for players: the economy panel's "Trade routes" line under-reports how you actually made your money, and trade reads as a trickle when it's often the main earner.
- **Trade is a minor share regardless.** tax-vs-trade split: even merchant is **73.4% tax / 26.6% trade**; the field average is ~90/10. Trade is not a strategic pillar in the current data — it's a garnish on a tax economy.

## 5. Treasury / tax / inflation over time — the death-spiral and the snowball
- **CRITICAL — empty treasury is a silent, near-terminal authority spiral.** Of the 220 runs that hit treasury <= 1, **142 (65%) collapsed** (ended before yr100); of the 68 runs that never emptied, only 4 (6%) collapsed. The mechanism is in `advanceSeason`: authority gains `+0.25` only if `treasury>30`, else **-1**; plus `treasury>400 -> +0.2`, `treasury>4000 -> +0.3`; and a hard `treasury<10 && admin>20 -> -1.5 authority`. So a poor season doesn't just lack income — it actively strips authority, and `authority<=0` is game-over. **14.9% of all rows sit at exactly treasury=0.** This is the negative half of the loop and it is invisible to the player (Legibility lens).
- **CRITICAL — no meaningful sink; runaway snowball.** The only sink above the operating range is graft: `floor(max(0, treasury-12000) * 0.004)`. At 30,000g that's **72g/season** against merchant income ~500–800g; at the 149,854g max it's 551g — never a brake. Treasury therefore accumulates monotonically. Max observed **149,854g** (spymaster/kingdom/19, yr100). `accounting` tech adds **+2% interest** (capped 40g) — a *positive* feedback that mildly accelerates the leader. The `treasury>4000 -> +0.3 authority` rung means wealth also buys survival, closing the rich-get-richer loop.
- **Snowball has no inflection point — the leader is ahead from year 10.** Merchant mean treasury vs field mean: yr10 **1,261 vs 360 (3.5x)**, yr30 4,743 vs 2,115, yr50 10,200 vs 5,163, yr100 **30,517 vs 14,980 (~2x)**. There is no turn where the lead "becomes" uncontestable — it is uncontestable by year 10 and simply widens. In practice the lead becomes *unrecoverable* once the field starts collapsing (~yr25–40): surviving past the cull IS the win.
- **Are the 4000/12000 thresholds meaningful?** Partly. `treasury>4000` (hit by **22% of rows**, 12 of 16 archetypes) is a real authority floor that reinforces the snowball — meaningful but pointed the wrong way (rewards the already-rich). `treasury>12000` graft (hit by **12.5% of rows**) is **trivial** at 0.4% — it does not function as a sink. **Verdict: the low rung matters (badly); the high rung is cosmetic.**

## 6. Growth & scaling curves
Treasury trajectories (mean over alive runs) show three bands: **runaway** (merchant 27k, spymaster 23k, builder 14k, techlord 11k final), **survivable** (passive/balanced/thalassocrat/survivor 6–9k), and **collapsed-poor** (faith 303, nomad 151, conquest 567 — these are final rows of runs that mostly died by yr30–40). The middle band barely exists — outcomes are bimodal, matching the death-spiral/snowball structure.

## 7. Economic UI/UX
Cannot see rendering (headless), but two code-level legibility gaps surface from the data:
- The authority-from-treasury coupling (section 5) is **not surfaced** in `economyPanel()` — the player sees "net -6g/season" with no hint that an empty treasury is silently bleeding authority toward game-over. **[Major — legibility]**
- The trade line under-reports real earnings (section 4, sales bypass `econ.trade`). **[Minor — legibility]**

## 8. Balance & tuning
- No-brainer: **market/trade infrastructure + surviving = win**; the economic archetypes (merchant/builder/spymaster/techlord) are strictly safer (2–41% deficit seasons) than the aggressive ones (53–75%). **[Major]**
- Trap options: **conquest/nomad/faith/expansionist/slaver** — their levers generate upkeep with no matching income, so they are economic traps in the current tuning.

## 9. Bugs / impossible states
- **Engine fragility near truncated runs (data caveat + robustness flag). [Major — GAME/engine]** Per the control file, 32/48 archipelago, 22/48 hard, 14/48 baseline runs ended before yr100 with `over=0` — `advanceSeason()` threw. Economy state near those ends is not obviously corrupt in the CSV (no negative treasury; `S.treasury=Math.max(0,...)` clamps it), but survival-to-yr100 is only **12/48 in archipelago** vs 45/48 kingdom, so the archipelago economy is being cut off by engine throws, not just bankruptcy. Flag for the war/exploration passes (naval `beachFleetFix`/`_navFix` zone).
- No negative-treasury or sub-zero states found (clamped). `net=0` in only 178 rows (1%).

## 10. Archetype comparison
| archetype | final treas | final net | %seasons net<0 | end yr | collapsed/18 |
|---|---|---|---|---|---|
| merchant | 27,220 | +295 | 2% | 92.7 | 2 |
| spymaster | 22,640 | +256 | 41% | 68.9 | 8 |
| builder | 13,769 | +273 | 2% | 80.5 | 5 |
| techlord | 10,889 | +54 | 33% | 83.6 | 5 |
| survivor | 8,697 | +51 | 39% | 76.4 | 6 |
| thalassocrat | 6,767 | +104 | 19% | 75.9 | 6 |
| exploit-hunter | 6,815 | **-70** | 49% | 79.7 | 11 |
| balanced | 6,133 | +82 | 27% | 64.6 | 9 |
| passive | 6,021 | +127 | 22% | 68.1 | 8 |
| slaver | 4,867 | **-35** | 75% | 91.2 | 4 |
| expansionist | 3,842 | +24 | 53% | 34.4 | 15 |
| diplomat | 1,582 | +95 | 13% | 78.8 | 6 |
| conquest | 567 | +15 | 53% | 39.4 | 15 |
| isolationist | 662 | +17 | 53% | 34.8 | 15 |
| nomad | 151 | -6 | 57% | 37.8 | 15 |
| faith | 303 | +11 | 58% | 33.0 | 16 |

Tell-tale pairs: **spymaster earns the 2nd-highest treasury (621g mean tax!)** despite a 41% deficit rate — an off-theme economic powerhouse worth investigating (why does espionage out-earn everything but merchant?). **exploit-hunter and slaver post the only negative mean final net** yet don't collapse fastest — they bleed but bank enough off-column (sales) to limp on.

---

## Problem-taxonomy flags that fired
- **Over-generous rewards / snowball:** treasury to 149,854g; no working sink; +interest positive feedback. **CRITICAL**
- **Stagnation trap / death-spiral:** treasury<=1 -> -authority -> collapse (65% of such runs). **CRITICAL**
- **Dead column:** `routes` = 0 in 100% of rows (harness lever gap, mechanic itself alive). **Data caveat**
- **Near-dead resource:** `gold` commodity moves in 4/288 runs. **Minor**
- **Dominant / trap options:** merchant/builder safe vs conquest/nomad/faith/expansionist traps (53–75% deficit seasons). **Major**
- **Thresholds trivial:** graft@12,000 skims 0.4% — not a sink. **Major**
- **Redundant/mislabeled econ readout:** sales bypass `econ.trade`. **Minor**

## Design-pattern lenses applied
- **Civ 6 — Snowball-inflection:** *Fires, badly.* No inflection *point*; the leader is 3.5x the field by yr10 and never surrendered the lead. Wealth has **no visible opportunity cost**. Verdict: snowball is structural, not situational.
- **EU4 — Sinks & overextension:** *Fires, hardest.* **No meaningful currency sink** (graft 0.4%) and **no overextension brake** on wealth — the expansionist "hits a wall" via *upkeep collapse*, not a designed brake, so the wall is a cliff. The domain's biggest gap.
- **Paradox — Tall-vs-wide:** *Fires.* Tall (builder 13.8k, 2% deficit) is viable/safe; wide (expansionist 3.8k, 53% deficit, collapses yr34) is a **trap, not a peer strategy**. Tall strictly dominates.
- **Civ/EU — Comeback-viability:** *Fires, split verdict.* Mechanically comebacks exist (56/234 early-dippers recovered >1000g), but once treasury hits ~0 it's **terminal 65% of the time**. Rubber-banding for the merely-behind; a cliff for the broke.
- **Total War — Upkeep (economy half):** *Fires.* Map income does **not** sustain the armies aggressive archetypes field — upkeep-as-share-of-economy untuned (conquest 53% / slaver 75% deficit seasons). War is a costed trap, not a costed choice.

Standing lenses foregrounded: **Feedback loops (6)**, **Legibility & feedback (4)**, **Balance & tuning (1)**, **Opportunity (12)**, **Comparative design (13)**.

## Key curves / tables from the CSV
**A. Death-spiral vs treasury floor**
```
runs hitting treasury<=1 : 220  -> collapsed 142 (65%)
runs never at treasury<=1 :  68  -> collapsed   4  (6%)
rows sitting at treasury=0: 14.9% of 18,718
```
**B. Snowball — merchant vs field mean treasury (no inflection)**
```
yr:      10     20     30     40     50     60     75    100
merchant 1261   2970   4743   7712  10200  13702  19551 30517
field     360    880   2115   3731   5163   6818   9552 14980
ratio    3.5x   3.4x   2.2x   2.1x   2.0x   2.0x   2.0x  2.0x
```
**C. Merchant kingdom-start snowball (treasury by yr)**
```
kingdom/19:  yr10 5830 · yr20 14920 · yr50 42523 · yr100 98822   (graft never bites meaningfully)
baseline/19: yr10  698 · yr20  3217 · yr50  9592 · yr100 28343
```
**D. Scenario survival & wealth (economy-trivializing kingdom)**
```
scenario    reachedYr100  meanFinalTreas  meanEndYr
kingdom       45/48          33,580          98.0
easy          23/48           2,424          60.7
baseline      21/48           2,761          61.0
hard          21/48           3,018          61.3
pangaea       20/48           2,502          61.1
archipelago   12/48           1,061          47.8   (+ engine-throw truncation)
```

## Opportunities
1. **Make surplus decay or demand-driven (the missing sink). [S–M]** Add a soft carry cost above a band — graft that scales properly (`0.03–0.05` above 8,000, not `0.004` above 12,000), or luxury upkeep (court/temples/army expect a spend). Caps the 150k hoards, forces reinvestment, makes the 12,000 threshold real.
2. **Surface (and soften) the empty-treasury authority spiral. [S]** Show the coupling in `economyPanel()` and replace the binary `treasury>30?+0.25:-1` cliff with a graded ramp. Converts 65%-terminal silent deaths into legible, recoverable pressure.
3. **Turn trade routes into the actual trade decision. [M]** Route harness + UI so `openRouteOrder` is a first-class lever, and log route income + sales into `econ.trade` correctly. Activates the already-built 8-factor `routeIncome` depth.
4. **Cost aggressive levers or reward them. [M]** Cut levy/camp upkeep or add a raid->loot income loop so conquest/nomad/slaver stop posting 53–75% deficit seasons. Makes wide/military peer strategies.
5. **Re-tune the kingdom start or make it a distinct difficulty. [S]** Kingdom trivializes the economy (45/48 survive, 33k). Scale its endowment down or label it easy-mode.

## Experiments to try next
1. **Halve levy/camp upkeep (or add raid-loot) and re-run:** does conquest/nomad net<0 share drop below 30% and collapses fall below 15/18? Tests tuning vs structural trap.
2. **Set graft to 3% above 8,000g and re-run merchant/spymaster:** does final treasury cap near 15–20k without pushing net negative?
3. **Force the harness to open 2–3 trade routes for merchant/thalassocrat:** does `routes` income become a meaningful share of `econ.trade`, and is `routeIncome` sanely scaled — or was the never-tested formula mis-tuned?

## Appendix
- **Seeds:** 7, 19, 42 (3 of the frozen 10).
- **Scenarios (OFAT):** baseline, archipelago (large/islands), pangaea (small/crowded), easy (2 AI), hard (5 AI), kingdom (kingdom-start).
- **Archetypes (16):** passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced, exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor.
- **Rows:** 18,718 year-rows / 288 runs. Truncation caveat: 32/48 archipelago, 22/48 hard, 14/48 baseline runs ended pre-yr100 with `over=0` (advanceSeason threw) — treated as data caveat and engine-robustness flag (section 9).
- **Game version:** index.html git SHA `62523dc0f0b808f4501acf35acf074d3f9acf36f`, script sha256/16 `4075d3270dbab183`.
- **Code hooks verified:** `routeIncome`/`processRoutes`/`openRouteOrder` (routes never opened by harness), `adminCost` (pop+tech+borough scaled), `TAXES` (5 tiers 0–8.5%), `doSellGoods` (sales -> treasury, bypass `econ.trade`), `goodPrice`/`GOODS_PRICE`, `complementaryGoods`, treasury authority rungs `>30/>400/>4000` and graft `>12000 *0.004`, `accounting` +2% interest.
