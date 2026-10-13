# 执行器/能力车道（carrier lane）2026-10-13 — 原骨架 + 续作车道的验收记录

来源：`reports/audit/ui-audit-2026-10-09/sort-round3.json` 的 `R3-OT-01` / `R3-02` / `R3-NET-04` /
`R3-08` / `R3-PFI25-03` / `R3-07`。本车道只做**离线可证**的执行器改造；活体重跑归后续带设备的车道。

边界：不碰 DevTools / wechatide / 浏览器 / 后端 / 任何设备腿。不碰 `verify-real-coverage.mjs`、
`apps/client/src/**`、`reports/audit/ui-audit-2026-10-09/tour-ledger.json`（并发车道在写）。不提交。

> **可信度声明（先读这一段）**：原 carrier 车道在 150 回合上限中途死亡，最后一句字面是
> `Let me verify the file region state:`，它留下的本文件只有 1166 字节骨架、从未填过。
> 续作车道**不继承、不采信**它的任何自述（包括它「三 Sources 只落了一部分」这类半成品猜测）。
> 下文每条结论都是续作车道当场从磁盘/运行时量出来的，运行口径 **Node 22**
> （`D:/codex-tools/node-v22.17.0-win-x64/node.exe`）。
> **踩过的坑（写下来给下一个人）**：本机 Git Bash 里 `export PATH="D:/codex-tools/…:$PATH"`
> **不生效** —— `which node` 仍解析到 `D:/微信开发者/微信web开发者工具/node`（v16），
> 因为 Windows 盘符式的 PATH 条目不被 MSYS 转换。必须用**绝对路径调 node.exe**。
> v16 下这三套离线套件照样会印 PASS（它们不吃 `import.meta.dirname`），但
> `node scripts/qa/r-exec-cli.mjs --selftest` 在 v16 下会在 **import 阶段**抛
> `ERR_INVALID_ARG_TYPE`（`import.meta.dirname` undefined）——那是工具链问题，不是判决。

## 基线（续作车道接手时实测，机器行）

```
CAPRECIPES_TEST=PASS（checks=71）    SUMMARY: assertion failures = 0
CAPS_TEST=PASS（checks=65）          SUMMARY: assertion failures = 0
VERB_TEST=FAIL                       SUMMARY: assertion failures = 1
  FAIL 闸只在 STRICT_VERBS 下生效（非破坏性：不带旗标时旧腿的判决一字不变）
```

改动面（`git diff --stat`，未提交，接手时）：`case-recipes.json` +64 / `exec-capabilities.mjs` +366 /
`r-exec-cli.mjs` +78 / `r-exec-ws.mjs` +159 / `test-cap-recipes.cjs` +40 / `test-exec-verb-dispatch.cjs` +7。

## 收尾后（续作车道的机器行，全部 Node 22 绝对路径跑的）

```
VERB_TEST=PASS                       SUMMARY: assertion failures = 0   （checks=89 行 ok/FAIL 计数）
CAPRECIPES_TEST=PASS（checks=112）    SUMMARY: assertion failures = 0    （71 → 112，补进来的 39 条见 §D/E）
CAPS_TEST=PASS（checks=65）           SUMMARY: assertion failures = 0
EXEC_SELFTEST=PASS cases=101 bad=0    （r-exec-cli.mjs --selftest，含本车道新增的 3 条）
```

顺带把隔壁 7 套离线件也跑了（它们同样扫 r-exec-cli/ws/exec-capabilities）：
`DENYTAP_TEST / NATIVE_TEST / NETOBS_TEST / GEOM_TEST / ROWSHA_TEST / TVC_TEST / VERBSHAPE_TEST` 全 PASS。
`GL_TEST=FAIL（checks=45 failures=1）`——**不是本车道的**：失败的是
`派生第二条游客腿的 triage 没成功`，子进程是 `scripts/qa/triage-exec-failures.mjs`，
它只 import `guest-landing-status.mjs`、吃的是 `reports/audit/round-7/exec-guest-real-guard-r10` 语料，
报的是「复测腿与债不同源（recommend-pref → login 声称 11 行、实测 4 行）」。与本文件 6 个改动面无交集，
归游客落点车道。副作用：那一跑会把 `reports/audit/round-7/evidence-holes-verdict.sidecar.json`
的 `generatedAt` 就地改写；已逐字复原（`git status` 现在只剩上面 6 个文件）。

