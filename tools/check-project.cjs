// Run with Node.js; no npm installation needed. Checks serialized asset and component references.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const json = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const all = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? all(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const files = all(path.join(root, 'assets'));
const ids = new Set(), scripts = new Set();
function compress(uuid) {
    const h=uuid.replaceAll('-',''),chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out=h.slice(0,5);
    for(let i=5;i<h.length;i+=3){const n=parseInt(h.slice(i,i+3),16);out+=chars[n>>6]+chars[n&63];}return out;
}
function metas(v) {if(v.uuid){assert.ok(!ids.has(v.uuid),'Duplicate UUID '+v.uuid);ids.add(v.uuid);}for(const m of Object.values(v.subMetas??{}))metas(m);}
for(const f of files.filter(f=>f.endsWith('.meta'))) {const v=json(f);metas(v);if(v.importer==='typescript')scripts.add(compress(v.uuid));}
function walk(v, visit) {if(!v||typeof v!=='object')return;visit(v);for(const child of Object.values(v))walk(child,visit);}
for(const file of files.filter(f=>/\.(scene|prefab)$/.test(f))) {
    const a=json(file);
    walk(a,v=>{
        if('__id__'in v)assert.ok(Number.isInteger(v.__id__)&&a[v.__id__],file+': invalid object reference '+v.__id__);
        if('__uuid__'in v)assert.ok(ids.has(v.__uuid__),file+': missing asset '+v.__uuid__);
        if(v.__type__&&!v.__type__.startsWith('cc.'))assert.ok(scripts.has(v.__type__),file+': missing script '+v.__type__);
    });
    for(let i=0;i<a.length;i++)if(a[i].__type__==='cc.Node'){
        const n=a[i];
        for(const c of n._children)assert.equal(a[c.__id__]._parent?.__id__,i,n._name+': child parent mismatch');
        for(const c of n._components)assert.equal(a[c.__id__].node?.__id__,i,n._name+': component owner mismatch');
    }
}
const scene=json(path.join(root,'assets/Game.scene'));
const at = name => scene.find(n=>n.__type__==='cc.Node'&&n._name===name);
for(const name of ['Canvas','Camera','Background','Gameplay','Player','BulletLayer','EnemyLayer','EnemyBulletLayer','BossLayer','ItemLayer','GameManager','UI','Score','Weapon','Warning','GameOver','LevelClear'])assert.ok(at(name),'Missing scene node '+name);
assert.equal(scene.filter(n=>n.__type__==='cc.Graphics').length,0,'Static visuals should be Sprites / Labels');
const gm=scene.find(n=>n.__type__===compress(json(path.join(root,'assets/scripts/game/GameManager.ts.meta')).uuid));
for(const name of ['playerNode','gameplayRoot','uiRoot','bossLayer','bulletLayer','enemyLayer','enemyBulletLayer','itemLayer'])assert.ok(gm[name]&&scene[gm[name].__id__], 'Missing GameManager binding '+name);
assert.ok(gm.artFrames.length>=18);
console.log(`PASS: ${scene.filter(n=>n.__type__==='cc.Node').length} scene nodes; all scene/prefab UUIDs, parent links, scripts and manager bindings resolve.`);
