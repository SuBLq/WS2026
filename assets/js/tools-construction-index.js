
const BUILD_DB=window.WOS_BUILD_DATA,BUILDING_ORDER=["Топка", "Посольство", "Научный центр", "Лагерь пехоты", "Лагерь копейщиков", "Лагерь лучников", "Командный центр", "Лазарет", "Склад", "Баррикада", "Военная академия"],ORDINARY_BUILDINGS=["Топка", "Посольство", "Научный центр", "Лагерь пехоты", "Лагерь копейщиков", "Лагерь лучников", "Командный центр", "Лазарет", "Склад"],FC_BUILDINGS=["Топка", "Посольство", "Лагерь пехоты", "Лагерь копейщиков", "Лагерь лучников", "Командный центр", "Лазарет", "Военная академия"],PRESET_STEPS=["17 → 18", "18 → 19", "19 → 20", "20 → 21", "21 → 22", "22 → 23", "23 → 24", "24 → 25", "25 → 26", "26 → 27", "27 → 28", "28 → 29", "29 → 30", "30 → FC1", "FC1 → FC2", "FC2 → FC3", "FC3 → FC4", "FC4 → FC5", "FC5 → FC6", "FC6 → FC7", "FC7 → FC8", "FC8 → FC9", "FC9 → FC10"];
(function(){
const $=id=>document.getElementById(id),STORE='wos_build_calc_v4',OLD=['wos_build_calc_v3','wos_build_calc_v2','wos_build_calc_v1'];
const RKEYS=['food','wood','coal','iron','fc','rfc'],RN={food:'Мясо',wood:'Дерево',coal:'Уголь',iron:'Железо',fc:'КО',rfc:'ПКО'};
const state={pickBuilding:'Топка',pickTransition:'25 → 26',builds:[]};

function n(v){v=parseFloat(v);return Number.isFinite(v)?v:0}
function fmt(s){s=Math.max(0,Math.round(s));if(!s)return'0 мин';let d=Math.floor(s/86400);s%=86400;let h=Math.floor(s/3600);s%=3600;let m=Math.floor(s/60),p=[];if(d)p.push(d+' д');if(h)p.push(h+' ч');if(m||(!d&&!h))p.push(m+' мин');return p.join(' ')}
function fmtRes(v,k){v=Math.round(v||0);if(k==='fc'||k==='rfc')return v.toLocaleString('ru-RU');if(v>=1e6)return(v/1e6).toLocaleString('ru-RU',{maximumFractionDigits:3})+'М';if(v>=1e3)return(v/1e3).toLocaleString('ru-RU',{maximumFractionDigits:1})+' тыс.';return v.toLocaleString('ru-RU')}
function emptyRes(){return{food:0,wood:0,coal:0,iron:0,fc:0,rfc:0}}
function addRes(t,r){RKEYS.forEach(k=>t[k]+=r[k]||0);return t}
function resHtml(r){return RKEYS.map(k=>`<div class="resource"><span>${RN[k]}</span><b>${fmtRes(r[k],k)}</b></div>`).join('')}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function opts(a,s){return a.map(v=>`<option value="${esc(v)}"${v===s?' selected':''}>${esc(v)}</option>`).join('')}
function entry(b,l){return(BUILD_DB[b]||[]).find(e=>e.label===l)||null}
function key(b,l){return b+'|||'+l}
function usedSet(){return new Set(state.builds.map(x=>key(x.building,x.transition)))}
function isUsed(b,l){return state.builds.some(x=>x.building===b&&x.transition===l)}
function effective(b,l){return b==='Военная академия'&&l==='30 → FC1'?'Открытие FC1':l}
function isFC(l){return l==='30 → FC1'||l.startsWith('FC')}
function bulkBuildings(l){return isFC(l)?FC_BUILDINGS:ORDINARY_BUILDINGS}

function hyena(){let l=parseInt($('hyena').value||'0',10);return l?n($('h'+l).value):0}
function speed(){return Math.max(0,n($('ownSpeed').value))+($('titleBonus').checked?Math.max(0,n($('titlePct').value)):0)+Math.max(0,hyena())+Math.max(0,n($('otherBonus').value))}
function apply(s){return window.WOS.math.duration(s,speed(),$('doubleTime').checked?Math.max(.01,n($('doubleMult').value)||.8):1)}
function hyenaLabels(){for(let i=1;i<=5;i++)$('hyena').options[i].textContent='Ур. '+i+' — '+n($('h'+i).value).toLocaleString('ru-RU')+'%'}

function fillPickBuildings(){$('pickBuilding').innerHTML=opts(BUILDING_ORDER,state.pickBuilding)}
function fillPickTransitions(preferCurrent=true){
  const a=BUILD_DB[state.pickBuilding]||[];
  if(!preferCurrent||!a.some(e=>e.label===state.pickTransition))state.pickTransition=a[0]?.label||'';
  $('pickTransition').innerHTML=opts(a.map(e=>e.label),state.pickTransition);
  updatePick()
}
function setStatus(text,type=''){const el=$('pickStatus');el.textContent=text;el.className='status'+(type?' '+type:'')}
function updatePick(){
  const e=entry(state.pickBuilding,state.pickTransition),dup=isUsed(state.pickBuilding,state.pickTransition);
  $('pickTime').textContent=e?e.time:'—';
  $('addBuild').disabled=!e||dup;
  if(dup)setStatus('Эта стройка уже есть в списке. Выберите другой переход.','warn');
  else setStatus('','')
}
function firstUnusedForBuilding(b,startIndex=0){
  const a=BUILD_DB[b]||[],u=usedSet();
  for(let i=startIndex;i<a.length;i++)if(!u.has(key(b,a[i].label)))return a[i].label;
  for(let i=0;i<startIndex;i++)if(!u.has(key(b,a[i].label)))return a[i].label;
  return null
}
function advancePick(){
  const a=BUILD_DB[state.pickBuilding]||[],idx=a.findIndex(e=>e.label===state.pickTransition),u=usedSet();
  for(let i=idx+1;i<a.length;i++){
    if(!u.has(key(state.pickBuilding,a[i].label))){state.pickTransition=a[i].label;fillPickTransitions();return}
  }
  const bidx=BUILDING_ORDER.indexOf(state.pickBuilding);
  for(let offset=1;offset<=BUILDING_ORDER.length;offset++){
    const b=BUILDING_ORDER[(bidx+offset)%BUILDING_ORDER.length],lab=firstUnusedForBuilding(b,0);
    if(lab){state.pickBuilding=b;state.pickTransition=lab;fillPickBuildings();fillPickTransitions();return}
  }
  updatePick();setStatus('Все доступные переходы уже добавлены.','ok')
}
function addCurrent(){
  const e=entry(state.pickBuilding,state.pickTransition);
  if(!e)return;
  if(isUsed(state.pickBuilding,state.pickTransition)){setStatus('Дубликат не добавлен.','warn');advancePick();return}
  const addedName=state.pickBuilding+' '+state.pickTransition;
  state.builds.push({building:state.pickBuilding,transition:state.pickTransition});
  render();advancePick();setStatus('Добавлено: '+addedName,'ok');save()
}

function buildTpl(it,i){
  const e=entry(it.building,it.transition),rr=e?RKEYS.filter(k=>e.resources[k]).map(k=>RN[k]+' '+fmtRes(e.resources[k],k)).join(' · '):'';
  return`<div class="build" data-i="${i}">
    <div class="build-head"><div class="build-title"><b>${esc(it.building)}</b><span>${esc(it.transition)}</span></div><button class="remove" aria-label="Удалить">×</button></div>
    <div class="build-out"><span>Базовое время</span><span class="base">${e?esc(e.time):'—'}</span><span>Реальное время</span><b class="real">0 мин</b><div class="build-resource">${rr}</div></div>
  </div>`
}
function render(){
  if(!state.builds.length)$('buildList').innerHTML='<div class="empty">Добавьте первую стройку кнопкой «+» выше.</div>';
  else $('buildList').innerHTML=state.builds.map(buildTpl).join('');
  document.querySelectorAll('.build').forEach(el=>{
    const i=+el.dataset.i;
    el.querySelector('.remove').onclick=()=>{state.builds.splice(i,1);render();updatePick();save()}
  });
  $('countBadge').textContent=state.builds.length+' '+plural(state.builds.length,'стройка','стройки','строек');
  calcTotals()
}
function plural(n,a,b,c){n=Math.abs(n)%100;let n1=n%10;if(n>10&&n<20)return c;if(n1>1&&n1<5)return b;if(n1===1)return a;return c}
function calcTotals(){
  let base=0,real=0,res=emptyRes();
  document.querySelectorAll('.build').forEach(el=>{
    const i=+el.dataset.i,e=entry(state.builds[i].building,state.builds[i].transition),bs=e?e.seconds:0,rr=apply(bs);
    base+=bs;real+=rr;if(e)addRes(res,e.resources);
    el.querySelector('.real').textContent=fmt(rr)
  });
  $('totalReal').textContent=fmt(real);$('totalBase').textContent=fmt(base);$('totalSaved').textContent=fmt(Math.max(0,base-real));
  $('totalSpeed').textContent=speed().toLocaleString('ru-RU',{maximumFractionDigits:2})+'%';$('totalCount').textContent=state.builds.length;
  $('totalResources').innerHTML=resHtml(res)
}

function bulkData(l){
  let s=0,res=emptyRes(),bs=bulkBuildings(l);
  bs.forEach(b=>{let e=entry(b,effective(b,l));if(e){s+=e.seconds;addRes(res,e.resources)}});
  return{bs,s,res}
}
function updateBulk(){
  let d=bulkData($('bulkTransition').value),cost=RKEYS.filter(k=>d.res[k]).map(k=>RN[k]+' '+fmtRes(d.res[k],k)).join(' · ');
  $('bulkMeta').innerHTML=d.bs.length+' зданий · '+fmt(d.s)+' базового времени<br>'+cost
}
function addBulk(){
  const l=$('bulkTransition').value;let added=0;
  bulkBuildings(l).forEach(b=>{const lab=effective(b,l);if(!isUsed(b,lab)&&entry(b,lab)){state.builds.push({building:b,transition:lab});added++}});
  render();advancePick();setStatus(added?'Добавлено зданий: '+added:'Все здания этого перехода уже есть в списке.',added?'ok':'warn');save()
}

function snap(){return{ownSpeed:$('ownSpeed').value,hyena:$('hyena').value,titleBonus:$('titleBonus').checked,doubleTime:$('doubleTime').checked,otherBonus:$('otherBonus').value,coeffs:[1,2,3,4,5].map(i=>$('h'+i).value),titlePct:$('titlePct').value,doubleMult:$('doubleMult').value,pickBuilding:state.pickBuilding,pickTransition:state.pickTransition,bulkTransition:$('bulkTransition').value,builds:state.builds}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(snap()))}catch(e){}}
function applyStored(x){
  ['ownSpeed','hyena','otherBonus','titlePct','doubleMult'].forEach(k=>{if(x[k]!==undefined)$(k).value=x[k]});
  $('titleBonus').checked=!!x.titleBonus;$('doubleTime').checked=!!x.doubleTime;
  if(Array.isArray(x.coeffs))x.coeffs.forEach((v,i)=>{if($('h'+(i+1)))$('h'+(i+1)).value=v});
  if(x.pickBuilding&&BUILD_DB[x.pickBuilding])state.pickBuilding=x.pickBuilding;
  else if(x.singleBuilding&&BUILD_DB[x.singleBuilding])state.pickBuilding=x.singleBuilding;
  if(x.pickTransition)state.pickTransition=x.pickTransition;else if(x.singleTransition)state.pickTransition=x.singleTransition;
  if(Array.isArray(x.builds))state.builds=x.builds.filter(b=>b&&b.building&&BUILD_DB[b.building]&&entry(b.building,b.transition)).map(b=>({building:b.building,transition:b.transition}));
  state.builds=state.builds.filter((b,i,a)=>a.findIndex(x=>x.building===b.building&&x.transition===b.transition)===i);
  if(x.bulkTransition&&PRESET_STEPS.includes(x.bulkTransition))$('bulkTransition').value=x.bulkTransition;
  else if(x.presetTransition&&PRESET_STEPS.includes(x.presetTransition))$('bulkTransition').value=x.presetTransition
}
function load(){
  try{let x=JSON.parse(localStorage.getItem(STORE)||'null');if(x){applyStored(x);return}
    for(let k of OLD){x=JSON.parse(localStorage.getItem(k)||'null');if(x){applyStored(x);return}}
  }catch(e){}
}