## A. 开页形态 + handler 直调（R3-OT-01 / R3-02）—— 已落地，验收结论：**完整**

原车道没留下任何自述，以下是磁盘上的实际形状：

- `exec-capabilities.mjs` 导出 C7/C8 两组原语：`resolveOpenForm / navigateToSource / navToVerdict /
  navigateToSyncSource / navReadSource / navSyncVerdict / interpretNavRead / navLandVerdict /
  openFormNote / isTabBarPage / NAVTO_BASE_PAGE / TABBAR_PAGES`，以及
  `parseHandlerCall / handlerCallSource / handlerCallVerdict / handlerCallOk / handlerDrainSource / handlerNote`。
- **两条腿都接上了，且用的是各自该用的形**：WS 配方腿（`r-exec-ws.mjs`）走 Promise 形
  `navigateToSource` + `navToVerdict`；CLI 桥腿走「发起 + 稍后回读」形（`navigateToSyncSource` +
  `navReadSource` + `navLandVerdict`），因为桥不 await 返回 Promise 的载荷 —— 这条差异是有意为之，
  不是两份实现漂移（`navToVerdict("nav-fired") !== "ok"` 与 `navSyncVerdict("nav-ok") !== "fired"`
  已进 §7 负例钉住，谁把两边混用一个裁决函数就会红）。
- 配方侧（`case-recipes.json`）：OT05/OT06/OT09/OC09 四个真实腿的深链 open 步声明了 `via:"navto"`
  （6 步），tap/rapidTap 步挂了 `handler` 直调替代（`handleLike` / `openWhisperSheet`），OC09 另有一步
  `do:"callHandler"` 直调 `loadOfficialChat`；每步配 `assertRoute` 复核落地。
- 台账 ①「编译标签是路径形」这一层被产物证伪（配方链形 `profile-shell >>> public-profile >>>
  relationship-c-t-a >>> .relationship-cta__btn--like` 是对的），OT06 的 `adjudication` 字段把这件事
  写进了配方；`validateDeepChain` 因此拦的是「把这句误诊当修法」的两种错形（路径形 / 类名当组件段）。
- `wx.evaluate` 载荷陷阱：新造的 6 支载荷（navigateTo 两形 / navReadSource / handlerCallSource /
  handlerDrainSource / netFaultArmReceiptSource）逐个扫过，**一个 `uni` 记号都没有**，只用
  `wx.*` / `getCurrentPages()`（§7 末条负例）。本车道**没有新增任何 spawn/execFile**，
  所以 CVE-2024-27980（`.cmd` → `spawn EINVAL`）那条陷阱不涉及；动作仍走既有 `capEval` / `element()` 载具。

**默认关与「没用过」的显式宣告**（照 `--gestures`/`--native-capture` 先例）：
`--navto-open` / `--handler-call` 都只在 `process.argv.includes(...)` / `flag(...)` 里出生，没有一处硬编码；
CLI 腿打 `RUNNER_OPEN_FORM=` / `RUNNER_HANDLER_CALL=`，WS 腿打 `WSX_OPEN_FORM=` / `WSX_HANDLER_CALL=`，
off 那一支都明写「本腿**一字未用**／通道未使用」并把 R3-02 ②③ 的既有欠款指回原文，
落盘字段 `openForm` / `handlerCall` 在不带旗标时读作 `bridge(…未用)` / `off(…)`，
`MODE_SUFFIX` 只在带旗标时才多 `+navto` / `+handler`（⇒ 1107 行历史批次的 runner 名一字不变）。

## B. netFault functionDeclaration 集成 + 判点形状（R3-NET-04 / R3-08）—— 代码半边完整，判据半边待活体

