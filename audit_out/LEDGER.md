# Crown Waters — Audit Ledger

One row per finding — the memory across audit passes. **Never delete rows** (history is the value).
Statuses: `open` · `fixed` · `regressed` · `changed` · `wontfix`.
Campaign game version for all rows below: **git `62523dc`** (script sha256_16 `4075d3270dbab183`), 288-run frozen dataset (16 archetypes × 6 scenarios × 3 seeds × 100y = 18,718 rows).

> **Cross-domain headline (verified by 3 independent diagnostics — war, exploration, events):** the "`advanceSeason` throws on large maps" premise is **FALSE**. 0 exceptions in 288 runs. The ~103 runs that appear to "end early with over=0" are **mid-year authority collapses**; the `over` column is only written on a year boundary, so a mid-year collapse logs the prior year with `over=0`. 43 `over=1` + 103 `over=0`-early = 146 = RUN_META's true collapse count. This is a **harness logging artifact (HARN-01)**, not an engine bug — engine robustness is excellent.

| id | domain | severity | title | status | first_seen | last_seen | game_ver |
|---|---|---|---|---|---|---|---|
| ECON-001 | economy | Critical | Empty-treasury → authority death-spiral is silent & ~65%-terminal (220/288 runs hit treasury≤1; 65% of those collapse) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-002 | economy | Critical | No working treasury sink → runaway snowball (max 149,854g; graft@12k skims 0.4%; accounting +2% is positive feedback) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-003 | economy | Major | Trade-route system (8-factor routeIncome) never fires — routes=0 in 100% of rows (HARNESS: policies never openRouteOrder) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-004 | economy | Major | Goods sales bypass the trade ledger — doSellGoods adds to treasury but not econ.trade, so the `trade` column mislabels earnings | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-005 | economy | Major | Aggressive archetypes are economic traps — 53–75% net-negative seasons (slaver 75/faith 58/nomad 57/conquest 53) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-006 | economy | Major | Kingdom start trivializes the economy (45/48 survive, mean final 33,580g vs 1–3k elsewhere) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-007 | economy | Major | graft@12,000 threshold is cosmetic (0.4% skim), not a sink | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-008 | economy | Minor | `gold` commodity near-dead (changes in 4/288 runs) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-009 | economy | Minor | treasury>4000 authority rung (+0.3/season) reinforces the snowball (rich-get-richer) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-010 | economy | Minor | Archipelago economic starvation (12/48 reach yr100, mean final 1,061g) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ECON-011 | economy | Polish | economyPanel doesn't surface the treasury→authority coupling (legibility) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| POP-001 | population | Critical | Slavery is frictionless free labour — enslaving captives costs 0 unity/authority/faith; unity is *higher* with slaves; revolt threshold hit in 16/18,718 rows | open | 2026-07-13 | 2026-07-13 | 62523dc |
| POP-002 | population | Major | Slavery is a one-way trap & dead for 13/16 archetypes — 0 voluntary manumissions; slaver ends smallest survivor pop (4,050) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| POP-003 | population | Major | Captives have no sink for non-slavers — nomad freezes 35 captives all run (669/722 nonzero captivesNow rows are nomad) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| POP-004 | population | Minor | `captivesNow` near-dead column (nonzero 722/18,718; 92% the nomad artifact) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| POP-005 | population | Minor | `freePop+slaves ≠ pop` in 285 rows — mobilized levies are an unlogged population category (legibility) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| POP-006 | population | Minor | `popCeiling < pop` overshoot in 24 late-game kingdom rows (soft-cap lag) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| POP-007 | population | Polish | slaveEff 1.2× makes slaves a strict labour no-brainer (no upkeep, no biting revolt risk) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| WAR-001 | war | Critical | Militarism is a costed upkeep trap — upkeep 80–109% of income; conquest collapses 13/18 (mean yr39) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| WAR-002 | war | Major | Phased war/siege layer is inert — warsActive nonzero in 104/18,718 (3 runs); sieges in 11/18,718 (all conquest) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| WAR-003 | war | Major | Raid loop bypasses war/siege/conquest — armyRaid gives loot+captives (max 286) with no siege/war state (degenerate) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| WAR-004 | war | Major | Battle phases carry no agency — ck3Battle runs all 3 phases in one call with random tactics (theatre decided at commit) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| WAR-005 | war | Minor | war.csv can't see the roster (no unit-tier columns; armies cap at 2) — dominant-stack/dead-unit analysis blind | open | 2026-07-13 | 2026-07-13 | 62523dc |
| WAR-006 | war | Minor | processDesertion fires too late (only at treasury ≤ upkeep×0.8, after the spiral starts) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| FAITH-001 | faith | Major | faithPower has no sink — pure monotone accumulator (0/576 season transitions decrease) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| FAITH-002 | faith | Major | 3 of 8 doctrines mechanically dead (ascetic, monumental, charitable = 0 code refs) — 2nd-doctrine slot near-false-choice | open | 2026-07-13 | 2026-07-13 | 62523dc |
| FAITH-003 | faith | Major | Faith×slavery friction negligible & inverted — only hook is opt-in `abolition` +0.05 unrest; default = zero (theme incoherence) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| FAITH-004 | faith | Major | Faith path is a survival trap — 15/18 faith runs collapse yr17–34; founding drains a starting treasury | open | 2026-07-13 | 2026-07-13 | 62523dc |
| FAITH-005 | faith | Minor | No convergence & no schism — distinctFaiths never →1; organized faiths immortal (0/576 decreases) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| FAITH-006 | faith | Minor | convert→absorb loop rarely fires (faith realm dies before 60% conversion) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| FAITH-007 | faith | Polish | Zoroastrian identity is flavour-only (fire/light deity names but no Asha/Druj/purity/fire-tending mechanics) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| INFRA-001 | infrastructure | Critical | Wonders effectively dead — max wonders=1 across 18,718 rows; 279/288 runs end 0; only builder (Great Library, build-once) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| INFRA-002 | infrastructure | Major | Tall-vs-wide is a non-choice — all archetypes avg 1.1–1.5 settlements; wide never exists to compete | open | 2026-07-13 | 2026-07-13 | 62523dc |
| INFRA-003 | infrastructure | Major | Uncapped walls = infinite linear late-game sink (builder|kingdom|19: walls 3→43, infraTotal→162) — walls absent from tier cap | open | 2026-07-13 | 2026-07-13 | 62523dc |
| INFRA-004 | infrastructure | Major | HARNESS: build() bypasses act()'s level-3 tier cap (spymaster|kingdom = 81–99 bazaars in 2 settlements) — inflates market/infraTotal | open | 2026-07-13 | 2026-07-13 | 62523dc |
| INFRA-005 | infrastructure | Minor | Temples faith-locked, near-dead as infra (3/156 survivors; 270/288 runs end 0) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| INFRA-006 | infrastructure | Minor | HARNESS: 15/16 archetypes never call startWonder (wonder layer untested outside builder) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| INFRA-007 | infrastructure | Polish | Barracks is an auto-include (127/156 survivors, modal value exactly 1) — a checkbox, not a decision | open | 2026-07-13 | 2026-07-13 | 62523dc |
| TECH-001 | tech | Critical | Golden-Age/Edict end-game unreachable dead content — allTechDone=1 in 0/18,718 rows | open | 2026-07-13 | 2026-07-13 | 62523dc |
| TECH-002 | tech | Critical | Research ~2–3× too slow to finish the tree in a lifetime — best case techlord 14/39 by ~yr61; full tree ~200yr | open | 2026-07-13 | 2026-07-13 | 62523dc |
| TECH-003 | tech | Major | 21 of 39 techs never researched in 288 runs — entire naval/siege/high-gov/capstone branches dead in practice | open | 2026-07-13 | 2026-07-13 | 62523dc |
| TECH-004 | tech | Major | Research goes fully idle mid/late game — 100% of survivors at yr≥90 have no active research | open | 2026-07-13 | 2026-07-13 | 62523dc |
| TECH-005 | tech | Major | Scholar economy inert for 15/16 archetypes (scholars=0; partly harness) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| TECH-006 | tech | Minor | Research gold-gated, dies with the economy (couples tech to the treasury death-spiral) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| TECH-007 | tech | Minor | "Live" tree is a narrow shared econ trunk (~8 techs), not a branching choice — false choice | open | 2026-07-13 | 2026-07-13 | 62523dc |
| TECH-008 | tech | Polish | HARNESS: techlord wishlist omits law/banking/navigation → caps at exactly 14 (orphans bureaucracy/accounting/astronomy/naturalphil) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| GOV-001 | governance | Critical | Authority death-spiral is SILENT — authority absent from S.seasonReport while unity (shown) sits at 88 straight into collapse | open | 2026-07-13 | 2026-07-13 | 62523dc |
| GOV-002 | governance | Major | Prestige is a dead stat — never decreases in any of 288 runs; write-only, no reader gates anything | open | 2026-07-13 | 2026-07-13 | 62523dc |
| GOV-003 | governance | Major | 4 of 8 gov types unreachable (empire/khanate/citystate/tribal = 0 rows); all drift ends at republic | open | 2026-07-13 | 2026-07-13 | 62523dc |
| GOV-004 | governance | Major | Taxation is a false choice — only light/normal of 5 tiers used; taxRate never changes mid-run (0/288) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| GOV-005 | governance | Minor | Chiefdom strictly dominated (no authority/unity bonus) yet ~30% of realms start there | open | 2026-07-13 | 2026-07-13 | 62523dc |
| GOV-006 | governance | Minor | Succession has no drama — 0 succession/contested-heir events surfaced in 288 runs (CK3 story-gen FAIL) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| GOV-H1 | governance | Polish | HARNESS: lawChanges=0 for all 18,718 rows — law mechanic works in code; auto-player never calls the law levers | open | 2026-07-13 | 2026-07-13 | 62523dc |
| DIP-001 | diplomacy | Major | Alliances unreachable — allies=0 in all 18,718 rows, incl. the diplomat; marriage+pact never crosses the rel≥40 gate; ally gift/siege-aid code dormant | open | 2026-07-13 | 2026-07-13 | 62523dc |
| DIP-002 | diplomacy | Major | Neighbours are wallpaper — factionAggr never reads S.relations[player]; AI reacts only to 2 binary flags (pact/tribute shields) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| DIP-003 | diplomacy | Major | Claims are inert — diplomat reaches 6 claims but warsActive=0 in all its rows; claim→press_claim loop never closed | open | 2026-07-13 | 2026-07-13 | 62523dc |
| DIP-004 | diplomacy | Minor | warsActive near-dead & never AI-initiated (104/18,718, conquest-only); make_peace dead | open | 2026-07-13 | 2026-07-13 | 62523dc |
| DIP-005 | diplomacy | Minor | Pacts churn silently — 8-year lapse sawtooths the pact web (16→0→10→1) with no renewal prompt | open | 2026-07-13 | 2026-07-13 | 62523dc |
| DIP-006 | diplomacy | Minor | Tribute is flat/low-ceiling (diplomat ~1/yr, one raider target) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| DIP-007 | diplomacy | Polish | HARNESS: relations column logs realm-count not warmth (scalar warmth invisible in CSV) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EXPL-001 | exploration | Critical | Naval unbuildable in practice — fleets>0 in 0/240 non-kingdom runs; the only fleets are the kingdom start-gift | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EXPL-002 | exploration | Critical | Archipelago effectively unwinnable — 12/48 reach yr100, map ≤2.5% explored; naval-critical map gets zero naval | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EXPL-003 | exploration | Major | Wide expansion strangled — settlements mean 1.26, grew in only 18/288 runs (SETTLER_MIN=300 + early collapse) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EXPL-004 | exploration | Major | Thalassocrat is a relabel — indistinguishable from passive (+0.8pp seenPct after 100y); false choice | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EXPL-005 | exploration | Minor | (VERIFY/CLOSE) advanceSeason crash refuted — 0 throws; early-ends are over=true collapses (snapshot artifact) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EXPL-006 | exploration | Polish | `scoutRadius` dead column (constant 220 across all rows) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EXPL-007 | exploration | Minor | `fleets` metric counts fleet-objects not ships (an armada logs fleets=1) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EXPL-009 | exploration | Major | Discovery is unrewarding — seenPct ceiling 7.6%, fog never lifts, 3-tier intel unused | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ESP-001 | espionage | Major | Espionage yields nothing actionable (sight-only) — no sabotage/assassination/theft/incite | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ESP-002 | espionage | Major | No counter-intel; AI never spies (player spies undetectable/unremovable) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ESP-003 | espionage | Major | Intel duplicated by free scouting (both reach intel=4) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ESP-004 | espionage | Minor | Spy cap binds at ~4 in every surviving run; supply maxed then idle (freeSpies>0 in 3/18,718 rows) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ESP-005 | espionage | Minor | 60g prestige cost for a flavour-only payoff = soft trap (priciest skilled unit, no return) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| ESP-006 | espionage | Polish | HARNESS: 15/16 archetypes never embed spies (design-faithful test gap) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EVT-001 | events | Critical | (analysis) advanceSeason "crash" is a myth — 0 throws/288 runs; 43 over=1 + 103 over=0-early = 146 collapses (logging artifact) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EVT-002 | events | Major | Frequent random/natural events have zero player agency (~160+ silent stat-nudges/game) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EVT-003 | events | Major | Events fail comeback-viability — disasters hit the player regardless of realm health; no rubber-banding | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EVT-004 | events | Minor | Only 6 ruler-event templates (~0.4/yr), recycled ~40×/game, and sim-invisible | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EVT-005 | events | Minor | World proliferates, never consolidates (factionsAlive 3.7→28.8, ruins 27→149; player conquests/yr≈0) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EVT-006 | events | Polish | Dead achievements (yr200/yr300 unreachable in a 100y game; pop250k likely never) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| EVT-008 | events | Minor | Uncounterable regicide (assassination → rulerDies with no defense option) | open | 2026-07-13 | 2026-07-13 | 62523dc |
| HARN-01 | harness | Major | snapWide logs only on year-rollover → mid-year collapses record over=0 at prior year; the `over` column undercounts collapses (43 of 146). Fix: emit a final row when S.over flips. | open | 2026-07-13 | 2026-07-13 | 62523dc |
| HARN-02 | harness | Minor | Policy lever gaps make several columns look dead: routes (openRouteOrder), spies (15/16), laws (lawChanges=0), scholars (15/16), wonders (15/16), 9/12 diplo actions — coverage gaps, not game bugs | open | 2026-07-13 | 2026-07-13 | 62523dc |
| HARN-03 | harness | Minor | build() called directly bypasses act()'s level-3 tier cap → inflated bazaar/market counts (INFRA-004) | open | 2026-07-13 | 2026-07-13 | 62523dc |
