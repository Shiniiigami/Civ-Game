# Audit — Diplomacy & Relations (Cartridge 4.8)

**Game version:** index.html git 62523dc0 · script sha256 4075d3270dbab183
**Data:** audit_out/diplomacy.csv — 18,718 year-rows · 16 archetypes × 6 scenarios × seeds {7,19,42} × years 1–100 · 288 runs.
**Pass:** first (no prior report; LEDGER seeded by this pass).
**Columns audited:** relations, allies, pacts, tributes, claims, warsActive (all are counts of keyed entries / diploState buckets, not scalar warmth — see §1).

---

## Executive summary

Diplomacy in Crown Waters is real and functional but entirely optional, and mostly invisible to 15 of 16 archetypes. Exactly one archetype (diplomat) ever pulls a diplomatic lever; it demonstrably makes pacts (max 27 concurrent), pays tribute (present every year), warms relations, and accrues dynastic claims (max 6). So the machinery works — the diplomat archetype is the standing proof. But:

- **allies is a dead column: 0 across all 18,718 rows** — even the diplomat, which actively tries to ally, never once formed an alliance in 288 runs. The alliance gate (relations >= 40) is never crossed by the marriage+pact toolkit the diplomat uses. Consequently every alliance-payoff system in the code (ally gifts at line 1018, ally siege contingents siegeAllies at 788) is live but unreachable.
- **warsActive is near-dead: 104/18,718 rows (0.56%), and only for conquest** (max 2). The AI never formally declares war on the player — setDiplo(...,'war') is only ever called by the player's own march/siege (declareWarFor). Neighbours raid but never enter a diplomatic war-state. Formal war is a purely player-initiated, purely conquest-archetype phenomenon.
- **claims accumulate but are inert.** The diplomat reaches 6 claims yet its warsActive is 0 in every one of its 1,418 rows — claims are never pressed. The whole "marriage -> claim -> just war" arc terminates at the claim; the payoff (press_claim) is never taken.
- **Diplomacy is 100% skippable.** All 14 non-diplomat non-incidental archetypes end with allies=pacts=tributes=claims=0; isolationist is literally zero on every column including relations and warsActive, and merchant — the strongest economic survivor — is also all-zero. A realm can reach year 100 with a five-digit treasury having never opened the diplomacy screen. This is the isolationist-archetype proof the cartridge asks for.

**Lenses fired:** CK3 Story-generator (verdict: neighbours are wallpaper — reactive only via two binary flags), Civ/EU Comeback-viability (verdict: diplomacy offers no comeback lever — no aid ever arrives), plus standing lenses Meaningful choice (2), Legibility (4), Feedback loops (6), Emergent behaviour (8), Opportunity (12), Comparative (13).

**Harness caveat up front:** the harness exercises only 3 of 12 diplomatic actions (payNomadTribute, arrangeMarriage, setDiplo for pact/alliance). Nine actions — envoy, subsidize, fabricate_claim, trade_offer, declare_war, press_claim, make_peace, ransom, trade_treaty — are never called by any archetype, so their columns look dead by test design, not necessarily by game design. Findings below separate the two. But allies=0 and warsActive~0 survive that caveat: the diplomat genuinely pursues alliances and never gets one, and no AI path exists to raise warsActive for anyone.

---

## New this pass

All findings are new (first diplomacy audit). Severity-ranked, with the harness/game distinction made explicit.

### Critical
None. (Diplomacy being skippable is a Major design gap, not a Critical bug — nothing crashes or softlocks.)

### Major

- **DIP-001 (Major, GAME) — allies never forms: 0/18,718 rows, including the dedicated diplomat.**
  The alliance action (index.html:684) and the harness both gate alliance on S.relations[fid] >= 40. Across 288 runs the diplomat — warming relations via marriage (+18 once per realm) and pacts (+6) — never crossed 40 on the faction it targeted, so setDiplo(...,'alliance') was never issued. Effect: the alliance reward code is unreachable in practice — ally gold gifts (index.html:1018) and ally siege contingents (siegeAllies, index.html:788) never fire. Alliances are a designed feature that no realistic playthrough reaches via marriages/pacts. Partly harness-shaped (the fast relations levers subsidize +32 and envoy +12 are never tested), but the finding that the marriage+pact path caps out below the alliance gate is a real game-legibility problem: the intuitive diplomatic route can never ally.

