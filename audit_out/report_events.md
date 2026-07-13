# Audit — Events & Random Systems (Cartridge 4.11)

**Game:** Crown Waters · **Data:** `audit_out/events.csv` (18,718 year-rows, 288 runs) ·
**Campaign code (RUN_META):** git `62523dc` / script sha256 `4075d3270dbab183` ·
**Audit date:** 2026-07-13 · **First pass (no prior report/ledger).**

---

## Executive summary

**The headline premise is FALSE — and that is the most important finding.** The task brief said that
~101 runs (32/48 archipelago, 22/48 hard, 14/48 baseline) "end BEFORE yr100 with over=0" because
`advanceSeason()` *threw an unhandled exception* and the harness loop broke. **It did not.** Across all
288 runs (~86,000 `advanceSeason` calls) there are **zero unhandled exceptions.** Every run ends in
exactly one of two states: it reached year 100 (**142 runs**), or the crown genuinely collapsed with
`S.over=true` (**146 runs**). The "over=0 early-ends" are **mid-year authority collapses** that the
harness's `events.csv` **cannot represent**, because the `over` column is only written on a year
boundary (Winter→Spring) and collapse usually strikes mid-year.

Proof (exact, no rounding): CSV rows with `over=1` = **43**; CSV runs ending `over=0` before year 100 =
**103**; **43 + 103 = 146 = RUN_META's true collapse count.** All 103 "over=0 early-ends" are present in
RUN_META's `collapses` list (S.over=true). Runs that are *neither* collapse *nor* full-100 — i.e. genuine
throws — number **0**.

Two independent confirmations:
1. A passive re-run of archipelago seeds 7/19/42 under the exact try/catch the harness uses: seed 7
   collapses at yr26, seed 19 at yr33, seed 42 survives to 100 — **all clean, catch never fires.**
2. An **instrumented real-harness run** (the full `playSeason` policy for faith/expansionist/
   isolationist/conquest/nomad — the archetypes that provoke army/faith/settler/naval activity — on
   archipelago × seeds 7/19/42): **0 unhandled exceptions across 15 runs.** 15 collapses (all `S.over=true`),
   of which **13 are mid-year** (would show `over=0` in the CSV) and **2 land on a year boundary**
   (`over=1`). Every collapse year matches RUN_META exactly (faith/s7 @18, expansionist/s19 @22, …).

So the events domain surfaces **two real issues instead of a crash:**
1. **A data-legibility defect** (the `over` column silently loses 103/146 collapses) — this is what made
   the engine *look* like it crashes. Engine robustness is actually **excellent**.
2. **The event *content* is thin on agency:** the frequent events (`randomEvents`/`naturalEvents`) are
   pure silent stat-noise with **no player choice**, while the only choice-bearing events
   (`RULER_EVENTS`, 6 templates) fire ~0.4×/year and are invisible to this harness (auto-nulled). Events
   also fail the comeback test — disasters target the player regardless of how weak the realm already is.

Separately, the world **churns and proliferates rather than consolidates**: ruins climb 27→149 and
`factionsAlive` *rises* 3.7→28.8 over 100 years (nomad/hamlet spawns outpace consolidation), and player
`conquestsYear ≈ 0` throughout — nobody is painting the map.

---

## New this pass (first pass — everything is new)

- **[EVT-001 · Critical/analysis]** The "advanceSeason crash" does not exist. 0 throws / 288 runs. The
  103 apparent early-ends are mid-year collapses; `over` is only logged on year boundaries.
- **[EVT-002 · Major]** Frequent random/natural events carry **zero player agency** — ~40% chance per
  season of a one-off stat nudge, all auto-applied, no dialog.
- **[EVT-003 · Major]** Events fail the **comeback-viability** test: disasters (plague/drought/flood/
  bandits/earthquake) hit the player's own settlements irrespective of realm health; no rubber-banding.
- **[EVT-004 · Minor]** Only **6 ruler-event templates**, fired ~0.4×/yr → heavy repetition; and they are
  **invisible to this sim** (harness stubs `showRulerEvent`), so their balance is unverified here.
- **[EVT-005 · Minor]** World **proliferates**: `factionsAlive` 3.7→28.8, ruins 27→149; late-world is a
  noisy graveyard, not a consolidated few empires.
- **[EVT-006 · Polish]** Dead achievements: `yr200`/`yr300` (game is 100 yrs), likely `pop250k`.

