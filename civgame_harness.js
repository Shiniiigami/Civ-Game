// Civ-Game headless harness — README_AUDIT.md setup 1b/1c.
// Runs the REAL engine under a stubbed DOM in Node's vm (no browser). Each season a per-archetype
// policy issues real council actions, then advanceSeason(), then a phased combat resolver drives
// every pending siege/conquest/spoils modal to conclusion (modals are no-op'd, so we call the
// resolver functions directly). Emits one CSV per domain, all keyed on archetype,seed,year.
//   node civgame_harness.js          -> validation smoke (seeds 7,42 -> yr100)
//   node civgame_harness.js --full   -> frozen campaign (10 archetypes x 5 seeds x 100y) + master/meta
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const gameSrc = HTML.match(/<script>([\s\S]*?)<\/script>/)[1];
const OUT = path.join(__dirname, 'audit_out');
fs.mkdirSync(OUT, { recursive: true });

// ---------- INPUTS-backed DOM stub ----------
const INPUTS = {};
const genFake = new Proxy(function(){}, {
  apply(){ return genFake; }, set(){ return true; },
  get(t,p){
    switch(p){
      case 'style': return new Proxy({},{get:()=> '',set:()=>true});
      case 'classList': return {add(){},remove(){},toggle(){},contains(){return false;}};
      case 'value': case 'textContent': case 'innerHTML': case 'innerText': return '';
      case 'max': return '9999'; case 'min': return '0';
      case 'getBoundingClientRect': return ()=>({left:0,top:0,width:640,height:480,right:640,bottom:480,x:0,y:0});
      case 'getContext': return ()=>genFake; case 'measureText': return ()=>({width:0});
      case 'querySelectorAll': return ()=>[]; case 'querySelector': return ()=>genFake;
      case 'children': case 'childNodes': return []; case 'dataset': return {};
      case 'parentNode': case 'parentElement': case 'cloneNode': return genFake;
      case 'clientWidth': case 'clientHeight': case 'offsetWidth': case 'offsetHeight': return 640;
      case Symbol.toPrimitive: return ()=>'';
      default: return genFake;
    }
  }
});
const elCache = {};
function mkEl(id){
  if (elCache[id]) return elCache[id];
  const el = new Proxy(function(){}, {
    apply(){ return el; },
    set(t,p,v){ if(p==='value'||p==='textContent'||p==='innerHTML') INPUTS[id]=v; return true; },
    get(t,p){
      if(p==='value'||p==='textContent'||p==='innerHTML'||p==='innerText')
        return (id in INPUTS) ? String(INPUTS[id]) : '';
      if(p==='max') return (INPUTS[id+'__max']!=null)?String(INPUTS[id+'__max']):'9999';
      return genFake[p];
    }
  });
  return (elCache[id]=el);
}
const documentStub = {
  getElementById: mkEl, createElement: ()=>genFake, createElementNS: ()=>genFake,
  querySelector: ()=>genFake, querySelectorAll: ()=>[], createDocumentFragment: ()=>genFake,
  addEventListener(){}, removeEventListener(){}, body: genFake, head: genFake,
  documentElement: genFake, activeElement: null
};
const sandbox = {
  console, document: documentStub, navigator: {},
  location: { reload(){}, href:'', origin:'' },
  localStorage: { getItem:()=>null, setItem(){}, removeItem(){}, clear(){} },
  setTimeout: ()=>0, clearTimeout: ()=>{}, setInterval: ()=>0, clearInterval: ()=>{},
  requestAnimationFrame: ()=>0, cancelAnimationFrame: ()=>{},
  queueMicrotask: (fn)=>fn(),
  btoa: s => Buffer.from(s,'binary').toString('base64'),
  atob: s => Buffer.from(s,'base64').toString('binary'),
  Math, JSON, Date, Object, Array, Number, String, Boolean, RegExp, Map, Set, Symbol,
  Promise, WeakMap, WeakSet, ArrayBuffer, Uint8Array, Int32Array, Uint32Array, Float64Array,
  isNaN, isFinite, parseInt, parseFloat, NaN, Infinity, undefined
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
sandbox.__INPUTS = INPUTS;
sandbox.window.addEventListener = ()=>{};
sandbox.window.matchMedia = ()=>({matches:false,addEventListener(){},addListener(){}});
sandbox.window.devicePixelRatio = 1; sandbox.window.innerWidth = 1024; sandbox.window.innerHeight = 768;
sandbox.window.storage = undefined;

// Config passed in from Node so the driver can branch on validation vs full campaign.
const FULL = process.argv.includes('--full');
const FROZEN_SEEDS = [7,19,42,88,101,256,777,1337,4242,9001];
sandbox.__CFG = {
  full: FULL,
  arches: ['passive','conquest','faith','merchant','nomad','builder','isolationist','expansionist','balanced','exploit-hunter',
           'diplomat','spymaster','thalassocrat','slaver','techlord','survivor'],
  // One-factor-at-a-time world scenarios (baseline + one variant per axis). The `scenario` label is a
  // leading join key alongside archetype,seed,year — so we avoid a full-factorial run explosion.
  scenarios: FULL ? ['baseline','archipelago','pangaea','easy','hard','kingdom'] : ['baseline'],
  seeds: FULL ? FROZEN_SEEDS.slice(0,3) : [7,42],
  years: 100
};

// ---------- driver (runs in game scope) ----------
const driver = `
;(function(){
  ['renderAll','drawMap','renderInfo','renderPanes','renderStats','renderActions','toast',
   'showModal','closeModal','snapshotSeason','showConquestModal_render','showSiegeModal_render',
   'showBattleModal','checkAchievements','fitWorld','openSpoilsModal'].forEach(fn=>{ try{ eval(fn+'=()=>{};'); }catch(e){} });
  // Keep the REAL showConquestModal (it advances the pendingConquest queue into S._curConquest); only
  // its showModal() call is neutered above. Same for showSiegeModal. Render/persist are no-ops.
  try{ showRulerEvent=()=>{ try{S.pendingEvent=null;}catch(_){} }; }catch(e){}
  try{ resolveRulerEvent=()=>{ try{S.pendingEvent=null;}catch(_){} }; }catch(e){}
  try{ autoPersist=async()=>{}; }catch(e){}

  const CFG = __CFG;
  const cap = ()=> (typeof owned==='function' && owned().length) ? (owned().find(s=>s.capital)||owned()[0]) : null;
  const known = id => { try{ return hasTech(id); }catch(e){ return true; } };
  const avail = id => { try{ return techAvailable(id); }catch(e){ return false; } };
  function research(list){
    if(!S.research) S.research={active:null,progress:{}};
    if(S.research.active) return;
    for(const id of list){ if(!known(id) && avail(id)){ try{ setResearch(id); return; }catch(e){} } }
  }
  const canAct = c => !(S.actions && S.actions[c]);
  const mark   = c => { if(!S.actions) S.actions={}; S.actions[c]=true; };
  function ensureBuilders(c,b){ try{ if(builders(c)<b) setJob(c.id,'builders',(c.jobs.builders||0)+(b-builders(c))+4); }catch(_){} }
  function tryBuild(c,key,g,b,res){ ensureBuilders(c,b); try{ return !!build(c,key,g,b,res||{}); }catch(_){ return false; } }
  function levy(c,n){ __INPUTS.levyNum=String(n); try{ doRaiseLevy(c.id,'military'); return true; }catch(_){ return false; } }
  function recruit(c,type,n){ __INPUTS.recruitNumber=String(n); __INPUTS.recruitRange__max=String(n);
    try{ placeRecruitOrder(c.id,type,false,'military'); return true; }catch(_){ return false; } }
  function sellSurplus(c){
    const e=Object.entries(S.resources||{}).filter(([k,v])=>Math.floor(v)>=8 && k!=='gold').sort((a,b)=>b[1]-a[1]);
    if(!e.length) return false; const [k,v]=e[0];
    __INPUTS.sellRes=k; __INPUTS.sellQty=String(Math.min(30,Math.floor(v*0.5)));
    try{ doSellGoods(c.id,'trade'); return true; }catch(_){ return false; }
  }
  function foreignBuy(c){
    let t=W.settlements.find(s=>s.owner!=='player'&&!s.ruined&&(s.intel||0)>=2&&Object.keys(s.resources||{}).length);
    if(!t) return false; let k=Object.keys(t.resources)[0];
    __INPUTS.ftRes=k; __INPUTS.ftQty='12';
    try{ doForeignTrade(t.id,'trade'); return true; }catch(_){ return false; }
  }
  // Muster ~80% of the capital's standing troops into a field army aimed at the nearest weak
  // same-landmass neighbour. order 'raid' -> armyRaid (fast loot+captives); anything else -> siege -> conquer.
  function sendWarband(c, order){
    if((S.armies||[]).filter(a=>!a.settler).length >= 2) return false;
    let force=c.units.filter(u=>u.type!=='settler').reduce((n,u)=>n+u.count,0);
    if(force < 60) return false;
    let cands=W.settlements.filter(s=>!s.ruined && s.owner!=='player' && s.type!=='nomad camp'
      && sameLandmass(c,s) && distW(c.x,c.y,s.x,s.y)<650);
    if(!cands.length) return false;
    cands.sort((a,b)=> a.units.reduce((n,u)=>n+u.count,0)-b.units.reduce((n,u)=>n+u.count,0)
      || distW(c.x,c.y,a.x,a.y)-distW(c.x,c.y,b.x,b.y));
    let t=cands[0], take=[];
    c.units.forEach(u=>{ if(u.type==='settler')return; let n=Math.floor(u.count*0.8);
      if(n>0){ take.push({type:u.type,count:n,slave:u.slave,elite:u.elite,merc:u.merc,name:u.name}); u.count-=n; }});
    c.units=c.units.filter(u=>u.count>0);
    if(!take.reduce((n,u)=>n+u.count,0)) return false;
    S.armies.push({id:"a"+(S._aseq=(S._aseq||0)+1),x:c.x,y:c.y,units:take,order:order,dest:null,
      targetId:t.id,targetArmy:null,home:c.id,cont:c.cont,name:"Host of "+c.name});
    return true;
  }
  // Launch a settler column to unoccupied same-landmass land (bypasses the map-click UI).
  function foundColony(c){
    if((c.free||0) < 330) return false;
    if((S.armies||[]).filter(a=>a.settler).length >= 2) return false;
    let baseLm=landmassAt(c.x,c.y), rr=rng(S.seed+S.year*53+Math.round(c.x));
    for(let ring=150; ring<=540; ring+=90){
      for(let k=0;k<8;k++){
        let ang=rr()*6.283, x=Math.round(c.x+Math.cos(ang)*ring), y=Math.round(c.y+Math.sin(ang)*ring);
        let cc=cellAt(x,y);
        if(!cc||!cc.land||cc.biome==='ice') continue;
        if(landmassAt(x,y)!==baseLm) continue;
        if(W.settlements.some(s=>!s.ruined && distW(s.x,s.y,x,y)<120)) continue;
        __INPUTS.esFree=String(Math.min(Math.floor(c.free),320));
        __INPUTS.esSlave='0';
        __INPUTS.esFood=String(Math.floor(Math.min((c.stores.food||0),400)));
        __INPUTS.esName='';
        try{ launchSettler(c.id,x,y,'settle'); return true; }catch(_){ return false; }
      }
    }
    return false;
  }
  // Found an organized state faith directly (openFaith's confirm handler is DOM-bound and never fires headless).
  function foundFaith(c){
    if(S.faith) return false;
    try{
      S.faith={name:"Way of the Sacred Flame",deity:"the Sacred Flame",clergy:"crown",doctrines:["militant","monumental"]};
      S.faithTier=S.faithTier||{}; S.faithTier[S.faith.name]="organized"; S.faithPower=18;
      c.infra.temple=(c.infra.temple||0)+1; c.jobs.priests=Math.max(2,c.jobs.priests||0);
      shiftFaith(c,S.faith.name,85); c.conversion=100; mark('faith');
      return true;
    }catch(_){ return false; }
  }

  // Distinct tax policy per archetype (set once) — no archetype touched setRealmTax before, so the
  // governance taxRate column was a dead constant. Treasury-snowball styles tax hard; unity-fragile
  // styles tax light; the rest stay normal.
  const TAX_HEAVY=['merchant','exploit-hunter','builder'];
  const TAX_LIGHT=['survivor','isolationist','faith','expansionist','diplomat'];
  function playSeason(arch){
    const c=cap(); if(!c) return;
    if(arch==='passive') return;
    if(!S._taxSet){ try{ setRealmTax(TAX_HEAVY.includes(arch)?'high':TAX_LIGHT.includes(arch)?'light':'normal'); }catch(_){} S._taxSet=true; }

    if(arch==='merchant'){
      research(['currency','masonry','irrigation','accounting','banking','bureaucracy','philosophy','scriptoria','guilds']);
      if(canAct('trade') && (sellSurplus(c)||foreignBuy(c))) mark('trade');
      if(canAct('infra') && S.treasury>170){ if(tryBuild(c,(c.infra.bazaar||0)<2?'bazaar':'workshop',90,24,{timber:10,brick:6})) mark('infra'); }
      if(canAct('agri') && (c.jobs.merchants||0) < c.pop*0.05){ try{ setJob(c.id,'merchants',(c.jobs.merchants||0)+Math.max(1,Math.round(c.pop*0.01))); mark('agri'); }catch(_){} }
    }
    else if(arch==='conquest'){
      research(['smelting','metallurgy','horsemanship','engineering','bureaucracy','masonry','ironworking','steel','doctrine']);
      if(canAct('military') && S.treasury>60){ levy(c,40); mark('military'); }
      if(canAct('infra') && S.treasury>150){ if(tryBuild(c,(c.infra.barracks||0)<2?'barracks':'walls',75,25,{timber:12,iron:4,stone:20})) mark('infra'); }
      if(canAct('rule') && (S.captives||0)>0){ try{ settleCaptives(c.id); }catch(_){} }
      // Mostly raid (armyRaid feeds S.captives + loot funds the war); periodically press an assault so
      // the siege -> conquest -> spoils resolvers are exercised too.
      sendWarband(c, ((S.year+S.season)%3===0) ? 'attack' : 'raid');
    }
    else if(arch==='faith'){
      research(['writing','masonry','philosophy','scriptoria','bureaucracy']);
      if(canAct('faith')){ if(!S.faith) foundFaith(c); else if(S.treasury>90 && tryBuild(c,'temple',75,20,{stone:14})){ try{ c.jobs.priests=(c.jobs.priests||0)+1; }catch(_){} mark('faith'); } }
      if(canAct('rule') && S.gov!=='theocracy' && (S.lawChanges||0)<1){ try{ setPlayerGov('theocracy'); }catch(_){} }
      if(canAct('infra') && S.treasury>150){ if(tryBuild(c,'academy',140,30,{brick:20})) mark('infra'); }
    }
    else if(arch==='nomad'){
      research(['horsemanship','smelting','metallurgy','stirrups','composite']);
      if(canAct('military') && S.treasury>50){ levy(c,30); mark('military'); }
      if(canAct('scout')){ let dep=(W.deposits||[]).find(d=>!d.camp && owned().some(s=>Math.hypot(s.x-d.x,s.y-d.y)<160)); if(dep){ try{ establishCamp(dep.id,'scout'); }catch(_){} } }
      sendWarband(c,'raid');
    }
    else if(arch==='builder'){
      research(['masonry','engineering','irrigation','bureaucracy','accounting','universities','grandarch']);
      if(canAct('infra') && S.treasury>120){
        let order=[['bazaar',90,{timber:10,brick:6}],['workshop',75,{timber:12,brick:6}],['aqueduct',130,{stone:25}],['academy',140,{brick:20}],['walls',80,{stone:20}]];
        for(const [k,g,res] of order){ if(tryBuild(c,k,g,25,res)){ mark('infra'); break; } }
      }
      if(!S.wonderBuild){ let wid=(typeof WONDERS==='object')?Object.keys(WONDERS)[0]:null; if(wid){ ensureBuilders(c,26); try{ startWonder(c.id,wid); }catch(_){} } }
    }
    else if(arch==='isolationist'){
      research(['irrigation','masonry','engineering','philosophy']);
      if(canAct('agri') && S.treasury>60){ if(tryBuild(c,'granary',55,20,{brick:12})) mark('agri'); }
      if(canAct('infra') && S.treasury>90){ if(tryBuild(c,(c.infra.walls||0)<2?'walls':'fishery',80,20,{stone:20})) mark('infra'); }
      if(canAct('military') && S.treasury>50 && freeSoldiers(c) < c.pop*0.03){ levy(c,25); mark('military'); }
    }
    else if(arch==='expansionist'){
      research(['masonry','irrigation','currency','engineering','horsemanship']);
      if(canAct('settle')){ if(foundColony(c)) mark('settle'); }
      if(canAct('agri') && S.treasury>40){ if(tryBuild(c,'farms',25,12,{timber:8})) mark('agri'); }
      if(canAct('infra') && S.treasury>90){ if(tryBuild(c,'roads',35,16,{stone:8})) mark('infra'); }
    }
    else if(arch==='balanced'){
      research(['writing','currency','masonry','smelting','irrigation','bureaucracy','engineering','philosophy']);
      let turn=(S.year*4+S.season)%5;
      if(turn===0 && canAct('trade') && sellSurplus(c)) mark('trade');
      else if(turn===1 && canAct('infra') && S.treasury>120){ if(tryBuild(c,(c.infra.bazaar||0)<1?'bazaar':'barracks',80,24,{timber:12})) mark('infra'); }
      else if(turn===2 && canAct('military') && S.treasury>60){ levy(c,25); mark('military'); }
      else if(turn===3 && canAct('settle')){ if(foundColony(c)) mark('settle'); }
      else if(turn===4 && canAct('agri') && S.treasury>50){ if(tryBuild(c,'granary',55,20,{brick:12})) mark('agri'); }
    }
    else if(arch==='exploit-hunter'){
      research(['currency','accounting','banking','guilds','masonry','metallurgy','bureaucracy']);
      if(canAct('trade') && (sellSurplus(c)||foreignBuy(c))) mark('trade');
      if(canAct('infra') && S.treasury>150){ if(tryBuild(c,(c.infra.bazaar||0)<3?'bazaar':'workshop',90,24,{timber:10,brick:6})) mark('infra'); }
      if(canAct('military') && S.treasury>60){ levy(c,35); mark('military'); }
      if(canAct('rule') && (S.captives||0)>0){ try{ settleCaptives(c.id); }catch(_){} }
      sendWarband(c,'raid');
    }
    else if(arch==='diplomat'){
      research(['writing','currency','bureaucracy','philosophy','accounting']);
      if(canAct('diplo')){
        let acted=false;
        // Buy off a nearby raider group to keep the peace.
        let raider=W.settlements.find(s=>!s.ruined && !s.owner && (s.type==='nomad camp'||(s.type||'').includes('tribe')) && distW(c.x,c.y,s.x,s.y)<520);
        if(raider && S.treasury>90){ try{ payNomadTribute(raider.id); acted=true; }catch(_){} }
        // Betroth the heir into a scouted foreign realm (warms relations, grants a claim).
        if(!acted){ let ft=W.settlements.find(s=>s.owner&&s.owner!=='player'&&!s.ruined&&faction(s.owner)&&(s.intel||0)>=1&&!(S.marriages&&S.marriages[s.owner]));
          if(ft && S.treasury>70){ try{ arrangeMarriage(ft,'diplo'); acted=true; }catch(_){} } }
        // Otherwise pact/ally with a faction at peace.
        if(!acted){ let f=(W.factions||[]).find(x=>x.alive && diploOf(x.id)==='peace');
          if(f){ try{ setDiplo(f.id,(S.relations[f.id]||0)>=40?'alliance':'pact',8); }catch(_){} } }
        mark('diplo');
      }
      if(canAct('trade') && sellSurplus(c)) mark('trade');
      if(canAct('infra') && S.treasury>120){ if(tryBuild(c,(c.infra.bazaar||0)<1?'bazaar':'walls',80,24,{timber:12,stone:20})) mark('infra'); }
    }
    else if(arch==='spymaster'){
      research(['writing','currency','bureaucracy','espionage','philosophy']);
      if(known('espionage')){
        if((c.jobs.spies||0) < 4){ try{ setJob(c.id,'spies',(c.jobs.spies||0)+1); }catch(_){} }
        if(canAct('scout')){
          let target=W.settlements.find(s=>s.owner!=='player'&&!s.ruined&&(s.intel||0)>=1&&!(S.spyPosts||[]).includes(s.id));
          let fs2=0; try{ fs2=freeSpies(); }catch(_){}
          if(target && fs2>=1){ try{ embedSpy(target.id); mark('scout'); }catch(_){} }
        }
      }
      if(canAct('infra') && S.treasury>140){ if(tryBuild(c,(c.infra.academy||0)<1?'academy':'bazaar',140,30,{brick:20})) mark('infra'); }
      if(canAct('trade') && sellSurplus(c)) mark('trade');
    }
    else if(arch==='thalassocrat'){
      research(['masonry','currency','bluewater','cartography','galleys','astronomy']);
      if(canAct('infra')){
        if(!c.infra.shipyard){ if(tryBuild(c,'shipyard',110,28,{timber:25})) mark('infra'); }
        else if(S.treasury>90 && tryBuild(c,(c.infra.bazaar||0)<1?'bazaar':'fishery',80,24,{timber:12})) mark('infra');
      }
      if(c.infra.shipyard){
        if((c.jobs.sailors||0) < 24){ try{ setJob(c.id,'sailors',(c.jobs.sailors||0)+6); }catch(_){} }
        if(canAct('military') && S.treasury>130){ let sk=(typeof SHIP==='object')?Object.keys(SHIP):[]; if(sk.length){ __INPUTS['sh_'+sk[0]]='2'; try{ buildFleet(c.id,'military'); }catch(_){} } mark('military'); }
      }
      if(canAct('scout') && S.treasury>70){ let rr=rng(S.seed+S.year*17+S.season), ang=rr()*6.283, R=240+rr()*200;
        __INPUTS.scoutRad='300'; try{ confirmScout(Math.round(c.x+Math.cos(ang)*R),Math.round(c.y+Math.sin(ang)*R)); mark('scout'); }catch(_){} }
      if(canAct('trade') && sellSurplus(c)) mark('trade');
    }
    else if(arch==='slaver'){
      research(['smelting','masonry','bureaucracy','metallurgy','irrigation']);
      if(canAct('trade') && sellSurplus(c)) mark('trade'); // income to fund the raids so it survives to raid
      if(canAct('military') && S.treasury>80){ levy(c,25); mark('military'); }
      sendWarband(c,'raid'); // raid feeds S.captives
      if(canAct('rule') && (S.captives||0)>0){ try{ settleCaptives(c.id); }catch(_){} }
      let un=0; try{ un=unassignedSlaves(c); }catch(_){}
      if(un>0){ let job=(c.slaveJobs.mines||0)<un*.4?'mines':(c.slaveJobs.farmers||0)<un?'farmers':'laborers';
        try{ setSlaveJob(c.id,job,(c.slaveJobs[job]||0)+Math.min(un,10)); }catch(_){} }
      if(canAct('infra') && S.treasury>200){ if(tryBuild(c,(c.infra.mine||0)<1?'mine':'barracks',65,20,{timber:10})) mark('infra'); }
    }
    else if(arch==='techlord'){
      research(['writing','currency','philosophy','masonry','irrigation','bureaucracy','accounting','mathematics','astronomy','scriptoria','universities','scholarship','engineering','metallurgy','naturalphil','smelting','horsemanship','guilds']);
      if(canAct('trade') && sellSurplus(c)) mark('trade'); // income first: research funding drains treasury, and empty treasury -> collapse
      if(canAct('infra') && S.treasury>170){ let key=(c.infra.bazaar||0)<2?'bazaar':(c.infra.academy||0)<3?'academy':'workshop';
        let g=key==='academy'?140:key==='workshop'?75:90, res=key==='academy'?{brick:20}:{timber:12,brick:6};
        if(tryBuild(c,key,g,key==='academy'?30:24,res)) mark('infra'); }
      let scap=0; try{ scap=scholarCap(c); }catch(_){}
      if(S.treasury>260 && (c.jobs.scholars||0) < scap){ try{ setJob(c.id,'scholars',Math.min(scap,(c.jobs.scholars||0)+2)); }catch(_){} }
      try{ if(allTechDone()){ for(const k of ['wisdom','prosperity','order','devotion','plenty','legions']){ try{ enactEdict(k); }catch(_){} } } }catch(_){}
    }
    else if(arch==='survivor'){
      research(['irrigation','masonry','currency','engineering','bureaucracy','philosophy']);
      if(canAct('trade') && sellSurplus(c)) mark('trade'); // steady income every season keeps authority off the death-spiral
      if(canAct('infra') && S.treasury>260){ let key=(c.infra.bazaar||0)<1?'bazaar':(c.infra.walls||0)<2?'walls':(c.infra.granary||0)<1?'granary':'aqueduct';
        let g=key==='granary'?55:key==='walls'?80:key==='aqueduct'?130:90, b=key==='granary'?20:24,
            res=key==='granary'?{brick:12}:key==='walls'?{stone:20}:key==='aqueduct'?{stone:25}:{timber:10,brick:6};
        if(tryBuild(c,key,g,b,res)) mark('infra'); } // 260 buffer -> treasury never bottoms out
      if(canAct('agri') && S.treasury>120 && (c.infra.farms||0)<3){ if(tryBuild(c,'farms',25,12,{timber:8})) mark('agri'); }
      if(canAct('military') && freeSoldiers(c) < c.pop*0.02 && S.treasury>140){ levy(c,20); mark('military'); }
    }
  }

  // Phased combat resolver: drive every pending siege/conquest/spoils to conclusion. Modals are
  // no-op'd, so we call the resolver functions directly, mirroring the modal onclick flow.
  function resolveModals(arch, run){
    // --- Sieges: drain locally so siegeAct's trailing showSiegeModal has nothing to silently eat.
    if(S.pendingSieges && S.pendingSieges.length){
      let sieges=S.pendingSieges.slice(); S.pendingSieges=[];
      for(const s of sieges){
        if(s.fell) continue; // city already fell -> conquer() queued it in pendingConquest
        let a=S.armies.find(x=>x.id===s.armyId), t=W.settlements.find(x=>x.id===s.tId);
        if(!a||!t||t.owner==='player'||t.ruined) continue;
        let act=((s.progress||0)>=55 || (s.garrison||0) <= t.pop*0.01) ? 'assault' : 'maintain';
        try{ siegeAct(s.armyId, s.tId, act); }catch(_){}
      }
    }
    // --- Conquests: showConquestModal shifts the next pending fall into S._curConquest; step each.
    if(S.pendingConquest && S.pendingConquest.length && !S._curConquest){ try{ showConquestModal(); }catch(_){} }
    let guard=0;
    while(S._curConquest && guard++<120){
      let cur=S._curConquest, t=W.settlements.find(x=>x.id===cur.tId);
      if(!t || t.owner!=='player' || t.ruined){
        S._curConquest=null;
        if(S.pendingConquest && S.pendingConquest.length){ try{ showConquestModal(); }catch(_){} }
        continue;
      }
      let act=(arch==='conquest'||arch==='exploit-hunter') ? 'sack'
             :(arch==='nomad'||arch==='slaver') ? 'enslave'
             :'occupy'; // faith/builder/merchant/etc keep the city intact (avoid razeslave's distribute modal)
      try{ conquestChoose(t.id, act); run.conquests++; }
      catch(_){ S._curConquest=null; continue; }
      // If allies helped, conquestChoose left _curConquest set (same tId) awaiting a spoils decision.
      if(S._curConquest && S._curConquest.tId===t.id){
        try{ spoilsChoose(t.id, (arch==='conquest') ? 'poor' : 'even'); }
        catch(_){ S._curConquest=null; }
      }
      // conquestChoose->conquestNext->showConquestModal has already advanced _curConquest to the next fall.
    }
    S._curConquest=null; S.battleReports=[]; S.pendingEvent=null;
  }

  function troops(){
    let n=0;
    try{ (owned()||[]).forEach(s=>(s.units||[]).forEach(u=>n+=u.count||0)); }catch(e){}
    try{ (S.armies||[]).forEach(a=>(a.units||[]).forEach(u=>n+=u.count||0)); }catch(e){}
    return n;
  }
  function sumInfra(own,k){ return own.reduce((n,s)=>n+((s.infra&&s.infra[k])||0),0); }
  function snapWide(arch,scenario,seed,year,acc,run){
    let live=W.settlements.filter(s=>!s.ruined), own=owned();
    let slaves=own.reduce((n,s)=>n+(s.slaves||0),0), free=own.reduce((n,s)=>n+(s.free||0),0);
    let jobsTot=own.reduce((n,s)=>n+Object.values(s.jobs||{}).reduce((m,v)=>m+v,0),0);
    let infraTot=own.reduce((n,s)=>n+Object.values(s.infra||{}).reduce((m,v)=>m+v,0),0);
    let ceil=0; try{ ceil=own.reduce((n,s)=>n+popCeiling(s),0); }catch(_){}
    let sieges=live.filter(t=>t.siege && (S.armies||[]).some(a=>a.id===t.siege.by)).length;
    let ds=S.diploState||{}, dv=Object.values(ds);
    let wars=dv.filter(v=>v==='war').length, allies=dv.filter(v=>v==='alliance').length, pacts=dv.filter(v=>v==='pact').length;
    let organized=Object.values(S.faithTier||{}).filter(v=>v==='organized').length;
    let distinctF=new Set(live.map(dominantFaith)).size;
    let seen=0,tot=0; for(const cc of W.cells){tot++; if(cc.seen)seen++;}
    let res=S.resources||{}, resTot=Object.values(res).reduce((n,v)=>n+v,0);
    let sp=0; try{ sp=scholarPool(); }catch(_){}
    let fs2=0; try{ fs2=freeSpies(); }catch(_){}
    let atd=0; try{ atd=allTechDone()?1:0; }catch(_){}
    return {
      archetype:arch, scenario, seed, year,
      treasury:Math.round(S.treasury||0), tax:Math.round(acc.tax), trade:Math.round(acc.trade), upkeep:Math.round(acc.upkeep),
      net:Math.round(acc.tax+acc.trade-acc.upkeep), routes:(S.routes||[]).length, resTotal:Math.round(resTot),
      gold:Math.round(res.gold||0), iron:Math.round(res.iron||0), timber:Math.round(res.timber||0), horses:Math.round(res.horses||0),
      pop:(typeof ownedPop==='function')?ownedPop():0, settlements:own.length, captivesNow:S.captives||0,
      capturedCum:Math.round(run.capturedCum), slaves, freePop:free, jobsTotal:jobsTot, popCeiling:Math.round(ceil),
      troops:troops(), armies:(S.armies||[]).length, warArmies:(S.armies||[]).filter(a=>!a.settler).length,
      sieges, conquestsCum:run.conquests, warsActive:wars,
      faithPower:Math.round(S.faithPower||0), hasFaith:S.faith?1:0, organizedFaiths:organized, distinctFaiths:distinctF,
      infraTotal:infraTot, temples:sumInfra(own,'temple'), barracks:sumInfra(own,'barracks'), walls:sumInfra(own,'walls'),
      markets:sumInfra(own,'bazaar')+sumInfra(own,'market'), wonders:(S.wonders||[]).length, wonderInProgress:S.wonderBuild?1:0,
      techs:(S.tech||[]).length, researchActive:(S.research&&S.research.active)||'', scholars:sp, allTechDone:atd,
      gov:S.gov||'', authority:Math.round((S.authority||0)*10)/10, unity:Math.round((S.unity||0)*10)/10,
      prestige:Math.round((S.prestige||0)*10)/10, lawChanges:S.lawChanges||0, taxRate:S.taxRate||'',
      relations:Object.keys(S.relations||{}).length, allies, pacts, tributes:Object.keys(S.tributes||{}).length, claims:Object.keys(S.claims||{}).length,
      seenPct:tot?Math.round(seen/tot*1000)/10:0, fleets:(S.fleets||[]).length, settlers:(S.armies||[]).filter(a=>a.settler).length, scoutRadius:S.scoutRadius||0,
      spyPosts:(S.spyPosts||[]).length, freeSpies:fs2, spyTech:known('espionage')?1:0,
      over:S.over?1:0, ruins:(W.ruins||[]).length, factionsAlive:(W.factions||[]).filter(f=>f.alive).length,
      conquestsYear:run.conquests-run.prevConq, capturedYear:Math.round(run.capturedCum-run.prevCapCum)
    };
  }

  // OFAT world scenarios: baseline cfg + per-scenario overrides.
  const SCEN={
    baseline:{},
    archipelago:{size:'large', terrain:'archipelago', density:'sparse'},
    pangaea:{size:'small', terrain:'pangaea', density:'crowded'},
    easy:{ai:2, difficulty:'easy'},
    hard:{ai:5, difficulty:'hard'},
    kingdom:{start:'kingdom'}
  };
  const rows=[], ends=[];
  for(const scen of CFG.scenarios){
    for(const arch of CFG.arches){
      for(const seed of CFG.seeds){
        const cfg=Object.assign({size:'medium',terrain:'continents',density:'balanced',ai:3,difficulty:'normal',
          start:'village',rulerName:'Rasa',dynasty:'Crownwater',realmName:'Audit',
          capitalName:'Riverhold',startAt:null}, SCEN[scen]||{}, {_seed:seed});
        S=newState(seed,cfg);
        let acc={tax:0,trade:0,upkeep:0}, guard=0;
        let run={capturedCum:0, prevCaptives:S.captives||0, conquests:0, prevConq:0, prevCapCum:0};
        while(S.year<=CFG.years && !S.over && guard<(CFG.years*4+40)){
          guard++;
          const py=S.year;
          try{ playSeason(arch); }catch(e){ /* keep simulating */ }
          try{ advanceSeason(); }catch(e){ break; }
          try{ resolveModals(arch, run); }catch(e){}
          // Accumulate captures as positive deltas in S.captives (raid/sack/enslave add; settle removes).
          run.capturedCum += Math.max(0, (S.captives||0) - run.prevCaptives); run.prevCaptives=S.captives||0;
          acc.tax+=(S.econ&&S.econ.tax)||0; acc.trade+=(S.econ&&S.econ.trade)||0; acc.upkeep+=(S.econ&&S.econ.upkeep)||0;
          if(S.year!==py){ rows.push(snapWide(arch,scen,seed,py,acc,run)); acc={tax:0,trade:0,upkeep:0}; run.prevConq=run.conquests; run.prevCapCum=run.capturedCum; }
        }
        ends.push({archetype:arch, scenario:scen, seed, endedYear:S.year, over:!!S.over,
          pop:(typeof ownedPop==='function')?ownedPop():0, treasury:Math.round(S.treasury||0),
          capturedCum:Math.round(run.capturedCum), conquests:run.conquests, settlements:owned().length});
      }
    }
  }
  globalThis.__ROWS=rows; globalThis.__ENDS=ends;
})();
`;

const t0 = Date.now();
vm.createContext(sandbox);
try { vm.runInContext(gameSrc + '\n' + driver, sandbox, { filename:'civgame.js' }); }
catch(e){ console.error('RUNTIME ERROR:', e && e.stack ? e.stack.split('\n').slice(0,10).join('\n') : e); process.exit(2); }
const runtimeMs = Date.now() - t0;

const rows = sandbox.__ROWS || [];
const ends = sandbox.__ENDS || [];
if(!rows.length){ console.error('No rows produced'); process.exit(3); }

// ---------- per-domain CSVs (all share leading keys archetype,seed,year) ----------
const KEYS = ['archetype','scenario','seed','year'];
const DOMAINS = {
  economy:        ['treasury','tax','trade','upkeep','net','routes','resTotal','gold','iron','timber','horses'],
  population:     ['pop','settlements','captivesNow','capturedCum','slaves','freePop','jobsTotal','popCeiling'],
  war:            ['troops','armies','warArmies','sieges','conquestsCum','warsActive','capturedCum'],
  faith:          ['faithPower','hasFaith','organizedFaiths','distinctFaiths'],
  infrastructure: ['infraTotal','temples','barracks','walls','markets','wonders','wonderInProgress'],
  tech:           ['techs','researchActive','scholars','allTechDone'],
  governance:     ['gov','authority','unity','prestige','lawChanges','taxRate'],
  diplomacy:      ['relations','allies','pacts','tributes','claims','warsActive'],
  exploration:    ['seenPct','fleets','settlers','settlements','scoutRadius'],
  espionage:      ['spyPosts','freeSpies','spyTech'],
  events:         ['over','ruins','factionsAlive','conquestsYear','capturedYear']
};
function csvCell(v){ let s=String(v==null?'':v); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
for(const [domain, cols] of Object.entries(DOMAINS)){
  const header = [...KEYS, ...cols];
  const lines = [header.join(',')];
  for(const r of rows) lines.push(header.map(k=>csvCell(r[k])).join(','));
  fs.writeFileSync(path.join(OUT, domain + '.csv'), lines.join('\n') + '\n');
}
fs.writeFileSync(path.join(OUT, 'master.json'), JSON.stringify(rows));

// ---------- RUN_META.json ----------
let gitSha = 'unknown';
try { gitSha = execSync('git rev-parse HEAD', { cwd: __dirname }).toString().trim(); } catch(e){}
const scriptHash = crypto.createHash('sha256').update(gameSrc).digest('hex').slice(0,16);
const collapses = ends.filter(e=>e.over).map(e=>({archetype:e.archetype, scenario:e.scenario, seed:e.seed, year:e.endedYear}));
const meta = {
  generated_utc: new Date().toISOString(),
  mode: FULL ? 'full' : 'validation',
  index_git_sha: gitSha,
  index_script_sha256_16: scriptHash,
  runtime_ms: runtimeMs,
  archetypes: sandbox.__CFG.arches,
  scenarios: sandbox.__CFG.scenarios,
  seeds: sandbox.__CFG.seeds,
  years: sandbox.__CFG.years,
  runs: ends.length,
  year_rows: rows.length,
  collapses,
  domains: Object.keys(DOMAINS)
};
fs.writeFileSync(path.join(OUT, 'RUN_META.json'), JSON.stringify(meta, null, 1));

// ---------- console summary + validation asserts ----------
console.log(`OK — ${rows.length} year-rows across ${ends.length} runs · ${(runtimeMs/1000).toFixed(1)}s · mode=${FULL?'full':'validation'}`);
console.log(`CSVs: ${Object.keys(DOMAINS).map(d=>d+'.csv').join(', ')}`);
const scenSet = [...new Set(ends.map(e=>e.scenario))];
if(ends.length <= 40){
  console.log('\nEnded (year reached / collapse):');
  for(const e of ends){
    console.log(`  ${e.scenario.padEnd(11)} ${e.archetype.padEnd(14)} s${String(e.seed).padStart(4)}: yr ${String(e.endedYear).padStart(3)}${e.over?' (CROWN FELL)':' (survived)'} | pop ${String(e.pop).padStart(6)} | treas ${String(e.treasury).padStart(6)} | sett ${e.settlements} | captured ${e.capturedCum} | conquests ${e.conquests}`);
  }
} else {
  // Compact: survival count per scenario, and per-archetype survivor tally across scenarios.
  console.log('\nSurvival to yr100 (per scenario):');
  for(const sc of scenSet){ const es=ends.filter(e=>e.scenario===sc); console.log(`  ${sc.padEnd(11)}: ${es.filter(e=>!e.over).length}/${es.length} survived · collapses ${es.filter(e=>e.over).length}`); }
  console.log('\nSurvivor tally per archetype (out of '+scenSet.length*sandbox.__CFG.seeds.length+' runs):');
  for(const a of sandbox.__CFG.arches){ const es=ends.filter(e=>e.archetype===a); console.log(`  ${a.padEnd(14)}: survived ${es.filter(e=>!e.over).length} · captured(max) ${Math.max(0,...es.map(e=>e.capturedCum))} · conquests(max) ${Math.max(0,...es.map(e=>e.conquests))}`); }
}

// Validation gates (README 1b): all 10 archetypes produce rows; conquest takes captives;
// every CSV shares identical archetype,seed,year keys.
const archesSeen = new Set(rows.map(r=>r.archetype));
const missingArch = sandbox.__CFG.arches.filter(a=>!archesSeen.has(a));
const conquestCaptured = Math.max(0, ...ends.filter(e=>e.archetype==='conquest').map(e=>e.capturedCum));
const keySig = f => fs.readFileSync(path.join(OUT,f),'utf8').split('\n')[0].split(',').slice(0,4).join(',');
const keysOk = Object.keys(DOMAINS).every(d => keySig(d+'.csv') === 'archetype,scenario,seed,year');
const nArch = sandbox.__CFG.arches.length;
console.log('\nValidation:');
console.log(`  all ${nArch} archetypes present: ${missingArch.length===0 ? 'YES' : 'NO ('+missingArch.join(',')+')'}`);
console.log(`  conquest took captives:    ${conquestCaptured>0 ? 'YES ('+conquestCaptured+')' : 'NO'}`);
console.log(`  all CSVs share keys:       ${keysOk ? 'YES' : 'NO'}`);
