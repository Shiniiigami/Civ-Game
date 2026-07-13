# Crown Waters — Cross-Domain Synthesis

**Game version:** git `62523dc` (script sha256_16 `4075d3270dbab183`) · **Data:** all 11 domain CSVs + master.json JOINed on `archetype,scenario,seed,year` · 288 runs / 18,718 rows (16 archetypes × 6 scenarios × 3 seeds × 100y). Analysis-only — no re-run. First synthesis pass (draws on the 11 first-pass domain reports + LEDGER).

> **The one thing to take away:** ~51% of all runs die, and almost every death is the **same death** — an empty treasury silently bleeding authority to zero (measured: authority **−2.31/yr** when `treasury≤30` vs **+0.35/yr** when solvent; ever-broke runs collapse **65%** vs **6%** for the never-broke). This single loop sits upstream of nearly every other finding: it starves tech (broke runs end **5.1** techs vs **8.9**), kills the militarist/faith/expansion archetypes, and truncates the data for every domain. **Collapse rate is the master confound of the whole dataset** — which makes it both the highest-value fix and the thing that must be stabilized *first and alone* before anything else can be measured cleanly.

---

## Part 1 — Per-domain tiers

Tier = severity × player-facing impact × breadth (how many of the 16 archetypes / 6 scenarios it touches). **High** = game-defining or a root cause with broad reach; **Medium** = a real flaw confined to one subsystem or a few archetypes; **Low** = polish, dead-column cleanup, or harness-coverage artifacts. Each line: `ID · one-line · fix`.

### Economy (4.1)
**High**
- `ECON-001` · Empty-treasury→authority death-spiral, silent & ~65%-terminal (all archetypes) · **Fix:** replace the `treasury>30?+0.25:−1` cliff with a graded ramp + surface it (see GOV-001).
- `ECON-002` · No treasury sink → 150k snowball (economic archetypes) · **Fix:** scale graft properly (~3–5% above ~8k) and/or add luxury/court/army upkeep that consumes surplus.
- `ECON-005` · Aggressive archetypes are economic traps — 53–75% net-negative seasons (conquest/nomad/faith/slaver/expansionist) · **Fix:** cut levy/camp/settler upkeep or add a raid→loot income loop (couples to WAR-001/003).
- `ECON-006` · Kingdom-start trivializes the economy (45/48 survive vs 12–23) — the mirror of a too-fragile village opening (all archetypes) · **Fix:** raise the early village economy floor and/or scale the kingdom endowment down.

**Medium**
- `ECON-003` · 8-factor trade-route income never fires (HARNESS: policies never `openRouteOrder`) · **Fix:** wire routes into the harness + a first-class UI lever; re-measure balance.
- `ECON-004` · Goods sales bypass `econ.trade`, mislabeling earnings (legibility) · **Fix:** route `doSellGoods` gain into `S.econ.trade`.
- `ECON-007` · graft@12,000 threshold is cosmetic (0.4% skim) · **Fix:** folded into ECON-002.

**Low**
- `ECON-008` gold commodity near-dead · `ECON-009` treasury>4000 rung reinforces snowball · `ECON-010` archipelago starvation (⊂ EXPL-002) · `ECON-011` panel doesn't surface treasury→authority (⊂ GOV-001).

### Governance (4.7)
**High**
- `GOV-001` · Authority death-spiral is SILENT — authority absent from `S.seasonReport` while unity (shown) sits at 88 into collapse (all archetypes) · **Fix:** add `authority` (+Δ) to the season report and name the treasury cause when the −1 term fires.

**Medium**
- `GOV-002` · Prestige is a dead write-only stat · **Fix:** give it a sink (press claims / legitimize heir / gov reform) or cut it.
- `GOV-003` · 4/8 gov types unreachable (empire/khanate/citystate/tribal) · **Fix:** lower drift thresholds / add a player reform path.
- `GOV-004` · Taxation a false choice (2/5 tiers, never changed) · **Fix:** give high/crushing a real use (crisis coin at unity cost) + AI/policy that toggles it.

**Low**
- `GOV-005` chiefdom strictly dominated · `GOV-006` succession has no drama · `GOV-H1` lawChanges=0 (HARNESS).

