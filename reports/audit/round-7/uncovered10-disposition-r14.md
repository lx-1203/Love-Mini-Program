# 10 条 real-coverage 欠账 · 逐条按可采性分流（r14 车道）

车道性质：只读测量 + 记账计划。**不跑设备、不取租约、不动判据、不标免检、不提交。**
HEAD 起点：`70472d92`（实测 HEAD 已到 `491210dd`，见 §0）。

- 门：`scripts/qa/verify-real-coverage.mjs`（本车道唯一读它的判点来源，一字未改）
- 门跑的档位：默认参数 `OPS=reports/audit/round-6/ops`、`DIR=reports/audit/round-7`（`:77-78`）
- 完整现场读数：`.zcode/tmp/lane-ten-row/gate-live-r14.txt`（`REALCOV_RESULT=FAIL`，exit=1）
- 逐行原始字段：`.zcode/tmp/lane-ten-row/rows-dump.txt`
- 逐行 real 档腿与跳过原因：`.zcode/tmp/lane-ten-row/dump-reasons.mjs` 的现场输出

> **绑住本车道的那条规则：一条红不因改判而闭合。**
> 下面所有 `NOT_SHOOTABLE` / `NEEDS_*` 都是**留在账上的欠**，不是销账。本车道一条都不减阈值、
> 一条都不标 `automatable:false`（那是 `REALCOV_AUTOMATABLE_EXEMPT` 的入口，标了就是把欠账搬进免检桶，
> 正是仓里记录过的"覆盖率纸面变好"事故）。

## 0. 先复核主控给的数（不复核就写等于抄）

现场跑：`D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-real-coverage.mjs` → **exit=1**

| 主控给的 | 本车道实测 | 判定 |
|---|---|---|
| 10 条欠账 / 236 条判据 | `REALCOV_CASES=236 … REALCOV_UNCOVERED=10／236 … REALCOV_COVERED=198 … 免检=28`，守恒 `28+198+10=236 OK` | **成立**（逐条点名 `REALCOV_UNCOVERED_LIST=10`，台账 `LEDGER=OK`） |
| 门里 `grep -c "guest-landing"` = 0 | 实测 **0** | **成立**：门根本不读 `guest-landing-{booked,measured}.json`，只读 exec 行上的 `band/identity/status` |
| 10 条都已有 real 档行、且全是 SKIPPED | `REALCOV_NEVER_ON_REAL=0` + `REAL_BAND_BUT_ALL_SKIPPED=10`；逐条数到 real 档行数 PFI25=11 / VI25=10 / VI34=10 / TD03=12 / OT05=13 / OT06=15 / OT09=13 / VRN07=13 / OC09=16 / VB03=14，`judgedReal` **全 = 0** | **成立** ⇒ 这 10 条的欠**不是**"没跑过"，是"跑了、被判成没判"。换授权方向若只加"跑过"的行而状态仍是 SKIPPED，收账价值照旧是 0 |
| 轴分布 | `JUDGED_MISSING_A=10 JUDGED_MISSING_GUEST=2`，点名轴：8 条 `缺=login`，`次要20\|OT06` 与 `次要21\|OC09` `缺=login+guest` | **成立**（与 triage 的"两行既缺登录也缺游客"一致） |
| 上游 triage 的逐行 blocker 读数 | **三条不成立**，见各节：TD03「不需要任何设备能力」、OT09「只被 DENY_TAP 挡」、VB03「换档就能表达（隐含一步就完）」 | 本车道按行自己的字段 + 载具现行词表重derive，不采信摘要 |

主控给的 HEAD `70472d92` 与工作树实测 HEAD `491210dd` 差一个提交（`chore(qa,client): 本地落账 QA 会话新增改动`）。
**载具正在被我之外的车道改**：`scripts/qa/r-exec-cli.mjs`、`scripts/qa/r-exec-ws.mjs` 处于 modified-uncommitted，
`scripts/qa/deny-tap.cjs` + `scripts/qa/test-deny-tap-field-clear.cjs` + `reports/audit/round-7/deny-tap-f04-r13.md`
是新落未跟踪件，而 L13 自己那份报告**通篇还是 `<!-- TODO -->` 骨架** ⇒ F-04 尚未收口。
本车道引用的载具行号全部来自**当前工作树**，落地时若 L13 又改了一版，行号要重核（§5 记了这条时效风险）。

## 1. 门的"算覆盖"判点（逐字引用，每节的"什么要为真"都锚在这段上）

判点常量（`verify-real-coverage.mjs:132-135`）：

```js
/* 只有"判过"才算覆盖：EXECUTED / FAILED 是判过（哪怕判成红），SKIPPED 不是。
   把 SKIPPED 记成覆盖，正是本轮 236 条被吞掉的那条路径。 */
const JUDGED = /^(EXECUTED|FAILED|PASS)$/;
const REAL_BAND = /^real(@|$)/;
```

认领那一步（`:210-212` + `:220-228`，会话证据不符 ⇒ 撤认领）：

```js
    if (REAL_BAND.test(r.band)) {
      rec.real.add(r.identity);
      if (JUDGED.test(r.status)) {
        rec.judgedAny = true;
        const v = sessionVerdict(r);
        if (v === "contradict") { rec.contradicted.add(r.identity); … }
        else { … rec.realJudged.add(r.identity); }
      }
    }
```

欠不欠账（`:260-270`）：

```js
    const rec = byId.get(key);
    if (!rec || rec.real.size === 0) { missing.neverOnReal.push(key); continue; }
    const judgedLogin = rec.realJudged.has("A") || rec.realJudged.has("B");
    const judgedGuest = rec.realJudged.has("guest") || rec.realJudged.has("not-logged-in");
    let deficient = false;
    if (ax.login && !judgedLogin) { missing.noA.push(key); deficient = true; }
    if (ax.guest && !judgedGuest) { missing.noGuest.push(key); deficient = true; }
    if (rec.realJudged.size === 0 && !rec.judgedAny) missing.skippedOnly[key] = [...rec.real];
    if (!deficient) missing.covered.push(key);
```

出口（`:618` 与 `:626`，本车道一个字没动）：

```js
const ok = uncovered === 0 && conserved;
const pass = ok && ledgerOk;
```

**于是"一条欠账停止成为欠账"当且仅当**：在 `reports/audit/round-7/exec-*/exec-results.json` 的某一行里
1. `manifest|id` 命中该判据；
2. `band` 匹配 `/^real(@|$)/`（`real` 或 `real@sha8`；showcase 产物因 `VITE_API_MODE=real` 也盖成 `real@…`，见 §2.10）；
3. `status` ∈ `{EXECUTED, FAILED, PASS}` —— **FAILED 也算判过**，判成红不等于没量；
4. 该行 `identity` 落进该判据要求的轴：`c.identities` 含 A/B ⇒ 登录轴要一条 A 或 B；未标 `identities` ⇒ `axesOf`（`:178-182`）两轴都要，登录轴与游客轴**各**要一条判过的行；
5. 行上若带 `loginVerify`/`sessionSource`，`sessionVerdict`（`:151-169`）不许判成 `contradict`（游客票盖 A/B 标签会被撤认领）。

`automatable === false`（`:249-258`）是唯一能把一条判据挪出欠账桶的声明字段，它**只免"本门不追"、不进 `covered`**；
本车道对它一条都不写。

## 2. 逐条分流

### 2.1 PAGES-PROFILE-INDEX|PFI25

