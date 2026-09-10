const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const timeline = read('assets/scripts/game/Mission01Timeline.ts');
const sequences = read('assets/scripts/game/Mission01Sequences.ts');
const director = read('assets/scripts/game/Mission01Director.ts');
const driver = read('assets/scripts/Mission01DirectorDriver.ts');
const gameManager = read('assets/scripts/game/GameManager.ts');
const playerFlight = read('assets/scripts/PlayerFlightPresentation.ts');
const wingmen = read('assets/scripts/Mission01Wingmen.ts');
const background = read('assets/scripts/background/StarField.ts');
const goliath = read('assets/scripts/Mission01GoliathSequence.ts');
const boss = read('assets/scripts/enemy/Boss.ts');

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

// Timeline 只拥有离散秒点；连续窗口必须在低冲突派生文件里定义。
assert.ok(!timeline.includes('MISSION01_SEQUENCES'), 'Sequence helpers must not live in high-conflict Mission01Timeline.ts');
assert.ok(sequences.includes('MISSION01_SEQUENCES'), 'Missing canonical Mission 01 sequence windows');
assert.ok(sequences.includes("mission01CueTime('GOLIATH_ENTER')"), 'GOLIATH sequence must derive from story cues');

// Director 是唯一剧情时钟和离散事件游标。
assert.ok(director.includes('private elapsed = 0'), 'Mission01Director must own the mission clock');
assert.ok(director.includes('private nextEventIndex = 0'), 'Mission01Director must own the event cursor');
assert.ok(director.includes('flushEvents()'), 'Mission01Director must dispatch timeline events');
assert.ok(driver.includes('MISSION01_DIRECTOR.advance(deltaTime)'), 'Mission clock has no Cocos driver');
assert.ok(gameManager.includes('MISSION01_DIRECTOR.onEvent'), 'GameManager integration candidate must consume Director events');
for (const forbidden of ['private levelTime', 'private nextLevelEvent', 'runLevelTimeline()']) {
    assert.ok(!gameManager.includes(forbidden), `GameManager still owns timeline state: ${forbidden}`);
}
for (const [name, source] of [
    ['PlayerFlightPresentation', playerFlight],
    ['Mission01Wingmen', wingmen],
    ['StarField', background],
]) {
    assert.ok(!source.includes('private elapsed'), `${name} must not own a narrative clock`);
}

assert.ok(playerFlight.includes("MISSION01_DIRECTOR.progress('TAKEOFF')"), 'AURORA takeoff is not Director-driven');
assert.ok(wingmen.includes("MISSION01_DIRECTOR.progress('FALCON_INTERCEPT')"), 'FALCON intercept is not Director-driven');
assert.ok(wingmen.includes("MISSION01_DIRECTOR.progress('VIPER_WITHDRAW')"), 'VIPER withdrawal is not Director-driven');
assert.ok(wingmen.includes("'art/wingman_viper'"), 'VIPER dedicated sprite is not wired');
assert.ok(wingmen.includes("'art/wingman_falcon'"), 'FALCON dedicated sprite is not wired');

assert.match(background, /PROCEDURAL_PANEL_COUNT = 6;/,
    'Mission 01 background must expose six continuous stage panels');
for (const fn of ['drawLaunchApron', 'drawMainRunway', 'drawCoastalExit', 'drawHarborDefense', 'drawLogisticsZone', 'drawGoliathZone']) {
    assert.ok(background.includes(fn), `Missing background stage: ${fn}`);
}
assert.ok(background.includes('Mission01GoliathSequence'), 'StarField must delegate GOLIATH presentation to its sequence');
assert.ok(!background.includes('updateGoliathPresentation'), 'GOLIATH presentation leaked back into StarField');
assert.ok(goliath.includes("this.node.name = '__GoliathGround'"), 'Missing grounded GOLIATH host');
assert.ok(goliath.includes("MISSION01_DIRECTOR.progress('GOLIATH_PREPARE')"), 'GOLIATH lift is not Director-driven');
assert.ok(goliath.includes('handoffVisualTo'), 'Missing GOLIATH visual handoff API');
assert.ok(background.includes('handoffGoliathVisualTo'), 'StarField must expose GOLIATH handoff to Boss');
assert.ok(boss.includes('handoffGoliathVisualTo(this.node)'), 'Boss no longer adopts grounded GOLIATH visual');

console.log(`PASS: Mission 01 has ${eventTimes.length} ordered events, one Director clock/event cursor, derived sequence windows, dedicated wingmen, six stages, and isolated GOLIATH sequence.`);
