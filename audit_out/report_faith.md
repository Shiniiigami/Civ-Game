# Audit — Faith & Religion (cartridge 4.4)

**Game version:** index.html git `62523dc0` · script sha256 `4075d3270dbab183`
**Data:** `audit_out/faith.csv` — 18,718 year-rows · 16 archetypes × 6 scenarios × seeds {7,19,42} × yr 1–100.
**Pass:** #1 (no prior faith report or ledger — everything below is net-new).

---

## Executive summary

Faith is a **well-authored but shallow and mostly-inert side-system**. The core composition/drift/evolve
engine is genuinely nice (folk→organized crystallization, cult/folk/organized tiers, a real
absorb-backfire civil-war story), but the player-facing faith path is:

1. **A currency with no sink.** `S.faithPower` rises monotonically — **0 decreases across 576 season
   transitions** (18→54 over a run) — and is never *spent*; it only silently buffs `missionStrength` and
   `attemptAbsorb` odds. Fails the EU4 sinks test outright.
2. **Half-dead in its own menu.** Of 8 doctrines offered at founding, **3 have zero code references**
   (`ascetic`, `monumental`, `charitable`) — the entire second-doctrine "temples vs charity" choice is a
   false choice.
3. **A survival trap.** The `faith` archetype founds a state faith turn ~1 and then **collapses in 15 of 18
   village-start runs (yr 17–34)**; only the two developed `kingdom` starts reach yr 100. Founding costs
   120g + 25 builders + 15 stone up front with no near-term payoff.
4. **Thematically thin.** Deity names nod at fire/light/sun (good), but there is **no dualism (Asha/Druj,
   truth/lie), no purity, no fire-tending**, and the faith×slavery moral tension is *inverted*: a Zoroastrian
   realm holds slaves with **zero** faith friction unless you *opt in* to the `abolition` doctrine, which
   then adds a tiny +0.05 unrest per slave-holding settlement.

**Harness caveat:** only the `faith` archetype ever calls `openFaith`, so `faithPower`/`hasFaith` are 0 for
15/16 archetypes — that is a **harness policy choice, not a game bug**. But `organizedFaiths` and
`distinctFaiths` are driven by the NPC world and are live for every archetype, and *those* reveal the real
game findings below.

---

## New this pass

Everything is new (first faith pass). Ranked, with evidence:

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| FAITH-001 | Major | `faithPower` has no sink — pure accumulator | 0/576 season-to-season decreases; mean 30.7, 18→54 monotonic |
| FAITH-002 | Major | 3 of 8 doctrines mechanically dead | `ascetic`,`monumental`,`charitable` → 0 code refs |
| FAITH-003 | Major | Faith×slavery friction is negligible & inverted (theme) | Only hook = opt-in `abolition` +0.05 unrest (line 1066); baseline = 0 friction |
| FAITH-004 | Major | Faith path is a survival trap | 15/18 faith runs collapse yr 17–34; only kingdom starts survive |
| FAITH-005 | Minor | No faith convergence & no schism | `distinctFaiths` range 13–22, never →1; `organizedFaiths` 0/576 decreases |
| FAITH-006 | Minor | Convert→absorb loop rarely fires; priests are single-purpose | faith realm dies before conversions land; priests only feed `missionStrength` |
| FAITH-007 | Polish | Zoroastrian identity is flavor-only | fire/light deity names, but no Asha/Druj/purity/fire mechanic |

---

## 1. Faith mechanics & tiers

The tier model (`FAITH_TIER_PROPS`, line 493) is the strongest part of the system and works as designed:
- **cult** {spread .5, hold 1.6, drift .5} — island/nomad peoples, insular.
- **folk** {spread .85, hold 1.05, drift .85} — default for settled peoples.
- **organized** {spread 1.5, hold .8, drift 1.35} — must *arise through play*, never seeded.

`faithEvolve()` (line 503) crystallizes a folk faith into organized when a people is **>8000 pop, ≥3
settlements, literate**, at 9%/yr. This fires in the NPC world regardless of archetype: `organizedFaiths`
climbs **2.0→8.5 for passive** and **3.0→9.5 for faith** over 100 yr. Good emergent background sim.

**Verdict:** tiers are coherent and legible in code. The player's own founded faith is a rounding error on
top of the NPC evolution (9.5 vs 8.5 organized faiths at yr 100 — founding adds ≈1).

## 2. Faith power — sources & sinks  → **FAITH-001 (Major)**

Sources (all additive, permanent):
- `openFaith`: sets `faithPower=18`
- `temple` build: **+5** (line 692)
- random "fervour" event: +3 (~3.3%/season, line 1086)
- ruler event: +5 / +7 (orthodoxy / grand temples, lines 1124–1126)
- wonders **per season, forever**: cathedral +2, monastery +2, pantheon +4 (line 1169)