**去向：`NEEDS_CAPABILITY`** —— 缺「原生 Modal 选项驱动」这一条原语（观察半边已有，驱动半边没有）。

行的自述字段（`reports/audit/round-6/ops/PAGES-PROFILE-INDEX.json`，`round-7/ops` 同字段）：
`requiresReal:true`、`tier:critical`、`needsIdentity:"A"`、`identities:["A","B"]` ⇒ **只欠登录轴**（`axesOf` 给 `guest:false`），
与门的点名 `缺=login` 一致。`tapTarget:".voice-preview__delete"`，出处 `apps/client/src/pages/profile/index.vue:1747`（页面级，不在组件子树里）。
`pre:"接 PFI23 已有语音状态"`；`expected` ① 明确写「**在确认弹窗点取消** / 再次执行点确定」，并要「回读后端语音字段」。

现场腿（11 条 real 档行，judgedReal=0）：`real@f0677920|A|SKIPPED`
`交互腿下发全部失败 ⇒ …同帧探针也说这些类名不在（静息态不存在）⇒ 欠前置配方（先展开/先切态）… :: tap:.voice-preview__delete :: …"no such ele"`。
即 `.voice-preview__delete` 只在已有语音时才存在 ⇒ 前置是 PFI23 那一串录音动作；而**就算节点在，第 ① 步也点不到**：
`wx.showModal` 的取消/确定是原生弹层。载具自述（当前工作树 `r-exec-cli.mjs:383`）：
「原生弹层不在页面渲染树里，`automation_element_action` 只收 selector ⇒ 选择器进不去。`--native-capture` 能把『弹过哪个原生 API、标题是什么』采进 `row.toast`（观察半边），但『点哪个选项』的驱动半边仍是新代码」，
并在 `:270`/`:350` 用自检锁死「全旗标开着也仍拒发：swipe / nativeModal / networkFault」。
其余被 c21 列为缺的东西本车道实测**已不再缺**：下拉刷新有 `--gestures`（`pullDownSource()` 已在发 `uni.startPullDownRefresh`）、
逐请求计数有 `--net-count`（`:801-806` 走 `uni.addInterceptor('request')`）、连点有 `--rapid` ⇒ 不把 c21 的 G-2/G-6/G-9 当挡箭牌。

**什么要为真才停止欠账**：存在一条 `band` 匹配 `/^real(@|$)/`、`status` ∈ {EXECUTED,FAILED,PASS}、`identity` ∈ {A,B}
且 `sessionVerdict` 不矛盾的行。为此这条腿必须真能执行「在确认弹窗点取消 / 点确定」并再触发一次 onShow/冷启动 —— 也就是 `nativeModal` 驱动原语落地之后。

**闭合成本**：一条新的载具能力（原生 Modal 答复：`mockWxMethod('showModal')` 形态的 stub 只在 `r1-exec.cjs:1134` / `r-exec.cjs:1551` 为 chooseImage 做过，Modal 的 confirm/cancel 答复是 [NEW]），
外加一条逐例前置配方（先跑 PFI23 造出语音态）。设备分钟：能力到位后 1 条腿 ≈ 20 s（实测每行 19.6–22.8 s，见 §3），**能力没到位前花多少设备分钟都是 0 收账**。


### 2.2 SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI25

**去向：`NEEDS_CAPABILITY`** —— 缺「逐例前置配方通道」（要一条**先把 A 的待审核新帖发出去**的腿），并需换到能进组件子树的 WS 载具。

行的自述字段：`requiresReal:true`、`tier:critical`、`identities:["A","B"]`（`identitiesFrom:tag-ops-identity-scope.mjs`，理由=页在落点裁定表里 `subpackages/village/village/index → pages/login/index`）⇒ 只欠登录轴。
`pre:"REAL_ONLY：真实后端 + 身份A 先经底部输入条发一条新帖（进审核流）→ 返回本页今日广场。mock 轮 createPost 无 auditStatus … → 记 N/A"`。
`tapTarget:".post-card__audit"`，出处 `apps/client/src/components/village/PostCard.vue:265` —— **这是一个组件作用域名**，
而 `r-exec-ws.mjs:65-66` 实测记着：`SEL_COMPONENT_SCOPE` 那批（本轮 193 条）「元素躲在自定义组件里，CLI 腿按该门自己的实测有 **90.6% 点不动** ⇒ 只有 WS 腿能点」。

现场腿：10 条 real 档行、judgedReal=0，`real@f0677920|A|SKIPPED`
`…同帧探针也说这些类名不在（静息态不存在）⇒ 欠前置配方（先展开/先切态）… :: tap:.post-card__audit :: …"no such element"`。
showcase 档（`exec-real-coverage-a-showcase-r9`，`real@ed1cd82c`）同一句 ⇒ **换档不改变结论**：徽标只在"自己有待审核帖"时渲染。

**什么要为真才停止欠账**：一条 `real(@…)` 档、`identity` A 或 B、`status` ∈ {EXECUTED,FAILED,PASS} 的行，
且该行执行时列表里**确实有一条 A 自己的 pending 帖**（判点是 `.post-card__audit` 徽标 + 同 id 只出现 1 次 + 服务端回读条数）。

**闭合成本**：一条载具能力 —— 逐例前置配方（`r-exec-cli.mjs:1241` 已把这类需求点名：「这页要的是『逐条目 precondition.query』或后端夹具，不是 ROUTE_QUERY」），
加一条 WS 腿（组件子树）。设备分钟：配方到位后 1–2 条腿 ≈ 20–40 s/条（实测每行 19.6–22.8 s），另需一次真实发帖的后端状态（可回滚的 QA 帖）。

### 2.3 SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI34

**去向：`NEEDS_CAPABILITY`** —— 缺「网络条件注入」通道（慢速/失败/5xx），这是仓里明确登记为 `[NEW]` 的空白。

行的自述字段：`requiresReal:true`、`tier:normal`、`identities:["A","B"]` ⇒ 只欠登录轴。
`pre:"REAL_ONLY 优先（可注入慢速与失败）；mock 轮 Loading/Refreshing 可能一闪而过 → 如实记录不可采到的状态"`。
`action` 逐项点名七态里的 ④ 错误态、⑥ 发帖开关关闭时的 Disabled 形态。
⚠ 顺带一条真实数据缺陷（不是判据问题，如实记）：该字段在判据台里**字符串是断的**——
`"…⑦ Idle（停止滚动 "` 后面没有下文 ⇒ 这条判据的 ⑦ 态在盘上没有完整正文，任何腿都无法照它执行。
`tapTarget:".skeleton-line--w60"`，出处 `apps/client/src/components/common/Skeleton.vue:31`（同为组件作用域名）。

现场腿：10 条 real 档行、judgedReal=0，`real@f0677920|A|SKIPPED :: tap:.skeleton-line--w60 …"no such element"`
—— 骨架只在 Loading 窗口里存在，静息态必然量不到，这正是「一闪而过」那句 pre 的实测后果。
载具自述（当前工作树 `r-exec-cli.mjs:384-385`）：
`networkFault`（`/断网|网络中断|弱网|离线状态|故障注入|5xx|返回 ?500/i`）「本仓五条执行器里**没有任何网络条件注入通道**（审计 C21 (d)-c-2：`mockWxMethod` 只在 `r1-exec.cjs:1134`/`r-exec.cjs:1551` 用于 chooseImage）⇒ 属 `[NEW]`」。
另注：⑥ Disabled 态依赖发帖开关，而同页那条 `VI28` 已被判据台标 `automatable:false`（在 `REALCOV_AUTOMATABLE_EXEMPT` 里）⇒
**本条不能靠把 VI28 的免检搬过来抵债**：VI34 要的是一张"开关关闭时的形态"帧，那是注入能力不是声明豁免。