- 「三 Sources」全在盘且**全被调用**（这是原车道唯一没验完的地方，我逐个对着 import 表核过：
  `r-exec-ws.mjs` 从 `exec-capabilities.mjs` 吃 47 个符号、`r-exec-cli.mjs` 吃 9 个，**缺导出=0**）：
  `mockArmBranch`（分岔判定）/ `netFaultArmReceiptSource`+`interpretArmReceipt`+`armReceiptVerdict`+
  `armUnshootableText`（臂展回执）/ `netFaultArmWindow`+`armWindowNote`+`firstLoadFaultGap`（判点形状）。
- **补了 B 的最后一处半截活**：`r-exec-ws.mjs:933-940` 原来只把 `asFunctionDeclaration(mockSrc)`
  当**布尔检查**用，返回值丢掉，实际发给 SDK 的仍是**源串** —— 也就是仍然依赖 SDK 对字符串前缀的嗅探
  选分岔，而 `exec-capabilities.mjs` 自己的文件头把这件事写成「①asFunctionDeclaration：把载荷源编成
  真正的函数字面量再交给 SDK，分岔不再靠嗅探」。代码与它自己声明的意图不符 ⇒ 改为
  `const mockFn = asFunctionDeclaration(mockSrc)` 并 `mini.mockWxMethod("request", mockFn)`
  （`mockArmBranch(fn)` 对函数恒走 functionDeclaration，不再看嗅探）。§7 有一条文本判点钉这个返回值被用上。
  顺手删掉 navto note 里那句 `+ (step.via === "navto" ? "" : "")`（永假的两支都返回空串 = 半截编辑留下的死码）。
- 判点形状改对了：`armNetFault` 步现在上腿前先判 `mockArmBranch`／能否编成函数，装完**必回读回执**，
  读不到就 restore + `NOT_SHOOTABLE(netFault=arm-unverified)`；`runRecipeCase` 在**上设备之前**跑两道形状闸
  （穿透链段形 `NOT_SHOOTABLE(recipe-chain)`、臂展窗 `NOT_SHOOTABLE(recipe-netShape/…)`）。
- 「首屏那一半」被做成**第五条诚实的不**：`VERB_RULES` 新增 `{verb:"netFaultFirstLoad", re:VERB_FIRSTLOAD_RE}`，
  要求「故障 ∧ 进页那一刻」双点名才扣，`firstLoadFaultGap()` 明写不许拿重触发的 intercepted>0 冒充首屏拦截。
- 配方侧（判据台改形状）：OT06 / OC09 / VB03 的臂展从「排在所有 open 之前」搬到「每次 open 之后」，
  并补页内重触发（callHandler / tap retry / pullDown）+ 同段 `drainNet`；VB03 的 (a)(b) 计数半边
  由 `adjudication` 如实记成 NOT_SHOOTABLE（原判据 ①② 在本通道从未被有效测过 —— 这条是新发现的附带账，
  原车道写进了 VB03 的 adjudication，措辞与 CON-EV-01 / R2-PFI25-04 的在册读数一致）。

**这两道形状闸会不会动到不带旗标的既有判决？实测答案：不会。** 语料 = `scripts/qa/case-recipes.json`
（工作树版，8 个配方）：链形状闸拦下 0 步、臂展形状闸拦下 0 条；5 条带臂展的配方
（VI34/OT06/OT09/OC09/VB03）全部 `ok kind=ok`。反面证据（同一把闸、同一批真配方）：把
**HEAD 版** `case-recipes.json` 喂进去 ⇒ 臂展闸拦下 3 条（OT06/OC09/VB03，`kind=arm-dropped-by-open`），
正是交过 `intercepted=0` 旧行的那三条。也就是说闸不是橡皮章，而现存的 0 命中是重排的结果，不是运气。

## C. PFI25 配方重排（R3-PFI25-03 / R3-07）—— **早已完整，本车道一字未改**

- 语料对照：`PAGES-PROFILE-INDEX|PFI25` 在工作树与 `HEAD` **逐字相同** ⇒ 重排不是这条死掉的车道做的，
  也不需要在它身上做（round-2 fix 车道 2026-10-10 已落盘）。
