# Crown Waters — Audit Iteration Log

One entry per command run. Compounds over time so the tool gets broader and sharper, not repetitive.

---

## 2026-07-13 · `audit all` · game v `62523dc` · dataset 288 runs / 18,718 rows

First full pass over the frozen campaign (16 archetypes × 6 OFAT scenarios × 3 seeds). All 11 domains
audited from the CSVs (no re-run), each verified against `index.html`. Fanned out one auditor per
domain; findings consolidated into `LEDGER.md` (77 findings: 9 Critical, 30 Major, 24 Minor, 14 Polish/harness).

**Cross-domain meta-result:** the seeded hypothesis that `advanceSeason` throws on large maps was
**refuted by three independent diagnostics** (war, exploration, events all measured 0 exceptions in
288 runs). The apparent "early ends" are mid-year authority collapses hidden by a snapshot-timing
artifact (HARN-01). The audit's own premise was the first thing disproved — a good sign the passes
verify rather than confirm.

### Per-domain entries

**economy** — Lenses: EU4 sinks (12), Civ6 snowball (1/6), Total War upkeep, comeback (6). New: 11 (ECON-001…011). Fixed 0 · Regressed 0. Verdict: two-outcome machine — cross a treasury floor and snowball to 150k, touch it and die (65% terminal). No sink; trade routes never fire (harness). Next: test graft-as-real-sink + soften the treasury→authority cliff.

**population** — Lenses: Song of Syx strata-unrest (primary, FAIL), RimWorld anecdote (WEAK), comeback (FAIL). New: 7 (POP-001…007). Verdict: slavery is frictionless free labour that *contradicts* the Zoroastrian theme; captives have no sink. Next: escalating slave-burden curve + captive-upkeep clock; teach the harness manumit/ransom to measure them.

**war** — Lenses: Total War upkeep-&-battle-agency (FAIL), EU3/CK3 phased-battle (PARTIAL). New: 6 + WAR-EXC. Verdict: militarism is a costed trap (upkeep 80–109% of income); the phased siege/war layer fires in 11 seasons of 288; battle phases have no agency. Next: close the raid→loot→upkeep loop; give per-phase battle decisions; route big loot through sieges.

**faith** — Lenses: Song of Syx (faith×slavery, FAIL), CK3 story-gen (PARTIAL), EU4 sinks (FAIL). New: 7 (FAITH-001…007). Verdict: faithPower is a sinkless accumulator; 3/8 doctrines dead; faith×slavery friction inverted; Zoroastrian identity flavour-only. Next: Asha/Druj purity axis making slavery frictional; a Fire-Temple faithPower sink.

**infrastructure** — Lenses: Paradox tall-vs-wide (broken), Civ6 snowball (no inflection). New: 7 (INFRA-001…007). Verdict: wonders build-once-and-forget; walls an uncapped linear sink; tall-vs-wide a non-choice (wide never exists). Next: reachable/plural wonders; cap walls; fix the harness tier-cap bypass before any infra balance call.

**tech** — Lenses: Civ6 snowball (no inflection — tree caps out for all). New: 8 (TECH-001…008). Verdict: allTechDone never reached (golden-age end-game is dead content); research ~2–3× too slow; 21/39 techs never studied; late game 100% idle. Next: re-scale tree to finish in a lifetime; branch it; unlock a scaled golden age before the full tree.

**governance** — Lenses: legibility (4, primary), comeback (6), meaningful-choice (2), EU4 sinks. New: 6 + GOV-H1. Verdict: authority is the whole game and its death-spiral is SILENT (absent from the season report while unity shows healthy); prestige a dead stat; 4/8 gov types unreachable; tax a false choice. Next: A/B — add authority-Δ to the season report and measure whether authority-death share drops toward kingdom's near-zero.

**diplomacy** — Lenses: CK3 story-gen (FAIL — neighbours wallpaper), comeback (FAIL). New: 7 (DIP-001…007). Verdict: alliances unreachable (allies=0 everywhere); AI reacts only to 2 binary flags; claims inert; diplomacy provably skippable (isolationist/merchant all-zero, both survive). Next: wire factionAggr to relations; lower the alliance gate; add a diplomatic win-path.

**exploration** — Lenses: EU4 sinks/overextension (inverted — no expansion to overextend), Paradox tall-vs-wide, comeback. New: 8 (EXPL-001…009). Verdict: naval is a non-theatre (0 fleets outside the kingdom gift); archipelago effectively unwinnable; wide expansion strangled; discovery unrewarding. **Ran the diagnostic that refuted the crash.** Next: lower SETTLER_MIN + soft overextension; make a shipyard affordable pre-collapse; log shipCount/navalStrength.

**espionage** — Lenses: meaningful-choice (FAIL), depth-vs-complexity (FAIL), opportunity/net-new. New: 6 (ESP-001…006). Verdict: functions but strategically inert — sight-only, no counter-intel, intel duplicated by scouting. Next: add one actionable operation (sabotage/foment/steal) + catch-risk counter-intel, or fold deep-intel into scouting and cut the spy job.

**events** — Lenses: legibility (4, hard), comeback (6, FAIL), emergent-anecdote (moderate). New: 6 + confirms HARN-01. Verdict: the "crash" is a myth (0 throws; over-column logging artifact); frequent events have no agency; disasters kick you when down; world proliferates not consolidates. Next: promote top disasters to lightweight choices; rubber-band the event table by realm health; fix the snapshot to expose mid-year end-states.

### What to try next (cross-domain)
1. The **treasury→authority death-spiral** is the single dominant loss condition and it is silent (ECON-001, GOV-001) — the highest-impact fix in the game. Surface it + soften the cliff, then re-run `setup` and `verify` the collapse rate.
2. Fix **HARN-01** (log a final row on mid-year `S.over`) so the next `setup` gives clean collapse data.
3. The **kingdom scenario collapses only 2–6%** vs 51% overall — the fragile opening is the problem; a gentler early economy would lift every archetype.
4. Run `synthesis` next: the economy→governance→(war/faith/expansion) causal chain recurs in nearly every domain report and deserves a cross-domain trace.
