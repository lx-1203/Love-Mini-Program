# 网络计数通道（#10-d / task #21）— 逐时刻请求条数读数

车道：module-only。主控在并行改 `scripts/qa/r-exec-cli.mjs`，本车道**不碰**那个文件，只出模块 + 离线测试 + 集成点建议。
环境：离线、确定性、可复跑；不碰设备、不碰模拟器、不取 UI 租约。

## 先查载具

结论先放：**载具存在，而且是现成的**——`automation_evaluate` 这一个通道就够，不需要 WS、不需要新工具。

命令与出处（都在本仓，读只读）：

| 查的东西 | 命令 | 读数 |
|---|---|---|
| 通道形状（钩子=纯 evaluate 载荷） | `grep -n "nativeHookSource\|nativeDrainSource\|interpretNative" scripts/qa/r-exec-cli.mjs` | 定义在 :564 / :587 / :593，设备调用点 :727 `nativeInstall()`、:737 `nativeDrain()`；`--native-capture` 旗标 :114；行字段出口 :784 `toast: toastVal, console: consoleVal` |
| 通道能不能带网络 | `grep -n -i "network\|interceptor\|mockWxMethod\|evaluate" scripts/qa/cli-automator.mjs` | 桥里**没有任何 network 工具**（只有 :206 一处 `http.request` = 打后端 8080 的），但 :137 `export function evaluate(fnSource, opts)` = `automation_evaluate --fn-source` ⇒ 任何能在 app 上下文里跑得的东西都进得来 |
| r1-exec 的"网络处理"到底是什么 | `grep -n "installToastHook\|drainToasts" scripts/qa/r1-exec.cjs` | 只有 :278 `installToastHook` / :300 `drainToasts`（包 `wx.showToast` 那一族）与 :230 连上 WS 后挂的 console/exception 监听；**逐请求计数在 r1 里也没做过**。所以这条不是"搬运现成实现"，是"借它的通道形状新造一个" |
| 三态的先例 | `grep -n "function pullDownSource" scripts/qa/r-exec-cli.mjs` | 现读 :415。`pullDownSource()` 已经在分 `uni-ok / page-handler-ok / no-uni / no-page / ERR / unknown` 六种读数 ⇒ `typeof uni` 在 evaluate 上下文里**可用且有 no-uni 兜底**（本模块沿用这套分法） |
| 判据侧的分母 | `node -e "…readFileSync('reports/audit/round-7/c21-executor-capability-matrix.md')…indexOf('G-2')"` | G-2 行原文：**409** 条判据在 evidence 里点名 network，其中带显式计数谓词的 = **312**；行名样例 H02/H03/N03/N05/N31/MSG26/LG13/LG15/LG18/MT14/DND08/DND12/TP04/VI09 |
| 本车道那 36 行里命中多少 | `node -e "JSON.parse(…criteria36-classification-v33.json).rows.filter(r=>/network\|请求数\|请求条数\|请求计数/.test(r.criteriaVerbatim))"` | **11 行**：CI22, MT21, MSG25, MSG26, DND02, DND03, DND08, CPT32, AC02, VB03, SE09（测试里打印，见「读数」） |
| 在役 runner 的自认 | `grep -n "G-2" scripts/qa/r-exec-cli.mjs` | **现读 :649** `if (k.network) out.push("判据点名 network 证据，而本通道没有逐请求计数通道（审计 G-2 [NEW]，不在本车道）");` —— 这一句是本模块要替换的对象 |

## 机制

**能不能带网络事件：能。**但不是靠桥，而是靠**在 app 上下文里挂 uni 的请求拦截器**。证据取自被测产物本身，不取自文档。

`apps/client/dist/build/mp-weixin/common/vendor.js`（103,808 B，`node -e` 现读）里 `uni` 是一枚 Proxy：