### War (4.3)
**High**
- `WAR-001` · Militarism is a costed upkeep trap — upkeep 80–109% of income; conquest collapses 15/18 (4 militarist archetypes) · **Fix:** raid/siege payouts scaled to target wealth + a lasting conquest income stream; cut peasant/levy upkeep.

**Medium**
- `WAR-002` · Phased siege/war layer inert (sieges in 11/18,718 rows) · **Fix:** gate fat loot behind an actual siege (couples to WAR-003).
- `WAR-003` · Raid loop bypasses siege/war/conquest (degenerate; max 286 captives, 0 conquests) · **Fix:** make `armyRaid` small-loot skirmish; big loot requires siege.
- `WAR-004` · Battle phases carry no agency (auto-resolved random tactics) · **Fix:** pause `ck3Battle` between phases for a real decision.

**Low**
- `WAR-005` war.csv can't see the roster (HARNESS logging) · `WAR-006` processDesertion fires too late.

### Population (4.2)
**High**
- `POP-001` · Slavery is frictionless free labour that *contradicts* the Zoroastrian theme — 0 unity/faith/authority cost; unity *higher* with slaves; revolt threshold hit in 16/18,718 rows (theme-defining; 3 archetypes hold slaves but it colours the whole morality) · **Fix:** convex slave-burden on `checkRevolts` + a faith/authority drag under a truth/purity doctrine (couples to FAITH-003).

**Medium**
- `POP-002` · Slavery a one-way trap, dead for 13/16 archetypes, no growth edge · **Fix:** scale manumission/ransom payoffs so freeing is a live choice.
- `POP-003` · Captives have no sink — nomad freezes 35 all run · **Fix:** captive upkeep/decay clock forcing enslave/ransom/settle/execute.

**Low**
- `POP-004` captivesNow near-dead · `POP-005` freePop+slaves≠pop (unlogged levies, legibility) · `POP-006` popCeiling<pop overshoot · `POP-007` slaveEff 1.2× no-brainer.

### Tech (4.6)
**High**
- `TECH-001` · Golden-Age/Edict end-game unreachable — `allTechDone` in 0/18,718 rows (all archetypes) · **Fix:** unlock a *scaled* golden age at a full tier / 25-of-39 techs.
- `TECH-002` · Research ~2–3× too slow — best case 14/39 by yr61 (all archetypes) · **Fix:** cut tier 3–5 costs ~35% and/or raise the base research floor.

**Medium**
- `TECH-003` · 21/39 techs never studied (naval/siege/high-gov branches dead) · **Fix:** re-cost + branch the tree (couples to TECH-002).
- `TECH-004` · Late-game research 100% idle · **Fix:** ⊂ TECH-001 (a destination to spend on).

**Low**
- `TECH-005` scholar economy inert 15/16 (HARNESS) · `TECH-006` research gold-gated, dies with economy (⊂ ECON-001) · `TECH-007` narrow shared trunk · `TECH-008` techlord wishlist caps at 14 (HARNESS).

### Infrastructure (4.5)
**Medium**
- `INFRA-001` · Wonders build-once-and-forget (max 1 ever; builder-only) · **Fix:** lower builder floor, let gold sub for builders, cut cooldown to ~10y.
- `INFRA-002` · Tall-vs-wide a non-choice (all ~1 settlement) · **Fix:** ⊂ EXPL-003 (make wide survivable first).
- `INFRA-003` · Walls an uncapped linear late-game sink · **Fix:** add walls to the tier cap or escalate cost.

**Low**
- `INFRA-004` build() bypasses tier cap (HARNESS — must fix before any infra balance call) · `INFRA-005` temples faith-locked · `INFRA-006` 15/16 never startWonder (HARNESS) · `INFRA-007` barracks auto-include.

### Diplomacy (4.8)
**Medium**
- `DIP-001` · Alliances unreachable (allies=0 everywhere; ally-aid code dormant) · **Fix:** lower the rel≥40 gate or add fast-relation levers to reach it.
- `DIP-002` · Neighbours are wallpaper — `factionAggr` never reads relations · **Fix:** wire aggression to `S.relations[player]`.
- `DIP-003` · Claims inert — never pressed · **Fix:** surface a "press the claim?" council prompt; let AI press claims on the player.