Sinks: **none recurring.** The only decrement anywhere is the one-shot "uphold toleration" ruler-event
choice (−3). Consumers *read* `faithPower` but never spend it: `missionStrength` uses `+faithPower*.08`;
`attemptAbsorb` uses `+faithPower/400`.

**Proof:** across all 18 faith runs, `faithPower` **never once decreased** (0/576 transitions). It is a
monotone ratchet that makes missions and absorption cheaper the longer you live, with no counter-pressure.
This is exactly the cartridge flag *"faithPower with no meaningful sink."* Compared to a healthy design,
missions/edicts/absorb should *cost* faithPower, turning it into a managed pool.

## 3. Conversion / missions / resistance  → **FAITH-005, FAITH-006 (Minor)**

`missionGain` (line 500) is a rich formula (size, homogeneity, distance, footprint, rival, tier-drift, clamp
0.5–16). `faithDrift` (line 501) does gravity-based neighbour pull + route seeding + temple radiance. The
machinery is real. But at the world scale it **changes nothing measurable**:
- `distinctFaiths` global range is **13–22 and never trends toward 1** — no drift-snowball, no world faith.
- Even a dedicated missionary realm barely dents it: faith archetype `distinctFaiths` **17.7 (yr1) → 17.0
  (yr100)**. Conversion is cosmetically local.
- `organizedFaiths` **never decreases (0/576)** — once a faith organizes it is immortal; there is no schism,
  reformation, or faith death. Religions only accrete.

The convert→absorb chain (mission to 60% → `absorb`) is the intended payoff, but faith realms **collapse
before it can pay** (see §11). So `conversion` "never meaningfully changes outcomes" in the current data —
not because the code is broken, but because the archetype dies at yr ~20.

## 4. Doctrines & effects  → **FAITH-002 (Major)**

Founding offers two picks from two menus. Actual code effects:

| Doctrine | Menu | Effect in code | Status |
|----------|------|----------------|--------|
| militant | 1st | +10% attack power (920); +15% absorb warRisk (926) | **works** |
| syncretic | 1st | +10% absorb join chance (926) | works (minor) |
| mercantile | 1st | tax += `temple*4`/settlement/season (971) | **works** |
| ascetic | 1st | — none — | **DEAD** |
| monumental | 2nd | — none — | **DEAD** |
| charitable | 2nd | — none — | **DEAD** |
| royal | 2nd | authority **+0.5/season** (1169) | works (strong) |
| abolition | 2nd | +0.05 unrest per slave-holding settlement (1066) | works (tiny, see §7) |

The **entire second-doctrine slot is a near-false-choice**: `monumental` and `charitable` do nothing, so the
only live second picks are `royal` (a strong flat authority buff — nearly a no-brainer) and `abolition` (a
self-penalty). Meaningful-choice lens: **fails** for the second doctrine.

## 5. Faith buildings / wonders / edicts

- **Temple** (75g, +1 priest, +5 faithPower) is the only faith building; priests only feed
  `missionStrength`. No temple upkeep, no cap, no unrest interaction.
- **Faith wonders** (cathedral/monastery/pantheon) each drip faithPower **forever** with no sink — they
  compound FAITH-001.
- **Edicts** (`enactEdict`, line 841) are gated behind `allTechDone()` (Golden-Age). No faith-specific edict
  exists in the faith path; "devotion" edicts feed unity, not faith. Effectively out of reach in the audited
  runs (faith realms never finish the tree).

## 6. Faith × government (theocracy)

Theocracy is modest and consistent: `missionStrength ×1.3`, `+0.1 unity/season` (only if `S.faith`), and
`loyaltyCeiling` tolerance. No archetype in this harness adopts theocracy, so it is untested in data. Not a
bug, but the theocracy path is unexercised — flag for a future governance/faith synthesis.

## 7. Faith × slavery / morality (theme coherence)  → **FAITH-003 (Major)** · Song of Syx lens

**Lens: Song of Syx strata-unrest (faith × slavery).** *Verdict: fails — friction is negligible and
inverted.* `checkRevolts` (line 1064) computes settlement unrest from unity, authority, `slaveRatio*.32`,
rival-faith, broke, conquered, governor. Faith enters unrest **only** via `rivalFaith` (faith-vs-faith) and
the single line:

```
if(S.faith?.doctrines.includes("abolition")&&s.slaves)unrest+=.05;   // line 1066
```

So a **Zoroastrian realm that holds slaves incurs zero faith/moral friction by default.** Slavery is
frictionless free labor with respect to faith. The one link is *opt-in and backwards*: you must *choose* the
abolition doctrine to *create* a penalty for yourself, and the penalty is tiny (+0.05 vs `slaveRatio*.32`
which dominates). A Zoroastrian ethic (truth/order vs the lie/chaos, purity) should make slavery inherently
frictional — instead the theme is silent unless the player volunteers a self-tax. This is the cartridge's
flagged *"Zoroastrian realm with amoral slavery, no faith friction."*

