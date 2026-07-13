# Audit — Population, Labor & Slavery (Cartridge 4.2)

**Game version:** `index.html` git `62523dc0` (script sha256 `4075d3270dbab183`) · **Data:** `audit_out/population.csv`, 18,718 rows · **Run matrix:** 16 archetypes × 6 scenarios × seeds {7,19,42} × yr 1–100 (288 runs). **Pass:** first (no prior report/ledger).

## Executive summary

Population growth works: developed archetypes climb from ~920 to 7k–11k people over a century, food-gated by a soft ceiling. The domain's theme-critical question — *does slavery pose a real moral/mechanical dilemma, or is it free labor?* — resolves badly. **Slavery is, in practice, frictionless free labor.** The engine *does* code a strata-unrest term, a slave-revolt threshold, an abolition-doctrine penalty, a costed self-enslavement decree, and a manumission payoff — but at the magnitudes the simulation actually produces, none of them bite. Enslaving war captives costs **zero** unity/authority/faith; enslaved people are counted as *more* efficient than free labor (`slaveEff` base 1.2×); the mean slave-to-population ratio is **0.046**; the revolt threshold (ratio > 0.4) is crossed in **16 of 18,718 rows (0.09%)** and even then rarely fires; and slave-holding rows carry *higher* unity (86.3) than the same archetypes' slave-free rows (76.8). Manumission is never chosen (0 voluntary slave decreases across slaver/exploit-hunter runs). Only 3 of 16 archetypes ever hold a slave. Net: the mechanic is neither a dilemma nor a payoff — it is a silent, cost-free, marginally-useful stat that contradicts the Zoroastrian truth/purity framing.

Secondary findings: a dead-end captive pool (nomad freezes 35 captives for the whole run, never enslaving, ransoming, or settling them), a near-dead `captivesNow` column, and two minor accounting gaps (`freePop+slaves ≠ pop` where levied soldiers are the hidden third category; `popCeiling < pop` overshoot in late kingdom runs).

---

## New this pass

Everything below is net-new (first population pass). Findings are tagged and grounded in exact CSV/code numbers. Harness artifacts (a lever no policy ever pulled) are called out separately from real game behavior.

### F-POP-01 · **Critical** · Slavery is frictionless free labor — the moral/mechanical tension never materializes
Theme-critical. The cartridge flags "enslavement with zero unrest/faith/loyalty cost" as a primary failure mode; the data confirms it in practice despite friction code existing.

Confirmed from `index.html`:
- **Enslaving war captives is free.** `settleCaptives` (L1328) and `enslave` from captives (L705) do `s.slaves+=n; s.pop+=n` with **no** unity/authority/faith change. `doEnslaveDistribute` (L1711) likewise. The *only* costed path is enslaving your **own free populace** under unrestricted law: `S.authority-=7; S.unity-=8` (L705) — a path no archetype uses (all slaves come from captives).
- **Slaves are better labor than free citizens.** `slaveEff(s)=1.2+fortress*.1+workshop*.05+…` (L965) — base 1.2× multiplier, no upkeep, no downside.
- **Friction is coded but inert.** `checkRevolts` (L1063) adds `slaveRatio*.32` to unrest and fires a slave revolt only when `slaveRatio>0.4`; `abolition` doctrine adds `+.05` unrest if `s.slaves`. But the magnitudes never arrive: mean `slaves/pop = 0.046`, max 0.550; **ratio>0.4 in only 16/18,718 rows**, all in one run (exploit-hunter/pangaea/7, 142 slaves on pop ~258, yr53–58) — and that run still survived to yr61, so even a 0.55 ratio rarely tripped the `r()<unrest*.13` roll.
- **Unity moves the *wrong* way with slaves.** Mean unity in slave-holding rows vs slave-free rows: conquest 85.9 vs 76.7 · exploit-hunter 85.9 vs 76.8 · slaver 86.3 vs 76.8. Bucketed across all slaveholders, the 100+‑slave rows have the *highest* mean unity (89.1). (Correlational — slave rows are developed mid-game rows — but the point stands: there is no visible escalating cost; the slave path is the stable path.)

