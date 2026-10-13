# 设备腿 · 重射（relegs-lane）— 2026-10-13 · exec-v37-relegs

本腿是 `exec-v37-legs` 那条腿的**第二设备腿**：同一批四条（`次要20|OT05 / OT09 / OT06`、`次要21|OC09`），
只在**登录轴**，在上一腿死掉的缺陷（`navigateToSource()` / `handlerCallSource()` 各多一枚 `}` ⇒ `wx.evaluate`
源码 `missing ) after argument list` ⇒ dispatched=0）已由 `181d4e97` 修好并入库之后，重射。
骨架先行，逐步追加；若本腿中途死，此文件应仍可从磁盘读回「还剩什么没做」。

明确不做（题面 + 上腿已定）：
- `VRN07`：需 DB fixture，用户未授权。
- `OT06 / OC09` 的**游客轴**：只读注入动词豁免未定（pending ruling）。
- `PFI25`：隔壁车道正改 `scripts/qa/case-recipes.json` 的选择器 ⇒ 本腿开局即摘只读快照
  `tmp/qa/v37-relegs-recipes.json`，全程从快照跑，不碰权威件，也不尝试 PFI25。

纪律：租约 `scripts/qa/ui-lease.mjs`，锁 `tmp/qa/locks/ui-audit-v37.lock`（`QA_UI_RESOURCE=ui-audit-v37`），
finally + SIGINT/SIGTERM 释放，绝不删锁，结尾 `heldLeases()` 须为空；零 dispatch = `UNVERIFIED-INSTRUMENT`
并列出所有试过的选择器/ handler；不记零下发的 `EXECUTED`；不改历史 `exec-*` / `scripts/qa/**` / 台账 /
`.zcode/**`；不 git 写操作；node 用绝对路径 v22（PATH 里 v16 不生效）。

## 前置自检

`test-exec-capabilities.cjs`（node22）本腿亲手复跑，非转述：

```
ok   C6 每个 *Source 生成器产出的源码都可解析（语法错不许留到设备上才暴露）  (14 个生成器；不可解析: 无)
ok   C6 检查本身不许空转：至少覆盖到 navigateTo/handlerCall 两个生成器  (srcChecked=14)
SUMMARY: assertion failures = 0
CAPS_TEST=PASS（checks=67）          EXIT=0
```

⇒ 14 个 `*Source` 生成器全部可解析，上腿栽的 `navigateToSource`/`handlerCallSource` 语法错已消。绿，放行。

档位凭据在盘复量（与工具同一把尺 `artifact-band.readApiMode`，sha256 前 8）：

```
BAND real@f0677920 viteMode=real
```

⇒ 与上腿 `exec-v37-legs`、`exec-v37-nearby` 一致，凭证未随产物重建漂移。

覆盖门**前**基线（命令：`node22 scripts/qa/verify-real-coverage.mjs --ops reports/audit/round-6/ops
--dir reports/audit/round-7 --ledger reports/audit/ui-audit-2026-10-09/tour-ledger.json`）：

```
REALCOV_COVERED=199
REALCOV_UNCOVERED=5／236
REALCOV_VOIDED=4
REALCOV_CONSERVATION=OK 免检=28 + 覆盖=199 + 欠账=5 + 待判=4 = 236／236
REALCOV_SESSION_PROVEN=104 REALCOV_SESSION_UNPROVEN_ROWS=1150（…REALCOV_SESSION_SCANNED=3301／16089）
UNCOVERED 点名（NO_A_JUDGED）：次要20|VRN07 · OT05 · OT06 · OT09 · 次要21|OC09
NO_GUEST_JUDGED：次要20|OT06 · 次要21|OC09
```

⇒ 本腿四条（OT05/OT06/OT09/OC09 登录轴）正是 NO_A_JUDGED 里的 4 条（VRN07 排除）。

## 通道凭据

起点：9420 已 LISTENING（上腿 spawn 的 automator 仍活着 pid=24892），锁目录只有 released 墓碑、`heldLeases()=[]`。
按在册纪律「LISTENING ≠ 凭据」，仍在租约内复跑 bring-up 取那两行机器凭据（`--wait 300` 带上）：

