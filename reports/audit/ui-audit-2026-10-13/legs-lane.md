# 设备腿（legs-lane）— 2026-10-13 · REALCOV 四条登录轴 + 游客落点成员等式

本轮职责（题面）：① 带 `--navto-open --handler-call --strict-verbs` 重跑 `次要20|OT05 / OT06 / OT09`、`次要21|OC09` 的**登录轴**（RelationshipCTA 三层自定义组件腿）；② 游客落点复测腿的成员等式对齐（`test-guest-landing.mjs` 现红）。
明确不做：`VRN07`（需 DB fixture，用户未授权）、OT06/OC09 的**游客轴**（只读注入动词豁免未定）、PFI25（配方正被隔壁车道修）。
纪律：租约 `tmp/qa/locks/ui-audit-v37.lock`；每行带 `band=mode@sha8` + `sessionSource`/`loginVerify`；解析不到目标记 `UNVERIFIED-INSTRUMENT`，不发产品 `FAILED`，不发零 dispatch 的 `EXECUTED`；不改 `scripts/qa/**`、不改历史 `exec-*`、不 git 写操作。

## 通道凭据（本轮复量，机器行原文）

```
LEASE_RESULT=ACQUIRED file=D:\6\恋爱小程序\tmp\qa\locks\ui-audit-v37.lock owner=legs-lane-v37
IDE_PORT_SOURCE=config D:/6/恋爱小程序/scripts/qa/ide-port.json → 9420
WS_UP=ALREADY_UP port=9420 connectMs=108 page=pages/profile/index hits=00000000 单条查询=9.0ms
WS_UP_BAND=match port=9420 本腿要的档位 project=…\mp-weixin-real VITE_API_MODE=real MODE=real envSha8=f0677920 / 端口上活着的实例自报 apiMode=real
WS_UP_BAND_证据 应用内 require(config/env.js)=OK|real|config/env.js 应用内异常=无
WS_UP_BAND_RESULT=match exit=0
```

凭据 = `WS_UP=ALREADY_UP port=9420` + `WS_UP_BAND_RESULT=match`（band=`real@f0677920`，读自该档自己的 config/env.js）。LISTENING 端口不是凭据，故复跑 bring-up 取这两行。`--wait 300` 带上了。登录轴身份在 WS 执行腿里当场铸+断言（boot 行）：

```
WSX_IDENT_PRODUCIBLE=A 铸票端点=phone-login
[boot] boot-ok(awaited) identity=A mint=phone-login 铸到userId=100158 verify=logged-in userId=100158
WSX_BAND_STAMP band=real@f0677920 读自=…/mp-weixin-real/config/env.js 声明档位=real 旗标--real=on
WSX_OPEN_FORM=on(base+navigateTo ⇒ 基底页=pages/discover/index)  WSX_HANDLER_CALL=on  WSX_NET_ARM=on
```

## 正向对照

`POSITIVE_CONTROL=PASS` 由 ui-channel-lane 本机已证（题面列为「已证不重做」）：`.login-sms-fallback`/`.btn-text` 选得到、tap 得动、`.input-field` `PRESENT(2)→ABSENT` 且路由不变。本 turn 试图复跑该对照时落点在 `pages/profile/index`（持久登录态把栈顶移离登录页），于是登录页选择器**合理地**不在该页 ⇒ `MISS`。按在册纪律这是**上下文/身份差**（第一次读数不当产品事实），不是仪器死；通道活着由上面 `WS_UP=ALREADY_UP` + `WS_UP_BAND_RESULT=match` + boot 里 `verify=logged-in userId=100158`（真实 WS evaluate 读回 store）三证覆盖。

## 四条腿逐条（全部 UNVERIFIED-INSTRUMENT）

跑法（新旗标全开、real 档、只读配方切片 `tmp/qa/v37-legs-recipes.json`、名单 `tmp/qa/v37-legs-ids.txt`）：
```
r-exec-ws.mjs --recipes tmp/qa/v37-legs-recipes.json --ids-file tmp/qa/v37-legs-ids.txt --only 次要20,次要21
  --project apps/client/dist/build/mp-weixin-real --real --identity A --navto-open --handler-call --strict-verbs
  --out reports/audit/round-7/exec-v37-legs --shots reports/screenshots/ui-audit-2026-10-13-legs-f0677920
WSX_IDS_FILE 名单=4 在语料=4 找不到=0 / WSX_IDS_GUARD=OK / WSX_RECIPE_MODE on 配方=4
```

