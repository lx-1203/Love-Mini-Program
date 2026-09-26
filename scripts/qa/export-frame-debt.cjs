/* 从判据台产物里导出"还欠哪些帧"的清单（按页归并），给 ① 的帧级复验直接用。 */
const fs = require('node:fs');
const j = JSON.parse(fs.readFileSync('.zcode/tmp/fixverify/verdicts.json', 'utf8'));
const items = j.items || [];
console.log('ITEM_KEYS ' + Object.keys(items[0] || {}).join(','));
const cnt = {};
for (const x of items) {
  const b = x.bucket || x.verdict || x.state || x.result || '?';
  cnt[b] = (cnt[b] || 0) + 1;
}
console.log('BUCKETS ' + JSON.stringify(cnt));
const KEY = ['bucket', 'verdict', 'state', 'result'].find((k) => items.some((x) => x[k] === 'NEEDS_UI_FRAME'));
console.log('KEY_USED ' + KEY);
const need = items.filter((x) => x[KEY] === 'NEEDS_UI_FRAME');
const byPage = {};
for (const x of need) {
  const p = String(x.laneFile || x.distScope || '?');
  byPage[p] = byPage[p] || { n: 0, ids: [], frames: [], markers: [] };
  byPage[p].n++;
  if (byPage[p].ids.length < 4) byPage[p].ids.push(x.id);
  if (x.frame && byPage[p].frames.length < 2) byPage[p].frames.push(String(x.frame));
  (Array.isArray(x.uiMarkers) ? x.uiMarkers : [x.uiMarkers]).forEach((m) => {
    if (m && byPage[p].markers.length < 3) byPage[p].markers.push(String(m).slice(0, 60));
  });
}
const rows = Object.entries(byPage).sort((a, b) => b[1].n - a[1].n);
const lines = ['# round-7 还欠的渲染帧清单（判据台 NEEDS_UI_FRAME 导出）', '',
  '载体：`scripts/qa/export-frame-debt.cjs`（输入 `.zcode/tmp/fixverify/verdicts.json`，',
  '由 `verify-fixes-against-artifact.cjs --baseline 094f7239` 产出）。**这张表只回答"去哪拍、看什么"，',
  '不代表拍了就能判——判点是否可判要看 §8 的 ⟨⟩ 壳规则；另有 ' + (cnt.UNDECIDABLE || 0) + ' 条判据含糊的在 UNDECIDABLE 桶。', '',
  '| 源文件 | 欠帧条数 | 例子 id | 要求的帧 | 取证类型（uiMarkers 存的是类别，不是画面描述） |', '| --- | --- | --- | --- | --- |'];
for (const [p, v] of rows) {
  lines.push('| `' + p + '` | ' + v.n + ' | ' + v.ids.join(', ') + ' | ' + (v.frames.join(' ; ') || '(判据里没写具体帧名)') + ' | ' + (v.markers.join(' ; ') || '(无 uiMarkers)') + ' |');
}
lines.push('', '合计 ' + need.length + ' 条，跨 ' + rows.length + ' 个源文件。');
fs.writeFileSync('reports/audit/round-7/frame-debt.md', lines.join('\n') + '\n');
console.log('DEBT_WRITTEN reports/audit/round-7/frame-debt.md 源文件=' + rows.length + ' 条=' + need.length);
rows.slice(0, 10).forEach(([p, v]) => console.log('DEBT ' + String(v.n).padStart(3) + ' ' + p + ' :: ' + (v.markers[0] || v.frames[0] || '')));