---

## Lenses applied

**Standing (Section 2):**
- **Legibility & feedback (4)** — *fired hard.* The `over` column loses 103/146 collapses; the frequent
  events apply silently. Verdict: **major legibility gap in the data pipeline**, modest in-game.
- **Feedback loops / comeback (6)** — *fired.* Events do not rubber-band; disasters compound a losing
  position. Verdict: **no comeback support in the event layer.**
- **Emergent behavior (8)** — *fired.* Nomad hordes + hamlets + raids + rebellions interact into a living,
  churning backdrop (good emergence), but delivered as log lines with no player hook. Verdict: **rich
  substrate, under-exploited.**
- **Balance & swinginess (1)** — *checked.* One-off event magnitudes are individually modest
  (gold ±15–80, unity ±2, plague sev 30–70). Verdict: **not swingy; if anything too weak to matter.**
- **Performance & code health (11)** — *checked.* No throws in 86k calls; `RULER_EVENTS.cond()` is
  try/guarded. Verdict: **robust.**

**Design-pattern (Section 2.5):**
- **CK3 — Story-generator test:** *Partial.* The 6 ruler events are genuine mini-dramas with real
  tradeoffs (imprison/buy/pardon a plotting kinsman, etc.); the ~160 one-off random events per full game
  are stat noise, not stories. Verdict: **story potential present, mostly unused.**
- **RimWorld/DF — Emergent-anecdote test (lesser weight):** *Moderate.* Systems *do* interact into
  incidents (a spawned horde raids you → takes captives → raises revolt risk → rebellion), but there is no
  dramatic framing or decision point — it reads as independent modifiers in the log. Verdict: **emergence
  happens; the game rarely turns it into a remembered moment.**
- **Civ/EU — Comeback-viability test:** *Fail.* With 146/288 collapses at mean year ~32, a bad position is
  terminal, and the event table has no relief-when-weak bias. Verdict: **events kick you when down.**

---

## 1. Event catalogue & triggers (from code)

Three event subsystems, all driven off seeded RNG inside `advanceSeason()`:

| System | Call site | RNG seed | Cadence | Player choice? |
|---|---|---|---|---|
| `randomEvents()` | top of `advanceSeason` | `rng(seed+year*43+season*101)` | every season | **None** — silent |
| `naturalEvents(r)` | after randomEvents | `rng(seed+year*89+season*53)` | every season | **None** — silent |
| `maybeRulerEvent(r)` → `RULER_EVENTS` | inside `agingAndSuccession` (year rollover) | `rng(seed+year*77+ruler.age)` | ~yearly, 40% gate | **Yes** (2–3 opts) |
| `spawnPirateFleet` | `advanceSeason` | 4%/season | continuous | reactive (defend) |
| `spawnNomadHorde` | `randomEvents` | 2%/season | continuous | reactive |
| `spawnHamlet` | `randomEvents` | 5%/season | continuous | none |
| `spawnRebellion` | `checkRevolts` | unrest-scaled | continuous | reactive |
| `placeVolcanoes` | world-gen only | — | once | — |

**`randomEvents` one-offs** (single `e=r()` roll, cumulative thresholds, so **~40% chance/season** that
one fires): plague (`e<.05`), good harvest (.10), drought (.15), migrants (.19), embassy gold (.23),
unrest −unity (.27), festival +unity (.30), faith fervour (.335), bandits −gold (.36), prospectors +res
(.385), earthquake (.40). Plus a **tax modifier** roll (~15%/season) and rare assassination
(`~0.5%+`, calls `rulerDies` — regicide with no counterplay).

**`naturalEvents`:** volcanic eruption (0.3%/volcano/season, pop + building loss, then enriches soil) and
seasonal river floods (monsoon 28% / snowmelt 22% chance in their flood season; 16% of those are
destructive, else a +food "blessing"). Dams cut destructive floods to 5%.

**`RULER_EVENTS` (6):** `kinsman` (ambitious cousin), `highpriest` (state orthodoxy), `scholar`
(patronage), `steward` (corruption), `general` (reward), `petition` (tax relief). Each has 2–3 options
with authority/unity/treasury/faith tradeoffs; a few have an RNG branch (mercy read as weakness, etc.).

## 2. Frequency / severity over 100y

