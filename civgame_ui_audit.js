// Civ-Game UI audit — README_AUDIT.md `ui` command.
// Complements the headless sim harness (which no-ops rendering and is blind to visual/touch bugs).
// Drives the REAL rendered game with Playwright across desktop viewports AND emulated mobile
// devices (real mobile UA + touch + deviceScaleFactor), walks every major surface/modal, screenshots
// each, and runs automated layout / tap-target / broken-value / console-error checks.
//
//   node civgame_ui_audit.js
//
// Output: audit_out/ui/<device>/<surface>.png  ·  audit_out/ui/findings.json  ·  audit_out/report_ui.md
//
// Only the Chromium browser binary is present in this environment, so cross-browser is Chromium +
// Chromium-based mobile emulation. Firefox/WebKit are skipped (binaries absent) — noted in the report.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUT = path.join(__dirname, 'audit_out');
const UIOUT = path.join(OUT, 'ui');
const GAME_URL = 'file://' + path.join(__dirname, 'index.html');
const SEED = 111;

function loadPlaywright(){
  const cands = ['playwright', 'playwright-core'];
  try { cands.push(execSync('npm root -g').toString().trim() + '/playwright'); } catch(e){}
  cands.push('/opt/node22/lib/node_modules/playwright', '/opt/node22/lib/node_modules/playwright-core');
  for (const c of cands){ try { return require(c); } catch(e){} }
  throw new Error('Playwright not found (tried: ' + cands.join(', ') + '). Install playwright or set NODE_PATH.');
}
async function launchChromium(pw){
  try { return await pw.chromium.launch({ headless: true }); }
  catch(e){
    for (const ep of ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']){
      try { return await pw.chromium.launch({ headless: true, executablePath: ep }); } catch(_){}
    }
    throw e;
  }
}

// ---------- in-page helpers (stringified, injected via addInitScript/evaluate) ----------
// Develop a mid-game realm so panels/modals have real content to render.
const BOOTSTRAP = (seed) => {
  S = newState(seed, {size:'medium',terrain:'continents',density:'balanced',ai:4,difficulty:'normal',
    start:'city',realmName:'Aurelia',capitalName:'Riverhold',rulerName:'Rasa',dynasty:'Crownwater'});
  let c = owned()[0];
  Object.assign(c.infra, {barracks:2, market:2, walls:1, academy:1, bazaar:1, temple:1, shipyard:c.coast||c.water?1:0});
  c.jobs.scholars = 20; c.jobs.merchants = 15; c.jobs.priests = 4; c.jobs.builders = 12;
  S.tech = ['writing','currency','masonry','irrigation','horsemanship','metallurgy','engineering','bureaucracy'];
  owned().forEach(s => s.tech = S.tech.slice());
  try { S.faith = {name:'Way of the Sacred Flame', deity:'the Sacred Flame', clergy:'crown', doctrines:['militant','monumental']};
    S.faithTier = S.faithTier||{}; S.faithTier[S.faith.name] = 'organized'; S.faithPower = 30; shiftFaith(c, S.faith.name, 80); } catch(e){}
  let f = W.settlements.find(s => s.owner && s.owner!=='player' && !s.ruined);
  if (f){ f.intel = 4; f.garrisonIntel = 3; }
  for (let i=0;i<8;i++){ try { advanceSeason(); } catch(e){ break; } }
  if (!owned().length) return {cap:null, foreign:null, year:S.year, over:!!S.over};
  selected = {kind:'settlement', data: owned()[0]};
  try { if (typeof fitWorld==='function') fitWorld(); } catch(e){}
  renderAll();
  return {cap: owned()[0].id, foreign: f?f.id:null, year: S.year, over:!!S.over};
};

