# Audit — War, Military & Recruitment (Cartridge 4.3)

**Game version:** `index.html` git SHA `62523dc0f0b808f4501acf35acf074d3f9acf36f` · script sha256/16 `4075d3270dbab183`
**Data:** `audit_out/war.csv` (18,718 year-rows) joined to `economy.csv`, `master.json`, `RUN_META.json`
**Run matrix:** 16 archetypes × 6 scenarios × 3 seeds (7,19,42) × 100 years = 288 runs
**Pass:** FIRST war audit (no prior `report_war.md`; no `LEDGER.md`). All findings are net-new.

---

## Executive summary

War in Crown Waters is a **costed trap that almost no one pays into, and when they do the campaign economy cannot sustain it.**

1. **The upkeep trap is real and quantified.** For the four militarist archetypes, army upkeep runs **80–109 % of total income** (conquest 80 %, nomad 90 %, exploit-hunter 99 %, slaver 109 %), and 49–75 % of their seasons are net-negative. Conquest collapses in **13/18 runs** (mean end-year 39). It survives to year 100 only on **pangaea** (crowded, dense targets) and **kingdom** (rich start).

2. **The whole war layer is nearly inert.** `warsActive` is non-zero in **104 of 18,718 rows (0.56 %)** across just **3 runs, all conquest**; `sieges` in **11 rows (0.06 %)**, all conquest, mostly seed 7. The **phased-siege subsystem — the centerpiece of the target design — fires in 11 seasons of a 288-run campaign.** Captives come almost entirely from `armyRaid` (hit-and-run), which registers neither war nor siege.

3. **The advanceSeason "exception" is a HARNESS ARTIFACT, not a game bug.** The caveat that ~99 runs "end before year 100 with `over=0`" is a **snapshot-timing lag**: 103/146 collapses show `over=0` on their last CSV row because authority hits 0 **mid-year, exactly 1 year after** the last annual snapshot (measured gap = 1.00, min=max=1). There are **0 true harness exceptions**. A live instrumented diagnostic captured **zero** thrown exceptions. See §5.

The combat *engine* is better than the data makes it look: `ck3Battle` is a genuine 3-phase resolver with per-phase rolls, general martial, ranged edge, terrain fit and a full 8-tier rock-paper-scissors roster. But the phases **auto-resolve in one call with randomly-picked tactics** (`pick(r,TAC)`) — the target design's "agency per phase" is theatre decided at commit.

---

## New this pass

All findings are new (first war pass). Highest-value item: the **de-escalation of the advanceSeason caveat from "engine bug" to "harness snapshot artifact"** (WAR-EXC, §5), followed by the quantified upkeep trap (WAR-001) and the near-dead war/siege layer (WAR-002/003).

---

## Lenses fired (Section 2 + 2.5)

| Lens | Verdict |
|---|---|
| **Total War — Upkeep & battle-agency** (2.5) | **FAIL on upkeep handshake.** Upkeep = 80–109 % of income for militarists; map income only sustains the army on crowded maps. Battle agency: phases don't accept player input. |
| **EU3/CK3 — Phased-battle** (2.5) | **PARTIAL.** Engine *has* 3 named phases + rolls + modifiers + phased sieges, but resolves all phases in one `ck3Battle` call with random tactics; no per-phase decision. Sieges technically phased but fire in 11 seasons total. |
| **Balance & tuning** (2.1) | Fail: levy is a no-brainer trap; higher-tier roster never exercised in data. |
| **Meaningful choice** (2.2) | Fail: only lever the militarist policies pull is `doRaiseLevy`; recruit/merc/elite/formArmy invisible in the columns. |
| **Legibility & feedback** (2.4) | The `over=0`-at-collapse logging lag is *our own* legibility trap. In-game: authority death-spiral from empty treasury (§5) is the real kill switch. |
| **Feedback loops** (2.6) | Negative spiral: troops snowball (conquest 150→8045) while conquests plateau at 2 and captures plateau ~24–61. |
| **Emergent behavior** (2.8) | Degenerate: militarism routes through `armyRaid` (loot+captives, no siege/war state), skipping the siege/war system. |
| **Comeback-viability** (2.5) | Fail for war: no militarist run that collapses before yr 40 recovers; collapse is terminal. |

---

## 1. Unit roster & recruitment (Sections 1–2, 6)

8-tier roster (`UNIT`, index.html:286) with cost/power, matchups, terrain fit, tech gates:

