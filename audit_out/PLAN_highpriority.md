# Crown Waters — HIGH-priority implementation plan

Turns the synthesis batching plan into an executable sequence. **The governing constraint (from synthesis
Chains A & C): collapse rate is the master confound** — any lever that moves it re-sorts which runs reach
late-game and shifts every domain's numbers. So the HIGH-tier economy/war/naval work is **ENTANGLED and
runs one lever-round at a time**, each followed by a harness re-campaign + `verify`, so effects are
attributable. Only the slavery-morality pair runs in parallel (it doesn't touch solvency).

All code changes are in `/home/user/Civ-Game/index.html` (one `<script>`). Deploy = bump `sw.js` CACHE +
the `BUILD` label, `--no-ff` merge to `main`. Verification = re-run `civgame_harness.js` and diff the CSVs.

---

## Preflight (do first — no gameplay change, ~1 round)

**P1 · HARN-01 — fix the collapse-logging artifact.** In `civgame_harness.js`, have the run-loop emit a
final snapshot row when `S.over` flips mid-year (currently the loop breaks on `!S.over` and the last row is
the prior year with `over=0`). Add `over`/`endSeason` so `events.csv` distinguishes full-100 / boundary /
mid-year collapse. *Why first:* without it every collapse-year metric we `verify` against is off by one and
`over` undercounts collapses by ~2×.

**P2 · HARN-03 — stop `build()` bypassing the tier cap.** In the harness `tryBuild`, respect the level-3
cap the game's `act()` enforces (or cap bazaar/market at 3). *Why:* otherwise INFRA magnitudes
(81–99 bazaars) are garbage and pollute infraTotal.

**P3 · Establish the baseline + a fast iteration config.** Record the current headline metrics as the
`verify` baseline (from the committed CSVs): overall collapse **51%**; authority Δ/yr **−2.31** at
treasury≤30 vs **+0.35** solvent; ever-broke collapse **65%** vs never-broke **6%**; per-scenario collapse
(kingdom 6% … archipelago 75%); militarist upkeep/income 80–109%; broke-vs-solvent final techs 5.1 vs 8.9.
Add a **`--quick`** harness mode (e.g. scenarios `baseline,pangaea,kingdom` × seeds `7,19` = 96 runs, ~20 min)
for per-round iteration; keep the frozen **`--full`** (288 runs) for the final `verify` of each round.

> After P1–P2, **re-run `setup --full` once** to get a clean, artifact-free baseline. Every round below
> `verify`s against *this* baseline, not the original.

---

## The entangled HIGH sequence (one round each; re-campaign + verify between)

### Round 1 — ECON-001 + GOV-001 · surface & soften the authority death-spiral *(coordinated pair)*
**Root cause; touches all 16 archetypes and the entire 51% collapse rate.**

- **Code (index.html:1169, `advanceSeason`):**
  - Replace the cliff `(S.treasury>30?.25:-1)` with a **graded ramp**: full `+0.25` when solvent, decaying to
    a *shallow* penalty as treasury→0 (e.g. `treasury>30 ? .25 : -clamp((30-treasury)/30, 0, 1)*P`), so an
    almost-broke realm loses ~0 and a fully-broke realm loses `P` — not a guaranteed −1 the instant it dips.
  - Soften the second hammer `(S.treasury<10&&admin>20?-1.5:0)` (reduce magnitude or gate it on *sustained*
    poverty, not a single season).
  - Add a **weak self-heal / floor** so a realm that fixes its income can climb back (today authority has no
    recovery term below 30 — 11 comebacks exist but all are treasury-led and slow). Target: bankruptcy is
    still punished and can still kill, but over ~10+ years, not ~6, and recovery is reachable.
- **Code (S.seasonReport, end of `advanceSeason`):** add `authority` and `authorityD` (Δ) to the report
  object and the season toast; in `renderStats` show authority with a **warning state** when the treasury
  term is dragging it (name the cause: "Treasury empty — authority bleeding −N/yr"). This is the GOV-001
  legibility half — do it in the *same* round so we never ship a softened-but-still-silent spiral.
- **Tuning:** sweep `P` and the self-heal on `--quick` until collapse rate drops meaningfully but bankruptcy
  is not risk-free.
- **Verify (`--full`):** overall collapse rate **down from 51%**; authority-death share of endings down;
  comeback count up; per-scenario collapse compresses toward kingdom's low end; **no** new snowball (survivors
  shouldn't all now hit 150k — that's Round 2). Confirm `governance.csv`/season report now carry authority.