// Automated checks run on the current surface; returns an array of findings.
const COLLECT = () => {
  const out = [];
  const vw = window.innerWidth, vh = window.innerHeight;
  const sel = el => el.tagName.toLowerCase() + (el.id?'#'+el.id:'') +
    (typeof el.className==='string' && el.className ? '.'+el.className.split(' ').filter(Boolean).slice(0,2).join('.') : '');
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 2) out.push({type:'h-scroll', sev:'major', msg:`page scrollWidth ${sw} > viewport ${vw} — horizontal scroll`});
  const interactive = [...document.querySelectorAll('button,.btn,.tab,.ctab,.cact,.iconbtn,.vtab,select,input,a[onclick],[role=button]')];
  const tiny = [];
  for (const el of interactive){
    const r = el.getBoundingClientRect();
    if (r.width===0 && r.height===0) continue;
    const st = getComputedStyle(el);
    if (st.display==='none' || st.visibility==='hidden' || st.opacity==='0' || el.disabled) continue;
    const inView = r.bottom>0 && r.top<vh && r.right>0 && r.left<vw;
    if (!inView) continue;
    if (r.right > vw + 1 || r.left < -1)
      out.push({type:'offscreen-x', sev:'major', msg:`${sel(el)} off-screen (left ${Math.round(r.left)}, right ${Math.round(r.right)}, vw ${vw})`});
    if (r.width < 44 || r.height < 44) tiny.push({t:sel(el), w:Math.round(r.width), h:Math.round(r.height)});
  }
  if (tiny.length) out.push({type:'tap-target', sev:'minor', count:tiny.length, samples:tiny.slice(0,10),
    msg:`${tiny.length} visible interactive element(s) under 44px`});
  // clipped content: element scrolls horizontally beyond its box (text cut off)
  for (const el of document.querySelectorAll('.stat,.chip,.cact b,.action h4,.place-title,#dateText,.cardhead span')){
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow!=='auto'){
      const r = el.getBoundingClientRect(); if (r.width>0)
        out.push({type:'clipped-text', sev:'minor', msg:`${sel(el)} content clipped (scrollW ${el.scrollWidth} > clientW ${el.clientWidth}) "${(el.textContent||'').trim().slice(0,40)}"`});
    }
  }
  // broken display values in visible text
  const bad = /NaN|undefined|\[object Object\]|\bInfinity\b/;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()){
    const t = walker.currentNode.nodeValue;
    if (t && bad.test(t)){
      const p = walker.currentNode.parentElement;
      if (p){ const st = getComputedStyle(p); if (st.display==='none'||st.visibility==='hidden') continue; }
      const s = t.trim().slice(0,70);
      if (s && !seen.has(s)){ seen.add(s); out.push({type:'broken-value', sev:'major', msg:`shows "${s}"`}); }
    }
  }
  return out;
};

// Surfaces to walk. `run` is a string evaluated in page context; `modal` marks overlay surfaces.
const SURFACES = [
  { name:'01-map-terrain',      run:`selected={kind:'settlement',data:owned()[0]}; renderAll();` },
  { name:'02-map-political',    run:`var v=document.querySelector('.vtab[data-view=political]'); v&&v.click();` },
  { name:'03-panel-chronicle',  run:`document.querySelector('.vtab[data-view=terrain]').click(); document.querySelector('.tab[data-pane=chronicle]').click();` },
  { name:'04-panel-court',      run:`document.querySelector('.tab[data-pane=court]').click();` },
  { name:'05-panel-realm',      run:`document.querySelector('.tab[data-pane=realm]').click();` },
  { name:'06-panel-faith',      run:`document.querySelector('.tab[data-pane=faith]').click();` },
  { name:'07-panel-codex',      run:`document.querySelector('.tab[data-pane=codex]').click();` },
  { name:'08-council-agri',     run:`pickCouncil('agri');` },
  { name:'09-council-infra',    run:`pickCouncil('infra');` },
  { name:'10-council-trade',    run:`pickCouncil('trade');` },
  { name:'11-council-military',  run:`pickCouncil('military');` },
  { name:'12-council-diplo',    run:`pickCouncil('diplo');` },
  { name:'13-council-faith',    run:`pickCouncil('faith');` },
  { name:'14-council-rule',     run:`pickCouncil('rule');` },
  { name:'15-modal-research',   run:`openResearch();`, modal:true },
  { name:'16-modal-law',        run:`openLawCode('rule');`, modal:true },
  { name:'17-modal-recruit',    run:`openRecruitOrder(owned()[0],'archers',false,'military');`, modal:true },
  { name:'18-modal-levy',       run:`openLevyOrder(owned()[0],'military');`, modal:true },
  { name:'19-modal-faith',      run:`openFaith('faith',owned()[0]);`, modal:true },
  { name:'20-modal-wonders',    run:`openWonders(owned()[0].id);`, modal:true },
  { name:'21-modal-scout',      run:`openScoutAt(Math.round(owned()[0].x+140),Math.round(owned()[0].y+50));`, modal:true },
  { name:'22-modal-mercs',      run:`openMercs(owned()[0],'military');`, modal:true },
  { name:'23-modal-battle',     modal:true, run:`
     S.battleReports=[{player:true,title:'Battle of Tarsheva',atk:'Host of Riverhold',def:'Tarsheva',
       lines:['Missile exchange favours your archers (+18%).','The shock charge breaks their flank.','The line holds; the enemy routs.'],
       win:true,outcome:'Victory',atkKilled:212,defKilled:640,unit:'fallen',x:owned()[0].x,y:owned()[0].y}];
     showBattleModal();` },
  { name:'24-modal-siege',      modal:true, run:`
     var t=W.settlements.find(s=>s.owner&&s.owner!=='player'&&!s.ruined)||owned()[0];
     var a={id:'auditHost',x:t.x,y:t.y,units:[{type:'heavy',count:220}],order:'siege',name:'Host of Riverhold',home:owned()[0].id};
     S.armies.push(a);
     S.pendingSieges=[{armyId:a.id,tId:t.id,name:t.name,progress:62,food:140,garrison:90,walls:2,fortress:0,port:!!(t.water||t.coast),blockaded:false}];
     showSiegeModal();` },
  { name:'25-modal-conquest',   modal:true, run:`
     var t=W.settlements.find(s=>s.owner&&s.owner!=='player'&&!s.ruined); if(t){t.owner='player'; t.intel=t.garrisonIntel=4;
       S.pendingConquest=[{tId:t.id,prevOwner:'f0',allies:[]}]; showConquestModal();}` },
];