```
function Vf(e,t,n=wx){const r=xf(t);const o={get(s,i){return C(s,i)?s[i]:C(e,i)?Tn(i,e[i]):C(ko,i)?Tn(i,ko[i]):Tn(i,r(i,n[i]))}};return new Proxy({},o)}
const ji=Hi(); var Fr=Vf(Zf,tp,ji);          // Fr 就是 uni（exports.index=Fr）
function Hi(){const e={};for(const t in wx)Gf(t)&&(e[t]=wx[t]);…return e}
```

由此得两条**互相打脸**的结论：

1. **包 `wx.request` 拦不住应用请求**（与 r1-exec/r-exec-cli 的 toast 钩子同位，但网络这层不适用）：
   `Hi()` 在启动时就把 `wx` 上的函数**按引用抄进 `ji`**，`Vf` 的 get 陷阱读的是 `n[i]`（n=ji），
   所以跑起来之后再 `wx.request = wrap` 改不到 `ji.request`。
   而应用的真实调用位是 `services/http.js` 里的 `f.index.request({...})`（`f=require('../common/vendor.js')`，
   命令：`node -e "…readFileSync('services/http.js')…matchAll(/\\.request\\s*\\(/g)"` ⇒ 2 处命中，均为 `f.index.request(`）
   ⇒ 走的是 proxy 的 get，不是 `wx.request`。**顺带记一笔给主控**：现有 toast 钩子包的也是 `wx.*`，
   按同一份 vendor 读，`uni.showToast` 同样绕过它——那不是本车道的修法，但"uni.showToast 最终落到 wx.showToast ⇒ 覆盖得到"
   这句注释（r-exec-cli.mjs nativeHookSource 头部）值得复查。
2. **`uni.addInterceptor('request', …)` 是被运行时读的那一条**：
   `Tn(e,t)` = `!Pf(e)||!_(t) ? t : function(r,…){ … nn(e,t,k({},r),o) … }`，
   `Pf(e)=!(Kt(e)||Ai(e)||Of(e))`，谓词全部来自产物：
   `Ef=/^create|Manager$/`、`yf=/^\$|__f__|…|Sync$|Manager$|…/`、`Cf=/^on|^off/`、`vf=If=["createBLEConnection"]`。
   离线把这三条谓词照抄进 node 跑一遍（命令见「读数」第 4 行）：
   `Pf('request') === true` ⇒ request **过**带拦截器链的包装；
   `Pf('addInterceptor') === false` ⇒ `uni.addInterceptor` 返回原函数（不 promisify），可同步调用。
   链的装配：`nn(e,t,n,r){const o=Oo(e); … t(Co(Oo(e),i),…r)}`，
   `Co(e,t){['success','fail','complete'].forEach(n=>{const r=e[n]; if(!S(r))return; const o=t[n]; t[n]=function(i){Ci(r,i,t).then(c=>_(o)&&o(c)||c)}})}`
   ⇒ **拦截器回调收到的实参是 `(响应, 原始 options)`**，所以 method/url 与 statusCode 配得上对（测试 D7/D8 就是在验这一条）。
   `Ci(e,t,n){…const i=s(t,n); … if(i===!1) return {then(){},catch(){}}}` ⇒ **invoke 返回 false 会把请求掐掉**
   ⇒ 钩子的 `invoke` 必须只记账、绝不 return（模块里是一条静态红线，测试 E2 钉住）。

**跨档成立**：命令 `for b in mp-weixin mp-weixin-real mp-weixin-showcase; do node -e "…$b/common/vendor.js…"; done`
⇒ 三档全部 `addInterceptor in ko: true | Vf proxy: true | Hi snapshot: true | uni.request call in http: true`。
理由：拦截器链住在 **uni 运行时**里，不住在应用源码里 ⇒ mock/real/showcase 同一份，不是某档侥幸。

