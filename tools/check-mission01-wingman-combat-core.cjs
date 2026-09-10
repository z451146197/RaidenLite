const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const scheduler = read('assets/scripts/game/Mission01WingmanCombat.ts');
const port = read('assets/scripts/game/Mission01WingmanCombatPort.ts');

assert.ok(scheduler.includes("falconState"), 'Wingman combat must consume FALCON Actor State');
assert.ok(scheduler.includes("viperState"), 'Wingman combat must consume VIPER Actor State');
assert.ok(scheduler.includes("phase: 'ACTIVE'"), 'Wingman combat is missing ACTIVE fire profiles');
assert.ok(scheduler.includes("phase: 'INTERCEPT'"), 'FALCON intercept fire profile is missing');
assert.ok(scheduler.includes('currentKey('), 'Scheduler must support silent slot synchronization');
assert.ok(scheduler.includes('if (now < this.lastTime)'), 'Scheduler must handle backward seek/restart');
assert.ok(scheduler.includes('if (viper) orders.push(viper)'), 'VIPER fire order is not emitted');
assert.ok(scheduler.includes('if (falcon) orders.push(falcon)'), 'FALCON fire order is not emitted');
assert.ok(!scheduler.includes('deltaTime'), 'Wingman combat must not maintain a second deltaTime fire clock');
assert.ok(!scheduler.includes('elapsed +='), 'Wingman combat must not accumulate a narrative clock');
assert.ok(!scheduler.includes("phase: 'DAMAGED'"), 'DAMAGED FALCON must not have a fire profile');
assert.ok(!scheduler.includes("phase: 'WITHDRAWING'"), 'WITHDRAWING VIPER must not have a fire profile');

const damages = [...scheduler.matchAll(/damage:\s*(0\.\d+)/g)].map((m) => Number(m[1]));
assert.equal(damages.length, 3, `Expected three support-fire damage profiles, got ${damages.length}`);
for (const damage of damages) {
    assert.ok(damage > 0 && damage < 0.5, `Wingman damage ${damage} should assist, not replace player DPS`);
}

assert.ok(port.includes('getWingmanPose('), 'Combat Port must read wingman presentation pose');
assert.ok(port.includes('fireWingman('), 'Combat Port must delegate real projectile creation to Gameplay');
for (const forbidden of ['../enemy/Enemy', '../bullet/Bullet', './GameManager']) {
    assert.ok(!scheduler.includes(forbidden) && !port.includes(forbidden),
        `Wingman Combat Core must not bypass Gameplay ownership via ${forbidden}`);
}

console.log('PASS: Wingman Combat uses Director actor states, deterministic fire slots, support DPS, and a thin Gameplay-owned projectile port.');
