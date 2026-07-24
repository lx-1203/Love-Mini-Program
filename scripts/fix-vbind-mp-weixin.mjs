#!/usr/bin/env node
// Replace all v-bind() CSS expressions with static CSS var() or literal values.
// Run from project root: node scripts/fix-vbind-mp-weixin.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, relative } from 'path';

function findVueFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    if (entry.isDirectory()) {
      results.push(...findVueFiles(fullPath));
    } else if (entry.name.endsWith('.vue')) {
      const content = readFileSync(fullPath, 'utf-8');
      if (content.includes('v-bind(')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const SRC_DIR = resolve('apps/client/src');
const FILES = findVueFiles(SRC_DIR);

console.log(`Found ${FILES.length} files with v-bind() CSS expressions.\n`);

// Ordered list of replacements: [pattern, replacement]
const REPLACEMENTS = [
  // ─── Template literals with rpx suffix ───
  [/v-bind\('`\$\{t\.radius\.xs\}rpx`'\)/g,    'var(--r-xs)'],
  [/v-bind\('`\$\{t\.radius\.sm\}rpx`'\)/g,    'var(--r-sm)'],
  [/v-bind\('`\$\{t\.radius\.md\}rpx`'\)/g,    'var(--r-md)'],
  [/v-bind\('`\$\{t\.radius\.lg\}rpx`'\)/g,    'var(--r-lg)'],
  [/v-bind\('`\$\{t\.radius\.xl\}rpx`'\)/g,    'var(--r-xl)'],
  [/v-bind\('`\$\{t\.radius\.xxl\}rpx`'\)/g,   'var(--r-xxl)'],
  [/v-bind\('`\$\{t\.radius\.full\}rpx`'\)/g,  'var(--r-full)'],

  // ─── Typography size template literals ───
  [/v-bind\('`\$\{t\.typography\.size\.display\}rpx`'\)/g, 'var(--fs-display)'],
  [/v-bind\('`\$\{t\.typography\.size\.h1\}rpx`'\)/g,       'var(--fs-5xl)'],
  [/v-bind\('`\$\{t\.typography\.size\.h2\}rpx`'\)/g,       'var(--fs-3xl)'],
  [/v-bind\('`\$\{t\.typography\.size\.h3\}rpx`'\)/g,       'var(--fs-xl)'],
  [/v-bind\('`\$\{t\.typography\.size\.subtitle\}rpx`'\)/g, 'var(--fs-lg)'],
  [/v-bind\('`\$\{t\.typography\.size\.body\}rpx`'\)/g,     'var(--fs-md)'],
  [/v-bind\('`\$\{t\.typography\.size\.bodySm\}rpx`'\)/g,   'var(--fs-base)'],
  [/v-bind\('`\$\{t\.typography\.size\.caption\}rpx`'\)/g,  'var(--fs-sm)'],
  [/v-bind\('`\$\{t\.typography\.size\.overline\}rpx`'\)/g, 'var(--fs-xs)'],

  // ─── Component/layout template literals ───
  [/v-bind\('`\$\{t\.component\.button\.radius\}rpx`'\)/g,  'var(--r-xl)'],
  [/v-bind\('`\$\{t\.component\.card\.radius\}rpx`'\)/g,     'var(--r-lg)'],
  [/v-bind\('`\$\{t\.component\.card\.radiusInner\}rpx`'\)/g,'var(--r-md)'],
  [/v-bind\('`\$\{t\.component\.card\.radiusMicro\}rpx`'\)/g,'var(--r-sm)'],
  [/v-bind\('`\$\{t\.component\.card\.padding\}rpx`'\)/g,    'var(--card-padding)'],
  [/v-bind\('`\$\{t\.layout\.pagePadding\}rpx`'\)/g,         'var(--page-padding)'],
  [/v-bind\('`\$\{t\.layout\.sectionGap\}rpx`'\)/g,          'var(--section-gap)'],

  // ─── Spacing template literals ───
  [/v-bind\('`\$\{t\.spacing\[0\]\}rpx`'\)/g, '0'],
  [/v-bind\('`\$\{t\.spacing\[1\]\}rpx`'\)/g, 'var(--sp-1)'],
  [/v-bind\('`\$\{t\.spacing\[2\]\}rpx`'\)/g, 'var(--sp-2)'],
  [/v-bind\('`\$\{t\.spacing\[3\]\}rpx`'\)/g, 'var(--sp-3)'],
  [/v-bind\('`\$\{t\.spacing\[4\]\}rpx`'\)/g, 'var(--sp-4)'],
  [/v-bind\('`\$\{t\.spacing\[5\]\}rpx`'\)/g, 'var(--sp-5)'],
  [/v-bind\('`\$\{t\.spacing\[6\]\}rpx`'\)/g, 'var(--sp-6)'],
  [/v-bind\('`\$\{t\.spacing\[7\]\}rpx`'\)/g, 'var(--sp-7)'],
  [/v-bind\('`\$\{t\.spacing\[8\]\}rpx`'\)/g, 'var(--sp-7)'],

  // ─── Motion template literals ───
  [/v-bind\('`\$\{t\.motion\.duration\.instant\}ms`'\)/g, '80ms'],
  [/v-bind\('`\$\{t\.motion\.duration\.fast\}ms`'\)/g,    '120ms'],
  [/v-bind\('`\$\{t\.motion\.duration\.normal\}ms`'\)/g,  '200ms'],
  [/v-bind\('`\$\{t\.motion\.duration\.slow\}ms`'\)/g,    '250ms'],
  [/v-bind\('`\$\{t\.motion\.duration\.slower\}ms`'\)/g,  '350ms'],

  // ─── Motion easing (no template literal) ───
  [/v-bind\('t\.motion\.easing\.default'\)/g,    'cubic-bezier(0.4, 0, 0.2, 1)'],
  [/v-bind\('t\.motion\.easing\.bounce'\)/g,     'cubic-bezier(0.34, 1.56, 0.64, 1)'],
  [/v-bind\('t\.motion\.easing\.smooth'\)/g,     'cubic-bezier(0.25, 0.1, 0.25, 1)'],
  [/v-bind\('t\.motion\.easing\.decelerate'\)/g, 'cubic-bezier(0, 0, 0.2, 1)'],
  [/v-bind\('t\.motion\.easing\.accelerate'\)/g, 'cubic-bezier(0.4, 0, 1, 1)'],

  // ─── Typography static values ───
  [/v-bind\('t\.typography\.weight\.regular'\)/g,   '400'],
  [/v-bind\('t\.typography\.weight\.medium'\)/g,    '500'],
  [/v-bind\('t\.typography\.weight\.semibold'\)/g,  '600'],
  [/v-bind\('t\.typography\.weight\.bold'\)/g,      '700'],
  [/v-bind\('t\.typography\.weight\.extrabold'\)/g, '700'],
  [/v-bind\('t\.typography\.letterSpacing\.tight'\)/g, '-0.02em'],
  [/v-bind\('t\.typography\.letterSpacing\.normal'\)/g, '0'],
  [/v-bind\('t\.typography\.letterSpacing\.wide'\)/g,   '0.02em'],
  [/v-bind\('t\.typography\.lineHeight\.tight'\)/g,   '1.2'],
  [/v-bind\('t\.typography\.lineHeight\.normal'\)/g,  '1.5'],
  [/v-bind\('t\.typography\.lineHeight\.relaxed'\)/g, '1.6'],

  // ─── Color brand ───
  [/v-bind\('t\.color\.brand\[50\]'\)/g,  'var(--c-brand-50)'],
  [/v-bind\('t\.color\.brand\[100\]'\)/g, 'var(--c-brand-100)'],
  [/v-bind\('t\.color\.brand\[200\]'\)/g, 'var(--c-brand-200)'],
  [/v-bind\('t\.color\.brand\[300\]'\)/g, 'var(--c-brand-300)'],
  [/v-bind\('t\.color\.brand\[400\]'\)/g, 'var(--c-brand-400)'],
  [/v-bind\('t\.color\.brand\[500\]'\)/g, 'var(--c-brand)'],
  [/v-bind\('t\.color\.brand\[600\]'\)/g, 'var(--c-brand-600)'],
  [/v-bind\('t\.color\.brand\[700\]'\)/g, 'var(--c-brand-700)'],

  // ─── Color neutral ───
  [/v-bind\('t\.color\.neutral\[0\]'\)/g,   'var(--c-neutral-0)'],
  [/v-bind\('t\.color\.neutral\[50\]'\)/g,  'var(--c-neutral-50)'],
  [/v-bind\('t\.color\.neutral\[100\]'\)/g, 'var(--c-neutral-100)'],
  [/v-bind\('t\.color\.neutral\[200\]'\)/g, 'var(--c-neutral-200)'],
  [/v-bind\('t\.color\.neutral\[300\]'\)/g, 'var(--c-neutral-300)'],
  [/v-bind\('t\.color\.neutral\[400\]'\)/g, 'var(--c-neutral-400)'],
  [/v-bind\('t\.color\.neutral\[500\]'\)/g, 'var(--c-neutral-500)'],
  [/v-bind\('t\.color\.neutral\[600\]'\)/g, 'var(--c-neutral-600)'],
  [/v-bind\('t\.color\.neutral\[700\]'\)/g, 'var(--c-neutral-700)'],
  [/v-bind\('t\.color\.neutral\[800\]'\)/g, 'var(--c-neutral-800)'],
  [/v-bind\('t\.color\.neutral\[900\]'\)/g, 'var(--c-neutral-900)'],

  // ─── Color romance ───
  [/v-bind\('t\.color\.romance\[50\]'\)/g,  'var(--c-romance-50)'],
  [/v-bind\('t\.color\.romance\[100\]'\)/g, 'var(--c-romance-100)'],
  [/v-bind\('t\.color\.romance\[200\]'\)/g, 'var(--c-romance-200)'],
  [/v-bind\('t\.color\.romance\[300\]'\)/g, 'var(--c-romance-300)'],
  [/v-bind\('t\.color\.romance\[400\]'\)/g, 'var(--c-romance-400)'],
  [/v-bind\('t\.color\.romance\[500\]'\)/g, 'var(--c-romance-500)'],
  [/v-bind\('t\.color\.romance\[600\]'\)/g, 'var(--c-romance-600)'],
  [/v-bind\('t\.color\.romance\[700\]'\)/g, 'var(--c-romance-700)'],

  // ─── Color pink (maps to romance vars) ───
  [/v-bind\('t\.color\.pink\[50\]'\)/g,  'var(--c-romance-50)'],
  [/v-bind\('t\.color\.pink\[100\]'\)/g, 'var(--c-romance-100)'],
  [/v-bind\('t\.color\.pink\[200\]'\)/g, 'var(--c-romance-200)'],
  [/v-bind\('t\.color\.pink\[300\]'\)/g, 'var(--c-romance-300)'],
  [/v-bind\('t\.color\.pink\[400\]'\)/g, 'var(--c-pink-400)'],
  [/v-bind\('t\.color\.pink\[500\]'\)/g, 'var(--c-pink-500)'],
  [/v-bind\('t\.color\.pink\[600\]'\)/g, 'var(--c-romance-600)'],

  // ─── Color accent ───
  [/v-bind\('t\.color\.accent\[400\]'\)/g, 'var(--c-accent-400)'],

  // ─── Color text ───
  [/v-bind\('t\.color\.text\.primary'\)/g,    'var(--c-text-primary)'],
  [/v-bind\('t\.color\.text\.secondary'\)/g,  'var(--c-text-secondary)'],
  [/v-bind\('t\.color\.text\.tertiary'\)/g,   'var(--c-text-tertiary)'],
  [/v-bind\('t\.color\.text\.quaternary'\)/g, 'var(--c-text-quaternary)'],
  [/v-bind\('t\.color\.text\.inverse'\)/g,    'var(--c-text-inverse)'],
  [/v-bind\('t\.color\.text\.brand'\)/g,      'var(--c-text-brand)'],
  [/v-bind\('t\.color\.text\.romance'\)/g,    'var(--c-text-romance)'],
  [/v-bind\('t\.color\.text\.link'\)/g,       'var(--c-text-brand)'],

  // ─── Color bg ───
  [/v-bind\('t\.color\.bg\.page'\)/g,      'var(--c-bg-page)'],
  [/v-bind\('t\.color\.bg\.container'\)/g, 'var(--c-bg-container)'],
  [/v-bind\('t\.color\.bg\.surface'\)/g,   'var(--c-bg-surface)'],
  [/v-bind\('t\.color\.bg\.overlay'\)/g,   'var(--c-bg-overlay)'],
  [/v-bind\('t\.color\.bg\.brand'\)/g,     'var(--c-bg-brand)'],
  [/v-bind\('t\.color\.bg\.secondary'\)/g, 'var(--c-bg-secondary)'],
  [/v-bind\('t\.color\.bg\.romance'\)/g,   'var(--c-bg-romance)'],

  // ─── Color border ───
  [/v-bind\('t\.color\.border\.light'\)/g,   'var(--c-border-light)'],
  [/v-bind\('t\.color\.border\.default'\)/g, 'var(--c-border-default)'],
  [/v-bind\('t\.color\.border\.strong'\)/g,  'var(--c-border-strong)'],

  // ─── Color gradient ───
  [/v-bind\('t\.color\.gradient\.brand'\)/g,           'var(--c-gradient-brand)'],
  [/v-bind\('t\.color\.gradient\.secondary'\)/g,       'var(--c-gradient-brand-reverse)'],
  [/v-bind\('t\.color\.gradient\.warmCool'\)/g,        'var(--c-gradient-warm-cool)'],
  [/v-bind\('t\.color\.gradient\.sunset'\)/g,          'var(--c-gradient-sunset)'],
  [/v-bind\('t\.color\.gradient\.pink'\)/g,            'var(--c-gradient-pink)'],
  [/v-bind\('t\.color\.gradient\.match'\)/g,           'var(--c-gradient-match)'],
  [/v-bind\('t\.color\.gradient\.pageAtmosphere'\)/g,  'var(--c-gradient-page)'],
  [/v-bind\('t\.color\.gradient\.cardAtmosphere'\)/g,  'var(--c-gradient-card-atmosphere)'],
  [/v-bind\('t\.color\.gradient\.brandOverlay'\)/g,    'var(--c-gradient-brand-overlay)'],
  [/v-bind\('t\.color\.gradient\.romance'\)/g,         'var(--c-gradient-romance)'],
  [/v-bind\('t\.color\.gradient\.floatButton'\)/g,     'var(--c-gradient-float-btn)'],
  [/v-bind\('t\.color\.gradient\.vip'\)/g,             'var(--c-gradient-vip)'],
  [/v-bind\('t\.color\.gradient\.headerGradient'\)/g,  'var(--c-gradient-page-romance)'],

  // ─── Color error/success/warning ───
  [/v-bind\('t\.color\.error'\)/g,        'var(--c-error)'],
  [/v-bind\('t\.color\.errorDark'\)/g,    'var(--c-error-dark)'],
  [/v-bind\('t\.color\.success'\)/g,      'var(--c-success)'],
  [/v-bind\('t\.color\.warning'\)/g,      'var(--c-warning)'],
  [/v-bind\('t\.color\.price'\)/g,        'var(--c-price)'],

  // ─── Shadow ───
  [/v-bind\('t\.shadow\.none'\)/g,        'none'],
  [/v-bind\('t\.shadow\.xs'\)/g,          'var(--s-xs)'],
  [/v-bind\('t\.shadow\.sm'\)/g,          'var(--s-sm)'],
  [/v-bind\('t\.shadow\.md'\)/g,          'var(--s-md)'],
  [/v-bind\('t\.shadow\.lg'\)/g,          'var(--s-lg)'],
  [/v-bind\('t\.shadow\.xl'\)/g,          'var(--s-xl)'],
  [/v-bind\('t\.shadow\.inner'\)/g,       'var(--s-inner)'],
  [/v-bind\('t\.shadow\.brand'\)/g,       'var(--s-brand)'],
  [/v-bind\('t\.shadow\.brandSm'\)/g,     'var(--s-brand-sm)'],
  [/v-bind\('t\.shadow\.brandMd'\)/g,     'var(--s-brand-md)'],
  [/v-bind\('t\.shadow\.brandLg'\)/g,     'var(--s-brand-lg)'],
  [/v-bind\('t\.shadow\.pink'\)/g,        'var(--s-romance)'],
  [/v-bind\('t\.shadow\.pinkMd'\)/g,      'var(--s-romance-md)'],
  [/v-bind\('t\.shadow\.card'\)/g,        'var(--s-card-soft)'],
  [/v-bind\('t\.shadow\.cardSoft'\)/g,    'var(--s-card-soft)'],
  [/v-bind\('t\.shadow\.modal'\)/g,       'var(--s-modal)'],
  [/v-bind\('t\.shadow\.floatBtn'\)/g,    'var(--s-float-btn)'],
  [/v-bind\('t\.shadow\.romanceShadow'\)/g, 'var(--s-romance)'],
];

let totalFiles = 0;

for (const file of FILES) {
  let content = readFileSync(file, 'utf-8');
  let changed = false;

  for (const [pattern, replacement] of REPLACEMENTS) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (before !== content) changed = true;
  }

  if (changed) {
    // Count remaining v-bind() to report
    const remainingMatch = content.match(/v-bind\(/g);
    const remaining = remainingMatch ? remainingMatch.length : 0;
    writeFileSync(file, content, 'utf-8');
    console.log(`✓ ${relative(SRC_DIR, file)} (${remaining} v-bind() remaining)`);
    totalFiles++;
  }
}

console.log(`\n✔ Done. Modified ${totalFiles} files.`);
if (totalFiles > 0) {
  console.log('Run "npx pnpm --dir apps/client run build:mp-weixin" to verify.');
}
