const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const timeline = read('assets/scripts/game/Mission01Timeline.ts');
const director = read('assets/scripts/game/Mission01Director.ts');
const sequences = read('assets/scripts/game/Mission01Sequences.ts');
const actorState = read('assets/scripts/game/Mission01ActorState.ts');
const driver = read('assets/scripts/Mission01DirectorDriver.ts');

assert.ok(director.includes('private elapsed = 0'), 'Director must own the mission clock');
assert.ok(director.includes('private nextEventIndex = 0'), 'Director must own the event cursor');
assert.ok(director.includes('get snapshot()'), 'Director must expose persistent state');
assert.ok(director.includes('seek('), 'Director must expose seek for presentation tooling');
assert.ok(director.includes('setPlaybackRate('), 'Director must support accelerated presentation review');
assert.ok(driver.includes('MISSION01_DIRECTOR.advance(deltaTime)'), 'Cocos driver must advance the Director');

for (const cue of ['FORMATION_RUNWAY', 'TAKEOFF', 'FALCON_TARGETED', 'FALCON_DAMAGED', 'FALCON_DESTROYED', 'BOSS_PREPARE', 'VIPER_DAMAGED', 'GOLIATH_ENTER']) {
    assert.ok(sequences.includes(`mission01CueTime('${cue}')`), `Sequence timing is not derived from ${cue}`);
}
assert.ok(!/\b(?:98|108|117|133|143|146)\b/.test(sequences), 'Sequence file contains copied narrative timestamps');

for (const state of ['READY', 'ROLLING', 'LIFTING', 'AIRBORNE', 'INTERCEPT', 'DAMAGED', 'DESTROYED', 'WITHDRAWING', 'WITHDRAWN', 'GROUNDED', 'PREPARING', 'AIRBORNE']) {
    assert.ok(actorState.includes(`'${state}'`), `Missing actor state ${state}`);
}
assert.ok(actorState.includes('MISSION01_DIRECTOR'), 'Actor state must derive from the Director');
assert.ok(actorState.includes('MISSION01_SEQUENCES'), 'Actor state must derive continuous states from sequence windows');

assert.ok(timeline.includes("cue: 'GOLIATH_ENTER'"), 'Existing timeline no longer exposes GOLIATH_ENTER');
console.log('PASS: Mission 01 Director core owns time/event state and derives sequences/actor states without copied narrative timestamps.');
