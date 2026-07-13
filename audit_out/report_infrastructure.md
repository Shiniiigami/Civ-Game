# Infrastructure Audit — Crown Waters (Cartridge 4.5, Pass #1)

**Version:** git `62523dc0` (script sha256_16 `4075d3270dbab183`) · 16 archetypes × 6 scenarios × 3 seeds × 100y = 288 runs · 18,718 rows. No prior report/ledger.

## Executive summary
Infrastructure is a shallow single-city ("tall") game with a near-dead wonder layer and a degenerate late-game wall sink. (1) Wonders: 279/288 runs (96.9%) end `wonders=0`; the column **never exceeds 1** in any of 18,718 rows; only **builder** ever raises one (9/18 builder runs), always *The Great Library*. (2) Wide play doesn't exist — every archetype averages **1.1–1.5 settlements**, so tall-vs-wide is a non-choice. (3) Late-game infra degenerates into uncapped **wall-spam** (builder|kingdom|19: walls 3→43, infraTotal 22→162, linear, no plateau).

## New this pass
First infrastructure audit — everything is net-new: INFRA-001 (wonders dead), INFRA-002 (tall-vs-wide non-choice), INFRA-003 (uncapped walls), INFRA-004 (harness tier-cap bypass), INFRA-005 (temples faith-locked), INFRA-006 (harness wonder gap), INFRA-007 (barracks auto-include).

## Findings

**INFRA-001 — Critical — Wonders effectively dead.** Max `wonders`=1 across all rows; `wonderInProgress` nonzero in only 34/18,718 rows (0.18%), all builder. Verified gates in `index.html`: `startWonder` needs ≥25 builders; `processWonder` needs ≥20 builders + ~75–120g every season for 12–19 seasons; `wonderCooldownYear=lastWonderYear+20` (1 per 20y); plus prereq building + tech. Builder completes Library (~yr 8, cheapest at 75g/s) and never a second — the harness only ever retries `WONDERS[0]`, which `hasWonder` blocks. Reachable but so gated it's an inert one-time stat-stick. Part harness (only builder calls startWonder), part real (gates genuinely steep).

**INFRA-002 — Major — Tall-vs-wide is a non-choice.** All archetypes 1.1–1.5 settlements; expansionist highest at 1.5 and dead by yr 34. `corr(settlements, infraTotal)=0.343` only because settlement count barely varies. Builder/isolationist (tall) top infra; expansionist (wide) near-bottom. Wide never exists to compete.

**INFRA-003 — Major — Uncapped walls = infinite mindless sink.** `walls` is NOT in the level-3 tier list (unlike bazaar/workshop/academy/mine/etc.). After economic builds + wonder finish (~yr 8), builder has nothing affordable but walls (stone-only, other resources depleted) → climbs linearly to 43 with zero opportunity cost. `barracksCap` gives walls×40 troop capacity, so linear return but unbounded.

**INFRA-004 — Major (HARNESS) — build() bypasses the level-3 tier cap.** The `>=3` cap lives only in the `act()` UI wrapper; harness calls `build()` (index.html:547) directly. 18/288 finals exceed bazaar/settlement > 3; worst `spymaster|kingdom|{7,19,42}` = **81/81/99 bazaars in 2 settlements**, and `builder|pangaea|19` = 11 in one city. All spymaster/builder "markets" magnitudes and their `infraTotal` share are inflated — not game balance. (Walls-per-settlement>3 is legal; walls really are uncapped.)

**INFRA-005 — Minor — Temples are faith-locked.** Only 3/156 survivors have temples (17/18 faith runs; 1 conquest); 270/288 runs end with 0. Not general infrastructure — a faith mechanic.

**INFRA-006 — Minor (HARNESS) — 15/16 archetypes never call startWonder** (civgame_harness.js:231, inside builder branch), so the all-zero wonder column for them is a test gap, not proof of a block.