- **Deploy** once verified (this is a strict UX win even before the economy rounds).

### Round 2 — ECON-002 · a real treasury sink
**Economic archetypes; late game. Do *after* Round 1 so we can tell a "fewer collapses" gain from a "less snowball" gain.**

- **Code (index.html:1169, graft term):** replace the cosmetic `Math.max(0,treasury−12000)*.004` with a
  meaningful carry cost — e.g. ~3–5% above a lower band (~8,000), and/or a per-season **luxury/court/army
  upkeep** that scales with realm size so surplus gets reinvested. Keep it below net income for a *healthy*
  realm so it caps hoards without inducing new bankruptcies.
- **Verify (`--full`):** max treasury falls from **149,854** toward a sane ceiling (~15–25k); merchant/
  spymaster/builder stay solvent (collapse **not** up); the yr10 snowball ratio (merchant 3.5× field) shrinks.
- **Deploy** once verified.

### Round 3 — ECON-006 · raise the fragile village opening
**All archetypes, all non-kingdom scenarios. The mirror of the kingdom result (yr1-treasury 140→6% collapse).**

- **Code:** the kingdom edge is a *developed capital* (bigger pop/infra → more early tax), not starting gold
  (`newState` treasury=140 for all). Options: a modestly higher village start (starting food/pop/infra floor),
  a gentler early admin curve, or a small early-game authority grace. Aim to lift the early economic floor so
  village realms survive the opening without trivializing it.
