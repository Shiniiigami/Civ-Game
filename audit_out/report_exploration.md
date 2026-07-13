# Audit — Exploration, Map & Naval (Cartridge 4.9)

**Game version:** index.html git `62523dc0` · script sha256 `4075d3270dbab183`
**Data:** `audit_out/exploration.csv` — 18,718 rows · 288 runs (16 archetypes × 6 scenarios × 3 seeds × ≤100y)
**Pass:** 1 (first exploration audit — no prior report/ledger) · Date 2026-07-13

---

## Executive summary

Exploration and naval are, in this build, **decorative systems the simulation never actually uses.**
Across 288 runs:

- **The world is never explored.** `seenPct` tops out at **7.6%** in the single best run (pangaea, 100y) and
  averages **~2.5% at end-of-run**. On the island scenario it peaks at **2.5%** after a full century. The map
  is 92–99% fog for the entire game. Discovery is not a reward loop; it is wallpaper.
- **Naval never happens.** `fleets > 0` occurs in **0 of 240** non-kingdom runs — including **0 of 48
  archipelago runs**, the one map that is naval-critical. The only runs with a fleet are all 48 `kingdom`
  runs, where the fleet is a **start-of-game artifact** (`makeStartFleet` gifts a fleet to any coastal capital
  with pop ≥ 2000) that never grows past 1. `buildFleet()` never successfully fires before a realm collapses.
- **The thalassocrat is a relabel.** On every logged column it is statistically indistinguishable from
  `passive`. Its scouting edge is **+0.8 percentage points of map seen after 100 years** (4.23% vs 3.43% in
  kingdom); its fleet count is identical to an idle realm's.
- **Wide expansion barely functions.** Settlement count essentially never exceeds 2. `expansionist` added a
  colony in only **9/18 runs**, always +1 (rarely +2). `SETTLER_MIN = 300` free pop, combined with realms
  collapsing around year 20–25, means the settler mechanic almost never gets to run.
- **Correction to the brief:** the premised "archipelago 32/48 runs ending via an `advanceSeason` throw
  (over=0)" **is refuted by this dataset**. All 36 archipelago early-ends are genuine `over=true`
  authority/settlement collapses. Zero throws campaign-wide. The apparent "over=0" is a **snapshot-timing
  artifact** — snapshots fire only on year-rollover, so the season in which `S.over` flips to 1 is never
  logged; the last CSV row shows the prior (over=0) year. See §9. The `beachFleetFix`/`_navFix` legacy patches
  appear to have already fixed the old naval crash.

The through-line: every brake in this domain is set to maximum and every reward to zero. There is no
overextension because there is no expansion; there is no naval theatre because the navy is unbuildable; there
is no fog-of-war payoff because the fog never lifts.

---

## New this pass

Everything below is net-new (first exploration audit). Ledger IDs assigned EXPL-001 … EXPL-009.

---

## 1. Intel / fog tiers (Section 1)

`markSeen(x,y,rad)` marks world cells `seen`; `seenPct` = seen cells / total cells. `resolveScout` bumps a
separate per-settlement `intel` tier (0→4) for holdings inside the scout radius. Two systems, both starved:

- **seenPct never grows meaningfully.** Trajectories (yr 1 / 10 / 25 / 50 / 75 / 100):

  | run | 1 | 10 | 25 | 50 | 75 | 100 |
  |---|---|---|---|---|---|---|
  | thalassocrat pangaea s7 | 1.6 | 2.5 | 3.5 | 4.3 | 5.2 | **7.6** |
  | passive pangaea s7 | 1.6 | 1.8 | 2.2 | 2.7 | 4.7 | **7.6** |
  | thalassocrat kingdom s7 | 1.2 | 1.7 | 1.8 | 2.5 | 3.3 | **4.7** |
  | passive kingdom s7 | 1.2 | 1.3 | 1.4 | 2.2 | 2.3 | **3.6** |
  | thalassocrat archipelago s42 | 0.4 | 0.6 | 0.9 | 1.3 | 1.4 | **2.5** |

  Even the *best* explorer, on the *best* map, ends with 92% of the world unseen. Actively scouting
  (thalassocrat) buys +0.8–1.1pp over doing nothing. The 3-tier intel system reveals holdings the player will
  never reach and never fights over — it pays off nothing.

