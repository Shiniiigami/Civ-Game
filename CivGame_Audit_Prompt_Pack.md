# Civ-Game — Audit Prompt Pack

Target build: **https://shiniiigami.github.io/Civ-Game/**
Source (single-file, ~547 KB): `main` branch, `index.html`. The whole engine lives in one `<script>`; world/state are the globals `S` (realm state), `W` (world), `cam` (camera).

How to use this pack:
1. Build the shared harness **once** (Section 1 + Section 2). Run it once to emit every domain's CSV.
2. Commission domain reports (Section 4) in any order — the data already exists, no re-runs.
3. Run the cross-domain synthesis (Section 5) last.

**Golden rule:** freeze the archetype list and seed list before building the harness and never change them. They are the primary keys for the entire audit set (Section 3).

---

## 1. SHARED HARNESS PREAMBLE
*(Paste this block at the top of every domain prompt.)*

```
You are auditing Civ-Game (the game displays the in-game title "Crown Waters"), a single-file
HTML/vanilla-JS civilization game hosted at https://shiniiigami.github.io/Civ-Game/
(source: raw.githubusercontent.com/shiniiigami/Civ-Game/main/index.html). Fetch the real
source and drive the REAL engine. Do not reimplement or guess game logic — call the actual code paths.

YOUR TASK: build the headless harness described below, run it, and deliver (a) the per-year CSV/JSON
data files and (b) the written audit report for this domain. Do all of it in this session — build,
run, and report — don't stop after building.

ENGINE FACTS (verified from source — reconfirm before relying on them):
- The turn engine is ONE function: advanceSeason(). It runs production(), refineGoods(),
  advanceResearch(), processRoutes/Armies/Migration/Loyalty, aiTurn(), raids, faithDrift(),
  checkRevolts(), taxes/upkeep, then rolls the season.
- Cadence: 4 seasons per year (SEASONS=[Spring,Summer,Autumn,Winter]).
  => 100 years = 400 advanceSeason() calls. season 0..3; year rolls on season>3.
- Globals: S (state), W (world), cam. State shape is defined in newState(); world in makeWorld().
- Player input is the "Seasonal Council — one action per field": one action per council field
  per season, tracked in S.actions (reset to {} each season). Enumerate the fields via
  pickCouncil()/_councilCat (verify exact field set in source).
- READY-MADE LOGGING HOOKS (use these, don't recompute):
  * S.econ = {tax, trade, upkeep}         // rebuilt every season
  * S.seasonReport = {pop, gold, tax, trade, upkeep, food, unity}  // per-season deltas
  * chronicleYear()                        // annual rollup; sets S._yearPop0, S._yearGold
  * ownedPop(), S.treasury, S.resources, S.captives, S.faithPower, S.unity, S.authority,
    S.prestige, S.tech, per-settlement s.jobs / s.slaveJobs / s.infra / s.stores / s.loyalty
- Game-over: S.over becomes true if authority<=0 or no settlements remain. Log the year it ends.

HARNESS ENGINEERING (required — the game is DOM-coupled):
- Run under Node with a stubbed DOM + localStorage (jsdom, or hand-stub document/window/
  localStorage/canvas). advanceSeason() calls renderAll(), toast(), autoPersist(), drawMap() —
  stub them to no-ops so the sim runs headless.
- It PAUSES on modals: showConquestModal / showSiegeModal / showBattleModal / showRulerEvent.
  Auto-resolve them (conquestChoose/conquestNext, siegeAct, spoilsChoose, resolveRulerEvent)
  via the archetype policy, or the loop deadlocks.
- Determinism: RNG is seeded (rng(seed + year*k + season*k)). Same seed + same policy =>
  identical playthrough. This is what makes cross-domain joins valid.

METHODOLOGY:
- For each (archetype, seed) in the FROZEN SETS (Section 3), init a fresh game via newState(seed,cfg),
  auto-play with that archetype's policy, calling advanceSeason() until year>=100 or S.over.
- Each season: the policy issues council actions (the open*/do* functions), then advanceSeason().
- Log ONE per-YEAR snapshot per run (aggregate the 4 seasons). Write ALL raw per-year data to
  CSV + JSON files — never dump full tables into chat. Prose reports carry only summary tables
  and growth curves sourced from the CSV.
- CSV schema: leading key columns archetype,seed,year are IDENTICAL across every domain file
  so the files JOIN cleanly (Section 3).
```