## 8. Faith UI/UX

The Faith pane surfaces `power ${faithPower}` as a bare number with no explanation of what it does or that it
never falls — legibility gap (lens 4). Doctrines render as chips with no tooltip of effect, hiding that 3 are
inert. Deep UI checks belong to the `ui` pass; noting the legibility gaps here.

## 9. Balance & snowball

There is **no faith snowball** — the opposite problem. faithPower ratchets up but the realm it belongs to
dies first, and world `distinctFaiths` never collapses toward unity. Faith neither trivializes the game nor
meaningfully contributes to survival. It is presently **inert dressing** for 15/16 archetypes and a **drain**
for the 16th.

## 10. Bugs / impossible states

No impossible states found (no negative faithPower, no faith without name). The "bugs" are design-level:
dead doctrines (FAITH-002), unsunk currency (FAITH-001), immortal organized faiths (FAITH-005).

## 11. Archetype comparison  → **FAITH-004 (Major)**

Per-archetype faith aggregates:

| archetype | rows | meanFP | maxFP | hasFaith% | meanOrgFaiths | meanDistinct |
|-----------|------|--------|-------|-----------|---------------|--------------|
| **faith** | 594 | **30.69** | **57** | **100%** | 6.74 | 17.52 |
| passive | 1226 | 0.00 | 0 | 0% | 6.78 | 16.47 |
| merchant | 1669 | 0.00 | 0 | 0% | 7.21 | 16.64 |
| slaver | 1642 | 0.00 | 0 | 0% | 7.17 | 16.62 |
| *(other 12)* | — | 0.00 | 0 | 0% | ~6.7 | ~16.5 |

- **DEAD columns (harness artifact):** `faithPower` and `hasFaith` are 0 for **15/16 archetypes** — only the
  `faith` archetype calls `openFaith`. This is a *policy choice* of the harness, not a game defect. It does,
  however, confirm faith is entirely **optional/ignorable**: no other play-style needs it to survive.
- **LIVE columns (real game):** `organizedFaiths` (~6–7, rising 2→9 over time) and `distinctFaiths` (~16–17,
  flat) are NPC-driven and behave identically whether or not the player founds a faith.

**Faith-archetype survival (last year reached per run):**

```
baseline  7:18  19:23  42:26   archipelago 7:17  19:17  42:26
pangaea   7:18  19:34  42:21   easy        7:19  19:24  42:21
hard      7:18  19:19  42:26   kingdom     7:100 19:67  42:100
```

15/18 collapse by yr 34; only developed `kingdom` starts survive. Founding a faith at yr ~1 spends
120g + 25 builders + 15 stone from a 140g treasury before the economy can bear it. Comeback-viability lens:
a faith realm that founds early and falls behind **never recovers** in a village start.

**CK3 story-generator lens.** *Verdict: partial.* `attemptAbsorb` (line 926) is a genuine story engine — a
failed absorption spawns a named `${t.name} Loyalists` faction, flips the target, and drags up to 2
co-religionist neighbours into an open civil war (−6 authority, −8 unity). That is exactly the kind of
reactive drama the lens rewards. But it almost never triggers in practice because faith realms collapse
before reaching 60% conversion, so in the data faith is stat-blocks (faithPower/temples/priests), not
stories.

---

## Flags that fired (cartridge 4.4)

- ✅ **Doctrines with no effect** — `ascetic`, `monumental`, `charitable` (FAITH-002).
- ✅ **faithPower with no meaningful sink** — monotonic, 0/576 decreases (FAITH-001).
- ✅ **Conversion never meaningfully changes outcomes** — distinctFaiths flat 13–22, absorb loop rarely fires
  (FAITH-005/006).
- ✅ **Theme incoherence — Zoroastrian realm with amoral slavery, no faith friction** (FAITH-003).
- ❌ **Faith snowball trivializing unity** — did NOT fire; faith is inert/negative, not overpowered.
- ❌ **Faith tier stuck/unreachable** — did NOT fire; organized tier is reachable and NPC evolution works.

---

## Key curves

Faith-archetype trajectory (mean across scenarios/seeds; n falls as runs collapse):

```
YEAR | faithPower  orgFaiths  distinct  (n)   | passive orgFaiths/distinct
   1 |   18.0        3.0        17.7   (18)   |   2.0 / 16.7
   5 |   23.0        4.4        17.7   (18)   |   3.5 / 16.7
  10 |   23.0        5.7        17.7   (18)   |   4.8 / 16.7
  20 |   28.1        6.5        17.5   (11)   |   6.2 / 16.7
  40 |   38.0        8.7        17.7   (3)    |   7.5 / 16.4
  70 |   46.5        9.5        17.0   (2)    |   7.8 / 16.3
 100 |   54.0        9.5        17.0   (2)    |   8.5 / 16.3
```