**什么要为真才停止欠账**：一条 `real(@…)`、A/B、`status` ∈ {EXECUTED,FAILED,PASS} 的行，且七态各自被真渲染出来过（Loading 抓得住、Error 造得出、Disabled 关得掉）。

**闭合成本**：一条 `networkFault`/慢速注入通道（新载具代码 + 一个能被拨的开关或代理），加 `action` 正文的截断修复（判据台字段，不属本车道授权）。设备分钟不可代替：注入通道不存在时，跑多少次都只得到同一句 `"no such element"`。


### 2.4 次要18|TD03

**去向：`DISPATCHABLE_NOW`，且是「*L13 落地之后*」这一条件式**——按主控指示记这个名字，但下面两条实测限制必须一起读，**不许在没有任何腿真跑过它之前把它改判成已过**。

行的自述字段：`requiresReal:true`、`tier:critical`、`identities:["A","B"]` ⇒ 只欠登录轴。
`tapTarget:".reply-input"`，出处 `apps/client/src/subpackages/circles/circles/topic-detail.vue:415` —— **页面级类名**（不在自定义组件里），
CLI 通道的 `automation_element_action` 进得去，这一条支持"不需要换载具"。
`pre:"身份A 进入话题详情（回复栏 :412-428）"`，无 `needsIdentity`、无 `automatable:false`。

现场腿：12 条 real 档行、judgedReal=0，**全部同一因**：
`real@f0677920|A|SKIPPED` `交互禁触（注销/解绑/清空这类不可逆动作会打掉后面几百条共用的会话）⇒ 显式记 DENY`；
r10 那条腿把它点名得更准：`VEHICLE_DENY :: 载具 DENY_TAP（r-exec-cli.mjs:60 词表）命中 action 文本 ⇒ 载具在取租约前就不发交互…**命中词=清空**`。
⇒ **triage 说的"只被 DENY_TAP 误拦"这一半成立**（TD03 确实是"清空 .reply-input"被当成账号级动作），
且它是 10 条里唯一一条**没有 `"no such element"`／组件子树／档位错**的欠账。
L13 正在做的收窄（工作树 `scripts/qa/deny-tap.cjs` 头）判的就是这个：「只有当这条判据的文本里就地指出了一个文本输入控件…并且『清空』的宾语就是那个控件本身（`清空 .reply-input`）…才放行」——TD03 的原文正是 `清空 .reply-input`。
**L13 目前未收口**：`deny-tap-f04-r13.md` 全文还是 TODO 骨架，两个执行器 modified-uncommitted ⇒ 本车道把它记成条件式而不是现在式。

⚠ **一条必须当面说的实测限制（这正是"授权收账 0 条"的形状，先量再批）**：
1. TD03 自己的 `action` 第 ⑥ 步写着「**断网**态 tap .reply-btn 发送」。载具现行词表里
   `networkFault`（`/断网|…|故障注入|5xx|返回 ?500/i`）**在任何模式下都拒发**（`r-exec-cli.mjs:350`、`:384-385`：本仓五条执行器里没有任何网络条件注入通道，属 `[NEW]`）。
   而拒发的落法是**整条判据记 SKIPPED 后 `continue`**（`:1560-1567`：`rows.push(row(…, "SKIPPED", refuse…)); continue;`），
   并且 `--gestures` / `--rapid` **隐含 `--strict-verbs`**（`:116`、`:132`）⇒
   **一条带 `--rapid`（TD03 第 ⑤ 步要 `rapidTap ×5`）的腿必然同时开着 strict-verbs，于是 DENY 修好之后 TD03 仍会被 `NOT_SHOOTABLE(verb=networkFault)` 扣成 SKIPPED。**
2. 第 ①③④ 步要点名的输入值（「QA-自检-正常回复」/ 3 个空格 / 501 字超长），而 CLI 输入腿的值是**写死的** `--value 123456`
   （`r-exec-cli.mjs:1612`；c21 的 G-15 仍未闭）。写死值既给不出"空"也给不出"3 空格"也给不出"501 字"⇒ 那三个判定点表达不出来。
3. `expected` 的两个判定点要「network POST 条数 + 各 Idempotency-Key 是否相同 + 服务端回读回复条数」：逐请求**计数**已接线（`--net-count`，`:801-806` 走 `uni.addInterceptor('request')`），但**键是否相同**这种逐条字段不在计数通道里 ⇒ 需要一次后端回读而不是只看条数。

⇒ 所以"还需要真跑什么"逐字回答：**L13 落地后，先跑一条只覆盖 ①⑤（正常提交 + rapidTap×5 客户端层）的腿**，
状态会是 `EXECUTED`/`FAILED`（=判过，门就认），但 ②③④⑥ 与 Idempotency-Key 判定点仍是这条行内的欠；
若那条腿开着 `--strict-verbs`（或 `--rapid`/`--gestures`），它 today 会直接被 `networkFault` 拒发 ⇒ **收账 0 条**，这一点必须验收车道实测，不能靠"改完词表就通了"这句话。

**什么要为真才停止欠账**：`reports/audit/round-7/exec-*/exec-results.json` 里出现一条 `band` 匹配 `/^real(@|$)/`、
`identity` ∈ {A,B}、`status` ∈ {EXECUTED,FAILED,PASS} 且 `sessionVerdict` 不矛盾的行；今天 12 条 real 档行全是 SKIPPED ⇒ 欠。

**闭合成本**：
- 只把 TD03 从"红"变成"判过"：**0 项新能力**（L13 的 DENY 收窄 + 一条不带 strict-verbs 拒发逻辑冲突的腿；腿本身 ≈ 20 s 设备时间，实测每行 19.6–22.8 s）。
- 把这条判据**判全**：两条 [NEW] 能力 —— 参数化输入值 + 值回读（G-15）、`networkFault` 注入通道；外加服务端 replies 回读一次。
- 本车道的诚实结论：**"L13 一落地 TD03 就绿"这个预期值 0**；落地后该记的是"1 条腿跑过、②③④⑥ 仍欠"，而不是"已判"。


### 2.5 次要20|OT05

**去向：`NEEDS_CAPABILITY`** —— 三条具名能力：逐例深链参数、组件子树元素动作（换 WS 载具）、`nativeModal` 驱动。

行的自述字段：`requiresReal:true`、`tier:critical`、`identities:["A","B"]` ⇒ 只欠登录轴。
`pre:"身份A mock 登录；目标用户须为「未喜欢过」的演示用户…"`、`expected③ "…（mock 轮 likesStore.likeUser 调用计数=1…）；服务端层（real 轮另见 OT07）"`、`expected② "若弹「匹配成功」modal：点「再看看」→ 再点一次喜欢 → 点「去聊天」"`。
`tapTarget:".relationship-cta__btn--like"`，出处 `apps/client/src/components/profile/public/RelationshipCTA.vue:43` —— 组件作用域名。
⚠ 本行自身有一处**判据与档位互相矛盾**（如实记，不据此免检）：`pre` 写着 "mock 登录"、`expected` 只主张 mock 轮计数，而 `requiresReal:true` ⇒ 门按 real 档追它。这是判据台的字段问题，不是门的问题；修法要么改判据（另一条授权）要么在 real 档重述判点。

