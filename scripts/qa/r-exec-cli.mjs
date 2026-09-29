#!/usr/bin/env node
/* round-7 执行轮的 CLI 版执行器（缺省 observe-only；带 --tap / --real / --real-cases-only 时跑对应档，
   实际档位由 MODE_LABEL 派生后写进落盘字段 runner，不再写死）。
   为什么另起一个文件而不是改 r-exec.cjs：那 2199 行整个建立在 automator.connect(ws) 上，
   而 WS 通道本机连不上（cli auto 不落监听端口，实测 connect ~15ms 失败）。

   本执行器只做能诚实做完的那一半：
     · 跑 pre/action 里没有交互动词的用例（点击/输入/滚动那一类交给下一步）；
     · 每页只开一次，页内所有用例点名的类名折叠成一次「点火 + 取件」探测（notes §12：0.21 s/条且与逐条一致）；
     · 需要出帧的用例逐例截图；requiresReal 的用例记 SKIPPED 并写明原因（不拿 mock 帧冒充真实模式）；
     · 只观察不判决：它不推断「该出现却没出现算失败」——清单里没写极性的判点，猜出来就是假判决。
   2026-09-29 capability 车道补上的另一半（**都要旗标**；不带旗标时上面那四条就是它的全部能力，
   既有 1107 条批次能原样复现）：
     · --native-capture：把 r1-exec.cjs:278-305 的 toast / 原生 Modal 调用流钩子接到本通道的 evaluate 上
       （:25 早就 import 了 evaluate ⇒ 是接线，不是新造通道），行上 toast/console 从此是数组
       ⇒「toast 文案在本项目量不到」这句话从本车道起**不再成立**；
     · --gestures：发出 longpress（r1-exec.cjs:1033+:1068 的等价物 = 同一个工具的另一个 --action）
       与 pullDown / stopPullDownRefresh（r1-exec.cjs:1115-1126 那条 evaluate 动线）；
     · --strict-verbs（被 --gestures 隐含）：判据点名的动词在本通道发不出去时**扣住不发**，
       记 SKIPPED + NOT_SHOOTABLE 原因，绝不退化成一次普通 tap
       （MSG26 / DND08 / DC08 / VI40 就钉在这条上；负例 scripts/qa/test-exec-verb-dispatch.cjs）。

   行形状与 round-6 一致（suite/manifest/id/page/tier/requiresReal/title/status/observed/
   missingEvidence/failureReason/route/toast/console/evidence/durationMs），
   这样 queue-reconcile / evidence-integrity / readjudicate 三个门禁的账本不用改。
   2026-09-29 capability 车道**追加**了四个键（geometry / nativeCapture / consoleScope / evidenceGaps）
   与两个动词读数 —— 追加键不改既有读取路径（本仓既有约定见 tour-r6.mjs:49「JSON 多余字段被忽略」）；
   toast/console 只在 --native-capture 下从字面空串变成数组，不带旗标时形状与 round-6 逐字一致。

   用法：PATH=<node22 目录>:$PATH node scripts/qa/r-exec-cli.mjs \
     --project apps/client/dist/build/mp-weixin --out reports/audit/round-7/interact \
     [--manifests PAGES-HOME-INDEX,PAGES-NEARBY-INDEX] [--limit 40]
     [--tap]            元素级真点/真输入（以前就有）
     [--gestures]       发 longpress / pullDown，并隐含 --strict-verbs
     [--strict-verbs]   只做防降级：判据点名的动词发不出去时不发普通 tap，记 SKIPPED + NOT_SHOOTABLE 原因
     [--native-capture] 装 wx.showToast/hideToast/showModal/showLoading + console.* 调用流钩子
                        ⇒ 行上 toast/console 变成数组（每行一次取件，1107 条约多 4 分钟）
   三个旗标都不带时本文件的下发、判决与落盘字段与 2026-09-28 之前的腿逐字相同（既有 1107 条批次要能复现）。
   续跑：同一 --out 下已有 exec-results.json 时按 manifest|id 跳过跑过的，合并后整体守恒才写盘。 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { acquireUi, releaseUi, renewUi } from "./ui-lease.mjs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { evaluate, openPage, shot, mintToken, bootSession, verifyLogin, routeStack, clearSession, element, assertIdentityProducible, observedUserId } from "./cli-automator.mjs";
import { readApiMode, assertGuestCapable } from "./artifact-band.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin"));
/* 载体档位是被测物的一部分：同一份用例在 mock / real / showcase 三档上量到的不是同一件事
   （mock 的 bootstrap 会无条件造出 mock 会话；VIP 页在开关关闭那档会被守卫弹回）。
   以前只有 --project 路径进得了账，档位名字没人记，于是"游客档失败"这类结论
   到底是产品没做到还是载体表达不了，事后无法复盘。每一行都带上档位指纹。 */
const BAND = readApiMode(PROJECT);
/* requiresReal 那 236 条到底跑不跑，**由被测产物的档位决定，不由一个可以被忘掉的旗标决定**。
   本轮实测到的事故：`--project .../mp-weixin-real` 跑的那条腿没同时带 `--real`，
   于是 236 条真实用例全被跳过，而跳过原因写的是「本切片只跑 mock 产物」——
   一句在它自己都不成立的话（它明明开的是 real 档），所以从统计口径上完全看不出来。
   `--real` 保留成人工强制开关（用于 real 档上刻意只跑 mock 用例的对照），但档位本身就必须能推出来。 */