Reads as: faithPower ratchets up unbounded; organized faiths climb via NPC `faithEvolve` with or without a
player faith; distinct faiths never converge. Player faith adds ~+1 organized faith and ~+1 distinct faith
(its own) — a rounding error on the world.

---

## Opportunities (lean into Zoroastrian identity + faith×slavery tension)

1. **Give faithPower a real sink — spend it to act (S, high value).** Make `mission`, `absorb`, and edicts
   *cost* faithPower (e.g. mission −4, absorb −15) instead of merely reading it. Turns a monotone stat into a
   managed pool with opportunity cost, directly fixing FAITH-001 and making temples/wonders a *reserve* you
   deplete on campaigns of conversion. (Civ-6 opportunity-cost lens.)

2. **Asha vs Druj — a truth/order axis that makes slavery frictional (M, theme-defining).** Add
   `S.faith.purity` (Asha) that *rises* with temples/festivals/just rule and *falls* with slavery, razing,
   and broken oaths. Baseline (no doctrine needed): each slave-holding settlement bleeds purity, and low
   purity feeds unrest and caps loyalty — so a Zoroastrian slaver realm is inherently strained. Invert the
   current opt-in `abolition` into the *reward* branch (manumission → purity → unity/authority payoff). This
   makes the population/slavery cartridge (4.2) and faith cartridge share one tension. (Song of Syx lens.)

3. **Fire-tending as a faith building with upkeep (S, flavor+sink).** Replace the generic temple with a
   **Fire Temple** that must be *fed* (timber/priests) each season to keep `faithPower`; let it lapse and
   faithPower decays. A second sink for FAITH-001 and an authored Zoroastrian ritual instead of a stat stick.

4. **Make the two dead doctrines live and distinct (S).** `monumental` → temples give unity + prestige but
   double faithPower upkeep; `charitable` → temples reduce plague/unrest but yield no tax; `ascetic` → cheap
   clergy, slower spread but immovable hold. Converts a false choice into three real strategic forks.

5. **Schism & reform (M, kills the immortal-faith problem).** Let organized faiths fracture when a large
   realm's `laws.faith` clashes with subject faiths, spawning a rival organized sect — a downward pressure on
   `organizedFaiths` (currently 0/576 decreases) and a fresh CK3-style story source.

---

## Experiments to try next pass

1. **Add a faithPower cost to missions/absorb, re-run the `faith` archetype:** does faith become a
   resource-management decision, and does mean faithPower stop being monotone? (Direct test of FAITH-001.)
2. **Delay founding to yr ~8 in the faith archetype policy (or subsidize the founding cost):** does faith
   survival rise above 3/18, isolating how much of the collapse is the up-front 120g drain vs the general
   baseline-collapse wave that also kills passive/nomad/expansionist ~yr 20? (Separates FAITH-004 from the
   cross-domain economy finding.)
3. **Wire baseline slave→purity friction (Opportunity 2) and re-run `slaver` + `faith`:** measure whether a
   slave-holding faith realm shows higher unrest/earlier revolts, confirming the theme tension bites.

---

## Appendix

- **Version:** index.html git `62523dc0f0b808f4501acf35acf074d3f9acf36f`, script sha256 `4075d3270dbab183`.
- **Seeds:** 7, 19, 42 (frozen). **Scenarios:** baseline, archipelago, pangaea, easy, hard, kingdom.
- **Archetypes (16):** passive, conquest, **faith**, merchant, nomad, builder, isolationist, expansionist,
  balanced, exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor. Only `faith`
  exercises `openFaith`/missions.
- **CSV columns:** archetype, scenario, seed, year | faithPower, hasFaith, organizedFaiths, distinctFaiths.
- **Caveat honored:** many runs (esp. archipelago) end early via advanceSeason collapse; `n` shrinks with
  year — trajectories past yr ~30 rest on 2–4 surviving faith runs (the kingdom starts).
- **Lenses applied:** Song-of-Syx strata-unrest (faith×slavery) — *fails*; CK3 story-generator — *partial
  (absorb-backfire good, rarely fires)*; EU4 sinks — *fails (faithPower)*; Comeback-viability — *fails for
  faith*; standing lenses 1 (balance), 2 (meaningful choice — dead doctrines), 4 (legibility — bare
  faithPower), 8 (emergence — good NPC faithEvolve, no convergence), 9 (thematic coherence — primary).
- **Method:** analysis only, no re-run. Aggregates via node over `faith.csv`; code verified in `index.html`
  (lines 490–504 faith mechanics, 692–695 faith actions, 926–927 absorb/openFaith, 1064–1067 unrest,
  1169 advanceSeason faithPower drips).