现场腿：13 条 real 档行、judgedReal=0，`real@f0677920|A|SKIPPED`
`…同帧探针也说这些类名不在（静息态不存在）⇒ 欠前置配方… :: tap:.relationship-cta__btn--like :: …"no such element"`；showcase 档（`exec-real-coverage-a-showcase-r9`）同一句 ⇒ **换档不解决**。

载具侧对本页的**逐字裁定**（当前工作树 `r-exec-cli.mjs:1242-1251`，实测数据在里面，不是我推的）：
`subpackages/profile-extra/profile/other`（OT05/OT06/OT09）**故意不进 `ROUTE_QUERY`**，两重挡：
① 前置互相矛盾、页粒度一行装不下：「OT05 要『未喜欢过』的目标、OT06 要『已喜欢/互喜』的目标。以本人为 A=100158 实测 likes：user_id=100158 只有 target=10003(active) 与 target=100155(active)，而 target_user_id=100158 只有 10003 ⇒ **10003=互喜(OT06 态2)、100155=已喜欢未匹配(OT06 态1)、10001=未喜欢(OT05，实测 GET /api/v1/profile/10001 = 200 basic.name=远山/age=25/location=北京)**。三个不同 id 才凑得齐三条判据，写死任意一个都让另一条当场失真」；
② 同页 OT02/OT03 的落点就是"不带 userId ⇒ missingParam"，钉了值就把它们从错误态改成渲染资料卡。
加一句决定性的：「这两行的点名物件是**组件作用域名**…CLI 通道的元素级动作进不了组件子树 ⇒ 补 query 至多让它"可判"，闭不上，**归 WS 腿（r-exec-ws.mjs）**」
（与 `r-exec-ws.mjs:65-66` 互证：`SEL_COMPONENT_SCOPE` 那批 193 条，「CLI 腿按该门自己的实测有 **90.6% 点不动** ⇒ 只有 WS 腿能点」）。
`expected②` 的「匹配成功 modal」两点还额外撞 `nativeModal`：c21 的 G-12 就把 **OT05 逐字列在 "native showModal stub+drive"** 行里，载具自述 `:383` 说驱动半边「仍是新代码」。

**什么要为真才停止欠账**：一条 `real(@…)`、`identity` ∈ {A,B}、`status` ∈ {EXECUTED,FAILED,PASS}、会话证据不矛盾的行，
且该腿真落到 `?userId=10001` 的他人主页（不是 missingParam 空态）、点得到 `RelationshipCTA` 里的喜欢键、并能在匹配 modal 上点「再看看」/「去聊天」。

**闭合成本**：逐例 `precondition.query` 通道（载具代码，`r-exec-cli.mjs:1241` 已点名要它）＋ WS 腿跑一条组件子树内的 tap ＋ `nativeModal` 答复原语（[NEW]）。
设备分钟：能力到位后 1 条 WS 腿 ≈ 20 s；能力到位前换档/加旗标都收 0 条。

### 2.6 次要20|OT06

**去向：`NEEDS_CAPABILITY`，且两轴都要** —— 10 条里仅有的两条「既缺登录轴、又缺游客轴」的行之一。

行的自述字段：`requiresReal:true`、`tier:critical`、**没有 `identities` 字段**（keys 里只有 `id,page,title,tier,pre,action,expected,evidence,requiresReal,actionPreTapfix,tapTarget,tapTargetEvidence`）
⇒ `axesOf([])` 返回 `{login:true, guest:true}` ⇒ 门的点名 `缺=login+guest` 成立，**登录轴与游客轴各需一条判过的 real 档行**。
`pre:"预置两态分别执行：态1=已喜欢未匹配…态2=已互喜 matched…态2 的 real 构造需服务端互喜数据 → REAL_ONLY"`。
`tapTarget:".relationship-cta__btn--like"`（同上，组件作用域名）。

现场腿：**15 条 real 档行、judgedReal=0**，A 侧与 guest 侧各 5 条同一句
`…类名不在（静息态不存在）⇒ 欠前置配方… :: tap:.relationship-cta__btn--like :: …"no such element"` ⇒ **两轴都不是"没跑"，是跑了没判成**。
游客侧这一轴**是否该由游客判**，本车道按现有受控规则核对后答"没裁定"：`tag-ops-identity-scope.mjs` 的规矩 1 是"只标页在落点裁定表里的 case"，
而实测 `scripts/qa/guest-landing-policy.json` 全文**不含** `subpackages/profile-extra/profile/other`（同页的 OT05/OT09 因为自己带了 `identities:["A","B"]` 才免掉游客轴）⇒
**没有任何受控载体能摘掉 OT06 的游客轴**，也**不该由我把"游客点不了喜欢键"读成免检**（那是重分类）。
并且游客腿实测**确实落到了声明页**（原因串是"类名不在"而不是"本页没落在声明页（栈顶=…）"）⇒ 游客轴在载具上是可达的，这一轴的欠是真的。

**什么要为真才停止欠账**：**两条**判过的 real 档行——一条 `identity` ∈ {A,B}、一条 `identity` ∈ {guest, not-logged-in}
（`loginVerify` 需 `^not-logged-in` 或 `guestMint` 形状，否则 `sessionVerdict` 撤认领），且态1/态2 两个预置数据态各自被真构造出来过。

**闭合成本**：与 OT05 同源的两条能力（逐例 query、WS 组件子树 tap）＋ **一份互喜/已喜欢后端数据夹具**（`100155`=已喜欢未匹配、`10003`=互喜 已被实测点名为真实存在的两态，但仍要每态一条腿）＋ **设备分钟翻倍**：登录轴 1 条 + 游客轴 1 条 ≈ 40 s；若两态各跑两轴则是 4 条腿 ≈ 80 s。

### 2.7 次要20|OT09

**去向：`NEEDS_CAPABILITY`** —— triage 说"只被 DENY_TAP 挡"这一条**在本车道实测下不成立**，必须纠偏。

行的自述字段：`requiresReal:true`、`tier:critical`、`identities:["A","B"]` ⇒ 只欠登录轴。
`pre:"态2（已实名登录）下 tap 悄悄话键使 sheet 弹出…发送为写请求（clientApi.sendWhisper）→ real 轮需后端"`。
`tapTarget:".whisper-sheet__input"`，出处 `apps/client/src/components/discover/WhisperComposeSheet.vue:85` —— 组件作用域名。
`action` 点名 `maxlength=60` 四态：空 → 正常短句 → **80 字符** → 「`<img src=x onerror=1>『😀 空格』`」特殊字符；`expected` 还含「发送失败 → `showErrorToast(whisper.sendFailed)`」。

现场腿：13 条 real 档行、judgedReal=0。DENY 是真的第一道：`real@f0677920|A|SKIPPED` `交互禁触（注销/解绑/清空…）`，
r10 点名 `VEHICLE_DENY …命中词=清空`（命中「每路关闭后重新打开检查内容是否**清空**」）。
但 L13 之后它撞的是下一道，而且不止一道：
1. `r-exec-cli.mjs:1242-1251` 把 OT09 与 OT05/OT06 一起列为**故意不给 `ROUTE_QUERY`** 的行，并逐字判定「点名物件是组件作用域名…CLI 通道的元素级动作进不了组件子树 ⇒ 补 query 至多让它"可判"，闭不上，归 WS 腿」；
2. `action` 里"输入 80 字符 / 空 / 3 空格类特殊字符"要求**参数化输入值 + 值回读**，而载具写死 `--value 123456`（`:1612`；c21 G-15）⇒ 四态里三态表达不出来；
3. `expected` 的「发送失败」支路要求 `networkFault`，而它在任何模式下都拒发（`:350`、`:384-385`，[NEW]）。