**Verdict:** the Zoroastrian morality is contradicted. Bondage is a pure win with a friction system that is tuned into irrelevance.

### F-POP-02 · **Major** · Slavery is a one-way trap and a dead mechanic for 13/16 playstyles
- **Only 3 of 16 archetypes ever hold a slave:** conquest (695 slave-rows, max 389), exploit-hunter (1,425 rows, max 286), slaver (1,628 rows, max 58). The other 13 never touch it.
- **Slaves only ever accumulate.** Yearly slave-count decreases: slaver **0**, exploit-hunter **0**, conquest **6** (and those 6 are settlement losses in war, not manumission). No policy ever manumits, sells, or ransoms held slaves. The manumission payoff (`manumit`: `s.slaves-=20; s.free+=20; S.unity+=2`, L706) and the ransom payoff (`S.unity+=1`, L~690) are **never exercised** — *partly a harness artifact* (no archetype weights these levers), but the +2/+1 unity payoffs are also plainly too weak to ever outweigh keeping 1.2×-efficiency free labor. So the "one-way trap" is real in code even where the harness is silent.
- **Slavery buys no growth edge.** Slaver reaches yr100 with mean pop **4,050 — the smallest of any survivor archetype** (builder 10,926, survivor 11,198). Slaves do only 10–15% of labor (`slaves/jobsTotal`: conquest 0.106, exploit-hunter 0.148, slaver 0.111). So slavery is not even OP — it's morally free and mechanically marginal.

### F-POP-03 · **Major** · Captives have no sink for non-slavers — nomad freezes 35 captives for the whole run
Nomad raids, takes captives into the global `S.captives` pool, and then **never disposes of them**. `captivesNow` sits at a constant 35 for the rest of the run: **669 of the 722 nonzero `captivesNow` rows are nomad**, and nomad's final `capturedCum` averages 28.4 with **slaves always 0** (its policy never calls `settleCaptives`, `enslave`, or `ransom`). Captured humans become a frozen, invisible, do-nothing counter. This is the RimWorld/DF emergent-anecdote lens failing: the one situation that should generate a story (prisoners to feed, ransom, or free) produces nothing.

### F-POP-04 · **Minor** · `captivesNow` is a near-dead column
Nonzero in only **722/18,718 rows (3.9%)**, and 92% of those are the nomad stuck-pool artifact (F-POP-03). Max value 67. It is a transient holding register (`S.captives`) that is normally drained the same or next season by `settleCaptives` (cap `min(20, S.captives)` per call). Not wrong, but as a logged population *category* it is essentially inert.

### F-POP-05 · **Minor** · `freePop + slaves ≠ pop` in 285 rows — mobilized levies are an unlogged third category
Gap = `pop − (freePop + slaves)` ranges **4–218**, concentrated in conquest (172 rows). It is **not** `captivesNow` (0/285 match). Source confirmed in code: levying/mustering does `s.free-=n` while the soldiers remain counted in `s.pop` (e.g. `launchSettler` L941, levy paths L1435–36, enslave-own L705). So `freePop` silently *excludes population currently under arms*; the gap tracks the standing levy (largest for conquest, and it jumps exactly when slave/troop counts jump — conquest/pangaea/7 gap 49→75 as slaves 272→389). Not data corruption, but a **legibility gap**: the CSV (and by extension any UI reading these fields) understates civilian population by the size of the mobilized army, with no column exposing it.

### F-POP-06 · **Minor** · `popCeiling < pop` overshoot in 24 late-game kingdom rows
Population exceeds its own food-based ceiling by up to ~885 (builder/kingdom/7 yr100: pop 25,084 vs ceil 24,199). `popCeiling(s)=round(foodGrown/EAT*.9*…)` (L606) is a *soft* gate and growth (~+0.4%/season) overshoots it transiently in the fastest-growing kingdom starts. Cosmetic/soft-cap lag, all in the kingdom scenario.

