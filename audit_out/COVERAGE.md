# Crown Waters — Audit Coverage Map

Which `S.*`/`W.*` state fields and functions each cartridge covers, so `discover` can diff against
`index.html` and surface uncovered (new/never-audited) mechanics. Updated 2026-07-13 (`audit all`, first pass).

**Method note:** coverage = hooks named in the cartridge AND verified against `index.html` during the
pass. The per-domain CSVs each expose only a subset of these (the loggable scalars); many mechanics
were checked in code but not logged — those are marked (code-only).

---

## 4.1 economy
Covered: `S.treasury`, `S.econ{tax,trade,upkeep}`, `S.resources.*`, `S.routes`, `routeIncome`/`processRoutes`/`openRouteOrder` (code-only — never fired), `adminCost`, `TAXES`/`taxRate`, `doSellGoods`/`goodPrice`/`GOODS_PRICE`, `doForeignTrade`, `complementaryGoods`, `accounting` interest, graft threshold (treasury>12000), authority rungs (treasury>30/400/4000).
Not yet exercised: `refineGoods` outputs per-good, `caravanChance`/`doCaravan`, `buyPriceMult`/`sellPriceMult` full sweep, `routeEfficiency`, luxury goods (pearls/gems/amber/silver) production.

## 4.2 population
Covered: `ownedPop`, `popCeiling`/`arableCap`, `s.jobs`/`s.slaveJobs`, `S.captives`, `settleCaptives`, `doEnslaveDistribute`, `slaveEff`, `slaveSoldiers`, `checkRevolts` (slaveRatio term), `S.laws.slavery` (code-only), `enslave`/`manumit`/`buy_slaves`/`sell_slaves` (code-only), `popCeiling`.
Not yet exercised: `processMigration`/`generateRefugees`/`refugeePot`/`nomadPot` (logged only via pop), `agingAndSuccession` births/deaths detail, plague/famine mortality per-event, `manumit`/`ransom` outcomes (harness never pulls).

## 4.3 war
Covered: `S.armies`, `UNIT` roster (8 tiers), `levyUnitCost`/`doRaiseLevy`, `ck3Battle`/`armyBattle`/`armyPower`, `beginOrAdvanceSiege`/`siegeAct`/`siegeHoldOut`, `armyRaid`, `conquer`/`conquestChoose`, `processDesertion`, `updateArmySupply`/`supplyLine` (code-only), `navalBattle`/`armyVsArmy`.
Not yet exercised: `placeRecruitOrder`/`hireMercs`/`applyElite`/`formArmy` (harness uses only levy), `eliteSourcePool`, `armyComp`/unit-composition logging, `processTraining`/`trainingRate`, `S.generals` roster.

## 4.4 faith
Covered: `S.faith`, `S.faithPower`, `S.faithTier`/`faithTierOf`/`FAITH_TIER_PROPS`, `faithEvolve`/`faithDrift`, `dominantFaith`/`distinctFaiths`, doctrines (militant/syncretic/mercantile/monumental/... — 3 dead), `attemptAbsorb`, `missionStrength`, `S.laws.faith`+`abolition` (faith×slavery hook).
Not yet exercised: `missionGain`/`convResist` sweep, faith wonders (cathedral/monastery/pantheon), theocracy-gov interaction detail, `enactEdict` devotion (gated behind allTechDone).

## 4.5 infrastructure
Covered: `s.infra{barracks,walls,bazaar,market,temple,academy,aqueduct,workshop,...}`, `build`/`buildMix`, `startWonder`/`processWonder`/`WONDERS`/`wonderCooldownYear`, `S.wonders`, `barracksCap`, `act()` level-3 tier cap (bypassed by harness).
Not yet exercised: `resourceBuilding` (woodcamp/quarry/mine/fishery/herbalist) yields, `buildBridge`/`buildDam`/`destroyDam`, `scholarCap`/`arableCap` as infra effects, most wonders (only Great Library ever built).

## 4.6 tech
Covered: `TECH` table (39 techs, 6 tiers), `techAvailable`/`hasTech`/`techTier`, `researchOutput`/`researchGold`/`advanceResearch`, `allTechDone` (never true), `scholarCap`/`scholarPool`, `EDICTS`/`enactEdict`/`advanceGoldenAge` (code-only — unreachable), `BUILDING_TECH`/`UNIT.tech` gates.
Not yet exercised: full research-active distribution beyond the ~18 studied techs, `bumpResearch`, golden-age tiers/pool in play, `trainSkilled` for scholars beyond techlord.

