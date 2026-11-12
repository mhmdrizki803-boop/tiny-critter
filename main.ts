// cutest-picture-01 entry (Node 22, standard library only).
// Copies this repository's entry.png to $MAKEFUN_OUTPUT_DIR/entry.png (default /output),
// then verifies the bytes it wrote: PNG or JPEG magic number, header width/height within
// 1024x1024, and size within 1 MiB. Any violation exits 1.

import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 1048576;
const MAX_SIDE = 1024;

type Format = 'PNG' | 'JPEG';

function sniff(buf: Buffer): Format | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'PNG';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'JPEG';
  }
  return null;
}

// PNG: width/height are the first two u32 of the IHDR payload (bytes 16..24).
function pngSize(buf: Buffer): { width: number; height: number } {
  if (buf.length < 24 || buf.toString('latin1', 12, 16) !== 'IHDR') {
    throw new Error('PNG header missing IHDR');
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// JPEG: walk segments to the first Start-Of-Frame, which carries height then width.
function jpegSize(buf: Buffer): { width: number; height: number } {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1] as number;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    }
    i += 2 + len;
  }
  throw new Error('JPEG header missing SOF segment');
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const dest = join(outDir, 'entry.png');

mkdirSync(outDir, { recursive: true });
copyFileSync(new URL('./entry.png', import.meta.url), dest);

function fail(message: string): never {
  console.error(`FAIL ${dest}: ${message}`);
  process.exit(1);
}

const bytes: number = statSync(dest).size;
if (bytes > MAX_BYTES) fail(`${bytes} bytes exceeds ${MAX_BYTES}`);

const buf: Buffer = readFileSync(dest);
const format = sniff(buf);
if (format === null) fail(`not a PNG or JPEG (first bytes ${buf.subarray(0, 8).toString('hex')})`);

const { width, height } = format === 'PNG' ? pngSize(buf) : jpegSize(buf);
if (width > MAX_SIDE || height > MAX_SIDE) fail(`${format} ${width}x${height} exceeds ${MAX_SIDE}x${MAX_SIDE}`);
if (width < 1 || height < 1) fail(`${format} ${width}x${height} has no pixels`);

console.log(`OK ${format} ${width}x${height} ${bytes} bytes -> ${dest} (max ${MAX_SIDE}x${MAX_SIDE}, ${MAX_BYTES} bytes)`);