**Verdict (Legibility/Pacing lenses):** the fog is permanent; the payoff for lifting it is absent.

## 2. Scouting economy (Section 2)

`confirmScout` gates overseas scouting behind **shipyard + ≥1 sailor + `bluewater` tech** ("Exploring beyond
deep water to other shores needs Blue-water Navigation"). On a village start that collapses by ~year 22, this
wall is never cleared, so on island maps you literally cannot scout across the water — which is why archipelago
`seenPct` is pinned near zero (§4). Land scouting works but the radius is small relative to map size.

- **`scoutRadius` column is dead.** `S.scoutRadius` is set to `220` once in `newState` and **never mutated
  anywhere in the engine** (constant 220 across all 18,718 rows). The radius actually used per expedition comes
  from `scoutTerms`/the order's `radius`, not this field. The logged column is a vestigial constant. (EXPL-006)

## 3. Naval movement & capacity (Section 3) — the headline failure

- **`fleets > 0` in 0/240 non-kingdom runs; 48/48 kingdom runs (all = 1, forever).**

  | scenario | runs | anyFleet | avg end yr | avg final seenPct | max seenPct |
  |---|---|---|---|---|---|
  | baseline | 48 | 0/48 | 61.0 | 2.45 | 5.6 |
  | archipelago | 48 | **0/48** | **47.8** | **1.03** | **2.5** |
  | pangaea | 48 | 0/48 | 61.1 | 5.06 | 12.0* |
  | easy | 48 | 0/48 | 60.7 | 2.61 | 6.1 |
  | hard | 48 | 0/48 | 61.3 | 2.37 | 4.9 |
  | kingdom | 48 | **48/48** | 98.0 | 3.97 | 5.9 |

  *(the single 12.0 is one outlier row; typical pangaea max is ~7.6.)*

- **Why buildFleet never fires:** `buildFleet` needs (a) `s.infra.shipyard`, (b) `freeSailors() >= crew`,
  (c) `spend(gold, timber, iron)`, on a coastal settlement. The thalassocrat harness policy *does* try to build
  a shipyard then a fleet every season (index.html line ~1547; harness lines 293–301), but the realm collapses
  before the shipyard→sailors→gold chain completes. Result: **not one fleet object is ever created outside the
  gifted kingdom start.** (EXPL-001, Critical)

- **The `fleets` metric counts fleet *objects*, not ships.** `buildFleet` appends ships to the existing home
  fleet rather than spawning new fleet objects, so a hypothetical 20-ship armada still logs `fleets = 1`. In
  kingdom, thalassocrat sits at `fleets = 1` from year 1 to 100 unchanged. The column cannot measure naval
  *strength* — only naval *existence*. (EXPL-007, Minor — metric limitation)

## 4. Sea discovery / naming (Section 4)

`discoverSeas()` runs each season but only fires on cells that are both water and `seen`. Since seenPct never
climbs, seas are essentially never charted. The rename/`seaname` order machinery is reachable in principle but
never exercised by any archetype in 288 runs. Dead in practice, downstream of the fog problem (§1).

## 5. Colonization / settlers (Section 5)

- **Settlement count is flat.** `settlements` spans 1–4 across all 18,718 rows; mean **1.26**. It *increased at
  any point* in only **18/288 runs**, and typically 1→2.
- **Settlers barely launch.** `settlers` (armies flagged `settler`) has max 1 (one in transit) and is nonzero
  for only 2 archetypes: expansionist (7/18 runs) and balanced (1/18). `SETTLER_MIN = 300` free pop is a steep
  gate for a small realm that collapses at ~year 22.
- **When they do launch, they mostly work:** expansionist settlements grew in **9/18 runs** (e.g.
  `expansionist pangaea s19` 1→3). So the pipeline (`launchSettler`→`settlerArrive`→`foundAt`) is functional —
  it is just almost never *reached*. `islandDisembarkBlocked` correctly prevents settling on top of island
  holdings. (EXPL-003, Major — expansion path is real but strangled)

**Verdict (EU4 Sinks & Overextension lens):** there is **no overextension because there is no expansion.** The
expected finding ("the expansionist should hit a wall") inverts: the brake (`SETTLER_MIN` + early collapse) is
so hard the wheels never turn. A realm never holds enough territory to be worth a coring/AE cost.

## 6. Terrain & yields (Section 6)

Not directly logged in this CSV, but the scenario deltas implicate terrain hard: **archipelago (large/islands/
sparse) is the worst scenario in the game** — only 12/48 reach year 100 vs 21–23 for continent maps, avg end
year 47.8 vs ~61. Island tiles + the naval wall (§2) mean a realm is boxed onto one starting island it can
neither scout off of nor sail from, and it starves/destabilizes. The biome that most needs naval is the one
where naval is most unreachable. (EXPL-002, Critical — archipelago is effectively unwinnable)

## 7. Map UI/UX

Out of scope for the headless CSV (see `report_ui.md`). Flag for the `ui` pass: if 92%+ of the map is fog for
the whole game, verify the minimap/map view doesn't read as broken or empty to a player.

## 8. Balance & tuning

Covered inline. Summary: scouting cost/reward inverted (cost real, reward ~nil); naval prerequisites stacked
too high to ever clear; settler pop-gate + collapse timing lock out wide play.

## 9. Bugs & legacy patches (Section 9)

- **REFUTED: no `advanceSeason` throws in this dataset.** The brief's premise that archipelago runs end via an
  `advanceSeason` throw with `over=0` is **not reproduced** at git `62523dc`. Classifying all 288 runs: runs
  ending before year 100 that are *not* in `RUN_META.collapses` (which is `ends.filter(e => e.over)`) = **0**.
  Every archipelago early-end is a genuine `over=true` collapse. The "over=0" appearance is a **snapshot-timing
  artifact**: `snapshotSeason` emits a row only on year-rollover, so the season in which `S.over` flips to 1 is
  never written — the last logged row is the previous (over=0) year, which reads like a silent early-end. A
  targeted diagnostic (scratchpad `diag.js`) that forces settler launches on archipelago maps across
  passive/expansionist/thalassocrat/seeds **also produced 0 throws** — every run ended in a clean `over=true`
  collapse (years 26/33/29/26/26). Classify the old naval-throw finding as **fixed/not-present** at this
  version. (EXPL-005)
- **`beachFleetFix(f)`** (index.html ~1541): in `migrateGame`, relocates any fleet sitting on a land cell to
  its home dock or nearest water (`(S.fleets||[]).forEach(beachFleetFix)`). Still load-bearing for save
  migration; harmless. This is exactly the "beached fleet" softlock the cartridge warns about — patched.
- **`_navFix`** — referenced once; a vestigial one-shot migration guard. Effectively inert legacy. Candidate
  for removal on a code-health pass. (EXPL-008, Polish)

## 10. Archetype comparison

| archetype | anyFleet | avg fleet-years | avg final seenPct | avg final settlements | any settler |
|---|---|---|---|---|---|
| passive | 3/18 | 16.7 | 2.97 | 1.17 | 0 |
| thalassocrat | 3/18 | 16.7 | 3.76 | 1.17 | 0 |
| merchant | 3/18 | 16.7 | 3.79 | 1.17 | 0 |
| spymaster | 3/18 | 16.7 | 4.28 | 1.17 | 0 |
| expansionist | 3/18 | 16.7 | 1.70 | 1.50 | **7** |
| balanced | 3/18 | 16.7 | 2.63 | 1.28 | 1 |
| conquest | 3/18 | 13.4 | 2.45 | 1.50 | 0 |

The "3/18 anyFleet" is **identical for all 16 archetypes** — because it is entirely the 3 kingdom seeds' gifted
start fleet, not archetype behavior. The thalassocrat's naval identity **does not exist in the data**.
(EXPL-004, Major — false-choice archetype)

---

## Findings (severity-ranked)

**Critical**
- **EXPL-001 — Naval is unbuildable in practice.** `buildFleet` succeeds in 0/240 non-kingdom runs; the only
  fleets in the dataset are the kingdom start-gift. Shipyard→sailors→gold chain never completes before collapse.
- **EXPL-002 — Archipelago is effectively unwinnable.** 12/48 survive to 100 (worst scenario), avg end yr 47.8,
  map <2.5% explored. The naval-critical map gives zero naval and the overseas-scout wall (shipyard+sailors+
  `bluewater`) boxes the realm onto one island.

**Major**
- **EXPL-003 — Wide expansion strangled.** Settlements almost never exceed 2 (mean 1.26); `SETTLER_MIN=300` +
  collapse-by-year-22 means settlers rarely launch. Pipeline works when reached (9/18 expansionist runs) but is
  almost never reached.
- **EXPL-004 — Thalassocrat is a relabel.** Indistinguishable from passive on every column; naval "identity"
  worth +0.8pp seenPct after a century.
- **EXPL-009 — Discovery is unrewarding.** seenPct ceiling ~7.6% after 100y; fog never lifts; 3-tier intel
  reveals holdings never used. No reason to explore.

**Minor**
- **EXPL-005 — Brief premise refuted (positive):** 0 `advanceSeason` throws campaign-wide; the "over=0"
  early-end is a snapshot-timing artifact, and the old archipelago naval crash appears already fixed by
  `beachFleetFix`/`_navFix`. Verify-and-close.
- **EXPL-007 — `fleets` metric counts fleet-objects, not ships** → can't measure naval strength; add a
  ship-count/`navalStrength` column next `setup`.

**Polish**
- **EXPL-006 — `scoutRadius` column is a dead constant (220).** `S.scoutRadius` never mutates; drop it or wire
  it to `updateScoutCost`.
- **EXPL-008 — `_navFix` vestigial migration flag;** remove on a code-health pass.

---

## Problem-taxonomy flags
- Dead column: `scoutRadius` (constant 220) · near-dead column: `settlers` (max 1, nonzero for 2/16 archetypes).
- Naval softlock: not a crash (fixed) but an **economic softlock** — the navy is gated behind prerequisites the
  realm never affords.
- Unreachable land: island maps are functionally unreachable (no overseas scout/settle before collapse).
- False choice: thalassocrat archetype (no mechanical divergence).
- Reward vacuum: fog-of-war and intel tiers with no payoff.

---

## Curves & tables
(seenPct trajectory §1 · fleets-by-scenario §3 · settlement growth §5 · archetype table §10 — all above.)

Key numbers to track next pass: **max seenPct 7.6%**, **archipelago survival 12/48**, **non-kingdom fleets 0/240**,
**settlement-growth runs 18/288**, **advanceSeason throws 0/288**.

---

## Opportunities (lenses 12–13)

1. **Make discovery pay (EXPL-009).** Seed the fog with **finds**: ruins (`W.ruins` already exist!) that grant
   a one-time gold/tech/relic when first `seen`, lost-colony sites that can be re-founded cheaply, resource
   deposits revealed only by scouting. Turn `seenPct` from a dead stat into a treasure-map. *Effect:* every
   archetype gains a reason to scout; thalassocrat/expansionist get a real edge. *Effort:* M (hooks exist:
   `markSeen`, `resolveScout`, `W.ruins`).

2. **Lower the naval on-ramp so the theatre exists (EXPL-001/002).** Give coastal starts a **cog/raft tier**
   buildable without `bluewater` (short-range coastal hops), and let a shipyard auto-train a minimum sailor
   cadre. Gate only *deep-ocean* crossing behind `bluewater`. *Effect:* archipelago becomes playable; fleets
   appear before year 50; thalassocrat diverges from passive. *Effort:* M.

3. **Re-tune the expansion brake into a real curve (EXPL-003).** Drop `SETTLER_MIN` (300→~120) or scale it to
   settlement size, and add the *missing* EU4 half — an **overextension cost** on each new colony (temporary
   unity/authority hit that decays). Right now there is a hard wall and no soft cost; invert it to a soft cost
   and no wall, so wide play is viable *and* self-limiting. *Effect:* creates the tall-vs-wide decision that
   currently doesn't exist. *Effort:* S–M.

4. **Naval as a theatre, not a checkbox (comparative — CK3/EU coastal play).** Add coastal raiding / pirate
   suppression / island trade nodes so a fleet *does* something. Tie `spawnPirateFleet` (already in
   `advanceSeason`) to a bounty for realms that field a fleet. *Effect:* naval upkeep earns its keep; the
   arsenal wonder's sea-income bonus gains a partner. *Effort:* M–L.

5. **Log naval strength, not naval existence (EXPL-007).** Next `setup`, add `shipCount`/`navalStrength` and
   `intelTierAvg` columns so future passes can see *how much* navy/intel a realm has, not just yes/no. *Effort:* S.

---

## Experiments to try next pass

1. **Halve the naval on-ramp:** set `bluewater` as prereq only for ocean (not coastal) tiles and give shipyards
   a free 4-sailor cadre. Re-run archipelago — does `fleets>0` appear, and does survival rise above 12/48?
2. **Settler gate sweep:** run `SETTLER_MIN ∈ {300, 150, 80}`. Does mean settlements climb above 2, and does an
   overextension cost keep it from snowballing? Locates the tall-vs-wide balance point.
3. **Discovery bounty:** attach a gold reward to first-`seen` ruins. Measure whether any archetype's `seenPct`
   trajectory changes shape (does exploration become worth the season/gold cost?).

---

## Appendix

- **Version:** index.html git `62523dc0f0b808f4501acf35acf074d3f9acf36f`, script sha256_16 `4075d3270dbab183`,
  RUN_META generated 2026-07-13, runtime 6825s.
- **Seeds:** 7, 19, 42 (frozen subset of the 10-seed set; seeds cut before archetypes per README §1c).
- **Scenarios (OFAT):** baseline · archipelago{large,archipelago,sparse} · pangaea{small,pangaea,crowded} ·
  easy{ai2,easy} · hard{ai5,hard} · kingdom{start:kingdom}.
- **Archetypes (16):** passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist,
  balanced, exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor.
- **Columns audited:** seenPct, fleets, settlers, settlements, scoutRadius (keys archetype,scenario,seed,year).
- **Lenses fired — Section 2:** #1 Balance/tuning, #2 Meaningful choice, #5 Pacing/arc, #6 Feedback loops,
  #7 Replayability, #11 Perf/code-health (beachFleetFix/_navFix), #12 Opportunity.
- **Lenses fired — Section 2.5:** **EU4 Sinks & Overextension** (verdict: no overextension because no
  expansion; brake over-tuned to lock wide play); **Paradox Tall-vs-wide** (verdict: wide non-viable, tall also
  collapses in village starts; only the pre-built kingdom start survives, where map metrics are archetype-blind
  → no distinct win-paths); **Civ/EU Comeback-viability** (light: archipelago collapse is terminal).
- **Diagnostic:** `scratchpad/diag.js` — reproduced 5 archipelago runs uncaught; 0 throws, all clean `over=true`.