- **Noise dominates the log.** At ~40%/season one-offs + ~15%/season tax events, a full 100-year game
  produces on the order of **~160 one-off events + ~60 tax events**, versus **~40 ruler-event firings**
  across only **6 templates**. The player's event experience is overwhelmingly low-stakes silent nudges.
- **Severity is modest.** Gold swings ±15–80, unity ±2, plague seed 30–70 (then decayed by hospitals/
  sanitation/tech), earthquake kills `pop*0.008*rand`. Individually none is a swing; the CSV shows no
  event-driven cliffs. The genuinely dangerous ones — plague, destructive flood, volcano — are rare.

## 3. Player agency in events

- **Frequent events: none.** `randomEvents`/`naturalEvents` mutate state and `log()` a line; the player
  never decides. Cartridge flag **"events with no choice/impact"** = confirmed for the entire high-
  frequency layer.
- **Ruler events: real but rare & repetitive.** 6 templates, ~0.4/yr, gated on `S.ruler` and per-event
  `cond()`. Good tradeoffs, but the small catalogue means a long game recycles the same six dilemmas.
- **Harness blind spot:** the sim auto-nulls `showRulerEvent`/`resolveRulerEvent`, so **none of the
  choice events actually resolve in this data** — the events.csv can see collapse/ruins/factions but is
  structurally blind to the only agency events. The CSV can quantify **outcomes** (collapse, churn) but
  **not** event agency or swinginess — those come from code review above.

## 4. Engine robustness / the "crash" (the headline)

**Finding:** there is **no crash.** `advanceSeason()` threw **0 times in 288 runs**. The harness line
that seemed to prove a crash —

```js
try{ advanceSeason(); }catch(e){ break; }   // civgame_harness.js
```

— never fired. What breaks the loop is the loop's own guard `!S.over`: when the crown collapses
mid-season (authority ≤ 0 or no settlements, set at the tail of `advanceSeason`), `S.over` flips true and
the `while` exits. Because the harness only pushes a row **when the year increments**
(`if(S.year!==py) rows.push(...)`), a collapse in Spring/Summer/Autumn writes **no final row**, so the
last row in `events.csv` is the previous year boundary with `over=0`.

**Exact partition (events.csv vs RUN_META `S.over` ground truth):**

| CSV appearance | count | truth |
|---|---:|---|
| last row `over=1` | 43 | collapse landed on a Winter→Spring boundary |
| last row `over=0`, year<100 | 103 | **mid-year collapse** (all 103 are in RUN_META.collapses) |
| reached year 100 | 142 | survived |
| genuine `advanceSeason` throw | **0** | — |

43 + 103 = **146** = RUN_META collapse count, exactly. Corroborated by the instrumented real-harness run:
15 archipelago collapses, 13 mid-year (`over=0` in CSV) + 2 boundary (`over=1`), **0 exceptions**.

**Why this matters:** anyone reading `events.csv` in isolation — including this audit's own brief —
concludes the engine crashes on large/archipelago worlds. It does not. The real defect is a **harness/
logging** one: the per-year event snapshot cannot express a mid-year end-state. **This is a HARNESS
artifact, not a game bug** (in the live game there is no CSV; collapse shows a modal correctly). It is
still worth fixing so future audits aren't misled — see Experiments.

## 5. Balance / swinginess

Not swingy. The event magnitudes are small relative to the economic forces that actually drive collapse
(admin cost, upkeep, empty-treasury authority spiral). Events are more "weather" than "turning points."
The one structural unfairness is **directionality** (§ comeback), not magnitude.

## 6. Archetype comparison — who gets hammered (end-state by archetype, RUN_META truth)

| archetype | full-100 | collapse | collapse% |
|---|---:|---:|---:|
| merchant | 16 | 2 | 11% |
| slaver | 14 | 4 | 22% |
| builder / techlord | 13 | 5 | 28% |
| diplomat / thalassocrat / survivor | 12 | 6 | 33% |
| passive / spymaster | 10 | 8 | 44% |
| balanced | 9 | 9 | 50% |
| exploit-hunter | 7 | 11 | 61% |
| conquest / nomad / isolationist / expansionist | 3 | 15 | 83% |
| **faith** | 2 | 16 | **89%** |