const REAL_BAND = BAND.mode === "real" || process.argv.includes("--real");
const OUT_DIR = resolve(REPO, arg("out", "reports/audit/round-7/interact"));
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const LABEL = arg("label", "round-7-exec");
const ONLY = (arg("manifests", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = parseInt(arg("limit", "0"), 10);
const SETTLE = parseInt(arg("settle", "2400"), 10);
/* 游客档预热：先开一个与目标无关的页，把「连上工程后的第一次开页」那次启动链路消耗掉，
   再清会话——这样批次里的第一次开页就不再是冷启动。只有显式要求才做（默认拒绝跑 mock 游客）。 */
const WARMUP_GUEST = process.argv.includes("--guest-warmup");
/* 交互刀：真点/真输入（automation_element_action），只在显式 --tap 时开。
   不可逆的账号级动作一律禁触并显式记 DENY——不是藏红，是这类动作会把后面几百条
   共用的会话打掉，那一次跑就只剩下"注销成功"这一帧。 */
const TAP_MODE = process.argv.includes("--tap");
/* ── 能力旗标（2026-09-29 capability 车道；三条都是**加法**，不带旗标时本文件的行、判决、
   字段与 2026-09-28 之前逐字一致 —— 判据台 1107 条的既有批次必须能原样复现）───────
   · --gestures   发出 longpress / pullDown（r1-exec.cjs:1033+:1068、:1115-1126 那两条一直没接过来的动线）。
                  同时**隐含 --strict-verbs**：capability 与"不许换动词"必须同批到货，
                  否则"新增 longpress"的同一腿里 DND08 仍会被一次普通 tap 顶掉。
   · --strict-verbs 只做防降级：判据点名的动词发不出去时不发普通 tap，改记 SKIPPED + NOT_SHOOTABLE 原因。
   · --native-capture 装 wx.showToast/hideToast/showModal/showLoading + console.* 的调用流钩子
                  （载具：r1-exec.cjs:278-299 installToastHook / :300-305 drainToasts，都是纯 evaluate 载荷，
                   本文件的 evaluate 在 :25 就已 import ⇒ 是接线不是新造通道）。 */
const GESTURE_MODE = process.argv.includes("--gestures");
const STRICT_VERBS = GESTURE_MODE || process.argv.includes("--strict-verbs");
const NATIVE_CAPTURE = process.argv.includes("--native-capture");
/* 落盘字段 runner 必须由 argv 派生。此前它写死「observe-only 切片」，
   于是 `--tap` 跑出来的 exec-results.json 自称只跑了观察腿 —— 载具在撒谎。
   权威结论行 RUNNER_SCOPE 早就按 argv 派生（在 run.log 里），这里只是把同一个口径补进 JSON。
   2026-09-29：新能力旗标同样要进这个名字（+gestures / +capture），否则"这一腿有没有发过
   longpress、有没有采过 toast"在账本里又变成看不见的东西。不带旗标时名字一个字不变。 */
const MODE_SUFFIX = (GESTURE_MODE ? "+gestures" : "") + (NATIVE_CAPTURE ? "+capture" : "");
const MODE_LABEL = (process.argv.includes("--real-cases-only") ? "real-cases-only"
  : TAP_MODE ? (REAL_BAND ? "tap+real" : "tap") : (REAL_BAND ? "real" : "observe-only")) + MODE_SUFFIX;
const DENY_TAP = /注销|解绑|清空|删除账号|删除帐号|退出登录|登出/;
/* 整页锁屏（LockScreen）探针：present 时页面内容根本不在渲染树里。
   --allow-gate 用来在 showcase 档（挡不掉也要照判）或专门测锁屏时强行照判。 */
const GATE_SEL = ".lock-screen";
const ALLOW_GATE = process.argv.includes("--allow-gate");
/* 游客闸门落点的判定抽成纯函数，是为了能在**不碰模拟器、不取租约**的情况下证明它会变红：
   这条分支决定一批 FAILED 行怎么被解读，若只有跑 90 分钟才能验证，它就等于没被验证过。
   口径：只有"实测身份=未登录"且"该页在裁定表里"且"实际落点=裁定落点"三条同时成立才归因给闸门；
   任何一条不成立都退回人工判，绝不把"我不知道为什么跳页"写成"这是设计行为"。 */
function guestGateVerdict(loginVerify, landings, page, top) {
  if (!/^not-logged-in/.test(String(loginVerify || ""))) return null;
  const booked = landings && landings.get(page);
  if (!booked || booked !== top) return null;
  return "落在 " + top + " ⇒ 与游客落点裁定一致（guest-landing-policy: " + page + " → " + top +
    "），本条判据的前置是登录态 ⇒ 属身份适用范围问题，不是产品缺陷；要它不再是 FAILED 得给这条 case 标 identities";
}
/* 身份适用范围（#51）：ops 里标了 c.identities 的 case 只有列出的那一腿认领。
   这一步必须发生在探测之前——游客被弹到登录页之后再解释，产出的还是几十条
   "落在别的页 ⇒ FAILED"，而它们本来就不该由游客这一腿来判。
   仍出一行 SKIPPED（不是消失），守恒等式「行数=判据数」才继续成立；
   原因串点名是谁把它摘出去的（载体文件），下一轮人才追得回来源。 */
function identityScopeSkip(c, identity) {
  const ids = (Array.isArray(c && c.identities) ? c.identities : []).map(String).filter(Boolean);
  if (!ids.length) return "";
  if (ids.includes(String(identity))) return "";
  return "本条判据的身份适用范围已标为 " + ids.join("/") + "，当前腿 identity=" + identity + " ⇒ 不由这一腿认领（载体：tag-ops-identity-scope.mjs 按 guest-landing-policy.json 的落点裁定标的；摘掉的是认领，不是判据）";
}
/* 盖章不可自动化（#70⑤）：ops 里 automatable:false 的行本通道就不该再去点它。
   以前这个字段没有任何消费者 ⇒ 章只是装饰，执行器照旧去点、照旧记"点不到点名物件"，
   把一条已经判过的事重新变成一条新的红。现在：出一行 SKIPPED，理由带上盖章出处。 */
function notAutomatableSkip(c) {
  if (!c || c.automatable !== false) return "";
  const why = String(c.notAutomatableReason || "").trim() || "（盖章时没写理由）";
  const from = String(c.notAutomatableFrom || c.notAutomatableCarrier || "未知出处");
  return "action-not-automatable: 判据台已盖章「本通道不可自动化」⇒ 不发交互：" + why.slice(0, 220) + "（盖章出处 " + from + "；要它被自动判，得先换载具或把判据收紧成可判物件）";
}
function runSelftest() {
  const L = new Map([["subpackages/village/village/index", "pages/login/index"]]);
  const cases = [
    { n: "游客+落点=裁定 ⇒ 归因闸门", got: !!guestGateVerdict("not-logged-in", L, "subpackages/village/village/index", "pages/login/index"), want: true },
    { n: "游客+落点≠裁定 ⇒ 不归因", got: !!guestGateVerdict("not-logged-in", L, "subpackages/village/village/index", "pages/home/index"), want: false },
    { n: "已登录身份跳页 ⇒ 绝不归因给游客闸门", got: !!guestGateVerdict("logged-in userId=100158", L, "subpackages/village/village/index", "pages/login/index"), want: false },
    { n: "页不在裁定表 ⇒ 不归因", got: !!guestGateVerdict("not-logged-in", L, "pages/home/index", "pages/login/index"), want: false },
    { n: "裁定表为空（policy 没读到）⇒ 一条都不归因", got: !!guestGateVerdict("not-logged-in", new Map(), "subpackages/village/village/index", "pages/login/index"), want: false },
    { n: "#70⑥ 裸 kebab 类名现在抠得到", got: classesOf("点 .save-btn 一下").join(","), want: ".save-btn" },
    { n: "#70⑥ BEM 仍抠得到（放宽没把旧的挤掉）", got: classesOf("点 .circle-card__count 与 .topic-card").sort().join(","), want: ".circle-card__count,.topic-card" },
    { n: "#70⑥ 单词无连字符的 .chip 不算点名（没法与正文里的英文词区分）", got: classesOf("点 .chip").length, want: 0 },
    { n: "成员访问 arr[0].length-1 不许被抠成类名（实测把 DND05 判红过一次）", got: classesOf("取 messages[0].length-1 与 .save-btn").join(","), want: ".save-btn" },
    { n: "点号左边是词字符时不算类名（foo.bar-baz 是表达式不是选择器）", got: classesOf("见 foo.bar-baz 与 .bar-qux").join(","), want: ".bar-qux" },
    { n: "judgeTargets 含 tapTarget（旧口径把权威目标漏成\"没点名\"）", got: judgeTargets({ tapTarget: ".x-y", action: "看标题" }).join(","), want: ".x-y" },
    { n: "probeCount 读 present(3)=3", got: probeCount("present(3)"), want: 3 },
    { n: "probeCount 读 absent 得 null（不许当成 1）", got: probeCount("absent") === null, want: true },
    { n: "#70④ 动词+输入框才走输入腿", got: wantsInputLeg("输入手机号", ".phone-input"), want: true },
    { n: "#70④ 动词说输入但元素不是输入框 ⇒ 退回点击", got: wantsInputLeg("输入验证码后点", ".hero__back"), want: false },
    { n: "#70④ 没动词的输入框也不走输入腿", got: wantsInputLeg("查看列表", ".search-input"), want: false },
    { n: "TAP_RE 认 lane 写的英文 tap（旧表不认 ⇒ 那 13 条点名静默不测）", got: wantsInteraction("tap .code-input 提交"), want: true },
    { n: "TAP_RE 不被 getApp() 里的 tAp 骗到", got: wantsInteraction("调用 getApp() 取应用实例"), want: false },
    { n: "TAP_RE 不被 searchTap 里的 Tap 骗到", got: wantsInteraction("emit('searchTap') 触发搜索"), want: false },
    { n: "TAP_RE 中文动词仍然算交互", got: wantsInteraction("长按卡片标题"), want: true },
    /* —— camelCase 动词（#C-3 假绿的正例；旧边界把 "Tap" 前面的字母 d 当反例整类杀掉）—— */
    { n: "TAP_RE 认 rapidTap×5（DND08/TP04/SCU06 一族，旧表不认 ⇒ 没发交互还记 EXECUTED）", got: wantsInteraction("500ms 内对 .save-btn rapidTap×5"), want: true },
    { n: "TAP_RE 认 doubleTap", got: wantsInteraction("对 .card doubleTap 两次"), want: true },
    { n: "TAP_RE 认 longPress", got: wantsInteraction("对气泡 longPress 800ms"), want: true },
    { n: "TAP_RE 不被 scrollTop/scrollHeight 里的 scroll 骗到（动词嵌在更长标识符开头）", got: wantsInteraction("记录 scrollTop、scrollHeight 读数"), want: false },
    { n: "TAP_RE 不被 tapAvatar 里的 tap 骗到（动词开头、后面还有字母）", got: wantsInteraction("emit tapAvatar 冒泡"), want: false },
    { n: "TAP_RE 不被引号里的驼峰名骗到（searchTap 与 rapidTap 同形，靠引号分动作/名字）", got: wantsInteraction("der.vue:17 emit('searchTap') 声明"), want: false },
    { n: "TAP_RE 不被 bindtap/catchtap/CardSwiper 骗到（平台事件属性名与组件名：动词不在驼峰接缝上）", got: wantsInteraction("根 SwipeContainer 上 catchtap 绑 bindtap 于 CardSwiper.vue"), want: false },
    { n: "TAP_RE 放宽后仍认中文动词（放宽驼峰不能挤掉旧口径）", got: wantsInteraction("长按卡片标题"), want: true },
    { n: "尾段驼峰处理器名（onTap/handleVipClick）按交互算：判据里它们总与 点/@tap 同现，实测新增 14 条逐条读过没有假命中 ⇒ 这条钉住不许当 bug 改回去", got: wantsInteraction("手势层 onTap 冒泡到页面"), want: true },
    { n: "驼峰半边必须独立带旗标：/i 一上 [a-z][A-Z] 就失效 ⇒ TAP_CAMEL_RE 不许有 i", got: !/i/.test(TAP_CAMEL_RE.flags) && !TAP_CAMEL_RE.test("catchtap"), want: true },
    { n: "#51 没标 identities ⇒ 每一腿都照认领", got: identityScopeSkip({ action: "看帖子" }, "guest"), want: "" },
    { n: "#51 identities=[]（空名单）⇒ 视同没标，不能让一条判据凭空没人跑", got: identityScopeSkip({ identities: [] }, "guest"), want: "" },
    { n: "#51 标 A/B 的游客腿 ⇒ 出原因并点名载体", got: /^本条判据的身份适用范围已标为 A\/B.*guest-landing-policy/.test(identityScopeSkip({ identities: ["A", "B"] }, "guest")), want: true },
    { n: "#51 标 A/B 的 A 腿 ⇒ 照跑", got: identityScopeSkip({ identities: ["A", "B"] }, "A"), want: "" },
    { n: "#51 标 guest 的 A 腿 ⇒ 也跳过（登录页那一组就是反向的）", got: identityScopeSkip({ identities: ["guest"] }, "A") !== "", want: true },
    { n: "#51 原因串里带上了是哪一腿被摘出去", got: identityScopeSkip({ identities: ["A"] }, "B").includes("identity=B"), want: true },
    { n: "#70⑤ automatable:false ⇒ 出跳过理由并点名盖章出处", got: /^action-not-automatable: .*盖章出处 cellplan-/.test(notAutomatableSkip({ automatable: false, notAutomatableReason: "原生 ActionSheet 点不了", notAutomatableFrom: "cellplan-round7-taptarget.json" })), want: true },
    { n: "#70⑤ automatable 缺省（undefined）⇒ 照跑，不能把整本判据台当盖章", got: notAutomatableSkip({ action: "点 .a-b" }), want: "" },
    { n: "#70⑤ automatable:true ⇒ 照跑", got: notAutomatableSkip({ automatable: true }), want: "" },
    /* —— #C-1 几何留存 / #C-2 逐行带戳：这两组也进 --selftest，让"改坏了探针"在启动时就响，
       不必等到离线测试那一层（更不必等到跑完 90 分钟看行） —— */
    { n: "#C-1 interpretProbe 留下 width/height（旧写法只留 length ⇒ VI40 那族从没量到过）", got: JSON.stringify(interpretProbe([".a-b"], { 0: { c: 2, b: [[128, 240], [128, 240]] }, __win: 375 }).__geom || null), want: JSON.stringify({ ".a-b": { nodes: 2, boxes: [[128, 240], [128, 240]], win: 375 } }) },
    { n: "#C-1 计数口径不许漂：present(2) 仍是 present(2)", got: interpretProbe([".a-b"], { 0: { c: 2, b: [[1, 2]] }, __win: 375 })[".a-b"], want: "present(2)" },
    { n: "#C-1 0 个节点仍是 absent（新增几何不许把 absent 变成 present）", got: interpretProbe([".a-b"], { 0: { c: 0, b: [] } })[".a-b"], want: "absent" },
    { n: "#C-1 geomText 给出 px 并按窗口宽度换算 rpx（750rpx=375px ⇒ 128px=256rpx）", got: geomText({ action: "点 .a-b", tapTarget: "" }, interpretProbe([".a-b"], { 0: { c: 1, b: [[128, 240]] }, __win: 375 })), want: ".a-b=[128x240px ≈256x480rpx]" },
    { n: "#C-1 没量到窗口宽度就只报 px（宁缺毋造 rpx）", got: geomText({ action: "点 .a-b" }, interpretProbe([".a-b"], { 0: { c: 1, b: [[128, 240]] } })), want: ".a-b=[128x240px]" },
    { n: "#C-1 渲染器没给数字时记 ? 不记 0（0 是「量到 0」，两码事）", got: geomText({ action: "点 .a-b" }, interpretProbe([".a-b"], { 0: { c: 1, b: [[null, null]] }, __win: 375 })), want: ".a-b=[?]" },
    { n: "#C-1 老袋子形状（纯数字）进来也不炸，只是没有几何", got: geomText({ action: "点 .a-b" }, interpretProbe([".a-b"], { 0: 3 })), want: "" },
    { n: "#C-2 续跑：旧行保留第一次的带，不被本 boot 的 HEAD 顶掉", got: (function () { const p = { gitSha: "SHA1" }; const a = stampMerged(p, [{ manifest: "M", id: "A", gitSha: "SHA1" }], [{ manifest: "M", id: "B", gitSha: "SHA2" }], "SHA2", "boot2"); return a.merged.map((r) => r.id + "=" + r.gitSha).join(","); })(), want: "A=SHA1,B=SHA2" },
    { n: "#C-2 文件头那枚 = 本 boot 的 HEAD（语义收窄，另附 mergedFrom）", got: (function () { const p = { gitSha: "SHA1" }; const a = stampMerged(p, [{ manifest: "M", id: "A", gitSha: "SHA1" }], [], "SHA2", "boot2"); return a.bootSha + "|" + a.mergedFrom.map((m) => m.gitSha + ":" + m.rows).join(","); })(), want: "SHA2|SHA1:1" },
    { n: "#C-2 历史行没有逐行戳 ⇒ 退回上一份文件头并写明是继承，绝不套本 boot 的", got: (function () { const a = stampMerged({ gitSha: "SHA1" }, [{ manifest: "M", id: "A" }], [], "SHA2", "b2"); return a.merged[0].gitSha + "|" + a.merged[0].gitShaSource.slice(0, 20); })(), want: "SHA1|inherited-prior-file" },
    { n: "#C-2 连上一份文件头都没戳 ⇒ unknown，不猜", got: (function () { const a = stampMerged({}, [{ manifest: "M", id: "A" }], [], "SHA2", "b2"); return a.merged[0].gitSha; })(), want: "unknown" },
    /* —— capability 车道 #1/#2（2026-09-29）：动词拒发 + 原生调用流读数也进 --selftest，
       症状（"改坏了探针在启动时就响"）同款：这三条纯函数决定 1107 条里哪些行会被扣下、
       哪些 toast 会进行字段，等到跑完 90 分钟才发现就等于没验证。 —— */
    { n: "#2 DND08 的 rapidTap×5 在无 --gestures 与有 --gestures 下**都**拒发（重复原语物理缺失，与旗标无关）", got: (function () { const a = "500ms 内对 .save-btn rapidTap×5，逐次记录：客户端 PUT /dnd 请求条数、Toast 条数"; return /^NOT_SHOOTABLE\(verb=rapidTap\)/.test(verbRefusal(a, false)) && /^NOT_SHOOTABLE\(verb=rapidTap\)/.test(verbRefusal(a, true)); })(), want: true },
    { n: "#2 DC08 的向右拖动拒发（swipe 半边没接）", got: /^NOT_SHOOTABLE\(verb=swipe\)/.test(verbRefusal("在卡片上向右拖动 >SWIPE_THRESHOLD 后松手", true)), want: true },
    { n: "#2 MSG26 一次点名四个动词 ⇒ 原因串把四个都列出来，不许只报最好写的点", got: (function () { const r = verbRefusal("① 长按→「删除会话」→ 在 showModal 点「取消」；③ 对同一会话在 500ms 内连点删除入口 5 次；④ 断网执行确定", true); return ["longpress", "rapidTap", "nativeModal", "networkFault"].every((v) => r.includes(v)); })(), want: true },
    { n: "#2 长按在无 --gestures 时拒发（不许退化成 tap）；带旗标后发得出去 ⇒ 不再拒发", got: verbRefusal("长按 .msg-row 呼出操作条", false).startsWith("NOT_SHOOTABLE(verb=longpress)") && verbRefusal("长按 .msg-row 呼出操作条", true) === "", want: true },
    { n: "#2 普通点击判据一条都不该被拒（防降级闸不许把 624 条可发的交互全扣了）", got: verbRefusal("点 .save-btn 保存", true) === "" && verbRefusal("点 .save-btn 保存", false) === "", want: true },
    { n: "#2 pickElementVerb：长按只在旗标下顶掉 tap，输入腿口径一字不变", got: pickElementVerb("长按 .msg-row", ".msg-row", true) + "/" + pickElementVerb("长按 .msg-row", ".msg-row", false) + "/" + pickElementVerb("输入手机号", ".phone-input", true), want: "longpress/tap/input" },
    { n: "#2 pullDown 三态分得开：uni-ok=ok，no-uni=unsupported，ERR=error，取空=unknown（把 no-uni 读成已下拉就是凭空造绿）", got: [pullDownVerdict("uni-ok"), pullDownVerdict("no-uni"), pullDownVerdict("ERR x"), pullDownVerdict(""), pullDownVerdict("page-handler-ok"), pullDownVerdict("no-page")].map((v) => String(v).split("(")[0]).join("/"), want: "ok/unsupported/error/unknown/ok/no-page" },
    { n: "#2 pullDownSource 问的是 uni.startPullDownRefresh（照 r1-exec.cjs:1115-1120，不是自造一套）", got: pullDownSource().includes("uni.startPullDownRefresh") && stopRefreshSource().includes("uni.stopPullDownRefresh"), want: true },
    { n: "#1 钩子包住 showModal/showLoading（r1-exec.cjs:293 同列）⇒ modal 调用从此可观察", got: ["showToast", "hideToast", "showModal", "showLoading"].every((n) => nativeHookSource().includes("wrap('" + n + "')")), want: true },
    { n: "#1 钩子不许声称覆盖 showActionSheet（那条是 [NEW]，本车道不接 ⇒ 说了就是overclaim）", got: !/wrap\('showActionSheet'\)/.test(nativeHookSource()), want: true },
    { n: "#1 钩子原样透传（orig.apply）⇒ 装钩子不改变小程序行为", got: /orig\.apply\(wx, arguments\)/.test(nativeHookSource()) && /orig\.apply\(console, arguments\)/.test(nativeHookSource()), want: true },
    { n: "#1 interpretNative 把取件串翻成两个数组（行字段要的是数组，不是空串）", got: (function () { const r = interpretNative('{"toasts":[{"api":"showToast","title":"设置已保存"}],"logs":[{"level":"error","text":"boom"}],"hooked":true}'); return r.toasts.length === 1 && r.toasts[0].api === "showToast" && r.hooked === true; })(), want: true },
    { n: "#1 interpretNative 遇到通道噪声（前缀日志/非 JSON）不抛，报 err ⇒ 行仍出，读数标「没取到」", got: (function () { const r = interpretNative("IDE_PROJECT_ABS … not json"); return Array.isArray(r.toasts) && r.toasts.length === 0 && !!r.err; })(), want: true },
    { n: "#1 toastSummary 给出「条数」（DND08 判据②要的就是这个数）", got: toastSummary([{ api: "showToast", title: "设置已保存" }]), want: "条数=1 showToast×1 文案[设置已保存]" },
    { n: "#1 consoleLines 照 r1-exec.cjs:1393 的口径：纯 log 不收，log 里带 error/TypeError 的收", got: (function () { const a = consoleLines([{ level: "log", text: "普通一行" }, { level: "log", text: "TypeError: x" }, { level: "error", text: "接口 500" }]); return a.length === 2; })(), want: true },
    { n: "#1/#3 evidenceGaps：没开旗标时点名「载具没采」，开了而窗口为空时点名「通道已开但没采到」（两句意思不同）", got: (function () { const c = { evidence: "截图 + Toast + console + network", title: "" }; const off = evidenceGaps(c, { on: false, toastCount: 0, consoleCount: 0 }); const on = evidenceGaps(c, { on: true, toastCount: 1, consoleCount: 3 }); return off.length === 3 && /没带 --native-capture/.test(off[0]) && /network/.test(off[2]) && on.length === 1; })(), want: true },
    { n: "#1 行上必须真的落这两个字段（钉死「rejection 路径也要填自己报告的读数」）", got: (function () { const src = readFileSync(resolve(import.meta.dirname, "r-exec-cli.mjs"), "utf8"); return /toast: toastVal, console: consoleVal/.test(src) && /nativeDrain\(\)/.test(src); })(), want: true },
  ];
  const bad = cases.filter((c) => c.got !== c.want);
  for (const c of cases) console.log((c.got === c.want ? "  ok " : "  BAD") + " " + c.n + " got=" + c.got + " want=" + c.want);
  console.log("EXEC_SELFTEST=" + (bad.length === 0 ? "PASS" : "FAIL") + " cases=" + cases.length + " bad=" + bad.length);
  process.exit(bad.length ? 1 : 0);
}
const isLockCriterion = (c) => /\.lock-screen|__lock\b|lock-screen|LockScreen/.test(String((c.action || "") + " " + (c.expected || "") + " " + (c.tapTarget || "")));
const WARMUP_PAGE = arg("warmup-page", "pages/home/index");
const SHOT_DIR = join(REPO, "reports", "screenshots", LABEL);
const RES = join(OUT_DIR, "exec-results.json");
const sleep = (ms) => { const t = Date.now() + ms; while (Date.now() < t) {} };
const relOf = (p) => p.split("\\").join("/").replace(REPO.split("\\").join("/") + "/", "");

/* 交互动词表就是"这条用例会不会被点"的唯一口径，普查与选择器门都从这里取（它们不许再各抄一份）。
   英文词必须带字母边界：只读复判抓到 lane 自己写的 newAction 用 "tap .x"，旧表没有英文 ⇒ 那 13 条
   点名点得对、执行器却根本不走点击分支（静默不测）。反向的坑也要挡住：getApp() 里有 "tAp"、
   searchTap 里有 "tap"，无边界会把这些幽灵入口断言误判成"要点东西"。
   2026-09-29（capability audit C-3/G-2）：这条老边界 `(?<![A-Za-z])` 把**驼峰动词**整类杀了 ——
   `rapidTap×5` 里的 "Tap" 左边是字母 `d` ⇒ 不匹配 ⇒ DND08/TP04/SCU06/SCU10/SCH10/RP06/INT07/FB07/TK05
   这一族"快速连点"判据一次交互都没发出，却顺着最后的 else 记成 EXECUTED（假绿，不是假红）。
   这里**不放宽 TAP_RE 本身**：驼峰接缝只能靠大小写认，而 /i 会把 `[a-z]`/`[A-Z]` 一起折叠
   （实测 `/(?<=[a-z])(?=[A-Z])/i` 连 catchtap、bindtap 都判成驼峰 ⇒ 整道边界失效；
   换 `\p{Ll}`/`\p{Lu}` 也一样被折叠，且不带 u 旗标时它俩根本退化成字面量集合）。
   所以另起一条大小写敏感的字面量 TAP_CAMEL_RE，再由 wantsInteraction() 合成消费者用的唯一口径。
   判据台 1107 条 action 实测：旧口径 698 条命中 ⇒ 新口径 712 条，新增 14 条**逐条读过**
   全是要求真点/真连点的（9 条 rapidTap×5 + 5 条"点 X"），且旧命中一条没丢（严格超集，
   守恒断言在 scripts/qa/test-exec-tap-verb-camel.cjs）。 */
const TAP_RE = /点击|按下|长按|双击|输入|滑动|滚动|拖动|下拉|勾选|切换后|聚焦|失焦|(?<![A-Za-z])(?:tap|click|input|scroll|swipe|trigger|press)(?![A-Za-z])/i;
/* 驼峰接缝那一半（**不许加 i 旗标**，加了就等于没有）：
   判点四条 —— ① 动词起点在"小写字母紧跟大写字母"的接缝上（rapid|Tap、double|Tap、long|Press）；
   ② 动词按驼峰本来的写法逐字列出（首字母大写 + 其余小写）：没有 /i 就不能写小写 `tap` 去顶 "Tap"，
      列成 Tap|Click|Input|Scroll|Swipe|Trigger|Press 顺带把全大写的常量名（TAP_MOVE_THRESHOLD）挡在外面；
   ③ 动词必须是标识符的末段（后面不再跟字母），所以 `tapAvatar`/`scrollTo`/`CardSwiper`/`TAP_…` 不算；
   ④ 接缝之后整段词不许紧接着引号：`emit('searchTap')` 里 search|Tap 与 rapid|Tap 形状完全相同，
      机器分得开的只有"被引号包住的是**名字**（幽灵入口断言，本轮实测过的误判来源，见
      scripts/qa/census-tap-targets.mjs:22-25），裸写在动作句里的才是动作"。
   消费者一律走 wantsInteraction()；普查脚本按名字把这两条一起取走，取不到就硬失败（不许各抄一份）。 */
const TAP_CAMEL_RE = /(?<=[a-z])(?=[A-Z])(?![\w$]*['"`])(?:Tap|Click|Input|Scroll|Swipe|Trigger|Press)(?![A-Za-z])/;
const wantsInteraction = (text) => { const s = String(text === undefined || text === null ? "" : text); return TAP_RE.test(s) || TAP_CAMEL_RE.test(s); };
const FRAME_RE = /截图|全帧|出帧|特写|帧/;
/* ── 动词清单与"发得出去吗"的判定（capability 车道 #2；2026-09-29）──────────────────────
   症状（reports/audit/round-7/c21-executor-capability-matrix.md:356-360 已记为比"没接线"更高一级）：
   本文件只有一个元素级下发点（:1141 那一句 element(isInput ? "input" : "tap", …)），
   判据点名 longpress / rapidTap×5 / 拖动 / 在 showModal 点「取消」时，它**一律发一次普通 tap**，
   然后顺着末尾的 else 记 EXECUTED —— 换动词冒充判据，就是假绿。
   老执行器早就有这道闸：scripts/qa/r-exec.cjs:1174 UNIMPLEMENTABLE_ACTION_RE（回归测试
   scripts/qa/test-observe-markers.cjs），但 r-exec-cli.mjs 里没有对应物 ⇒ 这里补的是**那条闸的等价物**，
   再加上 r1-exec.cjs 有、本文件没接的 longpress(:1033+:1068) / pullDown(:1115-1126) 两条动线。
   口径三条：
     ① emittable=false 的动词（repeat/swipe/nativeModal/networkFault）在任何模式下都发不出去 ⇒ 拒发，
        记 SKIPPED + NOT_SHOOTABLE 原因，点名欠的是哪个原语；**绝不退化成 tap**。
     ② emittable 取决于旗标的动词（longpress/pullDown）：--gestures 才发；没带旗标时同样拒发（而不是发 tap）。
     ③ 判据同时点名"发得出去的"和"发不出去的"（例：MSG26 长按 + 连点×5 + showModal + 断网）⇒ 整条拒发：
        一次部分交互会把"这一条已按判据点名的动作测过"冒充出来，而那正是它不许的结果。
   动词表是**读 c.action 的纯函数**（不读 argv），旗标由调用方显式传进来 ⇒ 离线负例能同时驱动两条模式。 */
const VERB_LONGPRESS_RE = /长按|longpress|long\s*press/i;
const VERB_PULLDOWN_RE = /下拉刷新|下拉|pullDown|startPullDownRefresh|onPullDownRefresh/i;
const VERB_RAPID_RE = /rapidTap|连点|连击|连续点|重复点击|双击|doubleTap|×\s*\d+\s*次|\d+\s*次内|循环\s*\d+\s*次|依次点|逐个点击/i;
const VERB_SWIPE_RE = /拖动|拖拽|滑块|滑动|swipe|drag/i;
const VERB_MODAL_RE = /showModal|showActionSheet|操作菜单|原生 ?Modal|系统弹窗/i;
const VERB_OFFLINE_RE = /断网|网络中断|弱网|离线状态|故障注入|5xx|返回 ?500/i;
const VERB_RULES = [
  { verb: "longpress", re: VERB_LONGPRESS_RE, needsGesture: true,
    why: "判据点名长按；本通道的元素级动作只有带 --gestures 时才发 longpress（载具 r1-exec.cjs:1033+:1068）" },
  { verb: "pullDown", re: VERB_PULLDOWN_RE, needsGesture: true,
    why: "判据点名下拉刷新；这条动线是 evaluate(uni.startPullDownRefresh)（载具 r1-exec.cjs:1115-1120），只在 --gestures 下发" },
  { verb: "rapidTap", re: VERB_RAPID_RE,
    why: "判据点名「重复/连点/依次点」，本通道没有重复下发原语：每次 element() 都是一次 execFileSync 进程派生（cli-automator.mjs:111），而 :1145 还刻意 sleep(700) ⇒ 「500ms 内 ×5」在这条腿上物理不可满足（审计 C21 (f) G-6 判它 transport-bound）。一次 tap 会把「请求条数=1／Toast 条数=1」这类判点变成恒真，正是 DND08 判据④点名的失败模式" },
  { verb: "swipe", re: VERB_SWIPE_RE,
    why: "判据点名拖动/滑动方向：需要 touchstart→touchmove→touchend 带位移的三件套（载具 r1-exec.cjs:1201-1222），本通道没接，且 DC08 那类判据还含「轻点不得被判为左右滑」的反向断言 ⇒ 用 tap 顶它等于测它明确排除的东西" },
  { verb: "nativeModal", re: VERB_MODAL_RE,
    why: "判据要在原生 Modal/ActionSheet 里选「取消」或「确定」：原生弹层不在页面渲染树里，automation_element_action 只收 selector（cli-automator.mjs:162-164）⇒ 选择器进不去。--native-capture 能把「弹过哪个原生 API、标题是什么」采进 row.toast（观察半边），但「点哪个选项」的驱动半边仍是新代码，不在本车道" },
  { verb: "networkFault", re: /断网|网络中断|弱网|离线状态|故障注入|5xx|返回 ?500/i,
    why: "判据点名断网/故障注入：本仓五条执行器里没有任何网络条件注入通道（审计 C21 (d)-c-2：mockWxMethod 只在 r1-exec.cjs:1134/r-exec.cjs:1551 用于 chooseImage）⇒ 属 [NEW]，不在本车道" },
];
/* 纯函数：这条判据点名了哪些动词、各自发不发得出去。旗标由调用方传入（离线负例据此跑两种模式）。 */
function verbsNamed(action, gesturesOn) {
  const s = String(action === undefined || action === null ? "" : action);
  return VERB_RULES
    .filter((r) => r.re.test(s))
    .map((r) => ({ verb: r.verb, why: r.why, emittable: r.needsGesture ? !!gesturesOn : false }));
}
/* 返回拒发原因串（空串 = 没有不可发出的点名动词，按原口径下发）。
   NOT_SHOOTABLE 是本仓既有拼写（artifact-band.mjs:70、shoot-frameplan.mjs:227 IDENTITY_REFUSED_STATUS），
   但行状态词表受 :1284 的守恒检查限定为 EXECUTED|FAILED|SKIPPED ⇒ 状态留 SKIPPED（执行器里的"拒发"档），
   机读标记放在原因串开头，记账方按前缀抠。 */
function verbRefusal(action, gesturesOn) {
  const bad = verbsNamed(action, gesturesOn).filter((v) => !v.emittable);
  if (!bad.length) return "";
  return "NOT_SHOOTABLE(verb=" + bad.map((v) => v.verb).join("/") + "): 判据点名的动词在本通道发不出去 ⇒ 一次普通 tap 都不发（换动词冒充＝假绿，见 c21 审计 E-II）：" +
    bad.map((v) => v.verb + " :: " + v.why).join("；") +
    "；要它被自动判，得补对应原语（longpress/pullDown 用 --gestures，其余欠 [NEW] 通道）或换载具/人工判，不许记成产品 FAILED";
}
/* 元素级动词的唯一选择点（纯函数；:1141 那一句是它唯一消费者）。
   输入腿口径完全照旧（wantsInputLeg），长按只在 --gestures 且判据点名长按时才顶掉 tap。 */
function pickElementVerb(action, sel, gesturesOn) {
  if (wantsInputLeg(action, sel)) return "input";
  if (gesturesOn && VERB_LONGPRESS_RE.test(String(action || ""))) return "longpress";
  return "tap";
}
/* longpress/pullDown 两条动线的载荷（纯字符串构造，可离线检查问了什么）。
   pullDown 照 r1-exec.cjs:1115-1120：取栈顶页、有 uni.startPullDownRefresh 就调，返回 'uni-ok'/'no-uni'/'ERR …'，
   绝不静默成功。stopRefresh 同款（:1121-1126），用来收尾避免刷新态吊在下一组上。 */
function pullDownSource() {
  return "() => { try { var c = getCurrentPages(); var p = c[c.length - 1]; if (!p) return 'no-page'; " +
    "if (typeof uni !== 'undefined' && uni.startPullDownRefresh) { uni.startPullDownRefresh(); return 'uni-ok'; } " +
    "if (typeof p.onPullDownRefresh === 'function') { p.onPullDownRefresh(); return 'page-handler-ok'; } return 'no-uni'; } " +
    "catch (e) { return 'ERR ' + e.message; } }";
}
function stopRefreshSource() {
  return "() => { try { if (typeof uni !== 'undefined' && uni.stopPullDownRefresh) { uni.stopPullDownRefresh(); return 'ok'; } return 'no-uni'; } " +
    "catch (e) { return 'ERR ' + e.message; } }";
}
/* pullDown 的返回值翻译成判点：三种答案必须分得开 —— 刷新真被调起 / 页面无下拉刷新能力 / 通道报错。
   （把 'no-uni' 读成"已下拉"就是凭空造绿。） */
function pullDownVerdict(r) {
  const s = String(r === undefined || r === null ? "" : r);
  if (/uni-ok/.test(s)) return "ok";
  if (/page-handler-ok/.test(s)) return "ok(直接调页内 onPullDownRefresh，非 uni 链路)";
  if (/no-uni/.test(s)) return "unsupported(该页没挂下拉刷新能力)";
  if (/no-page/.test(s)) return "no-page";
  if (/ERR/.test(s)) return "error";
  return "unknown";
}
/* ── 原生调用流钩子（capability 车道 #1；载具 r1-exec.cjs:278-299 installToastHook / :300-305 drainToasts）──
   症状：本文件把 row.toast / row.console 钉死成空串（同一句现在落在 :524，只是右边换成了 toastVal/consoleVal），
   于是"Toast 文案/条数"这类判点在本项目被宣告成**不可测**（c21 审计 G-4：372 条点名 Toast、G-5：864 条点名 console，
   零条记到欠账）。而 :25 早就 import 了 evaluate ⇒ 这两个钩子本来就是纯 evaluate 载荷，是能接而没接。
   接上之后"toast 文案量不到"这句话在本项目**不再成立**（这一条要显式改口，见 RUNNER_NATIVE_CAPTURE 行）。
   诚实边界三条，别当成与 r1 等位：
     ① 钩子包的是 **wx.*** 那一层（uni.showToast 最终落到 wx.showToast ⇒ 覆盖得到），
        但它记的是"**调用**"：原生浮层有没有真渲染出来要靠帧，行里读不到帧上的浮层；
     ② console 只有**应用上下文**那一份（DevTools 框架告警/未捕获异常走的是 WS 事件流
        r1-exec.cjs:211-222，本 CLI 通道没有对应工具 ⇒ 审计 C21 (f) G-5 判它 [PORT, WS-only]）。
        所以行上另记 consoleScope，读的人不许把这一份当全量 console；
     ③ 钩子内**原样透传**被包函数（orig.apply），不改小程序行为；包裹失败逐 API 吞掉，
        装不上就报 ERR，绝不假装装上了（返回 'installed' / 'already' / 'ERR …' 三态照 r1-exec.cjs:281-296）。 */
function nativeHookSource() {
  return "() => { try {" +
    "if (globalThis.__qaNativeHooked) return 'already';" +
    "globalThis.__qaToasts = []; globalThis.__qaLogs = [];" +
    "var num = function (v) { return (typeof v === 'number' && isFinite(v)) ? v : null; };" +
    "var txt = function (v) { try { var s = (typeof v === 'string') ? v : (v && v.title !== undefined ? String(v.title) : JSON.stringify(v)); return String(s === undefined ? '' : s).slice(0, 200); } catch (e) { return String(v).slice(0, 200); } };" +
    "var wrap = function (name) { try {" +
    "  var orig = wx[name] ? wx[name].bind(wx) : null; if (!orig) return;" +
    "  wx[name] = function (o) {" +
    "    try { globalThis.__qaToasts.push({ api: name, title: txt(o), content: txt(o && o.content), confirm: !!(o && o.confirmText), cancel: !!(o && o.cancelText), dur: num(o && o.duration), ts: Date.now() }); } catch (e) {}" +
    "    return orig.apply(wx, arguments); };" +
    "  } catch (e) {} };" +
    "wrap('showToast'); wrap('hideToast'); wrap('showModal'); wrap('showLoading');" +   // 与 r1-exec.cjs:293 同列（showActionSheet 不在其中 ⇒ 别声称覆盖）
    "var cwrap = function (lv) { try {" +
    "  var orig = console[lv] ? console[lv].bind(console) : null; if (!orig) return;" +
    "  console[lv] = function () {" +
    "    try { var a = Array.prototype.slice.call(arguments); globalThis.__qaLogs.push({ level: lv, text: txt(a.join(' ')), ts: Date.now() }); } catch (e) {}" +
    "    return orig.apply(console, arguments); };" +
    "  } catch (e) {} };" +
    "cwrap('log'); cwrap('warn'); cwrap('error');" +
    "globalThis.__qaNativeHooked = true; return 'installed';" +
    "} catch (e) { return 'ERR ' + e.message; } }";
}
function nativeDrainSource() {
  return "() => { try { var t = (globalThis.__qaToasts || []).splice(0); var l = (globalThis.__qaLogs || []).splice(0); " +
    "return JSON.stringify({ toasts: t, logs: l.slice(-12), hooked: !!globalThis.__qaNativeHooked }); } " +
    "catch (e) { return JSON.stringify({ toasts: [], logs: [], hooked: false, err: String(e && e.message) }); } }";
}
/* 把取件串翻译成行字段（纯函数；喂合成 JSON 就能离线判红，不需要设备）。 */
function interpretNative(raw) {
  if (raw && typeof raw === "object") {
    const t = Array.isArray(raw.toasts) ? raw.toasts : [];
    const l = Array.isArray(raw.logs) ? raw.logs : [];
    return { toasts: t, logs: l, hooked: raw.hooked === true, err: raw.err ? String(raw.err).slice(0, 80) : "" };
  }
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  if (!s) return { toasts: [], logs: [], hooked: false, err: "取件串为空" };
  const cut = s.indexOf("{");
  try {
    const j = JSON.parse(cut >= 0 ? s.slice(cut) : s);
    const t = Array.isArray(j.toasts) ? j.toasts : [];
    const l = Array.isArray(j.logs) ? j.logs : [];
    return { toasts: t, logs: l, hooked: j.hooked === true, err: j.err ? String(j.err).slice(0, 80) : "" };
  } catch (e) { return { toasts: [], logs: [], hooked: false, err: "取件串解析失败:" + s.slice(0, 60) }; }
}
/* console 的取值口径照 r1-exec.cjs:1393：log 级默认不收，但其中的 error/warn/fail/TypeError 要收。 */
function consoleLines(logs) {
  return (Array.isArray(logs) ? logs : []).filter((e) => {
    const lv = String((e && e.level) || "");
    const tx = String((e && e.text) || "");
    return lv !== "log" || /error|warn|fail|NAV|TypeError|not defined/i.test(tx);
  }).map((e) => "[" + String((e && e.level) || "?") + "] " + String((e && e.text) || "").slice(0, 300));
}
/* toast 调用流 → 行内人眼可核、机器可抠的一串（DND08 的「Toast 条数=1」就是这条要给出的数）。 */
function toastSummary(toasts) {
  const t = Array.isArray(toasts) ? toasts : [];
  if (!t.length) return "无";
  const by = {};
  for (const e of t) { const k = String((e && e.api) || "?"); by[k] = (by[k] || 0) + 1; }
  const titles = t.map((e) => String((e && e.title) || "")).filter(Boolean);
  return "条数=" + t.length + " " + Object.keys(by).sort().map((k) => k + "×" + by[k]).join(",") +
    (titles.length ? " 文案[" + titles.slice(0, 3).join(" / ").slice(0, 160) + "]" : "");
}
/* 判据点名了哪几类证据（c21 审计 C-3：c.evidence 里写着 截图/network/Toast/console 五种，
   而本文件以前只拿 FRAME_RE 查"截图"那一种 ⇒ 其余三类既没取、也没在行上留下"欠"的记录）。
   文本面取 evidence + title + **expected**：DND08 的「Toast「设置已保存」条数=1」这条判点写在
   expected 里、不在 evidence 里，只看 evidence 就会漏掉这一族（实测 DND08/CS11/CF04 这一类
   "逐次记录条数"的判据都是这么写的）。 */
function evidenceKindsNamed(c) {
  const s = String((c && (c.evidence || "")) + " " + (c && c.title || "") + " " + (c && c.expected || ""));
  return { frame: FRAME_RE.test(s), toast: /toast|浮层提示|提示文案/i.test(s), console: /console|控制台/i.test(s), network: /network|请求|接口|响应|抓包/i.test(s) };
}
/* 证据欠账（纯函数，新增字段 evidenceGaps 的唯一来源；**不动 missingEvidence**，
   那字段的既有消费者 emit-exec-manifest.mjs:54 是按帧拒收正则抠的，塞别的串会把它的账搅浑）。
   读法：cap.on=false ⇒ "这一腿根本没开这个通道"；cap.on=true 而计数 0 ⇒ "通道开了但本条窗口内没有"
   —— 两句话意思不同，必须分开写，后者是判据信号、前者是载具限制。 */
function evidenceGaps(c, cap) {
  const k = evidenceKindsNamed(c);
  const out = [];
  if (k.toast) out.push(cap.on
    ? (cap.toastCount > 0 ? "" : "toast 通道已开但本条窗口内 0 条原生调用（读作「没采到」，不等于「页面没弹」——帧上的浮层另说）")
    : "判据点名 Toast 证据，而本腿没带 --native-capture ⇒ toast 调用流未采（行上 toast 恒空「不许」读成「没弹」）");
  if (k.console) out.push(cap.on
    ? (cap.consoleCount > 0 ? "" : "console 通道已开但本条窗口内 0 条（只有应用上下文那一份，见行内 consoleScope）")
    : "判据点名 console 证据，而本腿没带 --native-capture ⇒ 连应用上下文这一份都没采（DevTools 框架告警/异常是 WS 事件流那半边，审计 G-5）");
  if (k.network) out.push("判据点名 network 证据，而本通道没有逐请求计数通道（审计 G-2 [NEW]，不在本车道）");
  return out.filter(Boolean);
}


function git(a) { try { return execFileSync("git", a.split(" "), { cwd: REPO, encoding: "utf8" }).trim(); } catch { return ""; } }
const GIT_SHA = git("rev-parse --short HEAD") || "unknown";
const BOOT_T = Date.now();
/* 一次启动一枚 id：续跑合并之后"这些行是同一次跑出来的"这件事要看得见（行上 bootId、文件头 boots）。
   取值 = 启动时刻（到分）+ pid + 本次启动读到的 HEAD，不引入随机数（随机数没法复盘）。 */
const BOOT_ID = new Date().toISOString().slice(0, 16).replace(/[:T-]/g, "") + "-pid" + process.pid + "-" + GIT_SHA;
/* 尺寸读数的传递位：observed0 在拼 observed 的同一刻写，row() 取用后即清（见 row() 注释）。 */
let CUR_GEOM = "";

/* 这条通道的超时有时不是从 execFileSync 抛回来的，而是之后以未捕获的 socket 事件冒出来
   （本轮实测两次，第一次直接把整批取景带走）。执行轮是按小时算的，一条噪声不能吞掉已跑的行：
   记数 + 继续跑，末尾把次数打出来。 */
let transportErrs = 0;
/* 但这个 handler 不能把"启动阶段就炸了"也吞掉：实测它把一次 boot 期的 evaluate 失败
   变成"打印一行 TRANSPORT_ERR 然后事件循环空了 ⇒ 退出码 0"，一次什么都没跑的死法被记成通过。
   所以：boot 之前抛 = 致命，退 2；boot 之后抛 = 计一次并请求收尾（让守恒检查有机会跑）。 */
const RUN = { booted: false, abort: () => {} };
process.on("uncaughtException", (e) => {
  transportErrs++;
  console.log("TRANSPORT_ERR " + String((e && (e.stack || e.message)) || e).split("\n")[0].slice(0, 140));
  if (!RUN.booted) { console.log("RUNNER_RESULT=FAIL reason=启动阶段（登录票据/开页）就抛了，一行都没跑 ⇒ 这不是跑完，退 2"); process.exit(2); }
  RUN.abort();
});
process.on("unhandledRejection", (e) => {
  transportErrs++;
  console.log("TRANSPORT_REJECT " + String((e && e.message) || e).slice(0, 140));
  if (!RUN.booted) { console.log("RUNNER_RESULT=FAIL reason=启动阶段就出现未处理拒绝 ⇒ 退 2"); process.exit(2); }
  RUN.abort();
});

/* 钩子的两个设备调用点（只在 --native-capture 下发生；不带旗标时本文件一次都不多发这两个 evaluate）。
   装钩子 = 每批一次（照 r1-exec.cjs:230 在 connect 时装一次的做法）；取件 = 每行一次（窗口边界）。
   取件抛错不许把整批带走：routeStack 那一族实测过"一条探针抛错打死 18 行取景"（cli-automator.mjs:167-169），
   所以这里吞掉错误、把原因回传给行（interpretNative 的 err 半边会进 observed/evidenceGaps）。 */
function nativeInstall() {
  if (!NATIVE_CAPTURE) return { on: false, note: "off（没带 --native-capture ⇒ toast/console 通道未装，行上这两个字段照旧是空串）" };
  try {
    const r = String(evaluate(nativeHookSource(), { project: PROJECT }) || "");
    const st = /installed/.test(r) ? "installed" : /already/.test(r) ? "already" : /ERR/.test(r) ? "ERR" : "unknown";
    return { on: true, note: "install=" + st + " raw=" + r.slice(0, 80) };
  } catch (e) {
    return { on: true, note: "install=THREW " + String(e.message).replace(/\s+/g, " ").slice(0, 90) + " ⇒ 后续每行取件都会记 err，行不为空但读数不可信" };
  }
}
function nativeDrain() {
  if (!NATIVE_CAPTURE) return null;
  try { return interpretNative(evaluate(nativeDrainSource(), { project: PROJECT })); }
  catch (e) { return { toasts: [], logs: [], hooked: false, err: "取件抛错:" + String(e.message).replace(/\s+/g, " ").slice(0, 70) }; }
}

function row(manifest, page, c, status, route, reason, observed, evid, miss) {
  /* 逐行带戳（#C-2）：这一行是**本次启动**跑的，所以它的带就是 GIT_SHA（进程一开头读的 HEAD，
     见 stampMerged 的说明）。续跑合并时只有带这个字段的行才被认成"本 boot 干的"。 */
  /* 尺寸读数（#C-1）：observed0 在拼 observed 的同一刻把 geomText() 的结果放进 CUR_GEOM，
     这里取用后即清 —— 上一条的量到的尺寸绝不能落到下一条头上（同 :570 "上一版用 var，
     一条点着过就把后面全标成已交互" 那一族）。没走过 observed0 的行（开页失败/整页锁屏）
     拿到的是空串，因为组边界和每条开头都清过一次。 */
  const geometry = CUR_GEOM; CUR_GEOM = "";
  /* 原生调用流（capability 车道 #1）：**每一条出口都取一次件**，包括 SKIPPED/FAILED 那些。
     钩子装在 app 上、袋子是全局的，只有在"这一条的窗口边界"上排空，toast 才归属得到这条判据；
     更要紧的是——按本仓反复踩过的那条教训，拒绝路径必须把它自己该填的字段填上，
     否则下游（verify-guest-landing.mjs:182 读 row.toast、readjudicate-evidence.mjs:241 读 Array.isArray(row.console)）
     会把"这条被拒了"误读成"这条量过了而且没有 toast"。放在 row() 一处，是因为全文件的行只有这一处出口。 */
  const cap = nativeDrain();
  const capOn = !!cap;
  const toastVal = capOn ? cap.toasts : "";
  const consoleVal = capOn ? consoleLines(cap.logs) : "";
  const nativeNote = capOn
    ? " | native toast[" + toastSummary(cap.toasts) + "] console[" + (consoleVal.length ? consoleVal.length + "条(应用上下文)" : "无") + "]" +
      (cap.err ? " 取件未成:" + cap.err : "") + (cap.hooked ? "" : " 钩子不在位(取件时 __qaNativeHooked=false)")
    : "";
  const gaps = evidenceGaps(c, {
    on: capOn,
    toastCount: capOn ? cap.toasts.length : 0,
    consoleCount: capOn ? consoleLines(cap.logs).length : 0,
  });
  return {
    suite: "C-" + manifest, manifest, id: c.id, page, tier: c.tier || "normal",
    identity: IDENTITY, band: (BAND.mode || "?") + "@" + (BAND.sha8 || "?"),
    /* 会话证据与身份标签是两件事，行上必须两个都落：identity 是人给的标签，
       sessionSource/loginVerify 是这条腿**实际**拿到的会话（铸票端点 + store 实测）。
       门的登录轴（verify-real-coverage.mjs:237）以前只能信标签，从此能核对标签。
       文件级早就有 loginVerify（:387/:739），但门只读 results 里的行 ⇒ 行上没有就等于没证据。 */
    loginVerify: LOGIN_VERIFY, sessionSource: SESSION_SOURCE,
    requiresReal: c.requiresReal === true, title: String(c.title || "").slice(0, 160),
    status, observed: (observed || "") + nativeNote, missingEvidence: miss || [], failureReason: reason || "",
    /* toast / console：--native-capture 开时是**数组**（与 r1-exec.cjs:1437-1438 同形，
       也让 readjudicate-evidence.mjs:241 那句 Array.isArray(r.console) 第一次真的成立）；
       没带旗标时保持字面空串 ⇒ 既有批次的行形状一字不变（非破坏性）。
       nativeCapture / consoleScope 是把"这一份是什么范围的采集"写进行里，
       免得应用上下文那一份被读成 DevTools 全量控制台（审计 G-5 的诚实边界）。 */
    route: route || "", toast: toastVal, console: consoleVal, evidence: evid || "",
    nativeCapture: capOn ? "on(wx.showToast/hideToast/showModal/showLoading + console.log/warn/error)" : "off",
    consoleScope: capOn ? "app-context-only（CLI 通道没有 DevTools 框架告警/异常事件流；那半边是 WS：r1-exec.cjs:211-222）" : "none",
    evidenceGaps: gaps,
    geometry,
    gitSha: GIT_SHA, gitShaSource: "this-boot（该行执行时进程启动读到的 HEAD）", bootId: BOOT_ID,
    durationMs: CUR_T0 ? Date.now() - CUR_T0 : 0, at: new Date().toISOString(),
  };
}
let CUR_T0 = 0;
/* #70⑥（2026-09-27 三条只读腿各自独立撞到同一处）：原来只认 BEM 分隔符，
   .save-btn / .topic-card / .unread-hint 这类**产物里真实存在、也确实能点**的裸 kebab 类名
   在执行器眼里等于"没点名"。放宽成两条字面量正则（census-tap-targets 是从这个函数里现抠口径的，
   写成模块常量会让它抠不到 ⇒ 口径两半分家）。 */
function classesOf(text) {
  const seen = new Set();
  /* (?<![\w$.)\]])：点号左边必须是"词边界"，否则 `messages[0].length-1` 这种成员访问会被抠成
     一个类名 `.length-1`（实测把 DND05 判红了一次）。放宽裸 kebab 口径不能顺手把 JS 表达式当选择器。 */
  for (const m of String(text || "").matchAll(/(?<![\w$.)\]])\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__|--)[a-z0-9_-]+)/g)) seen.add("." + m[1]);
  /* (?![\w-]) 是必须的：没有它，".circle-card__count" 会被裸名正则抠出一个**幽灵名字**
     ".circle-card"（页上根本没有这个类），探针与点击都会去追它 —— 放宽口径不能顺手制造假目标。 */
  for (const m of String(text || "").matchAll(/(?<![\w$.)\]])\.([a-z][a-z0-9]*(?:-[a-z0-9]+)+)(?![\w-])/g)) seen.add("." + m[1]);
  return [...seen];
}
/* 两条来源分开记，因为可信度不同：tapTarget 是判据作者手写的权威目标（多命中也照点，那是他的选择）；
   从正文抠出来的只是推断，必须先证明在页上唯一才允许归属一次点击。 */