- 重排确实在且自洽（26 步实读）：`open(#1) → wait → fixture setup(#3) → read(profile-voice-state)(#5) →
  probe(.video-cta/.voice-preview)(#6) → assertPresent(#7) → armModal → tap 删除 → …` —— seed **在首次 open 之后**，
  与 `adjudication` 的定谳一致：`stores/profile.ts` real 分支 `load()`（:415-469）不赋 voiceStatusUrl/Duration
  （只 mock 分支 :401-402 与动作方法 :886-926 赋），所以「渲染链丢弃」不成立；真丢弃点是
  `simulator_open_page` 属 compiler 族 ⇒ 桥 open 重编译重启 AppService ⇒ open 之前的补丁必灭。
  重开步（#20）之后的 `read`(#22) 自己就写了「对『真删』无判别力，读数照实记」，
  死选择器 `.profile-complete-card` 已摘。⇒ **C 完整，按题面要求什么都不改。**
- 剩下的只有 R3-PFI25-03 的后半边（实带重跑），见「遗留」。

## D. 那条 RED 的处置：字面量换成行为真值表（`scripts/qa/test-exec-verb-dispatch.cjs`）

主控给的事实核对成立：`r-exec-cli.mjs:150` 是
`const STRICT_VERBS = GESTURE_MODE || RAPID_MODE || SCROLL_MODE || NAVTO_OPEN || HANDLER_CALL || process.argv.includes("--strict-verbs");`
而断言钉的是没有 `NAVTO_OPEN || HANDLER_CALL` 的旧串。**但「行为对、断言过期」不是改它的理由**，
所以这次没有把字面量抄新（那只会造出下一条被合法改动逼红的冻结串），而是把断言换成
**它名字所声称的那个不变量**（`test-exec-verb-dispatch.cjs:224-285`，断言本体在 :279）：

把活文件里 `const STRICT_VERBS = …` 那一串表达式抠出来、用注入的旗标值 + 假 `process.argv` **真求值**：

1. 链里出现的每个标识符都必须在已裁定的名单里（`CAP_FLAGS` / `READONLY_FLAGS`），出现第三个名字当场判废
   ⇒ 后来人加旗标时必须先表态「这是能力还是读数」，不许让链子悄悄长；成员访问（`process.argv.includes`）
   先抹掉再取标识符，否则 `argv`/`includes` 会被当成旗标（我自己第一版就栽在这里）。
2. 每个进链旗标都必须真是 `process.argv.includes("--x")` 派生 ⇒ 硬编码旗标让真值表失效，一票否决。
3. 六条全关且 argv 无 `--strict-verbs` ⇒ 闸必须为**假**（这就是「不带旗标判决一字不变」的本体）。
4. `GESTURE_MODE / RAPID_MODE / SCROLL_MODE / NAVTO_OPEN / HANDLER_CALL` 各自单独打开 ⇒ 闸必须为**真**。
5. `GEOM_POS / NET_COUNT / NATIVE_CAPTURE` 各自单独打开 ⇒ 闸必须仍为**假**（只读通道不许扣交互行）。
6. 只给 argv 塞 `--strict-verbs` ⇒ 必须为**真**（显式入口没被写死）。

配套补了一条「非破坏性的另一半」（`:286-292`）：全文件**只有一个**运行时 `verbRefusal(c.action…)` 调用点，
且它就是 `if (STRICT_VERBS) {` 之后的第一句 ⇒ 不带旗标时这张动词表根本没被查询。
这条不是装饰：B 新加的 `netFaultFirstLoad` 规则是**无条件生效**的规则（没有 needsCap），
差分实测（语料 = `reports/audit/round-6/ops/*.json` 1107 条真实判据，改动前后两份 r-exec-cli.mjs
用同一套纯函数组装后逐条比判决）：

```
无旗标(caps={}) ⇒ 判决翻转行数 = 1 / 1107      ← 直接问 verbRefusal 时的字面答案
全旗标(caps all) ⇒ 判决翻转行数 = 1 / 1107
pickElementVerb（无旗标）差异行数 = 0
唯一差异：次要22|MS06  EMIT→REFUSE（verb=netFaultFirstLoad 扣住了「冷启动进页面（拦截生效）→ 观察错误态 → tap 重试」）
```

