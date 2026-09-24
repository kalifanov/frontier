// Small deterministic simulation shared by the browser and the smoke tests.
export const W = 720, H = 640;
export const WEAPONS = {
  pistol: { name: 'USP-S', label: 'Пистолет', cost: 0, damage: 24, range: 245, interval: .72, accuracy: .71, magazine: 12, reload: 1.8 },
  heavy: { name: 'DEAGLE', label: 'Мощный пистолет', cost: 650, damage: 53, range: 270, interval: 1.04, accuracy: .64, magazine: 7, reload: 2.2 },
  smg: { name: 'MP9', label: 'Ближняя дистанция', cost: 1250, damage: 17, range: 205, interval: .21, accuracy: .65, magazine: 25, reload: 2 },
  rifle: { name: 'M4A1', label: 'Универсальная винтовка', cost: 2900, damage: 30, range: 325, interval: .31, accuracy: .78, magazine: 20, reload: 2.5 },
  sniper: { name: 'AWP', label: 'Дальний контроль', cost: 4750, damage: 102, range: 450, interval: 1.8, accuracy: .84, magazine: 5, reload: 3 },
};
export const NAMES = ['ВЕКТОР', 'БАСТИОН', 'ТЕНЬ'];
export const ROUTES = { left: 'Слева', center: 'Центр', right: 'Справа' };
export function random(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function makeSquad(team = 0) {
  return Array.from({ length: 3 }, (_, i) => ({ id: team * 3 + i, team, name: team ? ['ФАНТОМ', 'КРЕЧЕТ', 'СПЕКТР'][i] : NAMES[i], money: 800, weapon: 'pistol', armor: false, smoke: false, route: ['center', 'left', 'right'][i], stance: ['capture', 'cover', 'flank'][i], delay: i === 2 ? 1 : 0 }));
}
export const MAPS = [
  { name: 'Сухой док', type: 'ПРОМЗОНА', objects: [[108,166,136,84,'container'],[476,390,136,84,'container'],[466,164,148,66,'building'],[106,414,148,66,'building'],[304,161,108,56,'building'],[308,423,108,56,'building'],[176,304,74,38,'crate'],[470,298,74,38,'crate']] },
  { name: 'Перегон', type: 'ЖЕЛЕЗНАЯ ДОРОГА', objects: [[134,166,95,155,'container'],[491,319,95,155,'container'],[300,152,145,52,'building'],[275,436,145,52,'building'],[438,246,78,43,'crate'],[204,351,78,43,'crate'],[82,417,95,44,'crate'],[543,179,95,44,'crate']] },
  { name: 'Склад 07', type: 'ЛОГИСТИЧЕСКИЙ УЗЕЛ', objects: [[105,158,165,83,'building'],[450,399,165,83,'building'],[453,158,150,65,'container'],[117,417,150,65,'container'],[301,220,58,51,'crate'],[361,369,58,51,'crate'],[159,302,94,41,'crate'],[467,297,94,41,'crate']] },
  { name: 'Водосброс', type: 'ГИДРОСТАНЦИЯ', objects: [[112,168,131,70,'building'],[477,402,131,70,'building'],[460,170,142,62,'container'],[118,408,142,62,'container'],[290,188,123,42,'crate'],[307,410,123,42,'crate'],[184,283,61,79,'building'],[475,278,61,79,'building']] },
];
export function buildMap(index, position = 3, decider = false) {
  const source = MAPS[index % MAPS.length];
  return { name: decider ? 'Последний рубеж' : position === 0 ? 'Форт «Север»' : position === 6 ? 'Форт «Юг»' : source.name, type: decider ? 'РЕШАЮЩАЯ АРЕНА' : position === 0 || position === 6 ? 'УКРЕПЛЁННАЯ БАЗА' : source.type, objects: source.objects.map(([x,y,w,h,type]) => ({x,y,w,h,type})), tower: {x:360,y:320} };
}
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export function blocked(x,y,map,pad=12) { return x<32||x>W-32||y<66||y>H-56||map.objects.some(o=>x>o.x-pad&&x<o.x+o.w+pad&&y>o.y-pad&&y<o.y+o.h+pad); }
export function clearLine(a,b,map,pad=0) {
  const length = distance(a,b), steps = Math.ceil(length/5);
  for(let i=0;i<=steps;i++){const t=steps?i/steps:0,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(map.objects.some(o=>x>o.x-pad&&x<o.x+o.w+pad&&y>o.y-pad&&y<o.y+o.h+pad))return false;}
  return true;
}
// Grid A* keeps routes outside walls. Diagonal corners are never cut.
export function findPath(start,goal,map) {
  const size=20,cols=W/size,rows=H/size;
  const key=(x,y)=>y*cols+x,point=(x,y)=>({x:x*size+size/2,y:y*size+size/2});
  const walk=(x,y)=>x>=0&&x<cols&&y>=0&&y<rows&&!blocked(x*size+10,y*size+10,map);
  function nearest(p){let best=null,dist=Infinity;for(let y=3;y<rows-2;y++)for(let x=1;x<cols-1;x++){if(!walk(x,y))continue;const d=distance(p,point(x,y));if(d<dist){best={x,y};dist=d;}}return best;}
  if(clearLine(start,goal,map,13)&&!blocked(goal.x,goal.y,map))return [{...goal}];
  const s=nearest(start),g=nearest(goal);if(!s||!g)return [];
  const open=[{...s,g:0,f:0}],came=new Map(),cost=new Map([[key(s.x,s.y),0]]),closed=new Set();
  while(open.length){open.sort((a,b)=>a.f-b.f);const current=open.shift(),ck=key(current.x,current.y);if(closed.has(ck))continue;closed.add(ck);
    if(current.x===g.x&&current.y===g.y){const path=[point(g.x,g.y)];let k=ck;while(came.has(k)){k=came.get(k);path.push(point(k%cols,Math.floor(k/cols)));}path.reverse();if(!blocked(goal.x,goal.y,map)&&clearLine(path.at(-1),goal,map,13))path.push({...goal});return path;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const x=current.x+dx,y=current.y+dy,nk=key(x,y);if(!walk(x,y)||closed.has(nk)||(dx&&dy&&(!walk(current.x+dx,current.y)||!walk(current.x,current.y+dy))))continue;const ng=current.g+(dx&&dy?1.414:1);if(ng>=(cost.get(nk)??Infinity))continue;cost.set(nk,ng);came.set(nk,ck);open.push({x,y,g:ng,f:ng+Math.hypot(x-g.x,y-g.y)});}
  }return [];
}
export function waypoints(u,map) {
  const sign=u.team===0?1:-1,t=map.tower;
  const lane=u.route==='left'?64:u.route==='right'?656:360;
  const initial={x:lane,y:t.y+sign*85};
  if(u.stance==='cover')return [initial,{x:t.x+(u.id%3-1)*65,y:t.y+sign*85}];
  if(u.stance==='flank')return [initial,{x:lane,y:t.y-sign*65},{x:t.x+sign*55,y:t.y-sign*35},t];
  return [initial,t];
}
export class Battle {
  constructor({map,squads,owner=1,duration=40,seed=1,onEvent=()=>{}}){
    this.map=map;this.owner=owner;this.remaining=duration;this.time=0;this.rng=random(seed);this.onEvent=onEvent;this.shots=[];this.smokes=[];this.events=[];this.finished=false;this.winner=null;this.captureProgress=0;this.wipeCountdown=false;
    this.units=squads.flat().map((u,i)=>({...u,x:[154,360,566][i%3],y:u.team===0?548:92,hp:100,angle:u.team===0?-Math.PI/2:Math.PI/2,cooldown:.1+this.rng()*.6,ammo:WEAPONS[u.weapon].magazine,reload:0,usedSmoke:false,kills:0,waypoint:0,path:[],pathTarget:null,status:'На позиции'}));
  }
  event(text){this.events.push(text);this.onEvent(text);}
  visible(a,b){if(!clearLine(a,b,this.map))return false;for(const s of this.smokes){if(s.life<=0)continue;const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((s.x-a.x)*dx+(s.y-a.y)*dy)/l)):0;if(Math.hypot(a.x+t*dx-s.x,a.y+t*dy-s.y)<s.radius)return false;}return true;}
  seen(u){return u.team===0||this.units.some(a=>a.team===0&&a.hp>0&&distance(a,u)<380&&this.visible(a,u));}
  move(u,goal,dt){
    if(distance(u,goal)<9)return true;
    if(!u.pathTarget||distance(u.pathTarget,goal)>12||!u.path.length){u.path=findPath(u,goal,this.map);u.pathTarget={...goal};}
    if(!u.path.length)return false;
    const next=u.path[0],d=distance(u,next),speed=(u.weapon==='sniper'?58:72)*dt;
    if(d<=speed){u.x=next.x;u.y=next.y;u.path.shift();}else{u.angle=Math.atan2(next.y-u.y,next.x-u.x);u.x+=Math.cos(u.angle)*speed;u.y+=Math.sin(u.angle)*speed;}return false;
  }
  step(dt){
    if(this.finished)return;dt=Math.min(dt,.06);this.time+=dt;this.remaining=Math.max(0,this.remaining-dt);
    this.shots=this.shots.filter(s=>(s.life-=dt)>0);this.smokes=this.smokes.filter(s=>(s.life-=dt)>0);
    const damage=[];
    for(const u of this.units){
      if(u.hp<=0)continue;
      if(this.time<u.delay){u.status='Ожидает выхода';continue;}
      const w=WEAPONS[u.weapon];u.cooldown-=dt;
      const targets=this.units.filter(v=>v.team!==u.team&&v.hp>0&&distance(u,v)<w.range&&this.visible(u,v)).sort((a,b)=>distance(u,a)-distance(u,b));
      const target=targets[0];
      if(u.smoke&&!u.usedSmoke&&this.time>2&&distance(u,this.map.tower)<210&&this.owner!==u.team){const dir=u.team===0?1:-1;this.smokes.push({x:this.map.tower.x+dir*45,y:this.map.tower.y-dir*65,radius:57,life:7});u.usedSmoke=true;this.event(`${u.name}: дым прикрывает выход`);}
      if(u.reload>0){u.reload-=dt;u.status='Перезарядка';if(u.reload<=0)u.ammo=w.magazine;}
      if(target){u.angle=Math.atan2(target.y-u.y,target.x-u.x);u.status='Ведёт огонь';if(u.cooldown<=0&&u.reload<=0){u.ammo--;u.cooldown=w.interval;const accuracy=w.accuracy*(1-distance(u,target)/w.range*.25);const hit=this.rng()<accuracy;this.shots.push({x:u.x,y:u.y,tx:target.x+(hit?0:(this.rng()-.5)*35),ty:target.y+(hit?0:(this.rng()-.5)*35),life:.12,team:u.team});if(hit)damage.push({target,source:u,amount:w.damage*(target.armor?.76:1)});if(u.ammo<=0){u.reload=w.reload;this.event(`${u.name}: перезарядка`);}}}
      const urgent=this.owner!==u.team&&(this.remaining<10||distance(u,this.map.tower)<90);
      if(target&&!urgent)continue;
      const points=waypoints(u,this.map);let goal=points[Math.min(u.waypoint,points.length-1)];
      if(urgent){goal=this.map.tower;u.status='Захватывает башню';}
      else if(u.waypoint>=points.length-1&&u.stance==='cover'){
        const capturers=this.units.some(a=>a.team===u.team&&a.hp>0&&a.stance!=='cover');
        if(this.owner!==u.team&&!capturers){goal=this.map.tower;u.status='Идёт на захват';}else u.status='Прикрывает сектор';
      }else u.status='Выполняет маршрут';
      if(this.move(u,goal,dt)&&u.waypoint<points.length-1)u.waypoint++;
    }
    // Resolve shots together so the side iterated first has no damage advantage.
    for(const {target,source,amount} of damage){if(target.hp<=0)continue;target.hp=Math.max(0,target.hp-amount);if(target.hp===0){source.kills++;target.status='Выбыл';this.event(`${source.name} → ${target.name}`);}}
    const near=this.units.filter(u=>u.hp>0&&distance(u,this.map.tower)<26);
    const attackers=near.filter(u=>u.team!==this.owner),defenders=near.filter(u=>u.team===this.owner);
    if(attackers.length&&!defenders.length){this.captureProgress+=dt;if(this.captureProgress>=.35){this.owner=attackers[0].team;this.captureProgress=0;this.event(this.owner===0?'Башня захвачена твоим отрядом':'Противник перехватил башню');}}else this.captureProgress=0;
    const alive=[0,1].map(team=>this.units.filter(u=>u.team===team&&u.hp>0).length);
    if(!alive[1-this.owner])this.end(this.owner,alive[this.owner]?(this.owner===0?'Противник уничтожен. Башня твоя.':'Твой отряд уничтожен. Башня осталась у врага.'):'Оба отряда потеряны. Решил контроль башни.');
    else if(!alive[this.owner]&&!this.wipeCountdown){this.remaining=Math.min(this.remaining,7);this.wipeCountdown=true;this.event('Защитники уничтожены. Успей захватить башню!');}
    if(!this.finished&&this.remaining<=0)this.end(this.owner,'Время вышло. Победил владелец башни.');
  }
  end(winner,reason){this.finished=true;this.winner=winner;this.reason=reason;}
}

export function purchase(unit,item,baseline){
  // Swap only this preparation's purchases; surviving gear cannot be sold for cash.
  if(item in WEAPONS){if(unit.weapon===item)return false;const refund=unit.weapon!==baseline.weapon?WEAPONS[unit.weapon].cost:0;const price=item===baseline.weapon?0:WEAPONS[item].cost;if(unit.money+refund<price)return false;unit.money+=refund-price;unit.weapon=item;return true;}
  const cost=item==='armor'?500:item==='smoke'?300:null;if(cost===null)return false;
  if(unit[item]){if(baseline[item])return false;unit[item]=false;unit.money+=cost;return true;}
  if(unit.money<cost)return false;unit[item]=true;unit.money-=cost;return true;
}
