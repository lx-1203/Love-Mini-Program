# fix-lane — ui-audit-2026-10-09 巡检修复车道（REAL-OT-06 + F04）

- 运行环境：Bash PATH 前置 Node22（`D:\codex-tools\node-v22.17.0-win-x64`，实测 v22.17.0）。
- 证据件：tour-round1.json / audit-round1.json / exec-realcov-b4、b4b / tour-round1.md。
- 纪律：不碰 `.zcode/**`、`reports/**`（本文件除外）、不做 git 提交、不改测试断言凑绿。

## REAL-OT-06（medium）：OT05/06/09 CTA 探针 absent + armModal 抛错 —— 已修（代码/配方侧）

### 根因核实（本车道实跑）
1. `grep -c "relationship-cta__btn--like" scripts/qa/case-recipes.json` ⇒ **10**（与 ask 一致）。
2. real 编译产物直读 `apps/client/dist/build/mp-weixin-real/components/profile/public/RelationshipCTA.wxml`：
   四钮类名就是 `relationship-cta__btn--like/--hello/--whisper/--follow`、容器 `.relationship-cta` ⇒
   **配方类名与编译产物一致，「类名错配」不成立；真正机制是自定义组件边界**：
   - `mp-weixin-real/subpackages/profile-extra/profile/other.json` 页级只注册 `profile-shell / whisper-compose-sheet / bottom-sheet`；
   - `ProfileShell.json` → `public-profile`；`PublicProfile.json` → **`relationship-c-t-a`**（uni-app 把 PascalCase 编译成全小写逐词连字标签，`PublicProfile.wxml` 内 `<relationship-c-t-a wx:if>`）；
   - 页面 wxml 全程无 `relationship-cta` 记号 ⇒ 类在 page → profile-shell → public-profile → relationship-c-t-a 三层组件子树内，
     runner 的 `page.$$/page.$`（r-exec-ws.mjs probeSet/wsTap）探不到 ⇒ 恒 absent，与 b4 帧上四钮可见完全自洽。
3. armModal `Uncaught Unexpected identifier 'showModal'` **离线复现**：
   `modalArmSource("showModal")` 用 `split("__API__").join(JSON.stringify(api))`，而模板三处占位写成 `'"__API__"'`（已带双引号）
   ⇒ 生成 `api: ""showModal""`（双双引号），`eval('(' + src + ')')` 实报 `Unexpected identifier 'showModal'`，
   与 exec-realcov-b4/exec-results.json OT05 行 step#5 报错逐字一致。

### 修复
- `scripts/qa/exec-capabilities.mjs:62`：`JSON.stringify(api)` → 裸 `String(api)`（模板已带引号）；
  修复后 `new Function('return (' + src + ')')` 对 showModal/showActionSheet 均解析 OK（本车道实跑）。
- `scripts/qa/test-exec-capabilities.cjs`：新增回归钉「C1 mock 载荷可被解析为函数表达式」（65 checks 全绿，含新钉）。
- `scripts/qa/case-recipes.json`：OT05/OT06/OT09 的 CTA/whisper 选择器全部改**组件穿透链**（段=真实编译标签/类，抄自
  mp-weixin-real 编译产物；判据台 tapTarget 仍是平铺类名，穿透链以其结尾 ⇒ `validateRecipes` ③ 子串校验照过）：
  - CTA：`profile-shell >>> public-profile >>> relationship-c-t-a >>> .relationship-cta__btn--like|__hello|__whisper|.relationship-cta`
  - whisper：`whisper-compose-sheet >>> .whisper-sheet|__input|__send|__close|.whisper-mask`（组件挂页级，other.json 在册）
  - 改写覆盖 probe/tap/rapidTap/input/readValue 全部出现处；文件顶 note 增补选择器约定。
- `scripts/qa/r-exec-ws.mjs`：新增 `deepCount/deepOne/deepSegs` —— 选择器含 `>>>` 时逐段以页级 `$` + 逐层 `element.$` 下钻
  （每段均为 miniprogram-automator 文档化能力：自定义组件标签选择器/类选择器；客户端只透传 selector，无本地校验，实读 out/Page.js、out/Element.js 证实），
  末段 `$$` 计数 / `$` 取元素；不含 `>>>` 走原页级路径，既有配方行为不变。`probe/tap/rapidTap/input/readValue/assertPresent/assertAbsent` 全部接线。