四条的 open 步都在「基底页桥 open 成功、应用内 `wx.navigateTo` 载荷回空」处中止，随后 WS 重试抛同一句：
```
WSX_RETRY capEval :: Uncaught missing ) after argument list   （×10；currentPage timeout ×5）
WSX_CAP 次要20|OT05 status=SKIPPED steps=2 modal=off net=off fixture=none   （OT06/OT09/OC09 同形）
WSX_STATS executed=0 failed=0 skipped=4(配方中止=4) 出帧=0
```
逐条判决（行都落 `exec-v37-legs/exec-results.json`，均带 `band=real@f0677920 / identity=A / sessionSource=phone-login / loginVerify=logged-in userId=100158`）：

| case | verdict | dispatched | 候选选择器 / 替代通道（都试过） |
|---|---|---|---|
| 次要20\|OT05 | UNVERIFIED-INSTRUMENT | 0 | `profile-shell >>> public-profile >>> relationship-c-t-a >>> .relationship-cta__btn--like` / `…__btn-like` · handler `handleLike` |
| 次要20\|OT06 | UNVERIFIED-INSTRUMENT | 0 | 同上 + `…__btn--hello` · handler `handleLike`/`openWhisperSheet` |
| 次要20\|OT09 | UNVERIFIED-INSTRUMENT | 0 | `…relationship-c-t-a >>> .relationship-cta__btn--whisper` + `whisper-compose-sheet >>> .whisper-sheet__input/__send/.whisper-sheet/.whisper-mask` · handler `openWhisperSheet` |
| 次要21\|OC09 | UNVERIFIED-INSTRUMENT | 0 | `.retry-btn`(页自身模板 index.vue:410) / `.state-view` · callHandler `loadOfficialChat` |

**根因（量出来的，非 folklore）**：本轮新落地的两条替代通道在带设备上交出的载荷是**非法 JS**。离线用 node22 逐字复现：
```
PARSE_FAIL navigateToSource  :: missing ) after argument list
PARSE_FAIL handlerCallSource :: missing ) after argument list
PARSE_OK   navigateToSyncSource / navReadSource     （CLI 桥那形没问题）
```
`navigateToSource()`/`handlerCallSource()`（`scripts/qa/exec-capabilities.mjs`）大括号失衡（多一个收尾 `}` ⇒ brace balance = −1）。这与带设备上 `WSX_RETRY capEval :: Uncaught missing ) after argument list` 一字不差 ⇒ 同一条语法错，两处独立复现。
CLI 腿（r-exec-cli.mjs）虽用可解析的 `navigateToSyncSource`，但它**不支持 `--recipes` 也不支持 `--handler-call`**（只 import navto 符号），而 CTA 的钮在三层自定义组件子树内、DOM 侧 `$` 不到（R3-02 ②）⇒ 这四条唯一能驱动的载具 WS 腿，其 navto+handler 两条腿都栽在同一语法错上。

**处置**：按纪律记 `UNVERIFIED-INSTRUMENT` + `dispatched=0`，**不**记产品 `FAILED`、**不**记零下发的 `EXECUTED`、**不**改 `scripts/qa/**` 去修载荷（那是执行器车道/隔壁在制品的足迹）。出帧=0 属实（没下发就没帧，帧目录 `reports/screenshots/ui-audit-2026-10-13-legs-f0677920/` 因未下发而为空，不造帧）。

## 游客成员等式（第二优先）

`test-guest-landing.mjs` 的红 = `triage-exec-failures.mjs` 读 `exec-guest-real-guard-r10` 语料时点名：
```
TRIAGE_RESULT=FAIL problems=1
  ✗ 复测腿与债不同源（1 组）：subpackages/setup/recommend-pref/index → pages/login/index：
    复测腿账本声称覆盖 11 行，本轮该组实测 4 行且成员不同
```
**期望成员集从 ops 派生**（不取文档）：ops 里 `subpackages/setup/recommend-pref/index` 有 11 条 RP01–RP11（identities 全 null）；`guest-landing-booked.json` 同组 `caseIds=[RP01..RP11] / memberSource.fromOpsEntireGuest=11`。两把尺相等 ⇒ 派生集 = **RP01–RP11（11）**。

