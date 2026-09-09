const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const timeline = read('assets/scripts/game/Mission01Timeline.ts');
const background = read('assets/scripts/background/StarField.ts');
const boss = read('assets/scripts/enemy/Boss.ts');
const gameManager = read('assets/scripts/game/GameManager.ts');
const wingmen = read('assets/scripts/Mission01Wingmen.ts');

const eventTimes = [...timeline.matchAll(/\{\s*time:\s*(\d+(?:\.\d+)?),\s*kind:/g)]
    .map((match) => Number(match[1]));
assert.ok(eventTimes.length >= 20, 'Mission 01 timeline unexpectedly short');
for (let i = 1; i < eventTimes.length; i += 1) {
    assert.ok(eventTimes[i] >= eventTimes[i - 1],
        `Mission 01 timeline is not sorted at ${eventTimes[i - 1]} -> ${eventTimes[i]}`);
}

const requiredStoryCues = [
    'MISSION_OPEN',
    'FORMATION_RUNWAY',
    'TAKEOFF',
    'PLAYER_CONTROL',
    'FALCON_TARGETED',
    'FALCON_DAMAGED',
    'FALCON_DESTROYED',
    'BOSS_PREPARE',
    'VIPER_DAMAGED',
    'GOLIATH_ENTER',
];
for (const cue of requiredStoryCues) {
    const uses = [...timeline.matchAll(new RegExp(`cue:\\s*'${cue}'`, 'g'))];
    assert.equal(uses.length, 1, `Expected exactly one timeline event for ${cue}, got ${uses.length}`);
}

assert.match(timeline, /export const MISSION01_BOSS_TIME = 146;/,
    'Boss handoff time must stay explicit and reviewable');
assert.match(background, /PROCEDURAL_PANEL_COUNT = 6;/,
    'Mission 01 background must expose six continuous stage panels');
for (const fn of ['drawLaunchApron', 'drawMainRunway', 'drawCoastalExit', 'drawHarborDefense', 'drawLogisticsZone', 'drawGoliathZone']) {
    assert.ok(background.includes(fn), `Missing background stage: ${fn}`);
}
assert.ok(background.includes("new Node('__GoliathGround')"), 'Missing grounded GOLIATH host');
assert.ok(background.includes('handoffGoliathVisualTo'), 'Missing GOLIATH visual handoff API');
assert.ok(boss.includes('handoffGoliathVisualTo(this.node)'), 'Boss no longer adopts grounded GOLIATH visual');
assert.ok(wingmen.includes("storyTime('VIPER_DAMAGED', 143)"), 'VIPER withdrawal cue is not wired');

// Boss 死亡必须保留同一视觉节点完成程序演出，不能在 takeDamage() 中直接销毁。
const takeDamageBody = boss.match(/public takeDamage\([\s\S]*?\n    \}/)?.[0] ?? '';
assert.ok(takeDamageBody, 'Boss.takeDamage() not found');
assert.ok(!takeDamageBody.includes('this.node.destroy()'),
    'Boss.takeDamage() must not destroy GOLIATH before the death presentation completes');
assert.ok(gameManager.includes("'BOSS_DYING'"), 'Missing explicit BOSS_DYING game state');
assert.ok(gameManager.includes('beginBossDeathSequence()'), 'Missing GOLIATH death sequence entry point');
assert.ok(gameManager.includes('BOSS_DEATH_EXPLOSIONS'), 'Missing timed GOLIATH explosion mounts');
assert.ok(gameManager.includes('this.finishLevel();'), 'GOLIATH death sequence no longer reaches level clear');

console.log(`PASS: Mission 01 has ${eventTimes.length} ordered events, six background stages, wingman loss/withdrawal cues, grounded GOLIATH handoff, and staged boss death.`);