- **DIP-002 (Major, GAME) — Neighbours are wallpaper: relations warmth is not consumed by AI aggression.** factionAggr (index.html:1000) returns the faction ruler's own aggr trait — it never reads S.relations[player]. The only things player-side diplomacy changes about AI behaviour are two binary flags: isPact(f.id) removes the player from a faction's raid candidate list (index.html:1014), and underTribute(...) removes the player from a nomad raider's target list (index.html:1104). Warmth from 0->39 relations does nothing the AI notices; only crossing the pact/tribute threshold does. So a neighbour is either "has a pact flag" or "runs its aggr script" — there is no graduated reactive relationship, no rivalry, no memory, no escalation. CK3 Story-generator verdict: fail — ruling generates no diplomatic narrative.

- **DIP-003 (Major, GAME) — Claims are an inert accumulator.** claims reaches max 6 (diplomat, hard/baseline) and is nonzero in 991 rows, but the diplomat's warsActive is 0 in all 1,418 of its rows — no claim is ever pressed. The marriage flavour text promises "a claim ... which you may one day press in a just war," and press_claim (index.html:687) exists and would convert claim->war with reduced authority/unity penalty. Nothing in normal play closes that loop, so claims are dead weight the player accrues and never uses. (Harness note: press_claim is one of the untested 9 actions — but the diplomat's own strategy has no step that would ever press, which is the design point: the diplomatic path has no offensive terminus.)

### Minor

- **DIP-004 (Minor, GAME) — warsActive is effectively a conquest-only column and never AI-initiated.** Nonzero in 104/18,718 rows (0.56%), max 2, and only for conquest. No code path lets an AI faction set diploState[player]='war'; neighbours express hostility exclusively as raid parties (spawnRaidParty), which never register in the player's diplomatic war ledger. Result: from the diplomacy layer's point of view the player is never at war with anyone unless they personally march. War-and-peace as a diplomatic subsystem (declare/sue-for-peace between standing realms) is essentially unexercised — the entire make_peace / white-peace mechanic (index.html:690) has no trigger because formal wars barely exist.

- **DIP-005 (Minor, GAME) — Pacts churn hard and silently.** Diplomat pact counts oscillate violently: baseline seed 7 runs pact 16 (y50) -> 8 (y60) -> 10 (y70) -> 0 (y80) -> 10 (y90) -> 1 (y100). Cause: pacts carry an 8-year diploUntil and lapse back to peace in agingAndSuccession (index.html:1151). The player re-signs, they lapse again — a treadmill. Each lapse is a one-line log with no consequence and no prompt to renew, so a large pact web evaporates unnoticed. Legibility-lens flag: the diplomatic map the player built is impermanent and its decay is buried.

- **DIP-006 (Minor, HARNESS->GAME) — Tribute is a flat binary, never scaling.** tributes sits at ~1 for the diplomat every year (mean 1.0–1.25, max 3). tributeDemand (index.html:1098) does scale cost with pop/gold, but the count of tribute relationships stays ~1 because there's typically one nearby raider group. Tribute works (it buys off raids for 4–8 seasons) but is a low-ceiling, one-target mechanic in these worlds. Harness only ever tributes the single nearest raider, so multi-tribute breadth is untested.

### Polish

- **DIP-007 (Polish) — relations column logs a count of keyed realms, not warmth.** The CSV relations = Object.keys(S.relations).length (civgame_harness.js:419), so it maxes at 9 (number of realms the player has any record with) and can't show the 0–100 scalar. Fine for coverage, but means the actual warmth trajectory (the thing that gates alliances) is invisible in the domain CSV — a future harness pass should log max(S.relations values) to make DIP-001 measurable from data. (relOf is consumed elsewhere — trade buy/sell pricing at index.html:825–827,1587–1591 and faith-absorb war-risk at 926 — so warmth is not wholly inert; it just doesn't reach the AI's aggression decision.)

---

## Numbered sections (cartridge 4.8)

### 1. Relations model
S.relations[fid] is a clamped -100..100 scalar; relOf reads it. Consumers found: pact gate (>=10), alliance gate (>=40), trade pricing (825–827, 1587–1591), faith-absorb war-risk (926). Not a consumer: factionAggr / raid decisions. So warmth influences your prices and your conversions, but not whether neighbours attack you. Big levers up: subsidize +32, marriage +18, envoy +12, make_peace +20, pact +6, ally-gift +2. Big levers down: declare_war -40, fabricate_claim-exposed -18, conquest of their town -15. In data, relations (as realm-count) is nonzero for diplomat (all rows), and incidentally for conquest/nomad/exploit-hunter/slaver via raids and probes.

### 2. War & peace
diploState[fid] in {peace, pact, alliance, war}, default peace (diploOf). Only the player writes war (declareWarFor, and the UI declare_war/press_claim). No AI->player war transition exists. make_peace buys a white peace (+20 rel) but is dead because formal wars are rare. warsActive max 2, 104 rows, conquest-only.

