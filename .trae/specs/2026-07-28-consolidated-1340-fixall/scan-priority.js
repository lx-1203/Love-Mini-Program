/**
 * Scan priority page files for non-comment Chinese hardcodes.
 * Outputs per-file count and sample lines for extraction planning.
 */
const fs = require('fs');
const path = require('path');

const root = 'd:/6/恋爱小程序/apps/client/src';
const priorityFiles = [
  'pages/home/index.vue',
  'pages/discover/index.vue',
  'pages/chat/index.vue',
  'pages/profile/index.vue',
  'pages/village/index.vue',
  'pages/vip/index.vue',
  'pages/messages/index.vue',
  'pages/chat-session/index.vue',
  'pages/village/detail.vue',
  'pages/verification/index.vue',
  'subpackages/setup/profile/index.vue',
  'pages/campus/certification.vue',
  'pages/circle/index.vue',
  'pages/village/post.vue',
  'pages/heart-signals/index.vue',
  'pages/village/tag-posts.vue',
  'pages/circles/topic-detail.vue',
  'pages/daily-question/index.vue',
  'pages/shop/index.vue',
  'subpackages/discover/activities/index.vue',
  'components/discover/FilterDrawer.vue',
  'pages/dev/index.vue',
  'pages/campus/post-topic.vue',
  'pages/circles/post-topic.vue',
  'pages/discover/history.vue',
  'pages/campus/index.vue',
  'subpackages/setup/recommend-pref/index.vue',
  'subpackages/support/feedback/index.vue',
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip pure comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('<!--') || trimmed.startsWith('*/')) continue;
    if (/^\*\s/.test(trimmed) || /^\*[^/]/.test(trimmed)) continue;
    if (/^\/\*/.test(trimmed)) continue;
    // Check for Chinese characters
    if (!/[\u4e00-\u9fa5]/.test(line)) continue;
    // Remove $t('...') and t('...') calls
    const stripped = line
      .replace(/\$t\([^)]*\)/g, '')
      .replace(/\bt\(['"][^'"]*['"]\)/g, '');
    if (!/[\u4e00-\u9fa5]/.test(stripped)) continue;
    hits.push({ line: i + 1, content: trimmed.substring(0, 120) });
  }
  return hits;
}

let total = 0;
for (const f of priorityFiles) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) {
    console.log(`${f}: FILE NOT FOUND`);
    continue;
  }
  const hits = scanFile(p);
  total += hits.length;
  console.log(`\n=== ${f}: ${hits.length} lines ===`);
  for (const h of hits.slice(0, 30)) {
    console.log(`  L${h.line}: ${h.content}`);
  }
  if (hits.length > 30) console.log(`  ... and ${hits.length - 30} more`);
}
console.log(`\nTotal priority files non-comment Chinese lines: ${total}`);