$('pickBuilding').onchange=()=>{state.pickBuilding=$('pickBuilding').value;state.pickTransition=firstUnusedForBuilding(state.pickBuilding,0)||(BUILD_DB[state.pickBuilding][0]?.label||'');fillPickTransitions();save()};
$('pickTransition').onchange=()=>{state.pickTransition=$('pickTransition').value;updatePick();save()};
$('addBuild').onclick=addCurrent;
$('clearBuilds').onclick=()=>{state.builds=[];render();updatePick();setStatus('Список очищен.','ok');save()};
$('bulkTransition').onchange=()=>{updateBulk();save()};$('bulkAdd').onclick=addBulk;
$('resetSettings').onclick=()=>{[5,7,9,12,15].forEach((v,i)=>$('h'+(i+1)).value=v);$('titlePct').value=10;$('doubleMult').value=.8;hyenaLabels();calcTotals();save()};
['ownSpeed','hyena','titleBonus','doubleTime','otherBonus','h1','h2','h3','h4','h5','titlePct','doubleMult'].forEach(id=>{$(id).oninput=()=>{hyenaLabels();calcTotals();save()};$(id).onchange=()=>{hyenaLabels();calcTotals();save()}});

$('bulkTransition').innerHTML=opts(PRESET_STEPS,'25 → 26');
load();hyenaLabels();fillPickBuildings();fillPickTransitions();
if(!$('bulkTransition').value)$('bulkTransition').value='25 → 26';
updateBulk();render();updatePick();
})();