覆盖边界（写进行上 `networkCover`，不许当全量网络）：只覆盖 `uni.request` 一层；
`uploadFile / downloadFile / connectSocket / WebSocket` 与直呼 `wx.request` 的位**不在内**
（本仓现状：`services/http.ts:670`、`services/sentry.ts:497` 走 uni.request；`services/websocket*` 不走）。
另两条诚实边界：钩子装上**之前**飞掉的请求看不见（before 窗有盲区，install 读数必须随行）；
计数口径 = **请求发出（invoke）**，"发了但失败"另记 `outcome`，失败注入本身（断网/5xx）是 G-3，不在本车道。

## 模块出口

新文件：`scripts/qa/exec-network-observe.mjs`（32,155 B）。**纯函数 + 载荷字符串**，不 import 桥、不派生进程、不碰模拟器 ⇒ 全部出口都能离线跑。
形状与 `nativeHookSource/nativeDrainSource/interpretNative/toastSummary/evidenceGaps` 一一对位，主控可以直接照 toast 那一条线接。

| 出口 | 干什么 | 判据侧对应 |
|---|---|---|
| `networkHookSource()` | 装钩子载荷（`uni.addInterceptor('request',{invoke,success,fail,complete})`），把 `{seq,method,url,path,query,startedAt,endedAt,statusCode,outcome,errMsg,paired}` 记进 `globalThis.__qaNet`。返回串 `installed/already/no-uni/no-addInterceptor/ERR` | 三态与 `pullDownVerdict` 同款分法 |
| `networkDrainSource()` | 取件载荷：`splice(0)` 排空 + 带 `hooked` 证据位 + `dropped`/`seq`/`clock`。**一次取件 = 一个时刻窗口** | VB03 的 a/b/c 就是"取三次" |
| `interpretInstallResult(raw)` | install 串 → `{state, installed, note}`；读不懂/为空一律 `off`，不猜 | 挡住"不知道装没装却开始数 0" |
| `parseNetworkBuffer(raw, {on})` | 原始取件串 → `{state, requests[], err, dropped, hooked, reason}`；**从不抛**（通道噪声不许打死取景腿） | 三态在这里定 |
| `isJudgeable(state)` / `assertJudgeable(parsed)` | 只有 `empty/ok` 放行；`off/broken` 时取数**直接抛** `NOT_SHOOTABLE(verb=networkCount)` | 假绿的物理闸门 |
| `momentCounts(parsed, boundaries)` | `{before,during,after}` 三窗（名字可换 a/b/c）+ `byMethod` + `byMethodPath` + `byMomentMethodPath` + `writes` + `unpairable` + `degraded`。归窗按请求 `startedAt`。不可判 ⇒ **每个计数都是 null，不是 0** | DND02 的 0/1、SE09 的逐次 |
| `combineMoments([{name, ...parsed}])` | 多时刻排空的合成读数；任一时刻不可判 ⇒ 整体 `judgeable:false` | VB03「三个时刻各自 1/0/1 是本条唯一判据」 |
| `countFor(parsed, filter)` | 按 `methods/path/pathRe/queryIncludes/outcome/writesOnly` 取一个数。不可判 ⇒ `null`；可判而没匹配 ⇒ `0`（两种零类型不同） | `PUT /dnd 计数=0`、`page=2 请求` |
| `WRITE_METHODS` | `["POST","PUT","PATCH","DELETE"]`（写请求口径的唯一来源） | CI22 / MT21 |
| `parseExpectedCounts(text)` | 从判据文本抠「1/0/1」「请求数=0」谓词；抠不到 ⇒ `{kind:null}`，**交回人判，本模块不代判** | VB03 / DND08 |
| `verdictCounts(counts, expected)` | 对账出 `MATCH / MISMATCH / NO_EXPECTED_PREDICATE / INCOMPLETE_WINDOW_COUNT / NOT_SHOOTABLE(verb=networkCount)` | 极性仍由判据自己写 |
| `netSummary(counts)` / `networkGap(cap)` | 行上那串人眼可核、机器可抠的读数（对位 `toastSummary` :618）与欠账句（对位 `evidenceGaps` :640） | off 说"没开"、broken 说"残缺"、empty 不写 gap |
| `observeFromDrain(parsed, install)` | 把 install + drain 两个读数压成行要的形状 `{state, installed, installNote, cover, counts, summary, gap}` | 一个调用点搞定 |
| `STATE` / `NETWORK_COVER` / `BUFFER_CAP(400)` / `BUFFER_TRIM(200)` | 常量口径，行上/门禁用它比对，别各自抄字面量 | — |

