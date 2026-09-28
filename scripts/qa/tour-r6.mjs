/**
 * R2 轮截图巡检（单会话、Suite 化）— tmp/tour-R2.mjs（64 页，由 tour-R1.mjs 派生）
 * 基于 tmp/capture-R1.mjs 的已验证机制（automator SDK / 实测端口 / rebind / blankGuard），
 * 按 R11 §3 扩展状态覆盖：普通页≥1、滚动页≥3（顶/中/底）、核心页≥6、表单页+2。
 *
 * Suite/Checkpoint：13 个 Suite（每 Suite ≤8 页），段间写 tmp/qa/checkpoints/tour-R1.json。
 * UI Lock：tmp/qa/locks/wechat-automation-<port>.lock（port 由 readIdePort() 解析，见 :66 起 fork 改动 1，
 *   与连接的 ws://127.0.0.1:<port> 同源同名 ⇒ 不存在"连着 9431 却在续 9420 的锁"），
 *   本进程 acquire 起锁（起锁前先按 ui-lease.heldLeases 的口径扫全锁目录，别的通道的活租约在 ⇒ 拒起，
 *   见 fork 改动 3）/ 心跳 4s 续租 / 每页每段 touchLock，退出经 finally+SIGINT/SIGTERM+exit 钩子
 *   release 成 status=released 墓碑（不删文件）——语义照 scripts/qa/r1-exec.cjs:116-157，见 UI Lock 块。
 * 三级重置：用例间 LEVEL 0（回顶/恢复 mock/清输入）；LEVEL 1 = 重进当前页；LEVEL 2 = 整机
 *   恢复（simulator_refresh+reconnect+reLaunch），每 Suite ≤1 次（maxReLaunchPerSuite）。
 * 产出：
 *   截图  reports/screenshots/round-2-tour/<A|B>/<SUITE>_<route>_<state>.png
 *   console  reports/audit/round-2/console-evidence.log（每页每态必录）
 *   manifest reports/audit/round-2/screenshot-manifest.json
 *          {gitSha,workflowVersion,buildMode,shots:[{page,path,state,route,gateBypass,...}],
 *           stateNotApplied[],routeDrifts[],permissionSuppression{},captureLimitations{}}
 *   详细 manifest reports/screenshots/round-2-tour/manifest-detail.json（含 identity/bytes/params/hash/宽高/zoomFrames）
 * 运行：node tmp/tour-R2.mjs                全量（A 后 B）
 *       IDENTITIES=A node tmp/tour-R2.mjs   仅 A
 *       SMOKE=1 node tmp/tour-R2.mjs        冒烟（A、2 页）
 *       RESHOOT=tmp/r2-reshoot.tsv node tmp/tour-R2.mjs  定向补拍（TSV: 身份\t路由）
 *       离线路径（都不连端口、不出帧、不写 reports/）：
 *       TOUR_SELFCHECK=1 / TOUR_PRECHECK_ONLY=1 / TOUR_LOCK_PROBE=1 见文件末尾的模式分发；
 *       TOUR_TEARDOWN_PROBE=1 只测「收尾 disconnect + 本轮判决 + 退出码」这一条路径
 *         （FU-8b 验收用；跑它时务必把 TOUR_LOG_NAME 指到 scratch 目录，见该函数注释）。
 *
 * 本轮退出码口径（FU-8b-1/2 之后写死在这里，免得下游猜）：
 *       0 正常出帧且身份相符（TOUR_ADMISSIBLE=yes） 1 预检/落点/致命异常
 *       2 本轮不可采信：0 帧或身份全部被跳过 ⇒ 记 NOT_SHOOTABLE/换载体，不记成跑完
 *       3 LOCK_BUSY
 *
 * 本轮（视觉评审 A-1…A-4）新增开关：
 *       ZOOM=0                 关闭「裁切放大辅助帧」（默认开：核心页 + ZOOM_ROUTES 追加页的每张落盘帧出 3 带）
 *       ZOOM_FACTOR=4          辅助帧整数放大倍率（默认 3，钳在 2..8）
 *       ZOOM_ROUTES=a,b        追加需要出辅助帧的路由前缀
 *       ZOOM_ROI=x,y,w,h,名称  手工指定一个像素 ROI 裁切（覆盖默认 3 带，供字级核对临时用）
 * 代码位置（自查用）：A-1 = 「A-1 抑制原生…」注释块 + armPermissionMocks/save().permSuppressed；
 *   A-2 = [R2-DEDUPE-BEGIN..END] 的 frameHash/decideFrameFiling + save() 的 state-not-applied 分支；
 *   A-3 = probeRoute() + save() 内 shot.route/routeDrift/routeDrifts；A-4 = CAPTURE_LIMITATIONS +
 *   pngDims/recordFrameSize/frameSizeHistogram + emitZoomCrops()。
 *
 * manifest 结构对 §4.4（DW:657）的偏离与向后兼容：
 *   shot 条目仍完整保留 `page` / `path` / `state` 三键原语义、原拼写、原位置；
 *   `route`（A-3）、`contentHash`/`width`/`height`（A-2/A-4）、`permSuppressed`（A-1）等为**追加键**。
 *   消费方 A3 `DW:760` 只校验 gitSha、A6 `DW:728` 只按 page/path/state 三源对照、scribe `DW:1009`
 *   按 path 列清单 —— 追加键不改变既有读取路径，旧消费方可原样解析（JSON 多余字段被忽略）。
 *   新增**顶层**数组 `stateNotApplied[]` / `routeDrifts[]`：既有消费方不读未知顶层键，同样兼容。
 *   ⚠ 配额口径变化：被 A-2 判为「内容与前一帧字节相同」的状态帧**不再按状态名落盘**，
 *     故 R11 §3「核心页 ≥6 张」的计数会比上一轮少——少掉的是假帧，这是修复目标而非回归。
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createHash } from 'crypto';
import { execFile, exec, execSync, spawn, spawnSync } from 'child_process';
// 端口的唯一读法（与 ws-channel-up.mjs / r-exec-ws.mjs / shoot-frameplan.mjs 同一个实现）
import { readIdePort, FALLBACK_PORT } from './ide-port-config.mjs';
// 租约可见性的唯一读法（scripts/qa/ui-lease.mjs 的 heldLeases：扫整目录看有没有"活租约"）。
// 只 import 判定函数，本脚本不因此占任何租约。
import { heldLeases } from './ui-lease.mjs';

// automator SDK 从"跑本脚本的那个 node"的安装目录取：本文件必须用 Node 22 起（PATH 上的 v16 会挂），
// 于是 process.execPath 的同级 node_modules 就是正确答案，不必再写死 D:\codex-tools\...。
const globalRoot = path.join(path.dirname(process.execPath), 'node_modules');
const require2 = createRequire(path.join(globalRoot, 'package.json'));
const automator = require2('miniprogram-automator');

// 绝对路径清零（提交 aefd8a72 那轮定的口径）：仓库根由本文件位置派生，
// 本文件在 scripts/qa/ 下 ⇒ 上两级就是根；换机器/换 checkout 路径不用改代码。
// 刻意不提供 env 覆盖：留一个"忘了设 env 就写到别的目录去"的口子，比写死更危险。
const PROJECT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// IDE CLI 需要指向构建产物自身（含 project.config.json）——root 路径今日被 IDE 判 isMiniAppProject=false，
// DIST 路径为 r13e 同款已验证做法（reports/audit/2026-09-22-r13-goal/r13e-run.log boot-ok）
// 默认为 mock 产物（R2 mock 轮原行为不变）。real 轮用 TOUR_PROJECT 指到
// apps/client/dist/build/mp-weixin-real —— provenance（readBuildFingerprint 从本路径读
// config/env.js 的 MODE）与截图目录标签都随它走，不需要另设一套。
const CLI_PROJECT = process.env.TOUR_PROJECT || 'D:\\6\\恋爱小程序\\apps\\client\\dist\\build\\mp-weixin';
// 证据落点标签：real 轮传 TOUR_LABEL=round-2-real-tour，避免覆盖 mock 轮 254 帧
const TOUR_LABEL = process.env.TOUR_LABEL || 'round-2-tour';
const OUT_DIR = path.join(PROJECT_PATH, 'reports', 'screenshots', TOUR_LABEL);
const LOG_FILE = path.join(PROJECT_PATH, 'tmp', process.env.TOUR_LOG_NAME || 'tour-R2.log');
const AUDIT_DIR = path.join(PROJECT_PATH, 'reports', 'audit', process.env.TOUR_AUDIT_SUB || 'round-2');
const CONSOLE_LOG = path.join(AUDIT_DIR, 'console-evidence.log');
const CKPT_FILE = path.join(PROJECT_PATH, 'tmp', 'qa', 'checkpoints', process.env.TOUR_CKPT_NAME || 'tour-R2.json');
// 【fork 改动 1｜锁名跟着端口走】原 :66 把锁名写死成 wechat-automation-9420.lock，而 WS_ENDPOINT
// 可 env 覆盖 ⇒ 连着 9430 却在续一把 9420 的锁，两个驱动各自认为独占同一 UI 会话。
// v3.2 口径：端口要发现，锁名 = wechat-automation-<port>.lock；端口拿不到就退回 FALLBACK_PORT，
// 但必打一行 TOUR_PORT=<n> source=env|config|default，禁止静默。
// round-7b 的实测教训：本脚本自带一份 `process.env.WS_ENDPOINT || 'ws://127.0.0.1:9420'`，那个 9420
// 是**字面量**、与 scripts/qa/ide-port.json 无关 ⇒ 队列腿不写 env 时它去连一个没人开的端口
// （tour-B-real-stage7 就是这么红的）。现在端口只从 readIdePort() 取（env WSX_PORT/WS_ENDPOINT
// → scripts/qa/ide-port.json → FALLBACK_PORT），与 ws-channel-up.mjs / r-exec-ws.mjs /
// shoot-frameplan.mjs --ws-taps 同一个实现：架通道的那条腿和巡检这条腿不可能再指向两个端口。
// TOUR_LOCK_DIR 仅给离线锁探针用（默认仍是 tmp/qa/locks，与真实巡检同路）。
const LOCK_DIR = path.resolve(process.env.TOUR_LOCK_DIR || path.join(PROJECT_PATH, 'tmp', 'qa', 'locks'));
// 离线锁探针（TOUR_LOCK_PROBE / TOUR_LOCK_SUB）一律用 *-probe.lock，绝不与真实墓碑同名
const LOCK_PROBE_MODE = process.env.TOUR_LOCK_PROBE === '1' || !!process.env.TOUR_LOCK_SUB;
const TOUR_PORT_INFO = readIdePort();
const TOUR_PORT = TOUR_PORT_INFO.port;
// readIdePort 把「连配置文件也读不到」记作 fallback；本脚本对这一档的既有词表是 default ⇒ 只改名，不加逻辑
const TOUR_PORT_SOURCE = TOUR_PORT_INFO.source === 'fallback' ? 'default' : TOUR_PORT_INFO.source;
// 连接端点与锁名同源（host 一律 127.0.0.1，与 r-exec-ws.mjs:86 同形；env 指定的端口已由 readIdePort 解析进 TOUR_PORT）
const WS_ENDPOINT = 'ws://127.0.0.1:' + TOUR_PORT;
const LOCK_RESOURCE = 'wechat-automation-' + TOUR_PORT + (LOCK_PROBE_MODE ? '-probe' : '');
const LOCK_FILE = path.join(LOCK_DIR, LOCK_RESOURCE + '.lock');
console.log('TOUR_PORT=' + TOUR_PORT + ' source=' + TOUR_PORT_SOURCE); // 禁止静默：真实巡检/自检查/探针三条路径都会打
const PARAM_MAP = JSON.parse(fs.readFileSync(path.join(PROJECT_PATH, 'scripts', 'r11-param-map.json'), 'utf8'));
// 【fork 改动 2】本轮 owner（锁生命周期 acquire/release/heartbeat 见下方 UI Lock 块）
const LOCK_OWNER = 'tour-R6-subagent';

// ---- 证据指纹：一律运行期实测，不写死 ----
// 原 defect：`const GIT_SHA = 'aefd8a72'`（HANDOFF 已验证事实节：真实 HEAD 为 18c91ccf），
// 写死值使「证据缓存校验」（.zcode/workflows/miniprogram-qa-loop-v31.dwf.ts:531 以 gitSha 判过期）
// 永不触发，等于伪造 provenance。以下三项全部只读：git 仅 rev-parse/status，构建信息仅读产物文件。
function gitOut(args) {
  try {
    return execSync('git ' + args.join(' '), {
      cwd: PROJECT_PATH, encoding: 'utf8', timeout: 8000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_) { return ''; }
}
// 与 .dwf.ts:611 同法同格式（`git rev-parse --short HEAD`），门禁才能直接字符串比对；取不到记 unknown。
const GIT_SHA = gitOut(['rev-parse', '--short', 'HEAD']) || 'unknown';
// 产物 = HEAD + 未提交业务源码（HANDOFF：apps/ 下 26+ 路径未提交）。只记 gitSha 会被读成
// 「产物等于 HEAD」，故一并记工作树脏度，让下游自行判断证据新鲜度。
const GIT_DIRTY_COUNT = gitOut(['status', '--porcelain', '--', 'apps']).split('\n').filter(Boolean).length;

// buildMode 由**产物自身**反推：读 dist/build/mp-weixin/config/env.js 的 MODE，
// 映射回 apps/client/package.json 里真正跑的那条 script（build:mp-weixin:mock =>
// `uni build --platform mp-weixin --mode mp-weixin-mock`）。读不到即 unknown，不硬贴字符串。
const MODE_TO_SCRIPT = {
  'mp-weixin-mock': 'build:mp-weixin:mock',
  'mp-weixin-showcase': 'build:mp-weixin:showcase',
  'mp-weixin': 'build:mp-weixin',
  'real': 'build:mp-weixin:real',
};
// 【FU-8b-4｜标签必须跟着真正读过的那条路径走】原实现在 read() 里把
// 'apps/client/dist/build/mp-weixin/' 写死两份，于是 real 档读出来的指纹在 manifest 里
// 被标成 mock 档的路径（.zcode/tmp/gap-tourhang/REPORT.md §1 已核对：读的是 CLI_PROJECT 的
// 对文件、标的是错门牌 ⇒ 纯 provenance 标签 bug，不是"读错档"）。这里只换标签，不换读法。
function fingerprintLabel(abs) {
  const rel = path.relative(PROJECT_PATH, abs);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split('\\').join('/');
  return abs.split('\\').join('/'); // 仓库外的产物：留绝对路径，宁可长也不能标错
}
function readBuildFingerprint() {
  const fp = {
    buildMode: 'unknown', mode: 'unknown', apiMode: 'unknown',
    isShowcaseMode: null, membershipEnabled: null, readFrom: [],
  };
  const read = (rel) => {
    const abs = path.join(CLI_PROJECT, rel);
    const label = fingerprintLabel(abs);
    try {
      const s = fs.readFileSync(abs, 'utf8');
      fp.readFrom.push(label);
      return s;
    } catch (_) { fp.readFrom.push(label + ' (读取失败)'); return ''; }
  };
  const grab = (s, re) => { const m = s.match(re); return m ? m[1] : null; };
  const envSrc = read('config/env.js');
  fp.mode = grab(envSrc, /\bMODE:\s*"([^"]*)"/) || 'unknown';
  fp.apiMode = grab(envSrc, /VITE_API_MODE:\s*"([^"]*)"/) || 'unknown';
  // showcase.js 内联了一份 env 副本：无 VITE_SHOWCASE_MODE 键 ⇒ 其 readShowcaseFlag() 恒 false
  const scSrc = read('config/showcase.js');
  const scVal = grab(scSrc, /VITE_SHOWCASE_MODE:\s*"([^"]*)"/);
  fp.isShowcaseMode = scVal === null ? false : (scVal === 'true' || scVal === '1');
  const ffSrc = read('config/feature-flags.js');
  const ffVal = grab(ffSrc, /membershipEnabled:\s*(!0|!1|true|false)/);
  fp.membershipEnabled = ffVal === null ? null : (ffVal === '!0' || ffVal === 'true');
  fp.buildMode = MODE_TO_SCRIPT[fp.mode] || ('mode:' + fp.mode);
  return fp;
}
const BUILD = readBuildFingerprint();
const BUILD_MODE = BUILD.buildMode;

const SMOKE = process.env.SMOKE === '1';
const RESHOOT_FILE = process.env.RESHOOT || '';
const IDENTITIES = (process.env.IDENTITIES || 'A,B').split(',').filter((i) => ['A', 'B'].includes(i));
const NAV_WAIT_MS = 7000;
const BLANK_MIN_BYTES = 12 * 1024;
const SEGMENT_BREATHE_EVERY = 20;
const MAX_RELAUNCH_PER_SUITE = 1;
// 导航落地判定（harness 竞态修复）：登出落地轮询 + 首跳抖动复核 + 至多一次重发，
// 全部为「固定间隔 + 硬上限」，最坏每页多花 ~12s，不会无界等待。
const PATH_POLL_MS = 400;            // 登出落地轮询间隔
const LOGOUT_LANDING = 'pages/login/index'; // services/api.ts logout(): uni.reLaunch(ROUTES.LOGIN)
const LOGOUT_WAIT_MS = NAV_WAIT_MS;  // 登出落地轮询硬上限
const NAV_SETTLE_SAMPLES = 3;        // 落地路径不符时的稳定样本数
const NAV_SETTLE_MS = 700;           // 稳定样本采样间隔

// ============================================================================================
// A-1 抑制原生「获取你的位置信息」等系统授权弹窗（评审 .zcode/tmp/visual-review-R2frames.md:11）
// --------------------------------------------------------------------------------------------
// 原脚本只 mock 了 showModal / showActionSheet / switchTab，原生权限层不经 showModal，
// 故系统弹窗照弹、灰罩压页。本节的 mock 名单**来自本 agent 对 src 与产物的实际 grep**，不是照抄清单：
//   wx.getLocation        ← apps/client/src/utils/location.ts:34（uni.getLocation，type:"gcj02"）
//        上游调用点（唯一 3 处，与产物 dist 递归 grep 结果一致：只有这 3 个页面 js 引用 fetchCurrentLocation）：
//          apps/client/src/pages/home/index.vue:70 与 :249
//          apps/client/src/pages/nearby/index.vue:111
//          apps/client/src/subpackages/profile-extra/profile/location.vue:63
//   wx.chooseLocation     ← apps/client/src/subpackages/profile-extra/profile/location.vue:82
//   wx.authorize          ← apps/client/src/utils/audio-recorder.ts:273（scope:**record**，非定位）
//   wx.getSetting         ← apps/client/src/utils/audio-recorder.ts:264
//   wx.requirePrivacyAuthorize / wx.getPrivacySetting
//                         ← apps/client/src/utils/privacy.ts:257 / :153（ensurePrivacyAuthorized
//                            :344→:358 触发；选图/头像/录音入口调用，如 pages/profile/index.vue:921）
//   wx.onNeedPrivacyAuthorization ← apps/client/src/App.vue:98,106 —— **不 mock**：注册型 API，
//                            替换会让 App.vue 启动分支取不到回调，反而制造新问题。
// 明确**不 mock**（全仓 src grep 零命中，实测计数 0）：
//   wx.getFuzzyLocation、wx.startLocationUpdate、wx.onLocationChange
//   → 本项目没有模糊定位/持续定位代码，给它们写 mock 是无效装饰。
// 弹窗文案锚定：评审转写的弹窗描述「用于展示附近的人、同校匹配与距离信息」逐字来自
//   apps/client/src/manifest.json:39 的 scope.userLocation.desc，且 :42 requiredPrivateInfos=["getLocation"]
//   ⇒ 确证被抑制的这层是 getLocation 触发的 scope.userLocation 授权层，不是应用内自定义弹层。
// 为什么 circles / village 帧也带弹窗（这两页源码 grep 不到任何定位调用）：巡检序 S01(home/nearby)
//   → S03(village) → S04(circles)，S01 触发的原生授权层在模拟器里跨 reLaunch 常驻（reLaunch 只换页面栈、
//   不关原生层）。此条属**推断**，待实测确认。
// 诚实边界：automator 无 handleDialog 一类 API（SDK 表面见 MiniProgram.d.ts），既读不到也不能确认
//   原生弹窗层不存在。这里做的是「让真实 API 永不被调用」+ 逐帧记 permSuppressed 证据标记，
//   **不是**「已断言画面无弹窗」。mockWxMethod 安装失败一律记 failure，绝不静默。
// ============================================================================================
const PERM_MOCKS = [
  {
    method: 'getLocation',
    // 返回真实坐标系内的固定点（杭州），让 home/nearby 的「城市 · 附近」走正常分支而不是兜底文案；
    // 数值是合成的，故逐帧用 permSuppressed 标注，判定员不得据此判定位功能为真。
    fn: function mockGetLocation(opts) {
      var res = { latitude: 30.2741, longitude: 120.1551, speed: 0, accuracy: 30, errMsg: 'getLocation:ok' };
      if (opts) {
        if (opts.success) setTimeout(function () { opts.success(res); }, 0);
        if (opts.complete) setTimeout(function () { opts.complete(res); }, 0);
      }
      return res;
    },
    note: 'wx.getLocation → 固定坐标 lat=30.2741/lng=120.1551（合成值，非真机定位）',
  },
  {
    method: 'chooseLocation',
    // 故意模拟「用户取消」而不是编造一个 POI：原生选点器画面本就无法取证，编造地址会污染证据
    fn: function mockChooseLocation(opts) {
      var res = { errMsg: 'chooseLocation:fail cancel (mocked by tour-R2)' };
      if (opts) {
        if (opts.fail) setTimeout(function () { opts.fail(res); }, 0);
        if (opts.complete) setTimeout(function () { opts.complete(res); }, 0);
      }
      return res;
    },
    note: 'wx.chooseLocation → fail:cancel（不编造选点结果）',
  },
  {
    method: 'authorize',
    fn: function mockAuthorize(opts) {
      var res = { errMsg: 'authorize:ok' };
      if (opts) {
        if (opts.success) setTimeout(function () { opts.success(res); }, 0);
        if (opts.complete) setTimeout(function () { opts.complete(res); }, 0);
      }
      return res;
    },
    note: 'wx.authorize → 直接 success（src 唯一调用点是 scope.record，audio-recorder.ts:273）',
  },
  {
    method: 'getSetting',
    fn: function mockGetSetting(opts) {
      var res = {
        authSetting: { 'scope.userLocation': true, 'scope.record': true },
        globalAuthSetting: { 'scope.userLocation': true },
        errMsg: 'getSetting:ok',
      };
      if (opts && opts.success) setTimeout(function () { opts.success(res); }, 0);
      return res;
    },
    note: 'wx.getSetting → 回报两 scope 已授权（audio-recorder.ts:264 据此跳过 authorize 弹窗）',
  },
  {
    method: 'requirePrivacyAuthorize',
    fn: function mockRequirePrivacyAuthorize(opts) {
      var res = { errMsg: 'requirePrivacyAuthorize:ok' };
      if (opts) {
        if (opts.success) setTimeout(function () { opts.success(res); }, 0);
        if (opts.complete) setTimeout(function () { opts.complete(res); }, 0);
      }
      return res;
    },
    note: 'wx.requirePrivacyAuthorize → 直接同意（privacy.ts:257，避免隐私协议弹窗盖帧）',
  },
  {
    method: 'getPrivacySetting',
    fn: function mockGetPrivacySetting(opts) {
      var res = { needAuthorization: false, privacyVer: 0, errMsg: 'getPrivacySetting:ok' };
      if (opts && opts.success) setTimeout(function () { opts.success(res); }, 0);
      return res;
    },
    note: 'wx.getPrivacySetting → needAuthorization:false（privacy.ts:153，令 ensurePrivacyAuthorized 早退）',
  },
];
const PERM_METHODS = PERM_MOCKS.map((m) => m.method);
// 每项「抑制了什么原生框 + 真实调用点 文件:行号」，逐字写进两份 manifest，判定员不必读脚本即可核名单来源
const PERM_MOCK_NOTES = {
  getLocation: '抑制 wx.getLocation 触发的 scope.userLocation 原生授权框（标题「获取你的位置信息」，'
    + '描述文案实取自 apps/client/src/manifest.json:38-39，:42 requiredPrivateInfos=["getLocation"]）；'
    + '改为直接回固定坐标（合成值）。真实调用点 apps/client/src/utils/location.ts:34（uni.getLocation），'
    + '上游 apps/client/src/pages/home/index.vue:70 与 :249、apps/client/src/pages/nearby/index.vue:111、'
    + 'apps/client/src/subpackages/profile-extra/profile/location.vue:63',
  chooseLocation: '抑制 wx.chooseLocation 原生地图选点框（按「用户取消」返回，不编造 POI）。'
    + '真实调用点 apps/client/src/subpackages/profile-extra/profile/location.vue:82',
  authorize: '抑制 wx.authorize 授权框。本项目唯一调用点申请的是 scope.record（麦克风，不是定位）：'
    + 'apps/client/src/utils/audio-recorder.ts:273',
  getSetting: '抑制「读权限 → 未授权即申请」这条链上的框：apps/client/src/utils/audio-recorder.ts:264 '
    + '读到已授权后就不会再走到 :273',
  requirePrivacyAuthorize: '抑制 wx.requirePrivacyAuthorize 的《用户隐私保护指引》同意框。'
    + '真实调用点 apps/client/src/utils/privacy.ts:257（由 :344 ensurePrivacyAuthorized → :358 触发；'
    + '入口如 apps/client/src/pages/profile/index.vue:921、apps/client/src/utils/media.ts:371）',
  getPrivacySetting: '回报 needAuthorization:false，让 apps/client/src/utils/privacy.ts:153 的检查早退，'
    + '协议框不进取证帧',
};
// 短 note（PERM_MOCKS 自带）与上面的详版 note 合并，同名键以详版为准
const PERM_NOTES = Object.assign(
  Object.fromEntries(PERM_MOCKS.map((m) => [m.method, m.note])), PERM_MOCK_NOTES);
// 本 agent 的 grep 结果留证（写进 manifest，供复核「名单是查出来的、不是照抄的」）
const PERM_GREP_EVIDENCE = {
  'wx.getLocation': 'apps/client/src/utils/location.ts:34（uni.getLocation）→ 产物 apps/client/dist/build/mp-weixin/utils/location.js 内 index.getLocation',
  'wx.chooseLocation': 'apps/client/src/subpackages/profile-extra/profile/location.vue:82',
  'wx.authorize': 'apps/client/src/utils/audio-recorder.ts:273（scope:**record**）',
  'wx.getSetting': 'apps/client/src/utils/audio-recorder.ts:264',
  'wx.requirePrivacyAuthorize': 'apps/client/src/utils/privacy.ts:257',
  'wx.getPrivacySetting': 'apps/client/src/utils/privacy.ts:153',
  'wx.onNeedPrivacyAuthorization': 'apps/client/src/App.vue:98,:106 —— 注册型 API，故意不 mock',
  popupDescSource: 'apps/client/src/manifest.json:38-41（scope.userLocation.desc 与评审转写的弹窗描述逐字一致）',
  distConsumers: '对 apps/client/dist/build/mp-weixin 递归 grep fetchCurrentLocation/chooseLocation/authorize('
    + '：只有 pages/home/index.js、pages/nearby/index.js、subpackages/profile-extra/profile/location.js '
    + '三个消费方（village/circles 产物已一并 grep 过，无定位调用）⇒ 这两页帧上的弹窗是 S01 触发后跨 reLaunch'
    + ' 常驻的原生层（推断，待实测）',
};
const NOT_MOCKED_ABSENT = [
  'wx.getFuzzyLocation（apps/client/src 全仓 grep 命中 0 次）',
  'wx.startLocationUpdate / wx.onLocationChange（命中 0 次）',
];
const CAPTURE_LIMITATIONS = {
  screenshotDprSupported: false,
  apiEvidence: 'miniprogram-automator/out/MiniProgram.d.ts:6-8 `interface IScreenshotOptions { path?: string }`'
    + ' + out/MiniProgram.js `async screenshot(t={}){const{data:e}=await this.send("App.captureScreenshot")`'
    + '（协议调用无参 ⇒ 无 dpr/scale/clip 入口）',
  conclusion: '「以更高 dpr 出图」在本脚本这一侧做不到，已如实记录；给出的替代 = 整数倍最近邻放大的 ROI 裁切辅助帧'
    + '（ZOOM/ZOOM_FACTOR/ZOOM_ROI/ZOOM_ROUTES），主帧仍 1x 原样保留',
  alternativeTruth: '放大不产生新细节（1x 采样丢掉的笔画复原不出来），只把字推到可辨读尺寸；'
    + '真解法是把模拟器切到高 dpr 机型（设备档在 DevTools/CLI 侧，脚本无权改，也未在本轮实测）',
  zoomCropSupported: true,
};
// permState：app 服务进程每重启一次（simulator_refresh / 整机恢复）注入即失效，用 generation 追踪
const permState = {
  generation: 0,
  armedForGeneration: -1,
  armed: {},
  failures: [],
  armCount: 0,
};
// ⚠ mock 函数体经 Function.prototype.toString 序列化后在 app 上下文里重新求值
//   （MiniProgram.js: mockWxMethod(t,e,...i) → isFn(e) ? {method:t, functionDeclaration:e.toString()}），
//   所以以上 fn 体内**不得引用外层变量**，所有字面量必须内联。
async function armPermissionMocks(reason) {
  if (permState.armCount > 0 && permState.armedForGeneration === permState.generation) return;
  permState.armedForGeneration = permState.generation;
  permState.armCount += 1;
  const armedNow = [];
  for (const m of PERM_MOCKS) {
    try {
      await mp.mockWxMethod(m.method, m.fn);
      permState.armed[m.method] = true;
      armedNow.push(m.method);
    } catch (e) {
      permState.armed[m.method] = false;
      const rec = { method: m.method, error: (e && e.message ? e.message : String(e)).slice(0, 160) };
      permState.failures.push(rec);
      log('[perm][WARN] mockWxMethod(' + m.method + ') 安装失败，本代次帧可能被系统授权弹窗污染 —— ' + rec.error);
    }
  }
  log('[perm] 本段已抑制权限弹窗（' + reason + '，gen=' + permState.generation + '）：'
    + (armedNow.length ? armedNow.join(',') : '(无)')
    + (armedNow.length < PERM_MOCKS.length ? '；失败 ' + (PERM_MOCKS.length - armedNow.length) + ' 项' : ''));
  return armedNow;
}
function invalidatePermissionMocks(reason) {
  permState.generation += 1;
  log('[perm] 注入代次作废（' + reason + '）→ gen=' + permState.generation);
}

// ============================================================================================
// A-2 状态帧内容哈希去重（评审：267 帧中 29 组字节完全相同 —— 弹层态==默认 12、空态==默认 8、
// 交互后==默认 4、交互后==弹层态 3、其余 2）—— 以下整块为纯函数，可单独取文本执行自检
// ============================================================================================
// [R2-DEDUPE-BEGIN]
function frameHash(buf) {
  if (!buf || typeof buf.length !== 'number' || buf.length === 0) return '';
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}
// filed = 同页**已真实落盘**的全部帧 [{state, hash}]（也接受单个帧对象，兼容旧调用）；返回本帧处置决定。
// 判等口径 = 整帧字节 sha256 全等（不做感知哈希）：评审的 29 组重复正是「字节完全相同」，
// 全等判据既能精确复现该结论，也不会因阈值调参把「只差 1px 的真状态帧」误杀。
// 【本轮修的取证洞】首版只比**上一张**落盘帧，于是 publish 的
// `默认 → 交互后 → 弹层态` 里"弹层态==默认"永远看不见（相邻两帧不同就不算重复）——
// round-6 重拍实测：新 corpus 里 3 组同字节对（nearby 交互后==默认、post/publish 弹层态==默认）
// 全部漏报，页面自报 state-not-applied 0 条。改成与本页全部已落盘帧比，
// 并记下"和哪几帧同图"，让门禁与巡检用同一个分母。
function decideFrameFiling(filed, buf, state) {
  const hash = frameHash(buf);
  if (!buf || !buf.length) return { action: 'drop-empty', hash: '', state: state };
  const pool = (Array.isArray(filed) ? filed : [filed]).filter(Boolean);
  const hits = pool.filter((f) => f && f.hash && hash && f.hash === hash);
  if (hits.length) {
    return {
      action: 'state-not-applied', hash: hash, state: state,
      dupOf: hits[0].state, dupOfHash: hits[0].hash, dupOfAll: hits.map((h) => h.state),
    };
  }
  return { action: 'save', hash: hash, state: state };
}
// [R2-DEDUPE-END]

// A-3 逐帧落点路由：取 getCurrentPages() 栈顶（不用 currentPage().path —— 跳转在途时它会滞后报旧页，
// 这正是 official-chat「交互后」帧画面实为活动详情页、却按目标页存下来的成因）
async function probeRoute() {
  try {
    const raw = await mp.evaluate(new Function(
      "try { var ps=getCurrentPages(); if(!ps||!ps.length) return 'NONE';" +
      " var out=[]; for(var i=0;i<ps.length;i++){ var p=ps[i];" +
      " out.push(String((p&&(p.route||p.__route__))||'')); }" +
      " return JSON.stringify({top:out[out.length-1], depth:ps.length, stack:out});" +
      "} catch(e){ return 'ERR '+e.message; }"));
    if (typeof raw === 'string' && raw.charAt(0) === '{') {
      const o = JSON.parse(raw);
      return { top: String(o.top || ''), depth: Number(o.depth || 0), stack: o.stack || [], error: '' };
    }
    return { top: '', depth: 0, stack: [], error: String(raw) };
  } catch (e) {
    return { top: '', depth: 0, stack: [], error: (e && e.message ? e.message : String(e)).slice(0, 120) };
  }
}
// 从 PNG IHDR 直读真实像素尺寸（A-4：把分辨率写进每帧证据，不必等人人事后 md5sum 才发现全是 1x）
function pngDims(buf) {
  try {
    if (!buf || buf.length < 24) return null;
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch (_) { return null; }
}
// A-4：全程出图尺寸分布 —— 上一轮「267 帧全是 378×814」这件事是人工统计出来的，现在由脚本自己记
const frameSizeHistogram = {};
function recordFrameSize(dims) {
  const key = dims ? (dims.width + 'x' + dims.height) : 'unknown';
  frameSizeHistogram[key] = (frameSizeHistogram[key] || 0) + 1;
  return frameSizeHistogram;
}

// ============================================================================================
// A-4 字级取证：截图 API 不支持 dpr —— 如实说明做不到，并给出可落地的替代方案（裁切放大辅助帧）
// 证据：miniprogram-automator/out/MiniProgram.d.ts:6-8
//   `interface IScreenshotOptions { path?: string }`；同文件 :41 `screenshot(options?)`
//   且 out/MiniProgram.js 实现为 `async screenshot(t={}){const{data:e}=await this.send(
//   "App.captureScreenshot"); if(!t.path)return e; await fs.writeFile(t.path,e,"base64")}`
//   —— 协议调用**不带任何参数**，没有 dpr / scale / clip / quality 入口。
// ⇒ 「以更高 dpr 出图」在这一侧做不到。本文件实现的替代方案：对已落盘的 1x 原帧做
//   「ROI 裁切 + 整数倍最近邻放大」辅助帧（对应评审自己手工做的 crop-circles-stats.png /
//   crop-village-top.png 那类操作），由 ZOOM 开关控制，默认开、仅核心页的 4 个状态帧出图。
//   诚实边界：放大**不产生新细节**（1x 采样丢掉的笔画复原不出来），只是把字推到可辨读的尺寸；
//   真解法在测试台之外 —— 把模拟器切到高 dpr 机型（设备档由 DevTools/CLI 决定，脚本无权改）。
// ============================================================================================
const ZOOM_ON = process.env.ZOOM !== '0';
const ZOOM_FACTOR = Math.max(2, Math.min(8, Number(process.env.ZOOM_FACTOR || 3) || 3));
let PNG_LIB = null;
let PNG_LIB_TRIED = false;
function loadPng() {
  if (PNG_LIB_TRIED) return PNG_LIB;
  PNG_LIB_TRIED = true;
  try {
    // pngjs 是 miniprogram-automator 自带依赖，按绝对路径取，不新增第三方包
    const mod = require2(path.join(globalRoot, 'miniprogram-automator', 'node_modules', 'pngjs'));
    PNG_LIB = mod && mod.PNG ? mod.PNG : null;
    if (!PNG_LIB) log('[zoom][WARN] pngjs 导出里没有 PNG 构造器，裁切放大辅助帧不可用');
  } catch (e) {
    PNG_LIB = null;
    log('[zoom][WARN] pngjs 加载失败，裁切放大辅助帧不可用: ' + e.message);
  }
  return PNG_LIB;
}
// 辅助帧 ROI 用分数坐标（乘真实宽高）；带位是按评审待核对区域估的**初值、未经运行时校正**，
// 需要精确框时用 ZOOM_ROI=x,y,w,h,名称（像素值）覆盖。
const ZOOM_BANDS = [
  { name: '顶部带', x: 0, y: 0, w: 1, h: 0.14 },   // 标题/胶囊/统计行落位
  { name: '正文带', x: 0, y: 0.3, w: 1, h: 0.3 },  // 卡片正文与 mock 文案
  { name: '底部带', x: 0, y: 0.7, w: 1, h: 0.3 },  // 主 CTA 与底部按钮文字
];
function parseZoomRoi() {
  if (!process.env.ZOOM_ROI) return null;
  const p = String(process.env.ZOOM_ROI).split(',');
  if (p.length < 4) return null;
  return { name: (p[4] || 'roi').trim(), x: Number(p[0]), y: Number(p[1]), w: Number(p[2]), h: Number(p[3]), inPixels: true };
}
// 出辅助帧的页 = 核心页 + ZOOM_ROUTES 追加；与 PAGES 清单在同处求值（见 CORE_ROUTES_SET）
const CORE_ROUTES_SET = new Set();

const AUTH_PAGES = new Set(['pages/login/index', 'pages/register/index', 'pages/register/success']);
// 表单页（+2：校验错误/键盘弹起-输入后）
const FORM_PAGES = new Set([
  'pages/login/index', 'pages/register/index',
  'subpackages/village/village/publish',
  'subpackages/circles/circles/post-topic', 'subpackages/campus/campus/post-topic',
  'subpackages/support/feedback/index', 'subpackages/setup/profile/index',
]);
// 构建开关直达即被 switchTab 弹走的 4 页（分类 BUILD_FLAG_ABSENT；证据为**本 agent 自读源码/产物**，
// 见每项 src/flag 字段）。这 4 条路由在产物 app.json 中**均已注册**（subPackages 合计 72 条路由），
// 页面本身可渲染，只是入口即被编译期开关踢走 —— 故用「导航期屏蔽 wx.switchTab」旁路。
// 仅这几页、仅导航判定期间生效，落地后立即 restore，不影响其它页与页内交互。
// 语义标签：旁路帧只证明「页面能渲染」，不证明开关已开；manifest 逐帧带 gateBypass + 开关实测值。
const GATE_BYPASS_ROUTES = new Map([
  ['subpackages/setup/showcase/index', {
    flag: 'isShowcaseMode', label: '展示模式未开（非 showcase 构建包）',
    flagFile: 'config/showcase.js',
    src: 'apps/client/src/subpackages/setup/showcase/index.vue:156-160 onShow → uni.switchTab(/pages/discover/index)',
    truth: () => BUILD.isShowcaseMode,
  }],
  ['subpackages/vip/index', {
    flag: 'membershipEnabled', label: '会员未开',
    flagFile: 'config/feature-flags.js',
    src: 'apps/client/src/subpackages/vip/index.vue:49-55 guardMembershipDisabled + :57-64 onLoad → :63 uni.switchTab(TAB.PROFILE)',
    truth: () => BUILD.membershipEnabled,
  }],
  ['subpackages/vip/promo-code', {
    flag: 'membershipEnabled', label: '会员未开',
    flagFile: 'config/feature-flags.js',
    src: 'apps/client/src/subpackages/vip/promo-code.vue:33-42 onLoad → :39 uni.switchTab(/pages/profile/index)',
    truth: () => BUILD.membershipEnabled,
  }],
  ['subpackages/vip/bills', {
    flag: 'membershipEnabled', label: '会员未开',
    flagFile: 'config/feature-flags.js',
    src: 'apps/client/src/subpackages/vip/bills.vue:36-45 onLoad → :42 uni.switchTab(/pages/profile/index)',
    truth: () => BUILD.membershipEnabled,
  }],
]);

// ---- 73 页清单（core 以本次 ask 的页面清单为准）----
const PAGES = [
  { route: 'pages/login/index', name: '登录页', core: true, suite: 'S02' },
  { route: 'pages/register/index', name: '注册页', core: true, suite: 'S02' },
  { route: 'pages/register/success', name: '注册成功页', core: true, suite: 'S02' },
  { route: 'pages/home/index', name: '首页（tabBar）', core: true, suite: 'S01' },
  { route: 'pages/nearby/index', name: '附近（tabBar）', core: true, suite: 'S01' },
  { route: 'pages/discover/index', name: '寻觅（tabBar）', core: true, suite: 'S01' },
  { route: 'pages/messages/index', name: '消息（tabBar）', core: true, suite: 'S01' },
  { route: 'pages/profile/index', name: '我的（tabBar）', core: true, suite: 'S01' },
  { route: 'subpackages/village/village/index', name: '村口·社区首页', core: true, suite: 'S03' },
  { route: 'subpackages/village/village/publish', name: '村口·发布帖子', core: true, suite: 'S03' },
  { route: 'subpackages/village/village/post', name: '村口·帖子详情', core: true, suite: 'S03' },
  { route: 'subpackages/village/village/detail', name: '村口·内容详情', core: false, suite: 'S03' },
  { route: 'subpackages/village/village/tag-posts', name: '村口·标签聚合页', core: false, suite: 'S03' },
  { route: 'subpackages/village/village/history', name: '村口·浏览历史', core: false, suite: 'S03' },
  { route: 'subpackages/circles/circles/index', name: '兴趣圈列表', core: true, suite: 'S04' },
  { route: 'subpackages/circles/circles/topics', name: '兴趣圈·话题列表', core: false, suite: 'S04' },
  { route: 'subpackages/circles/circles/topic-detail', name: '兴趣圈·话题详情', core: false, suite: 'S04' },
  { route: 'subpackages/circles/circles/post-topic', name: '兴趣圈·发帖', core: true, suite: 'S04' },
  { route: 'subpackages/circles/circles/circle-home', name: '兴趣圈·圈子主页', core: false, suite: 'S04' },
  { route: 'subpackages/campus/campus/hub', name: '校园圈入口 Hub', core: true, suite: 'S05' },
  { route: 'subpackages/campus/campus/index', name: '校园圈·话题列表', core: true, suite: 'S05' },
  { route: 'subpackages/campus/campus/post-topic', name: '校园圈·发帖', core: true, suite: 'S05' },
  { route: 'subpackages/campus/campus/topic-detail', name: '校园圈·话题详情', core: false, suite: 'S05' },
  { route: 'subpackages/campus/campus/certification', name: '校园认证', core: false, suite: 'S05' },
  { route: 'subpackages/discover-extra/discover/matching', name: '匹配中', core: true, suite: 'S06' },
  { route: 'subpackages/discover-extra/discover/match-success', name: '匹配成功', core: true, suite: 'S06' },
  { route: 'subpackages/discover-extra/home/segment', name: '首页分区页', core: false, suite: 'S06' },
  { route: 'subpackages/discover-extra/nearby/people', name: '附近的人', core: false, suite: 'S06' },
  { route: 'subpackages/discover-extra/discover/history', name: '寻觅历史', core: false, suite: 'S06' },
  { route: 'subpackages/discover-extra/likes/index', name: '收到的喜欢', core: false, suite: 'S06' },
  { route: 'subpackages/discover-extra/likes-visitors/index', name: '喜欢我的/访客', core: false, suite: 'S06' },
  { route: 'subpackages/tools/daily-question/index', name: '每日一问', core: false, suite: 'S07' },
  { route: 'subpackages/tools/love-center/index', name: '恋爱中心', core: false, suite: 'S07' },
  { route: 'subpackages/tools/help/index', name: '帮助中心', core: false, suite: 'S07' },
  { route: 'subpackages/tools/security/index', name: '安全中心', core: false, suite: 'S07' },
  { route: 'subpackages/tools/search/index', name: '搜索', core: false, suite: 'S07' },
  { route: 'subpackages/tools/heart-signals/index', name: '心动信号', core: false, suite: 'S07' },
  { route: 'subpackages/tools/activities/detail', name: '活动详情', core: false, suite: 'S07' },
  { route: 'subpackages/tools/love-center/nearby', name: '恋爱中心·附近', core: false, suite: 'S07' },
  { route: 'subpackages/profile-extra/settings/index', name: '设置', core: false, suite: 'S08' },
  { route: 'subpackages/profile-extra/verification/index', name: '认证中心', core: false, suite: 'S08' },
  { route: 'subpackages/profile-extra/profile/visitors', name: '我的·访客', core: false, suite: 'S08' },
  { route: 'subpackages/profile-extra/feedback/history', name: '反馈历史', core: false, suite: 'S08' },
  { route: 'subpackages/profile-extra/profile/other', name: '他人主页', core: false, suite: 'S09' },
  { route: 'subpackages/profile-extra/profile/location', name: '位置设置', core: false, suite: 'S09' },
  { route: 'subpackages/profile-extra/profile/privacy', name: '隐私设置', core: false, suite: 'S09' },
  { route: 'subpackages/profile-extra/profile/album', name: '我的相册', core: false, suite: 'S09' },
  { route: 'subpackages/profile-extra/profile/favorites', name: '收藏', core: false, suite: 'S09' },
  { route: 'subpackages/profile-extra/profile/tasks', name: '任务', core: false, suite: 'S09' },
  { route: 'subpackages/profile-extra/settings/dnd', name: '免打扰设置', core: false, suite: 'S09' },
  { route: 'subpackages/chat/chat-session/index', name: '聊天会话', core: true, suite: 'S10' },
  { route: 'subpackages/chat/official-chat/index', name: '官方/AI 聊天', core: true, suite: 'S10' },
  { route: 'subpackages/setup/profile/index', name: '资料编辑', core: false, suite: 'S11' },
  { route: 'subpackages/setup/interest/index', name: '兴趣选择', core: false, suite: 'S11' },
  { route: 'subpackages/setup/dev/index', name: '开发调试页（仅 DEV 构建注册，#ifdef DEV）', core: false, suite: 'S11' },
  { route: 'subpackages/setup/showcase/index', name: '全功能展示页', core: false, suite: 'S11' },
  { route: 'subpackages/support/feedback/index', name: '意见反馈', core: false, suite: 'S12' },
  { route: 'subpackages/discover/activities/index', name: '活动列表', core: false, suite: 'S12' },
  { route: 'subpackages/market/detail/index', name: '商品详情', core: false, suite: 'S13' },
  { route: 'subpackages/market/shop/index', name: '商城', core: false, suite: 'S13' },
  { route: 'subpackages/market/wallet/index', name: '钱包', core: false, suite: 'S13' },
  { route: 'subpackages/vip/index', name: 'VIP 会员', core: false, suite: 'S13' },
  { route: 'subpackages/vip/promo-code', name: 'VIP 优惠码', core: false, suite: 'S13' },
  { route: 'subpackages/vip/bills', name: 'VIP 账单', core: false, suite: 'S13' },
  /* §63 补：以下 9 页**在产物 app.json 里存在、却从未出现在 PAGES 里**，
     于是它们在 round-6 巡检中既没有帧、也不进 failures（0 shots / 0 记录）——
     静默的覆盖率洞，比"拍失败了"更糟，因为没有任何一处会报它。
     实测依据：built 72 页 vs tour 规划 64 页；S13 的名字本来就写着「法律/商城/VIP」，
     说明法律两页是本该在此而漏建，不是刻意排除。
     name 一律按路由路径直译，不写我没核过的界面文案。 */
  { route: 'subpackages/tools/love-center/mbti', name: '恋爱中心·mbti 路由页', core: false, suite: 'S07' },
  { route: 'subpackages/tools/love-center/consulting', name: '恋爱中心·consulting 路由页', core: false, suite: 'S07' },
  { route: 'subpackages/profile-extra/verification/real-name', name: '认证·real-name 路由页', core: false, suite: 'S08' },
  { route: 'subpackages/setup/campus/index', name: 'setup·campus 路由页', core: false, suite: 'S11' },
  { route: 'subpackages/setup/schedule/index', name: 'setup·schedule 路由页', core: false, suite: 'S11' },
  { route: 'subpackages/setup/recommend-pref/index', name: 'setup·recommend-pref 路由页', core: false, suite: 'S11' },
  { route: 'subpackages/discover/discussions/index', name: 'discover·discussions 路由页', core: false, suite: 'S12' },
  { route: 'subpackages/legal/privacy/index', name: '法律·隐私政策路由页', core: false, suite: 'S13' },
  { route: 'subpackages/legal/agreement/index', name: '法律·用户协议路由页', core: false, suite: 'S13' },
]