- 离线校验（本车道实跑）：`node scripts/qa/test-cap-recipes.cjs` ⇒ PASS（29 checks，含对真判据台 validateRecipes 零问题）；
  `node scripts/qa/test-exec-capabilities.cjs` ⇒ PASS（65 checks）；`node --check r-exec-ws.mjs` ⇒ OK；deepSegs 分段 smoke ⇒ OK。
- **实带重跑（OT05/06/09 判过与否）不在本车道**：按 ask 移交 F01/F02/F03 腿；活页穿透行为在带上方可最终证实。

## F04（high）：VRN07 实名表单 UNCOVERED —— 归因已核实闭环 + 词表已增形态；判过仍被「未成年账号铺设」阻塞（skipped 如实）

### identity A 表单真实渲染形态核实（重跑前置，本车道实跑）
- 实探 real 8080（无泄漏探针 `scripts/qa/probe-identity-shape.cjs`，凭据运行期读 r-exec.cjs、不打凭据）：
  - **A uid=100158：realName data.status=APPROVED，birthDate=2003-05-20（23 岁，isAdult=true）**；
  - B uid=100159：同样 APPROVED + 成年；guest 100151：同样 APPROVED + 成年。
- 编译产物 `mp-weixin-real/subpackages/profile-extra/verification/real-name.wxml`：`.form-item__input` 在**页面级**（唯一组件 skeleton-block），
  表单在 `verified-card(wx:if m) / pending-card(wx:elif r) / 表单(wx:else)` 三分支的 else ⇒ **A 的表单不渲染 = A 已实名走 verified 分支，
  b3 的 `.form-item__input:absent` 归因成立；「不排除同为选择器错配」被证伪**（本页探针通道无组件边界问题；mock 带同页 input=2 佐证）。
- 帧未补：本车道无设备会话，帧采集随 F01/F02/F03 重跑腿；归因定级据实升级为「已核实（活体 API 探针+编译产物分支直读）」。

### 「未成年」形态为何不可经产品 API 构造（证据）
- 注册 `RealAuthService.registerUser`：birthDate 必填且 `AgePolicy.isAdult` 不满 18 ⇒ `MinorNotAllowedException`；
- 资料更新 `ProfileUpdateService:210-219`：birthDate 传值须 ≥18、传 null=不改；
- admin `PUT /api/v1/admin/users/{id}`（AdminUserUpdateRequest）：只有 `user_basic_profiles.birthYear`，摸不到 `users.birth_date`；
- 实名页门 `real-name.vue loadAdultGate:336-337`：birthDate 缺失 ⇒ isAdult=false（从严），即唯一可造形态=「实名未认证 + birth_date NULL」的专号，
  只能由**授权 DB 夹具**铺设（test-cap-recipes.cjs 在册裁定「VRN07=待授权 DB 夹具」，本车道不越权直写库）。

### 编排层词表改动（已落盘并验证）
- `scripts/qa/r-exec.cjs` IDENT_DEFS：新增 `minor` 条目（未成年形态；body 留空=无凭据可铸，注释写明铺设前置与 3-N 全链路证据）。
- `scripts/qa/cli-automator.mjs` mintPlanFor：词表扩为 **A/B/guest/minor**；minor 分支在凭据未回填前**当场拒跑**并给出铺设配方
  （MINOR_NOT_PROVISIONED，同 B 号 r9 铺设前口径，绝不退回 A/B/guest 票顶替）。
- `scripts/qa/verify-real-coverage.mjs`：`axesOf` 登录轴与 `judgedLogin` 均认 `minor`（minor 行从此领登录轴的钱）；
  r-exec-ws.mjs 词表注释同步。
- 实跑验证：`check-identity minor` ⇒ 拒跑+配方（exit 2）；`check-identity A/B` ⇒ ok（回归不变）；`check-identity zzz` ⇒ 拒收且词表文案更新；
  `node scripts/qa/verify-real-coverage.mjs` ⇒ 守恒 OK（免检 28+覆盖 203+欠账 5=236），UNCOVERED 仍 5 条与改前一致（尚无 minor 行，账面不动是诚实的）。
- 配套离线套件：RCOV_TEST=PASS（42）、RCDTEST_TEST=PASS（61）、CAPS/CAPRECIPES 全绿。

### skipped（如实）
- VRN07「重跑至判过」：未成年形态账号不存在且产品 API 不可造 ⇒ 须授权 DB 夹具铺号（配方已写在 MINOR_NOT_PROVISIONED 文案与 IDENT_DEFS.minor 注释）
  → 凭据回填 → `check-identity minor` 转 ok → 重跑腿判过。四步缺前三步，本车道权限内不可达。

