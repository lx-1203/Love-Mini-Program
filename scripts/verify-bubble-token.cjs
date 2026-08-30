/**
 * 2026-08-26 T05 集成验证：聊天气泡 token 收敛静态检查（R3.1）。
 *
 * 检查项：
 *   1. ChatBubble.vue 中不得残留硬编码气泡尺寸（self 20rpx 圆角、peer 24rpx 圆角、
 *      base 阴影 --s-sm、padding --sp-3/--sp-4）；
 *   2. ChatBubble.vue 必须引用全部 --bubble-* token（max-width/padding/radius/shadow/
 *      font/line-height/emoji/avatar/status-icon）；
 *   3. design-variables.scss 中 --bubble-* token 定义完整且口径与 PRD R3 一致。
 *
 * 退出码：全部通过 0，任一失败 1。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CHAT_BUBBLE = path.join(__dirname, '..', 'apps', 'client', 'src', 'components', 'chat', 'ChatBubble.vue');
const DESIGN_VARS = path.join(__dirname, '..', 'apps', 'client', 'src', 'theme', 'design-variables.scss');

let failures = 0;

function assert(cond, label, detail) {
  if (cond) {
    console.log(`  [PASS] ${label}`);
  } else {
    failures += 1;
    console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

let bubbleSrc = '';
let varsSrc = '';
try {
  bubbleSrc = fs.readFileSync(CHAT_BUBBLE, 'utf8');
} catch (e) {
  console.error(`[FATAL] 读取 ChatBubble.vue 失败: ${e.message}`);
  process.exit(1);
}
try {
  varsSrc = fs.readFileSync(DESIGN_VARS, 'utf8');
} catch (e) {
  console.error(`[FATAL] 读取 design-variables.scss 失败: ${e.message}`);
  process.exit(1);
}

console.log('[verify-bubble-token] ChatBubble.vue 硬编码残留检查');
const forbidden = [
  { pattern: '20rpx 20rpx 4rpx 20rpx', label: 'self 圆角硬编码（应引用 --bubble-radius-main/tail）' },
  { pattern: '0 24rpx 24rpx 24rpx', label: 'peer 圆角硬编码（应引用 --bubble-radius-main/tail）' },
  { pattern: 'box-shadow: var(--s-sm)', label: 'base 阴影硬编码 --s-sm（应引用 --bubble-shadow）' },
  { pattern: 'padding: var(--sp-3) var(--sp-4)', label: 'padding 硬编码 --sp-3/--sp-4（应引用 --bubble-padding-*）' },
  { pattern: 'width: 64rpx;\n  height: 64rpx', label: '头像尺寸硬编码 64rpx（应引用 --bubble-avatar-size）' },
];
for (const f of forbidden) {
  assert(!bubbleSrc.includes(f.pattern), `未残留「${f.label}」`);
}

console.log('[verify-bubble-token] ChatBubble.vue token 引用检查');
const requiredTokens = [
  '--bubble-max-width',
  '--bubble-padding-y',
  '--bubble-padding-x',
  '--bubble-radius-main',
  '--bubble-radius-tail',
  '--bubble-shadow',
  '--bubble-font-size',
  '--bubble-line-height',
  '--bubble-emoji-font-size',
  '--bubble-avatar-size',
  '--bubble-avatar-border',
  '--bubble-status-icon-size',
];
for (const token of requiredTokens) {
  assert(bubbleSrc.includes(token), `引用 token ${token}`);
}

console.log('[verify-bubble-token] self/peer 圆角与阴影必须走 token');
// 提取 .bubble--self / .bubble--peer 块
function extractBlock(src, selector) {
  const idx = src.indexOf(selector);
  if (idx < 0) return '';
  const next = src.indexOf('}', idx);
  return src.slice(idx, next + 1);
}
const selfBlock = extractBlock(bubbleSrc, '.bubble--self');
const peerBlock = extractBlock(bubbleSrc, '.bubble--peer');
assert(selfBlock.includes('var(--bubble-radius-main)'), 'self 主圆角引用 --bubble-radius-main');
assert(selfBlock.includes('var(--bubble-radius-tail)'), 'self 尾巴圆角引用 --bubble-radius-tail');
assert(selfBlock.includes('var(--bubble-shadow)'), 'self 阴影引用 --bubble-shadow');
assert(peerBlock.includes('var(--bubble-radius-main)'), 'peer 主圆角引用 --bubble-radius-main');
assert(peerBlock.includes('var(--bubble-radius-tail)'), 'peer 尾巴圆角引用 --bubble-radius-tail');
assert(peerBlock.includes('var(--bubble-shadow)'), 'peer 阴影引用 --bubble-shadow');

console.log('[verify-bubble-token] design-variables.scss token 定义检查');
const tokenDefs = [
  { def: '--bubble-max-width: 84%', label: '--bubble-max-width: 84%' },
  { def: '--bubble-padding-y: 16rpx', label: '--bubble-padding-y: 16rpx' },
  { def: '--bubble-padding-x: 24rpx', label: '--bubble-padding-x: 24rpx' },
  { def: '--bubble-radius-main: 20rpx', label: '--bubble-radius-main: 20rpx' },
  { def: '--bubble-radius-tail: 4rpx', label: '--bubble-radius-tail: 4rpx' },
  { def: '--bubble-shadow: none', label: '--bubble-shadow: none（统一禁用）' },
  { def: '--bubble-font-size: 30rpx', label: '--bubble-font-size: 30rpx' },
  { def: '--bubble-line-height: 1.6', label: '--bubble-line-height: 1.6' },
  { def: '--bubble-emoji-font-size: 56rpx', label: '--bubble-emoji-font-size: 56rpx' },
  { def: '--bubble-avatar-size: 64rpx', label: '--bubble-avatar-size: 64rpx' },
  { def: '--bubble-avatar-border:', label: '--bubble-avatar-border 定义' },
  { def: '--bubble-status-icon-size: 20rpx', label: '--bubble-status-icon-size: 20rpx' },
];
for (const td of tokenDefs) {
  assert(varsSrc.includes(td.def), `token 定义 ${td.label}`);
}

console.log('');
if (failures > 0) {
  console.error(`[verify-bubble-token] 结果：${failures} 项检查失败`);
  process.exit(1);
}
console.log('[verify-bubble-token] 结果：全部检查通过 ✓（R3.1 代码审查口径满足）');
process.exit(0);
