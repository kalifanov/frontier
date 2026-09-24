import { Battle, W, H, WEAPONS, NAMES, ROUTES, makeSquad, buildMap, waypoints, findPath, distance, random, purchase } from './game.js';

const $=id=>document.getElementById(id),ctx=$('arena').getContext('2d');
const money=n=>'$'+n.toLocaleString('ru-RU');
const mobileLayout=matchMedia('(max-width: 680px)');
const ordersPanel=document.querySelector('.orders-panel');
function placeOrders(){if(mobileLayout.matches)$('mobileOrders').append(ordersPanel);else{if($('orderDialog').open)$('orderDialog').close();$('shopButton').before(ordersPanel);}}
placeOrders();mobileLayout.addEventListener('change',placeOrders);
let squads,baseline,scores,position,round,phase,selected=0,battle,map,roomOwners,mapOrder,lossStreaks,matchOver=false,showRoutes=true,lastFrame=0,toastTimer,eventCount=1;
const seed=()=>Math.floor(Math.random()*0xffffffff);
let matchSeed=seed(),mapTexture;
const artColors=[['#5d7056','#b7bda0','#2d3e32'],['#666b57','#b5b396','#303b32'],['#6d7563','#bbc1a7','#33443a']];

function portrait(index){const [jacket,helmet,dark]=artColors[index];return `<svg viewBox="0 0 100 95" aria-hidden="true"><path d="M22 99 26 66 39 58 64 57 79 68 88 99" fill="${jacket}"/><path d="m27 70 15-8 19 1 18 8-5 25H28Z" fill="${dark}"/><path d="m39 64 5 31m15-31-3 31M32 72h36v7H31m2 5h33v7H32" fill="none" stroke="${helmet}" stroke-width="3" opacity=".42"/><path d="m42 53 1 10 9 6 9-6-1-12" fill="#878e70"/><path d="M35 34q0-21 18-21t17 21l-4 22-13 7-14-9Z" fill="${helmet}"/><path d="M32 36q-2-27 21-27t22 27l-6 2-32 1Z" fill="${jacket}"/><path d="M36 34h34v13l-11 4-19-6Z" fill="#283a32"/><path d="m40 36 23 1-6 7-15-2Z" fill="#9cad97" opacity=".6"/><path d="M32 34h41v5H32" fill="${dark}"/><path d="m37 47 5 8 19 5 6-12-13 3Z" fill="${dark}"/><path d="M24 68 13 88l9 8 17-18m35-8 11 21-12 7-13-18" fill="${jacket}"/><path d="m19 83 59-15 2 7-58 16Z" fill="#1f302a"/><path d="m37 80 3 12 7-2-2-12m18-5 4 10 7-2-4-10" fill="#1f302a"/><path d="m77 69 15-4 1 4-15 4" fill="#1f302a"/><path d="m23 84 10-3 3 7-10 4m35-14 8-2 3 7-9 3" fill="#aaa98a"/>${index===1?'<path d="M44 12h15v9H44Z" fill="#7e856b"/>':''}${index===2?'<path d="M33 25 26 43l9 17 4-15m31-20 8 18-10 17-2-15" fill="#465b4b"/>':''}</svg>`;}

function newMatch(){
  squads=[makeSquad(0),makeSquad(1)];scores=[0,0];position=3;round=1;lossStreaks=[0,0];roomOwners=[0,0,0,1,1,1,1];phase='plan';matchOver=false;matchSeed=seed();
  const rng=random(matchSeed);mapOrder=Array.from({length:7},(_,i)=>i===3?0:Math.floor(rng()*4));
  prepare();
}
function prepare(){
  phase='plan';baseline=structuredClone(squads);map=buildMap(mapOrder[position],position,scores[0]===7&&scores[1]===7);mapTexture=makeTerrain(matchSeed+mapOrder[position]);
  battle=new Battle({map,squads,owner:roomOwners[position],duration:position===0||position===6||scores.every(s=>s===7)?60:40,seed:matchSeed+round,onEvent:log});
  $('resultOverlay').hidden=true;log('Захвати башню. Удержи рубеж.');render();draw(0);
}
function log(text){$('eventText').textContent=text;$('eventIndex').textContent=String(eventCount++).padStart(2,'0');}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2400);}