// ---------- device matrix ----------
function buildDevices(pw){
  const devices = pw.devices || {};
  const list = [
    { name:'desktop-1280x800',  kind:'desktop', ctx:{ viewport:{width:1280,height:800},  deviceScaleFactor:1 } },
    { name:'desktop-1920x1080', kind:'desktop', ctx:{ viewport:{width:1920,height:1080}, deviceScaleFactor:1 } },
  ];
  const wanted = [
    ['iphone13-portrait',  ['iPhone 13','iPhone 12','iPhone 11']],
    ['iphone13-landscape', ['iPhone 13 landscape','iPhone 12 landscape','iPhone 11 landscape']],
    ['pixel7-portrait',    ['Pixel 7','Pixel 5','Pixel 4']],
    ['iphonese-portrait',  ['iPhone SE','iPhone SE (3rd gen)']],
  ];
  for (const [label, prefs] of wanted){
    const key = prefs.find(k => devices[k]);
    if (!key){ console.warn(`  (skip ${label}: no matching device descriptor)`); continue; }
    const d = devices[key];
    list.push({ name:label, kind:'mobile', descriptor:key,
      ctx:{ ...d, hasTouch:true, isMobile:true } }); // ensure real touch+mobile even if descriptor omits
  }
  return list;
}

(async () => {
  const pw = loadPlaywright();
  fs.mkdirSync(UIOUT, { recursive: true });
  const browser = await launchChromium(pw);
  const devices = buildDevices(pw);
  const all = []; // { device, kind, surface, findings:[], console:[], modalShown, error }
  const t0 = Date.now();

  for (const dev of devices){
    console.log(`\n▸ ${dev.name} (${dev.kind}${dev.descriptor?': '+dev.descriptor:''})`);
    const dir = path.join(UIOUT, dev.name);
    fs.mkdirSync(dir, { recursive: true });
    let context, page;
    const consoleMsgs = [];
    let curSurface = 'boot';
    try {
      context = await browser.newContext(dev.ctx);
      page = await context.newPage();
      page.on('console', m => { const ty=m.type(); if (ty==='error'||ty==='warning') consoleMsgs.push({surface:curSurface, type:ty, text:m.text().slice(0,200)}); });
      page.on('pageerror', e => consoleMsgs.push({surface:curSurface, type:'pageerror', text:(e.message||String(e)).slice(0,200)}));
      await page.goto(GAME_URL, { waitUntil:'load' });
      await page.waitForTimeout(300);
      const boot = await page.evaluate(`(${BOOTSTRAP})(${SEED})`);
      await page.waitForTimeout(200);
      if (!boot.cap) console.warn(`  bootstrap produced no capital (over=${boot.over})`);
    } catch(e){
      console.warn(`  device setup failed: ${e.message}`);
      all.push({ device:dev.name, kind:dev.kind, surface:'boot', error:e.message, findings:[], console:consoleMsgs });
      if (context) await context.close().catch(()=>{});
      continue;
    }

    for (const surf of SURFACES){
      curSurface = surf.name;
      let modalShown = null, error = null, findings = [];
      try {
        try { await page.evaluate(`try{closeModal&&closeModal();}catch(e){}`); } catch(_){}
        await page.evaluate(surf.run);
        await page.waitForTimeout(160);
        if (surf.modal){
          modalShown = await page.evaluate(`!!document.getElementById('overlay') && document.getElementById('overlay').classList.contains('show')`);
        }
        findings = await page.evaluate(`(${COLLECT})()`);
        await page.screenshot({ path: path.join(dir, surf.name + '.png') });
      } catch(e){ error = e.message.slice(0,160); }
      all.push({ device:dev.name, kind:dev.kind, surface:surf.name, modal:!!surf.modal, modalShown, error,
        findings, console: consoleMsgs.filter(m=>m.surface===surf.name) });
      const n = findings.length + (error?1:0) + (surf.modal && modalShown===false ? 1 : 0);
      process.stdout.write(`  ${surf.name}: ${n?('⚠ '+n):'ok'}${surf.modal&&modalShown===false?' [modal did not open]':''}\n`);
    }
    await context.close().catch(()=>{});
  }
  await browser.close();
  const runtimeMs = Date.now() - t0;

  // ---------- aggregate + write report ----------
  fs.writeFileSync(path.join(UIOUT, 'findings.json'), JSON.stringify(all, null, 1));

  // Dedupe findings across devices by (type,msg); track which devices show each.
  const agg = new Map();
  for (const rec of all){
    for (const f of (rec.findings||[])){
      const key = f.type + '|' + f.msg;
      if (!agg.has(key)) agg.set(key, { ...f, devices:new Set(), kinds:new Set() });
      const a = agg.get(key); a.devices.add(rec.device); a.kinds.add(rec.kind);
    }
  }
  const consoleAll = [];
  for (const rec of all) for (const m of (rec.console||[])) consoleAll.push({ device:rec.device, surface:rec.surface, ...m });
  const modalMisses = all.filter(r => r.modal && r.modalShown===false).map(r => `${r.device} / ${r.surface}`);
  const errors = all.filter(r => r.error).map(r => `${r.device} / ${r.surface}: ${r.error}`);

  const sevRank = { major:0, minor:1 };
  const findingList = [...agg.values()].sort((a,b)=> (sevRank[a.sev]-sevRank[b.sev]) || (b.devices.size-a.devices.size));
  const mobileOnly = findingList.filter(f => [...f.kinds].every(k=>k==='mobile'));

  const L = [];
  L.push(`# Crown Waters — UI / Interaction Audit`);
  L.push(``);
  L.push(`_Generated ${new Date().toISOString()} · runtime ${(runtimeMs/1000).toFixed(1)}s · seed ${SEED}_`);
  L.push(``);
  L.push(`Complements the headless sim audit (which no-ops rendering). Drives the **real rendered game**`);
  L.push(`with Playwright across desktop viewports and emulated mobile devices (real mobile UA + touch +`);
  L.push(`deviceScaleFactor), walking every major surface and modal.`);
  L.push(``);
  L.push(`> Only the Chromium browser binary is present in this environment, so cross-browser coverage is`);
  L.push(`> Chromium + Chromium-based mobile emulation. Firefox/WebKit are skipped (binaries absent).`);
  L.push(``);
  const devNames = [...new Set(all.map(r=>r.device))];
  L.push(`## Coverage`);
  L.push(`- Devices (${devNames.length}): ${devNames.join(', ')}`);
  L.push(`- Surfaces per device: ${SURFACES.length} (map views, 5 panels, 7 council tabs, 11 action/battle/siege modals)`);
  L.push(`- Screenshots: \`audit_out/ui/<device>/<surface>.png\` · raw findings: \`audit_out/ui/findings.json\``);
  L.push(``);
  L.push(`## Summary`);
  L.push(`| kind | count |`);
  L.push(`|---|---|`);
  L.push(`| distinct findings | ${findingList.length} |`);
  L.push(`| — major | ${findingList.filter(f=>f.sev==='major').length} |`);
  L.push(`| — minor | ${findingList.filter(f=>f.sev==='minor').length} |`);
  L.push(`| mobile-only findings | ${mobileOnly.length} |`);
  L.push(`| console errors / pageerrors | ${consoleAll.length} |`);
  L.push(`| modals that failed to open | ${modalMisses.length} |`);
  L.push(`| surface run errors | ${errors.length} |`);
  L.push(``);
  const emit = (title, items) => {
    L.push(`## ${title} (${items.length})`);
    if (!items.length){ L.push(`_none_`); L.push(``); return; }
    for (const f of items){
      const devs = [...f.devices]; const tag = devs.length===devNames.length ? 'ALL devices' : (devs.length>3?devs.length+' devices':devs.join(', '));
      L.push(`- **[${f.sev}] ${f.type}** — ${f.msg}  \n  _seen on: ${tag}_${f.samples?`  \n  e.g. ${f.samples.slice(0,5).map(s=>`\`${s.t} ${s.w}×${s.h}\``).join(', ')}`:''}`);
    }
    L.push(``);
  };
  emit('Major findings', findingList.filter(f=>f.sev==='major'));
  emit('Mobile-only findings', mobileOnly);
  emit('Minor findings', findingList.filter(f=>f.sev==='minor'));

  L.push(`## Console errors & page errors (${consoleAll.length})`);
  if (!consoleAll.length) L.push(`_none — clean across all surfaces_`);
  else { const seen=new Set(); for (const m of consoleAll){ const k=m.type+'|'+m.text; if(seen.has(k))continue; seen.add(k);
    L.push(`- \`${m.type}\` (${m.device} / ${m.surface}): ${m.text}`); } }
  L.push(``);
  L.push(`## Modals that did not open (${modalMisses.length})`);
  L.push(modalMisses.length ? modalMisses.map(m=>`- ${m}`).join('\n') : `_all modals opened_`);
  L.push(``);
  if (errors.length){ L.push(`## Surface run errors (${errors.length})`); L.push(errors.map(e=>`- ${e}`).join('\n')); L.push(``); }

  L.push(`## UX-judgment notes (lenses)`);
  L.push(`Automated checks above cover layout/tap/values/console. The following need a human eye on the`);
  L.push(`screenshots (this pass flags where to look, per README_AUDIT.md Section 2):`);
  L.push(`- **Legibility (lens 4):** is the authority/treasury death-spiral surfaced? Open \`05-panel-realm\``);
  L.push(`  and the Ledger stats — when treasury is low, is the coming authority collapse visible to the player,`);
  L.push(`  or silent? (The sim audit shows this is the #1 killer.)`);
  L.push(`- **Tap-count / friction:** count taps to issue one season's actions on \`iphonese-portrait\` —`);
  L.push(`  council tab → action → modal → confirm. Flag any action needing >3 taps.`);
  L.push(`- **Discoverability:** are the map view tabs, scouting (◎), and reveal (👁) legible on small screens?`);
  L.push(`- **Ergonomics:** on \`iphone13-landscape\` does the map + council fit without the page scrolling`);
  L.push(`  horizontally, and are the End Season / footer buttons reachable with a thumb?`);
  L.push(``);
  fs.writeFileSync(path.join(OUT, 'report_ui.md'), L.join('\n') + '\n');

  // console summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`UI audit done — ${(runtimeMs/1000).toFixed(1)}s · ${devNames.length} devices × ${SURFACES.length} surfaces`);
  console.log(`  distinct findings: ${findingList.length} (major ${findingList.filter(f=>f.sev==='major').length}, minor ${findingList.filter(f=>f.sev==='minor').length})`);
  console.log(`  mobile-only: ${mobileOnly.length} · console errors: ${consoleAll.length} · modals not opened: ${modalMisses.length} · run errors: ${errors.length}`);
  console.log(`  report: audit_out/report_ui.md · screenshots: audit_out/ui/<device>/`);
})().catch(e => { console.error('UI AUDIT FAILED:', e && e.stack ? e.stack : e); process.exit(1); });