```
LEASE_BEFORE=[]
LEASE_RESULT=ACQUIRED file=…\tmp\qa\locks\ui-audit-v37.lock owner=relegs-lane-v37 pid=26836
IDE_PORT_SOURCE=config scripts/qa/ide-port.json → 9420
WS_UP=ALREADY_UP port=9420 connectMs=116 page=pages/login/index hits=00000000 单条查询=9.8ms
WS_UP_BAND=match 档位 project=…\mp-weixin-real VITE_API_MODE=real MODE=real envSha8=f0677920 / 实例自报 apiMode=real 落点=pages/login/index
WS_UP_BAND_证据 应用内 require(config/env.js)=OK|real|config/env.js 应用内异常=无
WS_UP_BAND_OK 档位与 --project 相符 ⇒ 这条 ALREADY_UP 才允许以 exit=0 收口
WS_UP_BAND_RESULT=match exit=0
CHILD_EXIT=0   LEASE_RELEASE={"released":true,…}   LEASE_HELD_AFTER=[]
```

凭据 = **`WS_UP=ALREADY_UP port=9420`** + **`WS_UP_BAND_RESULT=match`**（band=`real@f0677920`）。
落点 `pages/login/index`（real 冷启未登录）⇒ 与上腿不同，本腿正向对照可就在登录页做。
`hits=00000000` 是 bring-up 内置 `.discover-header__*` 探针在未登录落点上本来就选不到，非通道死（同 ui-channel-lane 记录）。

## 正向对照

本腿当场复跑（非引用 ui-channel-lane）：载体 `tmp/qa/v37-positive-control.mjs`，租约内，node22。

```
V37_PC_TOP=pages/login/index
V37_PC_ROUTE_BRIDGE=pages/login/index                      ← WS 与桥双载体交叉核对同一条路由
V37_PC_SELECT=.login-sms-fallback ⇒ HIT | mode=open-form
V37_PC_TEXT_READBACK="验证码或密码登录"
V37_PC_ACT_PRE_STATE=stack=pages/login/index .input-field=ABSENT
V37_PC_ACT_tap=⇒ ok
V37_PC_ACT_READBACK=.input-field ABSENT → PRESENT(2) | stack pages/login/index → pages/login/index | 方向=open-form | 目标选择器 tap 后=已被 v-if 换掉（符合 toggle 语义）
V37_PC_VERDICT=POSITIVE_CONTROL=PASS（选得到 + 动得了 + 状态按源码语义翻了一个方向，且路由没变 ⇒ 不是换页造成的假象）
```

判据源 `apps/client/src/pages/login/index.vue:638-648/:163-165/:700-730`：`.login-sms-fallback` 与两枚 `.input-field`
都是源里真实存在的节点，`PRESENT(2)` 与「手机号 + 短信」两枚输入框对得上 ⇒ 这条腿的 SELECT/ACT 真有答案，
后面任何「选不到」才量得出产品事实。（首读陷阱：本腿 bring-up 后第一步是 connect→currentPage，正对照里 `$` 前已有
evaluate 建立会话，且第一次 `$` 即 HIT，未触发上腿那种首读 null。）

## 四例逐条

跑法（opt-in 三旗标全开、real 档、开局摘的只读切片、名单四条、**新**目录）：
```
QA_UI_RESOURCE=ui-audit-v37 node22 scripts/qa/r-exec-ws.mjs --recipes tmp/qa/v37-relegs-recipes.json
  --ids-file tmp/qa/v37-relegs-ids.txt --only 次要20,次要21 --project apps/client/dist/build/mp-weixin-real
  --real --identity A --navto-open --handler-call --strict-verbs
  --out reports/audit/round-7/exec-v37-relegs --shots reports/screenshots/ui-audit-2026-10-13-relegs-f0677920
（注：开局用整份快照报 WSX_RECIPE_BAD「PFI25/VI25/VI34/VB03 不在判据台里」⇒ 是把范围外配方喂进了 --only 的交叉校验；
  把快照裁成本腿四条（次要20/21 两 manifest）后 WSX_RECIPE_MODE on 配方=4，一行未改权威 case-recipes.json）
```