Events are not the *cause* (that's economy/authority — see cross-domain), but the archetypes that collapse
earliest (faith, expansionist, isolationist at mean yr ~20–22) are exactly those spending their thin
treasury on non-income actions, so every disaster event lands on a realm with no buffer — the comeback
problem in microcosm.

## End-state breakdown by scenario (RUN_META `S.over` ground truth)

| scenario | full-100 | collapse | collapse% | mean collapse yr |
|---|---:|---:|---:|---:|
| baseline | 21 | 27 | 56% | 31.7 |
| archipelago | 12 | 36 | **75%** | 31.4 |
| pangaea | 20 | 28 | 58% | 34.4 |
| easy | 23 | 25 | 52% | 25.5 |
| hard | 21 | 27 | 56% | 32.2 |
| kingdom | 45 | 3 | **6%** | 69.3 |
| **total** | **142** | **146** | **51%** | ~31.9 |

*(In `events.csv` these same collapses appear as: 43 rows with `over=1` + 103 rows ending `over=0` before
year 100. Archipelago's "32 over=0 early-ends" and hard's "22" are entirely mid-year collapses, not
crashes.)* `kingdom` (start:kingdom = a developed multi-city realm) barely collapses — a bigger starting
buffer is the single biggest survival lever, reinforcing that collapse is an economic/authority problem
the events merely garnish.

## World churn (ruins & factions over time, mean across live runs)

| year | mean ruins | mean factionsAlive | player conquests/yr |
|---:|---:|---:|---:|
| 1 | 27.2 | 3.73 | 0.00 |
| 20 | 83.2 | 12.26 | 0.00 |
| 50 | 113.6 | 17.54 | 0.00 |
| 100 | 149.5 | 28.82 | 0.00 |

The world **fragments and ruins up**, it does not consolidate. `spawnHamlet` (5%/season) and
`spawnNomadHorde` (2%/season) add settlements faster than raids/rebellions destroy them, while player
conquest is ~0. Emergent, alive — but the late-game map is a sprawl of ruins and many tiny factions
rather than a few great powers.

---

## Findings

### Critical
- **EVT-001 — The advanceSeason "crash" is a myth; the real bug is data legibility.** 0 throws in 288
  runs / ~86k calls. The 103 "over=0 early-ends" are mid-year collapses; `over` is only logged on year
  boundaries (43 landed there). 43+103 = 146 = RUN_META collapses; 0 genuine throws. *Harness/logging
  artifact — engine robustness is excellent. Fix the snapshot so mid-year end-states are visible.*

### Major
- **EVT-002 — Frequent events have no player agency.** `randomEvents`+`naturalEvents` fire a silent
  stat nudge ~40%+ of seasons (~160+/game) with zero choice; the only choice events (6 ruler templates)
  fire ~0.4×/yr. The player's moment-to-moment event experience is unagentic noise.
- **EVT-003 — Events fail the comeback test.** Disaster events (plague/drought/flood/bandits/earthquake)
  target the player's settlements regardless of realm health; no relief-when-weak bias. With 51% of runs
  collapsing at mean yr ~32, a weak realm gets kicked when down. No rubber-banding anywhere in the layer.

### Minor
- **EVT-004 — Ruler-event catalogue is tiny and sim-invisible.** 6 templates recycled ~40× per game; and
  the harness auto-nulls `showRulerEvent`, so their balance/agency is *unmeasured by this data* — a
  coverage blind spot to close in `setup`, not just a content note.
- **EVT-005 — World proliferates, never consolidates.** `factionsAlive` 3.7→28.8, ruins 27→149; late map
  is noisy/graveyard rather than a consolidated few empires. Emergent but arguably a pacing problem.
- **EVT-008 — Uncounterable regicide.** `randomEvents` assassination (`~0.5%+` under weak/cruel crown)
  calls `rulerDies` with no player defense (no guard/investigate option). Rare but pure bad-RNG.

### Polish
- **EVT-006 — Dead achievements.** `yr200`/`yr300` unreachable in a 100-year game; `pop250k` almost
  certainly never fires. `checkAchievements` thresholds should match the actual game length.
- **EVT-007 — Volcano may never fire.** 0.3%/volcano/season on ~2% of peaks ⇒ many seeds see no eruption
  in 100 yrs; the elaborate eruption code is mostly dormant flavor.

### Flags (cartridge 4.11 taxonomy)
- ✔ **events with no choice/impact** — entire `randomEvents`/`naturalEvents` layer.
- ✔ **events too frequent / too rare** — one-offs too frequent & low-stakes (noise); ruler events too
  rare and too few templates.
- ◑ **unrecoverable disaster spirals** — no *single* event spirals, but the layer offers no *recovery*
  either (comeback fail).
- ◑ **ruler events that always resolve the same** — only 6 templates; some options have RNG branches.
- ✔ **achievements that never fire** — yr200/yr300, pop250k.

---

## Opportunities

1. **Promote the top disasters to lightweight choices (M).** Give `plague`, `drought`, and the
   `migrants` refugee event a small modal: *quarantine (−trade, −plague) vs trade on (keep income, plague
   spreads)*; *ration stores vs buy grain (−gold)*; *admit refugees (+pop, +unrest) vs turn away
   (+authority)*. Converts the highest-impact noise into decisions and directly answers the "no agency"
   flag. Reuses existing state (plague/food/free).

2. **Rubber-band the event table by realm health (S).** When `S.authority<25` or pop is falling, bias the
   `randomEvents` roll toward relief (embassy gold, good harvest, migrants, festival) and add a
   "loyal remnant rallies" +authority event. Cheap counter to the kick-you-when-down failure; should lift
   mean collapse year and create genuine comeback runs.

3. **Condition ruler events on recent history (M–L).** Fire a "Triumph" after a won war, a "Faith
   Backlash" after mass enslavement, a "Physician at Court" during a plague year, a "Famine Council"
   after starvation deaths. Ties the 6→N ruler events to actual sim state = the CK3 story-generator the
   design is reaching for. Expands the catalogue and kills repetition.

4. **Event chains from the existing spawns (M).** Nomad horde appears → (ignored) grows → demands tribute
   → raids → offer to settle. Pirate sighting → (ignored) blockades a port → sack. Multi-step arcs turn
   the already-rich emergent substrate (§World churn) into remembered stories with player hooks.

5. **Make mid-year collapse visible in the data (S, harness-side).** Snapshot on `S.over` (or add an
   `endSeason`/`endState` field) so `events.csv` distinguishes full-100 / boundary-collapse / mid-year-
   collapse. Prevents this exact "it looks like a crash" misreading in every future pass.

---

## Experiments to try next

1. **Instrument end-state (S).** Add an `over`/`collapseSeason` snapshot on `S.over` and re-run; confirm
   the 146 collapses split cleanly and the "103 crashes" illusion disappears. (Already prototyped this
   pass: 0 throws, all 103 are mid-year collapses.)
2. **Halve one-off frequency + add plague/drought choices (M).** Set the one-off gate to `e<.20` and
   modal-ise plague/drought; measure whether perceived agency rises without changing the collapse economy
   (it shouldn't — magnitudes are small).
3. **Authority-biased event table (S).** Bias `randomEvents` toward relief when `S.authority<25`; measure
   whether mean collapse year rises above ~32 and whether any archetype that's behind by year 30 recovers
   (the comeback-viability metric).

---

## Appendix

- **Seeds:** 7, 19, 42 (frozen). **Scenarios:** baseline, archipelago (large/archipelago/sparse), pangaea
  (small/pangaea/crowded), easy (ai2/easy), hard (ai5/hard), kingdom (start:kingdom). **Archetypes (16):**
  passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced,
  exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor.
- **Runs:** 288 (16 arch × 6 scen × 3 seed). **Year-rows:** 18,718.
- **Version:** git `62523dc0f0b808f4501acf35acf074d3f9acf36f`, script sha256 `4075d3270dbab183`, generated
  2026-07-13, runtime 6,825 s. RUN_META's `62523dc` is the campaign-time HEAD; `index.html` itself did
  **not** change afterward (later commits only added audit files; the script sha256 `4075d3270dbab183` is
  identical to the reviewed code), so there is **no index.html drift** — findings hold without a re-run.
- **Event source of truth:** `index.html` — `randomEvents` (L1082), `naturalEvents` (L1071),
  `RULER_EVENTS` (L1116), `maybeRulerEvent` (L1148), `advanceSeason` collapse tail (L1169),
  `spawnNomadHorde` (L1092), `spawnHamlet` (L1091), `spawnPirateFleet` (L1567), `spawnRaidParty` (L1749),
  `spawnRebellion` (L1032), `checkAchievements` (L1043), `placeVolcanoes` (L320).