function authorityTargets(c) { const t = String(c.tapTarget || "").trim(); return t ? [t] : []; }
function judgeTargets(c) { return [...new Set([...authorityTargets(c), ...classesOf(String(c.action || "") + " " + String(c.expected || ""))])].filter(Boolean); }
/* 折叠探针回的计数："present(3)" ⇒ 3；读不出数字 ⇒ null（不许当成 1） */
function probeCount(v) { const m = /present\((\d+)\)/.exec(String(v || "")); return m ? Number(m[1]) : null; }
const INPUTISH = /(input|field|editor|textarea|search|entry|box|code|phone|msg|message|text|nick|title|keyword|amount|comment|desc|remark|pwd|password|otp|captcha)/i;
/* #70④：动词只证明"这条判据要交互"，不证明"这个元素吃输入"。
   旧写法把 123456 打进 .hero__back / .post-header__submit / .agree__chk，111 行还记成 EXECUTED。 */
function wantsInputLeg(action, sel) { return /输入|填写|粘贴/.test(String(action || "")) && INPUTISH.test(String(sel || "")); }
function inputVerbOnly(action) { return /输入|填写|粘贴/.test(String(action || "")); }
/* 自检必须放在这些 helper 之后：它调 wantsInputLeg/probeCount，而 INPUTISH 是 const（
   放在文件顶部那段会撞 TDZ —— 症状是"自检一跑就抛"，看起来像被测逻辑坏了）。 */