- **Verify (`--full`):** per-scenario collapse **converges toward kingdom's low rate** (baseline/pangaea/easy/
  hard fall from ~52–58% toward ~20–30%); kingdom itself barely moves (it's already floored); mid/late-game
  archetype divergence widens (more runs reach late game to differentiate).
- **Deploy** once verified.

### Round 4 — WAR-001 + WAR-003 · make militarism pay *(coordinated pair)*
**4 militarist archetypes + war as a viable path. Gated behind Rounds 1–3** (militarism is Chain A with armour;
it needs the economy floor first, then its own income).

- **Code:**
  - **WAR-003 (armyRaid:1732 / beginOrAdvanceSiege:1726):** make `armyRaid` a *small-loot skirmish* and gate
    fat plunder behind an actual **siege** (revives the near-dead siege layer, WAR-002 rides along).
  - **WAR-001 (levyUnitCost:873 / upkeep in advanceSeason):** cut peasant/levy upkeep and/or add a **lasting
    conquest income** (tribute/garrison tax on held foreign cities). Template already in the data: slaver
    survives 4/18 despite 109% upkeep/income *because* it has trade income — militarism needs a non-upkeep
    revenue source.
- **Verify (`--full`):** militarist net-negative-season share **below ~30%** (from 53–75%); conquest collapse
  **below ~8/18** (from 15/18); `sieges`/`warsActive` columns rise from ~0; captures now flow partly through
  sieges, not only `armyRaid`.
- **Deploy** once verified.

### Round 5 — EXPL-001 + EXPL-003 · affordable fleets & settlers *(coordinated pair)*
**Naval/expansion archetypes; unlocks the archipelago scenario. Gated behind Rounds 1–3** (affordability depends
on the economy floor).

- **Code:** make the **shipyard→sailors→fleet** chain reachable before collapse (cost/tempo of `buildFleet`
  + sailor training), and lower **`SETTLER_MIN`** (300) with a soft overextension cost so `launchSettler`
  fires. INFRA-002 (tall-vs-wide) becomes a real choice once wide is viable — measure it here.
- **Verify (`--full`):** `fleets>0` in non-kingdom runs (from 0/240); archipelago survival up from 12/48;
  `settlements` mean rises above 1.26; thalassocrat diverges from passive (EXPL-004).
- **Deploy** once verified.

### Gated HIGH — TECH-001 + TECH-002 · re-baseline, then fix
Tech is HIGH but **cannot be judged until Rounds 1–3 land** — today broke runs die before they research
(5.1 vs 8.9 techs). After the economy rounds, **re-`setup` and re-read tech** first; then, if pace is still
short, cut tier 3–5 costs ~35% and unlock a *scaled* golden age at a full tier / 25-of-39 techs (TECH-001).
A small independent hedge (decouple `researchGold` from the treasury, TECH-006) can ride in Round 1.
**Verify:** `allTechDone` reachable for techlord by ~yr85–95; late-game research no longer 100% idle.

---

## Parallel INDEPENDENT round — POP-001 + FAITH-003 · slavery as a costed moral choice
**Runs in parallel with the entangled sequence — it touches unrest/faith, not the treasury cliff, so it does
not move collapse rate and won't confound the economy rounds.** *(Coordinate the two findings with each other.)*

- **Code:** convex slave-burden on `checkRevolts` (index.html:1063 — the `slaveRatio*.32` term bites only at
  ratios play never reaches); add a faith/authority drag per total slaves under a truth/purity doctrine
  (POP-001); wire the Zoroastrian **Asha/Druj purity axis** so slavery is inherently frictional and abolition
  becomes a real reform path (FAITH-003, replacing the current backwards opt-in `abolition` +0.05).
- **Verify (`--full`):** slaver's late-game unity falls below non-slavers; slave share plateaus (a brake)
  instead of ratcheting; revolt threshold is reachable; faith archetypes gain an anti-slavery identity —
  **without** changing overall collapse rate (confirm it's still ~Round-1 level).

---

## Per-round loop protocol (every round)
1. Edit `index.html`; `node --check` the extracted `<script>`.
2. `node civgame_harness.js --quick` → eyeball the target metric moved the right way; tune constants.
3. `node civgame_harness.js --full` → the authoritative `verify` against the P3 baseline (diff the CSVs;
   check the round's success criteria **and** a regression scan of the other domains' headline columns).
4. Run the existing regression suite (`culture`, `food`, `units2`, `raiders`, etc.) so a balance change
   didn't break a mechanic.
5. If green: bump `sw.js` CACHE + `BUILD`, `--no-ff` merge to `main` (deploy to players); update `LEDGER.md`
   (finding → `fixed`, note the game version) and append to `ITERATION_LOG.md`.
6. If a round regresses another domain, **stop and reassess** before the next round — do not stack.

## Sequencing summary
```
Preflight:  P1 HARN-01 · P2 HARN-03 · P3 baseline + --quick   →  clean --full baseline
Round 1:    ECON-001 + GOV-001   (soften + surface authority)   [ENTANGLED]
Round 2:    ECON-002             (treasury sink)                 [ENTANGLED]
Round 3:    ECON-006             (village opening floor)         [ENTANGLED]
Round 4:    WAR-001 + WAR-003    (militarism pays)               [ENTANGLED, after 1–3]
Round 5:    EXPL-001 + EXPL-003  (fleets/settlers affordable)    [ENTANGLED, after 1–3]
Gated:      TECH-001 + TECH-002  (re-baseline after 1–3, then)   [ENTANGLED]
Parallel:   POP-001 + FAITH-003  (slavery morality)             [INDEPENDENT — anytime]
```

## Risks & rollback
- **Over-softening authority (Round 1):** if collapse drops too far, the game loses tension → tune `P` up,
  keep bankruptcy lethal on *sustained* poverty. The `--quick` sweep guards this.
- **Sink too aggressive (Round 2):** could induce new bankruptcies → keep the sink below healthy net income;
  watch collapse rate as a guardrail metric every round, not just the target metric.
- **Order matters:** Rounds 4–5 and Tech depend on the economy floor from 1–3. Doing them first would be
  measured against a still-collapsing field and mislead. Don't reorder.
- **Rollback:** each round is one deploy; if `--full` regresses, revert that round's commit before the merge
  to `main` (the branch history keeps every round isolated).

## Recommended starting point
**Round 1 (ECON-001 + GOV-001)** after the P1–P3 preflight. It is the single highest-impact change (all
archetypes, the whole collapse rate), it is a strict UX win on its own (surfacing the hidden kill-switch),
and it sets the economy floor every later round is measured against.