⇒ 与 TD03 不同：TD03 的物件是页面级、可在 CLI 上点；OT09 的物件在组件里，**光改 DENY 一条都收不到**。

**什么要为真才停止欠账**：一条 `real(@…)`、`identity` ∈ {A,B}、`status` ∈ {EXECUTED,FAILED,PASS} 的行，
且该腿能进组件子树点到 `.whisper-sheet__input`、能把 80 字/空/特殊字符三种值真打进 textarea、并能造出一次发送失败。

**闭合成本**：三条能力（WS 组件子树腿、参数化输入值+回读、`networkFault`）＋ 一个「已实名登录」的前置态（`pre` 写的是态2 已实名，identity A 的实名状态需实测确认）。设备分钟：能力到位后 1 条腿 ≈ 20–40 s（本行 calls=2）。


### 2.8 次要20|VRN07

**去向：`NEEDS_IDENTITY_IMPOSSIBLE`（就"真实未成年身份"这一半成立），并挂一条必须先做的只读核实**——本车道不许把"大概跑不了"写成结论，也不许把这一条标成免检。

行的自述字段：`requiresReal:true`、`tier:critical`、`identities:["A","B"]` ⇒ 只欠登录轴。
`pre:"REAL_ONLY：真实后端 + 出生日期未满 18 岁（**或资料缺 birthDate**）的登录身份（loadAdultGate real-name.vue:329-339：birthDate 缺失按未成年从严 :334-335）；**无该身份时本用例记 UNVERIFIED**。对照态：已成年身份。需 token 有效；另构造「token 过期」子态观察 401 行为"`。
`tapTarget:".form-item__input"`，出处 `apps/client/src/subpackages/profile-extra/verification/real-name.vue:482`（页面级）。
被测代码实测：`real-name.vue:330` 第一句 `if (useMock()) return;` ⇒ **mock 档根本不跑这个闸门**；`:335` `isAdult.value = birthDate ? ageOf(birthDate) >= 18 : false;` ⇒ 缺 birthDate 与未满 18 是**同一条支路**。

为什么"真实未成年身份"造不出来（三处产品自己的代码，逐字核过）：
1. `apps/api/.../RealAuthServiceMinorRegistrationTest.java:78` `registerUser_minor_birthDate_rejectedWithMinorNotAllowed` ⇒ **注册端点拒绝未成年 birthDate**；
2. `apps/api/.../ProfileUpdateService.java:197-204`：`if (!AgePolicy.isAdult(request.birthDate())) { log.warn("未成年人资料更新被拒绝"…` ⇒ **存量账号也不能把生日改成未成年**；
3. `AgePolicyTest.java:26-27` `17 岁应视为未成年` ⇒ 判点本身有效，只是产品拒绝生产这种账号。
执行器侧也没有第三个身份可铸：`scripts/qa/r-exec.cjs:493-497` 的 `IDENT_DEFS` 只有 `A=100158 曦风` / `B=100159 小新生` / `guest=100151 阿辰`，
而 `database/round5-backfill-guest-age-gender.sql:28-33` 只给 `openid LIKE 'guest:%'` 的账号补了 `birth_date`（1998–2005 ⇒ 全部成年）⇒ 现有三个身份**没有一个被记录为未成年**。

⚠ 一条**不许跳过、也不许反向假设**的未决子问题：pre 自己承认「**或资料缺 birthDate**」也算这一态，
而 `database/flyway/sql/V2026.08.10.0011__add_users_birth_date.sql:15` 让 `birth_date DATE NULL` 且注释写「存量用户无出生日期」。
A/B 是手机号账号、不在那条 backfill 的 `WHERE` 里 ⇒ **A 或 B 是否已经 birth_date IS NULL，盘上没有任何一条测量记录**（本车道在 `reports/**` 里搜 `birthDate × 100158/100159` 的共现，只命中别的车道一个未收尾的 in-flight 文件，不构成读数）。
⇒ 若为 NULL，这一条**不需要新身份**就落得进未成年支路（但那时 `expected④` 的 401 子态与"对照态：已成年身份"仍要第二个账号）；
若非 NULL，这一条就是真·不可采。**这一格必须由一次只读 DB/API 读数（`GET /profile/basic` 的 `birthDate` 字段）判掉，不能由改判判掉。**

现场腿：13 条 real 档行、judgedReal=0，`real@f0677920|A|SKIPPED`
`…类名不在（静息态不存在）⇒ 欠前置配方… :: input:.form-item__input :: …"no such element"`；r10 记 `NOT_SHOOTABLE :: 交互腿下发全部失败`。
—— 注意这**不是**"未成年闸门没做"，而是这一腿从来没带未成年态：静息态（成年/未判定）下两输入框可用、`minor-banner` 不渲染，探针自然量不到那条支路里的东西。

**什么要为真才停止欠账**：一条 `real(@…)`、`identity` ∈ {A,B}、`status` ∈ {EXECUTED,FAILED,PASS} 的行，且该腿的会话**确实**落在 `isAdult=false` 的态上（minor-banner + 两框 disabled + 提交 `errMinorNotAllowed` 零请求），外加 `expected④` 的 401 子态（token 过期是可造的，这一半不缺身份）。

**闭合成本**：
- 一次只读核实（0 设备分钟）：A/B 的 `birth_date` 是否为 NULL —— 它决定后面走哪条路；
- 路 A（NULL）：1 条 real 档腿 ≈ 20 s + 「对照态已成年」第二个账号 + `expected④` 需要把 token 置过期（可造）；
- 路 B（非 NULL）：**一个必须存在的身份** —— 需要一次带授权的 DB 夹具写入（把某个测试账号 birth_date 设成未成年或置 NULL），产品 API 两条路都拒绝，所以它**不是设备分钟能买到的**，是一次后端数据授权；
- 两种情况下 `VRN07` 都不进免检：`automatable:false` 是给"本通道做不了"的章，而这一条卡的是**数据存在性**，把章盖上就是把欠账搬进另一个桶。

### 2.9 次要21|OC09

**去向：`NEEDS_CAPABILITY`，且两轴都要** —— 两条「缺 login+guest」之一；缺的能力是网络条件注入。

行的自述字段：`requiresReal:true`、`tier:critical`、**没有 `identities` 字段** ⇒ `axesOf([])` 两轴都要 ⇒ 与门的 `缺=login+guest` 一致。
`pre:"REAL_ONLY：真实后端在跑，用 Network 拦截使 GET /official-accounts/{code}/messages 返回 5xx 或断网（mock 分支 useMock() 恒走本地 :221-266 永不失败 → **不可构造时记 UNVERIFIED，禁止用 mock 冒充错误态**）"`。
`tapTarget:".retry-btn"`（`tapTargetFrom:cellplan-round7-taptarget.json`，两档产物逐字命中）。