翻转那 1 条只在**带旗标**的腿成立：默认腿根本不进 `if (STRICT_VERBS)`（上面那条结构判点），
所以「不带旗标 ⇒ 行一字不变」仍然成立，而带 `--strict-verbs` 的腿从此对 MS06 交出的不是
「一次普通 tap + EXECUTED」而是 NOT_SHOOTABLE —— 这正是 R3-NET-04 要的（那一腿的臂展本就装不上）。
这笔账要人来认：见「遗留」第 5 条。

**空转防护（变异体，两具进盘常驻 + 两具一次性）**：`:439-448` 往 `MUTANTS` 表加了两具只切闸这一维的变异体，
每次跑套件都会现拷现删：

- `gate-hardcoded-true`：`const STRICT_VERBS = …;` → `const STRICT_VERBS = true;`
  ⇒ 红在「旗标全关时闸不为假（读到 true ⇒ 不带旗标的旧腿会被扣交互行…）」
- `gate-readonly-wired`：链首插入 `GEOM_POS ||`
  ⇒ 红在「GEOM_POS 是只读通道却进了拒发链（拿读数旗标去扣交互行）」
- 两具各配一条「红只来自这一刀」的同伴判点（动词口径/其余旗标不许被顺带改坏）。
  `want` 用 `gateChain(m)` 比**抠出来的那一行**，不比全文正则 —— 活文件 `:285` 的自检里抄着同一串字面量，
  拿全文正则判「改到没有」会永远为真（这是我第一版在这踩的第二个坑，那具变异体当时「没落到盘上」）。

一次性两具（`D:/tmp-carrier-acceptance/`，仓库之外，用完即 `rm -rf`，工作树全程未动）实测输出：

```
M1  const STRICT_VERBS = GEOM_POS || GESTURE_MODE || RAPID_MODE || SCROLL_MODE || NAVTO_OPEN || HANDLER_CALL || process.argv.includes("--strict-verbs");
    FAIL 闸只在 STRICT_VERBS 下生效… :: 真值表不合格：GEOM_POS 是只读通道却进了拒发链（拿读数旗标去扣交互行）
    VERB_TEST=FAIL  SUMMARY: assertion failures = 3
M2  const STRICT_VERBS = true;
    FAIL 闸只在 STRICT_VERBS 下生效… :: 真值表不合格：旗标全关时闸不为假（读到 true ⇒ 不带旗标的旧腿会被扣交互行，判决不再是「一字不变」）
    VERB_TEST=FAIL  SUMMARY: assertion failures = 4
```

两具都在目标断言上红、且报的是**那一刀的名字**，不是「取不到口径」之类的空转红。副本已删。

## E. 新通道的负例（原来一条都没有，本车道补的 §7）

事实：`mockArmBranch / asFunctionDeclaration / netFaultArmReceiptSource / interpretArmReceipt /
armReceiptVerdict / armUnshootableText / resolveOpenForm / parseHandlerCall / handlerCallSource /
handlerCallVerdict / navLandVerdict / firstLoadFaultGap` 在接手时**没有任何测试文件扫到过**
（`grep -l` 只命中 `validateDeepChain` 与 `netFaultArmWindow`，两者还只是被 per-recipe 循环顺手用）。
⇒ 按题面「每个能力都要一条真能失败的负例」补 `test-cap-recipes.cjs` §7（71 → 112 checks），
语料来源在文件里写死了，不是自造夹具：
（**为什么写在 `test-cap-recipes.cjs` 而不是 `test-exec-capabilities.cjs`**：后者不在这条车道的改动清单里，
动它就超出了「本车道文件足迹」；而 §7 的正例/反面本来就全部从 `case-recipes.json` 真步序里取与改，
放在读这份语料的那套件里最名实相符。）