if (process.argv.includes("--selftest")) runSelftest();
/* 折叠探测：一次调用起 K 条 selectAll 查询，回调把条数写进 app 上的普通字段；
   第二次调用只读那个字段。返回 Promise 的写法本机不会被 await（notes §12），所以拆两步。
   2026-09-29（capability audit C-1/G-1）：这条探测**本来就问了渲染器要 size**
   （`fields({ size: true })`），但回调里只留 `res.length`，width/height 当场丢掉 ⇒
   "逐个 boundingClientRect 量测、回填 rpx 对照 88rpx"这一类判据（VI40/VI42/DND12/FHT14/CI21/CS23…
   按审计口径 67 条）从来没被量到过，行却还是 EXECUTED 且带帧。
   现在把已经回来的 width/height 留在袋子里（每个选择器最多 4 个节点，防爆载荷），
   经 interpretProbe() 挂到返回值的 `__geom` 上，再由 geomText() 拼成行内 `geometry` 字段。
   对设备只多了一个动作：同一次 evaluate 里顺手读一次窗口宽度（`__win`），用来把 px 换成判据点名的
   rpx；读不到就只报 px，绝不凭空造一个 rpx 数。**问渲染器要什么完全没变**（还是 size:true），
   所以这一刀不改任何探测的成败判定，只把丢掉的读数留下。
   先例：scripts/qa/r1-exec.cjs:1195-1198 的 measureTap 就是把 size/offset 当一等证据留着的。 */
function probeStartSource(selectors) {
  return "() => { const app = getApp(); const bag = {}; app.__probeBag = bag; " +
    "const num = function (v) { return (typeof v === 'number' && isFinite(v)) ? Math.round(v * 100) / 100 : null; }; " +
    "try { const wi = (wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : null)); " +
    "bag.__win = (wi && typeof wi.windowWidth === 'number') ? wi.windowWidth : null; } catch (e) { bag.__win = null; } " +
    "const sels = " + JSON.stringify(selectors) + "; " +
    "sels.forEach(function (s, i) { try { const q = wx.createSelectorQuery(); " +
    "q.selectAll(s).fields({ size: true }, function (res) { var arr = Array.isArray(res) ? res : (res ? [res] : []); " +
    "var boxes = []; for (var k = 0; k < arr.length && k < 4; k++) { boxes.push([num(arr[k] && arr[k].width), num(arr[k] && arr[k].height)]); } " +
    "bag[i] = { c: arr.length, b: boxes }; }); q.exec(); } " +
    "catch (e) { bag[i] = 'ERR'; } }); " +
    "return 'started:' + sels.length; }";
}
/* 纯函数（离线可测：scripts/qa/test-exec-probe-geometry.cjs 直接喂合成袋子）：
   把探测袋里的原始读数翻译成"计数 + 几何"。计数那一半的口径一个字都不动
   （present(N)/absent/no-answer/ERR），因为 probeCount()、锁屏闸门、observed 形状都有人在读。 */
function interpretProbe(selectors, bag) {
  const out = {};
  const geom = {};
  const src = bag && typeof bag === "object" ? bag : {};
  const win = typeof src.__win === "number" && src.__win > 0 ? src.__win : null;
  selectors.forEach((s, i) => {
    const v = src[i];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const n = Number(v.c);
      out[s] = isFinite(n) ? (n > 0 ? "present(" + n + ")" : "absent") : "no-answer";
      if (isFinite(n) && n > 0) geom[s] = { nodes: n, boxes: Array.isArray(v.b) ? v.b : [], win };
    } else if (typeof v === "number" && isFinite(v)) {
      /* 老袋子形状（只有条数）也照旧翻译成 present/absent：新增几何不该改变任何一条计数读法，
         万一哪天有人从别处塞一个数字进来，也不能凭空变成 "no-answer"。 */
      out[s] = v > 0 ? "present(" + v + ")" : "absent";
    } else {
      out[s] = v === undefined ? "no-answer" : String(v);
    }
  });
  if (Object.keys(geom).length) { out.__geom = geom; if (win) out.__win = win; }
  return out;
}
function probeMany(selectors) {
  if (!selectors.length) return {};
  const start = probeStartSource(selectors);
  const read = "() => JSON.stringify(getApp().__probeBag || {})";
  try { evaluate(start, { project: PROJECT }); } catch (e) { return { __err: String(e.message).slice(0, 70) }; }
  sleep(900);
  let bag = {};
  try { bag = JSON.parse(String(evaluate(read, { project: PROJECT }))); } catch (e) { return { __err: "read:" + String(e.message).slice(0, 50) }; }
  return interpretProbe(selectors, bag);
}
/* px → rpx：小程序里 750rpx == 窗口宽度 px。窗口宽度没量到就返回 null（宁缺毋造）。 */
function pxToRpx(px, winPx) {
  if (typeof px !== "number" || typeof winPx !== "number" || !(winPx > 0)) return null;
  return Math.round((px * 750 / winPx) * 100) / 100;
}
/* 把一个选择器量到的尺寸拼成"人眼可核、机器可抠"的一行：
   `.village-search=[128x240px ≈256x480rpx]`；渲染器没给数字就记 `?`，不记 0（0 是"量到 0"，两码事）。 */
