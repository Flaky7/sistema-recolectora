// Renders public/icons/icon.svg into the PWA and Apple icons (`pnpm icons`).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";

// sharp ships with Next.js; resolve it from there instead of adding a dependency.
const require = createRequire(import.meta.url);
const sharp = require(
  require.resolve("sharp", {
    paths: [dirname(require.resolve("next/package.json"))],
  }),
);

const svg = readFileSync("public/icons/icon.svg", "utf8");
// Maskable and Apple icons are full-bleed (the OS applies its own mask) and the glyph shrinks to
// stay inside the maskable safe zone (centre circle, 40% radius).
const fullBleed = svg
  .replace('rx="112" ', "")
  .replace(
    'transform="translate(106 106)"',
    'transform="translate(136 136) scale(0.8)"',
  );

const outputs = [
  [svg, 192, "public/icons/icon-192.png"],
  [svg, 512, "public/icons/icon-512.png"],
  [fullBleed, 512, "public/icons/icon-maskable-512.png"],
  [fullBleed, 180, "public/apple-touch-icon.png"],
];

for (const [source, size, file] of outputs) {
  await sharp(Buffer.from(source), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(file);
  console.log(file);
}