- **正例形状全部从 `scripts/qa/case-recipes.json` 取**：每个 open 步（默认必须逐字回桥 open、
  page/query/url/base 全等）、6 条 `via:"navto"` 声明、每条 `handler` 声明（`handleLike` /
  `openWhisperSheet` / `loadOfficialChat` 都必须在 `parseHandlerCall` 下 ok）、真穿透链、
  真 `netFaultMockSource()` 载荷。
- **反面形状全部从同一批真步序改出来**：把 OC09 的 `armNetFault` 搬回 open 之前（=HEAD 在盘的旧形状）
  ⇒ 必须 `arm-dropped-by-open`；把真链的中间段换成 `components/profile/public/RelationshipCTA`
  （=台账 R3-OT-01 ① 那句被证伪的误诊）⇒ 必须拦且措辞点名「不是组件不存在」；
  `.relationship-cta >>> …`（类名当组件段）⇒ 拦；把 `__qaNetSpec` 载荷包成 JSON 值 ⇒ `mockArmBranch` 必须
  判 `result` 且编不出函数；把真源串截一半（REAL-OT-06 双引号事故形）⇒ 返回 null 而不是抛。
- **回执五态互不折叠**：mocked=false / 袋不在 / mode 对不上 / 回执报错 / 全好，四种 false 各自点名差在哪一维；
  空串/垃圾串/undefined 一律读作 arm-unverified。
- **旗标默认关**：handlerFallback 第一句必须是「这一步没声明 handler 就返回 null」（既有配方的行一字不变）；
  声明了却没带 `--handler-call` 必须拒发并点名「替代通道未使用」（tap/rapidTap/callHandler 三处都钉）；
  带 `--navto-open` 但这一步没声明 via ⇒ 仍走桥 open 且行上点名是哪条通道没装。
- 一次性变异体验证 §7 会红（同样是仓外副本，已删）：

```
M3  mockArmBranch 变橡皮章（if (s) return "functionDeclaration";）
    FAIL §7 负例：result 分岔（…intercepted 恒 0 的假零本体）必须判 result 且编不出函数
    CAPRECIPES_TEST=FAIL（checks=112）  SUMMARY: assertion failures = 1
M4  netFaultArmWindow 变橡皮章（三张失败清单永远为空）
    FAIL §7 负例（真配方搬回旧形状）：把 OC09 的 armNetFault 移回最前 ⇒ 必须判 arm-dropped-by-open…
    FAIL §7 负例：臂展后同段没有任何重触发 ⇒ no-retrigger；… ⇒ no-drain
    CAPRECIPES_TEST=FAIL（checks=112）  SUMMARY: assertion failures = 2
```

为了让这两具变异体可以反复跑，`loadCaps()` 加了 `CAPS_UNDER_TEST` 覆盖（与
`test-exec-verb-dispatch.cjs` 的 `EXEC_UNDER_TEST` 同一条纪律），并把被测模块名印成机器行
`被测能力模块=…（活文件|变异副本，非活文件）`。

顺带说清 §7 里三条**反过来钉住实现宽容度**的判点（我第一版按想当然写、被磁盘证伪，留着防下一个人误改）：
① 缺省基底页 `pages/discover/index` **就是** tabBar 页 —— 限制只作用于 navigateTo 的目标页，
   桥 open 对 tabBar 页是好的；②「目标==基底」这一支要用显式 `basePage` 才走得到（tabBar 检查更靠前）；
   ③ 空段（`a >>>  >>> b`）被校验器与解释器**共用**的 `deepChainSegments` 一致丢掉 ⇒ 钉的是「两处不许各自漂移」，
   不是「空段必须报错」。

## 台账诊断被源码/产物证伪之处

1. **R3-OT-01 台账 ①「编译标签是路径形 `components/profile/public/RelationshipCTA`」不成立**：
   `PublicProfile.json` 的 usingComponents 键就是 `relationship-c-t-a`，配方链形一直是对的。
   成立的是 ②（automator 0.12.1 不穿透自定义组件子树）与 ③（带 query 的桥 open 挂 webview 代理态、`$` 全超时）。
   ⇒ 现在被 `validateDeepChain` 的两条负例钉住：路径形与类名当组件段**都**拦，因为两者都会让这一腿永远
   「不在页上」，而那句读数被误诊成「组件不存在」正是 R3-02 的起点。