**INFRA-007 — Polish — Barracks is an auto-include.** 127/156 survivors have it, value distribution `{0:29,1:83,2:34,3:7,4:3}` — modal realm has exactly 1. A checkbox, not a decision.

## Archetype table (final-year avg, 18 runs each; `*`=cap-bypass inflated)
| arch | settl | endYr | infraTotal | barracks | walls | markets | temples | wonders |
|---|---|---|---|---|---|---|---|---|
| builder | 1.2 | 81 | 31.9 | 0.9 | 3.4 | 5.6* | 0.0 | 0.50 |
| isolationist | 1.1 | 35 | 32.6 | 0.8 | 1.2 | 0.7 | 0.0 | 0 |
| balanced | 1.3 | 65 | 23.6 | 1.2 | 0.7 | 1.2 | 0.0 | 0 |
| spymaster | 1.2 | 69 | 20.6* | 0.9 | 0.8 | 15.1* | 0.0 | 0 |
| faith | 1.1 | 33 | 15.7 | 0.9 | 0.7 | 0.7 | 2.6 | 0 |
| expansionist | 1.5 | 34 | 13.5 | 0.9 | 0.8 | 0.7 | 0.0 | 0 |
| merchant | 1.2 | 93 | 7.8 | 0.9 | 0.7 | 2.6* | 0.0 | 0 |
| conquest | 1.5 | 39 | 7.4 | 1.6 | 1.4 | 0.9 | 0.1 | 0 |

## Problem-taxonomy flags that fired (cartridge 4.5)
- ☑ **Dead buildings / wonders whose payoff never justifies cost (or auto-includes)** — INFRA-001 (wonders build-once), INFRA-007 (barracks auto-include).
- ☑ **Resource sinks too cheap/expensive** — INFRA-003 (walls a bottomless cheap sink).
- ☑ **Cap math making a building pointless / bypassed** — INFRA-004 (tier cap bypassed by harness), INFRA-003 (walls uncapped).
- ☑ **Buildings no one builds (dead)** — temples outside faith (INFRA-005).

## Lenses fired
- **Paradox Tall-vs-wide — FIRES, broken:** wide absent (all 1.1–1.5 settlements; expansionist dead yr 34); tall is the only path and never competes with a non-existent wide.
- **Civ6 Snowball-inflection — FIRES, no snowball / no opportunity cost:** capped buildings saturate, the one uncapped (walls) gives only linear capacity; no inflection point; late-game walls built with zero opportunity cost.
- Standing: Meaningful-choice (barracks auto-include, temples faith-locked, wonders build-once), Pacing (dead late game), Balance (wonders over-gated / walls under-gated), Emergent (bad wall/bazaar spam).

## Opportunities
1. Make wonders reachable/plural — lower builder floor (15) + let gold sub for builders + cut cooldown to ~10y so tall earns 3–4 wonders (M).
2. Cap or diminish walls — add to tier system or escalate cost/diminish `barracksCap` (S).
3. Differentiated district-style build tree with visible opportunity cost (M).
4. Fix harness tier-cap bypass before any infra balance call (S).
5. Make expansion survivable upstream so "wide" exists to balance against (L, cross-domain).

## Experiments to try next
1. Wonder-gate sweep (floor 15, cooldown 10y, cycle all wonders) → expect `wonders`>1.
2. Add walls to tier cap → expect infraTotal to stop linear growth after ~yr30.
3. Add startWonder to merchant/faith/techlord → expect still zero completions (proves real gate).

## Appendix
- **Seeds:** 7, 19, 42. **Scenarios:** baseline, archipelago, pangaea, easy, hard, kingdom.
- **Archetypes (16):** passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced, exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor.
- **Version:** git SHA `62523dc0f0b808f4501acf35acf074d3f9acf36f`, script sha256_16 `4075d3270dbab183`.
- **Key source lines:** build() 547 · startWonder/processWonder/WONDERS/wonderCooldownYear · barracksCap · civgame_harness.js:231 (builder-only startWonder).
