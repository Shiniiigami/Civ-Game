# Civ-Game — Audit & Self-Improvement Control Script

**Claude Code: this single file is your complete instruction set.** No other file is required.
The user types short commands (`setup`, `audit economy`, `audit war`, `discover`, `ideas`,
`synthesis`, …). Find the matching section and carry it out fully, at depth, without asking the
user to re-explain. Everything you need — harness spec, per-domain cartridges, analysis lenses,
and the self-improvement protocol — is embedded below.

This is a **living tool**, meant to be re-run across the game's whole life. Every pass must
(a) verify prior findings, (b) surface net-new issues, (c) rotate to fresh angles, and (d) leave
the game and this process better than it found them. Treat repetition as failure: if an audit only
restates last time's findings, it did not do its job.

---

## 0. How the user drives this
1. `setup` — once (builds + runs the simulation harness, generates all data).
2. `audit <domain>` — any domain, any order, any time (writes/updates that domain's report).
3. `ui` — visual + interaction audit of the real rendered game on desktop AND mobile (§4.12); the
   headless sim harness no-ops rendering, so this is the only pass that sees layout/touch/console bugs.
4. `discover` / `ideas` — hunt for uncovered mechanics and improvement opportunities.
5. `synthesis` — cross-domain interactions (run after several domain audits).
6. `verify <finding-id>` — confirm a fix landed and didn't regress anything.

Commit after every command. Everything lives in `./audit_out/`.

---

## 1. Command: `setup`  (run once, before any audit)

Three steps, commit after each.

### 1a. Build the headless harness (`civgame_harness.js`)
- Read `./index.html`, extract the `<script>`, run it in a **stubbed DOM + localStorage** under Node
  (catch-all Proxy for elements; `document.getElementById` backed by a settable `INPUTS` registry so
  real `do*` functions that read `$("id").value` work headless).
- No-op for headless: `renderAll, drawMap, renderInfo, renderPanes, renderStats, renderActions, toast,
  showModal, closeModal, snapshotSeason, autoPersist, checkAchievements`. Auto-clear `showRulerEvent`
  (`S.pendingEvent=null`).
- Init each run: `S = newState(seed, {size:'medium', terrain:'continents', density:'balanced', ai:3,
  difficulty:'normal', start:'village', rulerName:'Rasa', dynasty:'Crownwater', realmName:'Audit',
  capitalName:'Riverhold', startAt:null})`.
  **Gotcha:** `density` MUST be `sparse|balanced|crowded` and `ai` MUST be a number, or the world
  generates with zero settlements and `makeWorld` throws on `player.owner`.
- Auto-play: each season, for each council category the archetype cares about, issue ONE real action
  (respect `S.actions[cat]` gating) via real functions, then `advanceSeason()`: `setResearch(id)`,
  `doSellGoods(id,'trade')` (set `INPUTS.sellRes`,`INPUTS.sellQty`), `doRaiseLevy(id,'military')`
  (set `INPUTS.levyNum`), `build(s,key,g,b,res)`, `setJob(id,job,val)`.
- Prove divergence first with 3 archetypes: **passive** (idle), **merchant** (economy tech + sell
  surplus + bazaars), **conquest** (military tech + levies + barracks). 2 seeds to year 100.
  **Expected:** passive collapses; merchant survives with a 5-digit treasury; conquest collapses early
  (upkeep, no raid income). Print a summary. Commit.

### 1b. Extend the harness
- **Combat resolvers:** battles are **not autoresolve** — they're CK3-style *phased* encounters (commit,
  then resolve over phases with decision points). Auto-resolve pending conquest/siege/battle/spoils from each
  policy by **stepping through every phase** (`conquestChoose`, `conquestNext`, `siegeAct`, `spoilsChoose`,
  and any per-phase decision the engine surfaces) until the encounter is fully concluded — don't just accept
  one modal and move on, or the fight stalls mid-encounter. Confirm conquest actually wins raids and takes
  captives (the `captives` column goes above zero).
- **All 10 archetypes** in `playSeason()`, each a distinct weighted policy (not a relabel):
  passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced,
  exploit-hunter (greedily chases highest-ROI action + probes degenerate loops).
  Archetype→lever map: **trade**=`doSellGoods/doBuyGoods/doForeignTrade/routeSet/doCaravan`;
  **military**=`doRaiseLevy/placeRecruitOrder/hireMercs/applyElite/formArmy/buildFleet`;
  **aggression**=`armyRaid/beginOrAdvanceSiege`; **faith**=`openFaith/faithEvolve/enactEdict`;
  **expansion**=`beginFound/foundAt/launchSettler/establishCamp`; **infra**=`build/buildMix/startWonder`;
  **tech**=`setResearch/advanceResearch`; **slaves**=`doEnslaveDistribute/settleCaptives/setSlaveJob`;
  **law/gov**=`openLawCode/setPlayerGov/enactEdict`; **diplo**=`setDiplo/arrangeMarriage/payNomadTribute`;
  **scout/spy**=`openScoutAt/confirmScout/embedSpy`.