**Low**
- `DIP-004` warsActive near-dead / never AI-initiated · `DIP-005` pacts churn silently (8y lapse) · `DIP-006` tribute flat/low-ceiling · `DIP-007` relations logs count not warmth (HARNESS).

### Exploration & Naval (4.9)
**High**
- `EXPL-001` · Naval unbuildable in practice — 0 fleets outside the kingdom start-gift (scenario-defining; kills archipelago) · **Fix:** make a shipyard→sailors→fleet chain affordable before collapse (couples to ECON-001).
- `EXPL-002` · Archipelago effectively unwinnable — 12/48 survive, ≤2.5% explored · **Fix:** ⊂ EXPL-001 + EXPL-003 (naval + expansion viable).

**Medium**
- `EXPL-003` · Wide expansion strangled (settlements mean 1.26; grew in 18/288) · **Fix:** lower `SETTLER_MIN` (300) + soft overextension cost.
- `EXPL-004` · Thalassocrat is a relabel (≈passive) · **Fix:** ⊂ EXPL-001 (give naval a real theatre).
- `EXPL-009` · Discovery unrewarding — seenPct ceiling 7.6%, fog never lifts · **Fix:** scouting rewards / map events.

**Low**
- `EXPL-006` scoutRadius dead column · `EXPL-007` fleets counts objects not ships (HARNESS logging) · `EXPL-005` crash refuted (VERIFY/close).

### Faith (4.4)
**Medium**
- `FAITH-001` · faithPower a sinkless monotone accumulator · **Fix:** a Fire-Temple upkeep sink.
- `FAITH-003` · Faith×slavery friction negligible & inverted (theme incoherence) · **Fix:** Asha/Druj purity axis making slavery frictional (couples to POP-001).
- `FAITH-004` · Faith path a survival trap (15/18 collapse yr17–34) · **Fix:** ⊂ ECON-001 + cheaper/stronger founding.

**Low**
- `FAITH-002` 3/8 doctrines dead · `FAITH-005` no convergence/schism · `FAITH-006` absorb loop rarely fires · `FAITH-007` Zoroastrian identity flavour-only.

### Espionage (4.10)
**Medium**
- `ESP-001` · Sight-only — no actionable operation · **Fix:** add one op (sabotage/foment/steal).
- `ESP-002` · No counter-intel; AI never spies · **Fix:** detection/catch-risk roll.

**Low**
- `ESP-003` intel duplicated by scouting · `ESP-004` spy cap binds at ~4 · `ESP-005` 60g soft trap · `ESP-006` 15/16 never spy (HARNESS).

### Events (4.11)
**Medium**
- `EVT-002` · Frequent events have no agency (~160 silent nudges/game) · **Fix:** promote top disasters (plague/drought/refugee) to lightweight choices.
- `EVT-003` · Events fail comeback-viability — hit the player regardless of health · **Fix:** bias the event table toward relief when authority<25.

**Low**
- `EVT-004` 6 ruler templates, sim-invisible · `EVT-005` world proliferates not consolidates · `EVT-006` dead achievements · `EVT-008` uncounterable regicide · `EVT-001` crash-is-a-myth (VERIFY/close).

### UI (from report_ui.md)
**Low** (all): `UI-tap` sub-44px tap targets (`.vtab` 30px, `.tab` 31px, modal controls 32–37px) — bump to ≥44px touch height on mobile.

### Harness (data-fidelity — fix before trusting affected columns)
**High (for data validity, not gameplay):**
- `HARN-01` · `snapWide` logs only on year-rollover → mid-year collapses record `over=0` at the prior year (the "crash" illusion). · **Fix:** emit a final row when `S.over` flips. **Do this before the next `setup`** or every collapse-year metric stays off by one and undercounts `over`.

**Medium:** `HARN-02` policy lever gaps make routes/spies/laws/scholars/wonders/9-of-12-diplo columns read dead · `HARN-03` build() bypasses the tier cap (inflates bazaar/market counts — do not read INFRA magnitudes as balance until fixed).

---

## Part 2 — Cross-domain interaction map

Each entry: the chain, the findings it links, the JOIN evidence, and whether the fixes must be **coordinated** (done/tuned together) or can be **sequenced** (separate rounds).

