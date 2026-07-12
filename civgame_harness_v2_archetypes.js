// Civ-Game headless harness v2 — ARCHETYPE POLICIES
// Drives the REAL engine. Three archetypes (passive, merchant, conquest) issue real
// council actions each season, then advanceSeason(). Logs per-year data to CSV/JSON.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('/tmp/game_main.html', 'utf8');
const gameSrc = html.match(/<script>([\s\S]*?)<\/script>/)[1];

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
  btoa: s => Buffer.from(s,'binary').toString('base64'),
  atob: s => Buffer.from(s,'base64').toString('binary'),
  Math, JSON, Date, Object, Array, Number, String, Boolean, RegExp, Map, Set, Symbol,
  isNaN, isFinite, parseInt, parseFloat, NaN, Infinity, undefined
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
sandbox.__INPUTS = INPUTS;
sandbox.window.addEventListener = ()=>{};
sandbox.window.matchMedia = ()=>({matches:false,addEventListener(){},addListener(){}});
sandbox.window.devicePixelRatio = 1; sandbox.window.innerWidth = 1024; sandbox.window.innerHeight = 768;
sandbox.window.storage = undefined;

// ---------- driver (shares game scope) ----------
const driver = `
;(function(){
  ['renderAll','drawMap','renderInfo','renderPanes','renderStats','renderActions','toast',
   'showModal','closeModal','snapshotSeason','showConquestModal','showSiegeModal',
   'showBattleModal','checkAchievements'].forEach(fn=>{ try{ eval(fn+'=()=>{};'); }catch(e){} });
  try{ showRulerEvent=()=>{ try{S.pendingEvent=null;}catch(_){} }; }catch(e){}
  try{ autoPersist=async()=>{}; }catch(e){}

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

  function playSeason(arch){
    const c = cap(); if(!c) return;

    if(arch==='merchant'){
      research(['currency','masonry','irrigation','accounting','banking','bureaucracy','philosophy','scriptoria']);
      if(canAct('trade')){
        const e=Object.entries(S.resources||{}).filter(([k,v])=>Math.floor(v)>=8 && k!=='gold').sort((a,b)=>b[1]-a[1]);
        if(e.length){ const [k,v]=e[0];
          __INPUTS.sellRes=k; __INPUTS.sellQty=String(Math.min(30,Math.floor(v*0.5)));
          try{ doSellGoods(c.id,'trade'); }catch(_){}
          mark('trade');
        }
      }
      if(canAct('infra') && S.treasury>180){
        const key=(c.infra.bazaar||0)<2?'bazaar':'workshop';
        try{ if(build(c,key,50,0,{timber:8})) mark('infra'); }catch(_){}
      }
      if(canAct('agri') && c.jobs && (c.jobs.merchants||0) < c.pop*0.05){
        try{ setJob(c.id,'merchants',(c.jobs.merchants||0)+Math.max(1,Math.round(c.pop*0.01))); mark('agri'); }catch(_){}
      }
    }

    else if(arch==='conquest'){
      research(['smelting','metallurgy','horsemanship','engineering','bureaucracy','masonry','ironworking','steel']);
      if(canAct('military') && S.treasury>60){
        __INPUTS.levyNum='40';
        try{ doRaiseLevy(c.id,'military'); }catch(_){}
        mark('military');
      }
      if(canAct('infra') && S.treasury>150){
        const key=(c.infra.barracks||0)<2?'barracks':'walls';
        try{ if(build(c,key,55,0,{timber:8,stone:6})) mark('infra'); }catch(_){}
      }
    }
    // passive: issue nothing
  }

  function troops(){
    let n=0;
    try{ (owned()||[]).forEach(s=>(s.units||[]).forEach(u=>n+=u.count||0)); }catch(e){}
    try{ (S.armies||[]).forEach(a=>(a.units||[]).forEach(u=>n+=u.count||0)); }catch(e){}
    return n;
  }
  function snap(arch,seed,year,acc){
    const own=(typeof owned==='function')?owned():[];
    const food=own.reduce((n,s)=>n+((s.stores&&s.stores.food)||0),0);
    return { archetype:arch, seed, year,
      pop:(typeof ownedPop==='function')?ownedPop():0, settlements:own.length,
      treasury:Math.round(S.treasury||0), food:Math.round(food), troops:troops(),
      tax:Math.round(acc.tax), trade:Math.round(acc.trade), upkeep:Math.round(acc.upkeep),
      net:Math.round(acc.tax+acc.trade-acc.upkeep),
      unity:Math.round((S.unity||0)*10)/10, authority:Math.round((S.authority||0)*10)/10,
      techs:(S.tech||[]).length, research:(S.research&&S.research.active)||'',
      captives:S.captives||0, faithPower:Math.round(S.faithPower||0),
      res:Object.assign({}, S.resources||{}) };
  }

  const ARCHES=['passive','merchant','conquest'];
  const SEEDS=[7,42];
  const YEARS=100;
  const out=[];
  for(const arch of ARCHES){
    for(const seed of SEEDS){
      const cfg={size:'medium',terrain:'continents',density:'balanced',ai:3,difficulty:'normal',
        start:'village',rulerName:'Rasa',dynasty:'Crownwater',realmName:'Audit',
        capitalName:'Riverhold',startAt:null,_seed:seed};
      S=newState(seed,cfg);
      let acc={tax:0,trade:0,upkeep:0}, guard=0;
      while(S.year<=YEARS && !S.over && guard<(YEARS*4+20)){
        guard++;
        const py=S.year;
        try{ playSeason(arch); }catch(e){ /* policy error: keep simulating */ }
        advanceSeason();
        acc.tax+=(S.econ&&S.econ.tax)||0; acc.trade+=(S.econ&&S.econ.trade)||0; acc.upkeep+=(S.econ&&S.econ.upkeep)||0;
        if(S.year!==py){ out.push(snap(arch,seed,py,acc)); acc={tax:0,trade:0,upkeep:0}; }
      }
      out.push({__end:true, archetype:arch, seed, endedYear:S.year, over:!!S.over});
    }
  }
  globalThis.__ROWS = out;
})();
`;

