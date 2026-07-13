# Battle & Siege Redesign — Build Spec (for Claude Code)

Goal: turn combat into **EU3/CK3-style phased encounters the player clicks through**, showing real
numbers (per-side strength, the chance roll, and the itemized bonus stack), with a **tactical decision
each phase** and **morale/strength carrying across phases**. Sieges get the same phased treatment.

**Key finding: this is an extension, not a rewrite.** The engine already has the parts:
- `UNIT` roster carries `good`/`bad` matchups, `terrain`/`terrainBad`, `tech` gates, `power`, `cost`.
- `armyPower(s, enemy, attacking)` already computes the full bonus stack — matchups (×1.08/×0.93),
  terrain fit, elite ×1.5, techs (composite/metallurgy/knighthood), culture-martial, faith militant.
  Today it collapses to ONE number; the redesign **surfaces the itemized stack**.
- `ck3Battle(ap, dp, r, ctx)` already runs 3 narrative phases with general-martial and ranged bonuses —
  but tactics are cosmetic `pick(r, TACTICS)` and the outcome is pre-rolled with no player agency.
- Sieges already work: `siegeHoldOut(t)` (walls+fortress+citadel+port+food timer), `siegeStrength(a)`
  (siegecraft tech + general + royal + army size), `beginOrAdvanceSiege` (starts, drains food, tracks
  turns/progress), `siegeAct(armyId,tId,act)` with `assault`→`armyBattle(a,t,breach)` and `lift`.

So we refactor the pre-rolled resolver into a **phase state machine** and build UI + choice on top.

---

## Non-negotiable constraints (read first)

1. **Player-only UI.** The phased modal fires ONLY when the player is a combatant. AI-vs-AI battles must
   **auto-resolve silently** via the same phase engine (no modal) — otherwise every background skirmish
   pops a dialog. `armyVsArmy`/`enemyResolveOnPlayer`/`enemyRaidOther` already branch on this; preserve it.