## 顺带核实（不越界不改）
- PFI25 的 `.voice-preview__delete` 在 `pages/profile/index.wxml` 页面级 ⇒ 无组件边界问题，与 REAL-OT-06 不同型，其复核仍归 REAL-PFI25-05。
- `test-corpus-denominator.cjs` 7 失败为**改前既存**：该测试与本次 7 个改动文件零引用交集（grep 实证），失败集全在 round-7 帧删除集/`exec-a-mock-final`
  台账域（git status 显示该域多文件在本次会话前已被其它车道修改）。

## filesChanged
1. scripts/qa/exec-capabilities.mjs（armModal 源生成修复）
2. scripts/qa/test-exec-capabilities.cjs（回归钉 +1）
3. scripts/qa/case-recipes.json（OT05/OT06/OT09 选择器穿透化 + note 约定）
4. scripts/qa/r-exec-ws.mjs（deepCount/deepOne/deepSegs + 五动词接线 + 词表注释）
5. scripts/qa/r-exec.cjs（IDENT_DEFS.minor）
6. scripts/qa/cli-automator.mjs（mintPlanFor minor 分支 + 词表扩容）
7. scripts/qa/verify-real-coverage.mjs（axesOf/judgedLogin 认 minor）
8. scripts/qa/probe-identity-shape.cjs（新增，无泄漏身份形态探针，本车道取证用，留存复用）

---

# fix-lane round-2（R2-PFI25-04 + R2-02 + R2-RECAP-10，2026-10-10）

- 证据件：tour-round2.json / audit-round2.json / exec-fixlane-pfi25 / tour-ledger.json（fixlane 节）。

## R2-PFI25-04 / R2-02（high，PFI25 第 3 次 FAILED）——定谳完成 + 丢弃点已修（配方侧）；产品渲染链无丢弃不改

### 定谳（三证合拢，回答 ask 点名的「渲染时 store 态 vs 渲染态对照」前置）
1. **源码定谳（fetchProfile 覆盖嫌疑证伪）**：`apps/client/src/stores/profile.ts`
   - `load()` real 分支（:415-469）逐行读毕：赋值 basicProfile/campusProfile/scheduleProfile/profileStats/avatarUrl/photoGallery/隐私开关/vipStatus/myPosts，**不赋 voiceStatusUrl/voiceStatusDuration**（仅 mock 分支 :401-402 赋值）；
   - `fetchProfile()（:498-500）` 仅 `await this.load()`；
   - 页面渲染链 `pages/profile/index.vue:1156` `voiceStatusUrl = computed(() => profileStore.voiceStatusUrl)`，模板 :1679 `<template v-if="isOwnProfile">`（:269-273 无 userId 参数恒 true）→ :1692 `v-if="!voiceStatusUrl"` 录音 CTA / :1712 `v-else` voice-preview；页面内 `clearVoiceStatus` 只在 handleRemoveVoice（:1414，用户点确认）调用；
   - ⇒ 渲染链与刷新链**都不写语音态**，「store-patch 语音态被渲染链丢弃（fetchProfile 覆盖）」不成立。**产品侧不改（无缺陷可修）**。