---

## 2. ARCHETYPE POLICIES — mapped to the real levers

Each archetype is a per-season chooser: for each council field, score the available actions by category weight + a few rules, pick the best, execute it, then `advanceSeason()`. Confirmed action entry points (the `open*` open a modal, the `do*`/setter resolves it — a headless policy should call the resolve path directly with chosen args):

| Category | Real functions to call |
|---|---|
| Production/gather | `openGather`/`doGather`, `refineGoods`, `setJob`/`adjustJob` |
| Trade | `openCaravan`/`doCaravan`, `openForeignTrade`/`doForeignTrade`, `openBuyGoods`/`doBuyGoods`, `openSellGoods`/`doSellGoods`, `openRouteOrder`/`routeSet` |
| Taxation/treasury | `setRealmTax`, `setLocalTax`, `realmTaxPanel` |
| Faith | `openFaith`, `faithEvolve`, `enactEdict` (devotion), missions |
| Military/recruitment | `openRecruitOrder`/`placeRecruitOrder`, `openLevyOrder`/`doRaiseLevy`, `openArmyMuster`/`formArmy`, `openMercs`/`hireMercs`, `openEliteOrder`/`applyElite`, `openShipyard`/`buildFleet`, `recruitGeneral`/`assignGeneral` |
| Aggression/raid | `armyRaid`, `armyBattle`, `beginOrAdvanceSiege`/`siegeAct`, `markRaidTarget` |
| Settlement/expansion | `beginFound`/`foundAt`, `launchSettler`/`openSettlerEscort`, `establishCamp`, `appointGovernor`/`seatGovernor`, `abandonSettlement` |
| Infrastructure/wonders | `build`/`buildMix`, `buildBridge`/`buildDam`, `openWonders`/`startWonder` |
| Tech/research | `openResearch`/`setResearch`, `advanceResearch`, `openSkillOrder` (scholars) |
| Slaves/captives | `openEnslaveDistribute`/`doEnslaveDistribute`, `openTransferSlaves`/`doTransferSlaves`, `settleCaptives`, `setSlaveJob`/`adjustSlave` |
| Law/governance | `openLawCode`, `setSuccessionLaw`, `setPlayerGov`, `enactEdict` |
| Diplomacy | `setDiplo`, `declareWarFor`, `arrangeMarriage`, `payNomadTribute` |
| Scout/spy | `openScoutAt`/`confirmScout`, `embedSpy`, `openSkillOrder` (spies) |

**Frozen archetype set (10)** — weights are 0–10 per category; each also has 1–2 rules. Document the full weight table in every report.

1. **Conquest / militarist** — military 10, aggression 10, slaves 7 (`settleCaptives` captured pop), scout 6; economy only funds war. Rule: always recruit/levy to army cap, raid the nearest weak neighbor each season.
2. **Faith-driven / theocratic** — faith 10, infra(temples) 7, law(faith) 6, slaves 4; Rule: push `setPlayerGov("theocracy")`, spend edicts on devotion, prefer manumission/conversion of captives. Watch `S.laws.faith` × slavery interactions.
3. **Merchant / trade** — trade 10, production 8, taxation 6, infra(bazaar) 6; military defensive only. Rule: max out `routeSet`/`doForeignTrade`, keep jobs.merchants high, never initiate war.
4. **Nomad / mobile** — aggression 8, `establishCamp`/`formKhanate` 9, expansion(fixed) 1, infra 1; Rule: prefer camps over settlements, raid routes/camps, `abandonSettlement` if pinned.
5. **Builder / infrastructure** — infra 10, wonders 9, production 7, tech 6; tall not wide. Rule: always have a wonder in progress; max `s.infra` before expanding.
6. **Isolationist / autarky** — production 9, infra 6, defensive military 4, trade 0, diplomacy 0; Rule: never open routes/foreign trade; sustain pop from own food only.
7. **Expansionist / settler** — expansion 10, `launchSettler`/`foundAt` 9, production 5; Rule: found/settle whenever affordable; spread pop wide.
8. **Balanced generalist** — all categories ≈5; Rule: round-robin the council fields.
9. **Exploit-hunter / min-maxer** — greedy: each field, pick the single highest measured ROI action; deliberately probe degenerate loops (infinite slave capture, tax/trade exploits, wonder/tech snowballs, revolt-free growth). Rule: log any action whose marginal return exceeds a sane threshold.
10. **Passive baseline** — idle every field, only auto-resolve forced modals defensively. Establishes the floor and isolates AI/world-driven drift.