// A-4 出辅助帧的页集合：核心页 + ZOOM_ROUTES 追加前缀（放在 PAGES 之后求值，避免引用未定义）
for (const p of PAGES) if (p.core) CORE_ROUTES_SET.add(p.route);
for (const r of String(process.env.ZOOM_ROUTES || '').split(',')) {
  const t = r.trim();
  if (t) CORE_ROUTES_SET.add(t);
}
function zoomWanted(route) {
  if (CORE_ROUTES_SET.has(route)) return true;
  for (const prefix of CORE_ROUTES_SET) if (route.indexOf(prefix) === 0) return true;
  return false;
}
// 对已取到的 1x 原帧做「ROI 裁切 + 整数倍最近邻放大」，输出 __zoomNx-<带名>.png 辅助帧。
// 返回数组（可为空）；任何失败只记日志，不影响主证据落盘。
function emitZoomCrops(buf, dir, base, state, route, ident, pageRoute, failures) {
  const out = [];
  if (!ZOOM_ON || !buf || !buf.length) return out;
  if (!zoomWanted(pageRoute)) return out;
  const PNG = loadPng();
  if (!PNG) {
    if (!emitZoomCrops._warned) {
      emitZoomCrops._warned = true;
      failures.push({ identity: ident, page: pageRoute, suite: '', severity: 'P3',
        reason: 'A-4 替代方案不可用：pngjs 未能加载，裁切放大辅助帧出不了（主帧仍按 1x 原样落盘）' });
    }
    return out;
  }
  let img;
  try { img = PNG.sync.read(buf); } catch (e) {
    log('[zoom] ' + base + ' ' + state + ' PNG 解码失败，跳过辅助帧: ' + e.message);
    return out;
  }
  const ch = (img.data && img.data.length && img.width * img.height) ? img.data.length / (img.width * img.height) : 4;
  const bands = parseZoomRoi() ? [parseZoomRoi()] : ZOOM_BANDS;
  for (const b of bands) {
    try {
      const sx = b.inPixels ? Math.max(0, Math.floor(b.x)) : Math.max(0, Math.floor(img.width * b.x));
      const sy = b.inPixels ? Math.max(0, Math.floor(b.y)) : Math.max(0, Math.floor(img.height * b.y));
      const sw = Math.max(1, Math.min(img.width - sx, b.inPixels ? Math.floor(b.w) : Math.floor(img.width * b.w)));
      const sh = Math.max(1, Math.min(img.height - sy, b.inPixels ? Math.floor(b.h) : Math.floor(img.height * b.h)));
      if (sw < 1 || sh < 1) continue;
      const w = sw * ZOOM_FACTOR, h = sh * ZOOM_FACTOR;
      const data = Buffer.alloc(w * h * 4);
      for (let y = 0; y < h; y++) {
        const srow = ((sy + ((y / ZOOM_FACTOR) | 0)) * img.width + sx) * ch;
        const drow = y * w * 4;
        for (let x = 0; x < w; x++) {
          const s = srow + ((x / ZOOM_FACTOR) | 0) * ch;
          const d = drow + x * 4;
          data[d] = img.data[s]; data[d + 1] = img.data[s + 1]; data[d + 2] = img.data[s + 2];
          data[d + 3] = ch === 4 ? img.data[s + 3] : 255;
        }
      }
      const enc = PNG.sync.write({ width: w, height: h, data: data, color: { channels: 4 }, fill: true });
      const f = path.join(dir, base + '__' + state + '__zoom' + ZOOM_FACTOR + 'x-' + b.name + '.png');
      fs.writeFileSync(f, enc);
      out.push({
        identity: ident, page: pageRoute, state: state, kind: 'zoom-crop',
        path: path.relative(PROJECT_PATH, f).replace(/\\/g, '/'), bytes: enc.length,
        factor: ZOOM_FACTOR, upscaleAddsDetail: false,
        roi: { x: sx, y: sy, w: sw, h: sh },
        srcDims: { width: img.width, height: img.height }, outDims: { width: w, height: h },
        note: '辅助帧：1x 原帧的整数倍最近邻放大裁切，不产生新细节，不计入 R11 §3 状态配额',
      });
    } catch (e) { log('[zoom] ' + base + ' ' + state + ' 辅助帧失败: ' + e.message); }
  }
  return out;
}