- **Per-domain logging:** expand the yearly snapshot to cover every domain and emit ONE CSV per domain
  to `./audit_out/`: `economy.csv, population.csv, war.csv, faith.csv, infrastructure.csv, tech.csv,
  governance.csv, diplomacy.csv, exploration.csv, espionage.csv, events.csv`. Every file shares the
  IDENTICAL leading key columns `archetype,seed,year` so they JOIN. Commit.

### 1c. Freeze constants and run the full campaign
- **Freeze (never change — these are the primary keys):** seeds
  `[7,19,42,88,101,256,777,1337,4242,9001]`; the 10 archetypes above; the start `cfg`.
- Run 10 archetypes × 10 seeds × 100 years. Write every domain CSV + `master.json` to `./audit_out/`.
- If runtime is heavy, trim to the first 5 seeds — but freeze whatever you keep. (Cut seeds before
  archetypes; you need all 10 play styles for the comparisons.)
- Record the game version/content hash of `index.html` in `./audit_out/RUN_META.json` (git SHA + a
  hash of the `<script>`), plus runtime and which runs ended in collapse (`S.over`) and when. Commit.

After `setup`, every `audit <domain>` is pure analysis, no re-running — **unless** `discover` finds
`index.html` has changed materially, in which case re-run `setup` to refresh the data.

---

## 2. Standing lenses — apply ALL of these to EVERY audit

The per-domain cartridge lists domain-specific flags. On top of those, examine each domain through
these cross-cutting lenses. Not every lens fires for every domain — note the ones that do, and say
which you checked.

1. **Balance & tuning** — magnitudes, snowballing, scarcity; is any option a no-brainer or a trap.
2. **Meaningful choice** — are decisions real tradeoffs, or dominated/irrelevant? Flag false choices.
3. **Depth vs complexity** — does each mechanic's complexity earn its depth, or is it clicks without decisions?
4. **Legibility & feedback** — can the player tell what happened and *why*? Hidden math, silent failures,
   unexplained deltas (recall: authority silently collapses from low treasury — is that surfaced?).
5. **Pacing & arc** — early/mid/late feel. Dead late-game, stagnation traps, nothing-left-to-do plateaus.
6. **Feedback loops** — positive snowball vs negative spiral; are comebacks possible, or is a bad start fatal?
7. **Replayability & variety** — do seeds and archetypes actually feel different, or converge to one line?
8. **Emergent behavior** — surface *good* emergence to amplify, and *degenerate* emergence/exploits to fix.
9. **Thematic & historical coherence** — Persian/Zoroastrian identity; flavor, naming, plausibility for the
   ancient world; mechanics that contradict the setting (esp. faith × slavery × morality).
10. **Mobile & accessibility** — the game is mobile-first (Cinzel/Spectral, touch map). Touch targets,
    small-screen legibility, action count per season, tap friction.
11. **Performance & code health** — long/hot functions, legacy patches (`beachFleetFix`, `_navFix`,
    save-migration in `migrateGame`), places bugs cluster; anything O(n²) over settlements/cells.
12. **Opportunity / net-new** — what's *missing* that would add depth cheaply? A sink, a counterplay, a
    decision, a feedback signal. Propose concrete additions, not just critiques.
13. **Comparative design** — how do strong genre peers solve this same problem? Borrow a proven pattern.

Each report must end with an **Opportunities** section (lenses 12–13) separate from the bug/flaw findings:
2–5 concrete, scoped improvement proposals, each with the mechanic, the expected effect, and rough effort.

---

## 2.5 Design-pattern lenses — named tests borrowed from genre leaders

These are proven audit patterns from games that solved problems Civ-Game also faces. Reach for them
**by name** where they bite hardest. In each report, name any pattern lens you applied and its verdict.
Don't force all of them every time — use the ones flagged for that domain, plus any that fire.