boot 身份行（当场铸+断言，登录轴身份可证）：
```
WSX_IDENT_PRODUCIBLE=A 铸票端点=phone-login
WSX_BAND_STAMP band=real@f0677920 读自=…/mp-weixin-real/config/env.js 声明档位=real 旗标--real=on
[boot] boot-ok(awaited) identity=A mint=phone-login 铸到userId=100158 verify=logged-in userId=100158
WSX_OPEN_FORM=on(base+navigateTo ⇒ 基底页=pages/discover/index)  WSX_HANDLER_CALL=on  WSX_NET_ARM=on
WSX_IDS_FILE … 名单=4 在语料=4 找不到=0   WSX_IDS_GUARD=OK
WSX_ADMISSIBLE=yes 整批落点/探针都有答案，只是没有 EXECUTED ⇒ 这是判决不是取证失败
WSX_STATS executed=0 failed=0 skipped=4(配方中止=4) 页组=2 探针条数=3 出帧=0 ws重试=6
```

**关键差异（相对 exec-v37-legs）**：上腿四条全死在「opt-in 载荷 JS 语法错 ⇒ 下发前就 abort、navto 从未落地」；
本腿 `navigateToSource`/`handlerCallSource` **在带设备上真的下发了**——open 步 `⇒ ok top=<目标页>`、
`assertRoute … ⇒ 命中`、handler 直调交出**结构化回执** `no-method <route>`、armNetFault 交出 `arm-unverified`。
即 `181d4e97` 的修复在活体上生效，缺陷被搬到了**下游两处更深的既有通道欠款**上（都不是产品事实、也不是本次修复没管用）。
判定动作（CTA tap / 故障态观察）本腿下发次数=0 ⇒ 四条仍 `UNVERIFIED-INSTRUMENT`、`dispatched=0`，**不记 EXECUTED/FAILED**。

| case | verdict | 判定动作 dispatched | 卡在一步（已完成/总步） | 两处更深欠款 |
|---|---|---|---|---|
| 次要20\|OT05 | UNVERIFIED-INSTRUMENT | 0 | #7 tap like 中止（~8/18，modal 已 arm 但无 tap 可触发） | ① `…__btn--like` probe=absent（组件不穿透 R3-02②）+ `handleLike` 回执 no-method |
| 次要20\|OT09 | UNVERIFIED-INSTRUMENT | 0 | #4 tap whisper 中止（5/32） | 同上：`…__btn--whisper` absent + `openWhisperSheet` no-method ⇒ 弹层从未打开 |
| 次要20\|OT06 | UNVERIFIED-INSTRUMENT | 0 | #4 armNetFault 中止（4/23，未到判定动作） | ② 真档 `wx.request` 非本通道 mock（requestType=function）⇒ arm-unverified |
| 次要21\|OC09 | UNVERIFIED-INSTRUMENT | 0 | #6 armNetFault 中止（6/21） | ② 同上 ⇒ 故障态从未出现，`.retry-btn/.state-view`=absent 是「无故障可重试」的仪器读数不是产品结论 |

`no-method` 的机理（读 `handlerCallSource` 源，非 folklore）：它只在**页实例**上找方法
（`p.$vm[method]` 或 `p[method]`），`handleLike`/`openWhisperSheet` 挂在 **RelationshipCTA 子组件**实例上 ⇒ 页实例查不到
⇒ 回 `no-method`。这与「DOM 侧 \$ 不穿透子树」是**同一根因的两面**：CTA 的动作既不能被 \$ 点到、也不能经页实例直调。
修它要动 `scripts/qa/exec-capabilities.mjs` 的 handler 解析（追子组件实例）或换载具——**超出本设备腿边界**，指回执行器车道。