**r10 腿实测**：该页 11 行 `route` **全部 = pages/login/index**，但 status 只有 RP01/02/06/10=FAILED（被 triage 归成 `FAILED-landing-guard` 成员 = 4），另 7 条 status=SKIPPED ⇒ 不计入 landing-guard 成员。
```
派生集(11): RP01 RP02 RP03 RP04 RP05 RP06 RP07 RP08 RP09 RP10 RP11
r10 已计(4): RP01 RP02 RP06 RP10
差集(未计7): RP03 RP04 RP05 RP07 RP08 RP09 RP11
```
⇒ 差集非「页没弹回登录」，而是**逐例归属**（SKIPPED 不认领 landing-guard）。带设备复测页级落地对（`tmp/qa/v37-gl-rp.mjs`，清会话→桥 reLaunch→两窗取样）：
```
V37_GL_SAMPLE1=landing=pages/login/index identity=not-logged-in markers={".login-page__brand":"1",".login-register-entry":"1"}
V37_GL_SAMPLE2=landing=pages/login/index identity=not-logged-in …
V37_GL_LANDING_STABLE=yes  V37_GL_GUEST_IDENTITY_OK=yes(not-logged-in×2)
V37_GL_VERDICT=GUEST_LANDING_RESHOOT=PASSES
```
`test-guest-landing.mjs` **硬编码**读 `exec-guest-real-guard-r10`（历史目录，题面禁止改），所以那条红无法由新腿抹平 ⇒ 如实报上面这个 7 元差集（题面明示：抹不平时「report the exact set difference — that is a real result」）。要把 11 条都变 landing-guard 成员，需要一条把 RP03/04/05/07/08/09/11 判成 FAILED（而非 SKIPPED）的 `--identity guest` 逐例复测腿，且落**新**目录——归后续带此范围的车道。

## 读数复量（覆盖门前/后）

命令：`node22 scripts/qa/verify-real-coverage.mjs --ops reports/audit/round-6/ops --dir reports/audit/round-7 --ledger …/tour-ledger.json`

| | COVERED | UNCOVERED | VOIDED |
|---|---|---|---|
| 前（题面转述） | 199 | 5/236 | 4 |
| 后（本腿四条 SKIPPED 落盘后实测） | **199** | **5/236** | 4 |

`REALCOV_SESSION_UNPROVEN_ROWS=1150` 前后一致（门扫 3301／16089 行）。四条腿保持 UNCOVERED 是**正确**结果：`JUDGED=^(EXECUTED|FAILED|PASS)$`，SKIPPED 不认领覆盖 ⇒ 仪器中止不该换来覆盖。本腿没把任何 mock 行改成 real、没动标签去凑数。UNCOVERED 仍点名：OT05(login)/OT06(login+guest)/OT09(login)/VRN07(login)/OC09(login+guest)。

## 未做与原因
- **VRN07**：需 DB fixture（用户未授权）⇒ 不射，登录轴仍 UNCOVERED。
- **OT06 / OC09 游客轴**：只读注入动词豁免未定（pending ruling）⇒ 不射；这两条本腿只判登录轴（且登录轴亦 UNVERIFIED-INSTRUMENT）。
- **PFI25**：隔壁车道正改 `scripts/qa/case-recipes.json` 的选择器 ⇒ 本腿不碰权威件，另摘只读切片跑自己的四条。
- **登录四条**：因 opt-in 通道载荷缺陷记 UNVERIFIED-INSTRUMENT，非选择器不存在、非产品判决。

## 租约收口
`ui-audit-v37.lock` 由 v37-lease-run.mjs / guardUiLease（`QA_UI_RESOURCE=ui-audit-v37`）acquire，finally+SIGINT/SIGTERM release。每次子腿收尾均打：
```
LEASE_RELEASE={"released":true,"file":"…\ui-audit-v37.lock"}   LEASE_HELD_AFTER=[]
```
收口独立复量 `heldLeases()`（见本文件末附）= **[]**（空）。