function geomText(c, d) {
  const g = d && d.__geom;
  if (!g) return "";
  const parts = [];
  for (const sel of judgeTargets(c)) {
    const e = g[sel];
    if (!e) continue;
    const boxes = (e.boxes || []).map((b) => {
      const w = b && b[0], h = b && b[1];
      if (typeof w !== "number" || typeof h !== "number") return "?";
      const rw = pxToRpx(w, e.win), rh = pxToRpx(h, e.win);
      return w + "x" + h + "px" + (rw === null ? "" : " ≈" + rw + "x" + rh + "rpx");
    });
    parts.push(sel + (e.nodes > 1 ? "×" + e.nodes : "") + "=[" + (boxes.join(" ") || "?") + "]");
  }
  return parts.join(" ");
}
/* ── 逐行带戳的合并（纯函数；离线负例在 scripts/qa/test-exec-row-sha.cjs，函数声明提升所以 --selftest 也跑得到）──
   症状（capability audit C-2）：文件头那一枚 gitSha 是**进程启动时**读的 HEAD（:181），
   而续跑（同一 --out 下已有 exec-results.json，按 manifest|id 跳过跑过的）写盘时把它盖在
   **合并后的全集**上 ⇒ 上一次启动跑的行被盖上这一次启动的提交号，等于这一次跑在认领它根本没跑过的证据。
   实测形状：reports/audit/round-7/exec-interact-real-sc-r10/exec-results.json 文件头 gitSha=93650335
   （提交于 2026-09-28T19:41Z）、updatedAt=19:44Z，而它认领的行/帧是 19:13Z 的 —— 早了 28 分钟；
   下游 exec-frames-to-corpus.mjs 只能拿这枚顶层戳当"采集带"逐行写进 bandSha（:44/:70），
   verify-provenance-all.mjs:196 于是按这枚晚到的戳读出 4886 帧 PRE_STAMP（回填归因）。
   口径改三条：
     ① 行上 `gitSha` = 该行**实际执行那一刻**这次启动的 HEAD（row() 里写，续跑不改它）；
     ② 文件头 `gitSha` 保留，但语义明确收窄成本 boot 的 HEAD（gitShaScope="this-boot"），
        并把历次启动的戳记进 `mergedFrom` / `bootShas`，谁也没被悄悄改写；
     ③ 上一份文件里**没有**逐行戳的历史行：只能退回"它上次被写盘时文件头那枚"，并显式记
        `gitShaSource="inherited-prior-file"`；连那枚都没有就记 "unknown"，绝不套本 boot 的戳。 */
function stampMerged(priorDoc, priorRows, newRows, bootSha, bootId) {
  const boot = String(bootSha || "unknown");
  const map = new Map();
  for (const r of [...(priorRows || []), ...(newRows || [])]) map.set(r.manifest + "|" + r.id, r);
  const priorSha = String((priorDoc && priorDoc.gitSha) || "");
  const merged = [];
  for (const r of map.values()) {
    if (r && r.gitSha) { merged.push(r); continue; }
    merged.push(Object.assign({}, r, {
      gitSha: priorSha || "unknown",
      gitShaSource: priorSha
        ? "inherited-prior-file（该行由更早一次启动写入、当时没有逐行戳 ⇒ 沿用上一份文件头的 " + priorSha +
          "，绝不套本 boot 的 " + boot + "：本 boot 没跑过它，就不认领它的证据）"
        : "unknown（上一份文件头也没记戳 ⇒ 不猜是谁跑的）",
      bootId: (priorDoc && priorDoc.bootId) || "prior-boot",
    }));
  }
  const rowShas = {};
  const rowBoots = {};
  for (const r of merged) {
    rowShas[r.gitSha || "unknown"] = (rowShas[r.gitSha || "unknown"] || 0) + 1;
    const b = String(r.bootId || "unknown");
    if (!(b in rowBoots)) rowBoots[b] = r.gitSha || "unknown";
  }
  const mergedFrom = (Array.isArray(priorDoc && priorDoc.mergedFrom) ? priorDoc.mergedFrom : []).slice();
  const nPrior = (priorRows || []).length;
  if (nPrior) {
    mergedFrom.push({
      gitSha: priorSha || "unknown", rows: nPrior, bootId: (priorDoc && priorDoc.bootId) || "",
      round: (priorDoc && priorDoc.round) || "", updatedAt: (priorDoc && priorDoc.updatedAt) || "",
      note: "本 boot（" + boot + "）之前已在盘上的行：没重跑就不认领",
    });
  }
  const bootShas = [...new Set([...mergedFrom.map((m) => m.gitSha), priorSha, boot].filter((x) => x && x !== "unknown"))];
  return { merged, rowShas, rowBoots, mergedFrom, bootShas, nPrior, nNew: (newRows || []).length, priorSha, bootSha: boot, bootId };
}
/* 文件头里凡是"这一枚戳代表什么"的字段，都从这一处出（增量落盘与终稿共用，不许两套形状：
   :455 那条 skipped 数字互相打架就是分家分出来的）。 */
function fileStampHeader(stamped, extra) {
  return Object.assign({
    gitSha: stamped.bootSha,
    gitShaScope: "this-boot",
    gitShaMeaning: "顶层 gitSha = 本次进程启动时的 HEAD（只对**本 boot 跑的行**成立）；"
      + "逐行 gitSha 才是该行执行时的带，续跑不重打戳（#C-2）。下游按行取带请读 results[].gitSha，"
      + "exec-frames-to-corpus.mjs 已改成优先用行内戳写 bandSha。",
    bootId: stamped.bootId,
    bootShas: stamped.bootShas,
    rowShas: stamped.rowShas,
    rowBoots: stamped.rowBoots,
    mergedFrom: stamped.mergedFrom,
    resume: stamped.nPrior > 0,
    priorGitSha: stamped.priorSha || "(首跑，盘上没有旧件)",
  }, extra || {});
}

if (!existsSync(join(PROJECT, "app.json"))) { console.log("RUNNER_RESULT=FAIL reason=--project 不是已编译产物：" + PROJECT); process.exit(2); }
const files = (ONLY.length ? ONLY : readdirSync(OPS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))).sort();
if (!files.length) { console.log("RUNNER_RESULT=FAIL reason=没有要跑的 manifest（空扫描集不得占设备）"); process.exit(2); }

const prior = existsSync(RES) ? JSON.parse(readFileSync(RES, "utf8")) : { results: [] };
/* 记账口径：一条 EXECUTED 必须要么有帧、要么至少有一个探针答案。旧结果里不满足的那些
   （实测 4 条：DC37/H13/H29/H44）是"没有证据的绿"。--redo-holes 把它们**作废重测**，
   状态由重跑重新产生 —— 这不是改判洗色，是把没测过的东西重新测一遍。 */
function evidenceHole(r) {
  return r.status === "EXECUTED" && !r.evidence && !/present\(|absent/.test(String(r.observed || ""));
}
if (process.argv.includes("--redo-holes")) {
  const before = (prior.results || []).length;
  prior.results = (prior.results || []).filter((r) => !evidenceHole(r));
  console.log("RUNNER_VOIDED " + (before - prior.results.length) + " 条 EXECUTED-无证据 的行作废重测");
}
const done = new Set((prior.results || []).map((r) => r.manifest + "|" + r.id));
/* 身份标签先自证——位置在**建目录/取租约之前**，因为拒跑的含义就是"什么都没发生"：
   不写 OUT_DIR、不写帧目录、不碰 tmp/qa/locks、一行不跑。
   拒跑的形状照下面的游客档前置（assertGuestCapable @ artifact-band.mjs:59，r-exec-cli 里那条
   RUNNER_RESULT=FAIL reason=… + 退 2）。
   本轮实测的根因：mintToken 旧写法只分 "A" 与"不是 A"，非 A 一律 POST /auth/guest-login ⇒
   `--identity B` 的腿铸到的是**游客会话**，行却盖着 identity:"B"，而门的登录轴
   （verify-real-coverage.mjs:237 judgedLogin=has("A")||has("B")）把 A/B 等量齐观 ⇒ 假记账（不是假红）。
   现在 mintToken 分 A/B/guest：B 要 B 的凭据（scripts/qa/r-exec.cjs:IDENT_DEFS），读不到就抛 ⇒ 当场拒跑。 */
const IDENTITY = arg("identity", "A");
const PRODUCIBLE = assertIdentityProducible(IDENTITY, REPO);
if (!PRODUCIBLE.ok) {
  console.log("RUNNER_RESULT=FAIL reason=identity=" + IDENTITY + " 铸不出与之相符的会话：" + PRODUCIBLE.reason +
    " ⇒ 未建目录、未取租约、未写任何文件、一行不跑（把 B 行盖成游客票或 A 票都是伪造证据）");
  process.exit(2);
}
console.log("RUNNER_IDENT_PRODUCIBLE=" + IDENTITY + (PRODUCIBLE.mints
  ? " 铸票端点=" + PRODUCIBLE.source + "（凭据来源=" + PRODUCIBLE.credFrom + "）"
  : " 不铸票 ⇒ 按清会话跑（游客画面）"));
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SHOT_DIR, { recursive: true });

/* mintToken 的签名是 (kind, repoRoot, deviceId) 而且是 async。上一版写成 mintToken({project})：
   kind 不等于 "A" ⇒ 走 guest 分支，返回值又被 String() 成 "[object Promise]" 存进 storage。
   实测（scripts/qa/probe-boot-callsite.mjs，两工程各测一种形态）：
     · mock 工程坏 token 照样 logged-in(userId=user-1001) ⇒ mock 那两刀的落点判据不受影响，不必重跑；
     · real 工程坏 token ⇒ not-logged-in，所以 interact-real 的 259 行 SKIPPED 是我自己把门关上了。
   登录位是执行轮的前置而不是装饰：身份不对时整批落点都不可信 ⇒ 这里不成立就一行都不跑。 */
/* 按设计就不接受裸直达的路由：缺的是 URL 参数，不是产品修复。
   campus/index 的 onLoad 注释写明"无 ?school= 时校园圈入口应落到 hub"，
   所以这 15 条 case 在 A 侧被跳、在 B 侧被判"落在别的页"——补上参数才是它们本来的测法。
   （同一份表也写进 shoot-frameplan.mjs；两处要保持一致。） */
const ROUTE_QUERY = {
  "subpackages/campus/campus/index": "school=" + encodeURIComponent("南京大学"),
  "subpackages/discover-extra/discover/matching": "dev-preview=1",
  /* tag-posts 的 onLoad：无 ?tagName= 时提示并返回（P1-36），所以裸直达必然被弹走。
     取值用 fixture 里真实存在的标签（含 # 前缀，须 URL 编码）。 */
  "subpackages/village/village/tag-posts": "tagName=" + encodeURIComponent("#校园日常"),
  /* CS10/CS29 的 pre 自己点名要一个私聊会话。onLoad 只有 sessionId / userId 两条认会话的支路
     （chat-session/index.vue:736 / :743），都不带时走到 :790 pageErrorMessage=chat.missingSessionId，
     而输入条整块住在 :2150 v-if=pageErrorMessage 的 :2151 v-else 里（:2185 .wechat-input-bar、:2217 输入节点）
     ⇒ 裸直达必然量不到 .wechat-input-bar__input，那是缺参数不是产品没做。
     取值 = 身份 B（100159）：A 腿的本人是 100158（scripts/qa/r-exec.cjs:494），自己不能当自己的聊天对象；
     同页判据 CS04 的 pre 已按 userId=100159 跑通过（reports/audit/round-6/ops/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json:41-42）。 */
  "subpackages/chat/chat-session/index": "userId=100159",
  /* VD10/VD15 的 pre 分别是「身份A 进入帖子详情，底部输入栏可见；记录 .comments-count 当前值 N」与
     「身份A 进入他人帖子详情（不得是本人帖）」（reports/audit/round-6/ops/次要18.json VD10/VD15.pre）。
     本页唯一被消费的深链参数是 query.id（detail.vue:681），不带它 :709-714 直接 clearCurrentPost + toast
     帖子不存在，而正文 :781 scroll-view 与底部 :1262 detail-input-bar 都是 v-if="currentPost"
     ⇒ .post-body(:830)/.post-content(:831)/.input-bar__input(:1284) 在裸直达下必然 absent，那是缺参数不是产品没做。
     取值 16 同时钉住两档两轴：
       · 真实档 = 在册行 posts.id=16（status='active' + audit_status='approved' + visibility='public'）。
         getPost 的两道门（VillageQueryService:411 只放 active、:427 对非作者挡 pending）都过；
         实测只读列表 GET /api/v1/posts?page=3 里 id=16 在（total=231=DB active+approved 计数），
         author.userId=10016（谢知意）≠ 本人 100158 ⇒ VD15 的「他人帖」成立；commentCount=8 ⇒ VD10 有基数 N。
       · mock 档 = stores/village/index.ts:1086 的 "N → post-N" 兼容映射把 16 解成 mock-data.ts:605 的 post-16，
         正是 VD01/VD02/VD19 三条判据自己点名的号 ⇒ 同一行让 mock 腿也落在有帖子的画面上。
     不是抄夹具号段：禁区是 posts 9000-9029 / users 20000-20049（database/flyway/sql/V2026.08.09.0002__seed_post_likes_favorites_and_views.sql:13），
     16 是 posts 自增序列里的种子帖，两档各自可证存在。 */
  "subpackages/village/village/detail": "id=16",
  /* TD03/TD06 的 pre 分别要「身份A 进入话题详情（回复栏 :412-428）」与「身份A 进入他人话题详情（不得长按自己的内容）」。
     onLoad 只认 topicId/id（topic-detail.vue:217），缺它 :226 toast storeErrors.circle.topicIdInvalid 且 currentTopic 恒空，
     而 :271 正文 scroll-view 与 :410 detail-footer 都是 v-if="currentTopic" ⇒ .topic-content(:294)/.reply-input(:415) 必然 absent。
     取值 37 = 在册行 circle_topics.id=37：audit_status='approved'（30 行全是 approved，且无一行 author=100158）、
     author_id=10014 ≠ 本人 ⇒ TD06 的「他人」成立；reply_count=12 且 circle_replies 实际就是 12 行 ⇒ TD03 的
     「服务端回读回复条数只能 +1」有基数可回读。实测 GET /api/v1/circles/topics/37 = 200
     {id:37,title:"猫咪名字征集",authorId:10014,replyCount:12,circleId:15}、
     GET /api/v1/circles/topics/37/replies = 200 totalElements=12；对照 GET /circles/topics/999999 = 400 请求参数错误
     ⇒ 这条路只认在册行，抄一个演示号（topicId=9/99）会被当场打回。 */
  "subpackages/circles/circles/topic-detail": "topicId=37",
  /* 下面两页**故意不落行**，缺的不是"值"而是别的载具，写进去只会把另一条判据的落点换掉（表是页粒度的，
     同页所有 case 共用一行 ⇒ 一行只能钉一种落点）：
   · subpackages/market/detail/index（MD09）三重挡：
       ① 商业化封存：app_switch 'commerce.enabled'=0（后台闸，DB 实测），GET /api/v1/app-config 现答
          "commerce.enabled":false ⇒ commerceSealed 为真，onLoad :267 在 loadProduct 之前早退，
          只渲染 :306 封存卡，`.product-scroll`(:360) 拿任何 id 都到不了；
       ② 商品接口本身现在是坏的：GET /api/v1/products/1|3|列表 全部 HTTP=500
          NullPointerException at CommerceGuardAspect.java:49（apps/api/logs/campus-love-api-error.log 2026-09-28 15:43）
          ⇒ 没有任何商品 id 能在此刻解析；
       ③ 就算通了也不满足 MD09 的前置「介绍超长的商品」：products 全表 6 行、status 全=1（在架），
          MAX(CHAR_LENGTH(description))=17（id=1 校园音乐节早鸟票），离"500 字超长"差两个数量级，
          而本道授权是只读库，不许我补一条长描述夹具。
     另外 MD07（requiresReal=true）与 MD09 同页而落点相反（它要 (a) 无 id / (b) ?id=999999 的 notFound 空态），
     页粒度表里落一行就吃掉另一行 ⇒ 这页要的是「逐条目 precondition.query」或后端夹具，不是 ROUTE_QUERY。
   · subpackages/profile-extra/profile/other（OT05/OT06/OT09）两重挡：
       ① 前置互相矛盾，页粒度一行装不下：OT05 要「未喜欢过」的目标、OT06 要「已喜欢/互喜」的目标。
          以本人为 A=100158 实测 likes：user_id=100158 只有 target=10003(active) 与 target=100155(active)，
          而 target_user_id=100158 只有 10003 ⇒ 10003=互喜(OT06 态2)、100155=已喜欢未匹配(OT06 态1)、
          10001=未喜欢(OT05，实测 GET /api/v1/profile/10001 = 200 basic.name=远山/age=25/location=北京)。
          三个不同 id 才凑得齐三条判据，写死任意一个都让另一条当场失真；
       ② OT02/OT03（同页）的落点就是「不带 userId ⇒ missingParam」，钉了值就把它们从"参数缺失错误态"改成渲染资料卡。
     加上这两行的点名物件是组件作用域名（.relationship-cta__btn--like / .whisper-sheet__input 只活在
     components/profile/public/RelationshipCTA.vue、components/discover/WhisperComposeSheet.vue 里），
     CLI 通道的元素级动作进不了组件子树 ⇒ 补 query 至多让它"可判"，闭不上，归 WS 腿（r-exec-ws.mjs）。
     证据来源：reports/audit/round-6/ops/次要20.json 与 次要22.json 的 pre 字段、reports/audit/round-6/ops/次要18.json TD02.pre。 */
};
/* 模拟器独占租约（round-7 补）：本机两条通道驱动同一个 DevTools 模拟器，
   并发不会报错，只会互相换页——实测一批测量因此作废（58 行落点探针取空）。
   拿不到租约就一行都不跑，而不是"跑完再解释为什么到处是 ERR"。 */
