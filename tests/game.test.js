import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, buildMap, makeSquad, findPath, clearLine, blocked, purchase, WEAPONS } from '../game.js';

function setup(extra={}){return new Battle({map:buildMap(0),squads:[makeSquad(0),makeSquad(1)],owner:1,seed:42,...extra});}
test('all arena layouts have traversable, wall-safe paths from both deployment zones to the tower',()=>{
  for(let m=0;m<4;m++){const map=buildMap(m);for(const y of [92,548])for(const x of [154,360,566]){const start={x,y},path=findPath(start,map.tower,map);assert.ok(path.length>0);assert.ok(Math.hypot(path.at(-1).x-360,path.at(-1).y-320)<16);let prev=start;for(const p of path){assert.ok(!blocked(p.x,p.y,map));assert.ok(clearLine(prev,p,map,8),`wall intersection: map ${m}`);prev=p;}}}
});
test('time expiry awards the round to the tower owner',()=>{const b=setup({duration:.02});b.units.forEach(u=>u.delay=50);b.step(.03);assert.equal(b.winner,1);});
test('eliminating tower defenders grants a capture window, not an automatic win',()=>{const b=setup();b.units.filter(u=>u.team===1).forEach(u=>u.hp=0);b.step(.03);assert.equal(b.finished,false);assert.equal(b.remaining,7);for(let i=0;i<150&&!b.finished;i++){b.units.filter(u=>u.team===0).forEach(u=>u.delay=50);b.step(.05);}assert.equal(b.winner,1);});
test('a surviving attacker can capture after all defenders die',()=>{const b=setup();b.units.filter(u=>u.team===1).forEach(u=>u.hp=0);Object.assign(b.units[0],{x:360,y:320});for(let i=0;i<15;i++)b.step(.04);assert.equal(b.owner,0);assert.equal(b.winner,0);});
test('wipe of both teams preserves tower ownership',()=>{const b=setup();b.units.forEach(u=>u.hp=0);b.step(.03);assert.equal(b.winner,1);});
test('purchases cannot overspend; swapping a new purchase returns its cost',()=>{const u=makeSquad()[0],base=structuredClone(u);assert.equal(purchase(u,'rifle',base),false);assert.equal(u.money,800);assert.equal(purchase(u,'heavy',base),true);assert.equal(u.money,150);assert.equal(purchase(u,'armor',base),false);assert.equal(purchase(u,'pistol',base),true);assert.equal(u.money,800);assert.equal(purchase(u,'armor',base),true);assert.equal(purchase(u,'smoke',base),true);assert.equal(u.money,0);assert.equal(purchase(u,'smoke',base),true);assert.equal(u.money,300);});
test('surviving weapons cannot be sold to mint money',()=>{const u={...makeSquad()[0],weapon:'rifle'},base=structuredClone(u);purchase(u,'pistol',base);assert.equal(u.money,800);purchase(u,'rifle',base);assert.equal(u.money,800);});
test('smoke blocks sight lines',()=>{const b=setup(),a={x:300,y:320},c={x:420,y:320};assert.equal(b.visible(a,c),true);b.smokes.push({x:360,y:320,radius:40,life:5});assert.equal(b.visible(a,c),false);});
test('complete simulations terminate, are deterministic and keep units outside cover',()=>{
  for(let m=0;m<4;m++){const run=()=>{const b=setup({map:buildMap(m)});for(let i=0;i<1500&&!b.finished;i++){b.step(.04);for(const u of b.units)assert.ok(!blocked(u.x,u.y,b.map,7),`unit entered cover on map ${m}: ${u.x},${u.y}`);}assert.ok(b.finished);return [b.winner,b.time,b.units.map(u=>u.hp)];};assert.deepEqual(run(),run());}
});