### CHAIN A — The master loop: economy → authority → collapse → *everything*
**Findings:** `ECON-001` ↔ `GOV-001` ↔ `ECON-002` ↔ `ECON-006` (and downstream: `ECON-005`, `WAR-001`, `FAITH-004`, `TECH-006`).
**Evidence (JOIN):** authority Δ = **−2.31/yr** at `treasury≤30` vs **+0.35/yr** solvent; ever-broke runs collapse **65%** (142/220) vs **6%** (4/68); kingdom (yr1-treasury **140**) collapses **6%** vs baseline (**91**→56%) / pangaea (**52**→58%) / archipelago (**66**→75%).
**Interaction:** authority has *no self-heal below 30* — only the treasury pulls it out (11 observed comebacks, all treasury-led). ECON-001 (the cliff) and GOV-001 (the silence) are **the same bug seen from two rooms**: one is the mechanic, the other is that the player can't see it (unity shows 88 the whole way down). ECON-002 (no sink) and ECON-006 (fragile opening) set *where* on the curve a realm sits.
**Coordination:** **COORDINATE the pair ECON-001 + GOV-001** (softening the cliff without surfacing it hides a now-recoverable spiral; surfacing without softening just narrates a death). ECON-002 and ECON-006 are **separate rounds** — they move the endpoints of the same curve and each shifts collapse rate on its own, so they must be isolated to measure.

### CHAIN B — War upkeep ↔ economy ↔ population
**Findings:** `WAR-001` ↔ `ECON-005` ↔ `WAR-003` ↔ (`POP-002`, `POP-003`).
**Evidence (JOIN):** militarist upkeep/income — conquest **80%**, nomad **90%**, exploit-hunter **99%**, slaver **109%**; net-negative seasons 53–75%; conquest collapses **15/18**. Captives (population) come from `armyRaid` (max 286) which registers **no** siege/war — so war "succeeds" via a loop that bypasses the war system and still can't pay for itself.
**Interaction:** WAR-001 is CHAIN A wearing armour — militarism just reaches `treasury≤30` faster. Fixing WAR-001 means adding **income** (raid/siege loot, conquest tribute), which is an **economy** change (ECON-005) and a **population** change (captives→labour/ransom, POP-002/003). Note: slaver already shows the escape hatch — I gave it trade income + light tax, and it collapses only **4/18** despite 109% upkeep/income, because sales keep it solvent. That's the template: militarism needs a non-upkeep income source.
**Coordination:** **COORDINATE WAR-001 + WAR-003** (the loot loop and the raid/siege gating are one mechanic). ECON-005's upkeep cut is a **separate round** (it independently changes collapse rate). POP-002/003 (manumission/captive sink) can be **sequenced after** — they add value but don't gate militarist survival.

### CHAIN C — Economy → tech → (late game)
**Findings:** `TECH-006` ↔ `ECON-001`; downstream `TECH-002`/`TECH-001`.
**Evidence (JOIN):** broke runs (`treasury≤30` ever) end with **5.1** techs vs **8.9** never-broke — research is gold-gated (`researchGold`), so the death-spiral throttles tech before the pace problem (TECH-002) even applies.
**Interaction:** you cannot fairly measure TECH-002/003 (pace, dead branches) until CHAIN A is stabilized, because half the runs are dying before they can research. Fixing CHAIN A will *raise* observed tech counts on its own — so re-baseline tech AFTER the economy round or you'll misattribute the improvement.
**Coordination:** **SEQUENCE** — stabilize CHAIN A first, re-campaign, then judge TECH-001/002. Decoupling research from the treasury (TECH-006 fix) is a small independent hedge that can ride along.

### CHAIN D — Slavery ↔ faith ↔ governance (the theme knot)
**Findings:** `POP-001` ↔ `FAITH-003` (↔ `GOV`unity, `FAITH-001`).
**Evidence:** enslaving is 0-cost on unity/authority/faith; unity is *higher* with slaves; the only coded friction (`abolition` doctrine +0.05 unrest) is opt-in and backwards. A Zoroastrian (truth/purity) realm holds slaves with no moral tension.
**Interaction:** POP-001's fix (slave-burden on unrest/authority) and FAITH-003's fix (Asha/Druj purity making slavery frictional) are **the same tension implemented in two systems** — do them together or the population penalty and the faith penalty double-count, or contradict.
**Coordination:** **COORDINATE POP-001 + FAITH-003.** Independent of CHAIN A (touches unrest/faith, not the treasury cliff) — a good candidate for a *parallel* round.