const UI_LEASE_OWNER = "r7-cli-exec-" + LABEL;
if (process.env.QA_SKIP_UI_LEASE === "1") {
  console.log("RUNNER_LEASE=SKIPPED（QA_SKIP_UI_LEASE=1，明知有别的驱动时会污染测量）");
} else {
  const gotLease = acquireUi({ owner: UI_LEASE_OWNER, batch: "R7" });
  if (!gotLease.ok) {
    console.log("RUNNER_RESULT=FAIL reason=模拟器已被占用（" + gotLease.holders.map((h) => h.owner + "@pid" + h.pid + " 租期到 " + h.leaseUntil).join("；") +
      "）⇒ 一行都不跑；确要并发请显式设 QA_SKIP_UI_LEASE=1");
    process.exit(2);
  }
  console.log("RUNNER_LEASE=ACQUIRED " + String(gotLease.file).replace(process.cwd() + "/", "") + " owner=" + UI_LEASE_OWNER);
  const releaseLease = () => { try { releaseUi({ owner: UI_LEASE_OWNER }); } catch (e) { /* 退出路径上的释放失败不该改判决 */ } };
  process.on("exit", releaseLease);
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { releaseLease(); process.exit(sig === "SIGINT" ? 130 : 143); });
}
/* IDENTITY 与"这个标签铸不铸得出相符会话"已经在取租约之前判过（见 RUNNER_IDENT_PRODUCIBLE）。
   SESSION_SOURCE = 这一腿的会话**实际**是从哪儿来的（phone-login / guest-login / cleared），
   与 identity（人给的标签）是两个独立的事实，行上要同时落这两个数，门才核对得了（:176 row()）。 */
let LOGIN_VERIFY = "";
let SESSION_SOURCE = "";
if (IDENTITY === "guest" || IDENTITY === "none") {
  /* 游客档不是"铸一个 B token"：mintToken + bootSession 之后 store 仍是 logged-in，
     而本执行器下一道门要求 logged-in，于是 --identity B 既当不了游客也过不了门
     （B 侧执行轮里 26 条 PAGES-LOGIN-INDEX 就是被这条假路径挡在外面的）。
     真游客 = 清本地会话 + 复位 store，并且必须量到 not-logged-in 才开跑。 */
  /* 再加一道载体档位前置：mock 包的启动链路会无条件把会话造回来（artifact-band.mjs 里
     那条读源码的判点），所以"清完会话"只代表这一刻是游客，第一次开页就可能不是了。
     默认拒绝开跑；确认过次序可行的话用 --guest-warmup 先预热一次再清，并把这个选择写进账。 */
  const cap = assertGuestCapable(REPO, PROJECT, { allow: WARMUP_GUEST });
  console.log("RUNNER_GUEST_BAND mode=" + (cap.band.mode || "?") + " ok=" + cap.ok + (cap.warned ? " warmup=请求预热后开跑" : ""));
  if (!cap.ok) {
    console.log("RUNNER_RESULT=FAIL reason=" + cap.reason + " ⇒ 一行都不跑（跑出来的落点红不可采信）");
    process.exit(2);
  }
  if (WARMUP_GUEST) {
    try { openPage(WARMUP_PAGE, "", { project: PROJECT }); } catch (e) { /* 预热那一次开页的落点不重要，重要的是把启动链路走完 */ }
    sleep(SETTLE);
    console.log("RUNNER_GUEST_WARMUP page=" + WARMUP_PAGE + " landing=" + (String(routeStack({ project: PROJECT }) || "(空)")));
  }
  const c = clearSession({ project: PROJECT });
  SESSION_SOURCE = "cleared";
  LOGIN_VERIFY = verifyLogin({ project: PROJECT });
  console.log(`[boot] ${c} identity=guest verify=${LOGIN_VERIFY}${WARMUP_GUEST ? "（预热后清的会话）" : ""}`);
  if (!/^not-logged-in/.test(LOGIN_VERIFY)) {
    console.log("RUNNER_RESULT=FAIL reason=要游客态但会话没清掉：" + LOGIN_VERIFY + " ⇒ 一行都不跑");
    process.exit(2);
  }
} else {
  let minted = null;
  try {
    /* 标签原样交给 mintToken：A 铸 A 的票、B 铸 B 的票、guest 铸游客票，词表外的标签直接抛。
       旧写法是 `IDENTITY === "B" ? "B" : "A"`，而 mintToken 内部又只分 A/非 A ⇒ 任何非 A 标签
       最后拿到的都是游客会话（本轮那条假记账的两个环节都在这里）。 */
    minted = await mintToken(IDENTITY, REPO, "r7-exec-" + LABEL);
    const b = bootSession(minted.token, { project: PROJECT });
    SESSION_SOURCE = String(minted.source || "(mintToken 未报 source)");
    LOGIN_VERIFY = verifyLogin({ project: PROJECT });
    console.log(`[boot] ${b} identity=${IDENTITY} mint=${SESSION_SOURCE} 铸到userId=${minted.userId} verify=${LOGIN_VERIFY}`);
  } catch (e) {
    console.log("RUNNER_RESULT=FAIL reason=铸 token / 写会话失败：" + String(e.message).slice(0, 140) + " ⇒ 一行都不跑");
    process.exit(2);
  }
  if (!/^logged-in/.test(LOGIN_VERIFY)) {
    console.log("RUNNER_RESULT=FAIL reason=store 报 " + LOGIN_VERIFY + " ⇒ 未登录画面不能当已登录证据，整批不跑（游客档请用 --identity guest）");
    process.exit(2);
  }
  /* 最后一道核对：store 里那个会话必须就是这次铸出来的那张票。
     对不上是"上一个进程留下的 storage 状态"（r-exec-ws.mjs:57 记过同款事故），不是这个身份的会话 ⇒ 整批不跑。 */
  const obsUser = observedUserId(LOGIN_VERIFY);
  if (obsUser && minted && minted.userId && obsUser !== String(minted.userId)) {
    console.log("RUNNER_RESULT=FAIL reason=identity=" + IDENTITY + " 要的是 userId=" + minted.userId + "（" + SESSION_SOURCE + "）的会话，"
      + "store 实测 userId=" + obsUser + " ⇒ 标签与可证会话不符，一行都不跑");
    process.exit(2);
  }
}
RUN.booted = true;
/* 原生调用流钩子：会话就绪之后、开任何页之前装一次（载具 r1-exec.cjs:230 是 connect 后立刻装）。
   装在开页之前是必须的 —— 游客闸门/守卫弹回的那些 showModal 就发生在页面 onLoad 那一刻，
   装晚了那些调用永远采不到，而它们恰好是 guest-landing 一族判据要看的证据。 */
const NATIVE_INSTALL = nativeInstall();
console.log("RUNNER_NATIVE_CAPTURE=" + (NATIVE_CAPTURE ? "on" : "off") + " " + NATIVE_INSTALL.note +
  (NATIVE_CAPTURE
    ? " ⇒ 行上 toast/console 改为数组（r1-exec.cjs:1437-1438 同形）；「toast 文案在本项目量不到」这句话从本腿起不再成立"
    : " ⇒ 行上 toast/console 仍是字面空串（与既有批次同形）；空串读作「没采」，不读作「没弹」"));
console.log("RUNNER_VERBS gestures=" + (GESTURE_MODE ? "on(longpress+pullDown 会发出)" : "off") +
  " strict=" + (STRICT_VERBS ? "on(判据点名的动词发不出去时拒发普通 tap ⇒ SKIPPED+NOT_SHOOTABLE)" : "off(旧口径：动词不匹配也照发一次 tap)") +
  (STRICT_VERBS || !TAP_MODE ? "" :
    " ⇒ 注意：本腿仍是旧口径，rapidTap/拖动/原生Modal/断网/长按/下拉 这六类判据会被一次普通 tap 顶掉并记 EXECUTED，" +
    "那一类 EXECUTED 不许读成「点名动词已测」（c21 审计 E-II；要它们不被冒充请带 --strict-verbs 或 --gestures）"));

/* 每跑完一个页组就落一次盘：这条通道会偶发把进程带走（实测两次未捕获 socket 超时），
   跑了 40 分钟的成果不能跟着一起没了。最终那次写盘仍走下面的守恒检查。 */
function flush() {
  /* 增量落盘也走同一个 stampMerged：以前这里把 prior 的行和本 boot 的行合并后，
     整份文件盖上 GIT_SHA（本 boot 的 HEAD）——续跑跑到一半就把旧行的出处改写了，
     终稿那次至少还有个守恒检查挡一下，增量那次连挡都没有。现在两处分文合并成一处。 */
  const stamped = stampMerged(prior, prior.results || [], rows, GIT_SHA, BOOT_ID);
  const merged = stamped.merged;
  try { writeFileSync(RES, JSON.stringify(fileStampHeader(stamped, { round: LABEL, identity: IDENTITY, identities: [...new Set(merged.map((r) => r.identity || "?"))], project: relOf(PROJECT), band: (BAND.mode || "?") + "@" + (BAND.sha8 || "?"), loginVerify: LOGIN_VERIFY, updatedAt: new Date().toISOString(), runner: "scripts/qa/r-exec-cli.mjs（" + MODE_LABEL + " 切片，增量落盘）", results: merged }), null, 1)); }
  catch (e) { console.log("FLUSH_ERR " + String(e.message).slice(0, 90)); }
}

const rows = [];
/* 游客落点裁定（26 组）：这张表是"哪些页对游客就该弹回登录页"的唯一来源。
   以前只有 verify-guest-landing 读它、执行轮不读 ⇒ 同一件事在两个载具里说法相反：
   裁定写"方向正确"，执行轮把 42 行写成"落在别的页，须人判"。现在两边同源。 */
const GUEST_LANDINGS = new Map();
try {
  const POL = JSON.parse(readFileSync(resolve(REPO, "scripts/qa/guest-landing-policy.json"), "utf8"));
  for (const r of POL.rows || []) if (r && r.page && r.landing) GUEST_LANDINGS.set(r.page, r.landing);
  console.log("RUNNER_POLICY_LANDINGS=" + GUEST_LANDINGS.size + "（游客落点裁定已接入执行轮）");
} catch (e) {
  console.log("RUNNER_POLICY_LANDINGS=0 reason=读不到 guest-landing-policy.json（" + String(e && e.message).slice(0, 60) + "）⇒ 落点一律按人工判，不冒充裁定");
}
const stats = { executed: 0, failed: 0, skipTap: 0, skipReal: 0, skipNonReal: 0, skipProbe: 0, skipNoCrit: 0, skipMiss: 0, skipGate: 0, skipTapFail: 0, pages: 0, probes: 0, shots: 0, noClass: 0, tapDeny: 0, tapNoTarget: 0, tapsDone: 0, leftPage: 0, guestGate: 0, idScope: 0, notAuto: 0, verbRefused: 0, pullDowns: 0, longpresses: 0 };
/* 增量行与终稿行共用同一个加总函数：上一版只在终稿那处补了新加的 skipNonReal，
   组内那条 print 漏了，于是同一轮里两个 skipped 数字互相打架（差值正好是真用例跳过数）。
   交互刀新增的三类跳过（DENY / 没点名元素 / 交互后离页）也走同一个函数，不再各写各的。
   2026-09-29：防降级闸扣下的那条同样是 SKIPPED 行 ⇒ 必须进加总，否则"skipped=" 会少算它，
   与 RUNNER_STATUS_ALL 的 SKIPPED 计数当场对不上（本仓为两个 skipped 口径打架记过一次账）。 */
const skippedTotal = () => stats.skipTap + stats.skipReal + stats.skipNonReal + stats.skipProbe + stats.skipNoCrit + stats.skipMiss + stats.skipGate + stats.skipTapFail + stats.tapDeny + stats.tapNoTarget + stats.leftPage + stats.idScope + stats.notAuto + stats.verbRefused;
/* 协同停止位：与 r-exec.cjs 共用 EXEC_STOP_FLAG 口径。长跑必须能"停在组边界"而不是被 kill，
      否则在跑的那一组成果跟着没（实测这条通道会偶发把进程带走，已经为此做过增量落盘）。 */
const STOP_FLAG = process.env.EXEC_STOP_FLAG ? resolve(process.env.EXEC_STOP_FLAG) : "";
if (STOP_FLAG) console.log("RUNNER_STOPFLAG " + STOP_FLAG + "（文件一出现在组边界收尾）");
let budget = LIMIT > 0 ? LIMIT : Infinity;
let stopped = false;
RUN.abort = () => { stopped = true; };