- **Civ 6 — Snowball-inflection test.** Find the turn/year a lead becomes uncontestable, and whether every
  choice has a *visible opportunity cost* (Civ 6's district adjacency makes placement a real decision).
  *Bites:* economy, tech, infrastructure, governance. *Ask:* where's the inflection point, and can the AI
  still contest you past it? (Merchant banking 15k on one tile is a snowball inflection.)

- **Total War — Upkeep & battle-agency test.** Audit the campaign economy and the battle layer *separately*,
  then their handshake: does map income sustain the army the combat layer needs? Battles here are **CK3-style
  phased decisions** (commit → resolve over phases with choices), not autoresolve — so also test whether those
  in-battle decisions *matter*: do phase choices change outcomes, or is the result decided at commit and the
  phases just theatre? *Bites:* war, economy. *Ask:* is upkeep-as-share-of-economy tuned so war is a costed
  choice (not a trap — this killed the conquest archetype), and do the battle phases carry real agency?

- **CK3 — Story-generator test.** Do the systems *produce stories the player remembers* — a succession, a
  rivalry, a betrayal with reactive consequences — or just stat blocks? Flag "dead" characters and decisions
  with no drama. *Bites:* governance/succession, diplomacy, events. *Ask:* does ruling generate narrative, or
  administrative busywork?

- **Song of Syx — Strata-unrest test.** Deep population strata (citizens, slaves, others) each with needs,
  services, and a *mounting tolerance/unrest curve* — exploitation must carry escalating cost. *Bites:*
  population & slavery (primary), faith, governance. *Ask:* does the enslaved population create escalating
  pressure, or is it frictionless free labor? (Directly sharpens cartridge 4.2.)

- **EU4 — Sinks & overextension test.** Hunt runaway map-painting and unspent currency: expansion must have
  *brakes* (overextension, coring/aggressive-expansion costs) and every currency must have a *meaningful sink*.
  *Bites:* economy, expansion (exploration/settlers), governance. *Ask:* where are the brakes on wealth and
  expansion? (The expansionist archetype should hit a wall — if not, that's the finding.)

- **Paradox — Tall-vs-wide test.** Can a small, developed realm compete with a sprawling one, or is one
  strategy strictly dominant? *Bites:* infrastructure (tall) vs exploration/expansion (wide), economy.
  *Ask:* do builder and expansionist archetypes both have viable, distinct win-paths in the data?

- **EU3/CK3 — Phased-battle test.** Combat should resolve over **multiple phases with per-phase numbers,
  chance rolls, unit strengths, and situational bonuses** (terrain, leader, tech, matchup, morale), which the
  player clicks through — and sieges the same (invest → bombard → assault → sack, with walls/garrison/supply
  modifiers). *Bites:* war (primary). *Ask:* does the current combat deliver phased, legible, decision-bearing
  battles, or a single opaque roll? Measure the gap to the TARGET DESIGN in cartridge 4.3.

- **RimWorld/Dwarf Fortress — Emergent-anecdote test (apply at lesser weight than the others).** Does the
  simulation generate memorable, unscripted incidents (the raid that went wrong, the famine that forced a hard
  choice)? *Bites:* events, population, war. *Ask:* do the systems interact to create stories, or just apply
  independent stat modifiers? Use as a flavor/color check, not a core balance gate.

- **Civ/EU — Comeback-viability test.** After a bad start or a lost war, can a player recover, or is a poor
  opening fatal? (Rubber-banding vs. pure snowball.) *Bites:* every domain, especially economy/governance.
  *Ask:* in the data, does any archetype that falls behind by year 30 ever recover, or is collapse terminal?

---

## 3. Self-improvement protocol — how each pass compounds and finds new things

Every `audit <domain>` (and `synthesis`) MUST follow this, so the tool gets broader and sharper over time
rather than repeating itself.

**A. Load history.** Read the prior `./audit_out/report_<domain>.md` (if any) and the ledger
`./audit_out/LEDGER.md`. Note which lenses and angles were emphasized last time.

**B. Re-verify prior findings against fresh data.** For each open finding in that domain, check the current
CSVs: is it **fixed** (gone), **regressed** (back after a fix), **persisting**, or **changed in severity**?
Update its ledger status and note the game version where it changed.

**C. Rotate angles (novelty requirement).** Deliberately foreground at least **two standing lenses (Section 2)
that were NOT deeply used in the last audit of this domain**, and probe at least one **new hypothesis** not
examined before. The goal is to expand coverage each pass, not re-walk the same ground.

**D. Separate NET-NEW findings.** Put newly discovered issues in a clearly marked "New this pass" block at
the top of findings, distinct from carried-over/verified ones. This is the signal the user reads first.

**E. Propose experiments.** End with 1–3 concrete, testable hypotheses to probe next time ("if we halve levy
upkeep, does conquest stop collapsing?"), so future passes have a head start.

**F. Update the ledger** (`./audit_out/LEDGER.md`) and append to the **iteration log**
(`./audit_out/ITERATION_LOG.md`): date, game version, domain, lenses used, count of new/fixed/regressed
findings, and what to try next. Commit.

**G. Meta-check (every few passes or on request).** Is the harness still faithful (functions still named as
assumed)? Are the 10 archetypes still distinct in the data? Did `index.html`'s version/hash change since the
last `setup`? If mechanics changed, flag that `setup` should be re-run, and run `discover`.

---

## 4. Command: `audit <domain>`

Using the listed CSV (**do NOT re-run the sim** unless `discover` says the game changed), follow the
embedded cartridge, apply the Section 2 standing lenses AND the Section 2.5 design-pattern lenses flagged
for this domain (name each one you used and its verdict), obey the Section 3 self-improvement protocol,
and save the listed report. Report shape: **exec summary → (new-this-pass findings) → numbered sections →
findings tagged Critical/Major/Minor/Polish → problem-taxonomy flags → curves from the CSV → Opportunities
→ experiments to try next → appendix (seeds, archetype weights, game version).**

Synonyms: `pop`=population, `buildings`=infra, `religion`=faith, `military`=war, `research`=tech,
`naval`/`map`=exploration, `spies`=espionage, `politics`/`law`=governance.
`audit all` → every domain below, in order.

| command             | CSV                 | report file                          |
|---------------------|---------------------|--------------------------------------|
| `audit economy`     | economy.csv         | ./audit_out/report_economy.md        |
| `audit population`  | population.csv      | ./audit_out/report_population.md     |
| `audit war`         | war.csv             | ./audit_out/report_war.md            |
| `audit faith`       | faith.csv           | ./audit_out/report_faith.md          |
| `audit infra`       | infrastructure.csv  | ./audit_out/report_infrastructure.md |
| `audit tech`        | tech.csv            | ./audit_out/report_tech.md           |
| `audit governance`  | governance.csv      | ./audit_out/report_governance.md     |
| `audit diplomacy`   | diplomacy.csv       | ./audit_out/report_diplomacy.md      |
| `audit exploration` | exploration.csv     | ./audit_out/report_exploration.md    |
| `audit espionage`   | espionage.csv       | ./audit_out/report_espionage.md      |
| `audit events`      | events.csv          | ./audit_out/report_events.md         |

### Cartridge 4.1 — Economy, resources & trade
**Hooks:** `S.resources` (stone, brick, iron, copper, gold, silver, timber, horses, herbs, pearls, fish, elephants, clay, camels, reeds, salt, gems, amber), `S.econ{tax,trade,upkeep}`, `S.treasury`, `S.routes`, `production`, `refineGoods`, `goodPrice`/`buyPriceMult`/`sellPriceMult`, `complementaryGoods`, `caravanChance`, `routeIncome`/`routeEfficiency`, `adminCost`, tax (`TAXES`, `taxRate`, `taxMod`).
**Sections:** 1 Resources (source+sink each) · 2 Production & outputs · 3 Consumption & upkeep · 4 Trade & markets (pricing, volume, worthwhile?) · 5 Treasury/tax/inflation over time · 6 Growth & scaling curves · 7 Economic UI/UX · 8 Balance & tuning · 9 Bugs/impossible states · 10 Archetype comparison.
**Flag:** nonexistent resources · dead resources (never produced/consumed) · redundant econ buttons · over-generous rewards/snowball · supply too high (inflation) or too low (scarcity softlock) · dominant trade exploits · stagnation traps · are the `treasury>4000/12000` authority & graft thresholds meaningful or trivial?
**Improvement angles:** merchant hit ~15k treasury on one settlement — where are the money *sinks*? Is trade a real decision or a passive drip? Should surplus resources decay, or luxuries drive demand? Propose a sink/decision that makes wealth interesting.

### Cartridge 4.2 — Population, labor & slavery
**Hooks:** `ownedPop`, `popCeiling`/`arableCap`/`loyaltyCeiling`, `s.jobs{farmers,scholars,healers,merchants,spies,sailors,builders…}`, `s.slaveJobs{farmers,laborers,builders,mines,household}`, `S.captives`, `S.laws.slavery`, `doEnslaveDistribute`/`doTransferSlaves`/`settleCaptives`/`slaveSoldiers`/`slaveEff`/`assignedSlaves`, `processMigration`/`generateRefugees`/`refugeePot`/`nomadPot`, `agingAndSuccession` (births/deaths), `checkRevolts`/`spawnRebellion`, plague/famine via `naturalEvents`/`foodBalance`.
**Sections:** 1 Population categories · 2 Growth mechanics (gates: food/housing/faith) · 3 Mortality & loss · 4 Migration/refugees/nomad resettlement · **5 Enslaved/bonded** (acquisition; the 5 slaveJobs; upkeep; count toward caps?; revolt risk; manumission; faith/law interaction) · 6 Carrying capacity & caps · 7 Class/job mobility & one-way traps · 8 Labor allocation (jobs vs slaveJobs) · 9 Unrest/loyalty/revolt · 10 Population UI/UX · 11 Curves · 12 Archetype comparison.
**Flag:** phantom pop categories · dead categories · runaway growth vs death-spiral · caps too high/low · **enslaved mechanics that are pointless, OP, never interact, or contradict the Zoroastrian faith/morality theme** (enslavement with zero unrest/faith/loyalty cost; captives with no valid source or sink; slaveSoldiers with no downside) · missing sinks · impossible states (negative pop, sub-pop > total, captives with no origin).
**Improvement angles:** does slavery pose a real moral/mechanical dilemma, or is it free labor? Should faith (Zoroastrian) create escalating unrest or reform pressure? Is there a manumission→loyalty payoff worth choosing? Propose the tension that makes the choice matter.

### Cartridge 4.3 — War, military & recruitment
**Hooks:** `S.armies`/`S.fleets`/`S.generals`, unit roster & `armyComp`/`fieldableUnit`/`unitsPowerRaw`, `levyCap`/`doRaiseLevy`/`levyUnitCost`, `openRecruitOrder`/`syncRecruit`/`updateRecruitQuote`, `hireMercs`/`mercQuote`, `applyElite`/`eliteSourcePool` (retinue), `armyBattle`/`armyVsArmy`/`ck3Battle`/`navalBattle`, `siegeStrength`/`siegeAct`/`beginOrAdvanceSiege`, `supplyLine`/`updateArmySupply`/`inSupply`, `processTraining`/`trainingRate`, `processDesertion`, upkeep in `S.econ.upkeep`.
**Sections:** 1 Unit roster (cost/power/upkeep/who fields it) · 2 Recruitment paths (levy vs recruit vs merc vs elite) · 3 Supply & upkeep (share of economy) · 4 Combat resolution (battle/siege/naval math, RNG swing) · 5 Training & desertion · 6 Retinue/elite gating · 7 War UI/UX · 8 Balance (dominant unit? free wins?) · 9 Bugs/impossible states · 10 Archetype comparison.
**Flag:** dead units (never recruited) · dominant unit/stack · upkeep too low (free armies) or too high (unsustainable) · merc pricing exploits · siege/battle auto-win or unwinnable · supply lines that never bite · retinue mandatory or useless.
**Improvement angles:** the smoke test showed conquest collapsing because troops cost upkeep with no raid return — is the raid→loot loop rewarding enough to justify war at all? Is there a reason to field the whole 6-tier roster, or does one unit dominate? Propose the payoff that makes militarism a viable path, not a trap.
**TARGET DESIGN — battles & sieges (EU3/CK3-style phased combat).** The intended combat model, which the war
audit should measure the current system against and the Opportunities section should push toward:
- Battles resolve over **multiple named phases the player clicks through** (e.g. skirmish/missile → shock/charge
  → melee → pursuit/rout), not a single roll. Each phase shows **numbers**: participating unit counts and
  strengths, the **chance/dice roll** for that phase, and the **situational bonuses/penalties** applied
  (terrain, river-crossing, leader/general skill, tech, unit-vs-unit matchup, morale, being outnumbered).
- Unit strength and morale **carry and change across phases** — casualties and morale shifts from phase 1 feed
  phase 2; a rout ends it early. Show the running tally each click.
- **Sieges are phased likewise**: distinct phases (invest/blockade → bombard/mine → assault → sack or the
  defender's sally), each with its own numbers, chance roll, and modifiers (walls/fortress level, garrison,
  supply/starvation timer, siege equipment/tech). The player clicks through and makes a decision per phase
  (press the assault, wait out starvation, offer terms).
- Audit questions: are the phases *legible* (can the player read why they won/lost each phase)? Do the
  per-phase decisions carry **real agency** (change outcomes) or are they theatre decided at commit? Is the
  bonus stack transparent, or a hidden black box? Is there swingy RNG that feels unfair vs. a fair
  strength+roll blend? Flag any gap between the current implementation and this target as findings + opportunities.

### Cartridge 4.4 — Faith & religion
**Hooks:** `S.faith` (doctrines), `S.faithPower`, `S.faithTier`/`faithTierOf`/`faithTierProps`, `faithEvolve`/`faithDrift`/`shiftFaith`/`faithShare`/`dominantFaith`, `convResist`/missions (`missionStrength`/`missionGain`), `enactEdict` (devotion), `S.laws.faith`, theocracy gov, faith wonders (cathedral/monastery/pantheon), faith×slavery interaction.
**Sections:** 1 Faith mechanics & tiers · 2 Faith power sources/sinks · 3 Conversion/missions/resistance · 4 Doctrines & effects · 5 Faith buildings/wonders/edicts · 6 Faith × government (theocracy) · 7 Faith × slavery/morality (theme coherence) · 8 Faith UI/UX · 9 Balance & snowball · 10 Bugs · 11 Archetype comparison.
**Flag:** doctrines with no effect · faithPower with no meaningful sink · conversion auto-succeeds or never · faith tier stuck/unreachable · theme incoherence (Zoroastrian realm with amoral slavery, no faith friction) · faith snowball trivializing unity.
**Improvement angles:** does faith express a distinct *Zoroastrian* identity (dualism, fire, truth/lie, purity) or is it generic religion? Are doctrines real strategic forks? Propose flavor+mechanics that make the faith path feel authored, not palette-swapped.

### Cartridge 4.5 — Infrastructure, buildings & wonders
**Hooks:** `s.infra{bazaar,woodcamp,quarry,mine,fishery,herbalist,workshop,aqueduct,fortress,academy,dam,stable,pen}`, `build`/`buildMix`/`buildPreview`/`costHtml`, `resourceBuilding`, `buildBridge`/`buildDam`/`destroyDam`, `barracksCap`/`scholarCap`/`arableCap` (caps), wonders (`S.wonders`: cathedral, library, palace, monastery, arsenal, pantheon, colossus, forum), `startWonder`/`processWonder`/`wonderCooldownYear`.
**Sections:** 1 Building roster (cost/prereqs/effect/cap) · 2 Wonders (cost/time/payoff) · 3 Capacity effects · 4 Build economy (sinks) · 5 Build UI/UX · 6 Balance (must-build vs never-build) · 7 Bugs · 8 Archetype comparison.
**Flag:** dead buildings · buildings with no visible effect · wonders whose payoff never justifies cost (or auto-includes) · cap math making a building pointless · resource sinks too cheap/expensive · redundant build buttons.
**Improvement angles:** which buildings does every archetype build (auto-include = not a choice) and which does none (dead)? Do wonders feel epic and identity-defining or like stat sticks? Propose differentiation so building order expresses strategy.

### Cartridge 4.6 — Technology & research
**Hooks:** `S.tech` list (writing, currency, masonry, smelting, metallurgy, irrigation, horsemanship, engineering, bureaucracy, philosophy, accounting, scriptoria, scholarship…), `techAvailable`/`hasTech`/`techTier`/`techTierName`, `advanceResearch`/`researchOutput`/`researchProg`/`bumpResearch`, scholars (`scholarCap`/`scholarPool`/`trainSkilled`), `allTechDone` (end state), tech gating across every system.
**Sections:** 1 Tech tree (each tech: cost/prereqs/unlocks) · 2 Research rate & scholar economy · 3 Gating (does tech gate meaningful things) · 4 Tech end-game (allTechDone → what then?) · 5 Tech UI/UX · 6 Balance (must-rush vs skippable) · 7 Bugs (prereq loops, unreachable) · 8 Archetype comparison.
**Flag:** techs that unlock nothing · prereq loops/unreachable tech · research too fast (tree by yr 20) or too slow (never finishes) · single must-rush tech that dominates · scholar cap trivial/impossible · stagnation after allTechDone.
**Improvement angles:** is the tree a meaningful path with forks, or a linear checklist? Does any archetype have a distinct tech identity? What happens at the end — is there late-game direction? Propose branches/eras that keep research a live decision.

### Cartridge 4.7 — Governance, law, authority & succession
**Hooks:** `S.gov` (monarchy/empire/khanate/citystate/republic/theocracy) + `govEvolve`/`playerGovDrift`/`govName`, `S.laws{succession,slavery,military,faith,local}` + `openLawCode`/`setSuccessionLaw`/`lawCap`/`lawChanges`, `S.authority`/`S.unity`/`S.prestige` (drivers in `advanceSeason`), `S.edicts`/`enactEdict`/`edictCost`, `S.taxRate`/`TAXES`, dynasty/succession (`agingAndSuccession`/`heirOf`/`eligibleHeirs`/`isElective`/`marriageInheritance`/`openSuccession`), `checkRevolts`.
**Sections:** 1 Government types & drift · 2 Law codes & effects · 3 Authority/unity/prestige economy (sources/sinks) · 4 Edicts · 5 Taxation × unity/authority · 6 Succession & dynasty (heirs, elective vs cognatic, crises) · 7 Revolts · 8 Governance UI/UX · 9 Balance · 10 Bugs · 11 Archetype comparison.
**Flag:** gov types strictly better/worse (dominant) · laws with no effect · authority/unity that only rises (no threat) or death-spirals · succession softlock (no valid heir → game over, no counterplay) · unused edicts · no-brainer tax tiers.
**Improvement angles:** authority is the hidden kill-switch (empty treasury → collapse) — is that legible and fair, or a silent death-spiral? Do government types offer real identity? Is succession a dramatic event or an admin chore? Propose the tension that makes ruling feel political.

### Cartridge 4.8 — Diplomacy & relations
**Hooks:** `S.relations`/`relOf`/`diploOf`/`diploState`/`diploTag`/`setDiplo`, `atWar`/`isAllied`/`isPact`/`declareWarFor`, `S.tributes`/`tributeDemand`/`payNomadTribute`/`underTribute`, `S.claims`/`hasClaim`, `assignSpheres`, marriages-as-diplomacy (`arrangeMarriage`/`marriageInheritance`), AI drivers (`factionAggr`/`factionGreed`/`hostAcceptRate`).
**Sections:** 1 Relations model · 2 War/peace · 3 Pacts/alliances/spheres · 4 Tribute · 5 Claims · 6 Marriage diplomacy · 7 AI behavior (reactive/exploitable?) · 8 Diplomacy UI/UX · 9 Balance · 10 Bugs · 11 Archetype comparison.
**Flag:** diplomacy states with no effect · AI that never/always accepts · tribute exploits · alliances that never trigger · claims that do nothing · marriage-inheritance loopholes · isolationist archetype proving diplomacy is entirely skippable.
**Improvement angles:** does the AI *react* to the player or just run scripts? Is peace ever a strategy, or only war? Are neighbors characters or wallpaper? Propose reactive AI behavior or a diplomatic win-path that makes the world feel alive.

### Cartridge 4.9 — Exploration, map & naval
**Hooks:** intel tiers (`s.intel`/`markSeen`/`worldKnown`/`revealHoldings`), scouting (`openScoutAt`/`resolveScout`/`scoutRadius`/`updateScoutCost`), fleets (`buildFleet`/`fleetPower`/`fleetCapacity`/`fleetSpeed`/`navalStrength`), seas (`discoverSeas`/`computeSeas`/`seaName`/`renameSea`), settlement/colonization (`launchSettler`/`foundAt`/`settlerArrive`/`islandDisembarkBlocked`), terrain (`tileYield`/`fertOf`/`terrainFit`).
**Sections:** 1 Intel/fog tiers · 2 Scouting economy · 3 Naval movement & capacity · 4 Sea discovery/naming · 5 Colonization/settlers · 6 Terrain & yields · 7 Map UI/UX · 8 Balance · 9 Bugs (unreachable land, stuck fleets, `beachFleetFix`/`_navFix` legacy patches) · 10 Archetype comparison.
**Flag:** scouting not worth the cost or mandatory · intel tiers revealing nothing new · naval softlocks (beached fleets, unreachable islands) · settlers starving en route (`settlerEat`) unavoidably · terrain yields making whole biomes dead.
**Improvement angles:** is discovery rewarding — do you *want* to explore, or is the map static wallpaper? Does the 3-tier intel system pay off? Is naval a real theatre or an afterthought? Propose exploration rewards or map events that make the world worth uncovering.

### Cartridge 4.10 — Espionage & intel
**Hooks:** `S.spyPosts`/`embedSpy`/`spyEmbedded`/`recallSpy`/`processSpies`, `spySight`/`spyTotal`/`freeSpies`, `deepIntelSection`/`unitIntel`/`techIntelText`, spies as a job (`s.jobs.spies`/`openSkillOrder`).
**Sections:** 1 Spy mechanics · 2 Spy economy (cost vs payoff) · 3 Intel gained (actionable?) · 4 Counter-intel · 5 Spy UI/UX · 6 Balance · 7 Bugs · 8 Archetype comparison.
**Flag:** spies that gain nothing actionable · spy cost mismatch · intel duplicated by free scouting · no counterplay (spies undetectable/unremovable).
**Improvement angles:** does any archetype ever bother with spies? If not, why do they exist — cut or empower? Is intel actionable or flavor? Propose a use-case (sabotage, assassination, war prep) that makes espionage a real lever, or recommend simplifying it away.

### Cartridge 4.11 — Events & random systems
**Hooks:** `randomEvents`/`naturalEvents`/`maybeRulerEvent`/`showRulerEvent`/`resolveRulerEvent`, plague, `placeVolcanoes`, `spawnPirateFleet`/`spawnNomadHorde`/`spawnRaidParty`/`spawnRebellion`, `checkAchievements`.
**Sections:** 1 Event catalogue & triggers · 2 Frequency/severity over 100y · 3 Player agency in events · 4 Event UI/UX · 5 Balance (swinginess) · 6 Bugs · 7 Archetype comparison (who gets hammered).
**Flag:** events with no choice/impact · events too frequent/rare · unrecoverable disaster spirals · ruler events that always resolve the same · achievements that never/always fire.
**Improvement angles:** do events feel authored and dramatic, or like random stat noise? Do they respect the player's state (kick you when down = bad)? Are choices real dilemmas? Propose event chains or reactive events that create story, and flag swingy RNG that feels unfair.

---

## 4.12 Command: `ui`  (visual + interaction audit — the eyes the sim harness lacks)

The `setup` harness runs headless and **no-ops all rendering**, so it is blind to visual and touch
bugs. `ui` fills that gap: it drives the **real rendered game** with Playwright (already set up in
this repo) across desktop browsers AND emulated mobile devices, walks every major surface and modal,
screenshots each, and runs automated checks. The game is **mobile-first**, so treat mobile as the
primary target and desktop as secondary.

Run it with: `node civgame_ui_audit.js`

**Load on both browser and mobile:**
- **Desktop:** Chromium at 1280×800 and 1920×1080. (Firefox/WebKit are attempted only if their
  browser binaries are present — in this environment only Chromium is installed, so cross-browser is
  Chromium + Chromium-based mobile emulation; the report says so.)
- **Mobile:** real device emulation via `playwright.devices` (mobile UA, `hasTouch:true`,
  `isMobile:true`, correct `deviceScaleFactor` and viewport — not a resized window): **iPhone 13
  portrait + landscape, Pixel 7 portrait, iPhone SE** (small-screen cramped-layout check).

**On each device/browser it:**
1. Loads `index.html`, boots a developed mid-game realm (founds a faith, scouts a neighbour, advances
   ~8 seasons) so mid-game UI is exercised.
2. Walks the surfaces and opens each major panel/modal: map (terrain + realms views), Chronicle,
   Court, Realm, Faith, Codex; the Seasonal Council (every tab); and the key action modals — build/
   trade/research/recruit/levy/faith/law/scouting/mercs — plus a **battle** and a **siege** (and
   conquest) modal, triggered with representative data.
3. Screenshots each surface (`audit_out/ui/<device>/<surface>.png`) and checks for: layout overflow /
   horizontal scroll on mobile / off-screen / clipped text; tap targets under ~44×44px; broken
   display values (`NaN`, `undefined`, `[object Object]`, `Infinity`); console errors & pageerrors;
   modals that fail to open.
4. Applies the Section 2 UX-judgment lenses as human-eye pointers (legibility — is the authority/
   treasury death-spiral surfaced?; tap-count/friction per season; discoverability; mobile
   ergonomics), noting on the report **where to look** in the screenshots.

**Output:** `audit_out/report_ui.md` (findings ranked major→minor, mobile-only called out, console
errors, modal-open failures, UX notes) · `audit_out/ui/findings.json` (raw, per device×surface) ·
screenshots under `audit_out/ui/<device>/`. Commit. Re-run after any UI change to `index.html`.

---

## 5. Command: `discover`  (find NEW / uncovered mechanics — run periodically as the game grows)

The point of a living tool: catch mechanics the audit doesn't yet cover.
1. Scan `./index.html` for all `S.*` state fields and top-level `function` names.
2. Diff against the hooks listed in cartridges 4.1–4.11 and against `./audit_out/COVERAGE.md` (create if absent).
3. Report **uncovered mechanics**: state fields/functions not referenced by any cartridge — likely new or
   never-audited systems. For each, guess its domain and propose either a cartridge addition or a brand-new
   domain + CSV columns.
4. Diff the current `index.html` version/hash against `./audit_out/RUN_META.json`. If it changed, list what's
   new since last `setup` and recommend re-running `setup` so data reflects the current game.
5. Update `./audit_out/COVERAGE.md`. Commit.

## 6. Command: `ideas`  (proactive design improvement — not tied to one domain)

Freeform improvement hunt across the whole game, leaning hardest on Section 2 lenses 12–13.
- Read all existing reports + LEDGER for context; do NOT repeat prior proposals.
- Produce 5–10 **new** concrete proposals: each with the problem it solves, the mechanic, expected effect on
  which archetypes, thematic fit (Persian/Zoroastrian), rough effort (S/M/L), and any risk.
- Rank by impact × feasibility. Save to `./audit_out/IDEAS_<date>.md`. Commit.

## 7. Command: `synthesis`  (run after several domain audits)

JOIN all domain CSVs on `archetype,seed,year`. Trace causal chains across domains (food shortfall → mortality
→ revolt; military upkeep → treasury collapse → authority death-spiral; slave capture → faith/loyalty friction;
rushed tech → broken economy; wonder → runaway snowball). Cite exact rows, classify severity, and end with the
**top 10 fixes** ranked by impact × archetypes affected. Apply the Section 3 protocol (verify prior synthesis,
foreground new chains). Save to `./audit_out/report_synthesis.md`. Commit.

## 8. Command: `verify <finding-id>`  (confirm a fix)

For a ledger finding the user has since fixed in `index.html`: re-run `setup` (data must reflect the new code),
then re-check that finding's metric in the fresh CSVs. Report **fixed / partially fixed / not fixed / new
regression elsewhere**. Update LEDGER status and the game version. Commit.

---

## 9. Ledger & iteration-log formats

`./audit_out/LEDGER.md` — one row per finding, the memory across passes:
```
| id      | domain     | severity | title                              | status   | first_seen | last_seen | game_ver |
|---------|------------|----------|------------------------------------|----------|------------|-----------|----------|
| ECON-001| economy    | Major    | No treasury sink; merchant hits 15k| open     | v5 2026-07 | v5 2026-07| <sha>    |
| WAR-003 | war        | Critical | Levy upkeep with no raid return    | open     | v5 2026-07 | v5 2026-07| <sha>    |
```
Statuses: `open` · `fixed` · `regressed` · `changed` · `wontfix`. Never delete rows — history is the value.

`./audit_out/ITERATION_LOG.md` — one entry per command run:
```
## 2026-07-12 · audit economy · game v5 <sha>
Lenses foregrounded: sinks (12), pacing (5), comparative (13)
New: 2 (ECON-004, ECON-005) · Verified fixed: 0 · Regressed: 0 · Still open: 3
Next time: test whether luxury-demand or upkeep scaling tames the treasury snowball.
```

`./audit_out/COVERAGE.md` — which `S.*` fields / functions each cartridge covers, so `discover` can diff.

---

## Engine reference (for the harness)
- One `<script>` in `index.html`. Globals `S` (state), `W` (world), `cam`.
- Turn engine: `advanceSeason()`. Init: `newState(seed,cfg)` (auto-picks a capital when `startAt:null`).
- 4 seasons/year (`SEASONS=[Spring,Summer,Autumn,Winter]`) → 100 years = 400 `advanceSeason()` calls.
- Council: one action per category via `S.actions` + the `CATEGORIES` map. `S.actions` resets each season.
- Ready-made logging hooks: `S.econ{tax,trade,upkeep}` (per season), `S.seasonReport`, `chronicleYear()`,
  `ownedPop()`, `S.treasury`, per-settlement `s.jobs`/`s.slaveJobs`/`s.infra`/`s.stores`/`s.loyalty`.
- Game-over: `S.over` true if `authority<=0` or no settlements. Log the year it ends.
- Determinism: seeded RNG (`rng(seed+year*k+season*k)`) — same seed + same policy ⇒ identical run.
- Bug-cluster zones: `migrateGame` (save-migration), `beachFleetFix`/`_navFix` (naval placement).
