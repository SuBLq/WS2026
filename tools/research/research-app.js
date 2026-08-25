(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STATE_KEY='wos-research-calculator-v4';
const HELP_KEY='wos-research-help-v1';
const LEGACY_KEYS=['wos-research-planner-v2','wos-research-calculator-v3'];
const DATA=window.WOS_RESEARCH_DATA||null;
const RU_BASE=DATA?.meta?.translations||{};
const STAT_RU={
  'research-speed':'скорость исследований','construction-speed':'скорость строительства','healing-speed':'скорость лечения','training-speed':'скорость обучения',
  attack:'атака',defense:'защита',health:'здоровье',lethality:'смертоносность','march-capacity':'вместимость марша','rally-capacity':'вместимость ралли',
  'hospital-capacity':'вместимость лазарета','training-capacity':'вместимость обучения'
};
const TROOP_RU={all:'все войска',infantry:'пехота',marksman:'стрелки',lancer:'копейщики'};
const fmt=new Intl.NumberFormat('ru-RU');
let TECHS={},current={},branch='Growth',treeQuery='',rcLevel=30,speed=0,tempSpeed=0;
let goalBranch='Battle',goalId='',goalLevel=1,overrides={},candidateId='',candidateLevel=1;
let saveTimer=null,liveTotalsFrame=0,clearProfileArmed=false,clearProfileTimer=null;

function toast(text){const e=$('#toast');if(!e)return;e.textContent=text;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1700)}
function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(save,120)}
function showHelp(force=false){const e=$('#helpBackdrop');if(!e||(!force&&localStorage.getItem(HELP_KEY)))return;e.classList.add('open');e.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function hideHelp(markSeen=true){const e=$('#helpBackdrop');if(!e)return;e.classList.remove('open');e.setAttribute('aria-hidden','true');if(markSeen)localStorage.setItem(HELP_KEY,'1');if(!$('#drawerBackdrop')?.classList.contains('open'))document.body.style.overflow=''}
function scheduleLiveTotals(){if(liveTotalsFrame)cancelAnimationFrame(liveTotalsFrame);liveTotalsFrame=requestAnimationFrame(()=>{liveTotalsFrame=0;if(!goalId||!TECHS[goalId]){renderTotals(null);return}const target=mergeTargetWithOverrides();renderTotals(simulate(current,target,speed+tempSpeed))})}
function romanFromId(id){const m=id.match(/-([ivx]+)$/i);return m?m[1].toUpperCase():''}
function baseId(id){return id.replace(/-([ivx]+)$/i,'')}
function label(id){const t=TECHS[id];if(!t)return id;const b=RU_BASE[baseId(id)];return b?`${b} ${romanFromId(id)}`:t.name}
function statLabel(t){const a=STAT_RU[t.stat]||t.stat||'—',troop=TROOP_RU[t['troop-type']];return troop?`${a} · ${troop}`:a}
function maxLevel(id){return TECHS[id]?Math.max(...Object.keys(TECHS[id].levels).map(Number)):0}
function getLevel(id,l){return TECHS[id]?.levels?.[String(l)]||null}
function levelReqRC(id,l){return Number(getLevel(id,l)?.requirements?.buildings?.['research-center']||0)}
function cloneState(s){return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,Number(v)||0]))}
function normalizeState(s){for(const id of Object.keys(TECHS)){const v=Math.max(0,Math.min(maxLevel(id),Number(s[id])||0));if(v)s[id]=v;else delete s[id]}for(const id of Object.keys(s))if(!TECHS[id])delete s[id];return s}
function cumulativeReqs(id,l){const out={};for(let n=1;n<=l;n++){const req=getLevel(id,n)?.requirements?.['research-items']||{};for(const [rid,rl] of Object.entries(req))out[rid]=Math.max(out[rid]||0,Number(rl)||0)}return out}
function applyPrereqs(s,id,l,seen=new Set()){
  if(!TECHS[id])return;
  l=Math.max(0,Math.min(maxLevel(id),Number(l)||0));if(!l)return;
  const key=`${id}@${l}`;if(seen.has(key))return;seen.add(key);
  for(const [rid,rl] of Object.entries(cumulativeReqs(id,l))){applyPrereqs(s,rid,rl,seen);s[rid]=Math.max(Number(s[rid])||0,rl)}
  s[id]=Math.max(Number(s[id])||0,l);
}
function validAt(s,id,l){
  if(!l)return true;
  for(let n=1;n<=l;n++){
    const lv=getLevel(id,n);if(!lv)return false;
    const req=lv.requirements?.['research-items']||{};
    for(const [rid,rl] of Object.entries(req))if((Number(s[rid])||0)<Number(rl))return false;
  }
  return true;
}
function cascadeDown(s){
  let changed=true,guard=0;
  while(changed&&guard++<1000){changed=false;for(const id of Object.keys(TECHS)){let v=Number(s[id])||0;while(v>0&&!validAt(s,id,v))v--;if(v!==(Number(s[id])||0)){if(v)s[id]=v;else delete s[id];changed=true}}}
  return normalizeState(s);
}
function highestRequiredRC(s){let req=0;for(const [id,lvl] of Object.entries(s))for(let n=1;n<=lvl;n++)req=Math.max(req,levelReqRC(id,n));return req}
function applyCurrentValue(id,next,notify=false){
  const old=Number(current[id])||0,mx=maxLevel(id);next=Math.max(0,Math.min(mx,Number(next)||0));
  if(next>old){applyPrereqs(current,id,next)}else{if(next)current[id]=next;else delete current[id];cascadeDown(current)}
  normalizeState(current);
  const req=highestRequiredRC(current);if(req>rcLevel){rcLevel=req;if(notify)toast(`Нужен Иссл. Центр: ур. ${req}`)}
}
function setCurrent(id,next){
  applyCurrentValue(id,next,true);cleanupGoalAfterProfileChange();save();renderAll(true);
}
function syncTreeUI(){
  const root=$('#tree');if(!root)return;
  root.querySelectorAll('[data-current-slider]').forEach(sl=>{
    const id=sl.dataset.currentSlider,mx=maxLevel(id),val=Number(current[id])||0;sl.value=val;rangePct(sl);
    const v=root.querySelector(`[data-tree-value="${id}"]`);if(v)v.textContent=`${val}/${mx}`;
    const card=sl.closest('.tech-card');if(!card)return;const full=val===mx;card.classList.toggle('is-full',full);
    const row=card.querySelector('.tech-name-row');let chip=card.querySelector('.full-chip');if(full&&!chip&&row){chip=document.createElement('span');chip.className='full-chip';chip.textContent='ФУЛЛ';row.append(chip)}else if(!full&&chip)chip.remove();
  });
}
function previewCurrent(id,next){
  applyCurrentValue(id,next,false);syncTreeUI();renderProfile();scheduleLiveTotals();saveSoon();
}
function fillPreviousRows(row){
  const list=Object.values(TECHS).filter(t=>t.branch===branch&&Number(t.row)<Number(row)).sort((a,b)=>(a.row||0)-(b.row||0));
  if(!list.length){toast('Предыдущих рядов нет');return}
  for(const t of list)applyPrereqs(current,t.id,maxLevel(t.id));
  normalizeState(current);const req=highestRequiredRC(current);if(req>rcLevel)rcLevel=req;
  cleanupGoalAfterProfileChange();save();renderAll(true);toast(`Предыдущие ряды: MAX`);
}
function closure(base,id,l){const s=cloneState(base);applyPrereqs(s,id,l);return normalizeState(s)}
function mergeTargetWithOverrides(excludeId=null){
  let target=goalId?closure(current,goalId,goalLevel):cloneState(current);
  const entries=Object.entries(overrides).filter(([id])=>id!==excludeId&&TECHS[id]).sort((a,b)=>(TECHS[a[0]].row||0)-(TECHS[b[0]].row||0));
  for(const [id,l] of entries){const desired=Math.max(Number(current[id])||0,Math.min(maxLevel(id),Number(l)||0));if(desired>(Number(target[id])||0))applyPrereqs(target,id,desired)}
  return normalizeState(target);
}
function minimumForRouteTech(id){const withoutOwn=mergeTargetWithOverrides(id);return Math.max(Number(current[id])||0,Number(withoutOwn[id])||0)}
function cleanOverrides(){
  const next={};for(const [id,l] of Object.entries(overrides)){if(!TECHS[id])continue;const min=minimumForRouteTech(id);const v=Math.min(maxLevel(id),Number(l)||0);if(v>min)next[id]=v}overrides=next;
}
function applyRouteValue(id,value){
  value=Number(value)||0;
  if(id===goalId){const min=Math.min(maxLevel(id),Math.max((current[id]||0)+1,1));goalLevel=Math.max(min,Math.min(maxLevel(id),value));delete overrides[id]}
  else{const min=minimumForRouteTech(id);if(value<=min)delete overrides[id];else overrides[id]=Math.min(maxLevel(id),value)}
  cleanOverrides();
}
function setRouteLevel(id,value){applyRouteValue(id,value);save();renderCalculation()}
function previewRouteLevel(id,value){applyRouteValue(id,value);scheduleLiveTotals();saveSoon()}