现场腿：**16 条 real 档行、judgedReal=0**，跳过原因随载具演进换了三道闸，但从未判过：
`real@f0677920|A|SKIPPED` `action 含交互动词但没点名可交互元素`（早期腿，`.retry-btn` 还没落进判据）→
`real@f0677920|A|SKIPPED` 与 `|guest|SKIPPED` 各若干条 `…类名不在（静息态不存在）… :: tap:.retry-btn :: …"no such element"` →
`exec-interact-real-sc-r10`：`NOT_SHOOTABLE :: 交互腿下发全部失败`。
关键因果：`.retry-btn` 只在**错误分支**里渲染（`expected` 逐字：「messages 清空 → `.state-view` 错误分支可见（:404-407）」），
而造出错误分支需要 5xx/断网 ⇒ 载具自述（`r-exec-cli.mjs:384-385`）「`networkFault`…本仓五条执行器里**没有任何网络条件注入通道**…属 `[NEW]`」，并在 `:270`/`:350` 自检里锁死「全旗标开着也仍拒发：swipe / nativeModal / networkFault」。
游客轴这一条**没有被摘掉的受控路径**：`scripts/qa/guest-landing-policy.json` 全文**不含** `subpackages/chat/official-chat/index`，
而 `tag-ops-identity-scope.mjs` 规矩 1 只允许标"页在落点裁定表里"的 case ⇒ 想摘游客轴得先由落点车道给出裁定，不是本车道改字段。

⚠ pre 自己写着「不可构造时记 **UNVERIFIED**」——这句话**不闭合这条欠账**：`UNVERIFIED` 不在门的 `JUDGED = /^(EXECUTED|FAILED|PASS)$/` 词表里，
记成 UNVERIFIED 的行照旧进 `noA`/`noGuest`。这正是"红不因改判而闭合"在这一行上的具体形状。

**什么要为真才停止欠账**：**两条**判过的 real 档行（`identity` ∈ {A,B} 一条 + `identity` ∈ {guest, not-logged-in} 一条），
各自都真造出了 5xx/断网错误态、`.retry-btn` 在页面上存在、tap 重试新增 1 条 GET、以及发送失败回滚后 `inputValue` 恢复原文本。

**闭合成本**：一条 `networkFault` 注入通道（[NEW] 载具代码；逐请求**计数**已由 `--net-count` 接好，缺的是"让请求失败"而不是"数请求"）＋ 落点车道给 `official-chat` 的游客裁定（如果要摘游客轴）＋ 2 条腿 ≈ 40 s。**没有通道 = 0 收账**，加旗标、换档、改 UNVERIFIED 都收不到。

### 2.10 次要22|VB03

**去向：`NEEDS_BAND_CHANGE`** —— 换到 **showcase 档**（它在门上就是 `real@…`）；triage 这一条**实测成立**，但换档之后仍欠一次"判据点名物件"。

行的自述字段：`requiresReal:true`、`tier:critical`、`identities:["A","B"]` ⇒ 只欠登录轴；**没有 `tapTarget` 字段**。
`pre:"**展示版** + 身份A 登录（栈：我的 → VIP → 账单）。时序：先在 VIP 页走完一次 **mock 开通**（vip/index.vue:177+ 支路…），再进账单页"`。

现场腿（14 条 real 档行、judgedReal=0）把"档位"这件事分得很干净：
- **普通 real 档**（`real@f0677920`，`exec-A-real-r7final` / `exec-A-real-stage7` / `exec-real-coverage-a-r9`）：
  `action 含交互动词但本页没落在声明页（**栈顶=pages/profile/index**）⇒ 交互没发出，点了就是替别人的页做事` —— 落点不对，正是 pre 说"展示版"的那句的后果；
- **showcase 档**（`real@ed1cd82c`，`exec-A-showcase-r8e` / `exec-real-coverage-a-showcase-r9`）：
  **不再抱怨落点**，改记 `action 含交互动词但没点名可交互元素 ⇒ …待把判据收紧`；`exec-interact-real-sc-r10` 记 `NOT_SHOOTABLE :: 判据没点名可交互元素（tapTarget 空且 action 抠不出类名）⇒ 点击无法归属`；
- guest 腿记 `本条判据的身份适用范围已标为 A/B ⇒ 不由这一腿认领`（正确收窄，不是欠）。

为什么换档在门上**算数**（这不是把 mock 洗成 real）：判点是 `REAL_BAND = /^real(@|$)/`（`:135`），只看 mode 前缀；
盘上实测 `config/env.js` 是 `VITE_API_MODE="real"` + `VITE_SHOWCASE_MODE="true"` ⇒ showcase 腿盖出的就是 `band=real@ed1cd82c`
（原文与逐字读数在 `reports/audit/round-7/interact-leg-result-v33.json:46`：「showcase 在真实模式覆盖这条门上就是 real 档（`verify-real-coverage.mjs:123` 的 REAL_BAND=`/^real(@|$)/` 只看 mode，不看旗标）」）。
门自己也在 `:611` 警告的反面是"别把 mock 行改成 real 来补数"——本条**不是改标签**，是这条判据本来就要求展示版产物，且盘上早已存在 showcase 的 `real@…` 行。

换档之后仍欠什么（如实挂账，不许当成已闭）：VB03 的 (a)(b)(c) 三步是**进入/返回/下拉刷新**，
`action` 里没有任何类名 ⇒ `tapNoTarget` 那道闸（`r-exec-cli.mjs:1571-1576`「目标优先取判据里显式写下的 `tapTarget`…只靠 action 文本就会把这些用例重新变成"没点名"」）仍然扣着它。
判点要的两列（客户端多余请求数=0 / 服务端回读条数差值）里：逐时刻**计数**已有 `--net-count`（`:801-806`）、**下拉**已有 `--gestures` 的 `pullDownSource()` ⇒ 缺的只是"点名物件/把判据重述成 nav+pullDown 可归属的形状"这一条判据收紧。

**什么要为真才停止欠账**：一条 `band` 匹配 `/^real(@|$)/`（showcase 腿即是）、`identity` ∈ {A,B}、`status` ∈ {EXECUTED,FAILED,PASS}、
且不再被 `没点名可交互元素` 或 `落点不符` 扣下的行；也就是**在展示版产物上跑一条带 `--gestures --net-count` 的腿，并先给这条判据一个可归属的物件**。

**闭合成本**：本条是 10 条里最便宜的——**不需要任何新载具能力**。需要的是：
1 次档位选择（showcase，已有产物）＋ 1 次判据点名（ops 正文 `tapTarget` 或把 action 重述；走 §4 那条受控 ops 写者，且要对着两档产物 wxml 逐字命中）＋ 1 条腿 ≈ 20 s（实测每行 19.6–22.8 s）。
另需 pre 说的"先在 VIP 页走完一次 mock 开通"这一次前置动作落在同一会话里（展示版支路本来就为它存在）。


## 3. 汇总表（去向 + 闭合成本）

设备分钟单价先给出处，免得成本列变成拍脑袋：实测每条判据在一真实档腿里占 **19.6–22.8 s 墙钟**
（`exec-real-coverage-a-r9` 23 行/7.5 min、`exec-real-coverage-guest-r9` 4 行/1.5 min、`exec-real-coverage-a-showcase-r9` 16 行/5.5 min），
`case-cost-census.json` 给这 10 行的形状全是 `batchable:false`、`calls=1–2`，单价 `pageOpen 3.2s / tap 1.0s / screenshot 2.6s / assertion 0.21s`。

