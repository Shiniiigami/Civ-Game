# Audit — Governance, Law, Authority & Succession (Cartridge 4.7)

**Game version:** index.html git `62523dc` · script sha256 `4075d3270dbab183`
**Data:** `audit_out/governance.csv` — 18,718 year-rows · 288 runs (16 archetypes × 6 scenarios × 3 seeds × ≤100y)
**Pass:** #1 (first governance audit — no prior report/ledger)
**Analyst lenses fired:** Legibility & feedback (2.4), Feedback loops / comeback (2.6), Meaningful choice (2.2), Balance (2.1) · **Pattern lenses:** CK3 story-generator, EU4 sinks & overextension, Civ/EU comeback-viability.

---

## Executive summary

Governance in Crown Waters runs on four exposed stats — **authority, unity, prestige** and a string **gov** type, plus **taxRate** and **lawChanges**. The audit finds one genuinely load-bearing system (authority, the kill-switch) wrapped in three decorative or dormant ones:

1. **Authority is the whole game and it is a SILENT spiral.** Collapse fires at `authority<=0`. The driver is a hard treasury coupling: treasury ≤30 gives **−1 authority/season**, and treasury <10 with heavy admin adds a further **−1.5/season**. That is −4 to −10/year, deterministic and monotonic. Yet **authority is the one core stat omitted from the seasonal report** (`S.seasonReport` carries pop/gold/tax/trade/upkeep/food/**unity** — no authority). The player watches a stat that stays healthy (unity averages **88** right up to the collapse year) while the stat that kills them slides to zero unseen. **Legibility verdict: the death-spiral is fair-but-silent** — deterministic and reversible in principle, but its causal signal (empty treasury leads to authority decay) is never surfaced.

2. **Comeback IS possible and observed** — 11 runs cratered to authority ≤15 and climbed back above 50 to survive 100y (e.g. `slaver|baseline|19`: bottoms at 10 in year 25, recovers to 100 by year 86). This is a real rubber-band, not pure snowball. But recovery requires the *treasury* to recover first; authority itself has no self-healing below 30, so runs that stay broke die on rails.

3. **Prestige is a fully dead stat.** Across 18,718 rows prestige **never once decreases** (grep-confirmed: all 7 write sites are `+`, zero readers gate anything). It is a write-only cosmetic counter with no sink, no threat, no effect.

4. **taxRate and lawChanges are inert in play.** taxRate never changes within any run (0/288); only 2 of the 5 defined tiers (`light`, `normal`) ever appear — `high`/`crushing`/`none` are never exercised. lawChanges is **0 for all 18,718 rows** — no run ever changes a law. Gov type *does* drift (70 transitions, always toward republic) but only 4 of 8 gov types are ever reached; empire/khanate/citystate/tribal are dead in the campaign.

---

## New this pass (first governance audit — all findings are net-new)

| id | sev | title |
|----|-----|-------|
| GOV-001 | **Critical** | Authority death-spiral is silent — authority absent from the seasonal report while unity (surfaced) stays healthy |
| GOV-002 | **Major** | Prestige is a dead stat — only ever increments, never read as a gate/effect |
| GOV-003 | **Major** | Only 4 of 8 government types are reachable; empire/khanate/citystate/tribal never appear for the player |
| GOV-004 | **Major** | Taxation is a false choice in practice — 2 of 5 tiers used, tax never changed mid-game, no authority/income tension exercised |
| GOV-005 | **Minor** | Chiefdom is a strictly-dominated gov type (no authority/unity bonus in the driver) that ~30% of realms start in |
| GOV-006 | **Minor** | Succession generates no drama in the sim — no heir/contested-succession event ever fired in 288 runs |
| GOV-H1 | *Harness* | lawChanges = 0 everywhere: the law-change mechanic works in code but the auto-player never calls it (not a game bug) |

---

## 1. Government types & drift

**Code (`GOV`, line 227):** 8 types — chiefdom, tribal, khanate, monarchy, republic, theocracy, citystate, empire. Player drift via `playerGovDrift()` (line 258); AI via `govEvolve()` (line 248).

**Data — gov type occurrence (row-count):**

| gov | rows | reached by |
|-----|------|-----------|
| republic | 8,966 | drift attractor (all non-faith archetypes) |
| monarchy | 5,020 | default start |
| chiefdom | 4,138 | ~30% starts |
| theocracy | 594 | **faith archetype only** (locked entire run) |
| empire / khanate / citystate / tribal | **0** | **never reached** |

**Drift is real** (refutes any "gov is frozen" hypothesis): 70 transition events — `chiefdom->republic` x41, `monarchy->republic` x29. Every drift path in the data terminates at **republic**. `empire` needs `lands>=6 || totpop>18000` and `khanate` needs the tribal/nomad branch — thresholds the auto-archetypes never hit, so half the government roster is content the player never sees.

- **GOV-003 (Major):** 4 of 8 gov types are dead in a 288-run campaign. Empire (the +0.25 authority payoff) and khanate are unreachable at current thresholds for these play styles; citystate/tribal likewise. The identity ceiling of governance is invisible.
- **GOV-005 (Minor):** `chiefdom` appears in **no** term of the authority or unity driver (monarchy +0.15, empire +0.25, khanate +0.1, republic/citystate/theocracy give unity) — it is strictly dominated, yet ~30% of realms start there and sit in it until drift rescues them. A starting government should not be a pure penalty.

## 2. Law codes & effects

**Code:** `S.laws{succession,slavery,military,faith,local}`, changed via `setSuccessionLaw`/`setPlayerGov`/`openLawCode`, gated by `lawCap()=2+(law tech)+(bureaucracy)` (2–4/yr), counter `S.lawChanges` reset each year. Laws *do* have effects (`S.laws.local` scales `adminCost` +/-15%; `S.laws.faith` scales revolt risk x0.35–1.6 in `checkRevolts`).

**Data:** `lawChanges == 0` for **all 18,718 rows**. No run ever changes any law.

- **GOV-H1 (Harness artifact, not a game bug):** the mechanic is sound — `setSuccessionLaw` increments the counter, respects `lawCap`, applies `-2` authority, resets yearly. The auto-player policies simply never invoke the law levers, so the column reads dead. **Real game implication:** for any non-micromanaging player, `S.laws` is set-and-forget — a whole systems layer (succession law, local centralization, faith orthodoxy) sits untouched, its costed tradeoffs never engaged. Worth surfacing as a recurring decision (see Opportunities).

## 3. Authority / unity / prestige economy — the core finding

### 3a. The treasury-to-authority coupling (verified in `advanceSeason`, line 1169)

```
S.authority += (treasury>30 ? +0.25 : -1)          // the spiral hinge
             + (treasury>400 ? +0.2 : 0) + (treasury>4000 ? +0.3 : 0)
             + wonders(<=0.4) + owned(<=0.3) + bureaucracy(0.15)
             + monarchy 0.15 / empire 0.25 / khanate 0.1
             + succ(hereditary +0.12 / elective -0.08) + edicts.order + ...
S.authority += (treasury<10 && admin>20 ? -1.5 : 0)   // second spiral term
```

A solvent realm (treasury>30) *gains* ~+0.5–1.0/season and clamps up toward 100 — this is why survivors sit at 90+. A broke realm *loses* -1 to -2.5/season with **no self-recovery term**. Authority cannot heal itself; only the treasury can pull it out. This is the death-spiral, and it is legitimate negative-feedback design — the flaw is not the math, it's the **feedback**.

### 3b. Authority-into-collapse curve (47 authority-death runs, aligned on collapse year T)

| offset | avg authority | avg unity | n |
|--------|--------------|-----------|---|
| T-6 | 19.9 | 87.4 | 47 |
| T-5 | 17.1 | 88.0 | 47 |
| T-4 | 14.7 | 88.1 | 47 |
| T-3 | 11.7 | 88.2 | 47 |
| T-2 | 8.6 | 88.5 | 47 |
| T-1 | 5.5 | 88.2 | 47 |
| **T** | **0.0** | **85.3** | 47 |

**This table is the finding.** Authority slides a smooth ~-3/yr (median slope -3.06, range -1.1 to -6.8) for six-plus years into the grave, while **unity — the stat the season report *does* show — sits at a healthy 88 the entire way down.** The player's dashboard says "the realm is united and content" right up to the turn the crown falls. Sample tail (`conquest|baseline|42`): 30, 26, 23, 20, 17, 14, 11, 7, 4, 0 — one clean line.

- **GOV-001 (Critical):** The kill-switch stat (authority) is the single core stat **absent from `S.seasonReport`** (which reports pop, gold, tax, trade, upkeep, food, unity). The one number that ends the game is the one number the seasonal feedback omits, and the number it *does* show (unity) stays green while authority dies. The spiral is deterministic and telegraphable but **not telegraphed**. There is a partial backstop — `checkRevolts` logs "civil war under a powerless crown" at authority<16 — but that is buried in the chronicle, fires probabilistically (6%), and does not name the treasury cause.

### 3c. Prestige — dead stat (GOV-002, Major)

- Prestige **never decreases** in any of 288 runs (0 runs where it fell; 254/288 = 88% stayed flat the entire game). 83% of all rows sit at exactly the floor value 10.
- Grep-confirmed in code: all 7 `S.prestige` writes are `+` (golden-age +8, wonders +0.6, ceding land +1, research trickle +0.02...); **no site ever subtracts it, and no site reads it as a gate, threshold, score, or modifier.** It gates nothing, threatens nothing, sinks nowhere.
- It creeps 10 to ~18 avg by y100 (max ever 49.7). Pure write-only accumulator. Per the EU4 sink lens: **a currency with no sink and no consequence.** Either give it teeth (a demand, a prestige-driven succession/claim mechanic) or cut it.

### 3d. Unity — mild rising stat, no collapse role

Unity climbs 76.7 (y1) to 95.8 (y100), min rarely below 60. It never causes game-over (only authority/no-settlements does) and, as 3b shows, is decoupled from the actual failure mode. It carries the tax tradeoff (see section 5) but in practice barely moves.

## 4. Edicts

`EDICTS` (order/devotion/prosperity/...) are **golden-age only** — `enactEdict` hard-requires `allTechDone()` plus banked research-pool points (cost `150+120*rank`). The authority driver's `edicts.order` term therefore almost never fires in these runs (few reach a full tech tree). Edicts are a genuine late-game authority/unity sink but are gated behind the entire tech tree — irrelevant to the collapse window (deaths cluster y10–50). Not a bug; a note that the one real authority *lever* the player has arrives long after most crises.

## 5. Taxation x unity/authority (GOV-004, Major)

**Code (`TAXES`, line 308):** 5 tiers — none(+0.3 unity), light(+0.12), normal(0), high(-0.35), crushing(-0.9, and -0.25 authority). A real designed tradeoff: more coin vs. unity/authority.

**Data:**
- Only **`light` (28%) and `normal` (72%)** ever appear. `none`/`high`/`crushing` never used.
- **taxRate never changes within any run (0/288).** Each archetype is hard-locked to one tier for 100 years (faith/nomad/isolationist/expansionist/diplomat/survivor = light; the rest = normal).
- The interesting, tension-bearing tiers (high/crushing = the "squeeze the realm for coin at unity/authority cost" decision) are **never exercised**, so taxation's core tradeoff is untested in the campaign and, for a set-and-forget player, a false choice.

Part harness artifact (policies pick a tier once), but the design implication stands: taxation is presented as a lever and behaves as a constant.

## 6. Succession & dynasty (GOV-006, Minor) — CK3 story-generator lens

**Code:** `agingAndSuccession`, `openSuccession(old,contested)` (line 1153) shows a modal — a *contested* succession explicitly "shakes authority and unity"; `SUCCESSION` has 5 laws; `isElective()` flips the authority succ-term from +0.12 to **-0.08**. The bones of succession drama exist.

**Verdict:** in 288 runs the harness auto-clears ruler events, so **no succession or contested-heir event surfaced in the data** — the CK3 story-generator test comes back **empty for the sim**. This is partly harness (events no-op'd), but the underlying design is thin: succession's only mechanical footprint is a small constant authority drift (elective -0.08 vs hereditary +0.12) and a one-time shake on a contested crown. No heir-quality stakes, no factional pushback, no rivalry — ruling is administrative, not political. Succession is a chore, not a story.

## 7. Revolts

`checkRevolts` (line 1063) is the one place governance stats bite back well: `unrest` rises with low unity (`(55-unity)/85`), low authority (`(35-authority)/150`), slave ratio (`x0.32`), rival faith, and **broke treasury (`treasury<=2` gives +0.09)**; plus a realm-fracture roll at `authority<16`. This is the healthy negative-feedback layer — but it triggers events, not a visible authority readout, so it informs the *chronicle* rather than the *dashboard*.

## 8–11. UI/UX · Balance · Bugs · Archetype comparison

**Collapse by archetype (all 288 runs; "authDeath" = ended with authority<=0):**

| archetype | runs | collapsed | %col | authDeath |
|-----------|------|-----------|------|-----------|
| faith | 18 | 16 | 89% | 3 |
| conquest / nomad / isolationist / expansionist | 18 | 15 | 83% | 3–8 |
| exploit-hunter | 18 | 11 | 61% | 4 |
| balanced | 18 | 9 | 50% | 2 |
| passive / spymaster | 18 | 8 | 44% | 3–4 |
| diplomat / thalassocrat / survivor | 18 | 6 | 33% | 0–3 |
| builder / techlord | 18 | 5 | 28% | 1–2 |
| slaver | 18 | 4 | 22% | 1 |
| merchant | 18 | 2 | 11% | **0** |

**Collapse by scenario:** kingdom **6%** (authDeath 1) vs baseline 56%, archipelago 75%, pangaea 58%, hard 56%, easy 52%. Kingdom's near-immunity confirms the collapse is an early-treasury problem, not a difficulty-curve one.

**Caveat (harness):** of 146 early endings, only **47 are authority-death**; **99 end with authority>0** — these are `advanceSeason`-throw / no-settlement endings (heavy in archipelago), not governance collapses. So the *governance* death-spiral is the cause in ~1/3 of early endings; the rest are other systems. Authority-death is concentrated in **pangaea (14) and baseline (13)**.

---

## Comeback-viability (Civ/EU lens) — verdict: **rubber-band exists, but only through the treasury**

- **Genuine comebacks observed: 11 runs** cratered to authority <=15 mid-game and recovered above 50 to survive 100y. Example `slaver|baseline|19`: 64 to (y25) 10 to (y86) 100, ends 87. Clean U-shaped recovery.
- Broader: 162 runs dipped <20; 17 recovered >40 & survived. 137 dipped <10; 9 recovered.
- **But the 47 authority-death runs never reverse** — once treasury is empty *and* stays empty, the -1 to -2.5/season term with no self-heal makes it terminal on rails (see 3b curve).
- **Verdict:** Not a pure snowball — recovery is real and reproducible. The rubber-band lives entirely in the economy, though: authority follows the treasury and has no independent floor or catch-up. A player who fixes income recovers; a player who can't read *why* authority is falling (GOV-001) can't know that fixing income is the lever.

---

## Problem-taxonomy flags

- **Silent death-spiral / hidden math** — GOV-001 (authority off the dashboard; treasury cause never named).
- **Stat that only rises, no threat** — GOV-002 prestige; GOV-adjacent unity.
- **Dead content** — GOV-003 (4 unreachable gov types); prestige (dead currency); high/crushing/none tax tiers (unused).
- **False choice** — GOV-004 (tax as constant); GOV-005 (chiefdom strictly dominated).
- **No drama** — GOV-006 (succession is admin, not story).
- **Harness artifact (flag, don't fix as game bug)** — lawChanges=0; taxRate/gov single-value-per-archetype; no ruler events (auto-cleared).

---

## Opportunities

1. **Surface authority in the seasonal report + name its cause (fixes GOV-001).** Add `authority` (with delta) to `S.seasonReport` beside unity, and when the treasury<=30 term fires, emit "The treasury is empty — the crown's authority is bleeding (-N/season)." *Effect:* converts a silent terminal spiral into a legible, actionable one. *Effort:* S.
2. **Give authority a comeback lever independent of raw treasury.** A costed decree usable *below* an authority threshold that trades gold/unity for an authority floor. *Effect:* comebacks become a governance decision, not only economic. *Effort:* M.
3. **Make prestige a real currency (fixes GOV-002).** Spend it: press claims, legitimize a contested heir, unlock a gov reform; add drain events. *Effort:* M.
4. **Lower empire/citystate drift thresholds or add a player reform path (fixes GOV-003/005).** Let realms reach empire/khanate; give chiefdom a small kin-unity bonus. *Effort:* S–M.
5. **Turn one succession per reign into a real event with stakes (fixes GOV-006).** Heir quality, a claimant, an authority/unity swing tied to succession-law choice. *Effort:* M.

## Experiments to try next pass

1. **Legibility A/B:** add authority-delta to the report and re-run baseline+pangaea — does authority-death share of early endings drop toward kingdom's near-zero?
2. **Tax lever exercise:** make an archetype raise tax to `high` when treasury<30 — does income arrest the spiral or does -0.35 unity make it worse?
3. **Empire reachability:** drop player empire threshold (`lands>=6` to `>=4`) and re-run builder/expansionist — does empire appear, and does +0.25 authority cut their collapse rates?

---

## Appendix

- **Seeds:** 7, 19, 42 (3 of the frozen 10). **Scenarios:** baseline, archipelago, pangaea, easy, hard, kingdom.
- **Archetypes (16):** passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced, exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor.
- **Rows:** 18,718 year-rows / 288 runs. Columns: gov, authority, unity, prestige, lawChanges, taxRate (gov/taxRate strings; authority/unity/prestige numeric).
- **Version:** index.html git `62523dc0`, script sha256_16 `4075d3270dbab183`, generated 2026-07-13T03:42Z, runtime 6,825s.
- **Key code refs:** authority driver `advanceSeason` line 1169; `TAXES` L308; `GOV` L227; `govEvolve` L248 / `playerGovDrift` L258; `checkRevolts` L1063; `setSuccessionLaw`/`setPlayerGov` L~1150; `lawCap` L782; `adminCost` L619; `EDICTS`/`enactEdict` L839–841; `openSuccession` L1153.
- **Method:** analysis-only over the frozen CSV (no re-run); mechanics cross-checked by grep against index.html.