| unit | cost | power | gate | niche |
|---|---|---|---|---|
| peasants | 0.6 | 0.52 | — | levy fodder |
| levy (spears) | 4 | 1.0 | — | anti-cavalry |
| archers | 9 | 1.35 | — | anti-heavy/spears |
| nomad_rider | 9 | 1.2 | horsemanship | steppe/desert |
| cavalry | 15 | 1.65 | horsemanship | anti-archer/levy |
| heavy inf | 12 | 1.7 | metallurgy | mountains/forest |
| horse_archers | 20 | 1.9 | composite | anti-heavy |
| guards (heavy cav) | 28 | 2.5 | stirrups | continental open |

**Finding:** the roster is well-designed but **the campaign never fields it.** `armies`/`warArmies` cap at **2** across all 288 runs, and the militarist policies pull only `doRaiseLevy` → peasants/levy. `war.csv` logs no unit composition, so tiers 3–8 are invisible (WAR-005). `levyUnitCost` (index.html:873) scales with `S.laws.military` (levy ×0.7 / standing ×1.25), a lever the harness never toggles.

## 2. Supply & upkeep — the trap (Section 3)

Means over all seasons (economy.csv upkeep joined to war.csv troops):

| archetype | mean upkeep | mean income | **upkeep / income** | seasons net<0 | mean troops |
|---|---|---|---|---|---|
| conquest | 135 | 170 | **80 %** | 53 % | 1,918 |
| exploit-hunter | 191 | 193 | **99 %** | 49 % | 2,349 |
| nomad | 134 | 149 | **90 %** | 57 % | 1,257 |
| slaver | 135 | 124 | **109 %** | 75 % | 1,730 |
| balanced | 141 | 217 | 65 % | 27 % | 703 |
| merchant | 206 | 398 | 52 % | 2 % | 86 |
| builder | 128 | 346 | 37 % | 2 % | 70 |

Whole-run ledgers:
- `conquest/baseline/7`: 38 yrs, **cum upkeep 2,709 > income 2,483**, 3 conquests, 69 captives → **collapses yr 38**.
- `conquest/pangaea/7`: 100 yrs, income **19,402 > upkeep 12,140**, 4 conquests, 131 captives → **survives**.
- `exploit-hunter/baseline/42`: 99 yrs, upkeep 10,125 > income 7,783 → near-zero treasury.

`processDesertion` (index.html:1031) sheds troops only when `treasury <= upkeep*0.8` — after the spiral has begun.

## 3. Combat resolution (Section 4) — phased-battle lens

`ck3Battle(ap,dp,r,ctx)` (index.html:1606) is a real **3-phase** resolver: Phase 1 skirmish/missile (ranged bonus applies only here), Phase 2 melee, Phase 3 pursuit (momentum ×1.25 leader / ×0.85 loser). Each phase rolls `power*(0.7+r()*0.6)*generalMartial*rangedEdge`. Losses scale with margin (winner 5–42 %, loser 18–85 %) — a fair strength+roll blend, not a coin-flip. Terrain via `terrainFit`, walls/fortress via defender multiplier, general via `commanderFalls`.

**Gap to target:** the three phases execute inside one function call; tactics are `pick(r,TAC)` (RNG, not chosen); no per-phase decision. Sieges (`beginOrAdvanceSiege` :1726, `siegeAct` :1730) *are* genuinely phased across seasons (invest → starvation via `siegeHoldOut` → assault via `armyBattle`, or sue-for-terms roll) with walls/garrison/food/port modifiers — but almost never reached (§4).

## 4. Dead & near-dead columns (Section 9)

| column | non-zero rows | max | reality |
|---|---|---|---|
| `warsActive` | 104 / 18,718 (0.56 %) | 2 | near-dead — 3 runs, all conquest (baseline/7, archipelago/19, pangaea/7). |
| `sieges` | 11 / 18,718 (0.06 %) | 1 | near-dead — all conquest, 8/11 seed 7. |
| `armies`/`warArmies` | 4,013 / 4,004 | **2** | never fields >2 armies. |
| `conquestsCum` | 209 (1.1 %) | 4 | alive, rare; conquest reaches mean 2 by yr 40 then flat. |
| `capturedCum` | 4,433 (23.7 %) | 286 | alive — sourced from `armyRaid`, not siege/conquest. |

Militarism happens via `armyRaid` (loot + `t.free*0.04` captives, :1732), which sets no siege and no war flag — so "real war" columns die while `capturedCum` lives.

## 5. The advanceSeason "exception" — RESOLVED as harness artifact