for (const name of files) {
  if (stopped) break;
  let mf;
  try { mf = JSON.parse(readFileSync(join(OPS, name + ".json"), "utf8")); } catch (e) { console.log("SKIP-MANIFEST unreadable " + name); continue; }
  const byPage = {};
  for (const c of (mf.cases || [])) (byPage[c.page] = byPage[c.page] || []).push(c);
  for (const page of Object.keys(byPage)) {
    if (STOP_FLAG && existsSync(STOP_FLAG)) { console.log("EXEC_STOPPED=clean flag=" + STOP_FLAG + " 已跑组=" + stats.pages); stopped = true; break; }
    const todo = byPage[page].filter((c) => !done.has(name + "|" + c.id));
    if (!todo.length) continue;
    try { renewUi({ owner: UI_LEASE_OWNER, batch: "R7" }); } catch (e) { console.log("RUNNER_LEASE_RENEW_ERR " + String(e.message).slice(0, 60)); }
    stats.pages++;
    /* 组边界清一次尺寸传递位：本页第一个探针还没打过，任何行都不许继承上一页最后一条的读数。 */
    CUR_GEOM = "";
    console.log("RUNNER_GROUP_START page=" + page + " 待跑=" + todo.length + " 累计=" + ((Date.now() - BOOT_T) / 60000).toFixed(1) + "min");
    try { openPage(page, ROUTE_QUERY[page] || "", { project: PROJECT }); } catch (e) {
      for (const c of todo) rows.push(row(name, page, c, "FAILED", "", "open_page 失败：" + String(e.message).slice(0, 70), ""));
      stats.failed += todo.length;
      continue;
    }
    sleep(SETTLE);
    let route = String(routeStack({ project: PROJECT }) || "");
    /* 组基线排件（只在 --native-capture 下发生）：开页那一下的 onLoad 会弹自己的 toast/modal
       （游客闸门、守卫弹回、锁屏提示都是这一类），这些调用**不属于本页任何一条判据**。
       不在这里排空，它们就会整包落进本页第一条判据的窗口里，被读成"这条判据弹出了 toast"——
       那正是本车道要防的归属错误。排出来的东西打进组日志（RUNNER_GROUP_NATIVE），
       它仍是证据（"这一页开页时弹了什么"），只是不能记账到某一条判据头上。 */
    if (NATIVE_CAPTURE) {
      const base = nativeDrain();
      console.log("RUNNER_GROUP_NATIVE page=" + page + " 开页窗口内 toast[" + toastSummary(base.toasts) + "]" +
        " console=" + consoleLines(base.logs).length + " 条" + (base.err ? " 取件未成:" + base.err : ""));
    }
    /* 空串/ERR 不等于「落在别的页」——实测这条通道会整批正常而路由探针取空（notes §12），
       把它折叠成失败会凭空造出十条 FAILED；但也不能反过来当作已确认。三态分开。
       真实工程下取空的比例明显更高（实测一轮 104 条），所以先重试一次再判"没答案"，
       且重试成功要在 observed 里留痕——通道抖过这件事必须看得见，不能被重试吃掉。 */
    let routeRetry = "";
    if (!route || route.startsWith("ERR")) {
      sleep(1600);
      const again = String(routeStack({ project: PROJECT }) || "");
      if (again && !again.startsWith("ERR")) { route = again; routeRetry = " | routeRetry=ok（首探取空/报错）"; }
    }
    const routeKnown = !!route && !route.startsWith("ERR");
    const routeOk = routeKnown ? route.includes(page) : null;
    /* 正对照（整页锁屏）：LockScreen 会把页面内容整片换掉。实测真实档账号完善度 30%
       时 village/index 帧里只有锁屏，`.channel-tab`/`.post-card` 连元素级探针都答
       "no such element" ⇒ 这些 absent 量到的是"锁屏没让内容出现"，不是"产品没做"。
       不先量锁屏就会凭空造出一整批假红（与 notes §33"探针没回答不能读成 0"同一类）。
       例外：判据点名的本来就是锁屏物件（`__lock` / `.lock-screen`）那些行照判。 */
    const gate = probeMany([GATE_SEL]);
    const gateHit = String(gate[GATE_SEL] || "").startsWith("present");
    const gateNote = gateHit ? " | 锁屏=在（" + gate[GATE_SEL] + "，本页内容未渲染）" : "";
    /* 每一组都把锁屏状态打出来：判红判绿之前先要看得见"这一帧是在什么状态下量的"。 */
    console.log("RUNNER_GATE page=" + page + " " + GATE_SEL + "=" + (gate[GATE_SEL] || "no-answer") +
      (gateHit && !ALLOW_GATE ? " ⇒ 非锁屏判点将记 SKIPPED（不判红）" : ""));
    let todoToJudge = todo;
    if (gateHit && !ALLOW_GATE) {
      const blocked = todo.filter((c) => !isLockCriterion(c));
      todoToJudge = todo.filter(isLockCriterion);
      stats.skipGate += blocked.length;
      for (const c of blocked) {
        rows.push(row(name, page, c, "SKIPPED", route, "整页锁屏（LockScreen）在，页面内容不在帧里 ⇒ 本条的 absent 是门槛挡的，不是产品未做；欠的载具：过完善度门槛的账号夹具，或 showcase 档（--allow-gate 可强行照判）", "top=" + page + gateNote));
      }
      if (!todoToJudge.length) {
        flush();
        console.log("RUNNER_GROUP page=" + page + " 本次新行=" + rows.length + " 全被锁屏挡住（保留 " + todoToJudge.length + " 条锁屏自身判点）");
        continue;
      }
    }
    const allCls = [...new Set(todoToJudge.flatMap((c) => judgeTargets(c)))];
    stats.probes += allCls.length;
    let dom = allCls.length ? probeMany(allCls) : {};
    let probeRetry = "";
    if (allCls.length && dom.__err) {
      const firstErr = String(dom.__err).slice(0, 46);
      sleep(1600);
      const again = probeMany(allCls);
      if (!again.__err) { dom = again; probeRetry = " | probeRetry=ok（首探 " + firstErr + "）"; }
    }
    if (dom.__err) console.log("  probe-err " + page + " :: " + dom.__err);
    const domFor = (list) => (list.length ? probeMany(list) : {});
    /** 行里的 observed 只有一处生成，交互刀和 observe-only 共用同一个形状，
        否则同一轮里会出现两种读法（这在本仓已经被点过一次）。
        尺寸读数也在这一处生成：observed 里追加 ` | size: …`（只有量到才追加，旧形状不变），
        同时把它放进 CUR_GEOM，由 row() 落到行内独立字段 `geometry`
        （observed 会被下游截到 300 字，尺寸绝不能挤在一个被截断的串里 —— #C-1）。 */
    const observed0 = (c, routeStr, rOk, d, tapNote) => {
      const gm = geomText(c, d);
      CUR_GEOM = gm;
      return "top=" + (String(routeStr || "").split("|").pop() || (routeKnown ? "?" : "(落点未取证)")) + (rOk === false ? " ≠ " + page : "") +
        " | dom: " + (judgeTargets(c).length
          ? judgeTargets(c).map((s) => s + ":" + (d[s] || (d.__err ? "ERR" : "no-answer"))).join(" ")
          : "(本条没点名类名)") +
        (gm ? " | size: " + gm.slice(0, 300) : "") +
        " | " + (TAP_MODE ? "tap-腿" : "observe-only") + (d.__err ? " | probe-err:" + d.__err : "") + routeRetry + probeRetry + (tapNote || "") + gateNote;
    };
    /* 这条行将被"档位/切片原因"跳过时，连点击都不该发生：
       点了再记 SKIPPED 会把同页后面几百条共用的状态改掉，红没判出来反倒污染了它们的前提。 */
    /* 防再犯 #74②：mock 档在结构上表达不了游客态 —— 它的 mock 引导会先把会话种子写好，
   `--guest-warmup` 清不掉（stage-6 那一轮 16 条腿就是这么白跑的，见 §101 事故二）。
   所以这不是"跑得慢"，是"永远不可能对"：现在就硬停，并把该走的档说出来。
   真要并发/实验，显式加 --allow-guest-mock 绕过（绕过的后果自己承担）。 */
if (IDENTITY === "guest" && String(BAND.mode || "") === "mock" && !process.argv.includes("--allow-guest-mock")) {
  console.log("RUNNER_RESULT=FAIL reason=游客身份 × mock 档是不可满足的组合（mock 引导会种会话）⇒ 一行都不跑，别占设备；游客刀请跑 real 档，或显式加 --allow-guest-mock");
  process.exit(2);
}
const bandSkip = (c) => (process.argv.includes("--real-cases-only") && c.requiresReal !== true) ||
      (c.requiresReal === true && !REAL_BAND);
    for (const c of todoToJudge) {
      CUR_T0 = Date.now();
      /* 每条开头再清一次尺寸传递位：上一条量到的读数绝不能落到下一条头上（:570 那一族的翻版）。 */
      CUR_GEOM = "";
      const scopeNote = identityScopeSkip(c, IDENTITY);
      if (scopeNote) {
        stats.idScope++;
        rows.push(row(name, page, c, "SKIPPED", route, scopeNote, observed0(c, route, routeOk, dom, "")));
        continue;
      }
      const naNote = notAutomatableSkip(c);
      if (naNote) {
        stats.notAuto++;
        rows.push(row(name, page, c, "SKIPPED", route, naNote, observed0(c, route, routeOk, dom, "")));
        continue;
      }
      const jt = judgeTargets(c);
      /* 每条各自复位：上一版用 var，一条点着过就会把后面所有条都标成"已交互"。 */
      let tapped = false;
      let cls = classesOf(c.action + " " + c.expected);
      let dom2 = dom, tapNote = "", caseRoute = route, caseRouteOk = routeOk;
      /* 交互刀（--tap）：这条通道的 automation_element_action 会真触发点击/输入
         （tour-cli-states.mjs:107 已在用），所以不必为了点一下去开 WS——
         实测 WS 会话一连上，simulator_open_page 就整批失败（r-exec-ws 的 --fidelity 就是这么卡住的）：
         两条通道抢同一个模拟器，混用等于自断取证。 */
      /* 顺序要先问"在不在本页"再问"要不要点"：实测 mock 档登录页因已登录被重定向到 discover，
         整组 26 条都没落在本页，而交互腿照发 ⇒ 点的是别人的页，
         失败原因又被记成"点不到点名物件"，把真正的落点问题盖掉了（本轮 19 条）。 */
      if (TAP_MODE && !bandSkip(c) && routeOk !== false && wantsInteraction(c.action)) {
        if (DENY_TAP.test(String(c.action || ""))) {
          stats.tapDeny++;
          rows.push(row(name, page, c, "SKIPPED", route, "交互禁触（注销/解绑/清空这类不可逆动作会打掉后面几百条共用的会话）⇒ 显式记 DENY，不混进已跑", observed0(c, route, routeOk, dom, "")));
          continue;
        }
        /* 防降级闸（capability 车道 #2，--strict-verbs / --gestures 才生效；不带旗标时这一整块跳过，
           旧腿的判决一字不变）。为什么放在"取目标"之前：目标都还没解析就不该有任何一次下发。
           这一闸只**扣住**发不出去的动词，不会多发任何动作 ⇒ 它不是新能力，是不冒充新能力的账。 */
        if (STRICT_VERBS) {
          const refuse = verbRefusal(c.action, GESTURE_MODE);
          if (refuse) {
            stats.verbRefused++;
            rows.push(row(name, page, c, "SKIPPED", route, refuse, observed0(c, route, routeOk, dom, " | 动词拒发[strict-verbs]") +
              " | 本条点名的动词=" + (verbsNamed(c.action, GESTURE_MODE).map((v) => v.verb + (v.emittable ? "(发得出)" : "(发不出)")).join(",") || "(无)")));
            continue;
          }
        }
        /* 目标优先取判据里显式写下的 tapTarget（merge-tapfix-lanes 落进去的字段）：
           裸类名（.error-btn / .channel-feed）没有 BEM 分隔符，classesOf 抠不出来，
           只靠 action 文本就会把这些用例重新变成"没点名"。 */
        const auth = authorityTargets(c);
        const inferred = classesOf(String(c.action || "")).filter((s) => !auth.includes(s));
        let targets = [...new Set([...auth, ...inferred])];
        /* 推断名在同一页里多命中 ⇒ 点中"某一个"再判通过，归属不成立，跳过它并说清跳了几条。 */
        const ambiguous = inferred.filter((s) => (probeCount(dom[s]) || 1) > 1);
        if (ambiguous.length) {
          stats.tapAmbiguous = (stats.tapAmbiguous || 0) + ambiguous.length;
          targets = targets.filter((s) => !ambiguous.includes(s));
        }
        if (!targets.length) {
          stats.tapNoTarget++;
          rows.push(row(name, page, c, "SKIPPED", route, "action 含交互动词但没点名可交互元素 ⇒ 没法把这次点击归属到某个东西，待把判据收紧" + (ambiguous.length ? "（另有 " + ambiguous.length + " 个推断名在同页多命中，归属不成立：#70⑥）" : ""), observed0(c, route, routeOk, dom, "")));
          continue;
        }
        const done = [], unmet = [], inputRefused = [];
        for (const sel of targets.slice(0, 4)) {
          /* 只按动词判输入腿：判据现在会把选择器写进 action（`.code-input` 这类
             裸类名里的 "input" 曾经把一条点击判据翻成输入腿）。 */
          const verb = pickElementVerb(c.action, sel, GESTURE_MODE);
          const isInput = verb === "input";
          if (!isInput && inputVerbOnly(c.action) && verb !== "longpress") inputRefused.push(sel);
          try {
            /* 动词与载荷：longpress 是与 tap **同一个工具、换一个 --action**（cli-automator.mjs:162-164 的第一参就是自由串，
               工具支持的动词面记在 cli-automator.mjs:12）⇒ 这是接线，不是新通道（r1-exec.cjs:1033+:1068 那条 el.longpress() 的等价物）。
               非长按时发的还是原来那一句（tap + --wait 1 / input + --value 123456），旧腿逐字不变。 */
            element(verb, sel, { project: PROJECT }, isInput ? ["--value", "123456"] : ["--wait", "1"]);
            done.push(verb + ":" + sel);
            if (verb === "longpress") stats.longpresses++;
          } catch (e) { unmet.push(verb + ":" + sel + " :: " + String(e.message).replace(/\s+/g, " ").slice(0, 200)); }
          sleep(700);
        }
        /* 下拉刷新动线（capability 车道 #2 的另一半；载具 r1-exec.cjs:1115-1126）。
           它是 evaluate 载荷、不是元素动作 ⇒ 不占元素选择器、也不需要 tapTarget：
           "下拉刷新看列表"这类判据以前只能被降级成一次 tap，现在能真把刷新调起来。
           三种答案（uni-ok / no-uni / ERR）必须分开记：把 no-uni 读成"已下拉"就是凭空造绿。 */
        let pullNote = "";
        if (GESTURE_MODE && VERB_PULLDOWN_RE.test(String(c.action || ""))) {
          let pr = "";
          try { pr = String(evaluate(pullDownSource(), { project: PROJECT })); sleep(SETTLE); }
          catch (e) { pr = "ERR " + String(e.message).replace(/\s+/g, " ").slice(0, 90); }
          const verdict = pullDownVerdict(pr);
          if (/^ok/.test(verdict)) { done.push("pullDown"); stats.pullDowns = (stats.pullDowns || 0) + 1; }
          pullNote = " | pullDown=" + verdict + "(" + pr.slice(0, 60) + ")";
          /* 收尾停掉刷新态：不停的话转圈动画吊在页上，同组后面几条量到的帧/探针不是静息态。 */
          try { evaluate(stopRefreshSource(), { project: PROJECT }); } catch (e) { pullNote += " stopRefresh 未成"; }
        }
        sleep(SETTLE);
        /* tapsDone 只数元素级下发（pullDown 是 evaluate 动线，单列在 stats.pullDowns，
           不许混进"真做过的交互"里把点击数虚报上去）。 */
        stats.tapsDone += done.filter((d) => d.includes(":")).length;
        /* 一次都没点着 ⇒ 这条没有"交互后"的任何东西可判。
           记 SKIPPED 并带上原错误，不许顺着往下记 EXECUTED（那是拿"没点着"冒充"点过"）。 */
        if (!done.length) {
          stats.skipTapFail++;
          /* 同一帧的折叠探针能分辨两种失败：探针也答 absent/no-answer ⇒ 这个物件在静息态就不在
             （欠的是"先把它弄出来"的前置配方，不是产品未修）；探针答 present 而点不动 ⇒ 才是通道/选择器问题。 */
          const why = jt.length && jt.every((x) => !String(dom[x] || "").startsWith("present"))
            ? "同帧探针也说这些类名不在（静息态不存在）⇒ 欠前置配方（先展开/先切态），不是产品判红"
            : "探针说物件在、元素级动作仍点不动 ⇒ 通道或选择器问题，须人工判";
          rows.push(row(name, page, c, "SKIPPED", route, "交互腿下发全部失败 ⇒ 没有交互后的状态可判；" + why + " :: " + unmet.join(" ; ").slice(0, 260), observed0(c, route, routeOk, dom, "")));
          continue;
        }
        tapped = true;
        let r2 = "";
        try { r2 = String(routeStack({ project: PROJECT }) || ""); } catch (e) { r2 = "ERR"; }
        if (r2 && !r2.startsWith("ERR")) { caseRoute = r2; caseRouteOk = r2.includes(page); }
        tapNote = (inputRefused.length ? " | 输入腿动词对不上元素，退回点击[" + inputRefused.join(",") + "]" : "") + " | tap[" + done.join(",") + "]" + (unmet.length ? " 未成[" + unmet.join(",") + "]" : "") + pullNote +
          (caseRouteOk === false ? " 交互后已离开本页 ⇒ 本条探针不在本页上，不作判" : "");
        /* 交互把页面导航走了 ⇒ 在本页查本页物件已经没有意义，但这条不能记红：
           它欠的是"交互后回到本页"的配方，不是产品没做。 */
        if (caseRouteOk === false) {
          stats.leftPage++;
          rows.push(row(name, page, c, "SKIPPED", caseRoute, "交互后离开目标页 ⇒ 状态量不到，记 LEFT_PAGE（不是产品判红）", observed0(c, caseRoute, caseRouteOk, dom, tapNote)));
          continue;
        }
        dom2 = domFor(cls);
      }
      const observed = observed0(c, caseRoute, caseRouteOk, dom2, tapNote);
      if (process.argv.includes("--real-cases-only") && c.requiresReal !== true) {
        /* 真实刀只欠 requiresReal 那 236 条；其余不重复跑，但仍要记一行，
           否则这个 corpus 的行数就不再是 1107，守恒核对会被"少了一类"骗过去。 */
        stats.skipNonReal++;
        rows.push(row(name, page, c, "SKIPPED", route, "真实刀只跑 requiresReal 用例（其余已在 mock 轮记过），本行只为守恒计数", observed));
      } else if (c.requiresReal === true && !REAL_BAND) {
        /* 这一支以前查的是 argv 里的 --real，与 bandSkip 那支（已改成查档位）不是同一个条件：
           结果是"档位明明是 real，行里却写着不是 real ⇒ 跳过"，同一份谎话从第二个出口又漏出来。
           两个出口现在都只认 REAL_BAND，且原因串只陈述**当时量到的**档位，不写"本切片只跑 mock"这种断言。 */
        stats.skipReal++;
        rows.push(row(name, page, c, "SKIPPED", route, "requiresReal ⇒ 当前被测档位 VITE_API_MODE=" + (BAND.mode || "?") + "（project=" + relOf(PROJECT) + "）不是 real ⇒ 跳过；真实模式要把 --project 指到 mp-weixin-real 且后端在跑", observed));
      } else if (wantsInteraction(c.action) && !tapped) {
        /* 这句台词以前无条件写着"本切片只跑 observe-only"，可 --tap 腿里它也会被打出来：
           实测游客档 27 条 requiresReal 走的就是这一支，真正原因是那一页被弹走了（routeOk===false），
           跟"这一腿只观察"没有半点关系。与 §98 那条档位谎话同一族：原因必须说当时量到的东西。 */
        stats.skipTap++;
        const why = !TAP_MODE
          ? "action 含交互动词 ⇒ 本切片没带 --tap，只跑 observe-only，交互型下一步再接"
          : caseRouteOk === false
            ? "action 含交互动词但本页没落在声明页（栈顶=" + (String(caseRoute || "").split("|").pop() || "未取到") + "）⇒ 交互没发出，点了就是替别人的页做事"
            : caseRouteOk === null
              ? "action 含交互动词但落点探针没给结果（routeOk=null）⇒ 不能确认还在这页，交互不发"
              : "action 含交互动词但这一条没发出交互（原因见 observed 里的 tap 段）";
        rows.push(row(name, page, c, "SKIPPED", route, why, observed));
      } else if (routeOk === false) {
        /* 游客被弹到登录页，在 26 组页面上是**裁定要求的行为**（游客不得浏览广场/内容流），
           不是产品缺陷；但这几条判据的前置写的是登录态，所以这条判据在游客档也确实没满足。
           两种说法不能混成一句"落在别的页，须人判"：那会让人分不清"产品没做"和"这条不该由游客来测"。
           这里按 guest-landing-policy 的裁定把落点写进原因串，并单独计数，
           让 triage/终报能给出"多少条 FAILED 其实是身份适用范围问题"的确切数。 */
        const top = String(caseRoute || route || "").split("|").pop();
        const gateReason = guestGateVerdict(LOGIN_VERIFY, GUEST_LANDINGS, page, top);
        stats.failed++;
        if (gateReason) stats.guestGate++;
        rows.push(row(name, page, c, "FAILED", route,
          gateReason || "落在别的页（页内守卫或路由重定向），须人判", observed));
      } else if (!cls.length && !FRAME_RE.test(String(c.evidence || ""))) {
        /* 判据里既没点名类名也不要求出帧 ⇒ 这条压根没断言任何可观测物件。
           之前它会掉进最后的 else 记成 EXECUTED（实测 4 条：DC37/H13/H29/H44），
           那是"没有证据的绿"，正是不许出现的东西。改记 SKIPPED 并写明要收紧判据。 */
        stats.skipNoCrit++;
        rows.push(row(name, page, c, "SKIPPED", route, "判据未点名可观测物件（既无类名也不要求出帧）⇒ 没有可判的东西，不能记 EXECUTED；要么补判据要么人工看帧", observed));
      } else if (routeOk === null && dom.__err) {
        /* 落点与 DOM 两条探针同时没给结果 ⇒ 这一条什么都没测到。既不记 EXECUTED（没证据），
           也不记 FAILED（没测到不等于测出问题），记 SKIPPED 并写明要重跑。 */
        stats.skipProbe++;
        rows.push(row(name, page, c, "SKIPPED", route, "落点与折叠探针都没给出结果（通道未就绪）⇒ 本条没测到，不记 EXECUTED 也不记 FAILED，待重跑", observed));
      } else if (routeOk === null) {
        /* 有 DOM 答案但不知道在不在目标页 ⇒ 答案没法归属，记 EXECUTED 等于把"未知"写成"通过"。 */
        stats.skipProbe++;
        rows.push(row(name, page, c, "SKIPPED", route, "落点探针没给结果（routeStack 取空/超时）⇒ 不知是否已在 " + page + "，答案无法归属，待重跑", observed));
      } else {
        const miss = [];
        let evid = "";
        if (FRAME_RE.test(String(c.evidence || "")) || cls.length) {
          const f = join(SHOT_DIR, name + "-" + c.id + "-after.png");
          try {
            rmSync(f, { force: true }); shot(f, { project: PROJECT });
            const sz = statSync(f).size;
            if (sz > 3000) { evid = relOf(f) + "(" + sz + "B)"; stats.shots++; } else miss.push(relOf(f) + "(仅 " + sz + "B，不当证据)");
          } catch (e) { miss.push(relOf(f) + "(未写出:" + String(e.message).slice(0, 60) + ")"); }
        }
        const answered = cls.filter((s) => dom[s] && dom[s] !== "no-answer" && !String(dom[s]).startsWith("ERR"));
        if (!evid && !answered.length) {
          /* 帧没拿到、探针也没答案 ⇒ 这一条仍然没有任何可交的证据 */
          stats.skipMiss++;
          rows.push(row(name, page, c, "SKIPPED", route, "出帧失败且探针无有效答案（miss=" + miss.join(";") + "）⇒ 不记 EXECUTED，待重跑", observed, "", miss));
          if (--budget <= 0) { stopped = true; break; }
          continue;
        }
        if (!cls.length) stats.noClass++;
        stats.executed++;
        rows.push(row(name, page, c, "EXECUTED", route, "", observed, evid, miss));
      }
      if (--budget <= 0) { stopped = true; break; }
    }
    flush();
    console.log("RUNNER_GROUP page=" + page + " 本次新行=" + rows.length + " executed=" + stats.executed +
      " failed=" + stats.failed + " skipped=" + skippedTotal() +
      " 出帧=" + stats.shots + " 通道异常=" + transportErrs + " 已跑=" + ((Date.now() - BOOT_T) / 60000).toFixed(1) + "min");
  }
}