2. **Headless-callable core.** Split **pure phase math** from **UI**. The math must be drivable without a DOM
   (a function you can call with a chosen tactic and get the next phase's numbers back). This keeps AI
   resolution and the audit harness working. The audit's war resolver will call this directly.
3. **Determinism preserved.** Keep using the seeded RNG (`rng(S.seed + S.year*k + S.season*k + …)`). Same
   seed + same choices ⇒ identical battle. Do not introduce `Math.random()` into resolution.
4. **Save-compatible.** Don't break existing saves. New per-battle state is transient (not persisted); if you
   add fields to units/settlements, backfill them in `migrateGame` like the existing legacy patches.
5. **Single-file.** Everything stays in `index.html`. Headless-verify each milestone with a Node harness
   before shipping (same pattern as `civgame_harness.js`).

---

## Architecture: the phase state machine

Create a pure core that both the UI and the AI/auto path share:

```
initBattle(atk, def, ctx) -> B      // build battle state: sides, units, morale, phase index, log
battlePhases()                       // ordered land phases (see below)
phaseForecast(B)                     // for the CURRENT phase: each side's strength, the bonus breakdown
                                     //   (terrain, general, tech, matchup good/bad, morale, outnumber),
                                     //   available tactics, and the odds — NO RNG, pure preview
stepBattle(B, atkChoice, defChoice)  // resolve ONE phase with the seeded roll; apply casualties + morale;
                                     //   push a numbered log line; advance phase; set B.concluded when done
battleResult(B)                      // {winner, atkLoss, defLoss, captives, routed, margin, log[]}
```

- **AI path:** loop `stepBattle(B, aiTactic(B,'atk'), aiTactic(B,'def'))` until `B.concluded`, no UI.
- **Player path:** UI calls `phaseForecast(B)` to render numbers + tactic buttons, then `stepBattle(B,
  playerChoice, aiTactic(B,'def'))` on click, re-renders, repeats to conclusion.
- `ck3Battle` becomes a thin wrapper: `initBattle` → loop `stepBattle` with AI tactics → `battleResult`,
  preserving its current return shape (`{atkWin, atkLoss, defLoss, lines, margin}`) so callers don't break.

Reuse `armyPower`'s existing math to compute per-side strength; **expose the breakdown** it already computes
(return an itemized object, not just the total) so `phaseForecast` can show each modifier as a line item.

---

## Land phases & tactics

**Phases (ordered):** `skirmish` (missiles/scouts) → `shock` (charge/lines close) → `melee` (the grind)
→ `pursuit` (rout & chase). End early if a side routs.

Per-phase weighting (extend the existing per-phase logic in `ck3Battle`):
- `skirmish`: ranged units and `rangedEdge` matter most (archers/horse-archers get their edge here).
- `shock`: cavalry/charge units and the charging side's general-martial matter most.
- `melee`: raw `power` + heavy infantry + matchups dominate; terrain fit peaks here.
- `pursuit`: the winning side multiplies losses inflicted (cavalry excels); a routed side takes heavy losses.

**Tactics (replace cosmetic `pick(r,TACTICS)` with real choices).** A small land set, each a real modifier
with soft rock-paper-scissors so no tactic dominates:
- **Skirmish/Harass** — boosts ranged edge, reduces own casualties, weak if enemy Charges.
- **Hold the line** — defensive; reduces casualties, strong vs Charge, weak vs Flank.
- **Flank** — bonus if you outnumber or have cavalry; strong vs Hold, weak vs Skirmish.
- **Charge/Commit** — high damage this phase, strong vs Skirmish, weak vs Hold; spends morale.

AI picks via heuristic (`aiTactic`) from its composition and the matchup; the player picks in the modal.
Show the chosen tactic's effect in the numbers.

**Morale & carry-over:**
- Seed morale per side from unit quality, general martial, faith/culture, and outnumber ratio.
- Each phase: apply casualties (they reduce next phase's strength); the phase loser's morale drops.
- If morale < threshold → **rout**: battle ends now, routed side takes pursuit-level extra losses, winner
  takes few. Surface the morale bar and its shifts each phase.

---

## Siege phases

Sieges already have the timer and actions; make them a legible phased loop. Reuse `siegeHoldOut`,
`siegeStrength`, `beginOrAdvanceSiege`, and extend `siegeAct` with the acts below.

**Phases / per-phase player decisions:**
- **Invest / blockade** — surround; start the food/starvation clock (`beginOrAdvanceSiege` already drains
  `t.stores.food`). Show the **hold-out breakdown** from `siegeHoldOut` (walls, fortress, citadel, port
  supply, food→turns) and how many turns until starvation.
- **Bombard / mine** (new act) — spend time/resources to raise `t.siege.progress` (the breach %). Gated by
  `siegecraft` tech / siege equipment. Show breach % climbing vs `siegeHoldOut`.
- **Assault** (existing `assault` act) — resolve via the **battle phase engine** with the current breach as
  a modifier (`armyBattle(a,t,breach)` already does this). Higher breach = better attacker odds; low breach
  = bloody. This is where the battle UI above is reused inside the siege.
- **Sack / terms / sally** — on success choose sack vs. spare (ties to spoils/captives/faith); allow the
  defender to **sally** (a battle in the open) or the attacker to **offer terms**; `lift` remains.

Each siege phase shows numbers: garrison strength, attacker `siegeStrength` breakdown, breach %, food-timer,
and the odds of an assault right now — so "press the assault vs. wait out starvation vs. offer terms" is a
real, informed decision.

---

## Milestones (commit + headless-verify each)

- **M0 — Extract the phase state machine.** Refactor `ck3Battle` into `initBattle`/`phaseForecast`/
  `stepBattle`/`battleResult` (pure, seeded). `ck3Battle`, `armyVsArmy`, `armyBattle`, siege assault all call
  it. AI tactics = a heuristic replacing `pick(r,TACTICS)`. Verify old callers still work and results are
  sane. No UI change yet.
- **M1 — Real tactics + matchup surfacing.** Add the 4 land tactics with RPS modifiers; make `armyPower`
  return an itemized breakdown; `phaseForecast` exposes the bonus stack. AI uses `aiTactic`. Verify no tactic
  is dominant across the 10 audit archetypes.
- **M2 — Morale & carry-over.** Add morale, per-phase casualty carry, and rout/early-end. Verify battles feel
  swingy-but-fair (no auto-wins, no coin-flips) via the harness across seeds.
- **M3 — Player battle modal.** Rebuild `showBattleModal` into the phased, numbers-first, click-through UI
  with tactic buttons and running tallies. **Player-only**; AI-vs-AI stays silent. Verify the harness can
  still auto-resolve player battles by calling `stepBattle` directly.
- **M4 — Phased siege modal.** Extend `showSiegeModal` + `siegeAct` into invest→bombard→assault→sack/terms/
  sally with per-phase numbers and decisions, reusing the battle engine for the assault. Verify starvation,
  breach, and assault odds all read correctly.
- **M5 — Transparency & audit hook.** Tooltips on every modifier; a pre-battle odds preview; expose
  `stepBattle`/`phaseForecast` on the global scope so the audit harness drives them deterministically. Update
  the audit README's war resolver to step phases via `stepBattle`.

---

## Testing (Node headless, per milestone)
- Reuse the `civgame_harness.js` DOM/localStorage stubs.
- Drive `initBattle`→`stepBattle` loops directly (no modal) with fixed seeds; assert determinism (same seed +
  same choices ⇒ identical `battleResult`).
- Balance checks against the 10 audit archetypes: no single tactic or unit wins >~60% across matchups; no
  battle is a guaranteed auto-win or unwinnable at even strength; morale/rout triggers fire and end battles.
- Regression: existing `armyVsArmy`/`armyBattle`/siege callers still resolve to sane losses; saves load.

## Function touch-points (real, from index.html)
`ck3Battle` (1573) · `armyVsArmy` (1718) · `armyBattle` (1700) · `armyPower` (899, return breakdown) ·
`fieldPower` (1706) · `rangedEdge` · `terrainFit` · `qualityMult` · `showBattleModal` (1577) ·
`pushBattle` (1576) · `siegeHoldOut` (764) · `siegeStrength` (765) · `beginOrAdvanceSiege` (1693) ·
`siegeAct` (1697) · `showSiegeModal` (1695) · `pushSiegeReport` (1694) · `UNIT` (286) · `TACTICS` (1429,
currently naval-flavored — add a land tactic set) · `migrateGame` (backfill any new fields).
