/**
 * QA 全页面截图脚本（一键补跑）
 *
 * 前置条件（GUI 桌面环境）：
 *   1. 打开微信开发者工具（D:\微信开发者\微信web开发者工具），导入 D:\6\恋爱小程序
 *   2. 微信扫码登录开发者工具账号
 *   3. 「设置 → 安全设置」开启「服务端口」（CLI/HTTP 调用）
 *   4. 启动自动化端口：命令行执行
 *        D:\微信开发者\微信web开发者工具\cli.bat auto --project D:\6\恋爱小程序 --auto-port 9420
 *      （或确保工具内自动化服务已监听 9420）
 *   5. 确认后端运行：http://127.0.0.1:8080/actuator/health 返回 {"status":"UP"}
 *      （后端启动方式见报告/real模式复验指引-2026-08-26.md 或 mock 方式）
 *
 * 执行：
 *   node scripts/qa-full-screenshot.cjs
 *   # 可选：只截指定页面
 *   node scripts/qa-full-screenshot.cjs pages/home/index,pages/chat-session/index
 *
 * 输出：报告/验证截图-2026-08-26/<页面路径>/NN-<说明>.png
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ============ 兼容补丁：miniprogram-automator@0.12.1 vs 开发者工具 2.02.x ============
// 新版开发者工具下 automator 的 checkVersion 拿到的 SDK 版本为 undefined，
// licia/cmpVersion 对 undefined 调用 .split() 崩溃。此处给 cmpVersion 加容错（不改依赖文件）。
// 注：cmpVersion.js 为 `module.exports = fn` 直出函数，须在 automator require 前
// 替换 require.cache 中该模块的 exports（模块缓存共享）。
function resolveLiciaCmpPath() {
  const candidates = [
    'D:/6/恋爱小程序/node_modules/.pnpm/licia@1.41.1/node_modules/licia/cmpVersion.js',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // 兜底：扫描 require.cache 中已加载的 licia/cmpVersion
  for (const key of Object.keys(require.cache)) {
    if (/licia[\\/]cmpVersion\.js$/i.test(key)) return key;
  }
  return null;
}
function patchCmpVersion() {
  const liciaPath = resolveLiciaCmpPath();
  if (!liciaPath) {
    console.warn('[patch-warn] 未找到 licia/cmpVersion，补丁未应用');
    return;
  }
  const safeCmp = function (v1, v2) {
    const a = (v1 == null ? '0.0.0' : String(v1)).split('.');
    const b = (v2 == null ? '0.0.0' : String(v2)).split('.');
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const na = parseInt(a[i] || '0', 10) || 0;
      const nb = parseInt(b[i] || '0', 10) || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  };
  // 先加载该模块进入缓存，再替换导出
  try { require(liciaPath); } catch (_e) {}
  const norm = liciaPath.replace(/\//g, '\\').toLowerCase();
  let hit = false;
  for (const key of Object.keys(require.cache)) {
    if (key.replace(/\//g, '\\').toLowerCase() === norm) {
      require.cache[key].exports = safeCmp;
      hit = true;
    }
  }
  if (!hit) {
    // 直接设置缓存（automator 内部解析会用相同物理路径）
    require.cache[liciaPath] = { id: liciaPath, filename: liciaPath, loaded: true, exports: safeCmp };
    hit = true;
  }
  console.log('[patch] licia/cmpVersion 容错已生效:', liciaPath);
}
try {
  patchCmpVersion();
} catch (e) {
  console.warn('[patch-warn] cmpVersion 补丁未应用:', e && e.message);
}

// 二、patch MiniProgram.checkVersion：新版开发者工具 Tool.getInfo 的 SDKVersion 为
// undefined，automator 会误判"版本过低(<2.7.3)"并 throw。undefined/dev 时静默通过。
try {
  const MINIPROGRAM_PATH = 'D:/6/恋爱小程序/node_modules/.pnpm/miniprogram-automator@0.12.1_supports-color@10.2.2/node_modules/miniprogram-automator/out/MiniProgram.js';
  const MiniProgramMod = require(MINIPROGRAM_PATH);
  const MiniProgramClass = MiniProgramMod.default || MiniProgramMod;
  const proto = MiniProgramClass.prototype;
  if (proto && typeof proto.checkVersion === 'function') {
    const origCheck = proto.checkVersion;
    proto.checkVersion = async function () {
      try {
        const info = await this.send('Tool.getInfo');
        const t = info && (info.SDKVersion || info.sdkVersion);
        if (t == null || t === 'dev') return; // undefined/dev → 跳过版本校验
        const cmp = require(require.resolve('licia/cmpVersion', { paths: [MINIPROGRAM_PATH] }));
        if (cmp(t, '2.7.3') < 0) throw new Error(`SDKVersion is currently ${t}, while automator requires at least version 2.7.3`);
      } catch (e) {
        if (e && /SDKVersion is currently/.test(String(e.message))) throw e;
        // Tool.getInfo 结构异常 → 静默通过（不阻塞截图）
      }
    };
    console.log('[patch] MiniProgram.checkVersion 容错已生效');
  }
} catch (e) {
  console.warn('[patch-warn] checkVersion 补丁未应用:', e && e.message);
}

const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');

const WS_ENDPOINT = process.env.WS_ENDPOINT || 'ws://127.0.0.1:9420';
const OUT_ROOT = path.resolve(__dirname, '../报告/验证截图-2026-08-26');
const WAIT_MS = parseInt(process.env.WAIT_MS || '4000', 10); // 每页导航后等待渲染时间

/** 核心页面截图清单（正常态；如需异常态可追加 query，如未登录/断网需手动切状态） */
const PAGE_PLAN = [
  { path: 'pages/login/index', name: '01-注册登录' },
  { path: 'pages/home/index', name: '02-首页' },
  { path: 'pages/home/index', name: '02b-首页-帖子区(滚动后)', scroll: true },
  { path: 'pages/nearby/index', name: '03-附近' },
  { path: 'pages/nearby/people', name: '03b-附近-附近的人' },
  { path: 'pages/discover/index', name: '04-寻觅' },
  { path: 'pages/village/index', name: '05-帖子流(村口)' },
  { path: 'pages/village/detail?id=1', name: '05b-帖子详情' },
  { path: 'pages/circles/index', name: '06-兴趣圈' },
  { path: 'pages/circles/topics?circleId=1', name: '06b-圈子详情' },
  { path: 'pages/messages/index', name: '07-消息列表' },
  { path: 'pages/chat-session/index', name: '08-聊天气泡(含self/peer同屏)' },
  { path: 'pages/likes/index', name: '09-喜欢' },
  { path: 'pages/profile/index', name: '10-我的主页' },
  { path: 'pages/verification/index', name: '11-认证中心' },
  { path: 'pages/verification/real-name', name: '11b-实名认证' },
  { path: 'pages/discover/matching', name: '12-匹配中' },
  { path: 'pages/discover/match-success', name: '12b-匹配成功' },
  { path: 'pages/search/index', name: '13-搜索' },
  { path: 'pages/security/index', name: '14-安全设置' },
];

