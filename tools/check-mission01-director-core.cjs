const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const timeline = read('assets/scripts/game/Mission01Timeline.ts');
const director = read('assets/scripts/game/Mission01Director.ts');
const sequences = read('assets/scripts/game/Mission01Sequences.ts');
const actorState = read('assets/scripts/game/Mission01ActorState.ts');
const gameplayPort = read('assets/scripts/game/Mission01GameplayPort.ts');
const runtimeHost = read('assets/scripts/game/Mission01RuntimeHost.ts');
const driver = read('assets/scripts/Mission01DirectorDriver.ts');

assert.ok(director.includes('private elapsed = 0'), 'Director must own the mission clock');
assert.ok(director.includes('private nextEventIndex = 0'), 'Director must own the event cursor');
assert.ok(director.includes('public snapshot()'), 'Director must expose persistent state snapshots');
assert.ok(director.includes('public seek('), 'Director must expose seek for presentation tooling');
assert.ok(director.includes('public setPlaybackRate('), 'Director must support accelerated presentation review');
assert.ok(director.includes('private applyPersistentState('), 'Director must rebuild persistent state');
assert.ok(driver.includes('MISSION01_DIRECTOR.advance(deltaTime)'), 'Cocos driver must advance the Director');
assert.ok(runtimeHost.includes("const RUNTIME_NODE_NAME = '__Mission01Runtime'"), 'Director driver must have a scene runtime host');
assert.ok(runtimeHost.includes('scene.addChild(host)'), 'Runtime host must belong to the scene, not the player');

for (const cue of ['FORMATION_RUNWAY', 'TAKEOFF', 'FALCON_TARGETED', 'FALCON_DAMAGED', 'FALCON_DESTROYED', 'BOSS_PREPARE', 'VIPER_DAMAGED', 'GOLIATH_ENTER']) {
    assert.ok(sequences.includes(`mission01CueTime('${cue}')`), `Sequence timing is not derived from ${cue}`);
}
assert.ok(!/\b(?:start|end):\s*\d/.test(sequences), 'Sequence windows must not copy numeric narrative timestamps');

for (const fn of ['auroraFlightState', 'falconState', 'viperState', 'goliathState']) {
    assert.ok(actorState.includes(`function ${fn}(`), `Missing actor state reducer: ${fn}`);
}
for (const state of ['READY', 'ROLLING', 'AIRBORNE', 'ACTIVE', 'INTERCEPT', 'DAMAGED', 'DESTROYED', 'WITHDRAWING', 'WITHDRAWN', 'GROUNDED', 'ENGAGED']) {
    assert.ok(actorState.includes(`'${state}'`), `Missing actor state ${state}`);
}
assert.ok(actorState.includes("director.progress('FALCON_INTERCEPT')"), 'Falcon state must use the canonical intercept sequence');
assert.ok(actorState.includes("director.progress('VIPER_WITHDRAW')"), 'Viper state must use the canonical withdrawal sequence');
assert.ok(actorState.includes("director.progress('GOLIATH_PREPARE')"), 'Goliath state must use the canonical prepare sequence');

assert.ok(gameplayPort.includes('export interface Mission01GameplayHooks'), 'Missing gameplay integration boundary');
assert.ok(gameplayPort.includes('const snapshot = this.director.snapshot()'), 'Gameplay port must restore persistent state before listening');
assert.ok(gameplayPort.includes('this.director.onEvent'), 'Gameplay port must consume Director events');
assert.ok(gameplayPort.includes('public dispose()'), 'Gameplay port must expose listener cleanup');

assert.ok(timeline.includes("cue: 'GOLIATH_ENTER'"), 'Existing timeline no longer exposes GOLIATH_ENTER');
assert.ok(!timeline.includes('MISSION01_SEQUENCES'), 'Core must not push derived sequence data back into the high-conflict Timeline file');

console.log('PASS: Mission 01 Director core owns time/event state, derives actor/sequence state, and exposes low-conflict runtime/gameplay ports.');