**Verdict: the "over=0 early end" is a snapshot-timing artifact, not an engine bug.**
- 288 runs: **142 survive to yr100, 146 collapse (`S.over=true`), 0 end via exception.** Every sub-100 run is in `RUN_META.collapses`.
- **103/146 collapses show `over=0` on their last CSV row** because `advanceSeason` sets `S.over` on `authority<=0` mid-year, but `snapWide` only logs at the year boundary. `RUN_META.endedYear − last-CSV-year = 1.00` for all 103 (min=max=1).
- **Live diagnostic:** instrumented the swallowing `try{ advanceSeason(); }catch(e){ break; }` (civgame_harness.js:450) to record `e.stack`; ran passive/conquest/faith · baseline · seed 7 with real policy → **0 exceptions.**

Real kill switch: authority death-spiral (empty treasury → `authority += -1`, plus `-1.5` when `treasury<10 && admin>20`, advanceSeason:1169). Archipelago's 36/48 collapses are island-economy difficulty, not war/naval code. **Harness fix (not a game fix):** emit a final over-row in `snapWide` when `S.over` flips mid-year.

## 6. Archetype comparison (Section 10)

| archetype | mean end yr | troops final | troops max | conquests | captives final | max captives | sieges | wars |
|---|---|---|---|---|---|---|---|---|
| conquest | 39 | 1,518 | 10,965 | 0.72 | 37.2 | 131 | yes(11) | yes(3) |
| exploit-hunter | 80 | 3,318 | 11,234 | 0 | 51.1 | **286** | no | no |
| slaver | 91 | 2,844 | 10,326 | 0 | 29.8 | — | no | no |
| nomad | 38 | 911 | 7,716 | 0 | 28.4 | — | no | no |
| balanced | 65 | 878 | 2,460 | 0 | 0 | — | no | no |
| (all others) | 33–93 | ≤130 | ≤817 | 0 | 0 | — | no | no |

Only **conquest** ever sieges or declares war. **exploit-hunter** nets the most captives (286) purely through repeated raids while never conquering.

---

## Findings

### Critical
- **WAR-001 — Militarism is a costed trap: upkeep 80–109 % of income.** 49–75 % of militarist seasons net-negative; conquest collapses 13/18 (mean yr 39), survives only on pangaea/kingdom. *Evidence:* §2 table; `conquest/baseline/7` cum upkeep 2,709 > income 2,483.

### Major
- **WAR-002 — The phased war/siege layer is inert.** `warsActive` 104/18,718 (3 runs); `sieges` 11/18,718 (all conquest). Siege subsystem — the target-design centerpiece — exercised in 11 seasons of 288 runs.
- **WAR-003 — Raid loop bypasses war/siege/conquest.** `armyRaid` delivers loot + captives (max 286) with no war/siege/conquest, so the roster and phased combat never gate the reward. exploit-hunter conquests=0, captives max 286. index.html:1732.
- **WAR-004 — Battle phases carry no agency.** `ck3Battle` resolves 3 phases in one call, `pick(r,TAC)` random tactics, no decision point; outcome decided at commit. index.html:1606–1610.

### Minor
- **WAR-005 — `war.csv` cannot see the roster.** No unit-tier columns; `armies` caps at 2. Log `armyComp`/tier counts + merc/elite headcount.
- **WAR-006 — `processDesertion` fires too late.** Triggers at treasury <= upkeep×0.8, after the spiral starts (index.html:1031); net<0 already 53–75 % for militarists.

### Polish / Harness
- **WAR-EXC (Harness, not game) — collapse logged as `over=0`.** 103/146 collapses show `over=0` on the final row from a 1-year snapshot lag; there are 0 real advanceSeason exceptions. Emit a final over-row in `snapWide`. *Evidence:* endedYear−lastCSVyr = 1.00 (min=max=1); live diagnostic 0 exceptions.

---

## Problem-taxonomy flags (cartridge 4.3)
- Upkeep too high / unsustainable: **YES** (WAR-001).
- Dead mechanic: **YES** — `warsActive`, `sieges` near-zero; phased siege untested (WAR-002).
- Dominant / free-win path: **YES (degenerate)** — `armyRaid` bypasses the combat gates (WAR-003).
- Supply lines that never bite: **LIKELY** — `updateArmySupply`/`supplyLine` exist (:1510/:1520) but ≤2 armies rarely march far; not visible in the columns.
- Retinue/elite mandatory or useless: elite/`applyElite` path unused — untested.
- Siege/battle auto-win or unwinnable: battle math fair (margin-scaled losses); sieges auto-progress with no player agency (WAR-004).

---

## Key curves