const SUITES = [
  { id: 'S01', name: '主包 tabBar 核心', order: 1 },

  { id: 'S03', name: '村口社区', order: 2 },
  { id: 'S04', name: '兴趣圈', order: 3 },
  { id: 'S05', name: '校园圈', order: 4 },
  { id: 'S06', name: '寻觅扩展', order: 5 },
  { id: 'S07', name: '工具A', order: 6 },
  { id: 'S08', name: '工具B+认证中心', order: 7 },
  { id: 'S09', name: '我的扩展', order: 8 },
  { id: 'S10', name: '聊天', order: 9 },
  { id: 'S11', name: 'setup 分包', order: 10 },
  { id: 'S12', name: '支持/讨论/活动', order: 11 },
  { id: 'S13', name: '法律/商城/VIP', order: 12 },
  { id: 'S02', name: '认证（logout 态，身份段末位）', order: 13 },
];

// ---- 日志 / 锁 / checkpoint ----
function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (_) { /* ignore */ }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ws 层偶发未处理的 error 事件会让进程整体退出（本次长跑实测 B S02 段）——改为记录并继续
process.on('uncaughtException', (e) => { log('[uncaught] ' + (e && e.message ? e.message : String(e))); });
process.on('unhandledRejection', (e) => { log('[unhandledRejection] ' + (e && e.message ? e.message : String(e))); });

/* ================= UI Lock 生命周期（fork 改动 2）=================
 * 原缺陷：本文件只有 touchLock()（读锁→改心跳→写回），**没有 acquire、没有 release、没有信号处理**，
 * 于是巡检退出后锁仍以 LEASED 挂着 → 下一阶段一上来就 LOCK_BUSY 等满租约（本仓已实测吃过）。
 * 下列六个函数逐条照搬 scripts/qa/r1-exec.cjs:116-157 的语义（读锁/写锁/存活检查/获取条件/
 * 同 owner 同进程再获取=续租 / owner 同但 pid 已死=按存活检查接管僵尸租约 / 否则 BUS / 心跳 / 释锁），
 * 仅两处按本轮要求改写：① resource 与锁文件名由发现到的端口派生（fork 改动 1）；
 * ② 释锁写 status=released 墓碑后**不删文件**（r1-exec:154 的 unlinkSync 删的是它自己的锁，
 *   本仓 v3.2 要留墓碑给下游核对，且不删 tmp/qa/locks/ 下任何既有文件）。
 */
let lockHeartbeatTimer = null;
let lockHeldByThisProcess = false;
function readLock() { try { return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')); } catch (_) { return null; } }
function writeLock(patch) {
  const l = Object.assign({}, readLock() || {}, patch, { lastHeartbeat: new Date().toISOString() });
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify(l, null, 1));
  return l;
}
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}
/* 【fork 改动 3｜跨通道互斥】锁名跟着端口走之后，只剩一个方向的门是开的：
   按端口命名的老工具（r-exec.cjs / poll-reshoot）与 ui-lease 的 CLI 档工具（r-exec-cli /
   shoot-frameplan / open-project-window 写的 wechat-automation-cli.lock）**都**会扫全目录看见我的锁，
   但我原来只看自己那一个文件（LOCK_FILE）⇒ 另一个驱动正占着 UI 时，我照样 acquire 成功，
   两边各自认为独占同一会话——正是 §58 的形状（一次并发把 214 行测量打成 58+41 行作废）。
   现在补齐另一个方向：起锁前用同一个判据（ui-lease.heldLeases，"活租约"口径与排队器等 UI 空闲同一条）
   扫一遍锁目录，凡资源名不是本进程这把（LOCK_RESOURCE，含 -probe 后缀）的活租约 ⇒ 拒绝起锁。
   按资源名排除而不是按"探针模式"排除：锁探针摆的"别人的锁"用的就是同一个 resource（tour-r6.mjs 的
   runLockProbe 三处 writeProbeLock 都写 resource: LOCK_RESOURCE），那些用例交给 acquireLock
   原有的"同文件 owner/pid/存活"分支去判，本道门不改变它们的结论。 */
function foreignLiveLease() {
  let hs = [];
  try { hs = heldLeases({ dir: LOCK_DIR }); } catch (e) {
    console.log('[lock] 扫锁目录失败（' + e.message + '）⇒ 按"可能有人在用"处理，拒绝起锁');
    return { file: '(扫描失败)', owner: '?', pid: 0, resource: '?', leaseUntil: '?' };
  }
  const foreign = hs.filter((h) => h.resource !== LOCK_RESOURCE);
  return foreign.length ? foreign[0] : null;
}
function acquireLock() {
  const busy = foreignLiveLease();
  if (busy) {
    console.error('[lock] BUS by 别的驱动：' + JSON.stringify(busy)
      + '（本进程要占的是 ' + LOCK_RESOURCE + '；两条通道驱动同一个模拟器，后到的那个不报错、只换页）');
    return false;
  }
  const l = readLock();
  const t = Date.now();
  if (l && l.status === 'LEASED' && l.leaseUntil && new Date(l.leaseUntil).getTime() + 30000 > t) {
    if (l.owner === LOCK_OWNER && l.pid === process.pid) { writeLock({ leaseUntil: new Date(t + 15 * 60 * 1000).toISOString() }); lockHeldByThisProcess = true; return true; }
    // 本执行器先前进程遗留的锁：owner 相同且旧 pid 已死 → 接管
    if (l.owner === LOCK_OWNER && l.pid && !pidAlive(l.pid)) {
      console.log('[lock] taking over stale own lock from dead pid', l.pid);
      writeLock({ pid: process.pid, leaseUntil: new Date(t + 15 * 60 * 1000).toISOString(), attempt: (l.attempt || 0) + 1, takenOverAt: new Date().toISOString() });
      lockHeldByThisProcess = true; return true;
    }
    console.error('[lock] BUS by', JSON.stringify(l));
    return false;
  }
  writeLock({ resource: LOCK_RESOURCE, owner: LOCK_OWNER, pid: process.pid, batch: 'R6', status: 'LEASED',
    leaseUntil: new Date(t + 15 * 60 * 1000).toISOString(), attempt: ((l && l.attempt) || 0) + 1, acquiredAt: new Date().toISOString() });
  lockHeldByThisProcess = true;
  console.log('[lock] acquired');
  return true;
}
function startLockHeartbeat() {
  if (lockHeartbeatTimer) return;
  lockHeartbeatTimer = setInterval(() => {
    try { const l = readLock(); if (l && l.owner === LOCK_OWNER) writeLock({ leaseUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString() }); } catch (_) { /* ignore */ }
  }, 4000);
  if (lockHeartbeatTimer.unref) lockHeartbeatTimer.unref();
}
function releaseLock() {
  if (lockHeartbeatTimer) { clearInterval(lockHeartbeatTimer); lockHeartbeatTimer = null; }
  const l = readLock();
  if (l && l.owner === LOCK_OWNER) {
    writeLock({ status: 'released', releasedAt: new Date().toISOString() }); // 墓碑，不删文件
    lockHeldByThisProcess = false;
    console.log('[lock] released (tombstone kept: ' + LOCK_FILE + ')');
  }
}
// 释锁挂点：finally（见 main）+ SIGINT/SIGTERM + 任何真实退出（process.on('exit') 覆盖 process.exit
// 与 main().catch）。uncaughtException 仍按 R2 既有语义「记录并继续」，进程活着 ⇒ 锁必须继续持有，
// 否则一次 ws 抖动就把锁放开给第二个驱动；真正退出时由 exit 钩子兜底。
// exit 钩子只释**自己持有的**那把（lockHeldByThisProcess），故 LOCK_BUSY 退出的进程不会去改别人的锁。
process.on('SIGINT', () => { log('[signal] SIGINT → releaseLock'); releaseLock(); process.exit(130); });
process.on('SIGTERM', () => { log('[signal] SIGTERM → releaseLock'); releaseLock(); process.exit(143); });
process.on('exit', () => { if (lockHeldByThisProcess) releaseLock(); });

function touchLock() {
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    if (lock.owner !== LOCK_OWNER || lock.status !== 'LEASED') {
      log('[lock] 异常：锁已被改变 owner=' + lock.owner + ' status=' + lock.status);
      return;
    }
    lock.lastHeartbeat = new Date().toISOString();
    lock.leaseUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));
  } catch (e) { log('[lock] touch 失败: ' + e.message); }
}

/* 连接数体检：跟着**实测端口**走。原样写死 ':9420' 时，一旦 readIdePort 给出的是别的端口，
   这两次取样就恒为 0 行 —— 那不是"没泄漏"，那是没量到。
   匹配口径也一并收紧：`line.includes(':' + port)` 会把 94201/94200 这类"同前缀的别的端口"
   一起算进来（量到的是别人的连接），且会把 UDP 行、协议列外的行都算上。现在按列取端口号整值比对，
   两个方向都看：服务端行（本地列=:port）与我们自己当客户端的行（对端列=:port）。 */
function netstatTourPort() {
  const portStr = String(TOUR_PORT);
  const portOf = (addr) => { const m = /:(\d+)$/.exec(addr || ''); return m ? m[1] : ''; };
  return new Promise((resolve) => {
    exec('netstat -ano', { timeout: 15000 }, (err, stdout) => {
      if (err) return resolve([]);
      const rows = String(stdout).split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).filter((l) => {
        const f = l.split(' ');
        if (f.length < 4 || !/^TCP/i.test(f[0])) return false;
        return portOf(f[1]) === portStr || portOf(f[2]) === portStr;
      });
      resolve(rows);
    });
  });
}

