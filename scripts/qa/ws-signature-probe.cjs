/* WS 通道两个定生死的量：①同一条 socket 上并发发 N 个查询到底能不能把 0.157s/次摊薄
   （CLI 桥是每次 spawn 一个子进程，物理上不可能并发）；②page.data() 在静态页上会不会自己漂
   （discover 12 帧只有 2 个 hash，得先知道漂移来自数据还是来自 CSS 动画），
   因为「同签名复用帧」这条策略只有在签名能盖住真实像素变化时才允许切默认。 */
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const crypto = require('node:crypto');

function resolveAutomator() {
  try { return require('miniprogram-automator'); } catch { /* fallthrough */ }
  const store = join(process.cwd(), 'node_modules', '.pnpm');
  const hit = readdirSync(store).filter((d) => d.startsWith('miniprogram-automator@')).sort()[0];
  if (!hit) { console.log('SIG_RESULT=FAIL reason=找不到 miniprogram-automator'); process.exit(2); }
  return require(join(store, hit, 'node_modules', 'miniprogram-automator'));
}
const argv = process.argv.slice(2);
function opt(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
}
const PORT = Number(opt('port', '9420'));
const ROUNDS = Number(opt('rounds', '6'));
const GAP = Number(opt('gap', '2500'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t = () => Number(process.hrtime.bigint() / 1000000n);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

(async () => {
  const A = resolveAutomator();
  const mini = await Promise.race([
    A.connect({ wsEndpoint: 'ws://127.0.0.1:' + PORT }),
    new Promise((_, rj) => setTimeout(() => rj(new Error('CONNECT_TIMEOUT')), 8000)),
  ]);
  console.log('SIG_CONNECT ok port=' + PORT);
  const page = await mini.currentPage();
  const selectors = ['.discover-header__tab', '.discover-header__filter', '.zzz-not-real-a', '.zzz-not-real-b',
    '.discover-card', '.zzz-not-real-c', '.discover-header__tab-text', '.discover-empty',
    '.zzz-not-real-d', '.discover-scroll', '.discover-action', '.zzz-not-real-e'];

  let s0 = t();
  for (const sel of selectors) await page.$(sel).catch(() => 'ERR');
  const seqMs = t() - s0;
  s0 = t();
  await Promise.all(selectors.map((sel) => page.$(sel).catch(() => 'ERR')));
  const parMs = t() - s0;
  console.log('SIG_CONCURRENCY n=' + selectors.length + ' sequential=' + seqMs + 'ms(' + (seqMs / selectors.length).toFixed(0) +
    'ms/条) parallel=' + parMs + 'ms(' + (parMs / selectors.length).toFixed(0) + 'ms/条) 提速=' + (seqMs / parMs).toFixed(1) + 'x');
  console.log('SIG_CLI_REF 折叠 CLI 单条=210ms（每条都要 spawn 一个 wechatide 子进程）');

  const sigs = [];
  const dataHashes = [];
  for (let i = 0; i < ROUNDS; i++) {
    const p = await mini.currentPage();
    let d = null, derr = '';
    try { d = await p.data(); } catch (e) { derr = String(e && e.message).slice(0, 50); }
    const json = JSON.stringify(d || null);
    dataHashes.push(sha(json));
    const vec = [];
    for (const sel of selectors) {
      try { const e = await p.$(sel); vec.push(sel + '=' + (e ? 1 : 0)); } catch (e) { vec.push(sel + '=ERR'); }
    }
    sigs.push({ i, dh: sha(json), len: json.length, esig: sha(vec.join('|')), derr });
    console.log('SIG_ROUND ' + JSON.stringify(sigs[i]));
    if (i < ROUNDS - 1) await sleep(GAP);
  }
  const uniqData = new Set(dataHashes);
  const uniqEsig = new Set(sigs.map((s) => s.esig));
  console.log('SIG_ROUNDS=' + ROUNDS + ' 数据签名去重后=' + uniqData.size + ' 元素存在性签名去重后=' + uniqEsig.size);
  if (uniqData.size > 1) {
    const keys = new Set();
    for (let i = 1; i < sigs.length; i++) keys.add('r' + (i - 1) + '→r' + i + ' 整体变（未做逐 key diff，先看规模）');
    console.log('SIG_DRIFT data 在静态页上会漂：' + [...keys].join(' ; ') + ' ⇒ 用 data 当复用键会把同一画面误判成两态，必须逐 key diff 并剔掉计时类字段');
  } else {
    console.log('SIG_DRIFT=none data 全程一致 ⇒ data 可以做复用键（但还要和帧 hash 对得上，见 SIG_CROSSCHECK）');
  }
  console.log('SIG_CROSSCHECK 已知实测：discover 连拍 12 帧只有 2 个唯一 sha256。若这里 data 恒定而帧有 2 个 hash ⇒ 差异来自 CSS 动画/自动轮播，复用键不能只看 data');
  console.log('SIG_RESULT=' + (parMs > 0 && uniqData.size > 0 ? 'OK' : 'FAIL'));
  await (mini.close ? mini.close() : Promise.resolve());
  process.exit(0);
})().catch((e) => {
  console.log('SIG_RESULT=FAIL stage=uncaught msg=' + String(e && e.message).slice(0, 200));
  process.exit(2);
});