/* 守恒：新行与旧行按 manifest|id 合并，状态只允许三种词，总数必须等于两边之和减重复。
   对不上就不写盘——「账没闭合还把结果落下去」是本轮已被门禁点过名的那类失败。
   合并 + 逐行带戳一起走 stampMerged（与 flush() 同一份实现，#C-2）：
   旧行保留**它自己那次启动**的戳，本 boot 只认领本 boot 跑出来的行。 */
const stamped = stampMerged(prior, prior.results || [], rows, GIT_SHA, BOOT_ID);
const all = stamped.merged;
const dupNew = rows.length - new Set(rows.map((r) => r.manifest + "|" + r.id)).size;
const bad = all.filter((r) => !["EXECUTED", "FAILED", "SKIPPED"].includes(r.status));
console.log("RUNNER_ROWS new=" + rows.length + " merged=" + all.length + " 之前已有=" + (prior.results || []).length + " 重复新行=" + dupNew);
/* #C-2 的可见性行：续跑时到底有多少行"没重跑所以不被本次认领"，以及这份文件横跨几次启动。
   顶层那枚 gitSha 只对本 boot 跑的行成立，读它的人必须同时看见这一行。 */
console.log("RUNNER_ROW_SHA 本boot新行=" + stamped.nNew + " 沿用旧行=" + stamped.nPrior +
  " 逐行带分布=" + Object.keys(stamped.rowShas).sort().map((k) => k + "=" + stamped.rowShas[k]).join(" ") +
  " 本boot=" + stamped.bootSha + (stamped.mergedFrom.length ? " 历次=" + stamped.mergedFrom.map((m) => m.gitSha + "(" + m.rows + "行)").join(",") : "（首跑，无续跑）"));
const noRowSha = all.filter((r) => !r.gitSha || r.gitSha === "unknown").length;
if (noRowSha) console.log("RUNNER_ROW_SHA_INCOMPLETE " + noRowSha + " 行给不出执行时的带（历史件，不猜 ⇒ 下游按 unknown 受审，不当已归因）");
console.log("RUNNER_GEOM 带尺寸读数的行=" + rows.filter((r) => r.geometry).length + "/" + rows.length +
  "（#C-1：fields({size:true}) 量到的 width/height 现在留在行内 geometry 字段；仍为 0 条时说明这一腿没点名可量物件）");
/* 一份文件里混进多个身份/档位时，头部那个标量 identity 会替所有行说话
   （实测 interact-b2：头部 identity=A，里面 38 行是游客腿跑出来的）。
   合并是允许的，但必须看得见：这里把两套 census 打出来，并把它们写进文件头。 */
const identOf = {}, bandOf = {};
for (const r of all) {
  identOf[r.identity || "?"] = (identOf[r.identity || "?"] || 0) + 1;
  bandOf[r.band || "?"] = (bandOf[r.band || "?"] || 0) + 1;
}
console.log("RUNNER_BAND project=" + relOf(PROJECT) + " VITE_API_MODE=" + (BAND.mode || "?") + " envSha8=" + (BAND.sha8 || "?"));
console.log("RUNNER_IDENTITIES " + Object.keys(identOf).sort().map((k) => k + "=" + identOf[k]).join(" "));
console.log("RUNNER_FILE_BANDS " + Object.keys(bandOf).sort().map((k) => k + "=" + bandOf[k]).join(" "));
if (Object.keys(identOf).length > 1) console.log("RUNNER_MIXED identity 不止一种 ⇒ 整批通过率不能当单一身份的数（按行 identity 拆开算）");
if (Object.keys(bandOf).length > 1) console.log("RUNNER_MIXED 载体档位不止一档 ⇒ 同上，且档位不同的行不能互相复验");
console.log("RUNNER_STATS identity=" + IDENTITY + " loginVerify=" + LOGIN_VERIFY + " executed=" + stats.executed + " failed=" + stats.failed +
  " skipped=" + skippedTotal() +
  "(交互动词=" + stats.skipTap + " requiresReal=" + stats.skipReal + " 非真实用例=" + stats.skipNonReal + " 探针无结果=" + stats.skipProbe +
  " 判据无可判物件=" + stats.skipNoCrit + " 出帧失败=" + stats.skipMiss +
  " 交互禁触=" + stats.tapDeny + " 交互没点名=" + stats.tapNoTarget + " 交互后离页=" + stats.leftPage +
  " 锁屏挡住=" + stats.skipGate + " 交互下发失败=" + stats.skipTapFail + " 身份适用范围外=" + stats.idScope + " 盖章不可自动化=" + stats.notAuto + ") 页组=" + stats.pages +
  " 真做过的交互=" + stats.tapsDone +
  " 折叠探针类名次数=" + stats.probes + " 出帧=" + stats.shots + " 未点名类名=" + stats.noClass + " 通道异常次数=" + transportErrs);
/* 这一车道自己那本账单开一行（不动 RUNNER_STATS 的既有形状 —— 队列按前缀抠它的定长读数）。
   verbRefused 已进 skippedTotal()，这里再单列一次：它是"判据点名的动词发不出去"，
   与"这一腿没带 --tap"是两种欠款，混进同一个数字就没法复盘欠的是哪个原语。 */
console.log("RUNNER_CAP strict-verbs=" + (STRICT_VERBS ? "on" : "off") + " gestures=" + (GESTURE_MODE ? "on" : "off") +
  " native-capture=" + (NATIVE_CAPTURE ? "on" : "off") +
  " 动词拒发=" + stats.verbRefused + " 发出长按=" + stats.longpresses + " 发出下拉刷新=" + stats.pullDowns +
  " 行内 toast 非空=" + rows.filter((r) => Array.isArray(r.toast) && r.toast.length > 0).length +
  " 行内 console 非空=" + rows.filter((r) => Array.isArray(r.console) && r.console.length > 0).length +
  " 行内证据欠账非空=" + rows.filter((r) => Array.isArray(r.evidenceGaps) && r.evidenceGaps.length > 0).length + "/" + rows.length);
const statusOf = {};
for (const r of all) statusOf[r.status] = (statusOf[r.status] || 0) + 1;
console.log("RUNNER_STATUS_ALL " + Object.keys(statusOf).sort().map((k) => k + "=" + statusOf[k]).join(" "));
const holes = all.filter(evidenceHole);
console.log("RUNNER_EVIDENCE_HOLE " + holes.length + (holes.length ? " 条 EXECUTED 既无帧也无探针答案：" + holes.slice(0, 8).map((r) => r.manifest + "/" + r.id).join(",") : ""));
const fails = [];
if (!rows.length) fails.push("一行都没产生（要么全跑过了，要么筛选把用例全挡住了 ⇒ 这不叫跑完）");
if (holes.length) fails.push(holes.length + " 条 EXECUTED 没有任何证据（无帧且无探针答案）⇒ 没有证据的绿不许入账，用 --redo-holes 重测或补判据");
if (dupNew) fails.push("同一次跑里出现重复 manifest|id " + dupNew + " 条");
if (bad.length) fails.push("出现非法状态 " + bad.length + " 条");
if (all.length !== (prior.results || []).length + rows.length - dupNew) fails.push("合并后总数对不上");
/* 档位与 requiresReal 必须互相自证，但**只算因档位而跳的那些**。第一版我把所有"跳过的真实用例"
   都算进这条守恒，结果一条跑了 56 分钟、真做出 194 条判决的腿被整腿判废不写盘 ——
   一条真实用例因"判据没点名物件 / 动作不可自动化 / 禁触"被跳过是另一类欠款，
   不该被这条守恒伪装成"档位没量到"。守恒判点过宽同样会伤人。 */
const bandSkipped = rows.filter((r) => r.requiresReal === true && r.status === "SKIPPED" && /^requiresReal\b/.test(String(r.failureReason || "")));
const realSkippedAny = rows.filter((r) => r.requiresReal === true && r.status === "SKIPPED");
const realExecuted = rows.filter((r) => r.requiresReal === true && r.status !== "SKIPPED").length;
if (REAL_BAND && bandSkipped.length) fails.push("被测产物是 real 档却因档位原因跳过 " + bandSkipped.length + " 条 requiresReal ⇒ 这一腿没量到真实模式，不许当真实轮记账");
if (!REAL_BAND && realExecuted) fails.push("被测产物不是 real 档（VITE_API_MODE=" + (BAND.mode || "?") + "）却跑了 " + realExecuted + " 条 requiresReal ⇒ mock 帧不能冒充真实模式结论");
console.log("RUNNER_GUEST_GATE n=" + stats.guestGate + "（FAILED 里与游客落点裁定同向的条数；这些行**仍记 FAILED**，因为那几条判据的前置是登录态——单列出来只为让终报不把" + stats.guestGate + "条闸门行为算成产品缺陷，也不许反过来把它当成本条判据通过）" + (stats.failed ? " 占 FAILED " + Math.round((100 * stats.guestGate) / stats.failed) + "%" : ""));
console.log("RUNNER_REAL_TALLY band=" + (BAND.mode || "?") + " 真实用例判过=" + realExecuted + " 因档位跳过=" + bandSkipped.length + " 因其它原因跳过=" + (realSkippedAny.length - bandSkipped.length));
if (fails.length) {
  /* 红归红，数据归数据：以前这里"不写盘"，等于把 56 分钟的实测读数一起丢掉。
     现在写一份**带标签的旁路文件**（权威文件名不动，门禁读不到它），既不污染账，也留得住现场。 */
  const side = RES.replace(/\.json$/, "") + ".rejected.json";
  try { writeFileSync(side, JSON.stringify(fileStampHeader(stamped, { rejected: true, rejectReason: fails.join(" / "), round: LABEL, identity: IDENTITY, project: relOf(PROJECT), band: (BAND.mode || "?") + "@" + (BAND.sha8 || "?"), updatedAt: new Date().toISOString(), results: all }), null, 1)); console.log("RUNNER_REJECTED_WROTE=" + relOf(side) + " results=" + all.length); }
  catch (e) { console.log("RUNNER_REJECTED_WRITE_FAIL " + String(e.message).slice(0, 80)); }
  console.log("RUNNER_RESULT=FAIL reason=" + fails.join(" / ") + " ⇒ 权威结果不写盘（旁路文件仅供复盘）");
  process.exit(2);
}
writeFileSync(RES, JSON.stringify(fileStampHeader(stamped, { round: LABEL, identity: IDENTITY, identities: Object.keys(identOf).sort(), project: relOf(PROJECT), band: (BAND.mode || "?") + "@" + (BAND.sha8 || "?"), fileBands: bandOf, loginVerify: LOGIN_VERIFY, updatedAt: new Date().toISOString(), runner: "scripts/qa/r-exec-cli.mjs（" + MODE_LABEL + " 切片）", results: all }), null, 1));
console.log("RUNNER_WRITTEN=" + relOf(RES) + " results=" + all.length);
console.log("RUNNER_SCOPE=" + (process.argv.includes("--real-cases-only") ? "real-cases-only（只跑 requiresReal 那一批，产物必须是 mp-weixin-real）"
    : TAP_MODE && REAL_BAND ? "tap+real（真点击/真输入 + 含 requiresReal；覆盖数见 RUNNER_STATS）"
    : TAP_MODE ? "tap（真点击/真输入，requiresReal 那批仍跳过，因为被测档位不是 real）"
    : REAL_BAND ? "real（含 requiresReal，未开 --tap ⇒ 交互型仍跳过）"
    : "observe-only（交互型与真实型未跑；这不是一轮完整的执行轮，覆盖数见上面 RUNNER_STATS）"));
console.log("RUNNER_REAL_CASES=" + (REAL_BAND ? "on" : "off") + " band=" + (BAND.mode || "?") + "@" + (BAND.sha8 || "?") + " project=" + relOf(PROJECT));
console.log("RUNNER_RESULT=OK");