逐条候选选择器 / handler（都试过、回执照实在各行 `candidatesTried`）：见 `exec-results.json` 每行
`instrumentEvidence`(=stepsNote) 与 `candidatesTried`。例：OT05/OT09 试了链形
`profile-shell >>> public-profile >>> relationship-c-t-a >>> .relationship-cta__btn--like/--whisper`（probe=absent）
与 handler `handleLike`/`openWhisperSheet`（no-method）；OT06/OC09 试了 `armNetFault(mode=record/fail-all)`（arm-unverified）、
OC09 另 probe `.retry-btn/.state-view`（absent，因故障态没装上）。出帧=0 属实（无判定动作下发就没证据帧，不造帧）。

## 门前后复量

命令：`node22 scripts/qa/verify-real-coverage.mjs --ops reports/audit/round-6/ops --dir reports/audit/round-7 --ledger …/tour-ledger.json`

| | COVERED | UNCOVERED | VOIDED | CONSERVATION | UNPROVEN_ROWS |
|---|---|---|---|---|---|
| 前（本腿开跑前实测） | 199 | 5／236 | 4 | OK 免检=28+覆盖=199+欠账=5+待判=4=236 | 1150 |
| 后（本腿四条 SKIPPED 落盘后） | **199** | **5／236** | **4** | OK 免检=28+覆盖=199+欠账=5+待判=4=236 | 1150（SCANNED 16089→**16093**，证过行 +4 不可证不变） |

判 `REALCOV_RESULT=FAIL` 不变。四条保持 UNCOVERED 是**正确**结果：门只认 `JUDGED=^(EXECUTED|FAILED|PASS)$` 且读 `status`（SKIPPED
不认领覆盖）⇒ 判定动作没下发就不该换来覆盖，本腿没把任何 mock 行改 real、没动 `status`/`identity`/`band` 去凑数、
没新增不可证身份行（1150 未变）。UNCOVERED 仍点名：VRN07(login) · OT05(login) · OT06(login+guest) · OT09(login) · OC09(login+guest)。

## 未做与原因

- **VRN07**：需 DB fixture，用户未授权 ⇒ 不射，登录轴仍 UNCOVERED。
- **OT06 / OC09 的游客轴**：只读注入动词是否豁免未定（pending ruling）⇒ 不射；本腿只判这两条的登录轴（且登录轴亦 UNVERIFIED-INSTRUMENT）。
- **PFI25**：隔壁车道正改 `scripts/qa/case-recipes.json` ⇒ 本腿开局即摘快照、不碰权威件、不尝试 PFI25（快照里也把它连同 VI25/VI34/VB03 一起裁掉以过 `--only` 交叉校验）。
- **登录四条**：判定动作下发=0 ⇒ UNVERIFIED-INSTRUMENT；根因已从「载荷语法错」搬到「CTA 子组件不被穿透 + 页实例直调无此方法（R3-02②）」与「真档 wx.request 不可臂展（R3-NET-04）」两处更深通道欠款。非选择器不存在、非产品判决。

## 租约收口

`ui-audit-v37.lock`（`QA_UI_RESOURCE=ui-audit-v37`）：bring-up 与正对照由 `tmp/qa/v37-lease-run.mjs`（finally+SIGINT/SIGTERM）acquire/release；
执行腿 `r-exec-ws.mjs` 自带 `guardUiLease`（`WSX_LEASE=ACQUIRED … owner=r-exec-ws-round-7`，退出即释放）。全程 `--wait 300` 一次热通、
未 close()。每步收尾均打 `LEASE_RELEASE={"released":true,…}` + `LEASE_HELD_AFTER=[]`；从未删锁文件。
最终独立复量：

```
HELD=[]          # heldLeases() 空 ⇒ 租约已全部收口
```

git 足迹：只写了 `reports/audit/round-7/exec-v37-relegs/exec-results.json`（新目录）、
`reports/audit/ui-audit-2026-10-13/relegs-lane.md`、`tmp/qa/*`（快照/名单/日志）与空帧目录；
未改 `scripts/qa/**`、任何历史 `exec-*`、台账、`.zcode/**`；无 git add/commit/checkout/stash。