| # | 行 | 门的轴 | 去向 | 挡路的东西（具名） | 闭合成本 |
|---|---|---|---|---|---|
| 1 | `PAGES-PROFILE-INDEX\|PFI25` | login | `NEEDS_CAPABILITY` | `nativeModal` 驱动原语（:383 观察有、驱动是 [NEW]）＋ 逐例前置（先跑 PFI23 造语音态） | 1 项新载具能力；到位后 1 腿 ≈ 20 s |
| 2 | `SUBPACKAGES-VILLAGE-VILLAGE-INDEX\|VI25` | login | `NEEDS_CAPABILITY` | 逐例前置配方通道（:1241 已点名「要的是逐条目 precondition.query/夹具，不是 ROUTE_QUERY」）＋ WS 组件子树（PostCard.vue:265） | 1 项能力 + 载具换 WS；到位后 1–2 腿 ≈ 20–40 s + 一条可回滚的待审核帖 |
| 3 | `SUBPACKAGES-VILLAGE-VILLAGE-INDEX\|VI34` | login | `NEEDS_CAPABILITY` | `networkFault`/慢速注入（:384-385，[NEW]）＋ 七态逐例配方；另 `action` 正文在判据台上是**截断的** | 1 项能力（+1 次判据台正文修复，另一条授权）；设备分钟不可替代 |
| 4 | `次要18\|TD03` | login | `DISPATCHABLE_NOW`（*L13 落地后*） | 现挡的是 `DENY_TAP` 误拦「清空 .reply-input」；**但**其 ⑥ 步的「断网」在 strict-verbs 下会把整条扣成 SKIPPED，①③④ 步的输入值被写死 `123456` | 到终态最小：0 项新能力 + 1 腿 ≈ 20 s；判全：+2 项能力（参数化输入值+回读、`networkFault`）+ 一次 replies 回读。**未跑过之前不许改判成已过** |
| 5 | `次要20\|OT05` | login | `NEEDS_CAPABILITY` | 逐例 `?userId=`（:1242-1251 实测三个目标 id 才凑得齐 OT05/OT06）＋ WS 组件子树（CLI 90.6% 点不动）＋ `nativeModal`；本行 `pre` 自写"mock 登录"与 `requiresReal` 互相矛盾 | 3 项（其中 2 项与 OT06/OT09 同源可共用）；到位后 1 腿 ≈ 20 s |
| 6 | `次要20\|OT06` | **login+guest** | `NEEDS_CAPABILITY` | 同上两轴 + **两态数据**（100155=已喜欢未匹配 / 10003=互喜，实测存在但需各自成态）；页不在 `guest-landing-policy.json` ⇒ 无受控载体可摘游客轴 | 2 条腿（登录+游客）≈ 40 s；两态各跑两轴则 4 腿 ≈ 80 s + 同源能力 |
| 7 | `次要20\|OT09` | login | `NEEDS_CAPABILITY` | **纠 triage**：DENY 只是第一道；`.whisper-sheet__input` 在组件里（CLI 进不去）＋ 参数化输入值（80 字/空/特殊字符 vs 写死 123456）＋ `networkFault`（发送失败支路） | 3 项能力 + 一个已实名前置；到位后 1 腿 ≈ 20–40 s。光修 DENY 收 0 条 |
| 8 | `次要20\|VRN07` | login | `NEEDS_IDENTITY_IMPOSSIBLE` | 未成年账号产品自己拒绝生产（注册测试 :78、`ProfileUpdateService:197-204`）；`IDENT_DEFS` 只有 A/B/guest 且 guest 已被 backfill 成年；`useMock()` 早退 ⇒ mock 档根本不跑这闸门 | **一次只读核实**（A/B 的 `birth_date` 是否 NULL，0 分钟）决定后续：路 A = 1 腿 + 第二个成年对照账号；路 B = 一次带授权的 DB 夹具写入。买不到 = 不是设备分钟问题 |
| 9 | `次要21\|OC09` | **login+guest** | `NEEDS_CAPABILITY` | `networkFault`（:384-385 [NEW]；`.retry-btn` 只在错误分支渲染）；页不在 `guest-landing-policy.json` ⇒ 游客轴无受控摘除路径；pre 的「记 UNVERIFIED」不在 `JUDGED` 词表 ⇒ 不闭账 | 1 项能力 + 落点裁定（若要摘游客轴）+ 2 条腿 ≈ 40 s |
| 10 | `次要22\|VB03` | login | `NEEDS_BAND_CHANGE` | 现档（普通 real）落点错：`栈顶=pages/profile/index`；**showcase 档可表达**且门上就是 `band=real@ed1cd82c`（`REAL_BAND` 只看 mode）。换档后仍欠一次「点名可交互元素」 | 最便宜：**0 项新能力**；1 次档位选择 + 1 次判据点名（走受控 ops 写者）+ 1 腿 ≈ 20 s |

**去向计数**：`DISPATCHABLE_NOW` 1（TD03，条件式）、`NEEDS_BAND_CHANGE` 1（VB03）、`NEEDS_CAPABILITY` 7、`NEEDS_IDENTITY_IMPOSSIBLE` 1、`NOT_SHOOTABLE` 0。
**免检改动 0 条**（`REALCOV_AUTOMATABLE_EXEMPT` 仍是 28）、**判据字段 0 处修改**、**门阈值 0 字符改动** ⇒ 本车道跑门仍是 `REALCOV_RESULT=FAIL / UNCOVERED=10`。

> **与盘上既有裁定的一处偏离，主动报给主控**：`reports/audit/round-7/decisions-v33.md:468` 把「其余 7 条」预分派成
> `NOT_SHOOTABLE`。本车道逐条实测后给的是 `NEEDS_CAPABILITY`，理由是 `NOT_SHOOTABLE` 的词义是"任何载具/档位都评不了这条判据"，
> 而这 7 条里每一条的挡路物都被载具自己**点名为一句可补的原语**（`r-exec-cli.mjs:464-466`：「要它被自动判，得补对应原语…或换载具/人工判」），
> 其中 `networkFault` 更被明写为 `[NEW]`（=还没做，不是做不到）。把它们记成"不可采"会把可估价的能力欠账说成不可回收的死账——
> 那同样是把红读小。两种记法都不减 `UNCOVERED=10`，但成本列只在 `NEEDS_CAPABILITY` 下才算得出来。

## 4. 受控写路径（sanctioned path）的查找结论

**结论：仓里没有一个受控载体能给"real-coverage 欠账行"记逐条去向。本车道因此不发明一个、不手改任何账本，
只出这份报告 + 一份机器可读件（放在 `.zcode/tmp/lane-ten-row/`，因为它 today 没有消费者）。**

逐个读过文件头/消费方后的排除理由：

