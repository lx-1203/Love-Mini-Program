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

/* 第二条欠款：判据含糊（UNDECIDABLE）。这类不能靠拍帧解决——要么把判据写成可判物件，
   要么显式承认它是人判项。导出来是为了让"37 条判据含糊"这句目标话有对应清单。 */
const und = items.filter((x) => x[KEY] === 'UNDECIDABLE');
const why = {};
for (const x of und) {
  const w = String(x.verdictWhy || x.notes || '(判据台没写原因)').replace(/\s+/g, ' ').slice(0, 70);
  why[w] = why[w] || { n: 0, ids: [] };
  why[w].n++;
  if (why[w].ids.length < 3) why[w].ids.push(x.id);
}
const ul = ['# round-7 判据含糊清单（判据台 UNDECIDABLE 导出）', '',
  '载体：`scripts/qa/export-frame-debt.cjs`（同一份 verdicts.json）。',
  '**这一桶不能靠拍帧解决**：要么把判据改写成可判物件（有类名/字面量/资产路径这类能落在产物里的载体），',
  '要么显式承认它是人判项并写清由谁判——留在桶里最糟，因为它看起来像"待办"其实没有可执行的下一步。', '',
  '| 判据台给的原因（截断） | 条数 | 例子 id |', '| --- | --- | --- |'];
Object.entries(why).sort((a, b) => b[1].n - a[1].n).forEach(([w, v]) => {
  ul.push('| ' + w.replace(/\|/g, '\\|') + ' | ' + v.n + ' | ' + v.ids.join(', ') + ' |');
});
ul.push('', '合计 ' + und.length + ' 条，' + Object.keys(why).length + ' 种原因。');
fs.writeFileSync('reports/audit/round-7/criterion-debt.md', ul.join('\n') + '\n');
console.log('CRITERIA_DEBT_WRITTEN reports/audit/round-7/criterion-debt.md 条=' + und.length + ' 原因种类=' + Object.keys(why).length);
/* 同一份数据再落一个 JSON，给分 lane 的改写工作当输入（避免每个 agent 自己 parse markdown） */
fs.writeFileSync('reports/audit/round-7/criterion-debt.json', JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: '.zcode/tmp/fixverify/verdicts.json（--baseline 094f7239）',
  items: und.map((x) => ({ id: x.id, laneFile: x.laneFile, verdictWhy: x.verdictWhy, closerAction: x.closerAction, probes: (x.probes || []).map((p) => (p.kind + ':' + p.token)) })),
}, null, 1) + '\n');
console.log('CRITERIA_DEBT_JSON reports/audit/round-7/criterion-debt.json');
Object.entries(why).sort((a, b) => b[1].n - a[1].n).slice(0, 6).forEach(([w, v]) => console.log('CDBT ' + String(v.n).padStart(3) + ' ' + w));
