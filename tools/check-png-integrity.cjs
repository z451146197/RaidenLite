const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const assetsRoot = path.join(root, 'assets');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function collectPngs(dir, output = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collectPngs(full, output);
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) output.push(full);
    }
    return output;
}

function validatePng(file) {
    const data = fs.readFileSync(file);
    const rel = path.relative(root, file);
    assert.ok(data.length >= 20, `${rel}: PNG is too short`);
    assert.ok(data.subarray(0, 8).equals(PNG_SIGNATURE), `${rel}: invalid PNG signature`);

    let offset = 8;
    let sawIHDR = false;
    let sawIDAT = false;
    let sawIEND = false;
    while (offset < data.length) {
        assert.ok(offset + 12 <= data.length, `${rel}: truncated PNG chunk header at ${offset}`);
        const length = data.readUInt32BE(offset);
        const typeStart = offset + 4;
        const dataStart = offset + 8;
        const crcOffset = dataStart + length;
        const next = crcOffset + 4;
        assert.ok(next <= data.length, `${rel}: truncated PNG chunk at ${offset}`);

        const type = data.subarray(typeStart, typeStart + 4).toString('ascii');
        const expected = data.readUInt32BE(crcOffset);
        const actual = crc32(data.subarray(typeStart, crcOffset));
        assert.equal(actual, expected,
            `${rel}: ${type} CRC mismatch at ${offset} (expected ${expected.toString(16)}, got ${actual.toString(16)})`);

        if (type === 'IHDR') {
            assert.ok(!sawIHDR && offset === 8, `${rel}: IHDR must be the first chunk`);
            sawIHDR = true;
        } else if (type === 'IDAT') {
            sawIDAT = true;
        } else if (type === 'IEND') {
            assert.equal(length, 0, `${rel}: IEND must be empty`);
            sawIEND = true;
            offset = next;
            break;
        }
        offset = next;
    }

    assert.ok(sawIHDR, `${rel}: missing IHDR`);
    assert.ok(sawIDAT, `${rel}: missing IDAT`);
    assert.ok(sawIEND, `${rel}: missing IEND`);
    assert.equal(offset, data.length, `${rel}: trailing bytes after IEND`);
}

const pngs = collectPngs(assetsRoot);
assert.ok(pngs.length > 0, 'No PNG assets found');
for (const file of pngs) validatePng(file);
console.log(`PASS: ${pngs.length} PNG assets have valid chunk boundaries and CRCs.`);