2. **R3-PFI25-03 的「渲染链丢弃语音态」假设在源码层面就不成立**（real `load()` 不赋语音字段，
   只有 mock 分支与动作方法赋）⇒ 丢弃点是编排顺序，不是产品。这条已在配方的 `adjudication` 里定谳（见 C）。
3. **`netFaultArmWindow` 的旧形状不是「onShow 没重拉」**：VB03 原断言钉的是「逐段 drainNet 计数 ≥3」，
   而那几段计数在结构上取不到（臂展排在 open 前 ⇒ 被重编译洗掉）⇒ 旧断言验的是一条取不到读数的形状。
   `test-cap-recipes.cjs` 里的这条已改成钉新形状（臂展窗 ok + (a)(b)(c) 三段仍在），
   (a)(b) 计数半边如实记 NOT_SHOOTABLE。
4. **原车道「exec-capabilities 三 Sources 只落了一部分」的猜测不成立**（它没来得及写下结论，但磁盘上的
   47+9 个 import 符号零缺失证否了「缺 Source」）；真正的半截只有一处：`asFunctionDeclaration` 的返回值
   被丢掉（已补，见 B）。

## 遗留 / 下一步（需要活体会话，本车道不可证）

1. **A 的实带重跑**：OT05/OT06/OT09/OC09 四腿带 `--navto-open --handler-call --strict-verbs` 重跑至判过。
   `tmp/qa/navto-cta-probe.mjs` 的健康路径实证（outerWxml 13493B、CTA 可见）是**探针**读数，不是这四腿的判决。
2. **B 的判据半边**：`R3-NET-04 补法`点名「先以 VI34 重跑落第一条有效网络判决行」——臂展回执
   （`arm-verified` / `arm-unverified`）与 `intercepted>0` 的真读数在离线不可证；
   WS 腿 `await capEval(navigateToSource(...))` 会不会被通道 await 住（CLI 腿正是因为它不 await 才用
   发起+回读两形）也是设备问题 ⇒ 现在只能记 UNKNOWN，不许读成「已验证」。
3. **C 的实带重跑**：PFI25 重排后的绿/红未证（红已撤、绿未证）。
4. **`--navto-open` 的粒度是个待拍板问题，不是缺陷**：`resolveOpenForm` 只看旗标、**不看** `step.via`
   ⇒ 带旗标时 WS 腿的**所有**非 tabBar open 步都换成基底页+navigateTo（行上会写明 `open(via=navto)`，
   banner 也宣告，所以不违反「默认关」纪律），但配方里那句 `via:"navto"` 就成了描述而非许可。
   改它要同时动 `r-exec-cli.mjs:286` 那条自检（它钉的是「旗标开 ⇒ navto」），且 CLI 腿没有 per-step
   声明可看 ⇒ 留给主控拍板，本车道不自扩判据。
5. **MS06 在带旗标腿上从 EMIT 变 REFUSE**（见 D 的差分）：新规则 `netFaultFirstLoad` 的 lookahead 含
   `错误态|加载失败|请求失败`，比 `networkFault` 那条宽 ⇒ MS06（「冷启动进页面（拦截生效）→ 观察错误态 →
   tap .shop-state__btn 重试 → 解除拦截后确认恢复」）被扣。方向与 R3-NET-04 一致（臂展本就装不上），
   但**这条改判要人认**：认了就进台账，不认就该把 `VERB_FIRSTLOAD_RE` 收窄到与 `networkFault` 同词表。
   默认腿不受影响（闸不查表），所以不影响历史 1107 行的读数含义。
6. **`r-exec-cli.mjs:285` 那条自检仍是冻结字面量**（把新链整串抄进自检）。它是载具自己的启动自检、
   不是测试，本车道不动它；但下一次加通道时它会先红 —— 处理口径按 §D 换成行为真值表，别再抄新字面量。