vm.createContext(sandbox);
try { vm.runInContext(gameSrc + '\n' + driver, sandbox, { filename:'civgame.js' }); }
catch(e){ console.error('RUNTIME ERROR:', e && e.stack ? e.stack.split('\n').slice(0,6).join('\n') : e); process.exit(2); }

const all = sandbox.__ROWS || [];
const ends = all.filter(r=>r.__end);
const rows = all.filter(r=>!r.__end);
if(!rows.length){ console.error('No rows produced'); process.exit(3); }

const resKeys=[...new Set(rows.flatMap(r=>Object.keys(r.res)))].sort();
const base=['archetype','seed','year','pop','settlements','treasury','food','troops','tax','trade','upkeep','net','unity','authority','techs','research','captives','faithPower'];
const header=[...base, ...resKeys.map(k=>'res_'+k)];
const lines=[header.join(',')];
for(const r of rows){ lines.push(base.map(k=>r[k]).concat(resKeys.map(k=>r.res[k]||0)).join(',')); }
fs.mkdirSync('/mnt/user-data/outputs',{recursive:true});
fs.writeFileSync('/mnt/user-data/outputs/civgame_archetype_smoke.csv', lines.join('\n'));
fs.writeFileSync('/mnt/user-data/outputs/civgame_archetype_smoke.json', JSON.stringify(rows,null,1));

console.log('OK — rows:', rows.length);
console.log('\nEnded (year reached / collapse):');
ends.forEach(e=> console.log(`  ${e.archetype.padEnd(9)} seed ${e.seed}: ended yr ${e.endedYear}${e.over?' (CROWN FELL)':' (survived to 100)'}`));
console.log('\nFinal-year snapshot per archetype/seed:');
for(const arch of ['passive','merchant','conquest']) for(const seed of [7,42]){
  const rs=rows.filter(r=>r.archetype===arch&&r.seed===seed); if(!rs.length) continue;
  const l=rs[rs.length-1];
  console.log(`  ${arch.padEnd(9)} s${seed} yr${String(l.year).padStart(3)} | pop ${String(l.pop).padStart(5)} | treasury ${String(l.treasury).padStart(5)} | troops ${String(l.troops).padStart(4)} | techs ${l.techs} | last-research ${l.research||'-'}`);
}