| 候选 | 它的文档说自己干什么 | 为什么不是本任务的载体 |
|---|---|---|
| `scripts/qa/verify-real-coverage.mjs` | 只读 ops 的 `requiresReal`/`identities`/`automatable` + `exec-*/exec-results.json` 的 `band/identity/status` | 它**没有"去向"这个入参**，只有三个桶：免检 / 覆盖 / 欠账。任何去向写进去都不会被读到 |
| `scripts/qa/emit-openrow-register.mjs` → `reports/audit/round-7/open-row-dispositions.json` | 「登记去向，不改台账状态列（**去向≠结案**）」，消费方 `verify-frame-debt-coverage.mjs` 的合法去向 C | **最接近**，但键空间与管辖区都不对：表内 81 条全是 issue-matrix 的 `MP-…` 号，`kind` 词表是 {`not_frame_observable_declared`,`judged_elsewhere`,`criteria_needs_tightening`,`carrier_missing`}，`--classify` 只收 {`NOT_FRAME_JUDGEABLE`,`MISLABELLED_ALREADY_JUDGED_ELSEWHERE`}，而它的门是**帧债**那条轴。本 10 行的键是 `MANIFEST\|CASEID`。硬塞 = 给别人的账本喂外族键 |
| `scripts/qa/apply-ops-cellplans.mjs` | 把手写 cellplan 落进 `reports/audit/round-6/ops/*.json` 正文（`tapTarget`/`automatable:false`/`identities` 这类**判据字段**） | 它是**判据编辑器**不是去向登记处；且它硬要求每个新类名在**两档产物 wxml 里逐字命中**（`--bands` 默认 `apps/client/dist/build/mp-weixin[,…-real]`）⇒ 跑它就得进那个正在重建的窗口读 dist（本任务硬禁，且这堵墙此前实测过：同一命令 0 vs 2） |
| `scripts/qa/patch-ledger-cells.mjs` + `merge-cellplans.mjs` | 按 `{"patches":[{id,col,new,why}]}` 改 `reports/audit/round-6/issue-matrix.md` 的 11 列表格格 | 台账是**问题行**（MP-*），这 10 条是判据台的用例；改列等于把它们塞进另一本没有它们的账 |
| `scripts/qa/land-verdicts-into-ledger.mjs` | 把 `verify-fixes-against-artifact` 的桶推到台账 status 列 | 词表是 {产物已见/仅源码/需排UI帧/…}，与本题五个去向不同族；管的是 `待修复`/`已修复待复验` |
| `scripts/qa/admit-ledger-row.mjs` | 往台账**立一行新号**（11 列、MP 号、status 必须在 `normalize-ledger-status.mjs` 的 VOCAB 里） | 立账 ≠ 分流；本 10 行不是新缺陷，是覆盖欠账 |

⇒ **落账需要哪一条，主控二选一**（都在"要么点名既有工具、要么拿到授权新加"这一条护栏内）：
- (a) **扩 `emit-openrow-register.mjs` + 它的登记表**：给 `dispositions[]` 接受 `MANIFEST|CASEID` 键与本题五个 kind（`dispatchable_now` / `needs_band_change` / `needs_capability` / `needs_identity_impossible` / `not_shootable`），并让 `verify-real-coverage.mjs`（或一把新的只读门）**读它**；否则写进去就是写进没人看的文件——这正是仓里被批评过 4 次的"建了工具没接线"。
- (b) 用户点头新加一个具名载体（例如 `record-realcov-disposition.mjs` + 一张被某把门消费的表），条件同 (a)：**必须有读取方**，并且必须像 `apply-ops-cellplans.mjs` 那样带守恒检查（用例总数前后一数，不守恒 exit 1），防止"记去向"顺手变成"销账"。

机器可读件（按上面结论，不进 `scripts/qa/`，因为无消费者）：
`.zcode/tmp/lane-ten-row/uncovered10-destinations-r14.json` —— 逐行 `key / axis / destination / blocker(具名) / mustBeTrueToStopBeingDebt / cost`，
字段值就是本报告的逐行结论，出处都给了 `file:line`。

## 5. 撞车与边界声明

- **没写 `reports/audit/round-7/ops/`**（主控说它此刻归别的车道）。本车道唯一写进 `reports/audit/round-7/` 的文件是
  `uncovered10-disposition-r14.md`（新建，跑前实测不存在）。顺带一条与撞车有关的事实供主控核对：
  **门默认根本不读 `round-7/ops`**，它的默认 `--ops` 是 `reports/audit/round-6/ops`（`:77`）⇒ 若某车道只改 `round-7/ops`，门读数字不会动。
  本车道对两处的这 10 行都做了字段级比对，`requiresReal`/`identities`/`automatable`/`pre`/`action`/`expected`/`tapTarget` **逐字相同**，
  所以下面的分流不依赖"读的是哪一份 ops"。
- **没跑过任何设备/UI/租约**；没跑 `r-exec-cli.mjs` / `r-exec-ws.mjs` 任何腿。
- **没读 `apps/client/dist/build/**`**（验收车道正在重建三档）。本车道的档位证据一律取自盘上既有 exec 台账
  （`real@f0677920` = 普通 real，`real@ed1cd82c` = showcase）与 `interact-leg-result-v33.json:46` 的逐字读数。
  ⚠ 一条如实自报的越界风险：本车道早期一条 `grep -rln birthDate apps database …`（只想列文件名）超时转入后台后**遍历进了 dist 目录树**，
  它回给了 6 条 `apps/client/dist/build/…` 的**路径名**。没有任何一个 dist 文件的**内容**被读过、没有任何一个数从 dist 取出来，
  所以本报告的结论不依赖重建窗口里的读数；但"遍历过那棵树"这件事本身偏离了硬边界，记在这里供主控裁处。
- `r-exec-cli.mjs` / `r-exec-ws.mjs` 只**读**过、一字未改（`git status` 里它们的 `M` 是 L13 的，不是本车道的）。
  同样只读未改：`verify-case-automatable.mjs`、`emit-round-report.mjs`、`verify-guest-landing.mjs`、
  `profile-svg-to-png.mjs`、`prepare-static.mjs`、`.zcode/workflows/**`。
- **没做任何全仓还原**：本车道跑过的命令里没有 `git checkout -- .` / `git restore .` / `reset --hard` / `clean`；
  实测 `git status` 里那 **3848** 条用户自选的盘上截图删除仍原样留着（`grep -c "^ D"` = 3848）。
- **载具读数有时效**：§2 里所有 `r-exec-cli.mjs:行号` 引自**当前工作树**，而 L13 正在改它（`deny-tap.cjs` 刚抽成唯一词表源、
  它的 `deny-tap-f04-r13.md` 还全是 TODO）。派活动作前必须重跑一次 §0 的门 + 重核这些行号；
  若 L13 顺带把 `verbRefusal`/`nativeModal`/`networkFault` 的词表也动了，TD03/OT09/VI34/OC09 四节的成本列要跟着重算。
- **本车道在跟踪树里只新增一个文件**：`reports/audit/round-7/uncovered10-disposition-r14.md`（`git status` 里那条 `??`）。
  机器件与两份只读 dump 脚本放在被忽略的 `.zcode/tmp/lane-ten-row/` 下：
  `uncovered10-destinations-r14.json`、`gate-live-r14.txt`、`gate-after-r14.txt`、`rows-dump.txt`、`dump-rows.mjs`、`dump-reasons.mjs`。
  ⚠ 归责澄清：`git status` 此刻另有 `.zcode/workflows/miniprogram-qa-finish-v33.dwf.ts` 的 `M` —— **不是本车道改的**
  （本车道对 `.zcode/workflows/**` 一字未碰，只往 `.zcode/tmp/` 写过），主控落账时请按车道归属。
- **复跑门确认本车道一条都没闭合**（这正是要求的形状）：改前与改后逐字同为
  `免检=28 + 覆盖=198 + 欠账=10 = 236／236`、`REALCOV_RESULT=FAIL`、`UNCOVERED_LEDGER=OK 点名=10`。
- **本车道刻意没做的事**：没给任何行盖 `automatable:false`（那是 `REALCOV_AUTOMATABLE_EXEMPT` 的唯一入口，仓里记录过
  "靠重分类把覆盖率做上去"的事故）；没给 OT06/OC09 补 `identities`（那等于白摘掉一整条游客轴）；
  没动 `:618` 的 `ok` 判点、没动词表、没把 VRN07 的 birthDate 未决子问题当"已核实"往下推；
  没把任何一条 `NEEDS_*` 写成 `NOT_SHOOTABLE` 来让成本列消失。