function render(){
  $('ourScore').textContent=scores[0];$('enemyScore').textContent=scores[1];$('roundLabel').textContent=`РАУНД ${String(round).padStart(2,'0')}`;
  $('frontlineStatus').textContent=position===6?'ШТУРМ БАЗЫ ВРАГА':position===0?'ЗАЩИТА ТВОЕЙ БАЗЫ':`ДО БАЗЫ ВРАГА · ${6-position} ${6-position===1?'ШАГ':6-position<5?'ШАГА':'ШАГОВ'}`;
  $('frontline').innerHTML=roomOwners.map((owner,i)=>`<span class="front-node ${owner?'hostile':''} ${i===position?'current':''} ${i===0||i===6?'base':''}" aria-label="${i===position?'Текущая арена. ':''}Сектор ${i+1}: ${owner?'враг':'твой'}">${i===0||i===6?'<svg><use href="#i-shield"/></svg>':''}</span>`).join('');
  $('arenaName').innerHTML=map.name+'<span class="map-dot">.</span>';$('arenaCode').textContent=`СЕКТОР ${String(position+1).padStart(2,'0')} / ${map.type}`;
  $('phaseBadge').classList.toggle('live',phase==='fight');$('phaseBadge').innerHTML=`<i></i> ${phase==='plan'?'ПЛАНИРОВАНИЕ':phase==='fight'?'БОЙ ИДЁТ':'РАУНД ЗАВЕРШЁН'}`;
  $('mapHint').textContent=phase==='plan'?'Выбери бойца и назначь маршрут':phase==='fight'?'Приказы приняты. Отряд действует.':'Разбери бой и скорректируй план';
  $('squadCards').innerHTML=squads[0].map((u,i)=>{const live=battle.units[i];return `<button class="unit-card ${i===selected?'selected':''} ${live.hp<=0?'dead':''}" data-unit="${i}" aria-label="Выбрать бойца ${u.name}" aria-pressed="${i===selected}"><span class="unit-art" data-index="0${i+1}">${portrait(i)}<span class="unit-tag">0${i+1}</span><span class="unit-status"></span></span><span class="unit-info"><strong>${u.name}</strong><small>${WEAPONS[u.weapon].name}${u.armor?' / ◇':''}</small><span class="unit-health"><i style="width:${live.hp}%"></i></span></span></button>`;}).join('');
  $('selectedName').textContent=`0${selected+1} / ${NAMES[selected]}`;
  $('orderSummary').textContent=`${NAMES[selected]} · ${ROUTES[squads[0][selected].route]} · ${{capture:'Захват',cover:'Прикрытие',flank:'Обход'}[squads[0][selected].stance]}`;
  $('orderButton').disabled=phase!=='plan';
  $('routeOptions').innerHTML=Object.entries(ROUTES).map(([id,label])=>`<button class="route-option ${squads[0][selected].route===id?'active':''}" data-route="${id}" aria-pressed="${squads[0][selected].route===id}" ${phase!=='plan'?'disabled':''}><svg><use href="#${id==='center'?'i-arrow':'i-route'}"/></svg>${label}</button>`).join('');
  $('stanceSelect').value=squads[0][selected].stance;$('stanceSelect').disabled=phase!=='plan';$('delayRange').value=squads[0][selected].delay;$('delayRange').disabled=phase!=='plan';$('delayValue').value=squads[0][selected].delay+' c';
  $('budget').textContent=money(squads[0].reduce((n,u)=>n+u.money,0));$('shopButton').disabled=phase!=='plan';
  $('startButton').disabled=phase==='fight';$('startLabel').textContent=phase==='plan'?'НАЧАТЬ БОЙ':phase==='fight'?'БОЙ ИДЁТ':matchOver?'НОВЫЙ МАТЧ':'СЛЕДУЮЩИЙ РАУНД';
  $('readyCaption').textContent=phase==='plan'?'ПЛАН ГОТОВ. ТВОЙ ХОД.':phase==='fight'?'КОНТРОЛЬ БАШНИ РЕШАЕТ ВСЁ.':matchOver?'МАТЧ ЗАВЕРШЁН.':'ПЕРЕГРУППИРОВКА';
  $('startNote').textContent=phase==='plan'?'После старта отряд действует самостоятельно':phase==='fight'?'Наблюдай за боем и готовь следующий план':matchOver?'Новая цепочка арен. Новая тактика.':'Пополнение бюджета уже начислено';updateLive();
}
function updateLive(){
  $('clock').textContent=`00:${String(Math.ceil(battle.remaining)).padStart(2,'0')}`;
  $('towerStatus').textContent=`БАШНЯ: ${battle.owner===0?'ТВОЯ':'ВРАГ'}`;$('towerStatus').style.color=battle.owner===0?'#617b58':'#a4654d';
  $('unitCount').textContent=`${battle.units.filter(u=>u.team===0&&u.hp>0).length} / 3 БОЙЦА`;
  document.querySelectorAll('.unit-card').forEach((el,i)=>{el.classList.toggle('dead',battle.units[i].hp<=0);el.querySelector('.unit-health i').style.width=battle.units[i].hp+'%';});
}
function syncPlan(){for(let i=0;i<3;i++)Object.assign(battle.units[i],squads[0][i]);render();}
function planAI(){const rng=random(matchSeed+round*13);squads[1].forEach((u,i)=>{u.route=['left','center','right'][Math.floor(rng()*3)];u.stance=i===0?'capture':i===1?'cover':'flank';u.delay=i===2?Math.floor(rng()*3):0;
  const base=baseline[1][i];const desired=u.money>=4750&&i===1?'sniper':u.money>=2900?'rifle':u.money>=1250?'smg':u.money>=650?'heavy':u.weapon;
  if(WEAPONS[desired].cost>WEAPONS[u.weapon].cost)purchase(u,desired,base);if(u.money>=500&&!u.armor)purchase(u,'armor',base);if(u.money>=300&&!u.smoke&&i===0)purchase(u,'smoke',base);
});}
function startBattle(){if(phase!=='plan')return;planAI();battle=new Battle({map,squads,owner:roomOwners[position],duration:position===0||position===6||scores.every(s=>s===7)?60:40,seed:matchSeed+round,onEvent:log});phase='fight';log('Контакт неизбежен. Отряд выходит на позиции.');render();$('arenaWrap').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}
function endRound(){
  phase='result';const winner=battle.winner;scores[winner]++;roomOwners[position]=winner;lossStreaks[winner]=0;lossStreaks[1-winner]++;
  for(const u of battle.units){const dest=squads[u.team][u.id%3];dest.money=Math.min(10000,dest.money+(u.team===winner?2500:Math.min(5100,2100+(lossStreaks[u.team]-1)*750))+u.kills*200);if(u.hp<=0){dest.weapon='pistol';dest.armor=false;dest.smoke=false;}else if(u.usedSmoke)dest.smoke=false;}
  matchOver=scores[winner]>=8||(winner===0&&position===6)||(winner===1&&position===0);
  $('resultOverlay').hidden=false;$('resultOverlay').classList.toggle('loss',winner!==0);
  $('resultKicker').textContent=matchOver?'МАТЧ ЗАВЕРШЁН':winner===0?'РУБЕЖ ВЗЯТ':'ОТСТУПЛЕНИЕ';
  $('resultTitle').textContent=matchOver?(winner===0?'Твоя победа.':'Рубеж потерян.'):(winner===0?'Сектор наш.':'Перегруппировка.');
  $('resultDescription').textContent=battle.reason+(matchOver?'':winner===0?' Следующий бой — ближе к базе врага.':' Следующий бой — на шаг ближе к твоей базе.');
  $('resultScore').textContent=`${scores[0]} : ${scores[1]}`;render();
}
function nextRound(){if(matchOver){newMatch();return;}position=Math.max(0,Math.min(6,position+(battle.winner===0?1:-1)));round++;prepare();}