---

## 3. FROZEN CONSTANTS + CSV SCHEMA

**Seeds (frozen):** `7, 19, 42, 88, 101, 256, 777, 1337, 4242, 9001`
(10 seeds × 10 archetypes × 400 seasons. Trim seeds to 3–5 first if runtime is a problem, but freeze whatever you pick.)

**Start config (frozen):** same `cfg` for every run (e.g. `start:"village"`, fixed world dims, `realmName:"Audit"`). Vary only seed and archetype.

**CSV key columns — identical, leading, in this order, in EVERY domain file:**
```
archetype,seed,year,<domain-specific columns…>
```
One row per (archetype, seed, year). Emit one file per domain: `economy.csv`, `population.csv`, `war.csv`, `faith.csv`, `infrastructure.csv`, `tech.csv`, `governance.csv`, `diplomacy.csv`, `exploration.csv`, `espionage.csv`, `events.csv`. Also emit `master.json` (full wide record) for the synthesis pass. Because keys match, any two files JOIN on (archetype,seed,year).

---

## 4. DOMAIN CARTRIDGES
*(Each cartridge = shared preamble + this block. Follow the report shape: exec summary → numbered sections → findings tagged Critical/Major/Minor/Polish → problem taxonomy → curves from that domain's CSV → appendix of seeds+weights.)*

### 4.1 Economy, resources & trade
Hooks: `S.resources` (stone, brick, iron, copper, gold, silver, timber, horses, herbs, pearls, fish, elephants, clay, camels, reeds, salt, gems, amber), `S.econ{tax,trade,upkeep}`, `S.treasury`, `S.routes`, `production`, `refineGoods`, `goodPrice`/`buyPriceMult`/`sellPriceMult`, `complementaryGoods`, `caravanChance`, `routeIncome`/`routeEfficiency`, `adminCost`, tax (`TAXES`, `taxRate`, `taxMod`).
Sections: 1 Resources (define/produce/consume; source+sink each) · 2 Production & outputs · 3 Consumption & upkeep · 4 Trade & markets (pricing, volume, is it worthwhile) · 5 Treasury/tax/inflation over time · 6 Growth & scaling curves · 7 Economic UI/UX (every econ button) · 8 Balance & tuning · 9 Bugs/impossible states · 10 Archetype comparison.
Flag: nonexistent resources (referenced, never reachable) · dead resources (never produced/consumed) · redundant econ buttons · over-generous rewards/snowball · supply too high (inflation) or too low (scarcity softlock) · dominant trade exploits · stagnation traps · the `treasury>4000/12000` authority & graft thresholds — meaningful or trivial?

### 4.2 Population, labor & slavery
Hooks: `ownedPop`/`ownedPop`, `popCeiling`/`arableCap`/`loyaltyCeiling`, `s.jobs{farmers,scholars,healers,merchants,spies,sailors,builders…}`, `s.slaveJobs{farmers,laborers,builders,mines,household}`, `S.captives`, `S.laws.slavery`, `doEnslaveDistribute`/`doTransferSlaves`/`settleCaptives`/`slaveSoldiers`/`slaveEff`/`assignedSlaves`, `processMigration`/`generateRefugees`/`refugeePot`/`nomadPot`, `agingAndSuccession` (births/deaths), `checkRevolts`/`spawnRebellion`, plague/famine via `naturalEvents`/`foodBalance`.
Sections: 1 Population categories (free/clergy/military-eligible/children/captives…) · 2 Growth mechanics (gates: food, housing, faith) · 3 Mortality & loss · 4 Migration/refugees/nomad resettlement · **5 Enslaved/bonded** (acquisition via raid/conquest/purchase; the 5 slaveJobs; upkeep; count toward caps?; revolt risk; manumission; faith/law interaction) · 6 Carrying capacity & caps · 7 Class/job mobility & one-way traps · 8 Labor allocation (jobs vs slaveJobs competition) · 9 Unrest/loyalty/revolt · 10 Population UI/UX · 11 Curves · 12 Archetype comparison.
Flag: phantom pop categories · dead categories (never grow/used/removed) · runaway growth vs death-spiral · caps too high/low · **enslaved mechanics that are pointless, OP, never interact, or contradict the Zoroastrian faith/morality theme** (e.g. enslavement with zero unrest/faith/loyalty cost; captives with no valid source or sink; slaveSoldiers with no downside) · missing sinks · impossible states (negative pop, sub-pop > total, captives with no origin).

### 4.3 War, military & recruitment
Hooks: `S.armies`/`S.fleets`/`S.generals`, unit roster & `armyComp`/`fieldableUnit`/`unitsPowerRaw`, `levyCap`/`doRaiseLevy`/`levyUnitCost`, `openRecruitOrder`/`syncRecruit`/`updateRecruitQuote`, `hireMercs`/`mercQuote`, `applyElite`/`eliteSourcePool` (retinue), `armyBattle`/`armyVsArmy`/`ck3Battle`/`navalBattle`, `siegeStrength`/`siegeAct`/`beginOrAdvanceSiege`, `supplyLine`/`updateArmySupply`/`inSupply`, `processTraining`/`trainingRate`, `processDesertion`, upkeep in `S.econ.upkeep`.
Sections: 1 Unit roster (each tier: cost, power, upkeep, who fields it) · 2 Recruitment paths (levy vs recruit vs merc vs elite) · 3 Supply & upkeep (share of economy) · 4 Combat resolution (battle/siege/naval math, RNG swinginess) · 5 Training & desertion · 6 Retinue/elite gating · 7 War UI/UX · 8 Balance (dominant unit? free wins?) · 9 Bugs/impossible states · 10 Archetype comparison.
Flag: units no archetype ever recruits (dead unit) · a dominant unit/stack that trivializes war · upkeep too low (armies are free) or too high (can't sustain) · merc pricing exploits · siege/battle auto-win or unwinnable · supply lines that never bite · retinue that's mandatory or useless.

### 4.4 Faith & religion
Hooks: `S.faith` (doctrines), `S.faithPower`, `S.faithTier`/`faithTierOf`/`faithTierProps`, `faithEvolve`/`faithDrift`/`shiftFaith`/`faithShare`/`dominantFaith`, `convResist`/missions (`missionStrength`/`missionGain`), `enactEdict` (devotion), `S.laws.faith`, theocracy gov, faith wonders (cathedral/monastery/pantheon), faith×slavery interaction.
Sections: 1 Faith mechanics & tiers · 2 Faith power sources/sinks · 3 Conversion/missions/resistance · 4 Doctrines & their effects · 5 Faith buildings/wonders/edicts · 6 Faith × government (theocracy) · 7 Faith × slavery/morality (theme coherence) · 8 Faith UI/UX · 9 Balance & snowball · 10 Bugs · 11 Archetype comparison.
Flag: doctrines with no effect · faithPower with no meaningful sink · conversion auto-succeeds or never succeeds · faith tier stuck/unreachable · theme incoherence (a Zoroastrian realm with amoral slavery and no faith friction) · faith snowball that trivializes unity.

### 4.5 Infrastructure, buildings & wonders
Hooks: `s.infra{bazaar,woodcamp,quarry,mine,fishery,herbalist,workshop,aqueduct,fortress,academy,dam,stable,pen}`, `build`/`buildMix`/`buildPreview`/`costHtml`, `resourceBuilding`, `buildBridge`/`buildDam`/`destroyDam`, `barracksCap`/`scholarCap`/`arableCap` (buildings raising caps), wonders (`S.wonders`: cathedral, library, palace, monastery, arsenal, pantheon, colossus, forum), `startWonder`/`processWonder`/`wonderCooldownYear`.
Sections: 1 Building roster (each: cost, prereqs, effect, cap raised) · 2 Wonders (cost, build time, payoff) · 3 Capacity effects (how infra raises pop/army/scholar caps) · 4 Build economy (resource sinks) · 5 Build UI/UX · 6 Balance (must-build vs never-build) · 7 Bugs · 8 Archetype comparison.
Flag: buildings no one builds (dead) · buildings with no visible effect · wonders whose payoff never justifies cost (or that are auto-includes) · cap math that makes a building pointless · resource sinks too cheap/expensive · redundant build buttons.

### 4.6 Technology & research
Hooks: `S.tech` list (writing, currency, masonry, smelting, metallurgy, irrigation, horsemanship, engineering, bureaucracy, philosophy, accounting, scriptoria, scholarship…), `techAvailable`/`hasTech`/`techTier`/`techTierName`, `advanceResearch`/`researchOutput`/`researchProg`/`bumpResearch`, scholars (`scholarCap`/`scholarPool`/`trainSkilled`), `allTechDone` (end state), tech gating across every other system.
Sections: 1 Tech tree (each tech: cost, prereqs, what it unlocks) · 2 Research rate & scholar economy · 3 Gating (does tech actually gate meaningful things) · 4 Tech end-game (allTechDone — what then?) · 5 Tech UI/UX · 6 Balance (must-rush vs skippable techs) · 7 Bugs (prereq loops, unreachable tech) · 8 Archetype comparison.
Flag: techs that unlock nothing (dead) · prerequisite loops/unreachable techs · research too fast (whole tree by year 20) or too slow (never finishes) · a single must-rush tech that dominates · scholar cap making research trivial/impossible · stagnation after allTechDone.

### 4.7 Governance, law, authority & succession
Hooks: `S.gov` (monarchy/empire/khanate/citystate/republic/theocracy) + `govEvolve`/`playerGovDrift`/`govName`, `S.laws{succession,slavery,military,faith,local}` + `openLawCode`/`setSuccessionLaw`/`lawCap`/`lawChanges`, `S.authority`/`S.unity`/`S.prestige` (drivers in advanceSeason), `S.edicts`/`enactEdict`/`edictCost`, `S.taxRate`/`TAXES`, dynasty/succession (`agingAndSuccession`/`heirOf`/`eligibleHeirs`/`isElective`/`marriageInheritance`/`openSuccession`), `checkRevolts`.
Sections: 1 Government types & drift · 2 Law codes & their effects · 3 Authority/unity/prestige economy (sources/sinks) · 4 Edicts · 5 Taxation policy × unity/authority · 6 Succession & dynasty (heirs, elective vs cognatic, crises) · 7 Revolts · 8 Governance UI/UX · 9 Balance · 10 Bugs · 11 Archetype comparison.
Flag: gov types that are strictly better/worse (dominant) · laws with no effect · authority/unity that only ever rises (no real threat) or death-spirals · succession that softlocks (no valid heir → game over with no counterplay) · edicts nobody uses · tax tiers that are no-brainers.

### 4.8 Diplomacy & relations
Hooks: `S.relations`/`relOf`/`diploOf`/`diploState`/`diploTag`/`setDiplo`, `atWar`/`isAllied`/`isPact`/`declareWarFor`, `S.tributes`/`tributeDemand`/`payNomadTribute`/`underTribute`, `S.claims`/`hasClaim`, `assignSpheres`, marriages-as-diplomacy (`arrangeMarriage`/`marriageInheritance`), AI drivers (`factionAggr`/`factionGreed`/`hostAcceptRate`).
Sections: 1 Relations model · 2 War/peace mechanics · 3 Pacts/alliances/spheres · 4 Tribute · 5 Claims · 6 Marriage diplomacy · 7 AI behavior (is it reactive/exploitable) · 8 Diplomacy UI/UX · 9 Balance · 10 Bugs · 11 Archetype comparison.
Flag: diplomacy states with no gameplay effect · AI that never/always accepts · tribute exploits · alliances that never trigger · claims that do nothing · marriage inheritance loopholes · isolationist archetype proving diplomacy is entirely skippable.

### 4.9 Exploration, map & naval
Hooks: intel tiers (`s.intel`/`markSeen`/`worldKnown`/`revealHoldings`), scouting (`openScoutAt`/`resolveScout`/`scoutRadius`/`updateScoutCost`), fleets (`buildFleet`/`fleetPower`/`fleetCapacity`/`fleetSpeed`/`navalStrength`), seas (`discoverSeas`/`computeSeas`/`seaName`/`renameSea`), settlement/colonization (`launchSettler`/`foundAt`/`settlerArrive`/`islandDisembarkBlocked`), terrain (`tileYield`/`fertOf`/`terrainFit`).
Sections: 1 Intel/fog tiers · 2 Scouting economy · 3 Naval movement & capacity · 4 Sea discovery/naming · 5 Colonization/settlers · 6 Terrain & yields · 7 Map UI/UX · 8 Balance · 9 Bugs (unreachable land, stuck fleets, the beachFleetFix/navFix legacy patches) · 10 Archetype comparison.
Flag: scouting not worth the cost or mandatory · intel tiers that reveal nothing new · naval softlocks (fleets beached, islands unreachable) · settlers that starve en route (`settlerEat`) unavoidably · terrain yields that make whole biomes dead.

### 4.10 Espionage & intel
Hooks: `S.spyPosts`/`embedSpy`/`spyEmbedded`/`recallSpy`/`processSpies`, `spySight`/`spyTotal`/`freeSpies`, `deepIntelSection`/`unitIntel`/`techIntelText`, spies as a job (`s.jobs.spies`/`openSkillOrder`).
Sections: 1 Spy mechanics · 2 Spy economy (cost vs payoff) · 3 Intel gained (actionable?) · 4 Counter-intel · 5 Spy UI/UX · 6 Balance · 7 Bugs · 8 Archetype comparison.
Flag: spies that gain nothing actionable · spy cost mismatch · intel duplicated by free scouting · no counterplay (spies undetectable/unremovable).

### 4.11 Events & random systems
Hooks: `randomEvents`/`naturalEvents`/`maybeRulerEvent`/`showRulerEvent`/`resolveRulerEvent`, plague, `placeVolcanoes`, `spawnPirateFleet`/`spawnNomadHorde`/`spawnRaidParty`/`spawnRebellion`, `checkAchievements`.
Sections: 1 Event catalogue & triggers · 2 Frequency/severity over 100y · 3 Player agency in events · 4 Event UI/UX · 5 Balance (swinginess) · 6 Bugs · 7 Archetype comparison (who gets hammered).
Flag: events with no choice/impact · events too frequent/rare · unrecoverable disaster spirals · ruler events that always resolve the same · achievements that never/always fire.

---

## 5. CROSS-DOMAIN SYNTHESIS PROMPT
*(Run last; needs all CSVs + master.json.)*

```
Using the shared harness output (all domain CSVs + master.json, keyed on archetype,seed,year),
produce a cross-domain report that finds INTERACTIONS no single-domain audit can see. JOIN the
files on (archetype,seed,year) and trace causal chains across domains, e.g.:
- food/economy shortfall (economy.csv) -> mortality spike + revolt (population.csv, governance.csv)
- military upkeep share (war.csv) -> treasury collapse -> authority death-spiral (economy/governance)
- slave capture (population.csv) -> faith/loyalty friction or lack thereof (faith.csv) — theme check
- a rushed tech (tech.csv) -> broken economy or trivialized war (economy/war)
- wonder completion (infrastructure.csv) -> runaway unity/authority snowball (governance)
For each chain: name it, cite the (archetype,seed,year) rows, classify severity, and say whether
it's a feature, an imbalance, or a bug. Close with the 10 highest-priority fixes across the whole
game, ranked by (player-facing impact x number of archetypes affected).
```

---

## 6. SUGGESTIONS / GOTCHAS SPECIFIC TO THIS BUILD

- **Build the harness once; freeze constants first.** The archetype list, seed list, and start `cfg` are the primary keys for the *entire* audit set. Changing "merchant" between the trade run and the faith run silently corrupts every join.
- **Separate reports, shared harness.** One report per domain (readable, actionable) but one codebase/one snapshot logging all domains in a single pass (comparable, no drift). Don't build one mega-report.
- **Stub before you sim.** Confirm the DOM/localStorage stubs and modal auto-resolvers work on a 5-season smoke test before launching 400×100 runs, or you'll deadlock deep into a run.
- **Log the game-over year.** `S.over` collapses are findings, not failures — the passive baseline and isolationist especially will show whether the world kills you on its own.
- **The exploit-hunter is the MVP.** It's the archetype most likely to surface the "over-generous / dominant strategy / degenerate loop" findings you care about. Give it a real ROI-probing policy, not a lazy one.
- **Watch the legacy-migration code.** `migrateGame()`, `beachFleetFix`, `_navFix`, the `legacy` infra backfill in the state-normalizer — these hint at accumulated patches. Bugs cluster around save-migration and naval placement; audit exploration/naval with extra suspicion.
- **Two CSVs, not one giant one, per shared key.** Keeps each file readable alone but JOIN-able for synthesis.
- **Runtime budget.** 10×10×400 = 40,000 season-steps per domain-logging pass. If that's slow headless, cut seeds to 3–5 (freeze them) before cutting archetypes — you need all 10 play styles for the comparison, but fewer seeds still gives signal.
```
