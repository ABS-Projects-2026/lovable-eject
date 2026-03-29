import sharp from "sharp";
import { resolve } from "path";

const OUT = resolve(process.cwd(), "public/og-image.png");

// Eject icon paths from favicon.svg
const ICON = `
  <g transform="translate(32, 32) scale(2)">
    <path d="M7 20V17C7 14.2 7 12.8 7.7 11.8C8.1 11.2 8.6 10.7 9.2 10.3" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    <path d="M17 20V17C17 14.2 17 12.8 16.3 11.8C15.9 11.2 15.4 10.7 14.8 10.3" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    <path d="M12 14V4" stroke="#22d3ee" stroke-width="2" stroke-linecap="round"/>
    <path d="M8 7.5L12 3.5L16 7.5" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
`;

const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="85%" cy="15%" r="40%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="#0a0a0b"/>

  <!-- Cyan glow top-right -->
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Icon + title -->
  ${ICON}
  <text x="92" y="64" font-family="sans-serif" font-weight="700" font-size="36" fill="white">lovable-eject</text>

  <!-- Main headline -->
  <text x="600" y="280" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="56" fill="white">Stop paying for Lovable hosting.</text>

  <!-- Subline -->
  <text x="600" y="340" text-anchor="middle" font-family="sans-serif" font-weight="400" font-size="26" fill="#a1a1aa">One command. Your code, your hosting, your money.</text>

  <!-- URL bottom-right -->
  <text x="1160" y="598" text-anchor="end" font-family="monospace" font-size="18" fill="#52525b">lovable-eject.vercel.app</text>
</svg>
`;

async function main() {
  await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(OUT);
  const { size } = await import("fs").then((fs) => fs.statSync(OUT));
  console.log(`Generated ${OUT} (${(size / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