## 三态

四个态都是四个样，两两不可互写（这是本车道最要紧的一条，因为**零最容易长成"假通过"的绿**）：

| state | 什么时候 | 时刻计数 | `netSummary` | `networkGap` | 能判点吗 |
|---|---|---|---|---|---|
| `off` | 没带旗标 / install 报 `no-uni`/`no-addInterceptor`/`ERR`/空 / 取件串里 `hooked` 不是 true | `null` | `条数=? state=off … ⇒ 不可判，不许读成 0` | 「本腿没开网络计数通道 ⇒ 逐请求计数未采」 | **不能** |
| `empty` | `hooked=true` 且窗口 0 条 | `0`（量出来的） | `条数=0 时刻[…] 写=0` | `""` | **能** |
| `broken` | 截断/非 JSON/`requests` 不是数组/钩子侧 `err`/`dropped>0`（缓冲区被削） | `null` | 同 off 形状 | 「通道**已开但本窗口读数残缺** ⇒ 记 NOT_SHOOTABLE，不拿 0 顶」 | **不能** |
| `ok` | `hooked=true` 且 ≥1 条 | 真实数 | `条数=N 时刻[…] GET /x×1,PUT /dnd×1 写=n` | `""` | **能** |

三道物理闸门（不是注释里的"请注意"，是会抛/会红的代码）：
1. `assertJudgeable()`：`off/broken` 时取数抛 `NOT_SHOOTABLE(verb=networkCount)`（测试 C1/C2）。
2. `momentCounts()` / `combineMoments()` / `countFor()` 在不可判时**回 null 或抛，从不回 0**（测试 A1/B13/E6）。
3. `dropped>0` 直接降级成 `broken`：截断后的窗口只会**少报**，少报的数长得像答案，所以不给它判点资格（测试 A7）。
另外 `degraded` 位：只给时刻名不给时刻边界 ⇒ 塌成单窗并显式标注，**多时刻谓词不可用**，防止 1/0/1 被悄悄当 1 读。

## 负例

新文件：`scripts/qa/test-exec-network-observe.cjs`（23,703 B），harness 形状照 `test-exec-native-capture.cjs`
（同一个 `t(name, cond, detail)` + `SUMMARY: assertion failures = N` + `<TAG>_TEST=PASS|FAIL` 机器行）。
**无设备**：不 import `cli-automator.mjs`，只读产物与判据台。

关键的"它真的能跑"这一半，是靠一个 **Node 里的假 uni 运行时**（测试 `makeFakeRuntime()`）：
逐条复刻上面 vendor.js 的语义 —— `et` 注册表 / `Ci` 见 `false` 掐请求 / `Co` 把 `(响应, 原始 options)` 两个参数交给拦截器 /
应用自己的 `success` 仍被回调。然后 `new Function` **真的执行** `networkHookSource()` 与 `networkDrainSource()`，
对假 uni 发 3 条请求（PUT /v1/dnd、GET /v1/feed?page=2、GET /v1/p 走 fail）后排空计数。
⇒ 验的是载荷本身跑得动且不改行为，不是字符串形状。

必须红的三族（都验过，见「读数」）：

