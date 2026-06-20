// Pack a folder of frames (SVG or PNG) into a single-row sprite sheet.
//
//   node scripts/build-sprite-sheet.mjs <inputDir> <outFile.png>
//
// Frames are sorted by the trailing number in the filename (frame_1, frame_2,
// … frame_10). Each frame is rasterised (SVG via librsvg in sharp) and placed
// into a uniform cell sized to the largest frame, anchored bottom-centre — so
// trimmed exports of differing sizes still line up on a common baseline.

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const [, , inDir, outFile] = process.argv
if (!inDir || !outFile) {
  console.error('usage: node scripts/build-sprite-sheet.mjs <inputDir> <outFile.png>')
  process.exit(1)
}

const frameNum = (f) => parseInt(f.match(/(\d+)(?=\.\w+$)/)?.[1] ?? '0', 10)

const files = fs
  .readdirSync(inDir)
  .filter((f) => /\.(svg|png)$/i.test(f))
  .sort((a, b) => frameNum(a) - frameNum(b))

if (files.length === 0) {
  console.error(`no .svg/.png frames found in ${inDir}`)
  process.exit(1)
}

const items = []
for (const f of files) {
  const img = sharp(path.join(inDir, f))
  const meta = await img.metadata()
  const png = await img.png().toBuffer()
  items.push({ f, png, w: meta.width, h: meta.height })
}

const cellW = Math.max(...items.map((i) => i.w))
const cellH = Math.max(...items.map((i) => i.h))

const composites = items.map((it, i) => ({
  input: it.png,
  left: i * cellW + Math.round((cellW - it.w) / 2), // centre horizontally
  top: cellH - it.h, // anchor to the bottom of the cell
}))

await sharp({
  create: {
    width: cellW * items.length,
    height: cellH,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png()
  .toFile(outFile)

console.log(
  `✓ ${outFile} — ${items.length} frames, cell ${cellW}×${cellH}, sheet ${cellW * items.length}×${cellH}`,
)