2. **通道定谳（真正的丢弃点=测试编排）**：
   - `scripts/qa/cli-automator.mjs:167-171` openPage=ideCall(`simulator_open_page`, `--page …`)；
   - skill 工具册 `wechatide-skill/references/tool-index.md`：`simulator_open_page | compiler | **触发项目窗口模拟器编译**并打开指定页面` ⇒ open=重编译；
   - tour-ledger.json CON-EV-01 实测在册：「桥开页重启 AppService（包装器/缓冲全灭实测 i=0|n=-1）」——同一桥开原语的直接测量；
   - ⇒ 重编译重启 AppService ⇒ pinia 全内存态归零 ⇒ **配方原顺序 seed(step#1)→open(step#2) 中，seed 打在旧运行时上、open 一执行即灭**。三次确定性 FAILED（b1/b1b/fixlane）由此而来。
3. **顺手实证的配方噪声**：`.profile-complete-card` 在 src 全树与 real 编译产物均不存在（`grep -rn` 0 命中、wxml grep 0）⇒ probe 三连里的第三项是死选择器，absent 无证据力，已从配方摘除。

### 修复（case-recipes.json PAGES-PROFILE-INDEX|PFI25 重排 + scripts/qa/r-exec-ws.mjs 新具名读数）
- **seed 移到首次 open 之后**：新序 open → wait 2200 → fixture setup(seed-voice) → wait 800 → **read(profile-voice-state) + probe([.video-cta,.voice-preview,.voice-preview__delete]) 渲染-存储同刻对照**（定谳数据落行）→ assertPresent → …原二次确认两支不变 → 重开段保留但读数标签如实注明「重开=重编译清态，对『真删』无判别力」——**真删判据由同页 confirm 后 assertAbsent 承担**；删除钮渲染→二次确认→真删全链判过交实带重跑腿。
- `READ_PROGRAMS` 新增 `profile-voice-state`（r-exec-ws.mjs）：渲染时读 pinia profile store 的 voiceUrlLen/voiceUrlHead(前 40 字)/voiceDuration/hasBasicProfile+栈顶路由，供 store 态 vs 渲染态对照；语音 URL 不整串回显。
- 「保序/合并策略」落点即此：保的是**夹具补丁对活应用写人的序**（seed 后于一切重编译 open），不是改 fetchProfile——后者源码已证无丢弃。

### 离线校验（本车道实跑）
- `node scripts/qa/test-cap-recipes.cjs` ⇒ PASS（29）；`node scripts/qa/test-exec-capabilities.cjs` ⇒ PASS（65）；`node --check r-exec-ws.mjs` ⇒ OK；配方 steps 摘净死选择器（仅 adjudication 文本保留其名）；ask 点名复查 `grep -c voice-preview__delete apps/client/dist/build/mp-weixin-real/pages/profile/index.wxml` ⇒ **1**（与 ask 一致）。

## R2-RECAP-10（low，recap2 landing 数据质量）——已修（生成器+ledger 两处）
- 实读 `tmp/qa/console-recap2-summary.json`：73 行数组，行形 `{route,landing,install,refire,…}`，抽查 row0 `route=landing=pages/login/index` ——与 ask「landing=请求路由回显」一致。
- **生成器实锤到行**：`tmp/qa/console-recollect2.mjs:63`（修复前）`rec.landing = route + (openOk ? "" : "(open!?)")` ——landing 即请求路由回显，从不读实测落点。〔初判「生成脚本不存在于仓内」是错的：首查只扫了 scripts/qa/*.mjs|cjs；广搜 scripts/ tools/ apps/ tmp/qa 后在 tmp/qa 命中 `console-recollect2.mjs`，已据实修正本节与 ledger 注记。〕
- 修复（两案并取）：
  - 生成器 `tmp/qa/console-recollect2.mjs`：新增 `LANDING` 读数程序（`getCurrentPages()` 实测路由栈，与 cli-automator routeStack 同法），`landing=实测栈` + 新字段 `landingEcho=请求路由`（对账用），头注注明语义与盘上旧件口径；`node --check` ⇒ OK；
  - tour-ledger.json CON-EV-01 `run` 字段：路径补全为 `tmp/qa/console-recap2-summary.json` + 注明**盘上现件**（2026-10-10 06:25 版）landing 列仍是回显、下游不得当落点证据、生成器已修复（重采后警告对新件失效）；`node -e "JSON.parse(…tour-ledger.json)"` ⇒ OK。
- 盘上旧 summary 本身不改写（它是「回显口径」时代的真实产物，改它等于伪造当时的读数形状）；语义由 ledger 注记 + 生成器修复共同兜住。

## 台账修正备注（非本 ask 三项，但涉及本车道上轮交付）
- tour-ledger.json `F01/F02/REAL-OT-06(OT05/06/09)` 行称「other.vue/other.wxml 均无 relationship-cta*＝结构性错配实锤」——与本车道 round-1 实读矛盾：组件存在且渲染（mp-weixin-real PublicProfile.json/wxml 注册并条件渲染 `relationship-c-t-a`，链 profile-shell→public-profile→relationship-c-t-a；exec-realcov-b4 OT05 帧 21137B 四钮可见），错配在组件边界而非组件缺失。穿透链配方已就绪，该行「非执行可解」结论应按 round-1 证据重估。

## round-2 filesChanged
1. scripts/qa/case-recipes.json（PFI25 配方重排：seed 后置+定谳对照+死选择器摘除+adjudication 字段）
2. scripts/qa/r-exec-ws.mjs（READ_PROGRAMS 增 profile-voice-state）
3. tmp/qa/console-recollect2.mjs（R2-RECAP-10：landing 改实测路由栈+landingEcho+头注）
4. reports/audit/ui-audit-2026-10-09/tour-ledger.json（CON-EV-01 run 字段路径补全+landing 语义注明；ask 点名授权的 ledger 编辑）