### 3. Pacts, alliances & spheres
Pacts: functional, 8-year timer, gate rel>=10 in UI (harness bypasses via direct setDiplo). Alliances: never reached (DIP-001). assignSpheres exists for worldgen region culture, not player diplomacy. Pact effect is real and valuable: !(isPact(f.id) && s.owner==='player') removes you from that faction's raid list — a genuine defensive tool the diplomat uses to survive (12/18 non-collapse runs).

### 4. Tribute
payNomadTribute -> S.tributes[raiderId]=absSeason()+dur (4–8 seasons), +8 relations, raider skips you (underTribute). Works; low ceiling (DIP-006). Present in every diplomat row.

### 5. Claims
S.claims[fid]=true via arrangeMarriage (dynastic) or fabricate_claim (forged). hasClaim gives a just-war casus belli that halves the authority/unity hit of declare_war and lets press_claim. Accrued (max 6) but never pressed (DIP-003).

### 6. Marriage diplomacy
arrangeMarriage (index.html:1155): 60g, betroths heir, +18 relations, grants a claim, one per realm (S.marriages[owner] guard). marriageInheritance runs yearly in succession. This is the diplomat's relations engine — but +18 once-per-realm can't reach the 40 alliance gate alone, and combined with pacts still didn't in 288 runs (DIP-001).

### 7. AI behaviour (reactive / exploitable?)
Partially reactive via two binary flags only (pact-shield, tribute-shield). Not reactive to warmth, prestige, or player power. Not exploitable in an obvious loot sense, but under-reactive: neighbours never court, threaten, demand, ally against, or remember the player (DIP-002). Ally-gift and ally-siege-aid code exists but is unreachable (DIP-001).

### 8. Diplomacy UI/UX
Not exercised headlessly (see report_ui.md for rendered checks). Code-level note: pact lapse is a single log line with no renewal prompt (DIP-005); claims accrue with no "press now?" surfacing.

### 9. Balance
Diplomacy is a viable survival path (diplomat survives 12/18 shown runs to year 100) but a dominated-by-omission subsystem for everyone else: its whole value is the pact/tribute raid-shield, which most archetypes replace with walls/armies. No diplomatic win condition exists.

### 10. Bugs / impossible states
None found — no negative counts, no orphaned tributes, no claim-without-realm. The "bugs" are dead/unreachable features, not invalid states.

### 11. Archetype comparison
| archetype | rows | maxRel(count) | maxAllies | maxPacts | maxTributes | maxClaims | maxWars |
|---|---|---|---|---|---|---|---|
| diplomat | 1418 | 9 | 0 | 27 | 3 | 6 | 0 |
| conquest | 710 | 2 | 0 | 0 | 0 | 0 | 2 |
| exploit-hunter | 1435 | 2 | 0 | 0 | 0 | 0 | 0 |
| nomad | 681 | 1 | 0 | 0 | 0 | 0 | 0 |
| slaver | 1642 | 1 | 0 | 0 | 0 | 0 | 0 |
| isolationist | 626 | 0 | 0 | 0 | 0 | 0 | 0 |
| merchant/passive/faith/builder/expansionist/balanced/spymaster/thalassocrat/techlord/survivor | — | 0 | 0 | 0 | 0 | 0 | 0 |

Only diplomat touches pacts/tributes/claims; only conquest touches wars; allies untouched by all.

---

## Flags (problem taxonomy)

- Diplomacy states with no effect: alliance (unreachable), formal war-as-diplomacy (AI never enters it).
- AI that never accepts/reacts: AI never proposes anything and reacts only to two binary flags (DIP-002).
- Alliances that never trigger: ally gifts + siege aid live but unreachable (DIP-001).
- Claims that do nothing: accrued, never pressed (DIP-003).
- Isolationist proving diplomacy is skippable: confirmed — isolationist all-zero, merchant all-zero (skippable).
- Tribute exploits: none — tribute is a fair, expiring shield, if anything under-powered/low-ceiling.

---

## Curves & tables

Diplomat by scenario (mean over rows / max):
| scenario | meanRel(cnt) | meanPacts | maxPacts | meanTrib | meanClaims | maxClaims |
|---|---|---|---|---|---|---|
| archipelago (sparse) | 3.42 | 10.38 | 27 | 1.24 | 2.18 | 5 |
| easy (2 AI) | 3.28 | 9.54 | 22 | 1.17 | 2.11 | 5 |
| baseline | 3.84 | 8.89 | 18 | 1.25 | 2.59 | 6 |
| hard (5 AI) | 3.95 | 7.49 | 16 | 1.00 | 2.95 | 6 |
| pangaea (crowded) | 3.23 | 5.81 | 16 | 1.07 | 2.16 | 5 |
| kingdom (big start) | 1.86 | 0.21 | 5 | 1.06 | 0.80 | 5 |