| 族 | 断言 | 红的条件 |
|---|---|---|
| 一 PUT 不许数成 0 | B1 / B2 / D6 | `countFor(parsed,{methods:['PUT'],path:'/v1/dnd'})` 必须 === 1 |
| 残缺不许当 0 | A3 截断 JSON、A4 非 JSON 噪声、A5 `requests` 非数组、A6 `hooked` 缺失、A7 `dropped>0` | 全部必须落 `broken`/`off`，`netSummary` 打 `条数=?` 且明写"不许读成 0" |
| off 不许渲染成 pass | C1/C2 闸门抛、C4 summary 形状、C6 gap 三句分开、B13 判点落 `NOT_SHOOTABLE(verb=networkCount)`、E6 行不带 0 出门 | 任何一处把 off/broken 当 0 就红 |
| 判点本身要能红 | B11（1/0/2 遇 1/0/1 = MISMATCH）、B10（1/0/1 = MATCH）、B14（没谓词 ⇒ 不代判） | 只出不判 / 永远 MATCH 都算红 |
| 不改行为 | D3 应用回调仍被调、D4 三条请求真的都发出、E2 `invoke` 里不许出现 `return false`、E1 不许 `wx.request =` | 钩子把请求掐了或换了位就红 |

**空转防护**（这条测试自己的负例，照 `test-exec-native-capture.cjs:20-24` 的做法）：
把模块拷到 `.zcode/tmp/mutant-exec-network-observe.mjs` 做三处摘除——
① `isJudgeable()` 恒真、② JSON 垃圾分支从 `STATE.BROKEN` 改成 `STATE.EMPTY`、③ `invoke` 里的记录 `push` 前加 `if (0)`——
再拿**同一套断言**跑变异体 ⇒ **必须变红**，实测红 **9** 条（A1/A3/B12/B13/C1/C2/C3/C4/E6）。
跑完按文件名 `unlinkSync` 自己造的那一个，不递归删目录，活模块全程未改（测试末尾两条收尾断言钉住）。
三处摘除**每一处都真的有红**：① + ② 打出 9 条（A1/A3/B12/B13/C1/C2/C3/C4/E6），
③ 由 D8b 补住（真跑一遍后必须"零条未配对"；记录位被摘时 `finish()` 会补记成 `paired:false`，
`unpairable` 从 0 涨到 3 ⇒ 红），合计 **10** 条。这条也算一条实质约束：
**摘掉 invoke 记录后 `startedAt` 会退化成响应时刻**，多时刻归窗就不再可信 —— 所以 D8b 不是装饰。

## 集成点

主控集成时**只需要这几个调用点**（名字与 toast 那一条线一一对位，行号是 2026-09-29 19:39 现读，会随并行编辑漂，锚点以字符串为准）：

1. **import**：`import { networkHookSource, networkDrainSource, interpretInstallResult, parseNetworkBuffer, combineMoments, netSummary, networkGap, observeFromDrain, STATE, NETWORK_COVER } from "./exec-network-observe.mjs";`
   —— 与 `:25` 那行 cli-automator 的 import 并排，不改它。
2. **旗标**：新增 `const NET_COUNT = process.argv.includes("--net-count");`，放在 `NATIVE_CAPTURE`（现读 :114）旁边。
   `MODE_SUFFIX` 只在为真时追加 `+net`：`const MODE_SUFFIX = (GESTURE_MODE?"+gestures":"") + (NATIVE_CAPTURE?"+capture":"") + (NET_COUNT?"+net":"")`。
3. **装钩子**：`netInstall()` 紧挨 `nativeInstall()`（现读 :727）。**只在 `NET_COUNT` 为真时多发这一次 `evaluate`**；
   为假时 `return { installed:false, state:STATE.OFF, note:"off（没带 --net-count ⇒ 逐请求计数未采）" }`，
   形状照 `nativeInstall()` 的 `if (!NATIVE_CAPTURE) return { on:false, note:"off…" }`。
   装钩子每批一次（照 `r1-exec.cjs:230` 在 connect 时装一次的做法），取件每行一次。
4. **取件**：`netDrain()` 紧挨 `nativeDrain()`（现读 :737），内部
   `parseNetworkBuffer(evaluate(networkDrainSource(), {project: PROJECT}), {on: NET_COUNT})`，
   并 `try/catch` 吞掉抛错（照 `nativeDrain` 的 `catch → {err:"取件抛错:…"}`，一条探针抛错不许打死 18 行取景）。
   成本口径：**多一次 `evaluate`/行**。若要省这 4 分钟，可把 `networkDrainSource()` 的 JSON 并进 `nativeDrainSource()`
   一次取回（本模块刻意不预合并，就是为了把这条留给主控那一刀）。
