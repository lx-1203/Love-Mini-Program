/* eslint-disable no-console */
/**
 * 小程序全页面截图（2026-08-20）
 *
 * 15 张参考图对应页面/状态的精准截图：
 * - 15 张首屏 + 10 张长页滚动截图
 * - preFetch 支持（village/detail 等带参页）
 * - LONG_PAGES 滚动支持
 * - console error 采集
 *
 * 用法：
 *   node scripts/mp-shoot-2026-08-20.cjs                     # 全部15页
 *   node scripts/mp-shoot-2026-08-20.cjs --only home         # 仅首页
 *   node scripts/mp-shoot-2026-08-20.cjs --dir 2026-08-20-p0-r1  # 指定输出子目录
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ─── 配置 ───────────────────────────────────────────────────────────────────
const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const REPO = 'D:\\6\\恋爱小程序';
const BASE_DIR = path.join(REPO, '截图存档');
const WAIT_FIRST = 9000;   // 首屏等待 9s
const WAIT_SCROLL = 4000;  // 滚动后等待 4s
const SCROLL_TOP = 500;

// ─── 15页映射（修正版）──────────────────────────────────────────────────────
// name: 输出文件名前缀
// url:  页面路由
// desc: 描述
// long: 是否为长页（需要滚动截图）
// preFetch: 是否需要先请求API获取参数
const PAGES = [
  { name: '08-login',          url: '/pages/login/index',               desc: '登录页',           long: false },
  { name: '01-discover',       url: '/pages/discover/index',            desc: '寻觅匹配卡片',     long: true  },
  { name: '02-home',           url: '/pages/home/index',                desc: '首页',             long: true  },
  { name: '03-nearby',         url: '/pages/nearby/index',              desc: '附近首页',         long: true  },
  { name: '04-profile-own',    url: '/pages/profile/index',             desc: '个人主页(已填)',    long: true  },
  { name: '05-notlogged-waiting', url: '/pages/discover/index',         desc: '未登录等待',       long: false, query: '?guest=1' },
  { name: '06-notlogged-profile', url: '/pages/profile/index',          desc: '未登录个人主页',   long: false, query: '?guest=1' },
  { name: '07-messages',       url: '/pages/messages/index',            desc: '消息',             long: true  },
  { name: '09-matching',       url: '/pages/discover/matching',         desc: '匹配中',           long: true  },
  { name: '10-match-success',  url: '/pages/discover/match-success',    desc: '匹配成功',         long: false },
  { name: '11-campus',         url: '/pages/campus/index',              desc: '校园圈',           long: true  },
  { name: '12-circles-index',  url: '/pages/circles/index',             desc: '兴趣圈列表',       long: true  },
  { name: '13-circles-topic',  url: '/pages/circles/topic-detail',      desc: '圈子详情',         long: true  },
  { name: '14-village-detail', url: '/pages/village/detail',            desc: '帖子详情',         long: true, preFetch: true },
  { name: '15-profile-other',  url: '/pages/profile/other',             desc: '他人主页',         long: false },
];

// ─── 工具函数 ───────────────────────────────────────────────────────────────
const ts = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (_) { resolve(data); }
      });
    }).on('error', reject);
  });
}

// ─── preFetch：获取帖子列表第一个ID ─────────────────────────────────────────
async function preFetchPostId() {
  try {
    const data = await httpGet(`${API_BASE}/posts/recent?limit=1`);
    const posts = data?.content || data?.data?.content || data?.list || data?.data?.list || data;
    if (Array.isArray(posts) && posts.length > 0) {
      const id = posts[0].id || posts[0].postId;
      if (id) return String(id);
    }
  } catch (e) {
    console.log(`  [preFetch] 获取帖子ID失败: ${e.message}`);
  }
  return null;
}

// ─── 命令行参数 ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let onlyName = null;
let outSubDir = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--only' && args[i + 1]) onlyName = args[++i];
  if (args[i] === '--dir' && args[i + 1]) outSubDir = args[++i];
}

// ─── 主流程 ─────────────────────────────────────────────────────────────────
const errors = [];

async function main() {
  // 输出目录
  const dirName = outSubDir || '2026-08-20-基线';
  const OUT_DIR = path.join(BASE_DIR, dirName);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 过滤页面
  let pages = PAGES;
  if (onlyName) {
    pages = PAGES.filter((p) => p.name.includes(onlyName));
    if (pages.length === 0) {
      console.error(`[FATAL] 未找到匹配 "${onlyName}" 的页面`);
      process.exit(1);
    }
  }

  console.log(`[${ts()}] 共 ${pages.length} 页，输出: ${OUT_DIR}`);
  console.log(`[${ts()}] 连接 ${WS_ENDPOINT} ...`);

  let mp;
  try {
    mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
    console.log(`[${ts()}] connected`);
  } catch (e) {
    console.error(`[FATAL] 连接失败: ${e.message}`);
    console.error('请确认微信开发者工具已启动且自动化端口9420可用');
    process.exit(1);
  }

  // 采集console错误
  mp.on('console', (msg) => {
    if (!msg || msg.type !== 'error') return;
    const text = String((msg.args || []).map((a) => {
      if (typeof a === 'string') return a;
      if (a && a.value !== undefined) return String(a.value);
      if (a && a.description) return a.description;
      return JSON.stringify(a);
    }).join(' ')).slice(0, 400);
    errors.push({ time: ts(), type: 'console', text });
  });
  mp.on('exception', (err) => {
    errors.push({ time: ts(), type: 'exception', text: String(err && err.message || err).slice(0, 400) });
  });

  const results = [];

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    let pageUrl = p.url;

    // preFetch
    if (p.preFetch) {
      const postId = await preFetchPostId();
      if (postId) {
        pageUrl = `${p.url}?id=${postId}`;
        console.log(`  [preFetch] 帖子ID: ${postId}`);
      } else {
        console.log(`  [preFetch] 失败，使用默认URL`);
      }
    }

    // 完整URL（含query参数）
    if (p.query && !p.preFetch) {
      pageUrl = `${p.url}${p.query}`;
    }

    const fullUrl = pageUrl;
    const t0 = Date.now();
    const icon = '  ';

    console.log(`\n[${ts()}] (${i + 1}/${pages.length}) ${p.desc} → ${fullUrl}`);

    try {
      // reLaunch导航
      await mp.callWxMethod('reLaunch', { url: fullUrl });
      await sleep(WAIT_FIRST);

      // 首屏截图
      const firstPath = path.join(OUT_DIR, `${p.name}.png`);
      await mp.screenshot({ path: firstPath, fullPage: false });
      const firstSize = fs.statSync(firstPath).size;

      console.log(`${icon} 首屏: ${p.name}.png (${(firstSize / 1024).toFixed(1)}KB)`);

      const result = { name: p.name, desc: p.desc, url: fullUrl, ok: true, size: firstSize, newErrors: 0 };

      // 长页滚动截图
      if (p.long) {
        try {
          await mp.callWxMethod('pageScrollTo', { scrollTop: SCROLL_TOP, duration: 0 });
          await sleep(WAIT_SCROLL);

          const scrollPath = path.join(OUT_DIR, `${p.name}-scroll.png`);
          await mp.screenshot({ path: scrollPath, fullPage: false });
          const scrollSize = fs.statSync(scrollPath).size;
          console.log(`${icon} 滚动: ${p.name}-scroll.png (${(scrollSize / 1024).toFixed(1)}KB)`);
          result.scrollSize = scrollSize;
        } catch (scrollErr) {
          console.log(`${icon} 滚动截图失败: ${scrollErr.message}`);
        }
      }

      results.push(result);

    } catch (e) {
      console.error(`${icon} FAILED: ${e.message}`);
      results.push({ name: p.name, desc: p.desc, url: fullUrl, ok: false, error: e.message });

      // 失败重试1次
      try {
        console.log(`  [retry] 重试 ${p.desc}...`);
        await mp.callWxMethod('reLaunch', { url: fullUrl });
        await sleep(WAIT_FIRST + 2000);
        const retryPath = path.join(OUT_DIR, `${p.name}.png`);
        await mp.screenshot({ path: retryPath, fullPage: false });
        const retrySize = fs.statSync(retryPath).size;
        console.log(`${icon} [retry] 首屏: ${p.name}.png (${(retrySize / 1024).toFixed(1)}KB)`);
        // 更新最后一条结果
        results[results.length - 1] = { name: p.name, desc: p.desc, url: fullUrl, ok: true, size: retrySize, retried: true };
      } catch (retryErr) {
        console.error(`  [retry] 重试失败: ${retryErr.message}`);
      }
    }

    // 页面间导航间隔
    await sleep(1000);
  }

  // ─── 汇总 ───────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${ts()}] 截图完成: ${results.length} 页`);
  console.log(`${'='.repeat(60)}`);

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;
  console.log(`成功: ${okCount}  |  失败: ${failCount}  |  Console errors: ${errors.length}`);

  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    const detail = r.ok ? `(${(r.size / 1024).toFixed(1)}KB${r.retried ? ', 重试' : ''})` : r.error;
    console.log(`  ${icon} ${r.desc} (${r.name}): ${detail}`);
  }

  // 写入JSON
  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify({ results, ts: ts() }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify({ errors, ts: ts() }, null, 2), 'utf-8');

  console.log(`\n截图保存: ${OUT_DIR}`);

  try { await mp.disconnect(); } catch (_) { /* ignore */ }
  process.exit(0);
}

process.on('uncaughtException', (e) => { console.error(`[${ts()}] [uncaught]`, e.message); });
process.on('unhandledRejection', (e) => { console.error(`[${ts()}] [unhandled]`, e && e.message ? e.message : e); });
main().catch((e) => { console.error(`[${ts()}] [FATAL]`, e.message); process.exit(1); });
