/**
 * Renders the app icon set from assets/brand/mark.svg with the installed Chrome:
 *   node scripts/make-icons.mjs
 * Writes assets/images/{icon,icon-dark,icon-tinted,splash-icon,favicon,android-icon-*}.png.
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const root = new URL('../', import.meta.url);
const out = (name) => new URL(`assets/images/${name}`, root).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const mark = readFileSync(new URL('assets/brand/mark.svg', root), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

const BLUE_TOP = '#3B56EA';
const BLUE_BOTTOM = '#2235B4';
const PAPER = '#F5F5F1';
const DARK_GLYPH = '#8A98FF';

/** One square image: a background (or none) and the mark scaled into the middle. */
function frame({ size, background, color, scale = 1, radius = 0 }) {
  const bg =
    background === 'gradient'
      ? `background: linear-gradient(160deg, ${BLUE_TOP} 0%, ${BLUE_BOTTOM} 100%);`
      : background
        ? `background: ${background};`
        : 'background: transparent;';
  const inner = Math.round(size * scale);
  return `<!doctype html><html><head><style>
    html, body { margin: 0; padding: 0; background: transparent; }
    .tile { width: ${size}px; height: ${size}px; ${bg} border-radius: ${radius}px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .tile svg { width: ${inner}px; height: ${inner}px; color: ${color}; display: block; }
  </style></head><body><div class="tile">${mark}</div></body></html>`;
}

const jobs = [
  // iOS: full-bleed square (the system rounds it). Dark and tinted variants sit on transparency.
  { file: 'icon.png', size: 1024, background: 'gradient', color: PAPER },
  { file: 'icon-dark.png', size: 1024, background: null, color: DARK_GLYPH },
  { file: 'icon-tinted.png', size: 1024, background: null, color: '#FFFFFF' },
  // Android adaptive icon: the mark stays inside the 66% safe zone.
  { file: 'android-icon-foreground.png', size: 1024, background: null, color: PAPER, scale: 0.62 },
  { file: 'android-icon-background.png', size: 1024, background: 'gradient', color: 'transparent', scale: 0.01 },
  { file: 'android-icon-monochrome.png', size: 1024, background: null, color: '#FFFFFF', scale: 0.62 },
  // Splash: the rounded icon, which reads on both the light and the dark splash background.
  { file: 'splash-icon.png', size: 512, background: 'gradient', color: PAPER, radius: 116 },
  { file: 'favicon.png', size: 48, background: 'gradient', color: PAPER, radius: 11 },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const job of jobs) {
  await page.setViewportSize({ width: job.size, height: job.size });
  await page.setContent(frame(job));
  await page.locator('.tile').screenshot({ path: out(job.file), omitBackground: true });
  console.log('wrote', job.file);
}
await browser.close();