## 4.7 governance
Covered: `S.gov`/`GOV`/`govEvolve`/`playerGovDrift`, `S.authority`/`S.unity`/`S.prestige` (drivers in advanceSeason:1169), `S.laws{...}`/`lawCap`/`lawChanges` (code-only), `TAXES`/`taxRate`, `checkRevolts`, `S.seasonReport` (authority ABSENT), succession (`agingAndSuccession`/`openSuccession`/`isElective` — code-only), `edictCost`.
Not yet exercised: `setSuccessionLaw`/`openLawCode` outcomes (harness never changes laws), `heirOf`/`eligibleHeirs`/`marriageInheritance` succession drama, elective-vs-cognatic crises, empire/khanate/citystate/tribal gov paths (unreachable).

## 4.8 diplomacy
Covered: `S.relations`/`relOf`, `S.diploState`/`diploOf`/`setDiplo`/`atWar`/`isAllied`/`isPact`, `S.tributes`/`payNomadTribute`/`underTribute`, `S.claims`/`hasClaim`, `arrangeMarriage`/`S.marriages`, `factionAggr` (never reads relations), `declareWarFor`, ally-gift/`siegeAllies` (code-only, dormant).
Not yet exercised: `envoy`/`subsidize`/`fabricate_claim`/`trade_offer`/`trade_treaty`/`declare_war`/`press_claim`/`make_peace`/`ransom` (9/12 diplo actions untested by harness), `hostAcceptRate`, `assignSpheres`, `marriageInheritance` outcomes.

## 4.9 exploration
Covered: `s.intel`/`markSeen`/seenPct, `buildFleet`/`fleetPower`/`S.fleets`, `confirmScout`/`openScoutAt`/`scoutTerms`, `launchSettler`/`SETTLER_MIN`/`settlerArrive`, `S.scoutRadius` (dead — constant 220), `beachFleetFix`/`_navFix` (legacy, code-only), `bluewater`/shipyard/sailors gate.
Not yet exercised: `discoverSeas`/`computeSeas`/`seaName`, `revealHoldings`/3-tier intel payoff, `navalStrength`/`fleetCapacity`/`fleetSpeed` (never logged; fleets counts objects not ships), `islandDisembarkBlocked`, `tileYield`/`fertOf`/`terrainFit` yields.

## 4.10 espionage
Covered: `S.spyPosts`/`embedSpy`/`recallSpy`/`processSpies`, `spySight`/`spyTotal`/`freeSpies`, `deepIntelSection`/`spyEmbedded`, `s.jobs.spies`/`SKILLED.spies`, `hasTech("espionage")`.
Not yet exercised: (little to add — the domain has no other surface; the finding is that it's inert). `techIntelText`/`unitIntel` detail.

## 4.11 events
Covered: `randomEvents`/`naturalEvents`/`maybeRulerEvent`/`RULER_EVENTS`/`showRulerEvent` (auto-cleared), plague/flood/volcano triggers, `spawnPirateFleet`/`spawnNomadHorde`/`spawnRaidParty`/`spawnRebellion`/`spawnHamlet`, `checkAchievements`, `S.over` collapse, `W.ruins`/`W.factions` churn.
Not yet exercised: `resolveRulerEvent` choice outcomes (harness stubs the modal), event agency measurement, `placeVolcanoes` firing, per-event severity logging.

---

## Uncovered / candidate-new mechanics for `discover` to chase next
- **Health domain** (`treat`/`sanitation`/`quarantine`, `s.jobs.healers`, plague model) — not a cartridge yet; touched only obliquely by population mortality. Candidate new domain or population §addition.
- **Migration/refugee system** (`refugeePot`/`nomadPot`/`generateRefugees`/forced-resettlement edicts) — logged only via pop totals; deserves its own hooks under 4.2.
- **Camps / resource gathering** (`establishCamp`/`processCamps`/`raidCamps`/`W.camps`, `openGather`/`doGather`) — economy-adjacent, barely exercised.
- **Culture system** (`S.cultures`/`found_culture`/`cultMix`/`shiftCulture`/`assignRegionCultures`) — no cartridge; interacts with faith/diplomacy.
- **Wonders as identity** (`S.wonderSites`, per-wonder effects) — under-covered because wonders never build.
- **Naval detail** (`navalStrength`/`fleetCapacity`/transport/disembark) — exploration cartridge names them but they never fire.
- **Harness fidelity gaps (HARN-01/02/03)** — see LEDGER; several columns read "dead" only because the auto-policies never pull the lever. Re-run `setup` after teaching the harness those levers to distinguish dead game content from test-coverage gaps.
