# Audit — Espionage & Intel (cartridge 4.10)

**Game version:** index.html git SHA `62523dc0f0b808f4501acf35acf074d3f9acf36f` · script sha256_16 `4075d3270dbab183`
**Data:** `audit_out/espionage.csv` (18,718 year-rows) · 16 archetypes × 6 scenarios × 3 seeds (7,19,42) × ≤100 years
**Columns:** `spyPosts` (foreign settlements with an embedded spy), `freeSpies` (trained but unposted), `spyTech` (0/1 = has "Spycraft")
**First pass** — no prior report_espionage.md, no LEDGER/ITERATION history for this domain.

---

## Executive summary

Espionage **functions but is strategically inert.** It is not broken — when the one archetype scripted to pursue it (`spymaster`) does so, the tech is reached (year 3–17), spies are trained, and up to 4 are embedded and deliver deep intel. But the system's entire payoff is **passive knowledge**: a fully-embedded spy reveals a foreign settlement's food/labour/stores/works/tech (`deepIntelSection`), and holding ≥3 spies grants a passive "read enemy army/fleet strength near your realm" network (`spySight`). There is **no actionable espionage lever anywhere** — no sabotage, no assassination-by-spy, no tech theft, no incite-revolt — and **no counter-intel**: the AI never embeds spies, and player spies are undetectable and unremovable by the target. Much of the intel is also reachable through free/cheap scouting, which climbs to the same `intel=4` tier.

