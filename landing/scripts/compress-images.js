import sharp from "sharp";
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const DIR = resolve(process.cwd(), "public/screenshots");
const MAX_WIDTH = 1400;
const WEBP_QUALITY = 85;
const PNG_QUALITY = 80;

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

async function main() {
  const pngs = readdirSync(DIR).filter((f) => f.endsWith(".png"));
  let totalBefore = 0;
  let totalAfter = 0;

  console.log(`\nCompressing ${pngs.length} images in ${DIR}\n`);

  for (const file of pngs) {
    const src = join(DIR, file);
    const base = file.replace(/\.png$/, "");
    const webpOut = join(DIR, `${base}.webp`);
    const pngOut = join(DIR, `${base}.compressed.png`);

    const beforeSize = statSync(src).size;
    totalBefore += beforeSize;

    const img = sharp(src).resize({ width: MAX_WIDTH, withoutEnlargement: true });

    // WebP
    await img.clone().webp({ quality: WEBP_QUALITY }).toFile(webpOut);
    const webpSize = statSync(webpOut).size;

    // Compressed PNG
    await img.clone().png({ quality: PNG_QUALITY, compressionLevel: 9 }).toFile(pngOut);
    const pngSize = statSync(pngOut).size;

    totalAfter += webpSize + pngSize;

    console.log(`${file}`);
    console.log(`  Original:       ${fmtSize(beforeSize)}`);
    console.log(`  WebP (q${WEBP_QUALITY}):     ${fmtSize(webpSize)}  (${((1 - webpSize / beforeSize) * 100).toFixed(0)}% smaller)`);
    console.log(`  PNG  (q${PNG_QUALITY}):     ${fmtSize(pngSize)}  (${((1 - pngSize / beforeSize) * 100).toFixed(0)}% smaller)`);
    console.log();
  }

  console.log("─".repeat(50));
  console.log(`Total originals:   ${fmtSize(totalBefore)}`);
  console.log(`Total compressed:  ${fmtSize(totalAfter)}`);
  console.log(`Saved:             ${fmtSize(totalBefore - totalAfter)} (${((1 - totalAfter / totalBefore) * 100).toFixed(0)}%)`);
  console.log();
  console.log("Next: rename .compressed.png → .png, then delete originals.");
}

main().catch(console.error);
