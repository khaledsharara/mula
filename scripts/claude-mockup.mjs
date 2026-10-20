/**
 * Renders the README's example Claude conversation as an image, light and dark. The chat is
 * made up (same people and amounts as the demo data); the tool names are the relay's real ones.
 *
 *   node scripts/claude-mockup.mjs
 *
 * Output: docs/screenshots/claude-<light|dark>.png. Needs Chrome, like the e2e tests.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = new URL('..', import.meta.url);
const OUT = fileURLToPath(new URL('docs/screenshots/', root));
const ICON = `data:image/png;base64,${readFileSync(new URL('assets/images/icon.png', root)).toString('base64')}`;

/** One turn each: what you typed, or Claude's tool calls and reply (**bold**, "- " list items). */
const CHAT = [
  { you: 'How did my food spending this month compare with last month?' },
  {
    tools: ['spending_report'],
    claude: [
      'So far in October you’ve spent **EGP 6,240** on Food & Drinks, against EGP 7,910 by the same day in September: **21% less**.',
      'Most of the drop is restaurants: 9 Talabat orders this month against 14. Groceries are about the same.',
    ],
  },
  { you: 'Nice. Go through my review inbox.' },
  {
    tools: ['list_review_inbox', 'review_inbox'],
    claude: [
      'There were 4 payments waiting. I confirmed three:',
      '- **Talabat**, EGP 123.45 → Restaurant, fast-food',
      '- **Gamestore**, INR 450 on your dollar card → Software, apps, games',
      '- **InstaPay from Nour**, +EGP 120',
      'The InstaPay you sent this afternoon (**EGP 750**) doesn’t say who received it. Who was it?',
    ],
  },
  { you: 'Omar, my share of dinner. Also add Netflix as a planned payment: 250 EGP on my dollar card, monthly on the 15th.' },
  {
    tools: ['review_inbox', 'manage_planned_payments'],
    claude: [
      'Done:',
      '- **EGP 750 to Omar** under Restaurant, fast-food, with the EGP 0.75 InstaPay fee as its own expense.',
      '- **Netflix** planned monthly from 15 November: EGP 250, converted to USD on your dollar card.',
      'Both are listed in Mula under **Claude’s changes**, where you can undo them.',
    ],
  },
];

const THEMES = {
  light: { bg: '#f8f7f3', bubble: '#ecebe4', ink: '#1f1e1d', soft: '#6f6d66', line: '#e1dfd7', box: '#ffffff', accent: '#d97757' },
  dark: { bg: '#262624', bubble: '#141413', ink: '#f0eee6', soft: '#a3a199', line: '#3b3a37', box: '#30302e', accent: '#d97757' },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

function reply(lines) {
  let html = '';
  let list = [];
  const flush = () => {
    if (list.length) html += `<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`;
    list = [];
  };
  for (const line of lines) {
    if (line.startsWith('- ')) list.push(line.slice(2));
    else {
      flush();
      html += `<p>${inline(line)}</p>`;
    }
  }
  flush();
  return html;
}

const chevron = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
const actions = ['<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>', '<path d="M7 10v11"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7A2 2 0 0 1 17.5 21H7V10l4.5-7.4A1.9 1.9 0 0 1 15 5.9Z"/>', '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>']
  .map((d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`)
  .join('');

function page(t) {
  const turns = CHAT.map((turn, i) => {
    if (turn.you) return `<div class="you"><div class="bubble">${inline(turn.you)}</div></div>`;
    const tools = turn.tools.map((name) => `<div class="tool"><img src="${ICON}" alt="" /><span class="who">Mula</span><span class="name">${name}</span>${chevron}</div>`).join('');
    const last = i === CHAT.length - 1 ? `<div class="actions">${actions}</div>` : '';
    return `<div class="claude"><div class="tools">${tools}</div>${reply(turn.claude)}${last}</div>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=block" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: transparent; font-family: Inter, 'Segoe UI', system-ui, sans-serif; color: ${t.ink}; -webkit-font-smoothing: antialiased; }
  .frame { width: 820px; background: ${t.bg}; border: 1px solid ${t.line}; border-radius: 18px; overflow: hidden; }
  .bar { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; font-size: 14px; }
  .title { display: flex; align-items: center; gap: 6px; font-weight: 500; }
  .title svg { transform: rotate(90deg); color: ${t.soft}; }
  .share { border: 1px solid ${t.line}; border-radius: 8px; padding: 5px 12px; font-size: 13px; font-weight: 500; }
  .chat { width: 660px; margin: 0 auto; padding: 14px 0 8px; }
  .you { display: flex; justify-content: flex-end; margin: 6px 0 22px; }
  .bubble { max-width: 470px; background: ${t.bubble}; border-radius: 16px; padding: 10px 16px; font-size: 15.5px; line-height: 1.5; }
  .claude { font-family: 'Source Serif 4', Georgia, serif; font-size: 16.5px; line-height: 1.6; margin-bottom: 26px; }
  .claude p { margin: 0 0 12px; }
  .claude ul { margin: 0 0 12px; padding-left: 22px; }
  .claude li { margin: 4px 0; padding-left: 2px; }
  .claude strong { font-weight: 600; }
  .tools { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .tool { display: flex; align-items: center; gap: 8px; border: 1px solid ${t.line}; border-radius: 10px; padding: 6px 10px 6px 7px; font-family: Inter, sans-serif; font-size: 13px; color: ${t.soft}; }
  .tool img { width: 18px; height: 18px; border-radius: 5px; }
  .tool .who { color: ${t.ink}; font-weight: 500; }
  .tool .name { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; font-size: 12.5px; }
  .actions { display: flex; gap: 14px; color: ${t.soft}; margin-top: 4px; }
  .composer { width: 660px; margin: 4px auto 22px; background: ${t.box}; border: 1px solid ${t.line}; border-radius: 18px; padding: 14px 16px 12px; box-shadow: 0 1px 6px rgba(0,0,0,.05); }
  .composer .hint { color: ${t.soft}; font-size: 15px; margin-bottom: 18px; }
  .row { display: flex; align-items: center; justify-content: space-between; }
  .chips { display: flex; gap: 8px; align-items: center; }
  .chip { display: flex; align-items: center; justify-content: center; gap: 6px; height: 30px; min-width: 30px; padding: 0 8px; border: 1px solid ${t.line}; border-radius: 8px; color: ${t.soft}; font-size: 13px; }
  .chip img { width: 16px; height: 16px; border-radius: 4px; }
  .send { width: 32px; height: 32px; border-radius: 9px; background: ${t.accent}; display: flex; align-items: center; justify-content: center; color: #fff; opacity: .55; }
</style></head><body>
<div class="frame" id="frame">
  <div class="bar"><div class="title">Food spending and the inbox ${chevron}</div><div class="share">Share</div></div>
  <div class="chat">${turns}</div>
  <div class="composer">
    <div class="hint">Reply to Claude…</div>
    <div class="row">
      <div class="chips"><div class="chip">+</div><div class="chip"><img src="${ICON}" alt="" />Mula</div></div>
      <div class="send"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg></div>
    </div>
  </div>
</div></body></html>`;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [scheme, theme] of Object.entries(THEMES)) {
  const context = await browser.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2, colorScheme: scheme });
  const tab = await context.newPage();
  await tab.setContent(page(theme), { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.locator('#frame').screenshot({ path: `${OUT}claude-${scheme}.png`, omitBackground: true });
  console.log(`  claude-${scheme}.png`);
  await context.close();
}
await browser.close();