function readCkpt() {
  try { return JSON.parse(fs.readFileSync(CKPT_FILE, 'utf8')); } catch (_) { return null; }
}
function writeCkpt(state) {
  fs.mkdirSync(path.dirname(CKPT_FILE), { recursive: true });
  fs.writeFileSync(CKPT_FILE, JSON.stringify(state, null, 2));
}
function initCkpt() {
  writeCkpt({
    gitSha: GIT_SHA, workflowVersion: '3.1', buildMode: BUILD_MODE,
    startedAt: new Date().toISOString(),
    // 原写死 'tmp/tour-R1.mjs' / 'tour-R1-subagent'：本文件是 R2、锁文件真实 owner 是
    // 'tour-R2-subagent'（touchLock 比对值），旧值属假 provenance。
    script: 'tmp/tour-R2.mjs',
    // fork 改动 1/2：锁记录必须跟着**实测**的端口与 owner，不能再写死 9420/tour-R2-subagent
    lock: { file: path.relative(PROJECT_PATH, LOCK_FILE).replace(/\\/g, '/'), owner: LOCK_OWNER, resource: LOCK_RESOURCE, port: TOUR_PORT, portSource: TOUR_PORT_SOURCE },
    // 工作树相对 HEAD 的脏度与产物指纹：让「gitSha 一致」不被误读成「产物 == HEAD」
    gitWorktreeDirtyPaths: GIT_DIRTY_COUNT,
    buildFingerprint: BUILD,
    maxReLaunchPerSuite: MAX_RELAUNCH_PER_SUITE,
    // A-1…A-4 取证完整性口径（写进检查点，长跑中途可读）
    permissionSuppression: {
      mockMethods: PERM_METHODS, notes: PERM_MOCK_NOTES,
      grepEvidence: PERM_GREP_EVIDENCE, notMockedBecauseAbsent: NOT_MOCKED_ABSENT,
      notMockedOnPurpose: ['wx.onNeedPrivacyAuthorization（注册型 API，替换会让 App.vue:98,:106 的启动分支拿不到回调）'],
      apiCannotAssertNativeDialog: true,
    },
    captureLimitations: Object.assign({}, CAPTURE_LIMITATIONS, { zoomFactor: ZOOM_FACTOR, zoomOn: ZOOM_ON }),
    evidenceSemantics: {
      stateNotApplied: 'A-2：帧内容与同页前一帧字节相同（sha256 全等）→ 不按状态名落盘，记本账；不得计入 R11 §3 状态配额',
      routeDrift: 'A-3：帧画面 getCurrentPages() 栈顶 ≠ 目标页 → 文件名带落点路由、计跳出帧，不算页内状态',
      zoomCrop: 'A-4：1x 原帧的整数倍最近邻放大裁切辅助帧，不产生新细节，不计状态配额',
    },
    suites: {}, failures: [],
  });
}
function markSuite(ckpt, ident, suiteId, patch) {
  const key = ident + ':' + suiteId;
  ckpt.suites[key] = Object.assign({ identity: ident, suite: suiteId }, (ckpt.suites[key] || {}), patch, { updatedAt: new Date().toISOString() });
  writeCkpt(ckpt);
}

// ---- 后端 token 铸造（同 tmp/capture-R1.mjs:150-189）----
function apiPost(jsonPath, payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload || {}), 'utf8');
    const req = http.request({
      host: '127.0.0.1', port: 8080, path: jsonPath, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }, timeout: 15000,
    }, (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('api timeout')));
    req.write(body); req.end();
  });
}
function readACredentials() {
  const src = fs.readFileSync(path.join(PROJECT_PATH, 'tmp', 'r11_chains2.py'), 'utf8');
  const mPhone = src.match(/"phone"\s*:\s*"(\d{11})"/);
  const mPwd = src.match(/"password"\s*:\s*"([^"]+)"/);
  if (!mPhone || !mPwd) throw new Error('cannot read A credentials from tmp/r11_chains2.py');
  return { phone: mPhone[1], password: mPwd[1] };
}
async function mintSession(kind) {
  if (kind === 'A') {
    const cred = readACredentials();
    const r = await apiPost('/api/v1/auth/phone-login', { phone: cred.phone, password: cred.password, deviceId: 'r2-tour-a' });
    if (r.status !== 200) throw new Error('phone-login http ' + r.status + ' ' + r.body.slice(0, 120));
    return JSON.parse(r.body);
  }
  const r = await apiPost('/api/v1/auth/guest-login', {});
  if (r.status !== 200) throw new Error('guest-login http ' + r.status + ' ' + r.body.slice(0, 120));
  return JSON.parse(r.body);
}

// ---- 模拟器刷新（r11 分段起点同款）----
function refreshSimulator() {
  return new Promise((resolve) => {
    // 整机重启会清掉 app 服务进程里的 wx mock（A-1），代次先作废，下次取帧前重注入
    invalidatePermissionMocks('simulator_refresh 前');
    execFile('D:\\微信开发者\\微信web开发者工具\\wechatide.cmd',
      // Node ≥18.19/20+ 起，execFile/spawn 直接跑 .cmd 会被判 spawn EINVAL（CVE-2024-27980 修复），
      // 必须经 shell；clientName 用本会话已授权的 Qoder。
      ['-c', 'Qoder', 'simulator_refresh', '--project', CLI_PROJECT], { timeout: 90000, windows: true, shell: true },
      (err, stdout) => {
        if (err) log('[refresh] simulator_refresh 异常(继续): ' + err.message.slice(0, 100));
        else log('[refresh] ok ' + String(stdout || '').slice(0, 60).replace(/\s+/g, ' '));
        resolve();
      });
  });
}

// ---- 连接管理 ----
let mp = null;
// A-4 证据：连接期实测到的机型档（dpr 由它决定，截图 API 不接受 dpr 参数）
let CONNECT_INFO = null;
let consoleBuffer = [];
function attachConsole(m) {
  m.on('console', (msg) => {
    try {
      const args = (msg && msg.args ? msg.args : []).map((a) => (a && a.value !== undefined ? String(a.value) : String(a)));
      consoleBuffer.push({ type: msg && msg.type, text: args.join(' ').slice(0, 500) });
    } catch (_) { /* ignore */ }
  });
  m.on('exception', (err) => {
    consoleBuffer.push({ type: 'exception', text: (err && err.message ? err.message : String(err)).slice(0, 500) });
  });
}
async function connectDevTools(force) {
  if (mp && !force) { try { await mp.systemInfo(); return mp; } catch (_) { /* stale */ } }
  if (mp) { try { await mp.disconnect(); } catch (_) { /* ignore */ } mp = null; }
  // 断开/重连常落在 app 重启之后，wx 层的 mock 不保证还在 → 代次作废，取帧前统一重注入（A-1）
  invalidatePermissionMocks('connectDevTools');
  for (let i = 1; i <= 5; i++) {
    try {
      log('[connect] #' + i + ' via ' + WS_ENDPOINT);
      mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
      attachConsole(mp);
      const info = await mp.systemInfo();
      // A-4：把设备档的 pixelRatio/视口留证 —— 截图 API 不接受 dpr 参数，画面分辨率只能由机型决定
      CONNECT_INFO = {
        model: info.model, SDKVersion: info.SDKVersion,
        windowWidth: info.windowWidth, windowHeight: info.windowHeight,
        pixelRatio: info.pixelRatio, screenWidth: info.screenWidth, screenHeight: info.screenHeight,
      };
      log('[connect] ok model=' + info.model + ' SDK=' + info.SDKVersion
        + ' window=' + info.windowWidth + 'x' + info.windowHeight + ' dpr=' + info.pixelRatio);
      return mp;
    } catch (e) { log('[connect] 失败 #' + i + ': ' + e.message); mp = null; await sleep(8000); }
  }
  throw new Error('无法连接微信开发者工具（重试 5 次失败）');
}
async function rebindFast() {
  invalidatePermissionMocks('rebindFast');
  try { await mp.disconnect(); } catch (_) { /* ignore */ }
  mp = null;
  for (let i = 1; i <= 2; i++) {
    try {
      mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
      attachConsole(mp);
      await mp.systemInfo();
      // WS 重连后立刻补注入，否则本段后续帧又会带着系统授权层（A-1）
      await armPermissionMocks('rebindFast 之后');
      return;
    } catch (e) { mp = null; await sleep(4000); }
  }
  await connectDevTools(true);
}

/* ============================== TOUR-TEARDOWN-BEGIN ==============================
 * 这两个函数是被离线夹具真跑过的：.zcode/tmp/gap-fu8b/teardown-harness.mjs 按下面这对
 * 标记把本区原文字节切出来、拼上 `let mp = null; const log = …` 的前导再 import，
 * 然后用**真的 miniprogram-automator 套接字**量"断开前 / 断开后"的退出行为。
 * 切法照仓里既有先例：r-exec-ws.mjs 的 WSX-GATE-BEGIN/END + .zcode/tmp/gap-wsx/gate-harness.mjs。
 * 依赖只有模块级的 mp / log 两个名字，别的一律走参数。
 */
/* 【FU-8b-2｜收尾】把"还连着的 ws 客户端"断干净，是让进程能自己退的那半步。
 * 为什么必须显式做：automator 的套接字是 **ref 住的** —— miniprogram-automator@0.12.1
 * out/Connection.js `static create(e){ new ws(e) … }`（没有 unref），out/Transport.js
 * `close(){this.ws.close()}`，out/MiniProgram.js `disconnect(){this.connection.dispose()}`。
 * 于是只要 mp 还连着，事件循环就不会空 ⇒ round-8b 那条腿在 [lock] released 之后又挂了 47 分钟
 * （.zcode/tmp/gap-tourhang/REPORT.md §2），最后是排队器被人手杀才收的口。
 * ⚠ 只调 disconnect()，**绝不调 close()**：MiniProgram.close() 发的是 App.exit + Tool.close，
 * 那会把整个自动化 IDE 实例带走、9420 随之消失（ws-channel-up.mjs:6-9 写的那条实测教训；
 * 本轮读 SDK 源码复核过：close 与 disconnect 是两个东西，之前"这个版本 disconnect 是 undefined"
 * 的说法不成立，见 ws-channel-up.mjs 头注释的更正）。
 * 幂等：mp 为 null 时只留一行痕，异常一律吞掉继续（收尾失败不该盖掉本轮判决）。 */
async function disconnectForExit(tag) {
  if (!mp) { log('[teardown] ' + tag + '：本进程当前没有连接可断'); return false; }
  const m = mp;
  mp = null;
  try {
    await m.disconnect();
    log('[teardown] ' + tag + '：mp.disconnect() 已调用（只关本进程的 ws 客户端，不发 App.exit/Tool.close）');
    return true;
  } catch (e) {
    log('[teardown] ' + tag + '：mp.disconnect() 抛错（忽略，交给退出看门狗）：' + String(e && e.message || e).slice(0, 120));
    return false;
  }
}
/* 显式退出 + 看门狗。为什么两条都要：
 *   · 正常路径只要 disconnectForExit 把最后一个 ref 摘掉，事件循环就自然空了 ⇒ 用
 *     process.exitCode 交码，**不**硬 process.exit，这样 stdout 上没写完的判决行不会被截
 *     （排队器是按管道收本脚本输出的，硬退有截尾风险）。
 *   · 但若还有别的东西 ref 着（新出现的持有所在），自然退出就又会变成那 47 分钟 ⇒ 一个
 *     **unref 的** 3s 看门狗到点硬退并大声说是哪一处，unref 保证它自己不延长进程。 */
function exitNow(code, tag) {
  process.exitCode = code;
  const t = setTimeout(() => {
    console.log('TOUR_EXIT_WATCHDOG ' + tag + '：收尾已 disconnect+releaseLock，但事件循环 3s 后仍未空'
      + '（还有本次没摘掉的 ref 住持有物）⇒ 硬退 exit=' + code + '，请把这一行记进缺陷台账');
    process.exit(code);
  }, 3000);
  if (t.unref) t.unref();
  console.log('TOUR_EXIT code=' + code + ' path=' + tag + '（自然退出为主，3s 看门狗兜底；不硬退是为了不把判决行截在管道里）');
}
/* =============================== TOUR-TEARDOWN-END =============================== */

// ---- App 上下文注入 ----
function makeBootFn(token) {
  return new Function(
    "try { wx.setStorageSync('token', " + JSON.stringify(token) + ");" +
    " var app=getApp(); var vm=app['$vm'];" +
    " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};" +
    " var p=vm['$pinia']||gp['$pinia'];" +
    " var s=p._s.get('session');" +
    " if(s&&s.bootstrap){ s.bootstrap(); } return 'boot-ok'; } catch(e){ return 'ERR '+e.message; }"
  );
}
function makeVerifyFn() {
  return new Function(
    "try { var app=getApp(); var vm=app['$vm'];" +
    " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};" +
    " var p=vm['$pinia']||gp['$pinia'];" +
    " var s=p._s.get('session');" +
    " return s && s.isLoggedIn ? 'logged-in userId=' + (s.userSession&&s.userSession.userId) : 'not-logged-in';" +
    " } catch(e){ return 'ERR '+e.message; }"
  );
}
function makeLogoutFn() {
  return new Function(
    "try { var app=getApp(); var vm=app['$vm'];" +
    " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};" +
    " var p=vm['$pinia']||gp['$pinia']; var s=p._s.get('session');" +
    " if (s && s.logout) { s.logout(); return 'logout-ok'; } return 'no-logout-action';" +
    " } catch(e){ return 'ERR '+e.message; }"
  );
}
async function bootIdentity(m, ident, token) {
  const boot = await m.evaluate(makeBootFn(token));
  log('[boot ' + ident + '] bootstrap: ' + boot);
  await sleep(6000);
  let verify = await m.evaluate(makeVerifyFn());
  if (String(verify).indexOf('logged-in') === -1) {
    log('[boot ' + ident + '] 未建立会话，重试 1 次');
    await sleep(4000);
    await m.evaluate(makeBootFn(token));
    await sleep(6000);
    verify = await m.evaluate(makeVerifyFn());
  }
  const ok = String(verify).indexOf('logged-in') !== -1;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.appendFileSync(path.join(OUT_DIR, 'boot-verify-' + ident + '.log'),
    'boot[' + ident + ']: ' + (ok ? 'ok (' + verify + ')' : 'FAILED (' + verify + ')') + '\n');
  return ok;
}

// ---- 截图（base64 + 白屏守护 3 拍，同 capture-R1 G6 规则）----
// A-2 改造：**先取到内存 buffer 再决定落盘文件名**（原实现边截边写目标名，重复帧会以状态名留在盘上）
async function captureShotBuffer(tag) {
  let best = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let buf = null;
    try {
      const b64 = await mp.screenshot();
      buf = Buffer.from(b64, 'base64');
    } catch (e) {
      log('[shot] 超时/失败 ' + tag + ' attempt ' + attempt + '，重连重试');
      try {
        await connectDevTools(true);
        await sleep(3000);
        // 重连可能跨 app 重启：取帧前把权限 mock 补回来，否则下一帧又被授权层盖住（A-1）
        await armPermissionMocks('shot 重连后');
      } catch (_) { /* 下一轮 */ }
      continue;
    }
    if (buf && buf.length > 0 && (!best || buf.length > best.length)) best = buf;
    if (best && best.length >= BLANK_MIN_BYTES) break;
    log('[shot] 疑似白屏(' + (best ? best.length : 0) + 'B) 第' + attempt + '次 ' + tag);
    await sleep(3000);
  }
  if (!best) return null;
  return { buf: best, bytes: best.length, blankSuspect: best.length < BLANK_MIN_BYTES };
}

function flushConsole(ident, route, state, isNavFail) {
  const issues = consoleBuffer.filter((c) => /NAV_FAIL|TypeError|is not defined/i.test(c.text));
  const status = (issues.length || isNavFail) ? 'ISSUE' : 'clean';
  let line = new Date().toISOString() + '\t' + ident + '\t' + route + '\t' + state + '\t' + status;
  if (issues.length) {
    line += '\t' + issues.slice(0, 2).map((c) => c.text.replace(/\s+/g, ' ').slice(0, 160)).join(' || ');
  }
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.appendFileSync(CONSOLE_LOG, line + '\n');
  consoleBuffer = [];
  return status;
}

// ---- 状态探测 ----
async function probeScroll() {
  try {
    await mp.evaluate(new Function(
      "try { var pages=getCurrentPages(); var pg=pages[pages.length-1]; if(!pg) return 'no-page';" +
      " wx.createSelectorQuery().selectViewport().scrollOffset().exec(function(res){" +
      " getApp()._r1s = res && res[0] ? { scrollTop: res[0].scrollTop, scrollHeight: res[0].scrollHeight } : null; });" +
      " return 'ok'; } catch(e){ return 'ERR '+e.message; }"
    ));
    await sleep(500);
    const raw = await mp.evaluate(new Function("var v=getApp()._r1s; getApp()._r1s=null; return v ? JSON.stringify(v) : 'none';"));
    return JSON.parse(raw);
  } catch (_) { return null; }
}
async function probeContent() {
  // 列表内容计数 + 空态组件存在性 → 数据态/空态 判定
  const listSels = ['.card', '.list-item', '.post-item', '.topic-item', '.msg-item', '.message-item',
    '.user-card', '.feed-card', '.item-card', '.cell', '.topic-card', '.circle-card', '.circle-item', '.goods-card'];
  let listCount = 0, emptySeen = false;
  try {
    const page = await mp.currentPage();
    if (page) {
      for (const sel of listSels) {
        try { const els = await page.$$(sel); if (els && els.length) { listCount += els.length; break; } } catch (_) { /* next */ }
      }
      try { const e = await page.$('[class*="empty"]'); if (e) emptySeen = true; } catch (_) { /* ignore */ }
    }
  } catch (_) { /* ignore */ }
  return { listCount, emptySeen };
}
async function tapSelector(candidates) {
  const page = await mp.currentPage();
  if (!page) return '';
  for (const sel of candidates) {
    try { const el = await page.$(sel); if (el) { await el.tap(); return sel; } } catch (_) { /* try next */ }
  }
  return '';
}
// ---- 落地路径判定（导航竞态修复；一律有界，超时/耗尽样本即返回最后观测值，不挂起长跑）----
async function currentPath() {
  try { const pg = await mp.currentPage(); return pg ? String(pg.path || '') : ''; } catch (_) { return ''; }
}
// 轮询直到当前页路径命中 target，或到 timeoutMs 硬上限
async function waitPath(target, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let p = await currentPath();
  while (p !== target && Date.now() < deadline) { await sleep(PATH_POLL_MS); p = await currentPath(); }
  return p;
}
// 首跳不符时取 NAV_SETTLE_SAMPLES 个稳定样本：任一命中即判成功，否则返回最后一个非空观测路径
async function settlePath(target) {
  let last = '';
  for (let i = 0; i < NAV_SETTLE_SAMPLES; i++) {
    await sleep(NAV_SETTLE_MS);
    const p = await currentPath();
    if (p === target) return p;
    if (p) last = p;
  }
  return last;
}
const TAP_GENERIC = ['.card', '.list-item', '.cell', '.item-card', '.tab-item', '.menu-item', '.nav-item',
  '.msg-item', '.message-item', '.post-item', '.topic-item', '.entry-item', '.grid-item', '.user-card',
  '.feed-card', '.action-btn', '.btn', '.button', 'button',
  '.quick-card', '.assistant-card', '.chat-item', '.activity-rec-card', '.warm-item',
  '[class*="card"]', '[class*="btn"]', '[class*="item"]', '[class*="tab"]', '[class*="entry"]', '[class*="cell"]'];
const TAP_OVERLAY = ['[class*="fab"]', '[class*="filter"]', '[class*="share"]', '[class*="more"]',
  '[class*="popup"]', '[class*="publish-btn"]', '[class*="add-btn"]', '[class*="menu-btn"]', '[class*="overlay-open"]',
  '[class*="float"]', '[class*="expand"]', '[class*="drawer"]', '[class*="sheet"]', '[class*="menu"]'];
const TAP_SUBMIT = ['.btn-submit', '.submit-btn', '[class*="submit"]', '.btn-primary', '.primary-btn', 'button'];