function missingNodes(base,target){
  const nodes=new Map();
  for(const [id,to] of Object.entries(target)){const from=Number(base[id])||0;for(let l=from+1;l<=to;l++)nodes.set(`${id}@${l}`,{id,l,key:`${id}@${l}`,deps:new Set()})}
  for(const node of nodes.values()){
    if(node.l>1){const prev=`${node.id}@${node.l-1}`;if(nodes.has(prev))node.deps.add(prev)}
    for(const [rid,rl] of Object.entries(cumulativeReqs(node.id,node.l))){if((Number(base[rid])||0)>=rl)continue;const dep=`${rid}@${rl}`;if(nodes.has(dep))node.deps.add(dep)}
  }
  return nodes;
}
function topo(base,target){
  const nodes=missingNodes(base,target),out=[],done=new Set();let guard=0;
  while(done.size<nodes.size&&guard++<10000){
    const ready=[...nodes.values()].filter(n=>!done.has(n.key)&&[...n.deps].every(d=>done.has(d)));
    if(!ready.length){for(const n of nodes.values())if(!done.has(n.key)){done.add(n.key);out.push(n)}break}
    ready.sort((a,b)=>(TECHS[a.id].row||0)-(TECHS[b.id].row||0)||a.l-b.l||label(a.id).localeCompare(label(b.id),'ru'));
    const n=ready[0];done.add(n.key);out.push(n);
  }
  return out;
}
function simulate(base,target,startSpeed){
  const t={meat:0,wood:0,coal:0,iron:0,steel:0,power:0,base:0,actual:0,nodes:0,rc:0,order:[],speedEnd:Number(startSpeed)||0};
  const order=topo(base,target);let s=Number(startSpeed)||0;
  for(const n of order){
    const lv=getLevel(n.id,n.l);if(!lv)continue;const c=lv.cost||{};
    for(const r of ['meat','wood','coal','iron','steel'])t[r]+=Number(c[r])||0;
    t.power+=Number(lv.power)||0;const sec=Number(lv['research-time-seconds'])||0;t.base+=sec;t.actual+=sec/(1+s/100);t.rc=Math.max(t.rc,levelReqRC(n.id,n.l));t.nodes++;
    if(TECHS[n.id].stat==='research-speed')s+=Number(lv['stat-addition'])||0;
    t.order.push({...n,baseSeconds:sec,actualSeconds:sec/(1+(s-(TECHS[n.id].stat==='research-speed'?(Number(lv['stat-addition'])||0):0))/100),cost:{...c},power:Number(lv.power)||0,rc:levelReqRC(n.id,n.l)});
  }
  t.speedEnd=s;return t;
}
function formatTime(sec){sec=Math.max(0,Math.round(Number(sec)||0));const d=Math.floor(sec/86400);sec%=86400;const h=Math.floor(sec/3600);sec%=3600;const m=Math.floor(sec/60);if(d)return `${d} д ${h} ч ${m} м`;if(h)return `${h} ч ${m} м`;return `${m} мин`}
function shortNum(n){n=Number(n)||0;if(n>=1e9)return (n/1e9).toFixed(n>=1e10?1:2).replace('.',',')+'B';if(n>=1e6)return (n/1e6).toFixed(n>=1e7?1:2).replace('.',',')+'M';if(n>=1e3)return (n/1e3).toFixed(n>=1e4?0:1).replace('.',',')+'K';return fmt.format(Math.round(n))}
function findFirstBattleVI(){return TECHS['weapons-prep-vi']||Object.values(TECHS).filter(t=>t.branch==='Battle'&&romanFromId(t.id)==='VI').sort((a,b)=>(a.row||0)-(b.row||0))[0]||null}
function rangePct(el){const min=Number(el.min)||0,max=Number(el.max)||1,val=Number(el.value)||0;const pct=max===min?100:Math.max(0,Math.min(100,(val-min)*100/(max-min)));el.style.setProperty('--pct',pct+'%')}
function updateRangeVisual(el){rangePct(el)}
function setRange(el,min,max,value){el.min=min;el.max=Math.max(min,max);el.value=Math.max(min,Math.min(max,value));rangePct(el)}

