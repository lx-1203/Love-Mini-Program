const fs = require('fs');
const path = require('path');

const root = 'd:/6/恋爱小程序/apps/client/src';
const results = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const normalized = fullPath.replace(/\\/g, '/');
      if (normalized.includes('/i18n/locales')) continue;
      if (normalized.includes('/tests/')) continue;
      if (normalized.includes('/stories/')) continue;
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.vue') || entry.name.endsWith('.ts'))) {
      // Skip test files and stories files
      if (entry.name.includes('.spec.ts')) continue;
      if (entry.name.includes('.stories.ts')) continue;
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Skip pure comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('<!--') || trimmed.startsWith('*/')) continue;
    if (/^\*\s/.test(trimmed) || /^\*[^/]/.test(trimmed)) continue;
    if (/^\/\*/.test(trimmed)) continue;
    
    // Check for Chinese characters
    const hasChinese = /[\u4e00-\u9fa5]/.test(line);
    if (!hasChinese) continue;
    
    // Remove $t('...') and t('...') calls and check if there's still Chinese
    const stripped = line
      .replace(/\$t\([^)]*\)/g, '')
      .replace(/\bt\(['"][^'"]*['"]\)/g, '');
    
    const strippedHasChinese = /[\u4e00-\u9fa5]/.test(stripped);
    if (!strippedHasChinese) continue;
    
    results.push({ file: filePath, line: i + 1, content: line });
  }
}

scanDir(root);

console.log(`Total files with non-comment Chinese: ${new Set(results.map(r => r.file)).size}`);
console.log(`Total non-comment Chinese lines: ${results.length}`);
console.log('');
console.log('Top 30 files (by full path):');
const grouped = {};
for (const r of results) {
  const shortPath = r.file.replace('d:/6/恋爱小程序/apps/client/src/', '');
  grouped[shortPath] = (grouped[shortPath] || 0) + 1;
}
const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 40);
for (const [file, count] of sorted) {
  console.log(`${file}: ${count}`);
}

// Output first 10 results from chat-session/index.vue
console.log('');
console.log('Sample non-comment Chinese lines from chat-session/index.vue:');
const chatSession = results.filter(r => r.file.includes('chat-session/index.vue')).slice(0, 30);
for (const r of chatSession) {
  console.log(`  L${r.line}: ${r.content.trim().substring(0, 120)}`);
}