function shopRender(){
  const u=squads[0][selected],base=baseline[0][selected];
  $('shopTabs').innerHTML=NAMES.map((name,i)=>`<button class="shop-tab ${i===selected?'active':''}" data-shop-unit="${i}" aria-pressed="${i===selected}">${name}</button>`).join('');$('unitWallet').textContent=money(u.money);
  $('weaponList').innerHTML=Object.entries(WEAPONS).map(([id,w])=>{const price=id===base.weapon?0:w.cost,refund=u.weapon!==base.weapon?WEAPONS[u.weapon].cost:0,disabled=u.money+refund<price;return `<button class="weapon-option ${u.weapon===id?'equipped':''}" data-item="${id}" ${disabled?'disabled':''}><svg><use href="#i-gun"/></svg><span class="weapon-copy"><strong>${w.name}</strong><small>${w.label}</small></span><span class="weapon-price">${u.weapon===id?'В РУКАХ':price?money(price):'БЕСПЛАТНО'}</span></button>`;}).join('');
  $('utilityList').innerHTML=[['armor','Бронежилет',500],['smoke','Дымовая',300]].map(([id,name,cost])=>`<button class="utility-option ${u[id]?'equipped':''}" data-item="${id}" ${!u[id]&&u.money<cost||u[id]&&base[id]?'disabled':''}>${name}<strong>${u[id]?(base[id]?'СОХРАНЕНО':'КУПЛЕНО · ОТМЕНИТЬ'):money(cost)}</strong></button>`).join('');
}
document.addEventListener('click',e=>{
  const unit=e.target.closest('[data-unit]');if(unit){selected=Number(unit.dataset.unit);render();}
  const route=e.target.closest('[data-route]');if(route&&phase==='plan'){squads[0][selected].route=route.dataset.route;syncPlan();}
  const shopUnit=e.target.closest('[data-shop-unit]');if(shopUnit){selected=Number(shopUnit.dataset.shopUnit);shopRender();render();}
  const item=e.target.closest('[data-item]');if(item&&phase==='plan'){if(purchase(squads[0][selected],item.dataset.item,baseline[0][selected])){syncPlan();shopRender();}else if(item.dataset.item!==squads[0][selected].weapon)toast('Недостаточно средств');}
  if(e.target.closest('.close-dialog'))e.target.closest('dialog').close();
});
$('stanceSelect').addEventListener('change',e=>{if(phase!=='plan')return;squads[0][selected].stance=e.target.value;syncPlan();});
$('delayRange').addEventListener('input',e=>{if(phase!=='plan')return;squads[0][selected].delay=Number(e.target.value);syncPlan();});
$('shopButton').addEventListener('click',()=>{if(phase!=='plan')return;shopRender();$('shopDialog').showModal();});
$('orderButton').addEventListener('click',()=>{if(phase==='plan')$('orderDialog').showModal();});
$('helpButton').addEventListener('click',()=>$('helpDialog').showModal());
$('resetButton').addEventListener('click',()=>$('resetDialog').showModal());
$('confirmReset').addEventListener('click',()=>{$('resetDialog').close();newMatch();});
$('startButton').addEventListener('click',()=>phase==='plan'?startBattle():phase==='result'?nextRound():null);
$('viewButton').addEventListener('click',()=>{showRoutes=!showRoutes;$('viewButton').setAttribute('aria-pressed',String(showRoutes));});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();}));
$('arena').addEventListener('click',e=>{if(phase!=='plan')return;const r=e.currentTarget.getBoundingClientRect(),p={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};const unit=battle.units.slice(0,3).find(u=>distance(p,u)<35);if(unit){selected=unit.id;render();}});