5. **VB03/SE09 这类多时刻行**：在**每个时刻的边界**各调一次 `netDrain()`，把结果按名字攒成
   `combineMoments([{name:"a",…},{name:"b",…},{name:"c",…}])`；单时刻行就是 `momentCounts(parsed, null)`。
6. **行字段**（关键：必须写在 `row()` 那**一个**出口，现读 :784 与 `toast: toastVal, console: consoleVal` 同一行；
   本仓已为"拒绝路径也要填自己报告的读数"记过账）：
   `network: netVal`（`netSummary` 那串，旗标缺时是**空串**）、
   `networkState: STATE.*`、`networkCounts: {moments, byMethodPath, writes}`、`networkCover: NETWORK_COVER`、
   以及 install 读数 `networkInstall: installNote`。
7. **欠账句**：把 `evidenceGaps()` 里现读 :649 那句硬编码
   `"判据点名 network 证据，而本通道没有逐请求计数通道（审计 G-2 [NEW]，不在本车道）"`
   换成 `if (k.network) out.push(networkGap(cap))`（`cap` 里带上 `state`/`err`/`reason`）⇒
   off 与 broken 两句话自动分开，`k.network` 的正则口径（`evidenceKindsNamed`，现读 :413 区）**不动**。
8. **`--selftest`**：可把 `test-exec-network-observe.cjs` 的 A1/A3/C1/E1/E2 五条搬进 `--selftest` 案例表
   （现读 :197-201 那批 `#1` 用例的位置），让"改坏了钩子"在起跑时就响，而不是跑完 90 分钟才发现。
9. **必须逐字不变的东西（旗标缺席时）**：
   - 行上 `toast` / `console` 仍是字面空串 `""`，`evidence`/`missingEvidence`/`observed`/`status` 一字不改；
   - `runner`（`MODE_LABEL`）在三个旧旗标下与 2026-09-28 之前逐字相同，`+net` 只在带旗标时出现；
   - **不发**任何额外的 `evaluate`（不带 `--net-count` 时一次都不多派 ⇒ 既有 1107 条批次要能原样复现）；
   - 新增键一律**只追加**（本仓既有约定：`tour-r6.mjs:49`「JSON 多余字段被忽略」），
     下游 `verify-guest-landing.mjs:182`（读 `row.toast`）、`readjudicate-evidence.mjs:241`（`Array.isArray(row.console)`）、
     `emit-exec-manifest.mjs:54`（按帧拒收正则抠 `missingEvidence`）三条读取路径不许被网络读数改写。

## 读数

每条数字都紧贴它自己的命令。跑法统一用 Node 22（PATH 上的 `node` 是 v16，会把 `import.meta.dirname` 那类用法打爆）。