### F-POP-07 · **Polish** · `slaveEff` 1.2× makes slaves a strict labor no-brainer
Because enslaved labor is 1.2× base efficiency (rising to ~1.45× with fortress+workshop+barracks, L965) with no upkeep, no housing pressure that bites, and no realistic revolt risk, the *only* thing stopping slavery being a dominant economic engine is that the harness policies rarely pursue it — not any in-game brake. Any human player who chains raids would find enslavement strictly dominant over training free workers.

---

## Section-by-section (cartridge 4.2)

**1. Population categories.** Logged: `pop` (=`ownedPop()`, sum of `s.pop`), `freePop` (sum `s.free`), `slaves` (sum `s.slaves`), `captivesNow` (`S.captives` global pool). Hidden/unlogged: mobilized levies (F-POP-05), soldiers. No phantom categories; `captivesNow` near-dead (F-POP-04).

**2. Growth mechanics.** Food-gated via `popCeiling` (`foodGrown/EAT*.9`, +12% with aqueduct wonder). `arableCap` (L586, `400+farms*550+tiles*160`) is a separate housing/food track. Growth ~+0.4%/season on both `pop` and `free`. Gate is soft (F-POP-06). Curves below.

**3. Mortality & loss.** Plague, flood, volcano, earthquake events subtract from `s.pop`/`s.free` (`naturalEvents`, `randomEvents` L~1063–1088). Conquest runs show sharp pop drops on settlement loss (conquest/pangaea/7: 3,541→2,338 between yr38–39) with no recovery before collapse — see comeback lens.

**4. Migration/refugees.** Random event adds 40–120 migrants to a settlement (`s.free+=n; s.pop+=n`, L1086); embassy/festival minor. Inflow is small relative to organic growth; not a comeback lever (see lens).

**5. Enslaved/bonded.** The heart of this audit — see F-POP-01/02/03/07. Acquisition: captives (free), `buy_slaves` (20 for ~35g, L658), self-enslavement (costed, unused). SlaveJobs feed production at 1.2×+. Count toward `s.pop` (yes). Revolt risk coded but inert. Manumission coded, unused. Law/doctrine interaction coded (`abolished`/`debt` forbid trade & slave-soldiers; `abolition` doctrine +unrest) but **no policy ever changes `S.laws.slavery` off `unrestricted` or adopts `abolition`** — harness artifact; effects unobservable in data, judged from code.

**6. Carrying capacity & caps.** `popCeiling` soft (overshoot F-POP-06). Slaves add to `s.pop` and thus consume against the food ceiling — one genuine (weak) brake on slave stacking.

**7. Class/job mobility & one-way traps.** Slavery is a one-way ratchet (F-POP-02): captives→slaves, never back. Manumission exists but is never worth it.

**8. Labor allocation.** Slaves do 10–15% of slaveholders' labor at 1.2× efficiency; free jobs do the rest. No allocation tension surfaced (slaves auto-productive).

**9. Unrest/loyalty/revolt.** `checkRevolts` slaveRatio term inert at observed ratios (F-POP-01). Conquered-settlement loyalty term (`(70-loyalty)/115`) is the more active revolt driver, not slavery.

**10–12. UI/curves/archetype comparison.** Curves and table below. (UI is `ui` domain.)

---

## Key curves & tables

**Growth curve — mean `pop` at year (runs still alive at that year):**

| archetype | yr1 | yr10 | yr25 | yr50 | yr75 | yr100 |
|---|---|---|---|---|---|---|
| survivor | 924 | 1,223 | 1,862 | 4,094 | 6,180 | **11,198** |
| builder | 922 | 1,200 | 1,886 | 3,824 | 5,944 | **10,926** |
| conquest | 923 | 1,251 | 2,169 | 5,333 | 6,299 | 9,952 |
| passive | 922 | 1,191 | 1,863 | 3,925 | 5,670 | 9,776 |
| merchant | 922 | 1,192 | 1,744 | 2,926 | 4,195 | 7,358 |
| **slaver** | 924 | 1,225 | 1,668 | 2,374 | 2,744 | **4,050** |