// Code-drawn arena: no external image assets, crisp on high-density mobile screens.
function makeTerrain(seedValue){
  const off=document.createElement('canvas');off.width=W;off.height=H;const c=off.getContext('2d'),rng=random(seedValue);
  c.fillStyle='#33433c';c.fillRect(0,0,W,H);
  c.fillStyle='#3e4c43';c.fillRect(48,63,624,514);c.fillStyle='#475248';c.fillRect(274,67,171,506);c.fillRect(55,263,610,114);
  c.strokeStyle='#65705b22';c.lineWidth=1;for(let x=50;x<W-30;x+=32){c.beginPath();c.moveTo(x,60);c.lineTo(x,H-50);c.stroke();}for(let y=64;y<H-40;y+=32){c.beginPath();c.moveTo(45,y);c.lineTo(W-45,y);c.stroke();}
  for(let i=0;i<2400;i++){const x=rng()*W,y=rng()*H;c.fillStyle=rng()>.5?'#b5b99a10':'#071f1a18';c.fillRect(x,y,rng()*3+1,rng()*3+1);}
  c.strokeStyle='#8e956844';c.lineWidth=2;c.setLineDash([12,12]);c.strokeRect(77,132,566,380);c.setLineDash([]);
  c.fillStyle='#263d34';c.fillRect(0,0,37,H);c.fillRect(W-37,0,37,H);c.fillRect(0,0,W,50);c.fillRect(0,H-43,W,43);
  // Drainage grates and perimeter piping.
  for(let side of [0,1]){const x=side?W-23:17;c.fillStyle='#74806a';c.fillRect(x,85,5,470);for(let y=100;y<550;y+=55){c.fillStyle='#394e42';c.fillRect(x-3,y,11,6);}}
  for(let y of [111,521]){c.fillStyle='#1f3028';c.fillRect(298,y,124,9);c.strokeStyle='#6a7560';c.lineWidth=1;for(let x=302;x<420;x+=7){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+9);c.stroke();}}
  for(let i=0;i<85;i++){const x=rng()>.5?rng()*34:W-rng()*34,y=65+rng()*510;c.fillStyle=['#536f46','#63774c','#34593f'][Math.floor(rng()*3)];c.beginPath();c.ellipse(x,y,5+rng()*9,3+rng()*8,rng()*3,0,Math.PI*2);c.fill();}
  c.font='600 10px monospace';c.fillStyle='#a7b39744';c.fillText('ZONE 04',64,90);c.fillText('LOADING BAY',538,561);c.save();c.translate(690,365);c.rotate(-Math.PI/2);c.fillText('RESTRICTED AREA',0,0);c.restore();
  return off;
}
function object(o){
  ctx.fillStyle='#11251c66';ctx.fillRect(o.x+8,o.y+12,o.w+5,o.h+3);
  if(o.type==='container'){
    ctx.fillStyle='#24392f';ctx.fillRect(o.x,o.y+5,o.w,o.h);ctx.fillStyle='#6f7962';ctx.fillRect(o.x,o.y,o.w,o.h-4);ctx.strokeStyle='#92987b';ctx.lineWidth=2;ctx.strokeRect(o.x+2,o.y+2,o.w-4,o.h-8);
    for(let x=o.x+10;x<o.x+o.w-5;x+=11){ctx.fillStyle='#404f4088';ctx.fillRect(x,o.y+5,4,o.h-15);ctx.fillStyle='#a3a78a44';ctx.fillRect(x+4,o.y+5,1,o.h-15);}
    ctx.fillStyle='#cdc49b66';ctx.fillRect(o.x+o.w*.3,o.y+o.h*.35,30,12);ctx.fillStyle='#505d48';ctx.font='7px monospace';ctx.fillText('FRT-07',o.x+o.w*.3+3,o.y+o.h*.35+8);
  }else if(o.type==='building'){
    ctx.fillStyle='#293b30';ctx.fillRect(o.x,o.y+6,o.w,o.h);ctx.fillStyle='#a3a58c';ctx.fillRect(o.x,o.y,o.w,o.h-4);ctx.fillStyle='#c1bea0';ctx.fillRect(o.x,o.y,o.w,4);ctx.fillStyle='#707c67';ctx.fillRect(o.x+6,o.y+7,o.w-12,o.h-18);ctx.strokeStyle='#8d947c';ctx.lineWidth=1;ctx.strokeRect(o.x+9,o.y+10,o.w-18,o.h-24);
    ctx.fillStyle='#465e4c';ctx.fillRect(o.x+o.w-30,o.y+14,17,20);ctx.fillStyle='#a7b197';for(let y=o.y+17;y<o.y+32;y+=4)ctx.fillRect(o.x+o.w-28,y,13,1);
    ctx.fillStyle='#d1c9aa';ctx.fillRect(o.x+12,o.y+13,18,10);
  }else{
    const count=Math.max(1,Math.floor(o.w/34));for(let i=0;i<count;i++){const x=o.x+i*o.w/count,w=o.w/count-3;ctx.fillStyle='#3b4231';ctx.fillRect(x,o.y,w,o.h);ctx.fillStyle='#a29b71';ctx.fillRect(x,o.y,w,o.h-4);ctx.strokeStyle='#656e4d';ctx.lineWidth=3;ctx.strokeRect(x+4,o.y+4,w-8,o.h-12);ctx.beginPath();ctx.moveTo(x+5,o.y+5);ctx.lineTo(x+w-5,o.y+o.h-8);ctx.stroke();}}
}
function drawRoutes(){
  if(!showRoutes||phase!=='plan')return;
  battle.units.slice(0,3).forEach((u,i)=>{let start={x:u.x,y:u.y};ctx.strokeStyle=i===selected?'#daddadcc':'#b8cda64a';ctx.lineWidth=i===selected?2.5:1.5;ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(u.x,u.y);for(const goal of waypoints(u,map)){const path=findPath(start,goal,map);for(const p of path)ctx.lineTo(p.x,p.y);start=goal;}ctx.stroke();ctx.setLineDash([]);if(i===selected){ctx.strokeStyle='#daddad88';ctx.lineWidth=1;ctx.beginPath();ctx.arc(start.x,start.y,11,0,Math.PI*2);ctx.stroke();}});
}
let routeCacheKey='',routeLayer;
function draw(time){
  ctx.clearRect(0,0,W,H);ctx.drawImage(mapTexture,0,0);map.objects.forEach(object);
  // Team deployment strips.
  ctx.fillStyle='#bbc89a0d';ctx.fillRect(59,515,602,55);ctx.fillStyle='#d89e7510';ctx.fillRect(59,69,602,55);
  ctx.strokeStyle='#aaba8555';ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(59,515);ctx.lineTo(661,515);ctx.stroke();ctx.strokeStyle='#d29b7455';ctx.beginPath();ctx.moveTo(59,124);ctx.lineTo(661,124);ctx.stroke();ctx.setLineDash([]);
  ctx.font='8px monospace';ctx.fillStyle='#d1daab88';ctx.fillText('INSERTION / ALPHA',64,564);ctx.fillStyle='#d6a88a88';ctx.fillText('INSERTION / BRAVO',64,81);
  // Static planned routes are cached; A* does not run every animation frame.
  const key=JSON.stringify([phase,showRoutes,selected,position,map.name,squads[0].map(u=>[u.route,u.stance])]);
  if(key!==routeCacheKey){routeCacheKey=key;const off=document.createElement('canvas');off.width=W;off.height=H;const original=ctx.getImageData(0,0,W,H);ctx.clearRect(0,0,W,H);drawRoutes();off.getContext('2d').drawImage($('arena'),0,0);ctx.putImageData(original,0,0);routeLayer=off;}
  if(routeLayer)ctx.drawImage(routeLayer,0,0);
  const t=map.tower,colour=battle.owner===0?'#bdcf92':'#df9871';
  ctx.fillStyle=battle.owner===0?'#b6c78816':'#e1a17716';ctx.beginPath();ctx.arc(t.x,t.y,49,0,Math.PI*2);ctx.fill();ctx.strokeStyle=colour+'66';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(t.x,t.y,49,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  ctx.save();ctx.translate(t.x,t.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#24382c';ctx.fillRect(-20,-20,40,40);ctx.strokeStyle=colour;ctx.lineWidth=2;ctx.strokeRect(-20,-20,40,40);ctx.fillStyle='#71816a';ctx.fillRect(-11,-11,22,22);ctx.restore();
  ctx.fillStyle='#273f2d';ctx.fillRect(t.x-5,t.y-17,10,23);ctx.fillStyle=colour;ctx.fillRect(t.x-2,t.y-20,4,26);ctx.beginPath();ctx.arc(t.x,t.y-20,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle=colour;ctx.lineWidth=1.5;for(let r of [9,15]){ctx.beginPath();ctx.arc(t.x,t.y-20,r,3.5,5.9);ctx.stroke();}
  ctx.font='9px monospace';ctx.fillStyle=colour;ctx.textAlign='center';ctx.fillText('БАШНЯ',t.x,t.y+68);ctx.textAlign='left';
  if(phase==='plan'){battle.units.filter(u=>u.team===1).forEach(u=>{ctx.strokeStyle='#ce917464';ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(u.x,u.y,14,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#d7a280';ctx.font='15px monospace';ctx.textAlign='center';ctx.fillText('?',u.x,u.y+5);ctx.textAlign='left';});}
  battle.units.forEach(u=>{
    if(u.team===1&&(phase==='plan'||!battle.seen(u)))return;
    if(u.hp<=0){ctx.save();ctx.translate(u.x,u.y);ctx.rotate(u.angle);ctx.fillStyle='#172a2288';ctx.fillRect(-9,-5,18,10);ctx.strokeStyle=u.team?'#b77d5b88':'#a6bd7f88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(5,5);ctx.moveTo(5,-5);ctx.lineTo(-5,5);ctx.stroke();ctx.restore();return;}
    const own=u.team===0,c=own?'#c3d89b':'#f1a17b';
    if(own&&u.id===selected){ctx.strokeStyle='#ecddab';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(u.x,u.y,20,0,Math.PI*2);ctx.stroke();}
    ctx.save();ctx.translate(u.x,u.y);ctx.rotate(u.angle);ctx.fillStyle=own?'#d8eabc0a':'#f2b28b0b';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,80,-.38,.38);ctx.closePath();ctx.fill();
    ctx.fillStyle='#15271c66';ctx.beginPath();ctx.ellipse(3,5,13,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=own?'#889675':'#a1795c';ctx.beginPath();ctx.ellipse(-2,0,8,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#25392b';ctx.fillRect(1,5,22,4);ctx.fillStyle=own?'#b9c89a':'#d4a17b';ctx.fillRect(3,6,8,4);ctx.fillRect(3,-9,8,4);
    ctx.fillStyle=c;ctx.beginPath();ctx.arc(1,-1,7,0,Math.PI*2);ctx.fill();ctx.fillStyle=own?'#657856':'#8e654b';ctx.beginPath();ctx.arc(0,-2,6,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.fillStyle='#1c3025';ctx.fillRect(u.x-13,u.y-25,26,4);ctx.fillStyle=c;ctx.fillRect(u.x-13,u.y-25,26*u.hp/100,4);
    ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=c;ctx.fillText(own?`0${u.id+1}`:'×',u.x,u.y+29);ctx.textAlign='left';
  });
  battle.shots.forEach(s=>{if(!battle.units.some(u=>u.team===0&&u.hp>0&&distance(u,{x:s.x,y:s.y})<380&&battle.visible(u,{x:s.x,y:s.y})))return;ctx.strokeStyle=s.team?'#ffc79abf':'#e5efb7df';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.tx,s.ty);ctx.stroke();ctx.fillStyle='#fff1c7';ctx.beginPath();ctx.arc(s.tx,s.ty,2.5,0,Math.PI*2);ctx.fill();});
  battle.smokes.forEach(s=>{const alpha=Math.min(1,s.life/1.5);const g=ctx.createRadialGradient(s.x,s.y,5,s.x,s.y,s.radius);g.addColorStop(0,`rgba(169,180,157,${.87*alpha})`);g.addColorStop(.65,`rgba(148,165,143,${.74*alpha})`);g.addColorStop(1,'rgba(141,160,135,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.radius,0,Math.PI*2);ctx.fill();});
  const vignette=ctx.createRadialGradient(W/2,H/2,160,W/2,H/2,470);vignette.addColorStop(0,'#0b241200');vignette.addColorStop(1,'#0b24124a');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
let uiTick=0;
function frame(timestamp){const dt=lastFrame?Math.min((timestamp-lastFrame)/1000,.05):0;lastFrame=timestamp;if(phase==='fight'&&!document.hidden){battle.step(dt);uiTick+=dt;if(uiTick>.12){updateLive();uiTick=0;}if(battle.finished)endRound();}if(!document.hidden)draw(timestamp);requestAnimationFrame(frame);}
newMatch();requestAnimationFrame(frame);