By the numbers: **5.28%** of all rows have `spyTech=1` and **5.20%** have `spyPosts>0` — and **100% of those rows are `spymaster`.** The other 15 archetypes are flat zero. That zero is largely a **harness artifact** (only `spymaster`'s policy calls `embedSpy`), but it is faithful to the design intent stated in the cartridge and TECH text ("Spies are dear, slow to train, and few"). The real *game* finding sits underneath: even the archetype that fully commits gets a capped ~4 spies whose only reward is sight, so there is little reason for a human player to build the most expensive skilled unit in the game (60g) for it.

**Verdict: near-dead as a strategic system. Recommendation: EMPOWER with one actionable lever + minimal counter-intel, OR fold the deep-intel payoff into scouting and cut the spy job.** Details in Opportunities.

---

## New this pass
Everything below is net-new (first audit of this domain). Key new findings: ESP-001 (no actionable lever), ESP-002 (no counter-intel / AI never spies), ESP-003 (intel duplicated by scouting), ESP-004 (spy cap binds at ~4 in every surviving run), ESP-005 (60g prestige cost vs pure-flavour payoff).

---

## Lenses applied (and verdicts)

The named 2.5 design-pattern lenses don't bite a pure-intel domain; foregrounded the Section 2 standing lenses instead.

- **#2 Meaningful choice — FAILS.** "Embed a spy here" is the only espionage decision, and it has one outcome (you see more). No tradeoff, risk, or counter-move. A reveal button, not a choice.
- **#3 Depth vs complexity — FAILS (clicks without decisions).** Real machinery — cap formula, per-season `spyLevel` accrual (+34/season→100), decay-on-recall, `spySight` range network — produces exactly one effect (knowledge). Complexity not earning depth.
- **#10 Opportunity / net-new — the whole report.** Espionage is the cheapest place in the game to add a counterplay and an actionable lever; see Opportunities.
- **#12/#13 Is espionage worth existing? — MARGINAL.** As built it is a convenience overlay on scouting. It justifies existence only if it gains a lever scouting can't (sabotage/war-prep) or a risk scouting doesn't carry (getting caught). Peers (CK3 schemes, Civ6 spy operations, EU4 sabotage) all make espionage *do* things; here it only *sees*.
- **#4 Legibility — PASSES.** Panel shows a `spyLevel` meter, "full intelligence in N seasons," clear embed/recall text. If empowered, keep this.
- **#1 Balance — soft trap.** Not a no-brainer, not exploitable; simply low-value. 60g/spy for sight-only is a soft trap vs spending that gold on economy/military.

---

## 1. Spy mechanics (verified vs index.html)

- **Gate:** `TECH.espionage` = "Spycraft", cost 200, req `["writing","currency"]` (line 763). Every spymaster run flips `spyTech` to 1 (year 3–17; kingdom/seed19 as early as year 3).
- **Spies are a SKILLED job** (`SKILLED.spies`, line 859): 60 gold — the **most expensive skilled unit** (scholars 15, priests 14, healers 18, diplomats 34, sailors 8), `prestige:true`, gated on `espionage`. Cap = `floor(pop*.0018) + academy*2 + market*1 + (bureaucracy?3:0)` — very small; runs settle at ~4 total.
- **`embedSpy(id)`** (1288): pushes a foreign settlement id into `S.spyPosts` if `freeSpies()≥1`; refuses own/ruined/duplicate.
- **`processSpies()`** (1291, in `advanceSeason`): each posted settlement `spyLevel += 34` (→100 in 3 seasons), sets `intel=4, garrisonIntel=4`; unposted residual decays −25/season.
- **`spyEmbedded(s)`** = `spyLevel≥100` → unlocks `deepIntelSection` (1296): government, realm, culture, faith, population (free/enslaved), food breakdown, labour+slave jobs, works, stores, full tech list.
- **`spySight(x,y)`** (1284): `spyTotal≥3` reads hostile **army/fleet strength** within `420 + spies*12` of any holding **without a scout** (enemy army/fleet panels, 1317–1318). The single semi-actionable benefit (defensive war-prep).

## 2. Spy economy (cost vs payoff)
60g/spy + 200g tech + academy/market prereqs for the cap, versus a payoff of **information only**. No gold, resources, unrest, or military effect is ever produced. Payoff/price is poor unless the player wants perfect pre-war intel — which `spySight` already gives passively at 3 spies.

## 3. Intel gained — actionable?
**No.** Read-only. The deepest tier (`deepIntelSection`) is genuinely spy-exclusive (`spyLevel≥100`) but changes no other system. The one intel feeding a decision is garrison/army strength for attack timing, largely available via scouting + `spySight`.

## 4. Counter-intel — absent
`processSpies`/`spySight` reference **only the player**. The AI never trains or embeds spies. Player spies can't be detected or expelled by the target; they fade only on self-recall or losing the settlement. **Zero counterplay** — confirms cartridge flag.

## 5–8. UI/UX, balance, bugs, archetype comparison
UI clean and legible (meter + countdown). No bugs in the spy path. One archetype uses it; fifteen never touch it (table below).

---

## Findings

### Major
- **ESP-001 (Major) — Espionage yields nothing actionable; sight-only.** No sabotage/assassination-by-spy/tech-theft/incite anywhere (the "assassination" at 1087–88 is a random ruler-death event unrelated to spies). *Evidence:* grep `sabotage|assassin|steal|incite|poison` returns only that event; sole spy effects are `deepIntelSection` + `spySight`. Fails #2/#3/#12.
- **ESP-002 (Major) — No counter-intel; AI never spies.** `spySight`/`processSpies` player-only; player spies decay only on self-recall. *Evidence:* zero AI `embedSpy` calls.
- **ESP-003 (Major) — Intel largely duplicated by free/cheap scouting.** Scouting climbs to `intel=4` (`intel=Math.min(4,(t.intel||0)+1)` + direct `.intel=4`) and `garrisonIntel`, covering most of a spy's reveal except the `spyLevel≥100` deep block. Weakens the subsystem's case (#12).

### Minor
- **ESP-004 (Minor) — Spy cap binds at ~4 in every surviving run; supply maxed then idle.** All 10 spymaster runs reaching year 100 end at exactly `spyPosts=4, freeSpies=0`; dataset-wide `spyPosts` max = **4**. *Evidence:* `spyPosts==4` in 968/1240 (78.1%) spymaster rows; `freeSpies>0` in **3/18,718 (0.016%)**. The "how many / where" question is never live.
- **ESP-005 (Minor) — 60g prestige cost for a flavour payoff = soft trap.** Priciest skilled unit, no economic/military return; explains why no non-spymaster archetype would build them even outside the harness.

### Polish
- **ESP-006 (Polish) — Zero for 15/16 archetypes is a HARNESS ARTIFACT, not a balance bug.** Only spymaster's policy calls `embedSpy`. Design-faithful (cartridge says others ignore Spycraft) but not evidence spies are *balanced* vs alternatives — that's ESP-005.

---

## Problem-taxonomy flags (cartridge 4.10)
- ☑ **Spies gain nothing actionable** — ESP-001.
- ☑ **Intel duplicated by free scouting** — ESP-003.
- ☑ **No counter-intel (undetectable/unremovable)** — ESP-002.
- ◻ **Spy cost mismatch** — partial: not exploitable, but overpriced-for-payoff (ESP-005).

---

## Uptake table

| Metric | Rows | % of 18,718 | Who |
|---|---|---|---|
| `spyTech=1` | 989 | 5.28% | 100% spymaster |
| `spyPosts>0` | 974 | 5.20% | 100% spymaster |
| `freeSpies>0` | 3 | 0.016% | spymaster only |
| `spyPosts==4` (cap) | 968 | 5.17% | spymaster only |

**Spymaster-only (1,240 own rows):** spyTech=1 989 (79.8%) · spyPosts>0 974 (78.5%) · at cap of 4: 968 (78.1%). First tech flip year 3–17 (median ~16); first embed 1 season later. Survivors (10/18) all finish at 4 spies, 0 free.

---

## Opportunities (lenses #12–#13)

1. **Add ONE actionable spy operation (empower, effort M).** Once `spyLevel≥100`, expose a per-target action: **Sabotage garrison** (temp −X% siegeStrength/garrison before assault — real war-prep), **Foment unrest** (temp loyalty/revolt-risk bump), or **Purloin knowledge** (chance to copy one enemy tech you lack). Any one turns "see" into "do" and justifies the 60g spy. Borrows Civ6/EU4 spy-operation pattern.
2. **Add counter-intel with catch-risk (effort M).** Detection roll scaled by target tier/bureaucracy; a caught spy is expelled (`spyLevel→0`), dings relations or triggers an incident. Makes embedding a real risk/reward decision and lets the AI expel players — closes ESP-002, turns on #2/#3.
3. **Differentiate spies from scouts (effort S).** Keep deep intel spy-exclusive AND make `spySight` the only way to read strength at range — cap scouting's climb to `intel=4` so the systems don't overlap.
4. **Simplify-away alternative (effort S).** Cut the `spies` job and 200g tech; fold `deepIntelSection` into a top-tier **scouting** upgrade ("Deep reconnaissance"). Recommended only if no actionable lever will be added.

**Primary recommendation:** do (1)+(2) together — one operation plus catch-risk is the minimum to make espionage a live lever and give spymaster a non-trivial identity. If dev budget is nil, do (4).

---

## Experiments to try next pass
1. **Empower test:** add "Sabotage garrison" (−25% garrison 1 season); re-run spymaster vs conquest/balanced in pangaea/kingdom; measure conquest win-rate lift and spymaster survival (now 10/18).
2. **Counter-intel test:** add detection roll on embed; log a `spiesCaught` column; check whether `spyPosts` still saturates to 4 or players hold back.
3. **Cut test:** stub the spy job, route deep intel through scouting; confirm no domain regresses and quantify spies' actual unique value (spymaster should collapse toward balanced's line).

---

## Appendix
- **Seeds:** 7, 19, 42 (frozen). **Scenarios:** baseline, archipelago, pangaea, easy, hard, kingdom.
- **Archetypes (16):** passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced, exploit-hunter, diplomat, **spymaster**, thalassocrat, slaver, techlord, survivor. Only spymaster exercises espionage (by policy).
- **Spymaster survival:** 10/18 reach year 100; 8 end early (all 3 archipelago die yr 24–36 via authority collapse, unrelated to spies).
- **Version:** git SHA `62523dc0f0b808f4501acf35acf074d3f9acf36f`; generated 2026-07-13.
- **Key source lines:** TECH.espionage 763 · SKILLED.spies 859 · spyTotal 1282 · spySight 1284 · freeSpies 1285 · embedSpy 1288 · processSpies 1291 · spySection 1295 · deepIntelSection 1296.