Read: the scenario hypothesis is inverted. Sparse archipelago produces the most pacts (10.38 mean), crowded pangaea the fewest (5.81) among war-capable maps. hard (5 AI) does raise relations (3.95, top) and claims (2.95, top) — more neighbours to warm and marry into — but not pacts. kingdom nearly flatlines pacts (0.21) — a large established realm finds few peace-state factions to pact with. So "more AI = more diplomacy" is false for pacts; it's true only for relations/claims.

Pact churn (baseline seed 7, diplomat): y20=14 · y30=15 · y40=16 · y50=15 · y60=8 · y70=10 · y80=0 · y90=10 · y100=1. The 8-year lapse cycle (DIP-005) makes the pact web sawtooth between ~16 and ~0.

Skippability proof: isolationist = {rel0, all0, pact0, trib0, claim0, war0} across 626 rows; merchant identical across 1,669 rows and is among the best survivors. Diplomacy is provably optional.

---

## Opportunities (lenses 12–13)

1. **Reactive-relations AI (M).** Make factionAggr read S.relations[player]: e.g. effAggr = baseAggr * (1 - clamp(rel/100)) and let very low relations (<-30) add the player to raid candidates even without war. Cost: one line in the raid-decision at index.html:1014. Effect: warmth stops being inert; snubbing neighbours has teeth; the whole 0–39 relations band gains meaning (currently only the 10/40 thresholds matter). Directly answers CK3 Story-generator failure.

2. **A diplomatic win/score path (M–L).** No non-military terminus exists. Add a "hegemon" state: N standing alliances + M vassal/tribute realms for K years -> a prestige/legitimacy victory or a large recurring authority bonus. Gives diplomat a goal, not just survival, and makes alliances (once reachable) worth chasing.

3. **Make alliances reachable and the payoff visible (S–M).** Either lower the alliance gate (40->25) or expose a clear relations meter with "X more to ally." Then surface the ally payoff: when an ally sends a gift or siege contingent, make it a Chronicle beat. Fixes DIP-001's "designed but never seen" problem. Pair with harness change to log the relations scalar so it's auditable.

4. **Close the claim loop with agency (S).** When the player holds an unused claim, surface a periodic "press the claim?" council prompt with the just-war framing already written. Turns the inert claims accumulator (DIP-003) into a decision. Optionally let AI factions press claims on the player, creating inbound casus belli — the missing AI->player war path (DIP-004).

5. **Persistent, legible pacts (S).** Auto-offer renewal in the season a pact lapses, and show pacts/tributes as a small standing panel with countdowns. Kills the silent sawtooth (DIP-005) and makes the diplomatic web feel like maintained relationships rather than a treadmill.

---

## Experiments to try next

1. **Instrument the relations scalar.** Add relMax = Math.max(0,...Object.values(S.relations)) to the diplomacy snapshot and re-run one diplomat cohort. Hypothesis: relMax for the targeted faction plateaus in the 20s–30s under marriage+pact, confirming DIP-001 is a gate-height problem, not just an untested-lever artifact.

2. **Test the fast levers.** Add subsidize/envoy to the diplomat's policy (both raise relations fast; subsidize needs only gold, envoy needs a diplomat job). Hypothesis: with subsidize the diplomat crosses 40 and allies goes nonzero, activating the dormant ally-gift/siege-aid code.

3. **Wire aggression to relations (Opportunity 1) and re-run.** Hypothesis: with reactive factionAggr, the diplomat's survival edge widens vs. isolationist/merchant, giving diplomacy a measurable defensive value the data can show.

---

## Appendix

- **Seeds:** 7, 19, 42 (frozen subset of the 10-seed key).
- **Scenarios:** baseline, archipelago (sparse), pangaea (crowded), easy (2 AI), hard (5 AI), kingdom (large start). Many runs end early via advanceSeason collapse (S.over), heaviest in archipelago/easy; diplomat collapsed in 6/18 runs, survived to y100 in 12/18.
- **Archetypes (16):** passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced, exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor. Diplo lever pulled only by diplomat (civgame_harness.js:262–279): payNomadTribute -> arrangeMarriage -> setDiplo(pact|alliance).
- **Untested diplomatic actions (harness artifact):** envoy, subsidize, fabricate_claim, trade_offer, trade_treaty, declare_war, press_claim, make_peace, ransom (CATEGORIES.diplo, index.html:538). Their absence in the CSV is test coverage, not necessarily dead game code.
- **Version:** index.html git 62523dc0f0b808f4501acf35acf074d3f9acf36f, script sha256_16 4075d3270dbab183, run 2026-07-13T03:42Z, runtime 6,825s, 288 runs / 18,718 rows.
