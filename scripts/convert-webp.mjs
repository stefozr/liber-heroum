// scripts/convert-webp.mjs — npm run assets:webp
// Converts the heavyweight PNG art (class full art + wizard step backdrops)
// to WebP alongside the originals. q80 is safe for these painterly backdrops:
// every render site draws a gradient scrim over them at <= 0.8 opacity.
import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

// The poster pass rewrites files in place; sharp's file cache would otherwise
// keep the input handle open and block the write on Windows.
sharp.cache(false);

for (const dir of ['public/assets/classes', 'public/assets/sections']) {
  for (const f of await readdir(dir)) {
    if (!f.endsWith('.png')) continue;
    const src = path.join(dir, f);
    const out = src.replace(/\.png$/, '.webp');
    await sharp(src).webp({ quality: 80, effort: 6 }).toFile(out);
    const [a, b] = await Promise.all([stat(src), stat(out)]);
    console.log(`${out}  ${(a.size / 1024 / 1024).toFixed(2)}MB -> ${(b.size / 1024).toFixed(0)}KB`);
  }
}

// Poster cards (ancestry + class pickers) render at ~360 CSS px wide — cap them
// at 720px (2× for retina) in place. Width check keeps the pass idempotent, so
// rerunning the script doesn't recompress art that's already sized.
for (const dir of ['public/assets/ancestries', 'public/assets/classes/cards']) {
  for (const f of await readdir(dir)) {
    if (!f.endsWith('.webp')) continue;
    const src = path.join(dir, f);
    if ((await sharp(src).metadata()).width <= 720) continue;
    const before = (await stat(src)).size;
    const buf = await sharp(src).resize({ width: 720 }).webp({ quality: 80, effort: 6 }).toBuffer();
    await writeFile(src, buf);
    console.log(`${src}  ${(before / 1024).toFixed(0)}KB -> ${(buf.length / 1024).toFixed(0)}KB`);
  }
}
