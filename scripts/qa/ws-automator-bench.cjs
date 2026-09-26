/* WS 采集通道基准：验证 miniprogram-automator 直连 IDE 服务端口（9420，配置文件里那档，
   不走 cli auto --auto-port）能不能替掉 CLI 桥。CLI 的实测单价是断言 0.21s / 截图 2.6s，
   本脚本只报数不改判，跑完把 WS_* 行贴进 notes。 */
const { readFileSync, existsSync, readdirSync, mkdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

function resolveAutomator() {
  try { return require('miniprogram-automator'); } catch { /* fallthrough */ }
  const store = join(process.cwd(), 'node_modules', '.pnpm');
  const hit = readdirSync(store).filter((d) => d.startsWith('miniprogram-automator@')).sort()[0];
  if (!hit) { console.log('WS_RESULT=FAIL reason=pnpm store 里没有 miniprogram-automator'); process.exit(2); }
  return require(join(store, hit, 'node_modules', 'miniprogram-automator'));
}

const argv = process.argv.slice(2);
function opt(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
}
const PORT = Number(opt('port', '9420'));
const PROJECT = opt('project', join(process.cwd(), 'apps/client/dist/build/mp-weixin'));
const REPETITIONS = Number(opt('repeat', '20'));
const SHOTS = Number(opt('shots', '5'));
const OUTDIR = opt('out', join(process.cwd(), '.zcode/tmp/ws-bench'));

const A = resolveAutomator();
const t = () => Number(process.hrtime.bigint() / 100000n) / 1000;

function bemClasses(pageName) {
  const wxmlPath = join(PROJECT, pageName + '.wxml');
  if (!existsSync(wxmlPath)) return { list: [], wxmlPath, present: 0, missing: true };
  const seen = new Set();
  for (const m of readFileSync(wxmlPath, 'utf8').matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) {
      if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*(__|--)[a-z0-9_-]+$/.test(c)) seen.add('.' + c);
    }
  }
  const list = [...seen];
  return { list, wxmlPath, present: list.length, missing: false };
}

async function timed(label, n, fn) {
  const started = t();
  const answers = [];
  let errs = 0;
  for (let i = 0; i < n; i++) {
    try { answers.push(await fn(i)); } catch (e) { errs++; answers.push('ERR:' + String(e && e.message).slice(0, 60)); }
  }
  const elapsed = t() - started;
  console.log('WS_TIMED ' + label + ' n=' + n + ' total=' + elapsed.toFixed(2) + 's per=' +
    (elapsed / n).toFixed(3) + 's err=' + errs);
  return { answers, elapsed, errs };
}

(async () => {
  const startedAt = t();
  let mini;
  try {
    mini = await Promise.race([
      A.connect({ wsEndpoint: 'ws://127.0.0.1:' + PORT }),
      new Promise((_, rj) => setTimeout(() => rj(new Error('CONNECT_TIMEOUT_8S')), 8000)),
    ]);
  } catch (e) {
    console.log('WS_RESULT=FAIL stage=connect port=' + PORT + ' msg=' + String(e && e.message).slice(0, 160));
    process.exit(2);
  }
  console.log('WS_CONNECT ok port=' + PORT + ' ms=' + ((t() - startedAt) * 1000).toFixed(0));

  let page;
  try { page = await mini.currentPage(); } catch (e) { console.log('WS_FAIL stage=currentPage ' + String(e.message).slice(0, 90)); }
  const pagePath = page && page.path;
  const stack = typeof mini.pageStack === 'function' ? await mini.pageStack().catch(() => []) : [];
  console.log('WS_PAGE ' + JSON.stringify({ path: pagePath, stack: (stack || []).map((p) => p.path) }));

  const derived = bemClasses(pagePath || 'pages/discover/index');
  const selectors = derived.list.slice(0, REPETITIONS);
  console.log('WS_SELECTORS from=' + derived.wxmlPath.replace(process.cwd() + '/', '') + ' present=' + derived.present + ' used=' + selectors.length);
  if (!selectors.length) {
    console.log('WS_RESULT=FAIL reason=' + (derived.missing
      ? '产物里根本没有 ' + derived.wxmlPath + ' ⇒ 是 --project 指错了，不是「页面没有类名」，别当 0 命中'
      : (pagePath || '?') + ' 的 wxml 里没找到 BEM 类名 ⇒ 计时没有对象，别当 0 命中'));
    process.exitCode = 2;
    await mini.disconnect().catch(() => {});
    return;
  }

  const single = await timed('page.$(one selector)', selectors.length, (i) => page.$(selectors[i]).then((e) => (e ? 1 : 0)));
  const onesInS = single.answers.filter((x) => x === 1).length;
  console.log('WS_MIX single-hit=' + onesInS + '/' + selectors.length + ' (需要 >0 且 <全部，否则是空对空)');

  const multi = await timed('page.$$(each selector)', Math.min(selectors.length, 10), (i) => page.$$(selectors[i]).then((l) => l.length));
  const dataRead = await timed('page.data(key)', 5, () => page.data(''));
  const wxCall = await timed('mini.callWxMethod(getStorageSync)', 3, () => mini.callWxMethod('getStorageSync', 'token').then((v) => (v ? 1 : 0)));

  let shotOk = 0, shotBytes = 0, shotErr = '';
  if (SHOTS > 0) {
    mkdirSync(OUTDIR, { recursive: true });
    const shot = await timed('mini.screenshot(path)', SHOTS, async (i) => {
      const f = join(OUTDIR, 'shot-' + i + '.png');
      try { await mini.screenshot({ path: f }); } catch (e) { if (!existsSync(f)) throw e; }
      const size = existsSync(f) ? statSync(f).size : 0;
      if (size < 3000) throw new Error('tiny frame ' + size + 'B');
      return size;
    });
    shotErr = shot.answers.find((a) => typeof a === 'string') || '';
    shotOk = shot.answers.filter((a) => typeof a === 'number').length;
    shotBytes = shotOk ? Math.round(shot.answers.filter((a) => typeof a === 'number').reduce((a, b) => a + b, 0) / shotOk) : 0;
    console.log('WS_SHOTS ok=' + shotOk + '/' + SHOTS + ' avgBytes=' + shotBytes + (shotErr ? ' lastErr=' + shotErr : ''));
  }

  const route = await timed('mini.navigateTo(tab)', 2, async (i) => {
    const url = i === 0 ? '/pages/home/index' : '/pages/discover/index';
    await mini.evaluate('function(u){wx.navigateTo({url:u})}', url).then(() => 1);
    return url;
  });
  console.log('WS_ROUTE attempted=' + route.answers.length + ' err=' + route.errs);

  console.log('WS_CLI_BASELINE assertion=0.210s screenshot=2.600s pageOpen=3.200s');
  console.log('WS_RESULT=' + (onesInS > 0 && shotOk > 0 ? 'OK' : 'PARTIAL') +
    ' (query 命中 ' + onesInS + '/' + selectors.length + '，出帧 ' + shotOk + '/' + SHOTS + ')');
  await mini.disconnect().catch(() => {});
})().catch((e) => {
  console.log('WS_RESULT=FAIL stage=uncaught msg=' + String(e && e.message).slice(0, 200));
  process.exit(2);
});