### CHAIN E — Naval ↔ expansion ↔ economy ↔ scenario balance
**Findings:** `EXPL-001` ↔ `EXPL-002` ↔ `EXPL-003` ↔ `INFRA-002` (↔ `ECON-001` on archipelago).
**Evidence:** 0 fleets outside the kingdom gift; archipelago 12/48 survive; settlements mean 1.26 (wide grew in 18/288); INFRA-002 (tall-vs-wide) is a non-choice *because* wide never exists. Archipelago's 75% collapse is CHAIN A made worse by island economics + no naval.
**Interaction:** EXPL-001 (afford a fleet), EXPL-003 (afford a settler), and archipelago survival are one economic-affordability problem downstream of CHAIN A; INFRA-002's tall-vs-wide choice only becomes real once EXPL-003 makes wide viable.
**Coordination:** **SEQUENCE after CHAIN A** (affordability depends on the economy floor). EXPL-001 + EXPL-003 can then be **coordinated** (both are "make the expansion/fleet chain reachable"). INFRA-002 follows.

### CHAIN F — Dead-content clusters (weakly coupled)
`TECH-001`/`TECH-004` (golden-age destination), `INFRA-001` (wonders), `GOV-002` (prestige), `DIP-001`/`ESP-001` (alliances/spy ops), `FAITH-001` (faithPower sink), `EVT-002`/`EVT-003` (event agency). These are *independent* "this system does nothing / has no sink / has no choice" fixes that don't touch the collapse loop. They interact only lightly (e.g. prestige-as-currency GOV-002 could become a diplomacy/succession sink) and are the safest to batch.

---

## Part 3 — Batching plan

**Governing rule (from CHAIN A + C):** any change that moves the **collapse rate** re-sorts which runs reach late-game and therefore shifts *every* domain's aggregates. Those changes are **ENTANGLED** and must be done **one lever per round, with a `setup` re-campaign + `verify` between**, so the effect is attributable. Changes that do **not** touch collapse (legibility, dead-content, mechanics with no bearing on solvency, harness logging) are **INDEPENDENT** and safe to batch.

**Do first, before any gameplay round:** **`HARN-01`** (log a final row on mid-year `S.over`) and **`HARN-03`** (stop `build()` bypassing the tier cap). These are data-fidelity fixes — without them the collapse-year and infra metrics you'll `verify` against are wrong. Batch them together; they don't affect gameplay.