Slaver is the *slowest-growing* survivor — bondage is not a growth engine.

**Survival (runs reaching yr100 / 18):** merchant 16 · slaver 14 · builder 13 · techlord 13 · thalassocrat 12 · diplomat 12 · survivor 12 · passive 10 · spymaster 10 · balanced 9 · exploit-hunter 7 · conquest 3 · nomad 3 · isolationist 3 · expansionist 3 · faith 2. *(Baseline/archipelago/hard truncations noted in README caveat — many yr19–40 ends are `advanceSeason` throws with over=0, not organic collapse; slaver's high survival is partly that it dodges those early-throw scenarios, but its pop trajectory is genuinely small.)*

**Slavery footprint:** slave-holding rows 3,748/18,718 · mean ratio 0.046 · max ratio 0.550 · ratio>0.4 in 16 rows · slaves never decrease voluntarily (0 manumissions).

**Dead/impossible columns:** `captivesNow` near-dead (3.9% nonzero, 92% nomad artifact). `freePop+slaves≠pop` 285 rows (levy artifact, F-POP-05). `popCeiling<pop` 24 rows (soft-cap lag, F-POP-06). No `pop<0`, no sub-population-exceeds-total (the gap is always `pop > parts`). `slaves>0 & capturedCum==0`: 0 (every slave has a valid captive origin — good).

---

## Design-pattern lenses applied

- **Song of Syx — Strata-unrest test (primary):** **FIRES / FAIL.** The strata-unrest curve exists in code (`slaveRatio*.32`, revolt>0.4, abolition doctrine) but is tuned into irrelevance — mean ratio 0.046, threshold reached 0.09% of the time, unity *higher* with slaves. Exploitation carries no escalating cost. This is F-POP-01.
- **RimWorld/DF — Emergent-anecdote test (lesser weight):** **FIRES / WEAK.** Slavery generates no incidents: no revolts in practice, no manumission drama, no slave-soldier betrayal, and captives freeze uneventfully in a pool (F-POP-03). The systems apply a silent labor stat, not stories.
- **Civ/EU — Comeback-viability test:** **FIRES / FAIL (terminal collapse).** Population is monotone for survivors and collapses are early (yr19–40) and irreversible; a realm that starts shedding settlements/pop (conquest 3,541→2,338) never rebuilds before `over`. Migration inflow (40–120/event) is far too small to rubber-band. No pop comeback lever.

**Standing lenses foregrounded (Section 2):** Balance & tuning (1), Meaningful choice (2), Feedback loops (6), Emergent behavior (8), Thematic & historical coherence (9), Legibility (4).

**Problem-taxonomy flags that fired:** enslavement with zero unrest/faith/loyalty cost ✔ (F-POP-01) · slaveSoldiers/slaves with no downside ✔ (F-POP-01/07) · captives with no valid sink ✔ (F-POP-03, nomad) · near-dead category ✔ (`captivesNow`) · impossible/accounting states ✔ (freePop+slaves≠pop; popCeiling<pop) · one-way class trap ✔ (F-POP-02). Not fired: phantom categories, negative pop, sub-pop>total, captives with no origin.

---

## Opportunities

Lean into the slavery-morality tension — the goal is to make bondage a *choice with a cost*, not free labor.

1. **Escalating slave-burden ("the lie festers"), effort S.** Re-tune the existing `slaveRatio*.32` so it bites at realistic ratios: make it convex (e.g. `(slaveRatio/0.15)^2 * k`) and add a small *realm-wide* faith/authority drag per season proportional to total slaves under a truth/purity doctrine, independent of ratio. Effect: at 5–15% slave share (where play actually sits) there's now a live unity/faith tax, turning slaveEff's labor bonus into a genuine tradeoff. Ties directly to Zoroastrian *asha/druj*.

2. **Make captives a decision with a clock, effort S–M.** Held `S.captives` should *cost* upkeep (food/gold) or decay/die each season, forcing a choice: enslave (labor, +burden #1), ransom (gold + relations + small unity), settle-as-free (pop + loyalty), or execute (authority + druj/faith penalty). Fixes F-POP-03's frozen nomad pool and gives every capturer a real dilemma. Currently ransom/manumit exist but are dominated — this reweights them.

3. **Manumission as a live lever, effort S.** Scale the manumission payoff to matter: freeing slaves grants unity/prestige *and* converts them to free labor with a loyalty bonus, while a Zoroastrian "purity edict" could make abolition a mid-game reform path (the coded `abolition` doctrine currently just adds unrest with no upside). Effect: creates the manumission→loyalty payoff the cartridge asks for; gives faith archetypes an anti-slavery identity.

4. **Surface the hidden military-population category, effort S.** Log and display mobilized levies so `freePop + slaves + soldiers = pop` reconciles (fixes F-POP-05's legibility gap) and the player can see how much of their population is under arms — a real strategic signal for over-mobilization.

5. **Slave-revolt as an emergent story, effort M.** Lower the revolt threshold from 0.4 to something reachable (~0.25) *and* make a slave revolt a scripted incident (frees the slaves, spawns a rebel band, offers a choice: brutal suppression [authority up, faith/unity down] vs. concession [manumit, unity up]). Feeds both the strata-unrest and emergent-anecdote lenses.

---

## Experiments to try next

1. **Does an escalating burden curve actually make slavery a choice?** Add Opportunity #1, add a `slaverUnityDrag`/`slaveBurden` column, and re-run the 3 slaveholding archetypes: does slaver's yr100 unity fall below non-slavers, and does slave share plateau (a brake) instead of ratcheting?
2. **Teach the harness the unused levers.** Give slaver/exploit-hunter policies weights on `manumit`, `ransom`, and `set_laws(slavery)`, and add an `abolitionist`-flavored faith run, so the currently-artifact levers produce observable data — then we can judge the *game* balance of manumission/abolition rather than inferring from code.
3. **Captive-upkeep sink.** Attach a per-season food/gold cost to `S.captives` and re-check whether nomad's frozen pool forces a disposal decision (F-POP-03) and whether it changes conquest's economy.

---

## Appendix

- **Seeds:** 7, 19, 42 (README freezes 10; this run used 3). **Years:** 1–100. **Runs:** 288, 18,718 year-rows.
- **Scenarios:** baseline, archipelago(large/islands), pangaea(small/crowded), easy(2 AI), hard(5 AI), kingdom(kingdom-start).
- **Archetypes (16):** passive, conquest, faith, merchant, nomad, builder, isolationist, expansionist, balanced, exploit-hunter, diplomat, spymaster, thalassocrat, slaver, techlord, survivor.
- **Truncation caveat:** per README, 32/48 archipelago, 22/48 hard, 14/48 baseline runs end before yr100 with `over=0` (an `advanceSeason` throw, not organic collapse). Trajectories in those scenarios are truncated; survival counts above reflect this, growth curves use only runs alive at each sampled year.
- **Harness artifacts (levers no policy pulled):** `manumit`, `ransom`, `sell_slaves`, `set_laws(slavery≠unrestricted)`, `abolition` doctrine. Their effects are read from `index.html`, not the CSV.
- **`55555` is NOT a sentinel:** it is organic growth — builder/kingdom/19 climbs 50,710→52,451→54,176→55,555 across yr97–100.
- **Game version:** git `62523dc0f0b808f4501acf35acf074d3f9acf36f`, script sha256_16 `4075d3270dbab183`, runtime 6,825s.
- **Code anchors:** `settleCaptives` L1328 · `doEnslaveDistribute` L1711 · `enslave`/`manumit` L705–706 · `buy_slaves`/`sell_slaves` L658–659 · `slaveEff` L965 · `checkRevolts` L1063 · `popCeiling` L606 · `arableCap` L586 · `ownedPop` L526 · `slaveSoldiers` L542.