// ---- 单页全状态巡检 ----
async function captureStates(ident, pageDef, url, detail, failures) {
  const base = pageDef.route.replace(/\//g, '_');
  const dir = path.join(OUT_DIR, ident);
  fs.mkdirSync(dir, { recursive: true });
  const tag = ident + ':' + pageDef.route;
  let shots = 0;
  consoleBuffer = [];

  const isAuth = AUTH_PAGES.has(pageDef.route);
  let variant = '';
  if (isAuth) {
    const lo = await mp.evaluate(makeLogoutFn());
    variant = 'logout 后直连';
    log('[auth] ' + tag + ' logout: ' + lo);
    // NAV 竞态修复①：session.logout() → api.logout() 内 uni.reLaunch('/pages/login/index')
    // 与本流程抢发，固定 1500ms 常在登出跳转在途时就发出 reLaunch，落地被登出跳转覆盖。
    // 改为轮询等登出真正落到登录页（上限 LOGOUT_WAIT_MS，未命中也只记日志继续，不阻塞）。
    const landed = await waitPath(LOGOUT_LANDING, LOGOUT_WAIT_MS);
    if (landed !== LOGOUT_LANDING) log('[auth] ' + tag + ' 登出未落地登录页（现 ' + (landed || '(空)') + '），仍继续导航');
  } else {
    const v = await mp.evaluate(makeVerifyFn());
    if (String(v).indexOf('logged-in') === -1) {
      log('[guard] ' + tag + ' 会话丢失，重新 boot（LEVEL 0）');
      await mp.evaluate(makeBootFn(detail.token));
      await sleep(6000);
    }
  }

  let navErr = null;
  let curPath = '';
  // 构建开关旁路：仅本次导航期间屏蔽 switchTab，判定结束立刻 restore（见 GATE_BYPASS_ROUTES）
  const gate = GATE_BYPASS_ROUTES.get(pageDef.route) || null;
  const gateBypass = !!gate;
  const gateNote = gate
    ? gate.label + '（编译开关 ' + gate.flag + '=' + JSON.stringify(gate.truth()) + '，实测自产物 ' + gate.flagFile
      + '；旁路帧仅证明页面可渲染，不证明开关已启用，不得计为验证通过）'
    : null;
  // 屏蔽需可重发：rebindFast() 会断开并重连 WS，若 mock 随之失效，重拍的那一跳又会落地被弹走
  const armSwitchTabBlock = async () => {
    try {
      await mp.mockWxMethod('switchTab', { errMsg: 'switchTab:ok' });
    } catch (e) { log('[gate] ' + tag + ' mockWxMethod(switchTab) 失败(继续): ' + e.message); }
  };
  if (gate) {
    variant = 'flag 旁路：' + gateNote;
    log('[gate] ' + tag + ' 导航期屏蔽 switchTab（开关旁路，帧非「开关已启用」证据）—— ' + gateNote + '；弹跳代码 ' + gate.src);
    await armSwitchTabBlock();
  }
  try {
    // A-1：进页面前把定位/隐私相关的原生弹窗掐在 API 层（home/nearby 的 onLoad 即发 getLocation）
    await armPermissionMocks('进页前 ' + tag);
    try { await mp.reLaunch(url); } catch (e) { navErr = e; }
    await sleep(NAV_WAIT_MS);
    try { await rebindFast(); } catch (e) { log('[rebind] ' + tag + ' 失败: ' + e.message); }
    // rebindFast 会作废旧代次注入，这里幂等补一次（已注入则直接返回）
    await armPermissionMocks('rebind 之后 ' + tag);

    if (!navErr) {
      curPath = await currentPath();
      if (curPath !== pageDef.route) {
        // NAV 竞态修复②：首跳不符先取若干稳定样本复核（瞬态弹跳自行落定的不算失败）
        curPath = await settlePath(pageDef.route);
      }
      if (curPath !== pageDef.route) {
        // 仍不符：原样重发一次同一 reLaunch，再复核一轮，之后才记 ISSUE（全程有界）
        log('[nav] ' + tag + ' 首跳落在 ' + (curPath || '(空)') + ' ≠ 目标，重发一次 reLaunch 复核');
        if (gate) await armSwitchTabBlock();
        try { await mp.reLaunch(url); } catch (e) { log('[nav] ' + tag + ' 重发 reLaunch 失败: ' + e.message); }
        await sleep(NAV_WAIT_MS);
        const retried = await settlePath(pageDef.route);
        if (retried) curPath = retried;
      }
    }
  } finally {
    // 必须成对还原：残留的 switchTab mock 会让后续页的「返回/回 Tab」静默失效，制造假帧
    if (gateBypass) {
      try { await mp.restoreWxMethod('switchTab'); log('[gate] ' + tag + ' switchTab 已还原'); }
      catch (e) { log('[gate][WARN] ' + tag + ' restoreWxMethod(switchTab) 失败，后续 Tab 跳转可能失真: ' + e.message); }
    }
  }
  if (navErr || (curPath !== pageDef.route)) {
    const reason = navErr ? ('reLaunch 失败: ' + navErr.message) : ('落在 ' + (curPath || '(空)') + ' 而非目标页');
    log('[nav] FAIL ' + tag + ' -> ' + reason);
    failures.push({ identity: ident, page: pageDef.route, suite: pageDef.suite, reason, severity: 'P1' });
    flushConsole(ident, pageDef.route, 'NAV', true);
    return 0;
  }

  // ---- 帧落盘统一闸口（A-1 权限标记 / A-2 哈希去重 / A-3 落点路由 / A-4 真实尺寸与辅助帧）----
  // pageFrames: 本页**已真实落盘**帧链，用于「与同页前一帧字节相同」判定
  const pageFrames = [];
  const save = async (state, bufIn, optsIn) => {
    const o = optsIn || {};
    // A-1：每帧落盘前确认注入仍在同一代次（幂等；代次变了才真重注入，正常路径零额外 RPC）
    await armPermissionMocks('帧前 ' + tag + ' ' + state);
    const permArmedList = PERM_METHODS.filter((m) => permState.armed[m] === true);
    const permFailedList = PERM_METHODS.filter((m) => permState.armed[m] !== true);
    let buf = bufIn || null;
    let blankSuspect = false;
    if (!buf) {
      const cap = await captureShotBuffer(tag + '__' + state);
      if (!cap) return 0;
      buf = cap.buf; blankSuspect = cap.blankSuspect;
    }
    // A-3：**每次取完帧立刻**探栈顶路由，保证「画面」与「路由」是同一时刻的事。
    // 交互块在决定文件名前先探了一次（o.preRoute），那只用于选标签，不冒充画面路由。
    const r = await probeRoute();
    // 双源对照：currentPage().path 在跳转在途时会滞后报旧页（official-chat 那帧的成因），
    // 两个来源不一致就把分歧记进证据，而不是让判定员去猜
    const cp = await currentPath();
    const routeDisagree = Boolean(r.top && cp && r.top !== cp);
    const dims = pngDims(buf);
    const decision = decideFrameFiling(pageFrames, buf, state);

    // A-2：与同页前一帧字节相同 → 不按状态名落盘（既不制造假状态帧，也不删已有证据）
    if (decision.action !== 'save') {
      const rec = {
        identity: ident, page: pageDef.route, suite: pageDef.suite, state: state,
        reason: decision.action === 'drop-empty'
          ? '取帧为空缓冲（未落盘）'
          : 'state-not-applied: 「' + state + '」帧内容与本页已落盘帧「' + decision.dupOf + '」字节完全相同'
            + '（sha256:' + decision.hash + '，同图帧=' + (decision.dupOfAll || [decision.dupOf]).join(',') + '）'
            + (o.aliasLabel ? '；本条是「同帧别名标签」，即把默认帧再标一次数据态/空态，不属独立状态变更' : ''),
        action: decision.action === 'drop-empty' ? 'drop-empty' : 'state-not-applied',
        dupOf: decision.dupOf || null, contentHash: decision.hash,
        notSavedAs: base + '__' + state + '.png',
        realContentOfFrame: decision.dupOf || null,
        aliasLabel: !!o.aliasLabel,
        severity: o.aliasLabel ? 'P3' : 'P2',
      };
      if (decision.action === 'state-not-applied') {
        detail.stateNotApplied = detail.stateNotApplied || [];
        detail.stateNotApplied.push(Object.assign({ at: new Date().toISOString() }, rec));
        failures.push(rec);
        log('[dedup] ' + tag + ' ' + rec.reason + ' —— 不按状态名落盘');
      } else {
        failures.push(rec);
        log('[shot] ' + tag + ' 取帧空缓冲，' + state + ' 未落盘');
      }
      return 0;
    }

    const routeDrift = Boolean(r.top && r.top !== pageDef.route);
    const fileState = o.fileState || state;
    const f = path.join(dir, base + '__' + fileState + '.png');
    fs.writeFileSync(f, buf);
    recordFrameSize(dims);   // A-4：出图尺寸分布（只统计真实落盘帧）
    pageFrames.push({ state: state, hash: decision.hash, path: f });
    const shot = {
      page: pageDef.route,
      path: path.relative(PROJECT_PATH, f).replace(/\\/g, '/'),
      state: state,
      identity: ident, bytes: buf.length, params: detail.params, gateBypass, gateNote,
      // ---- 本轮追加键（旧消费方只读 page/path/state，多余键忽略即向后兼容）----
      route: r.top,                       // A-3：画面真实落点路由（取帧后立即 getCurrentPages() 栈顶）
      routeStack: r.stack, routeDepth: r.depth, routeProbeError: r.error || '',
      routeFromCurrentPage: cp,           // A-3：第二来源（SDK currentPage().path）
      routeDisagree: routeDisagree,       // A-3：两来源不一致 = 跳转在途，别把这一帧当稳定页内状态
      routeAtDecision: o.preRoute || undefined, // 交互块决定文件名时看到的路由（可能早于本帧画面）
      routeDrift: routeDrift,             // A-3：true = 这一帧是「跳出到别的页」，非页内状态
      stateFrame: !o.aliasLabel && !routeDrift,  // 是否算一张真正的「该状态」帧
      countsTowardStateQuota: !routeDrift && (o.aliasLabel !== true),
      contentHash: decision.hash,         // A-2：整帧内容哈希，供判定员自行复核是否同图
      width: dims ? dims.width : null, height: dims ? dims.height : null, // A-4：真实出图分辨率
      blankSuspect: blankSuspect,
      // A-1：本帧已抑制权限弹窗的证据标记。语义 = 「让真实授权 API 不被调用」，不是「已断言画面无弹窗」；
      // 原生授权层不经 showModal，automator 也没有读取原生弹窗层的 API，故弹窗是否真的没出现
      // **无法在本侧断言**（permSuppressedUnconfirmed 恒 true），只能靠 mockWxMethod 的安装结果反推。
      permSuppressed: permArmedList.length > 0,
      permMethods: permArmedList,
      permMethodsWanted: PERM_METHODS,
      permSuppressedFailed: permFailedList,
      permSuppressedUnconfirmed: true,
      permGeneration: permState.generation,
      aliasLabel: !!o.aliasLabel,
      interaction: o.action ? { action: o.action, expect: o.expect || '', observedRoute: r.top,
        applied: !routeDrift } : undefined,
      interactionApplied: o.action ? !routeDrift : undefined,
      note: routeDrift
        ? ('本帧画面落在 ' + (r.top || '(未知)') + '，是跳出到别的页，不是 ' + pageDef.route + ' 的页内状态')
        : (o.aliasLabel ? '同帧别名标签：与前一帧同图，仅说明该帧同时呈现了数据态/空态要素' : undefined),
    };
    detail.shots.push(shot);
    shots += 1;
    // A-3：任何一帧只要落点不是目标页，都单独进 routeDrifts 账（判定员据此区分「页内生效」与「跳走了」）
    if (routeDrift) {
      detail.routeDrifts = detail.routeDrifts || [];
      detail.routeDrifts.push({
        at: new Date().toISOString(), identity: ident, page: pageDef.route, suite: pageDef.suite,
        state: state, route: r.top, routeStack: r.stack, framePath: shot.path, action: o.action || null,
        routeFromCurrentPage: cp, routeDisagree: routeDisagree,
        reason: (state + (o.action ? '（' + o.action + '）' : '')) + ' 落点在 ' + r.top
          + '，非目标页 ' + pageDef.route + '（文件名已带落点路由；不得当作页内状态生效证据）',
        severity: 'P3',
      });
    }
    // A-4：字级核对用的「裁切放大辅助帧」——单独记账，不计状态配额
    const crops = emitZoomCrops(buf, dir, base, fileState, r.top, ident, pageDef.route, failures);
    if (crops.length) {
      detail.zoomFrames = detail.zoomFrames || [];
      detail.zoomFrames.push(...crops.map((c) => Object.assign({}, c, { contentHash: frameHash(buf) })));
      shot.zoomCrops = crops.map((c) => c.path);
    }
    return buf.length;
  };
  // 首拍前预热：SDK 重连后立即截图易命令超时（冒烟实测 +24s 惩罚），先等 3s
  await sleep(3000);

  // 1) 默认态 + 数据态/空态 同帧标记
  const content = await probeContent();
  const defaultState = '默认';
  const defaultBuf = await captureShotBuffer(tag + '__' + defaultState);
  let defaultSaved = 0;
  let defaultShotEntry = null;
  if (defaultBuf) {
    const beforeLen = detail.shots.length;
    defaultSaved = await save(defaultState, defaultBuf.buf);
    defaultShotEntry = detail.shots[beforeLen] || null;
    // 数据态/空态在上一轮是「同一帧再起一个名字」，正是 A-2 抓到的 空态==默认(8) 组：
    // 现在照实走同一闸口（必然被判 state-not-applied），同时把真实信息挂在默认帧上。
    if (defaultSaved > 0 && defaultShotEntry) {
      const also = [];
      if (content.listCount > 0) also.push('数据态');
      if (content.emptySeen) also.push('空态');
      if (also.length) {
        // 同帧内容要素，供判定员核对；配额一律只算这一帧（stateFrame:false）
        defaultShotEntry.alsoShows = also;
        defaultShotEntry.stateFrame = false;
        defaultShotEntry.note = '默认帧同时含 ' + also.join('/') + ' 要素（listCount='
          + content.listCount + ' emptySeen=' + content.emptySeen
          + '），数据态/空态不再另起名 —— 见 A-2 内容哈希去重';
      }
    }
    if (content.listCount > 0) await save('数据态', defaultBuf.buf, { aliasLabel: true });
    if (content.emptySeen) await save('空态', defaultBuf.buf, { aliasLabel: true });
  }
  flushConsole(ident, pageDef.route, '默认' + (variant ? '(' + variant + ')' : ''), false);

  // 2) 滚动 中/底（页面级滚动可达才截；LEVEL 0 回顶收尾）
  try {
    const before = await probeScroll();
    const winH = await mp.evaluate(new Function("try { return wx.getSystemInfoSync().windowHeight; } catch(e){ return 0; }"));
    if (before && before.scrollHeight && Number(winH) > 0 && before.scrollHeight > Number(winH) + 100) {
      const maxScroll = before.scrollHeight - winH;
      try { await mp.callWxMethod('pageScrollTo', { scrollTop: Math.floor(maxScroll / 2), duration: 0 }); } catch (_) { /* ignore */ }
      await sleep(1000);
      const mid = await probeScroll();
      if (mid && Number(mid.scrollTop) > 50) { if (await save('滚动-中部') > 0) flushConsole(ident, pageDef.route, '滚动-中部', false); }
      try { await mp.callWxMethod('pageScrollTo', { scrollTop: 99999, duration: 0 }); } catch (_) { /* ignore */ }
      await sleep(1000);
      const bot = await probeScroll();
      if (bot && Number(bot.scrollTop) > Number(mid && mid.scrollTop || 0)) { if (await save('滚动-底部') > 0) flushConsole(ident, pageDef.route, '滚动-底部', false); }
      try { await mp.callWxMethod('pageScrollTo', { scrollTop: 0, duration: 0 }); } catch (_) { /* ignore */ }
      await sleep(500);
    } else {
      log('[scroll] ' + tag + ' 不可滚动（scrollHeight=' + (before && before.scrollHeight) + ' winH=' + winH + '），仅顶帧');
    }
  } catch (e) { log('[scroll] ' + tag + ' 探测异常: ' + e.message); }

  if (!pageDef.core) {
    // 表单页（非核心也补 2 态）
    if (FORM_PAGES.has(pageDef.route)) await formStates(ident, pageDef, tag, save, failures);
    return shots;
  }

  // 3) 交互后（mock 原生弹层自动确认；跳出到别的页时**照实标出落点路由**，见 A-3）
  try {
    try { await mp.mockWxMethod('showModal', { confirm: true, cancel: false, content: 'mock' }); } catch (_) { /* ignore */ }
    try { await mp.mockWxMethod('showActionSheet', { tapIndex: 0 }); } catch (_) { /* ignore */ }
    const tapped = await tapSelector(TAP_GENERIC);
    if (tapped) {
      await sleep(1800);
      const r = await probeRoute();
      const now = r.top;
      if (!now && r.error) log('[tap] ' + tag + ' 取不到栈顶路由（' + r.error + '），按原 currentPage 口径复核');
      if (now === pageDef.route) {
        const sz = await save('交互后', null, { preRoute: r.top, action: 'tap 通用入口 ' + tapped, expect: '页内状态变化' });
        if (sz > 0) flushConsole(ident, pageDef.route, '交互后(tap ' + tapped + ')', false);
      } else if (now) {
        // 评审 A-3 实例（official-chat「交互后」画面实为活动详情页）：跳转是合法行为，但它不是页内
        // 状态 —— 文件名直书落点路由、清单 routeDrift=true 且不计状态配额（save() 里统一记账）。
        const sz = await save('交互后', null, {
          preRoute: r.top, action: 'tap 通用入口 ' + tapped, expect: '页内状态变化（而非跳出）',
          fileState: '交互后-跳出至_' + now.replace(/\//g, '_'),
        });
        if (sz > 0) flushConsole(ident, pageDef.route, '交互后-跳出至' + now + '(tap ' + tapped + ')', false);
      } else { log('[tap] ' + tag + ' 点击 ' + tapped + ' 后取不到落点路由，不保留'); }
    } else { log('[tap] ' + tag + ' 未命中通用选择器，交互后不可达'); }
  } catch (e) { log('[tap] ' + tag + ' 交互异常: ' + e.message); }
  try { await mp.restoreWxMethod('showModal'); } catch (_) { /* ignore */ }
  try { await mp.restoreWxMethod('showActionSheet'); } catch (_) { /* ignore */ }

  // 4) 弹层态（点 overlay 类入口；跳出目标页时同样按落点命名，不再静默丢弃）
  try {
    const hit = await tapSelector(TAP_OVERLAY);
    if (hit) {
      await sleep(1500);
      const r = await probeRoute();
      const now = r.top;
      if (now === pageDef.route) {
        const sz = await save('弹层态', null, { preRoute: r.top });
        if (sz > 0) flushConsole(ident, pageDef.route, '弹层态(tap ' + hit + ')', false);
      } else if (now) {
        // 落点不是目标页：文件名直书落点路由；routeDrifts 账由 save() 统一记（见 A-3）
        const sz = await save('弹层态', null, {
          preRoute: r.top, action: 'tap overlay 入口 ' + hit, expect: '页内弹层（而非跳出）',
          fileState: '弹层态-跳出至_' + now.replace(/\//g, '_'),
        });
        if (sz > 0) flushConsole(ident, pageDef.route, '弹层态-跳出至' + now + '(tap ' + hit + ')', false);
      } else { log('[overlay] ' + tag + ' 点击 ' + hit + ' 后取不到落点路由，不保留'); }
      // LEVEL 0：返回收起弹层（再点一次或返回）
      try { await mp.navigateBack(); } catch (_) { /* ignore */ }
      await sleep(800);
    } else { log('[overlay] ' + tag + ' 未命中 overlay 选择器，弹层态不可达'); }
  } catch (e) { log('[overlay] ' + tag + ' 异常: ' + e.message); }

  // 5) 表单页 +2
  if (FORM_PAGES.has(pageDef.route)) await formStates(ident, pageDef, tag, save, failures);

  return shots;
}

// 表单页：校验错误 + 键盘弹起（输入后；桌面模拟器不渲染软键盘，以输入后状态留证）
async function formStates(ident, pageDef, tag, save, failures) {
  let got = 0;
  try {
    const hit = await tapSelector(TAP_SUBMIT);
    if (hit) {
      await sleep(600); // 校验 toast/行内错误出现
      if (await save('校验错误', null, { action: 'tap 提交按钮 ' + hit, expect: '行内错误/校验 toast' }) > 0) {
        flushConsole(ident, pageDef.route, '校验错误(submit ' + hit + ')', false); got++;
      } else flushConsole(ident, pageDef.route, '校验错误', false);
    } else {
      failures.push({ identity: ident, page: pageDef.route, suite: pageDef.suite, reason: '表单页校验错误态不可达：未命中提交选择器', severity: 'P2' });
      flushConsole(ident, pageDef.route, '校验错误(不可达)', false);
    }
  } catch (e) { log('[form] ' + tag + ' 校验错误异常: ' + e.message); }
  try {
    const page = await mp.currentPage();
    let filled = '';
    if (page) {
      for (const sel of ['input', 'textarea', '[class*="input"] input', '[class*="input"]', 'uni-input input', '.wechat-input-bar input']) {
        try {
          const el = await page.$(sel);
          if (!el) continue;
          await el.input('巡检输入test123');
          filled = sel; break;
        } catch (_) { /* try next selector */ }
      }
    }
    if (filled) {
      await sleep(800);
      if (await save('键盘弹起-输入后', null, { action: 'input 输入框 ' + filled, expect: '输入值上屏（桌面模拟器不渲染软键盘）' }) > 0) {
        flushConsole(ident, pageDef.route, '键盘弹起-输入后(input ' + filled + ')', false); got++;
      }
    } else {
      failures.push({ identity: ident, page: pageDef.route, suite: pageDef.suite, reason: '键盘弹起态不可达：未命中输入框（桌面模拟器不渲染软键盘）', severity: 'P2' });
      flushConsole(ident, pageDef.route, '键盘弹起(不可达)', false);
    }
  } catch (e) { log('[form] ' + tag + ' 键盘弹起异常: ' + e.message); }
  return got;
}

/* ============================ TOUR-ADMISSIBLE-BEGIN ============================
 * 这一区回答的是"这一腿的账能不能入"，不是"产品对不对"。词表与判据照抄本仓已有的同一条门
 * （r-exec-ws.mjs:119-152 的 WSX-GATE 区 classifyBatch()）：
 *   (a) admissible   至少出一帧、且不是所有身份都被跳过 ⇒ TOUR_ADMISSIBLE=yes / exit 0
 *   (c) inadmissible 本轮 0 帧 或 身份全部被跳过 ⇒ TOUR_ADMISSIBLE=no、TOUR_RESULT=FAIL、exit≠0，
 *                    并明写"记 NOT_SHOOTABLE / 换载体，不许记成跑完"
 *                    （口径同 artifact-band.mjs:70「就只能记 NOT_SHOOTABLE，不许记成产品 FAILED」）。
 * 为什么必须有它（round-8b 实测，.zcode/tmp/gap-tourhang/REPORT.md §0）：tour-B-real-r8b 那条腿
 * 在 :1727 的 `continue` 上把唯一那个身份跳过了 ⇒ 0 帧，而当时的 main() 跑完 runTour() 既不写
 * 退出码也不打印结论行 ⇒ 这样一跑**会以 exit=0 收口**，队列把它记成 OK，帧债反而看着像还上了。
 * 判决行一律带 `_RESULT=`，因为消费方 run-ui-queue.mjs:136 只把匹配
 * /_RESULT=|RUNNER_STATS|CONSERVE|LEASE=/ 的行抬进 queue-state.json。
 * 纯函数：输入全靠参数，不读模块级状态、不碰设备 ⇒ 能在 .zcode/tmp/gap-fu8b/ 的离线夹具里
 * 把本区原文字节切出来 import 后正反两向都跑一遍（先例：.zcode/tmp/gap-wsx/gate-harness.mjs）。
 */
export const TOUR_EXIT_INADMISSIBLE = 2; // 与 r-exec-ws.mjs:152 classifyBatch().exit 同一个数
export function tourAdmissibility({ shots = 0, identities = [], skipped = [], band = 'unknown', project = '', label = '' } = {}) {
  const identCount = (identities || []).length;
  const skipList = (skipped || []).map((s) => (s && s.ident) || String(s));
  const skippedAll = identCount > 0 && skipList.length >= identCount;
  const noFrames = !(shots > 0);
  const admissible = !noFrames && !skippedAll;
  const lines = [];
  lines.push('TOUR_STATS 身份=' + identCount + (identCount ? '(' + identities.join(',') + ')' : '')
    + ' 被跳过=' + skipList.length + (skipList.length ? '(' + skipList.join(',') + ')' : '')
    + ' 帧=' + shots + ' band=' + band + ' label=' + label);
  const who = skipList.length ? '身份 ' + skipList.join(',') + ' 在帧前复核处被跳过' : '没有身份被跳过';
  const why = noFrames && skippedAll
    ? who + '，本轮 0 帧：这一腿什么都没量到'
    : noFrames ? '所有身份都跑到了帧前复核之后，仍然 0 帧' : who + ' ⇒ 帧数不足以冒充' + (identCount > 1 ? '双' : '') + '身份巡检';
  lines.push('TOUR_ADMISSIBLE=' + (admissible ? 'yes' : 'no') + ' '
    + (admissible
      ? (skipList.length ? '有帧入账，但缺的身份不许按双身份读（产物目录 ' + project + '）' : '有帧且身份相符 ⇒ 可入账（产物目录 ' + project + '）')
      : '本轮没产出任何可采信的帧 ⇒ 记 NOT_SHOOTABLE/换载体，不许记成跑完，更不许记成产品 FAILED'
        + '（口径同 r-exec-ws.mjs:141 WSX_ADMISSIBLE=no / artifact-band.mjs:70；产物档=' + band + ' 目录=' + project + '）'));
  lines.push('TOUR_RESULT=' + (admissible ? 'OK' : 'FAIL') + ' reason=' + why
    + ' ⇒ TOUR_ADMISSIBLE=' + (admissible ? 'yes' : 'no') + '（exit=' + (admissible ? 0 : TOUR_EXIT_INADMISSIBLE) + '）');
  return { admissible, noFrames, skippedAll, shots, skipped: skipList, exit: admissible ? 0 : TOUR_EXIT_INADMISSIBLE, lines };
}
/* ============================= TOUR-ADMISSIBLE-END ============================ */

// ---- 主流程 ----
// fork 改动 2：真实巡检先 acquire 再起流程（r1-exec:1569 同法：拿不到锁即 LOCK_BUSY + exit 3）、
// startLockHeartbeat 每 4s 续租（r1-exec:1570）、释锁挂 finally（r1-exec:1592）。
// 原 main() 主体一字不动，仅改名为 runTour()。
/* RESHOOT 计划面的预检（必须在 acquireLock 之前 —— 预检不过就不该占租约，见 main 第一行）。
   为什么需要：:1498 的过滤是 PAGES.filter(...)，TSV 里写了 tour 没规划的页面会被**静默丢掉**，
   原来只留一句裸数 `待补拍组合 N 页`，没有对照物。台账 §58 洞 A。 */
function precheckReshootPlan() {
  /* 落点面：这个 fork 的四个默认值全指向 round-2（TOUR_LABEL=round-2-tour /
     TOUR_AUDIT_SUB=round-2 / TOUR_LOG_NAME=tour-R2.log / TOUR_CKPT_NAME=tour-R2.json），
     而本文件叫 tour-r6。定向补拍某一轮时若忘传这些 env，就会把**另一轮的证据目录**当输出覆写
     ——那是本轮门禁自己要读的东西，毁掉不可恢复。所以：开了 RESHOOT（=明确是在给某一轮补拍）
     却还用着 round-2 默认落点，直接拒跑。 */
  const defaultsUsed = [
    !process.env.TOUR_LABEL && 'TOUR_LABEL(默认 round-2-tour → ' + OUT_DIR + ')',
    !process.env.TOUR_AUDIT_SUB && 'TOUR_AUDIT_SUB(默认 round-2 → ' + AUDIT_DIR + ')',
    !process.env.TOUR_CKPT_NAME && 'TOUR_CKPT_NAME(默认 tour-R2.json → ' + CKPT_FILE + ')',
  ].filter(Boolean);
  console.log('[落点预检] OUT_DIR=' + path.relative(PROJECT_PATH, OUT_DIR) + ' AUDIT_DIR=' + path.relative(PROJECT_PATH, AUDIT_DIR)
    + ' CKPT=' + path.relative(PROJECT_PATH, CKPT_FILE) + ' LOG=' + path.relative(PROJECT_PATH, LOG_FILE));
  if (RESHOOT_FILE && defaultsUsed.length) {
    console.log('TOUR_RESULT=FAIL reason=开了 RESHOOT 定向补拍，但下列落点仍是 round-2 默认值：' + defaultsUsed.join(' ; ')
      + ' —— 会把那一轮的证据当本轮输出覆写。请把 TOUR_LABEL / TOUR_AUDIT_SUB / TOUR_CKPT_NAME 显式指到本轮。');
    process.exit(1);
  }
  /* 跨轮覆写闸门（不分 RESHOOT 与否，通用）：目标证据目录里若已存在**另一轮**（gitSha 不同）的
     manifest，覆写就是不可恢复的毁证。今天实测踩到通道是开的：一次没传 TOUR_CKPT_NAME 的运行
     把 tmp/qa/checkpoints/tour-R2.json 的 gitSha 写成了本轮 HEAD（那次恰好 suites=0 没丢进度，
     但"没有闸门"和"没出事"是两件事）。确实要覆写就显式传 TOUR_ALLOW_CROSS_ROUND=1。 */
  {
    const existing = path.join(OUT_DIR, 'manifest-detail.json');
    if (fs.existsSync(existing) && !process.env.TOUR_ALLOW_CROSS_ROUND) {
      let prev = '';
      try { prev = String(JSON.parse(fs.readFileSync(existing, 'utf8')).gitSha || ''); } catch (_) { prev = '(unreadable)'; }
      if (prev && prev !== '(unreadable)' && GIT_SHA && GIT_SHA !== 'unknown' && !prev.startsWith(GIT_SHA) && !GIT_SHA.startsWith(prev)) {
        console.log('TOUR_RESULT=FAIL reason=' + path.relative(PROJECT_PATH, existing) + ' 属另一轮'
          + '（其 gitSha=' + prev + ' ≠ 本轮 ' + GIT_SHA + '）——覆写不可恢复。'
          + '要留在本轮就换 TOUR_LABEL；确要重拍那一轮就显式传 TOUR_ALLOW_CROSS_ROUND=1。');
        process.exit(1);
      }
      if (prev) console.log('[跨轮预检] 目标目录已有 manifest（gitSha=' + prev + '），本轮 gitSha=' + GIT_SHA + (process.env.TOUR_ALLOW_CROSS_ROUND ? ' ⇒ 已显式放行覆写' : ' ⇒ 同轮，允许续写'));
    }
  }
  if (!RESHOOT_FILE) { console.log('[reshoot 预检] 未设 RESHOOT → 全量取景模式，定向清单不参与本次判定（落点仍未默认放行，见上）'); return; }  if (!fs.existsSync(RESHOOT_FILE)) {
    console.log('TOUR_RESULT=FAIL reason=RESHOOT 指到不存在的文件 ' + RESHOOT_FILE + '（清单丢了也要响，不能当"没开定向模式"）');
    process.exit(1);
  }
  const rawLines = fs.readFileSync(RESHOOT_FILE, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const plannedRoutes = [...new Set(rawLines.map((l) => (l.split('\t')[1] || '').trim() || l.trim()))];
  const known = new Set(PAGES.map((p) => p.route));
  const unmatch = plannedRoutes.filter((r) => !known.has(r));
  const matched = PAGES.filter((p) => plannedRoutes.includes(p.route)).length;
  console.log('[reshoot 预检] 文件=' + RESHOOT_FILE + ' 行=' + rawLines.length + ' 去重路由=' + plannedRoutes.length
    + ' → tour 命中的取景页=' + matched + ' / tour 共规划 ' + PAGES.length + ' 页 / 不匹配=' + unmatch.length);
  unmatch.forEach((r) => console.log('  RESHOOT_UNMATCHED ' + r + '（PAGES 里没这页：加进 TSV 也不会拍，要先在 PAGES 规划）'));
  if (!rawLines.length) { console.log('TOUR_RESULT=FAIL reason=RESHOOT 清单为空 —— 空扫描集不得占用租约'); process.exit(1); }
  if (!matched) { console.log('TOUR_RESULT=FAIL reason=RESHOOT 一条都没命中 PAGES，跑了也只是"什么都没拍却像完成了"'); process.exit(1); }
  if (unmatch.length) { console.log('TOUR_RESULT=FAIL reason=' + unmatch.length + ' 条计划路由本 tour 无法满足，先补 PAGES 或改清单（现在退出还没占租约，不浪费会话）'); process.exit(1); }
}
/* 端口可达预检（同样在 acquireLock 之前）。
   TOUR_PORT 现在只从 readIdePort() 来（env WSX_PORT/WS_ENDPOINT → scripts/qa/ide-port.json →
   FALLBACK_PORT），并且刻意打一行 TOUR_PORT=<n> source=env|config|default——"大声"不等于"拦住"。
   本仓自动化端口实测一天内 9430→9431 漂移，round-7b 的 tour-B-real-stage7 又实测了另一种失效：
   配置文件说 9420、监听表上只有 9430（那一档的 WS 通道根本没人架起来），拿 9420 去 connect
   只会交出一屏 "check if target project window is opened with automation enabled"。
   再早一次（台账 :1773 与 §58）是无 env 的手跑连着 9420 覆写了那把历史墓碑——端口这条腿必须自己站得住。
   规则（与 ide-port.json 的"值必须被监听表复核后才算数"同一条）：
   **端口不是操作者在 env 里明确指定的，就必须自己证明端口活着**；config/default 来源量不到 ⇒ 拒绝，
   env 明确指定的端口即使探测不到也放行（探测失败不该盖过操作者的显式意图）。 */
function listeningPorts() {
  return new Promise((resolve) => {
    exec('netstat -ano', { timeout: 15000 }, (err, stdout) => {
      if (err) return resolve(null);
      const set = new Set();
      for (const line of String(stdout).split('\n')) {
        /* 状态字随语言环境变（中文 Windows 未必打 "LISTENING"，ide-service-port.mjs:41-42 就是为此
           刻意不按状态字匹配）。上一版只认 /LISTENING/i：一旦状态词本地化，这里返回的是**空集合**
           而不是 null ⇒ "端口没在听"被当成量出来的事实，config 来源直接判红，一条 3 小时的腿在
           预检上撞死。现在两条判据任一成立即算监听：①状态字认得；②没有对端（对端列以 :0 结尾，
           这就是监听行的定义，与语言无关）。仍然只看本地地址列的端口整值，ESTABLISHED 行不算。 */
        const f = line.trim().split(/\s+/);
        if (f.length < 5 || !/^TCP/i.test(f[0])) continue;
        const m = /:(\d{1,5})$/.exec(f[1] || '');
        if (!m) continue;
        const stateOk = /LISTENING|监听|侦听/i.test(f[3] || '');
        const noPeer = /:0$/.test(f[2] || '');
        if (stateOk || noPeer) set.add(Number(m[1]));
      }
      resolve(set);
    });
  });
}
async function precheckPortReachable() {
  const ports = await listeningPorts();
  const near = ports ? [...ports].filter((p) => p >= 9400 && p <= 9500).sort((a, b) => a - b) : [];
  if (ports && ports.has(TOUR_PORT)) {
    console.log('[port 预检] ' + TOUR_PORT + ' 在听 source=' + TOUR_PORT_SOURCE + '（94xx 在听集合=' + JSON.stringify(near) + '）');
    /* 监听表只能证明"那个端口上有人 TCP 监听"，不能证明那是 automator 的 WS —— 实测把
       WS_ENDPOINT 指到 3306（MySQL）也会通过这条判据（本轮 AUDIT.md 的 D2 量测）。
       env 是操作者的显式意图 ⇒ 不拦，但"量的到底是什么"必须写在同一行附近。 */
    if (TOUR_PORT_SOURCE === 'env' && !(TOUR_PORT >= 9400 && TOUR_PORT <= 9500)) {
      console.log('[port 预检] 提醒：env 指定的 ' + TOUR_PORT + ' 不在 94xx 自动化段内 ⇒ "在听"只说明有人占着这个端口，'
        + '不说明它是 automator 的 WS（HTTP 桥 / MySQL 之类的服务都会通过这条判据而 connect 必挂）。'
        + '端口漂移请改 scripts/qa/ide-port.json 这个唯一来源，不是在这里指一个别的端口。');
    }
    return;
  }
  const seen = ports ? '94xx 在听=' + JSON.stringify(near) : 'netstat 不可用';
  if (TOUR_PORT_SOURCE === 'env') {
    console.log('[port 预检] 警告：env 指定的 ' + TOUR_PORT + ' 探测不在听，但这是显式意图，放行继续由 connect 自己报错。' + seen);
    return;
  }
  /* config / default 来源都不是操作者的显式意图 ⇒ 没当场验到在听就不许连（ide-port.json 的口径：
     "本文件的值必须被监听表复核后才算数"）。红话要说清下一步载体，不能只说"少了 env"。 */
  console.log('TOUR_RESULT=FAIL reason=端口 ' + TOUR_PORT + ' 由 ' + TOUR_PORT_SOURCE
    + '（env WSX_PORT/WS_ENDPOINT → scripts/qa/ide-port.json → 回落）给出，且探测未在听（' + seen
    + '）——automator 的 WS 通道没架起来：先跑 node scripts/qa/ws-channel-up.mjs --project <本轮产物目录>，'
    + '端口若已漂移就更新 scripts/qa/ide-port.json（或这一腿显式带 WS_ENDPOINT=ws://127.0.0.1:<实测端口>）。现在退出还没占租约。');
  process.exit(1);
}
async function main() {
  precheckReshootPlan();
  await precheckPortReachable();
  /* TOUR_PRECHECK_ONLY=1：跑完预检就退，不占租约、不连开发者工具（与既有 TOUR_SELFCHECK 同族）。
     存在的理由：预检的"通过"分支必须在真实清单上被验一次，否则它有可能只是恰好不响；
     而在执行轮还活着的时候真跑一次会抢会话。*/
  if (process.env.TOUR_PRECHECK_ONLY) { console.log('TOUR_PRECHECK_ONLY=OK（未占用租约）'); process.exit(0); }
  if (!acquireLock()) { console.error('LOCK_BUSY'); process.exit(3); }
  startLockHeartbeat();
  let verdict = null;
  try {
    verdict = await runTour();
  } finally {
    releaseLock();
  }
  /* 【FU-8b-2｜显式收尾】原来这里只有 `finally { releaseLock(); }`：锁是放了（日志里那行
     `[lock] released` 就是它打的），但 automator 的 ws 客户端还连着、又是 ref 住的，
     main() 从不给退出码，于是进程在活干完之后挂了 47 分钟才被手杀（REPORT.md §0/§2）。
     现在：断掉一切还连着的 → 按本轮判决取退出码 → 交码 + 3s 看门狗兜底。 */
  await disconnectForExit('main 收尾');
  exitNow(verdict && Number.isInteger(verdict.exit) ? verdict.exit : 0, 'main');
}
async function runTour() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(CKPT_FILE), { recursive: true });
  try { fs.writeFileSync(LOG_FILE, ''); } catch (_) { /* ignore */ }
  log('[port] TOUR_PORT=' + TOUR_PORT + ' source=' + TOUR_PORT_SOURCE + ' lock=' + LOCK_FILE
    + ' ws=' + WS_ENDPOINT + '（锁名与 ws 同源，fork 改动 1）');

  initCkpt();
  const checkpoint = readCkpt();

  const detail = {
    gitSha: GIT_SHA, workflowVersion: '3.1', buildMode: BUILD_MODE,
    gitWorktreeDirtyPaths: GIT_DIRTY_COUNT, buildFingerprint: BUILD,
    generatedAt: '', shots: [], failures: [], suiteLog: [],
    // A-1/A-2/A-3/A-4 新增账目（全部是**追加**键，旧消费方不读未知顶层键即不受影响）
    stateNotApplied: [],   // A-2：与同页前一帧字节相同、已改判为「状态未生效」的帧（含 sha256 与被 dupOf）
    routeDrifts: [],       // A-3：交互后/弹层态跳出到别的页的留证
    zoomFrames: [],        // A-4：裁切放大辅助帧清单（不计状态配额）
    permissionSuppression: {
      mockMethods: PERM_METHODS, notes: PERM_NOTES,
      grepEvidence: PERM_GREP_EVIDENCE, notMockedBecauseAbsent: NOT_MOCKED_ABSENT,
      notMockedOnPurpose: ['wx.onNeedPrivacyAuthorization（注册型 API，见 PERM_MOCKS 上方注释）'],
      apiCannotAssertNativeDialog: true,
      armCount: 0, generations: 0, installFailures: [],
    },
    captureLimitations: {
      screenshotDprSupported: false,
      apiEvidence: 'miniprogram-automator/out/MiniProgram.d.ts:6-8 IScreenshotOptions{path?} + MiniProgram.js screenshot(){send("App.captureScreenshot")} 无参',
      zoomCropSupported: true, zoomFactor: ZOOM_FACTOR, zoomOn: ZOOM_ON,
      deviceInfo: null,
    },
  };
  log('[provenance] gitSha=' + GIT_SHA + ' dirtyPaths(apps/)=' + GIT_DIRTY_COUNT
    + ' buildMode=' + BUILD_MODE + ' (mode=' + BUILD.mode + ' apiMode=' + BUILD.apiMode
    + ' isShowcaseMode=' + BUILD.isShowcaseMode + ' membershipEnabled=' + BUILD.membershipEnabled + ')');
  if (GIT_SHA === 'unknown') log('[provenance][WARN] git rev-parse 失败 → gitSha=unknown，本轮证据不可绑定提交，勿当作有效指纹');
  if (BUILD.mode === 'unknown') log('[provenance][WARN] 未能读取产物 config/env.js，buildMode 记 unknown');

  let pages = PAGES;
  let idents = IDENTITIES;
  let reshootKeys = null;
  if (RESHOOT_FILE && fs.existsSync(RESHOOT_FILE)) {
    // 计划面与 PAGES 的对齐已在 precheckReshootPlan() 里断过（不匹配就占不到租约），
    // 这里只做过滤本身，不再重复一份判据——两份判据会漂移，那是另一种"门禁没接上"。
    reshootKeys = new Set(fs.readFileSync(RESHOOT_FILE, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.replace(/\t/g, ':')));
    pages = PAGES.filter((p) => [...reshootKeys].some((k) => k.endsWith(':' + p.route)));
    log('[reshoot] 待补拍组合 ' + pages.length + ' 页');
  }
  if (SMOKE) {
    pages = PAGES.filter((p) => ['pages/home/index', 'subpackages/market/shop/index'].includes(p.route));
    idents = ['A'];
  }

  await connectDevTools(true);
  let consecutiveZero = 0;
  let sceneCount = 0;

  const IDENTITY_SKIPPED = [];
  for (const ident of idents) {
    // 身份起点：refresh + 重连 + 铸 token + boot
    await refreshSimulator();
    await sleep(10000);
    await connectDevTools(true);
    // A-1：连接成功**立刻**注入 —— app 冷启动后入口页的 onLoad 很快就会调 getLocation，
    // 晚一步那个原生框就已经在屏幕上了（automator 事后关不掉它）。
    await armPermissionMocks('身份 ' + ident + ' 连接后立刻');
    const sess = await mintSession(ident);
    const tokFile = path.join(PROJECT_PATH, ident === 'A' ? 'tmp_r2_login.json' : 'tmp_r2_guest.json');
    fs.writeFileSync(tokFile, JSON.stringify(sess, null, 2));
    log('[identity ' + ident + '] userId=' + sess.userId + ' displayName=' + (sess.displayName || '?') + ' token -> ' + path.basename(tokFile));
    touchLock();
    const bootOk = await bootIdentity(mp, ident, sess.token);
    if (!bootOk) log('[identity ' + ident + '] 警告：boot 未通过，按实际页面继续');

    /* 帧前身份复核（判据与 shoot-frameplan 的 identityAtFrame 同一件事，不在那里另立一份规则）：
       "清完会话那一刻是游客"不等于"这一批帧是游客画面"。mock 包的 bootstrap 无条件把会话造回来
       （stores/session.ts 的 useMock() 分支；probe-guest-band.mjs 实测 cold/warm 两腿都是 AUTOLOGIN_ON_OPEN），
       所以在这档上跑 B 身份会产出 62 页"标签是游客、画面是已登录"的帧 —— 上一轮 uidebt-shoot-guest
       就是这么标错的。量到不符 ⇒ 这个身份一帧都不拍（不是拍完再打折），并打印可 grep 的拒绝行。 */
    let identAtFrame = '';
    try { identAtFrame = String(await mp.evaluate(makeVerifyFn()) || ''); } catch (e) { identAtFrame = 'ERR ' + e.message; }
    const identOk = ident === 'A' ? /^logged-in/.test(identAtFrame) : /^not-logged-in/.test(identAtFrame);
    log('[identity ' + ident + '] 帧前复核=' + identAtFrame + ' 相符=' + (identOk ? 'yes' : 'NO'));
    if (!identOk) {
      IDENTITY_SKIPPED.push({ ident, atFrame: identAtFrame, band: BUILD.mode || '?', project: CLI_PROJECT });
      console.log('TOUR_IDENTITY_SKIPPED ident=' + ident + ' band=' + (BUILD.mode || '?') + ' 帧前=' + identAtFrame.slice(0, 40) +
        ' ⇒ 这个身份 0 帧（该档表达不了这个身份，换档跑，不看画面就别记成双身份巡检）');
      /* 【FU-8b-1】这条 continue 曾经就是"假 OK"的现场：它跳过的身份一个帧都不拍，而当时
         没人把"本轮 0 帧"当回事 ⇒ 进程以 exit=0 收口。现在 skip 会进 IDENTITY_SKIPPED，
         runTour 末尾的 tourAdmissibility() 据它 + 帧数给出 TOUR_ADMISSIBLE=no 并 exit≠0。
         收尾的 disconnect 不在这儿做：还有下一个身份时它自己的 connectDevTools(true) 会先断（:942），
         是最后一个身份时由循环后的「身份循环结束」那一刀断。 */
      continue;
    }

    const orderedSuites = SUITES.slice().sort((a, b) => a.order - b.order);
    for (const suite of orderedSuites) {
      const suitePages = pages.filter((p) => p.suite === suite.id)
        .filter((p) => !reshootKeys || reshootKeys.has(ident + ':' + p.route));
      if (!suitePages.length) continue;
      const ckKey = ident + ':' + suite.id;
      const suiteStart = { relaunchUsed: 0, shots: 0 };
      log('[suite] ==== ' + ident + ' ' + suite.id + ' ' + suite.name + ' (' + suitePages.length + ' 页) ====');
      const nsBefore = await netstatTourPort();

      for (const pageDef of suitePages) {
        sceneCount += 1;
        touchLock();
        if (sceneCount % SEGMENT_BREATHE_EVERY === 0) { log('[segment] ' + sceneCount + ' 场景完成，休眠 5s 防假死'); await sleep(5000); }
        if (consecutiveZero >= 3) {
          if (suiteStart.relaunchUsed < MAX_RELAUNCH_PER_SUITE) {
            log('[freeze-guard] 连续 ' + consecutiveZero + ' 场景 0 帧 → LEVEL 2 恢复（refresh+重连）');
            await refreshSimulator(); await sleep(10000);
            try { await connectDevTools(true); await armPermissionMocks('LEVEL 2 恢复后'); } catch (e) { log('[freeze-guard] 重连失败(继续): ' + e.message); }
            suiteStart.relaunchUsed += 1; consecutiveZero = 0;
          } else {
            log('[freeze-guard] Suite ' + suite.id + ' LEVEL 2 额度已用尽，跳过恢复');
            consecutiveZero = 0;
          }
        }
        const params = PARAM_MAP.params[pageDef.route] || '';
        const url = '/' + pageDef.route + params;
        // pageDetail 是**单页**账本；A-1…A-4 的三本新账也必须一并回流到总账，否则 manifest 里看不到
        const pageDetail = { token: sess.token, params, shots: [], stateNotApplied: [], routeDrifts: [], zoomFrames: [] };
        const drain = (key) => {
          const src = pageDetail[key] || [];
          const cur = pageDetail['__cur_' + key] || 0;
          for (let i = cur; i < src.length; i++) detail[key].push(src[i]);
          pageDetail['__cur_' + key] = src.length;
        };
        const shotsBefore = detail.shots.length;
        const failBefore = detail.failures.length;
        let done = false;
        for (let attempt = 1; attempt <= 2 && !done; attempt++) {
          try {
            const n = await captureStates(ident, pageDef, url, pageDetail, detail.failures);
            // 游标式回流：重试时不会把上一 attempt 已入账的条目重复 push（原实现 shots 有重复计数风险）
            drain('shots'); drain('stateNotApplied'); drain('routeDrifts'); drain('zoomFrames');
            if (n > 0) { consecutiveZero = 0; } else { consecutiveZero += 1; }
            done = true;
            log('[scene] ' + ident + ' ' + pageDef.route + ' 完成 ' + n + ' 帧（本页 state-not-applied '
              + pageDetail.stateNotApplied.length + ' 条、跳出 ' + pageDetail.routeDrifts.length + ' 条）');
          } catch (e) {
            log('[scene] ' + ident + ' ' + pageDef.route + ' 异常(attempt ' + attempt + '): ' + e.message);
            drain('shots'); drain('stateNotApplied'); drain('routeDrifts'); drain('zoomFrames');
            if (attempt === 1) {
              try { await connectDevTools(true); } catch (e2) {
                detail.failures.push({ identity: ident, page: pageDef.route, suite: suite.id, reason: '重连失败: ' + e2.message, severity: 'P1' });
                break;
              }
            } else {
              detail.failures.push({ identity: ident, page: pageDef.route, suite: suite.id, reason: '两次尝试均异常: ' + e.message, severity: 'P1' });
            }
          }
        }
        if (detail.failures.length > failBefore) { consecutiveZero += 1; }
        suiteStart.shots += detail.shots.length - shotsBefore;
        await sleep(400);
      }

      const nsAfter = await netstatTourPort();
      markSuite(checkpoint, ident, suite.id, {
        status: 'done', name: suite.name, pages: suitePages.map((p) => p.route),
        shots: suiteStart.shots, level2Used: suiteStart.relaunchUsed,
        netstat: { before: nsBefore.length, after: nsAfter.length, sample: nsAfter.slice(0, 4) },
      });
      log('[suite] ---- ' + ident + ' ' + suite.id + ' 完成 ' + suiteStart.shots + ' 帧，LEVEL2=' + suiteStart.relaunchUsed + '，netstat=' + nsAfter.length + ' 行 ----');
      touchLock();
    }
    log('[identity ' + ident + '] 巡检完成');
    /* 【FU-8b-2】这里原来是 `if (ident === 'A' && idents.length > 1)` 才断开 ⇒ 两个方向都会漏：
       IDENTITIES=B（8b 那条腿的唯一身份）永远不满足；身份被 continue 跳过时也绕过了它。
       现在每个身份收尾都断一次（下一个身份开头 connectDevTools(true) 本来也会在 :942 断一次，
       语义不变），只在"后面还有身份要重连"时留那 5s 喘息。 */
    await disconnectForExit('身份 ' + ident + ' 收尾');
    if (idents.indexOf(ident) < idents.length - 1) await sleep(5000);
  }
  // 身份循环的兜底：最后一刀若是跳过的（走了 continue），到这里也必须已经断开
  await disconnectForExit('身份循环结束');

  // 收尾：详细 manifest + 审计 manifest
  detail.generatedAt = new Date().toISOString();
  detail.failures = detail.failures.concat((checkpoint.failures || []));
  // 运行期实测值回填（不能在初始化时写死：那时一次都没注入）
  detail.permissionSuppression.armCount = permState.armCount;
  detail.permissionSuppression.generations = permState.generation;
  detail.permissionSuppression.installFailures = permState.failures;
  detail.permissionSuppression.armedAtExit = PERM_METHODS.filter((m) => permState.armed[m] === true);
  detail.permissionSuppression.firstFrameRisk = 'app 冷启动（simulator_refresh 后由 IDE 自动打开入口页）到脚本首次注入'
    + '之间有一个时间窗，若入口页在这一窗内已弹框，automator 无法从外部关掉它；对策是「连接成功即注入 + 每页 reLaunch'
    + ' 前与每帧落盘前各确认一次代次」，残余风险如实记于此。';
  detail.captureLimitations.deviceInfo = CONNECT_INFO;
  detail.captureLimitations.zoomCropSupported = true;
  detail.captureLimitations.zoomOn = ZOOM_ON;
  detail.captureLimitations.zoomFactor = ZOOM_FACTOR;
  detail.captureLimitations.pngLib = PNG_LIB_TRIED ? (PNG_LIB ? 'pngjs(automator 自带依赖)' : '不可用') : '未触发';
  fs.writeFileSync(path.join(OUT_DIR, 'manifest-detail.json'), JSON.stringify(detail, null, 2));
  const auditManifest = {
    gitSha: GIT_SHA, workflowVersion: '3.1', buildMode: BUILD_MODE,
    gitWorktreeDirtyPaths: GIT_DIRTY_COUNT, buildFingerprint: BUILD,
    // ---- 本轮（视觉评审 A-1…A-4）新增顶层键；对 DW:657 的 4 键结构是**纯追加**，向后兼容 ----
    manifestSchemaNote: 'shot 仍保留 page/path/state 三键原语义；route/contentHash/width/height/'
      + 'permSuppressed/gateBypass 等为追加键，旧消费方（A3 DW:760 校验 gitSha、A6 DW:728 三源对照、'
      + 'scribe DW:1009 按 path 列清单）忽略未知键即可原样工作。',
    // gateBypass=true 的帧是「屏蔽了构建开关弹跳的 switchTab」才拍到的：只证明页面可渲染，
    // 不证明该开关（isShowcaseMode / membershipEnabled）已开启，审计时不得计为验证通过。
    gateBypassRoutes: [...GATE_BYPASS_ROUTES.keys()],
    gateBypassSemantics: Object.fromEntries([...GATE_BYPASS_ROUTES].map(([r, g]) => [r, g.label + '（' + g.flag + '=' + JSON.stringify(g.truth()) + '，' + g.flagFile + '）'])),
    gateBypassedShots: detail.shots.filter((s) => s.gateBypass).length,
    // A-3：逐帧落点路由。route=该帧画面 getCurrentPages() 栈顶；routeDrift=true 表示画面已跳出目标页
    shots: detail.shots.map((s) => ({ page: s.page, path: s.path, state: s.state, gateBypass: !!s.gateBypass,
      gateNote: s.gateNote || undefined, route: s.route, routeDrift: !!s.routeDrift,
      routeDisagree: !!s.routeDisagree, routeFromCurrentPage: s.routeFromCurrentPage, stateFrame: s.stateFrame,
      contentHash: s.contentHash, width: s.width, height: s.height, permSuppressed: !!s.permSuppressed,
      permMethods: s.permMethods, permSuppressedUnconfirmed: !!s.permSuppressedUnconfirmed,
      countsTowardStateQuota: !!s.countsTowardStateQuota, alsoShows: s.alsoShows, aliasLabel: !!s.aliasLabel,
      interaction: s.interaction, note: s.note })),
    // A-2：被判「内容与前一帧字节相同」而未按状态名落盘的帧
    stateNotApplied: detail.stateNotApplied || [],
    stateNotAppliedCount: (detail.stateNotApplied || []).length,
    quotaSemantics: '只有 countsTowardStateQuota=true 的帧可计入 R11 §3 状态配额；aliasLabel=true 的数据态/空态'
      + '是同帧别名（上一轮把它们当独立状态帧落盘，正是评审 A-2 的 29 组重复来源），真状态未生效的帧已改判为 stateNotApplied。',
    // A-3：跳出到别的页的交互/弹层帧
    routeDrifts: detail.routeDrifts || [],
    routeDriftCount: (detail.routeDrifts || []).length,
    // A-1：本帧抑制了哪些原生框（附真实调用点，供复核名单来源）
    permissionSuppression: detail.permissionSuppression,
    // A-4：出图分辨率限制与替代方案的实测尺寸
    captureLimitations: detail.captureLimitations,
    frameSizes: {
      limitation: '截图 API 不支持 dpr（证据见 captureLimitations.apiEvidence），本轮仍只能 1x 出图；'
        + '字级判定请用 zoomFrames 里的裁切放大辅助帧，或把模拟器换到高 dpr 机型后重拍（测试台之外的事）',
      distribution: frameSizeHistogram,
    },
    zoomFrames: detail.zoomFrames || [],
    zoomFrameCount: (detail.zoomFrames || []).length,
  };
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  /* 权威件不许被"子集跑"覆盖（本轮实测踩到）：TOUR_LABEL=round-6-tour-dupfix 那一跑只有 27 张帧，
     但它照样往 `reports/audit/round-6/screenshot-manifest.json` 写 ⇒ 本轮权威证据索引从 263 张
     变成 27 张，而且 27 张全指向 dupfix 目录 —— 于是完整性门禁拿它配 `--dir round-6-tour` 读出
     `ORPHANS=599`（= 263 主帧 + 336 裁切帧，正好一张都没被引用）。
     巡检的租约闸门早就管住了截图目录的跨轮覆盖，但**没管审计目录里的 manifest**，所以同一类
     毛病在第二个载体上又发生了一次。规则：现有权威件帧数 > 本次帧数 ⇒ 这是子集跑，
     只准落到 `screenshot-manifest.<label>.json`，除非显式 TOUR_ALLOW_SUBSET_FREEZE=1。 */
  const FREEZE_NAME = 'screenshot-manifest.json';
  const freezePath = (() => {
    const main = path.join(AUDIT_DIR, FREEZE_NAME);
    if (!fs.existsSync(main)) return main;
    let prev = null;
    try { prev = JSON.parse(fs.readFileSync(main, 'utf8')); } catch { return main; }
    const prevShots = Array.isArray(prev.shots) ? prev.shots.length : 0;
    if (prevShots <= auditManifest.shots.length || process.env.TOUR_ALLOW_SUBSET_FREEZE === '1') return main;
    const alt = path.join(AUDIT_DIR, 'screenshot-manifest.' + TOUR_LABEL + '.json');
    log('[freeze][护栏] 现有权威件有 ' + prevShots + ' 张帧 > 本次 ' + auditManifest.shots.length
      + ' 张 ⇒ 这是子集跑，不改写 ' + path.relative(PROJECT_PATH, main).replace(/\\/g, '/')
      + '，改写 ' + path.relative(PROJECT_PATH, alt).replace(/\\/g, '/')
      + '（确实要覆盖权威件请设 TOUR_ALLOW_SUBSET_FREEZE=1）');
    return alt;
  })();
  fs.writeFileSync(freezePath, JSON.stringify(auditManifest, null, 2));
  markSuite(checkpoint, 'META', 'DONE', { status: 'done', shots: detail.shots.length, failures: detail.failures.length,
    stateNotApplied: auditManifest.stateNotAppliedCount, routeDrifts: auditManifest.routeDriftCount,
    zoomFrames: auditManifest.zoomFrameCount, finishedAt: detail.generatedAt });
  log('[done] 截图 ' + detail.shots.length + ' 张（state-not-applied ' + auditManifest.stateNotAppliedCount
    + ' 条、跳出帧 ' + auditManifest.routeDriftCount + ' 条、放大辅助帧 ' + auditManifest.zoomFrameCount
    + ' 张），失败 ' + detail.failures.length + ' -> '
    + path.relative(PROJECT_PATH, freezePath).replace(/\\/g, '/'));
  log('[done][A-4] 出图尺寸分布 ' + JSON.stringify(frameSizeHistogram) + '；截图 API 不支持 dpr='
    + (CAPTURE_LIMITATIONS.screenshotDprSupported ? '支持' : '不支持') + '，替代方案=裁切放大辅助帧');
  for (const f of detail.failures) log('[failure] ' + f.identity + ' ' + f.page + (f.severity ? ' [' + f.severity + ']' : '') + ': ' + f.reason);

  /* 【FU-8b-1｜本轮的账能不能入】必须在两份 manifest 落盘之后再判：判据读的就是刚写下去的
     detail.shots 与 IDENTITY_SKIPPED。判决行用 console.log 而不是 log()：排队器收的是 stdout，
     且 run-ui-queue.mjs:136 只把带 `_RESULT=` 的行抬进 queue-state.json。
     返回给 main() 的 verdict.exit 就是本轮的退出码（缺陷①：0 帧/全跳过以前会以 exit=0 收口）。 */
  const verdict = tourAdmissibility({
    shots: detail.shots.length, identities: idents, skipped: IDENTITY_SKIPPED,
    band: BUILD.mode || 'unknown', project: CLI_PROJECT, label: TOUR_LABEL,
  });
  if (IDENTITY_SKIPPED.length) {
    console.log('TOUR_IDENTITY_SKIPPED_SUMMARY 被跳过的身份 ' + IDENTITY_SKIPPED.map((s) => s.ident + '(帧前=' + String(s.atFrame || '').slice(0, 24) + ' band=' + s.band + ')').join(' ')
      + ' —— 每个 skip 处已各打一行 TOUR_IDENTITY_SKIPPED；本轮不是双身份巡检');
  }
  verdict.lines.forEach((l) => console.log(l));
  return verdict;
}

/* ============================================================================
 * fork 改动 3：两个离线可验收模式（都不连接端口、不截图、不写 reports/）
 *   TOUR_SELFCHECK=1  只读地核对配置面与 PAGES/PARAM_MAP 计数
 *   TOUR_LOCK_PROBE=1 在 TOUR_LOCK_DIR 内完整走一遍锁生命周期 (a)-(e)
 *   TOUR_LOCK_SUB=<action> 仅由探针拉起的子进程模式（同一套 acquire/release 函数）
 * ==========================================================================*/
const SELF_SCRIPT = path.resolve(process.argv[1]);

// ---- 静态状态槽位口径（与 captureStates()/formStates() 的分派条件一一对应）----
//   默认 = 每页 1（captureStates 第 1 步）
//   交互后 / 弹层态 = 仅 core 页（captureStates 第 3/4 步；非 core 在第 2 步后即 return）
//   校验错误 / 键盘弹起-输入后 = 仅 FORM_PAGES（captureStates 第 5 步与表单页分支）
// 不计：滚动-中部/滚动-底部、数据态/空态别名 —— 要 probeScroll()/probeContent() 运行时才知可达性。
function staticStateSlotsFor(pageDef) {
  const slots = ['默认'];
  if (pageDef.core) slots.push('交互后', '弹层态');
  if (FORM_PAGES.has(pageDef.route)) slots.push('校验错误', '键盘弹起-输入后');
  return slots;
}
function selfCheckFail(why) {
  console.log('TOUR_SELFCHECK=FAIL ' + why);
  process.exit(1);
}
function runSelfCheck() {
  if (!Array.isArray(PAGES) || PAGES.length === 0) selfCheckFail('PAGES 表读不到或为 0（typeof=' + typeof PAGES + '）');
  const brokenPages = PAGES.filter((p) => !p || typeof p.route !== 'string' || !p.route || typeof p.suite !== 'string');
  if (brokenPages.length) selfCheckFail('PAGES 有 ' + brokenPages.length + ' 条缺 route/suite，表读得不完整');
  const totalPages = PAGES.length;
  const totalStates = PAGES.reduce((n, p) => n + staticStateSlotsFor(p).length, 0);
  if (!(totalStates > 0)) selfCheckFail('状态数合计为 0（PAGES=' + totalPages + '）——不许空过');
  if (!PARAM_MAP || typeof PARAM_MAP !== 'object') selfCheckFail('PARAM_MAP（scripts/r11-param-map.json）读不到');
  const paramEntries = PARAM_MAP && PARAM_MAP.params ? Object.keys(PARAM_MAP.params).length : 0;
  if (!(paramEntries > 0)) selfCheckFail('PARAM_MAP.params 为 0 条——不许空过');
  const auditSub = process.env.TOUR_AUDIT_SUB || 'round-2';
  console.log('TOUR_SELFCHECK=OK project=' + PROJECT_PATH + ' label=' + TOUR_LABEL + ' auditSub=' + auditSub
    + ' outDir=' + OUT_DIR + ' auditDir=' + AUDIT_DIR + ' ckpt=' + CKPT_FILE + ' lock=' + LOCK_FILE
    + ' ws=' + WS_ENDPOINT + ' port=' + TOUR_PORT);
  console.log('TOUR_PAGES=' + totalPages + ' TOUR_STATES=' + totalStates + ' PARAM_MAP_ENTRIES=' + paramEntries);
  // FU-8b-4：产物指纹读的是哪几条路径必须在离线模式里也看得见（原来 real 档也标成 mock 路径）
  console.log('TOUR_BUILD mode=' + BUILD.mode + ' apiMode=' + BUILD.apiMode + ' buildMode=' + BUILD_MODE
    + ' CLI_PROJECT=' + CLI_PROJECT + ' readFrom=' + JSON.stringify(BUILD.readFrom));
  console.log('SELFCHECK_NOTE port_source=' + TOUR_PORT_SOURCE
    + '（readIdePort：env WSX_PORT/WS_ENDPOINT → scripts/qa/ide-port.json → 回落 ' + FALLBACK_PORT
    + '；本轮实际取值 ' + TOUR_PORT + '）；state_rule=默认 + core(交互后/弹层态) + FORM_PAGES(校验错误/键盘弹起-输入后)，'
    + '滚动与数据态/空态需运行时探测故离线不计数');
  console.log('SELFCHECK_NOTE 本模式未调用 automator.connect、未截图、未写 reports/ 与 tmp/qa/locks；'
    + '可用 netstat 复核 ' + TOUR_PORT + ' 端口连接数无新增');
  process.exit(0);
}

/* 【FU-8b 验收用的离线模式】TOUR_TEARDOWN_PROBE=1 —— 不 connect 端口、不开模拟器、不写 reports/、
 * 不碰 tmp/qa/locks：只把"收尾两刀 + 本轮判决"这条路径单独跑一遍并交出退出码。
 *   · disconnectForExit() 挂一个假句柄，验证它真的被 disconnect 且 mp 已被置 null（幂等二次调用不再动它）；
 *   · tourAdmissibility() 正反两判：0 帧/全跳过 ⇒ no + exit 2，有帧 ⇒ yes + exit 0；
 *   · 收尾用 exitNow() 交码，于是**这一模式自己的退出码就是可测量的**（对照旧行为：没有码可测、
 *     而且 ws 客户端还连着就不退）。
 * 另开 TOUR_TEARDOWN_PROBE_HOLD=1 时，本模式故意留一个 **ref 住** 的定时器当"没摘干净的持有物"，
 * 用来量 3s 看门狗那条兜底路：旧形态在这种局面下是永久挂着（round-8b 实测 47 分钟），
 * 现在最多 3 秒后硬退并打 TOUR_EXIT_WATCHDOG。
 * ⚠ log() 会追加写 LOG_FILE，所以跑这一模式必须把 TOUR_LOG_NAME 指到 scratch 目录里，
 *   否则会给 tmp/tour-R2.log 留下一段探针日志。 */
async function runTeardownProbe() {
  const fails = [];
  const say = (name, ok, evidence) => {
    console.log('TEARDOWN_PROBE_' + name + '=' + (ok ? 'PASS' : 'FAIL') + ' ' + evidence);
    if (!ok) fails.push(name);
  };
  // (1) disconnectForExit 真的断开"还连着"的那个，并且幂等
  let hits = 0;
  mp = { disconnect: async () => { hits += 1; } };
  const d1 = await disconnectForExit('探针第一次');
  const d2 = await disconnectForExit('探针第二次');
  say('DISCONNECT_CALLED', hits === 1 && d1 === true && d2 === false && mp === null,
    '假句柄 disconnect 次数=' + hits + ' 第一次=' + d1 + ' 第二次(已无连接)=' + d2 + ' mp=' + (mp === null ? 'null' : '仍连着'));
  // (2) 抛错的 disconnect 也不能拦住收尾
  mp = { disconnect: async () => { throw new Error('探针故意抛'); } };
  const d3 = await disconnectForExit('探针抛错');
  say('DISCONNECT_THROWS_SWALLOWED', d3 === false && mp === null, 'disconnect 抛错时=' + d3 + '（吞掉并继续，mp 已置 null）');
  // (3) 判决正反两向 + 与 round-8b 那条腿一模一样的形状（唯一身份 B 被跳过 ⇒ 0 帧）
  const bad = tourAdmissibility({ shots: 0, identities: ['B'], skipped: [{ ident: 'B', atFrame: 'logged-in userId=user-1001', band: 'real' }], band: 'real', label: 'round-7-stage8b-tour-B-real' });
  const good = tourAdmissibility({ shots: 7, identities: ['A', 'B'], skipped: [], band: 'real', label: 'x' });
  const partial = tourAdmissibility({ shots: 7, identities: ['A', 'B'], skipped: [{ ident: 'B' }], band: 'real', label: 'x' });
  say('VERDICT_INADMISSIBLE', bad.admissible === false && bad.exit === TOUR_EXIT_INADMISSIBLE
    && bad.lines.some((l) => /^TOUR_ADMISSIBLE=no/.test(l)) && bad.lines.some((l) => /TOUR_RESULT=FAIL/.test(l)),
    '0 帧/全跳过 ⇒ exit=' + bad.exit + ' 行数=' + bad.lines.length);
  say('VERDICT_ADMISSIBLE', good.admissible === true && good.exit === 0
    && good.lines.some((l) => /^TOUR_ADMISSIBLE=yes/.test(l)) && good.lines.some((l) => /TOUR_RESULT=OK/.test(l)),
    '有帧 ⇒ exit=' + good.exit);
  say('VERDICT_PARTIAL_STAYS_LOUD', partial.admissible === true && partial.lines.some((l) => /缺的身份不许按双身份读|帧数不足以冒充/.test(l))
    && partial.exit === 0, '跑了一半身份且有帧 ⇒ exit=' + partial.exit + '（可入账，但明写不是双身份）');
  console.log('TEARDOWN_PROBE_判决行(本轮该腿会打印) ↓');
  bad.lines.forEach((l) => console.log('  | ' + l));
  const hold = process.env.TOUR_TEARDOWN_PROBE_HOLD === '1';
  console.log('TEARDOWN_PROBE_HOLD ' + (hold
    ? '开：留一个 ref 住的 setInterval 当"没摘干净的持有物"⇒ 应当由 3s 看门狗硬退（旧形态在这里永久挂着）'
    : '关：无 ref 住的持有物 ⇒ 事件循环自然空，进程按 exitCode 自己退'));
  if (hold) setInterval(() => { /* 故意不 unref：模拟还没摘掉的 ref */ }, 1000);
  console.log('TEARDOWN_PROBE_RESULT=' + (fails.length ? 'FAIL' : 'OK') + ' 失败步骤=' + (fails.length ? fails.join(',') : '无'));
  // 探针自己的判决优先：步骤失败 ⇒ 1；否则按 hold 场景交 INADMISSIBLE(2)，量它是不是真能带着这个码退出去
  exitNow(fails.length ? 1 : TOUR_EXIT_INADMISSIBLE, 'teardown-probe');
}


const PROBE_FAILURES = [];
function probeVerdict(name, ok, evidence) {
  console.log('PROBE_' + name + '=' + (ok ? 'PASS' : 'FAIL') + ' ' + evidence);
  if (!ok) PROBE_FAILURES.push(name);
  return ok;
}
function sha256File(p) {
  try { return createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch (_) { return ''; }
}
function writeProbeLock(obj) {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify(obj, null, 1));
}
function spawnLockSub(action) {
  const env = Object.assign({}, process.env, { TOUR_LOCK_SUB: action, TOUR_LOCK_DIR: LOCK_DIR });
  delete env.TOUR_LOCK_PROBE; delete env.TOUR_SELFCHECK;
  const r = spawnSync(process.execPath, [SELF_SCRIPT], {
    env, cwd: PROJECT_PATH, encoding: 'utf8', timeout: 60000, windowsHide: true,
  });
  let rep = null;
  try { const m = String(r.stdout || '').match(/SUBREPORT (\{.*\})/); if (m) rep = JSON.parse(m[1]); } catch (_) { /* 解析不出即视为子进程异常 */ }
  return { status: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || ''), report: rep };
}
function deadPidSample() {
  for (let p = 999999; p <= 1000099; p++) if (!pidAlive(p)) return p;
  return 0;
}
function leaseInFuture(ms) { return new Date(Date.now() + ms).toISOString(); }
function runLockSub(action) {
  const base = { action, pid: process.pid };
  const out = (extra) => { console.log('SUBREPORT ' + JSON.stringify(Object.assign({}, base, extra))); };
  if (action === 'acquire-then-release') {
    if (!acquireLock()) { out({ acquired: false, held: readLock() }); process.exit(3); }
    const held = readLock();
    out({ acquired: true, held });
    releaseLock();               // 正常退出路径（与 main() 的 finally 同一函数）
    process.exit(0);
  }
  if (action === 'renew-twice') {
    if (!acquireLock()) { out({ acquired: false, held: readLock() }); process.exit(3); }
    const first = readLock();
    sleepSync(1200);            // 让续租前后的 leaseUntil 差值可肉眼核对
    const ok2 = acquireLock();   // 持锁期间同 owner 再获取 —— r1-exec:130 的续租分支
    out({ acquired: ok2, first, second: readLock() });
    releaseLock();
    process.exit(ok2 ? 0 : 3);
  }
  if (action === 'attempt-acquire') {
    const ok = acquireLock();
    out({ acquired: ok, held: readLock() });
    if (!ok) process.exit(3);    // LOCK_BUSY 退出，不改写别人的锁
    releaseLock();
    process.exit(0);
  }
  out({ error: 'unknown TOUR_LOCK_SUB' });
  process.exit(2);
}
function runLockProbe() {
  console.log('PROBE_ENV lock_dir=' + LOCK_DIR + ' lock=' + LOCK_FILE + ' port=' + TOUR_PORT
    + ' source=' + TOUR_PORT_SOURCE + ' owner=' + LOCK_OWNER);
  if (!process.env.TOUR_LOCK_DIR) {
    console.log('PROBE_NOTE 未指定 TOUR_LOCK_DIR ⇒ 用默认 ' + LOCK_DIR + '；探针只写 ' + LOCK_RESOURCE
      + '.lock 这个带 -probe 后缀的新文件，绝不与既有墓碑同名、绝不删 tmp/qa/locks 下任何既有文件');
  }
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  if (fs.existsSync(LOCK_FILE)) {
    let cur = null;
    try { cur = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')); } catch (_) { /* 解析不了按非本探针处理 */ }
    if (!cur || cur.resource !== LOCK_RESOURCE) {
      probeVerdict('SETUP', false, '探针锁位上有一个不是本探针写出的锁，拒绝覆盖：' + LOCK_FILE + ' ' + JSON.stringify(cur));
      return finishProbe();
    }
    fs.unlinkSync(LOCK_FILE); // 只清上一轮探针自己写出的 -probe 锁
  }
  probeVerdict('SETUP', true, '起点无锁：' + LOCK_FILE);

  // (a) 无锁 → acquire 成功
  const a = spawnLockSub('acquire-then-release');
  const ah = a.report && a.report.held;
  probeVerdict('ACQUIRE_FRESH', a.status === 0 && !!a.report && a.report.acquired === true
    && !!ah && ah.status === 'LEASED' && ah.owner === LOCK_OWNER && ah.pid === a.report.pid
    && ah.resource === LOCK_RESOURCE && !!ah.leaseUntil,
    '起点无锁 → acquire 成功：exit=' + a.status + ' 锁内容 ' + JSON.stringify(ah));

  // (b) 持锁期间同 owner 再获取 = 续租（不是冲突）
  const b = spawnLockSub('renew-twice');
  const b1 = b.report && b.report.first; const b2 = b.report && b.report.second;
  const renewed = b.status === 0 && !!b.report && b.report.acquired === true && !!b1 && !!b2
    && b2.pid === b1.pid && b2.status === 'LEASED' && b2.attempt === b1.attempt
    && new Date(b2.leaseUntil).getTime() > new Date(b1.leaseUntil).getTime()
    && b.stdout.indexOf('BUS') === -1 && b.stderr.indexOf('BUS') === -1;
  probeVerdict('RENEW_SAME_PROCESS', renewed,
    '同 owner + 同进程二次 acquire 走 r1-exec:130 续租分支（判据：租约被推后、attempt 未增、pid 未变、无 BUS）：'
    + 'leaseUntil ' + (b1 && b1.leaseUntil) + ' → ' + (b2 && b2.leaseUntil)
    + '，attempt ' + (b1 && b1.attempt) + '→' + (b2 && b2.attempt) + '，pid 仍 ' + (b2 && b2.pid) + '，exit=' + b.status);

  // 一个真存活进程，用来喂 (b2)/(d) 的存活检查
  const live = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd: PROJECT_PATH, stdio: 'ignore', windowsHide: true });
  const livePid = live.pid;
  try {
    probeVerdict('LIVE_PID_PRECONDITION', pidAlive(livePid) === true,
      '自起存活子进程 pid=' + livePid + '，pidAlive()=' + pidAlive(livePid) + '（真并发独占用例的前件）');

    // (b2) 同 owner 但 pid 是别人的**存活**进程 → 必须判 BUS，不许误接管（真两个驱动抢同一 UI 会话）
    const foreignSameOwner = { resource: LOCK_RESOURCE, owner: LOCK_OWNER, pid: livePid, batch: 'R6', status: 'LEASED',
      leaseUntil: leaseInFuture(15 * 60 * 1000), attempt: 5, acquiredAt: new Date().toISOString() };
    writeProbeLock(foreignSameOwner);
    const shaA = sha256File(LOCK_FILE);
    const b3 = spawnLockSub('attempt-acquire');
    const shaB = sha256File(LOCK_FILE);
    probeVerdict('BUS_SAME_OWNER_OTHER_LIVE_PID', b3.status === 3 && !!b3.report && b3.report.acquired === false
      && shaA !== '' && shaA === shaB,
      'owner 同但 pid=' + livePid + '（存活）→ r1-exec:137 判 BUS：exit=' + b3.status
      + ' acquired=' + (b3.report && b3.report.acquired) + ' 锁未被改写 sha ' + shaA.slice(0, 12) + '==' + shaB.slice(0, 12));

    // (c) owner 同、pid 已死的僵尸 LEASED → 按存活检查接管
    const dead = deadPidSample();
    const zombie = { resource: LOCK_RESOURCE, owner: LOCK_OWNER, pid: dead, batch: 'R6', status: 'LEASED',
      leaseUntil: leaseInFuture(15 * 60 * 1000), attempt: 3, acquiredAt: '2026-09-24T10:59:06.253Z' };
    writeProbeLock(zombie);
    const c = spawnLockSub('acquire-then-release');
    const ch = c.report && c.report.held;
    probeVerdict('STALE_TAKEOVER', dead !== 0 && pidAlive(dead) === false && c.status === 0
      && !!c.report && c.report.acquired === true && !!ch && ch.pid === c.report.pid && ch.attempt === 4
      && !!ch.takenOverAt && c.stdout.indexOf('taking over stale own lock from dead pid ' + dead) !== -1,
      'pid=' + dead + '（pidAlive=false）的 LEASED 僵尸锁 → 新进程 pid=' + (c.report && c.report.pid)
      + ' 接管：attempt 3→' + (ch && ch.attempt) + ' takenOverAt=' + (ch && ch.takenOverAt) + ' exit=' + c.status);

    // (d) owner 不同 + pid 真存活 → LOCK_BUSY 退出且不改写该锁
    const foreignOwner = 'other-driver-pid-' + livePid;
    const foreign = { resource: LOCK_RESOURCE, owner: foreignOwner, pid: livePid, batch: 'OTHER', status: 'LEASED',
      leaseUntil: leaseInFuture(15 * 60 * 1000), attempt: 7, acquiredAt: new Date().toISOString() };
    writeProbeLock(foreign);
    const shaC = sha256File(LOCK_FILE);
    const d = spawnLockSub('attempt-acquire');
    const shaD = sha256File(LOCK_FILE);
    const stillForeign = readLock();
    probeVerdict('LOCK_BUSY_ALIVE_FOREIGN_OWNER', d.status === 3 && !!d.report && d.report.acquired === false
      && shaC !== '' && shaC === shaD && !!stillForeign && stillForeign.owner === foreignOwner
      && stillForeign.status === 'LEASED' && d.stderr.indexOf('[lock] BUS by') !== -1,
      'owner=' + foreignOwner + ' pid=' + livePid + '（存活）→ LOCK_BUSY：exit=' + d.status
      + ' 锁字节未变 sha ' + shaC.slice(0, 12) + '==' + shaD.slice(0, 12)
      + '，盘上仍是 ' + JSON.stringify(stillForeign && { owner: stillForeign.owner, pid: stillForeign.pid, status: stillForeign.status }));
  } finally {
    try { live.kill(); } catch (_) { /* ignore */ }
    for (let i = 0; i < 40 && pidAlive(livePid); i++) { sleepSync(100); }
  }
  console.log('PROBE_NOTE 存活用例的 dummy 进程 pid=' + livePid + ' 已回收，pidAlive 现在=' + pidAlive(livePid));

  // (e) 正常退出走 release：锁文件仍在、status=released（墓碑，不删文件）
  if (fs.existsSync(LOCK_FILE)) {
    let cur = null; try { cur = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')); } catch (_) { /* ignore */ }
    if (cur && cur.resource === LOCK_RESOURCE) fs.unlinkSync(LOCK_FILE);
  }
  const e0 = sha256File(LOCK_FILE); // 此时应为 ''（文件已清）
  const e = spawnLockSub('acquire-then-release');
  const after = readLock();
  probeVerdict('RELEASE_TOMBSTONE', e0 === '' && e.status === 0 && fs.existsSync(LOCK_FILE)
    && !!after && after.status === 'released' && after.owner === LOCK_OWNER && !!after.releasedAt,
    '正常退出 → release：锁文件仍在(' + path.basename(LOCK_FILE) + ') status=' + (after && after.status)
    + ' releasedAt=' + (after && after.releasedAt) + '，未删文件，exit=' + e.status);

  return finishProbe();
}
function sleepSync(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) { /* 短轮询，等 dummy 进程真退出 */ }
}
function finishProbe() {
  const leftovers = fs.existsSync(LOCK_DIR)
    ? fs.readdirSync(LOCK_DIR).filter((f) => /-probe\.lock$/.test(f)).map((f) => {
      let j = null; try { j = JSON.parse(fs.readFileSync(path.join(LOCK_DIR, f), 'utf8')); } catch (_) { /* ignore */ }
      return { file: f, status: j && j.status, owner: j && j.owner, pid: j && j.pid };
    }) : [];
  const leased = leftovers.filter((x) => x.status === 'LEASED');
  probeVerdict('CLEANUP', leased.length === 0,
    '探针目录内 -probe 锁清点：' + JSON.stringify(leftovers) + '，LEASED 残留 ' + leased.length + ' 个');
  console.log('PROBE_RESULT=' + (PROBE_FAILURES.length ? 'FAIL' : 'OK')
    + ' 失败步骤=' + (PROBE_FAILURES.length ? PROBE_FAILURES.join(',') : '无'));
  process.exit(PROBE_FAILURES.length ? 1 : 0);
}

// 模式分发：四条离线路径都在 connectDevTools()/截图 之前退，不碰 reports/
if (process.env.TOUR_SELFCHECK === '1') {
  runSelfCheck();
} else if (process.env.TOUR_TEARDOWN_PROBE === '1') {
  await runTeardownProbe();
} else if (process.env.TOUR_LOCK_PROBE === '1') {
  runLockProbe();
} else if (process.env.TOUR_LOCK_SUB) {
  runLockSub(process.env.TOUR_LOCK_SUB);
} else {
  main().catch(async (e) => {
    log('[fatal] ' + (e && e.stack ? e.stack : e.message));
    releaseLock(); // fork 改动 2：r1-exec:1596 同法，异常路径也必须释锁
    // 【FU-8b-2】异常路径同样不能把 ws 客户端留给进程当"续命的 ref"：先断再交码
    await disconnectForExit('main().catch 收尾');
    exitNow(1, 'fatal');
  });
}