### HIGH tier
**ENTANGLED — one per round, re-campaign + verify between (all move collapse rate):**
1. **CHAIN A core — `ECON-001` + `GOV-001` together** (the cliff + its visibility; coordinated pair, but the *pair* is one round). Verify: collapse rate, authority-into-collapse slope, comeback count.
2. **`ECON-002`** (treasury sink). Verify: max treasury, whether survivors stop snowballing past ~20k without new collapses.
3. **`ECON-006`** (village opening floor / kingdom endowment). Verify: per-scenario collapse convergence toward kingdom's low rate.
4. **`WAR-001` + `WAR-003`** (upkeep trap + loot loop; coordinated pair, one round). Verify: militarist net<0 share below ~30%, conquest collapse below ~8/18.
5. **`EXPL-001` + `EXPL-003`** (fleet + settler affordability; coordinated pair). Verify: fleets>0 outside kingdom, archipelago survival up, settlements>1.
*(Run in this order — each depends on the economy floor set by the ones above. `TECH-001`/`TECH-002` are High but are **gated behind CHAIN A**: re-baseline and judge them only after rounds 1–3, since broke runs currently can't research.)*

**INDEPENDENT — safe to batch in one round (don't touch collapse):**
- **`POP-001` + `FAITH-003`** (the slavery-morality knot; coordinated with each other, independent of the economy). Touches unrest/faith, not the treasury cliff — can run in **parallel** to the entangled economy sequence.

### MEDIUM tier
**INDEPENDENT — batch freely (no solvency coupling):**
- Legibility/dead-content: `GOV-002` (prestige sink), `ECON-004` (trade-ledger label), `FAITH-001` (faithPower sink), `DIP-001`/`DIP-002`/`DIP-003` (alliance gate / reactive AI / press-claim), `ESP-001`/`ESP-002` (spy op + counter-intel), `EVT-002`/`EVT-003` (event agency + comeback bias), `WAR-004` (battle-phase agency), `INFRA-001` (wonders reachable), `INFRA-003` (cap walls), `GOV-003`/`GOV-004` (gov types / tax tiers).
- These can go in 2–3 comfortable batches grouped by file locality; none re-sorts the collapse set, so one re-campaign at the end of the medium wave suffices to refresh their columns.

**ENTANGLED (sequence after their High parent):**
- `WAR-002` (siege gating) — do in the same round as WAR-001/WAR-003 or immediately after.
- `TECH-003`/`TECH-004` — after TECH-001/TECH-002 (they share the re-cost).
- `EXPL-004`/`EXPL-009`/`INFRA-002` — after EXPL-001/003.
- `POP-002`/`POP-003` — after or with POP-001.
- `FAITH-004` — after CHAIN A (its collapse is economic).

### LOW tier
**INDEPENDENT — batch all together, no re-campaign needed to reason about them:**
- UI tap-targets (bump `.vtab`/`.tab`/modal controls to ≥44px), `ECON-008` (gold), `GOV-005`/`GOV-006`, `POP-004`/`POP-006`/`POP-007`, `WAR-006`, `TECH-007`, `INFRA-005`/`INFRA-007`, `DIP-004`/`DIP-005`/`DIP-006`, `ESP-003`/`ESP-004`/`ESP-005`, `EVT-004`/`EVT-005`/`EVT-006`/`EVT-008`, `EXPL-006`.
- **Harness/legibility cleanups (do as tooling, not gameplay):** `HARN-02` (teach the harness the unused levers — routes/spies/laws/scholars/wonders/diplo — then re-`setup` to distinguish dead game content from coverage gaps), `POP-005`/`WAR-005`/`EXPL-007`/`DIP-007` (add the missing columns), `ECON-011` (panel surfacing ⊂ GOV-001).
- **Close-outs (verify only):** `EXPL-005` / `EVT-001` — the refuted crash; mark `verify`→closed once HARN-01 lands and the `over` column reads clean.

---

## Top-10 fixes ranked (impact × archetypes affected)
1. **ECON-001 + GOV-001** — surface & soften the treasury→authority spiral. *Affects all 16 archetypes; the 51% collapse rate.*
2. **ECON-006** — raise the fragile village opening (kingdom proves it: 6% vs 51%). *All archetypes, all village scenarios.*
3. **WAR-001 + WAR-003** — make militarism pay (loot loop, cut upkeep). *4 militarist archetypes + war as a viable path at all.*
4. **ECON-002** — a real treasury sink (kills the 150k snowball). *Economic archetypes; late-game.*
5. **TECH-001 + TECH-002** — reachable golden age + finishable tree. *All archetypes; the entire late game.*
6. **EXPL-001 + EXPL-003** — affordable fleets & settlers (unlocks archipelago + wide). *Naval/expansion archetypes; 1 of 6 scenarios.*
7. **POP-001 + FAITH-003** — make slavery a costed moral choice (theme coherence). *Theme-wide; 3 archetypes mechanically.*
8. **DIP-002** — reactive AI (relations actually matter). *All archetypes near neighbours; diplomacy as a live system.*
9. **HARN-01** — fix the collapse-logging artifact (prerequisite for trusting every `verify`). *Data validity for all future passes.*
10. **EVT-003 + EVT-002** — event agency + comeback bias (stop kicking the player when down). *All archetypes; run-to-run drama.*

---

## Appendix
- **JOIN key:** `archetype,scenario,seed,year`; 288 runs / 18,718 rows; every domain CSV shares the leading keys so they JOIN 1:1.
- **Evidence source:** consolidated JOIN over economy/governance/war/population/tech/events/faith (numbers in Parts 1–2) + the 11 first-pass domain reports + `LEDGER.md` (84 findings) + `ITERATION_LOG.md`.
- **Version:** git `62523dc`, script sha256_16 `4075d3270dbab183`; generated 2026-07-13. Analysis-only; no game code changed.
- **Method caveat:** several "dead column" findings are HARNESS coverage gaps (HARN-02), not game bugs — flagged inline; do not treat them as gameplay fixes.