| # | 命令 | 读数 |
|---|---|---|
| 1 | `cd D:/6/恋爱小程序 && /d/codex-tools/node-v22.17.0-win-x64/node.exe -v` | `v22.17.0` |
| 2 | `…node.exe scripts/qa/exec-network-observe.mjs --selftest` | `NETOBS_SELFTEST=PASS cases=23 bad=0` |
| 3 | `…node.exe scripts/qa/test-exec-network-observe.cjs` | `SUMMARY: assertion failures = 0` ⇒ `NETOBS_TEST=PASS` ⇒ `NETOBS_RESULT=PASS supported=yes negatives=fired cases=54 bad=0 tri_state=ok` |
| 4 | `…node.exe scripts/qa/test-exec-network-observe.cjs \| grep mutant-red \| wc -l` | **10** 条变异体红（三处摘除各有红：① ② → 9 条，③ → D8b） |
| 5 | `node -e "…test-exec-network-observe.cjs…matchAll(/is\\(\\\"([A-E]\\d+[a-z]?)\\s/g)"` | 模块内 **50** 条断言，分 5 族：A 三态 **9**、B 计数与对账 **15**、C 假绿闸门 **7**、D 真执行 **13**、E 载荷/行形状 **6**；加测试自己 4 条顶层 `t()`（空转防护 / 不留盘 / 判据台命中行 / off 语境的 gap 句）= 机器行 `cases=54` |
| 6 | `node -e`（照抄产物里的 Ef/yf/Cf/vf/If 三条谓词后求值） | `Pf('request') = true`（拦截器链生效）、`Pf('addInterceptor') = false`（返回原函数，可同步调） |
| 7 | `node -e "…statSync('apps/client/dist/build/mp-weixin/common/vendor.js')"` | vendor.js = **103,808** B；`services/http.js` = **6,810** B，其中 `.request(` 命中 **2** 处，两处都是 `f.index.request(` |
| 8 | `for b in mp-weixin mp-weixin-real mp-weixin-showcase; do …; done` | 三档均 `addInterceptor in ko: true / Vf proxy: true / Hi snapshot: true / uni.request call in http: true`（**3/3**） |
| 9 | `ls -la scripts/qa/exec-network-observe.mjs scripts/qa/test-exec-network-observe.cjs` | 模块 **32,155** B、测试 **23,703** B（+ 本报告）；`r-exec-cli.mjs` 本车道**一字未动**（mtime 19:39 是并行车道写的） |
| 10 | `grep -n "逐请求计数通道" scripts/qa/r-exec-cli.mjs` | 现读 **:649**（原任务给的 :428 已被并行编辑顶掉；`nativeHookSource` 现读 :564、`nativeInstall` :727、`nativeDrain` :737、`toast: toastVal, console: consoleVal` :784、`evidenceKindsNamed` :635、`pullDownSource` :415） |
| 11 | `node -e "…c21-executor-capability-matrix.md…'G-2'"` | G-2 分母：点名 network **409** 条、带显式计数谓词 **312** 条、stamped **44** 条 |
| 12 | `node -e "…criteria36-classification-v33.json…filter(/network\|请求数\|请求条数\|请求计数/)"` | 本车道的 36 行里命中 **11** 行：CI22, MT21, MSG25, MSG26, DND02, DND03, DND08, CPT32, AC02, VB03, SE09（v33 分拣 tally：A 7 / B 7 / C 21 / D 1） |

**SUPPORTED=yes**（不是 `NOT_SUPPORTED`）：桥不必新增工具，`automation_evaluate` + `uni.addInterceptor('request')` 就能给出逐请求、逐时刻、逐方法的计数；
模块、测试、三态闸门都已在盘上并跑绿。

未证的那一半要说清（**这条车道没有设备权限，UI 租约在主控手上**）：
① 上表全部是**静态读产物 + Node 内复刻运行时**得到的，还**没有**在真 DevTools 模拟器上装过一次钩子；
② 首次真跑必须由主控用一条最小探针确认（不改判据、不出版面）：
`…node.exe scripts/qa/cli-automator.mjs --project apps/client/dist/build/mp-weixin eval "<networkHookSource()>"`
期望回 `installed`；随后 `eval "<networkDrainSource()>"` 期望回一个带 `hooked:true` 的 JSON 串。
若真机回的是 `no-uni` / `no-addInterceptor` / `ERR`，本模块**自动**把整族降级成
`NOT_SHOOTABLE(verb=networkCount)`（`interpretInstallResult → state=off → networkGap`），
零不会被写出来、也就不会被读成通过 —— 这是"SUPPORTED=no 时也不出假绿"的那条保险，不需要再改代码。
③ 失败注入/断网本身（TP07 的前置、MSG26 的 ④）仍属 G-3，本车道只保证"失败的那条请求**被数到并带 outcome=fail/statusCode=0**"，
不保证能把网络真打断。

NETOBS_RESULT=PASS supported=yes negatives=fired cases=54 bad=0 tri_state=ok