Mean **troops** vs mean **conquests**/**captures** (militarists), years 1→100 — the snowball-vs-flatline that visualizes the trap:

```
              yr:  1    5   10   15   20   30   40   60  100
conquest troops:  150  171  236  356  476 1636 3329 4858 8045
conquest conq. :   0    0    0    0    0    1    2    2    2   (flat after yr40)
conquest capt. :   7   22   23   28   28   28   37   61   61   (plateau)
exploit troops :  209  561  873 1195 1463 1938 2334 2738 5254
exploit capt.  :  11   28   29   30   30   31   36   48   66   (plateau; max 286)
```
Troops climb 50×+; military output (conquests, captures) plateaus early. Every extra soldier is pure upkeep.

Collapses per scenario (of 48): baseline 27 · archipelago **36** · pangaea 28 · easy 25 · hard 27 · kingdom **3**. Hard (5 AI) does **not** raise war activity — `warsActive`/`sieges` stay ~0 there; the extra AIs just crowd the economy.

---

## Opportunities

1. **Close the raid→loot→upkeep loop (WAR-001/003).** *Mechanic:* raid/siege payouts scale with target wealth AND army size, and conquest grants a lasting income stream (tribute or garrison tax) plus a "plunder momentum" war chest so a winning war funds the next. *Effect:* conquest viable on continents, militarist upkeep share below ~60 %. *Effort:* M.
2. **Give battles real per-phase agency (WAR-004, phased-battle target).** *Mechanic:* pause `ck3Battle` between phases and surface a real decision each (commit reserves / hold the line / press pursuit / feign retreat) where the *tactic* is chosen (currently `pick(r,TAC)`), with the running strength+morale tally shown; make phase-3 momentum a player lever. *Effect:* delivers the EU3/CK3 target; battles become skill. *Effort:* M (engine hooks exist; needs decision plumbing + the `ui` pass for the modal).
3. **Route militarism through the siege system (WAR-002).** *Mechanic:* gate the fat loot behind an actual siege (invest→starve→assault); make `armyRaid` the small-loot skirmish. *Effect:* revives a whole dead subsystem; `sieges`/`warsActive` become live signals. *Effort:* S–M.
4. **Force roster diversity (WAR-005 / dead units).** *Mechanic:* strengthen unit-vs-unit and terrain multipliers so a pure peasant/levy stack loses to combined arms; make higher tiers worth their upkeep. *Effect:* the 8-tier roster becomes a real composition decision. *Effort:* S (tuning) + logging.
5. **Tie standing-army law to a payoff (WAR-006).** *Mechanic:* `standing` (×1.25 upkeep) buys lower desertion + faster training + a retinue cap; `levy` (×0.7) carries a readiness penalty. *Effect:* the military law becomes a live tradeoff. *Effort:* S.

---

## Experiments to try next

1. **Halve levy/peasant upkeep (or +30 % raid plunder):** re-run conquest on baseline — does upkeep-share drop under 60 % and does conquest stop collapsing before yr 40? (Tests WAR-001.)
2. **Make `armyRaid` require an adjacent siege for big loot:** do `sieges`/`warsActive` rise from ~0, and does exploit-hunter's captive count fall toward conquest's? (Tests WAR-002/003.)
3. **Instrument the policy to use `placeRecruitOrder`/`applyElite`/`formArmy` + log composition:** does any single tier dominate fielded power? (Runs the dominant-stack check WAR-005 can't currently do.)

---

## Appendix

- **Seeds:** 7, 19, 42 (frozen; first 3 of the 10-seed set).
- **Scenarios:** baseline (medium/continents/balanced/3AI), archipelago (large/archipelago/sparse), pangaea (small/pangaea/crowded), easy (2AI/easy), hard (5AI/hard), kingdom (advanced start). Overrides in `civgame_harness.js` `SCEN`.
- **Archetypes (16):** passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced, exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor. Militarists analyzed: conquest, exploit-hunter, nomad, slaver.
- **war.csv columns:** troops, armies, warArmies, sieges, conquestsCum, warsActive, capturedCum (keys archetype,scenario,seed,year).
- **Version:** git SHA `62523dc0f0b808f4501acf35acf074d3f9acf36f`, script sha256/16 `4075d3270dbab183`, full run 6,825 s, 288 runs / 18,718 rows.
- **Diagnostic:** instrumented copy of `civgame_harness.js` (catch at :450 patched to record `e.stack`), passive/conquest/faith · baseline · seed 7 → **0 exceptions**. Confirms the `over=0` early-end is a snapshot artifact, not an engine throw.
- **Engine references verified:** `levyUnitCost` :873, `processDesertion` :1031, `updateArmySupply` :1510, `supplyLine` :1520, `navalBattle` :1564, `ck3Battle` :1606, `conquer` :1694, `conquestChoose` :1697, `beginOrAdvanceSiege` :1726, `siegeAct` :1730, `armyRaid` :1732, `armyBattle` :1733, `armyVsArmy` :1751, `armyPower` :920, `advanceSeason` :1169.