/** 过滤命令行指定页面（可选） */
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const only = args.length
  ? new Set(args.flatMap((s) => s.split(',')))
  : null;

async function main() {
  console.log(`[connect] ws=${WS_ENDPOINT}`);
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log('[connected] 已连接自动化服务（若此处卡住/报错，请确认开发者工具已开启自动化端口 9420）');

  const results = [];
  try {
    for (const item of PAGE_PLAN) {
      if (only && !only.has(item.path.split('?')[0])) continue;
      const filePath = `${item.path.split('?')[0]}/${item.name}.png`.replace(/^pages\//, '');
      const abs = path.join(OUT_ROOT, filePath);
      try {
        // 导航：reLaunch(url 字符串)；automator 内部会 sleep 3s 再返回当前页
        let page = null;
        try {
          page = await miniProgram.reLaunch(`/${item.path}`);
        } catch (e) {
          if (/timeout|response/.test(String(e && e.message))) {
            console.warn(`[retry] ${item.path} 首次导航超时，重试中...`);
            await new Promise((r) => setTimeout(r, 5000));
            page = await miniProgram.reLaunch(`/${item.path}`);
          } else {
            throw e;
          }
        }
        await page.waitFor(WAIT_MS);
        if (item.scroll) {
          await page.callMethod('onPullDownRefresh').catch(() => {});
          await page.waitFor(800);
        }
        // 截图：MiniProgram.screenshot() 返回 base64 字符串；导航后模拟器重渲染
        // 窗口内首帧截图易超时，失败自动重试（最多 3 次，间隔 3s）
        let b64 = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            b64 = await miniProgram.screenshot();
            if (b64 && b64.length) break;
          } catch (e) {
            if (attempt === 3) throw e;
            console.warn(`[retry] ${item.path} 截图第${attempt}次超时，重试中...`);
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
        if (!b64 || !b64.length) throw new Error('screenshot 返回空');
        const buf = Buffer.from(b64, 'base64');
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, buf);
        console.log(`[OK] ${item.path} → ${abs} (${buf.length} bytes)`);
        results.push({ page: item.path, status: 'PASS', file: filePath });
      } catch (e) {
        console.error(`[FAIL] ${item.path}: ${e && e.message ? e.message : e}`);
        results.push({ page: item.path, status: 'FAIL', error: e && e.message });
      }
    }
  } finally {
    try { await miniProgram.disconnect(); } catch (e) {}
  }

  // 汇总
  const pass = results.filter((r) => r.status === 'PASS').length;
  console.log(`\n===== 截图汇总：${pass}/${results.length} PASS =====`);
  fs.writeFileSync(
    path.join(OUT_ROOT, 'screenshot-summary.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log(`结果清单：${OUT_ROOT}/screenshot-summary.json`);
  process.exit(pass === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error('[fatal]', e && e.message ? e.message : e);
  console.error('提示：确认开发者工具已登录 + 已开启自动化端口 9420 + 项目已导入');
  process.exit(1);
});