function save(){localStorage.setItem(STATE_KEY,JSON.stringify({current,rcLevel,speed,tempSpeed,goalBranch,goalId,goalLevel,overrides}))}
function loadState(){
  let s=null;try{s=JSON.parse(localStorage.getItem(STATE_KEY)||'null')}catch(e){}
  if(!s){for(const key of LEGACY_KEYS){try{const x=JSON.parse(localStorage.getItem(key)||'null');if(x){s={current:x.current||{},rcLevel:x.rcLevel,speed:x.speed,tempSpeed:x.tempSpeed};break}}catch(e){}}}
  s=s||{};current=s.current||{};rcLevel=Number(s.rcLevel||30);speed=Number(s.speed||0);tempSpeed=Number(s.tempSpeed||0);goalBranch=s.goalBranch==='Growth'?'Growth':'Battle';goalId=s.goalId||'';goalLevel=Number(s.goalLevel||1);overrides=s.overrides||{};
  candidateId=goalId||'';candidateLevel=goalLevel||1;if(candidateId&&TECHS[candidateId])goalBranch=TECHS[candidateId].branch;
}
function buildTechs(){TECHS={};for(const b of ['Growth','Battle'])for(const [id,t] of Object.entries(DATA?.[b]||{}))TECHS[id]={...t,id,branch:b};normalizeState(current);cleanupGoalAfterProfileChange()}
function goalDistance(t){
  const cur=Number(current[t.id])||0,next=Math.min(maxLevel(t.id),cur+1);
  if(!next)return Infinity;
  return topo(current,closure(current,t.id,next)).length||1;
}
function goalAvailableNow(t){
  const cur=Number(current[t.id])||0,next=Math.min(maxLevel(t.id),cur+1);
  if(!next)return false;
  return validAt(current,t.id,next)&&levelReqRC(t.id,next)<=rcLevel;
}
function availableGoals(b=goalBranch){
  return Object.values(TECHS).filter(t=>t.branch===b&&(Number(current[t.id])||0)<maxLevel(t.id)).sort((a,b)=>{
    const aa=goalAvailableNow(a),bb=goalAvailableNow(b);if(aa!==bb)return aa?-1:1;
    const da=goalDistance(a),db=goalDistance(b);if(da!==db)return da-db;
    return (a.row||0)-(b.row||0)||label(a.id).localeCompare(label(b.id),'ru');
  });
}
function romanValue(r){const map={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};return map[r]||99}
function goalBlock(t){
  if(t.branch==='Battle'){
    const rel=((Number(t.row)-1)%8)+1;
    if(rel===1)return {key:'common-attack',label:'Общая атака',order:1};
    if(rel===2||rel===3)return {key:'type-offdef',label:'Атака и защита типов войск',order:2};
    if(rel===4)return {key:'common-defense',label:'Общая защита',order:3};
    if(rel===5)return {key:'common-combat',label:'Общие здоровье и смертоносность',order:4};
    if(rel===6)return {key:'march-capacity',label:'Вместимость марша',order:5};
    return {key:'type-hp-lethality',label:'Здоровье и смертоносность типов войск',order:6};
  }
  const stat=t.stat||'';
  if(stat==='construction-speed')return {key:'construction',label:'Строительство',order:1};
  if(stat==='infirmary-capacity'||stat==='training-capacity')return {key:'capacity',label:'Вместимость',order:2};
  if(stat==='research-speed')return {key:'research',label:'Скорость исследований',order:3};
  if(stat==='healing-speed'||stat==='training-speed')return {key:'recovery-training',label:'Лечение и обучение',order:4};
  if(stat==='march-queue')return {key:'march-queue',label:'Дополнительный марш',order:5};
  return {key:'other',label:'Прочее',order:9};
}
function appendGoalGroup(sel,title,items){
  if(!items.length)return;
  const group=document.createElement('optgroup');group.label=title;
  const sorted=[...items].sort((a,b)=>{
    const ta=romanValue(romanFromId(a.id)),tb=romanValue(romanFromId(b.id));if(ta!==tb)return ta-tb;
    const ba=goalBlock(a),bb=goalBlock(b);if(ba.order!==bb.order)return ba.order-bb.order;
    return (a.row||0)-(b.row||0)||label(a.id).localeCompare(label(b.id),'ru');
  });
  let lastTier='',lastBlock='';
  for(const t of sorted){
    const tier=romanFromId(t.id)||'—',block=goalBlock(t);
    if(tier!==lastTier){const sep=document.createElement('option');sep.disabled=true;sep.textContent=`──── Тир ${tier} ────`;group.append(sep);lastTier=tier;lastBlock=''}
    if(block.key!==lastBlock){const sep=document.createElement('option');sep.disabled=true;sep.textContent=`  • Блок · ${block.label}`;group.append(sep);lastBlock=block.key}
    const o=document.createElement('option');o.value=t.id;o.textContent=`${label(t.id)} · ${current[t.id]||0}/${maxLevel(t.id)}`;group.append(o);
  }
  sel.append(group);
}
function blankTotals(){return {meat:0,wood:0,coal:0,iron:0,steel:0,power:0,base:0,actual:0,nodes:0,rc:0}}
function aggregateOrder(order,predicate=()=>true){
  const a=blankTotals();
  for(const n of order||[]){if(!predicate(n))continue;a.base+=Number(n.baseSeconds)||0;a.actual+=Number(n.actualSeconds)||0;a.power+=Number(n.power)||0;a.rc=Math.max(a.rc,Number(n.rc)||0);a.nodes++;for(const r of ['meat','wood','coal','iron','steel'])a[r]+=Number(n.cost?.[r])||0}
  return a;
}
function resourceBits(a){
  const names={meat:'Мясо',wood:'Дерево',coal:'Уголь',iron:'Железо',steel:'Сталь'};
  return ['meat','wood','coal','iron','steel'].filter(r=>Number(a?.[r])>0).map(r=>`<span><b>${names[r]}</b> ${shortNum(a[r])}</span>`).join('');
}
function priceHtml(a,labelText='Цена'){
  if(!a||!a.nodes)return `<div class="price-line muted-price">${labelText}: —</div>`;
  return `<div class="price-line"><span class="price-label">${labelText}:</span><span class="price-time">${formatTime(a.actual)} <em>(база ${formatTime(a.base)})</em></span><span class="price-resources">${resourceBits(a)}</span></div>`;
}
function externalGoalRequirements(id,lvl){
  const req=cumulativeReqs(id,lvl);delete req[id];return Object.entries(req).sort((a,b)=>(TECHS[a[0]]?.row||0)-(TECHS[b[0]]?.row||0)).map(([rid,rl])=>({id:rid,level:rl}));
}
function requirementHtml(id,lvl){
  const reqs=externalGoalRequirements(id,lvl);const rc=Math.max(...Array.from({length:lvl},(_,i)=>levelReqRC(id,i+1)),0);
  const parts=reqs.map(r=>`<span>${label(r.id)}: ур. ${r.level}</span>`);if(rc)parts.push(`<span>Иссл. Центр: ур. ${rc}</span>`);
  return parts.length?parts.join(''):'<span>Дополнительных требований нет</span>';
}
function routePrereqIds(target){return groupRoute(target).filter(id=>id!==goalId)}
function maximizeRoute(){
  if(!goalId){toast('Сначала выберите цель');return}
  const target=mergeTargetWithOverrides(),ids=routePrereqIds(target);if(!ids.length){toast('Нет промежуточных технологий');return}
  for(const id of ids)overrides[id]=maxLevel(id);
  cleanOverrides();save();renderCalculation();toast('Необходимые технологии повышены до MAX');
}
function minimizeRoute(){if(!goalId)return;overrides={};save();renderCalculation();toast('Оставлены минимальные требования')}
function clearRoute(){goalId='';goalLevel=1;overrides={};save();renderCalculation();toast('Список расчёта очищен')}

function cleanupGoalAfterProfileChange(){
  if(!Object.keys(TECHS).length)return;
  normalizeState(current);
  if(goalId&&(!TECHS[goalId]||(current[goalId]||0)>=maxLevel(goalId))){goalId='';goalLevel=1;overrides={}}
  if(goalId){const min=(current[goalId]||0)+1;goalLevel=Math.max(min,Math.min(maxLevel(goalId),goalLevel||min))}
  if(candidateId&&(!TECHS[candidateId]||(current[candidateId]||0)>=maxLevel(candidateId)||TECHS[candidateId]?.branch!==goalBranch)){candidateId='';candidateLevel=1}
  if(candidateId){const min=(current[candidateId]||0)+1;candidateLevel=Math.max(min,Math.min(maxLevel(candidateId),candidateLevel||min))}
}

function renderProfile(){
  $('#rcLevel').value=rcLevel;$('#researchSpeed').value=speed;$('#tempSpeed').value=tempSpeed;
  const maxAll=Object.values(TECHS).reduce((a,t)=>a+maxLevel(t.id),0),done=Object.values(current).reduce((a,v)=>a+Number(v||0),0);
  $('#profileSummary').textContent=done?`Изучено ${fmt.format(done)} из ${fmt.format(maxAll)} уровней`:'Технологии не настроены';
}
function renderGoalOptions(){
  $$('#goalBranchTabs [data-goal-branch]').forEach(b=>b.classList.toggle('active',b.dataset.goalBranch===goalBranch));
  const sel=$('#goalTech'),arr=availableGoals(goalBranch),empty=$('#emptyGoals'),wrap=$('#goalLevelWrap');sel.innerHTML='';
  if(!arr.length){empty.hidden=false;wrap.hidden=true;sel.disabled=true;candidateId='';candidateLevel=1;renderGoalPreview();return}
  empty.hidden=true;sel.disabled=false;
  if(candidateId&&!arr.some(t=>t.id===candidateId)){candidateId='';candidateLevel=1}
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Выберите технологию…';sel.append(placeholder);
  const now=arr.filter(goalAvailableNow),later=arr.filter(t=>!goalAvailableNow(t));
  appendGoalGroup(sel,'Ближайшие — можно изучать сейчас',now);
  appendGoalGroup(sel,'Дальше по дереву',later);
  sel.value=candidateId||'';wrap.hidden=!candidateId;if(candidateId)renderGoalLevel();renderGoalPreview();
}
function renderGoalLevel(){
  const wrap=$('#goalLevelWrap'),el=$('#goalLevel');if(!candidateId||!TECHS[candidateId]){wrap.hidden=true;return}
  wrap.hidden=false;const min=Math.min(maxLevel(candidateId),(current[candidateId]||0)+1),mx=maxLevel(candidateId);candidateLevel=Math.max(min,Math.min(mx,candidateLevel));setRange(el,min,mx,candidateLevel);$('#goalLevelText').textContent=`${candidateLevel}/${mx}`;
}
function renderGoalPreview(){
  const box=$('#goalPreview'),btn=$('#addGoalToPlan');if(!box||!btn)return;
  if(!candidateId||!TECHS[candidateId]){box.hidden=true;box.innerHTML='';btn.disabled=true;return}
  const target=closure(current,candidateId,candidateLevel),sim=simulate(current,target,speed+tempSpeed),ids=groupRoute(target),prereqIds=ids.filter(id=>id!==candidateId);
  const targetAgg=aggregateOrder(sim.order,n=>n.id===candidateId),prereqAgg=aggregateOrder(sim.order,n=>n.id!==candidateId),cur=Number(current[candidateId])||0,mx=maxLevel(candidateId);
  box.hidden=false;btn.disabled=false;
  box.innerHTML=`<div class="goal-preview-title"><div><span>Выбрано</span><strong>${label(candidateId)}</strong></div><b>${cur}/${mx} → ${candidateLevel}/${mx}</b></div><div class="goal-preview-costs"><div class="goal-preview-cost"><div class="goal-preview-label">Целевая технология</div>${priceHtml(targetAgg,'Цена')}</div><div class="goal-preview-cost"><div class="goal-preview-label">Необходимые технологии <span>${prereqIds.length?`${prereqIds.length} шт. · ${prereqAgg.nodes} ур.`:'не требуются'}</span></div>${priceHtml(prereqAgg,'Цена')}</div></div>`;
}
function commitCandidate(){
  if(!candidateId||!TECHS[candidateId]){toast('Сначала выберите технологию');return}
  goalId=candidateId;goalLevel=candidateLevel;overrides={};save();renderCalculation();toast('Добавлено в план расчётов');
}
function groupRoute(target){
  const seen=new Set(),out=[];for(const n of topo(current,target)){if(!seen.has(n.id)){seen.add(n.id);out.push(n.id)}}return out;
}
function routeKind(id,min,targetLevel){
  if(id===goalId)return {cls:'goal',label:'Цель'};
  if(Number(overrides[id])>min)return {cls:'manual',label:'Повышено вручную'};
  if((current[id]||0)===0)return {cls:'auto',label:'Добавлено автоматически'};
  return {cls:'intermediate',label:'Промежуточный уровень'};
}
function renderCalculation(){
  const list=$('#routeList'),maxBtn=$('#routeMax'),minBtn=$('#routeMin'),clearBtn=$('#clearRoute');
  if(!goalId||!TECHS[goalId]){list.innerHTML='<div class="empty">Выберите целевую технологию.</div>';$('#routeCount').textContent='—';maxBtn.disabled=true;minBtn.disabled=true;clearBtn.disabled=true;renderTotals(null);return}
  maxBtn.disabled=false;minBtn.disabled=false;clearBtn.disabled=false;
  cleanOverrides();const target=mergeTargetWithOverrides(),ids=groupRoute(target),sim=simulate(current,target,speed+tempSpeed),prereqIds=ids.filter(id=>id!==goalId);
  const targetAgg=aggregateOrder(sim.order,n=>n.id===goalId),prereqAgg=aggregateOrder(sim.order,n=>n.id!==goalId);
  $('#routeCount').textContent=`цель + ${prereqIds.length} необходимых технологий`;
  list.innerHTML='';

  const curGoal=Number(current[goalId])||0,mxGoal=maxLevel(goalId),goalCard=document.createElement('section');goalCard.className='route-goal';
  goalCard.innerHTML=`<div class="route-goal-head"><div><div class="route-goal-kicker">Ваша цель</div><div class="route-goal-name">${label(goalId)}</div><div class="route-goal-level">${curGoal}/${mxGoal} → <b>${goalLevel}/${mxGoal}</b></div></div><span class="kind-chip goal-chip">Цель</span></div><div class="goal-needs"><b>Требует:</b><div>${requirementHtml(goalId,goalLevel)}</div></div>${priceHtml(targetAgg,'Цена самой технологии')}`;
  list.append(goalCard);

  const chain=document.createElement('section');chain.className='prereq-chain';
  if(prereqIds.length){chain.innerHTML=`<div class="prereq-chain-head"><div class="prereq-chain-title"><strong>Необходимые технологии</strong><span>${prereqIds.length} шт. · ${prereqAgg.nodes} уровней</span></div>${priceHtml(prereqAgg,'Всего для обязательных технологий')}</div><div class="prereq-chain-list"></div>`}
  else{chain.innerHTML='<div class="prereq-chain-head no-prereq"><div class="prereq-chain-title"><strong>Необходимые технологии</strong><span>Дополнительных исследований не требуется</span></div></div>'}
  list.append(chain);const chainList=chain.querySelector('.prereq-chain-list');

  for(const id of prereqIds){
    const cur=Number(current[id])||0,final=Number(target[id])||0,mx=maxLevel(id),min=minimumForRouteTech(id),kind=routeKind(id,min,final),t=TECHS[id],item=document.createElement('div');item.className=`route-item kind-${kind.cls}`;
    const own=aggregateOrder(sim.order,n=>n.id===id);
    item.innerHTML=`<div class="route-top"><div><div class="route-name">${label(id)}</div><div class="route-meta">${t.branch==='Growth'?'Развитие':'Битва'} · ${statLabel(t)}</div></div><span class="kind-chip">${kind.label}</span></div>${priceHtml(own,'Цена улучшения')}<div class="route-levels"><input class="range" data-route-slider="${id}" type="range" min="${min}" max="${mx}" step="1" value="${final}"/><div><div class="level-num">${cur} → <span data-route-value="${id}">${final}</span>/${mx}</div><div class="min-note">минимум ${min}/${mx}</div></div></div>`;
    chainList.append(item);const slider=item.querySelector('.range');rangePct(slider);
  }
  list.querySelectorAll('[data-route-slider]').forEach(sl=>{
    sl.addEventListener('input',()=>{sl.classList.add('is-live');rangePct(sl);const v=list.querySelector(`[data-route-value="${sl.dataset.routeSlider}"]`);if(v)v.textContent=sl.value;previewRouteLevel(sl.dataset.routeSlider,Number(sl.value))});
    sl.addEventListener('change',()=>{sl.classList.remove('is-live');setRouteLevel(sl.dataset.routeSlider,Number(sl.value))});
  });
  renderTotals(sim);
}
function renderTotals(sim){
  const ids={totalTime:'actual',totalBase:'base',totalPower:'power'};
  if(!sim){for(const k of Object.keys(ids))$('#'+k).textContent='—';$('#totalRC').textContent='ур. —';for(const r of ['meat','wood','coal','iron','steel'])$('#res-'+r).textContent='—';$('#rcWarning').hidden=true;return}
  $('#totalTime').textContent=formatTime(sim.actual);$('#totalBase').textContent=formatTime(sim.base);$('#totalPower').textContent='+'+shortNum(sim.power);$('#totalRC').textContent=sim.rc?`ур. ${sim.rc}`:'ур. —';
  for(const r of ['meat','wood','coal','iron','steel'])$('#res-'+r).textContent=shortNum(sim[r]);
  const warn=$('#rcWarning');if(sim.rc>rcLevel){warn.hidden=false;warn.textContent=`Нужен Иссл. Центр: ур. ${sim.rc}`}else warn.hidden=true;
}
function renderTree(){
  const root=$('#tree');root.innerHTML='';const arr=Object.values(TECHS).filter(t=>t.branch===branch).filter(t=>!treeQuery||(`${label(t.id)} ${statLabel(t)}`).toLowerCase().includes(treeQuery.toLowerCase())).sort((a,b)=>(a.row||0)-(b.row||0)||label(a.id).localeCompare(label(b.id),'ru'));
  if(!arr.length){root.innerHTML='<div class="empty">Ничего не найдено.</div>';return}
  let row=null,grid=null;
  for(const t of arr){
    if(t.row!==row){row=t.row;const sec=document.createElement('section');sec.className='tier';sec.innerHTML=`<div class="tier-title"><strong>Ряд ${row}</strong>${row>1?`<button class="row-max" type="button" data-rowmax="${row}">Предыдущие ряды → MAX</button>`:''}</div><div class="tech-grid"></div>`;root.append(sec);grid=sec.querySelector('.tech-grid')}
    const cur=Number(current[t.id])||0,mx=maxLevel(t.id),card=document.createElement('div');card.className=`tech-card branch-${t.branch}${cur===mx?' is-full':''}`;
    card.innerHTML=`<div class="tech-name-row"><div><div class="tech-name">${label(t.id)}</div><div class="tech-sub">${statLabel(t)}</div></div>${cur===mx?'<span class="full-chip">ФУЛЛ</span>':''}</div><div class="tech-slider"><div class="tech-level"><span>Уровень</span><strong data-tree-value="${t.id}">${cur}/${mx}</strong></div><input class="range" data-current-slider="${t.id}" type="range" min="0" max="${mx}" step="1" value="${cur}"/></div>`;
    grid.append(card);const slider=card.querySelector('.range');rangePct(slider);
  }
  root.querySelectorAll('[data-current-slider]').forEach(sl=>{
    sl.addEventListener('input',()=>{sl.classList.add('is-live');rangePct(sl);previewCurrent(sl.dataset.currentSlider,Number(sl.value))});
    sl.addEventListener('change',()=>{sl.classList.remove('is-live');setCurrent(sl.dataset.currentSlider,Number(sl.value))});
  });
  root.querySelectorAll('[data-rowmax]').forEach(b=>b.addEventListener('click',()=>fillPreviousRows(Number(b.dataset.rowmax))));
}
function renderAll(keepDrawer=false){renderProfile();renderGoalOptions();renderCalculation();if(keepDrawer||$('#drawerBackdrop').classList.contains('open'))renderTree()}
function openDrawer(){renderTree();$('#drawerBackdrop').classList.add('open');document.body.style.overflow='hidden'}
function closeDrawer(){$('#drawerBackdrop').classList.remove('open');document.body.style.overflow=''}
function clearProfile(){
  const btn=$('#clearProfile');
  if(!clearProfileArmed){clearProfileArmed=true;if(btn){btn.dataset.oldText=btn.textContent;btn.textContent='Нажмите ещё раз';btn.classList.add('armed')}clearTimeout(clearProfileTimer);clearProfileTimer=setTimeout(()=>{clearProfileArmed=false;if(btn){btn.textContent=btn.dataset.oldText||'Очистить технологии';btn.classList.remove('armed')}},2600);return}
  clearProfileArmed=false;clearTimeout(clearProfileTimer);current={};overrides={};goalId='';goalLevel=1;candidateId='';candidateLevel=1;for(const k of [STATE_KEY,...LEGACY_KEYS])localStorage.removeItem(k);save();if(btn){btn.textContent='Очистить технологии';btn.classList.remove('armed')}renderAll(true);toast('Текущие технологии очищены');
}
function setGoalBranch(b){if(!['Growth','Battle'].includes(b)||b===goalBranch)return;goalBranch=b;candidateId='';candidateLevel=1;renderGoalOptions();save()}
function bind(){
  $('#saveProfile').addEventListener('click',()=>{save();toast('Профиль сохранён')});
  $('#openHelp').addEventListener('click',()=>showHelp(true));$('#closeHelp').addEventListener('click',()=>hideHelp(true));$('#helpDone').addEventListener('click',()=>hideHelp(true));$('#helpBackdrop').addEventListener('click',e=>{if(e.target===$('#helpBackdrop'))hideHelp(true)});
  $('#openTree').addEventListener('click',openDrawer);$('#openTreeBottom').addEventListener('click',openDrawer);$('#closeTree').addEventListener('click',closeDrawer);$('#drawerBackdrop').addEventListener('click',e=>{if(e.target===$('#drawerBackdrop'))closeDrawer()});
  $('#clearProfile').addEventListener('click',clearProfile);
  $('#rcLevel').addEventListener('change',e=>{rcLevel=Math.max(1,Math.min(30,Number(e.target.value)||1));const req=highestRequiredRC(current);if(rcLevel<req){rcLevel=req;toast(`Нужен Иссл. Центр: ур. ${req}`)}save();renderProfile();renderGoalOptions();renderTotals(goalId?simulate(current,mergeTargetWithOverrides(),speed+tempSpeed):null)});
  $('#researchSpeed').addEventListener('input',e=>{speed=Math.max(0,Number(e.target.value)||0);save();renderCalculation();renderGoalPreview();renderProfile()});
  $('#tempSpeed').addEventListener('input',e=>{tempSpeed=Math.max(0,Number(e.target.value)||0);save();renderCalculation();renderGoalPreview();renderProfile()});
  $$('#goalBranchTabs [data-goal-branch]').forEach(b=>b.addEventListener('click',()=>setGoalBranch(b.dataset.goalBranch)));
  $('#goalTech').addEventListener('change',e=>{candidateId=e.target.value;if(candidateId){candidateLevel=(current[candidateId]||0)+1}else candidateLevel=1;renderGoalLevel();renderGoalPreview()});
  $('#goalLevel').addEventListener('input',e=>{candidateLevel=Number(e.target.value)||1;rangePct(e.target);$('#goalLevelText').textContent=`${candidateLevel}/${maxLevel(candidateId)}`;renderGoalPreview()});
  $('#addGoalToPlan').addEventListener('click',commitCandidate);
  $('#routeMax').addEventListener('click',maximizeRoute);$('#routeMin').addEventListener('click',minimizeRoute);$('#clearRoute').addEventListener('click',clearRoute);
  $('#treeSearch').addEventListener('input',e=>{treeQuery=e.target.value;renderTree()});
  $$('.tab[data-branch]').forEach(b=>b.addEventListener('click',()=>{branch=b.dataset.branch;$$('.tab[data-branch]').forEach(x=>x.classList.toggle('active',x===b));renderTree()}));
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#helpBackdrop')?.classList.contains('open'))hideHelp(true);else closeDrawer()}});
}
function init(){
  if(!DATA){document.body.innerHTML='<main class="wrap"><section class="card"><h2>Не удалось загрузить базу технологий.</h2></section></main>';return}
  loadState();buildTechs();bind();renderAll();save();if(!localStorage.getItem(HELP_KEY))setTimeout(()=>showHelp(false),180);
}
init();
})();
