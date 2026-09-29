# held4 四条的落地核查（round-7 收口车道 r9，离线文件活）

车道：held4-landing-r9。HEAD=`1788675d`。本节全部读数为命令实测，非推断、非引用。

## 0. 结论摘要
- **`cellplan-round8-held4.json` 早已落盘入库**，不是"只存在计划"。本轮按 sanctioned 路径跑的是**幂等复跑**：干跑与 `--apply` 都报 `待改=0 拒绝=0`，`--apply` 后工作树零改动 ⇒ 本轮**没有产生任何写**，因此也**没有触发重打戳**（详见 §5/§6）。
- 四行定性：H03=real 档已盖章、N05=real 档已盖章、VI09=showcase 档已盖章、**MT03=不落章，去向=需环境（缺后端互选夹具 + 缺 per-case query），可指地址=本报告 §4**（刻意不新开文件，避免第二个真相源；已实测 `open-row-dispositions.json`/`openrows-blockers-v33.json`/`frame-debt-triage.json` 三处都**没有** MT03，所以此前确实是沉默）。
- **新发现的活口子**：三条已落章的理由正文里，有 **三处载体说法在 HEAD 已被推翻**（VI09 的"只有作用域哈希/闸不收哈希"、H03+N05 的"无 pullDown op、无 network 计数通道"）——详见 §7-2。档结论（real / real / showcase）我不动摇；是否重开这三行属判域，交回你裁，我不擅撤章、不改判免检。
- MT03 的排除论在 HEAD **逐条复推仍成立**（§3 全部为实测：三档 constants.js 内联快照都无 `VITE_MOCK_MATCH_PROBABILITY`、`readMockMatchProbability()` 落 `return 0`、mock 腿 `likeUser()` 硬写 `{matched:false}`、执行器对本页硬塞 `dev-preview=1`）。
- 净新增 = 3，工具自报 `已落地=3`（本轮复跑读数），跨计划 `.pre-ops-cellplan*.bak` 对账核实这 3 行**落盘前均无 `automatable:false`**、无 `notAutomatableAlso`、且全仓只有 held4 一份计划点名过这三个 id ⇒ 本例无 §2.1 记的那类"自报虚高"。
- 守恒实测：**全目录 24 份 manifest、用例总数 1107**（我自己数的，不是引用）。
- 两道门（本轮唯一一次写=新建本报告与 MT03 落点文件，未碰 ops）：写前 `verify-source-shape --dry`=**0**、`verify-ledger reports/audit/round-6`=**0**；写后读数见 §6。

## 1. 已落盘 or 只是计划？（证据命令与读数）
判定：**已落盘并已提交**。证据四条，互相咬合：

1. 盘上行内标记（`node` 直读 `reports/audit/round-6/ops/*.json`）：
   - `H03@PAGES-HOME-INDEX`：`automatable=false`、`notAutomatableFrom="cellplan-round8-held4.json"`、reason 长 586、carrier 长 237
   - `N05@PAGES-NEARBY-INDEX`：同上，reason 587、carrier 236
   - `VI09@次要22`：同上，reason 587、carrier 252
   - `MT03@SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING`：`automatable=undefined`、`notAutomatableFrom=null`、无 reason/carrier ⇒ 未盖章（与计划口径一致）
2. `git log -- reports/audit/round-6/ops/PAGES-HOME-INDEX.json` ⇒ 顶部提交 `4727f38b 2026-09-29 13:03:29 +0800 feat(qa,ledger): held4 四条按判据定性落账（3 条 WRONG_BAND 归位 + 1 条判为需环境）`；同一提交同时带入计划文件本身（`--stat` 显示 4 文件：3 份 ops + `scripts/qa/cellplan-round8-held4.json`）。
3. `git merge-base --is-ancestor 4727f38b HEAD` ⇒ **IS_ANCESTOR_OF_HEAD=yes**（HEAD=`1788675d`）。
4. `git status --short` 对三份 ops 与计划文件均为空 ⇒ 落盘态已入库，工作树没有半成品。

**一处与文档不同的实测**（如实报，不圆）：编排给的计划 mtime 是 `Sep 29 12:12`，我量到的是 **`2026-09-29 12:47:19`**（`ls --time-style=full-iso`）。另：三文件最新的 `.pre-ops-cellplan*.bak` 停在 `2026-09-29 11:51:12`（HOME/NEARBY=`.2.bak`、次要22=`.3.bak`），**没有 held4 那次落盘应产生的 `.3.bak`/`.4.bak`**。按写入器 `:236-240` 的自动续号逻辑，一次真改动必然新建一份备份 ⇒ 说明 held4 那 3 行是在 **11:51 那一跑**里连同 `cellplan-round8-unverifiable.json` 一起落的（备份命名只按"存在即续号"，两次 `--plan` 同跑共用一份备份），计划文件 12:47 的 mtime 是**落盘之后回写 `$comment` 留下的**。这条只影响"证据链形状"，不影响结论：正文与计划逐字相等（下表）。

**逐字相等核对**（`why`/`carrierChecked` 与盘上 `notAutomatableReason`/`notAutomatableCarrier` 全等，`===` 比较）：

| 行 | why 长度 | 截断线 600 | carrier 长度 | 截断线 300 | whyEXACT | carrierEXACT |
|---|---|---|---|---|---|---|
| H03 | 586 | 内 | 237 | 内 | true | true |
| N05 | 587 | 内 | 236 | 内 | true | true |
| VI09 | 587 | 内 | 252 | 内 | true | true |

计划 `$comment` 引用的截断行号 **实测准确**：`scripts/qa/apply-ops-cellplans.mjs:210` = `t.notAutomatableReason = String(r.why).slice(0, 600);`、`:211` = `if (r.carrierChecked) t.notAutomatableCarrier = String(r.carrierChecked).slice(0, 300);`（另 `:212` 是 `dead` 的 `slice(0,200)`）。三条都落在截断线内 ⇒ 不存在"静默切尾导致盘上正文与计划不逐字相等"。

## 2. 逐行定性（H03 / N05 / VI09 / MT03）
| 行 | 去向 | 能表达该判据的档（点名） | 状态 |
|---|---|---|---|
| `H03@pages/home/index` | `B-not-automatable` 盖章（`automatable:false` + reason/carrier/from） | **real** = `apps/client/dist/build/mp-weixin-real`，`real@f0677920` | 已落账（`4727f38b`），本轮复跑幂等 |
| `N05@pages/nearby/index` | 同上 | **real** = `real@f0677920` | 已落账，幂等 |
| `VI09@subpackages/vip/index` | 同上 | **showcase** = `mp-weixin-showcase`，`real@ed1cd82c`（该档 `VITE_SHOWCASE_MODE:"true"`，我实测另两档无此键） | 已落账，幂等 |
| `MT03@subpackages/discover-extra/discover/matching` | **不落章** ⇒ 需环境 | 档能点名（real/showcase 走后端），但 `status=matched` 三档都构造不出 | 见 §3 复推 + §4 落点 |

三条都不是"免检"、也没有从欠账改判成豁免：只补 `automatable:false` 与三件名分（reason/carrier/from），判据正文 `title/pre/action/expected/evidence/requiresReal/identities/tapTarget` 一字未动（与计划 `$forbidden` 一致）。

## 3. MT03 的排除论在 HEAD 是否仍成立（三档产物 + 判据正文重推）
判定：**仍成立**（每一环都重新实测；两处归因要更正、三处行号已漂，见 3.4）。

判据正文（`reports/audit/round-6/ops/SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json` 里 `MT03` 原文）：
- title=`匹配成功（status=matched）：消费卡组 + redirectTo 成功页，栈中不得残留本页`
- pre 自述裁定=`若 mock 恒不返 matched，则本前置在 mock 构建下**不可构造** → 按「前置未构造 → UNVERIFIED」如实记录，禁止手工改写 store 冒充`
- expected 要 `路由末位=…/match-success 且栈中不含 matching 页` + `跳转前 consumeCardFromDeck 已被调用`

### 3.1 mock 档：`matched` 恒假（实测三档产物）
| 档目录 | `config/env.js` MODE | SHOWCASE 键 | env sha8 | 内联快照里有 `VITE_MOCK_MATCH_PROBABILITY` 这个**键**吗 |
|---|---|---|---|---|
| `mp-weixin` | `"mock"` | 无 | `f1c7b96b` | **无**（键表实测：BASE_URL/DEV/MODE/PROD/SSR/VITE_API_BASE_URL/VITE_API_MODE/VITE_APP_VERSION/VITE_CJS_IGNORE_WARNING/VITE_ROOT_DIR/VITE_USER_NODE_ENV） |
| `mp-weixin-real` | `"real"` | 无 | `f0677920` | **无**（同上） |
| `mp-weixin-showcase` | `"real"` | `"true"` | `ed1cd82c` | **无**（快照多一枚 `VITE_SHOWCASE_MODE:"true"`、`MODE:"mp-weixin-showcase"`） |

三档编译后的 `stores/discover/constants.js` 里 `VITE_MOCK_MATCH_PROBABILITY` 只以**读取表达式与告警字符串**出现，函数尾实测为 `…}catch(E){}return 0}` ⇒ `MOCK_MATCH_PROBABILITY=R` 取到 0。源码门：`apps/client/src/stores/discover/actions/swipe.ts:267` = `if (useMock()) {`、`:270` = `const matched = Math.random() < MOCK_MATCH_PROBABILITY;` ⇒ `Math.random() < 0` 恒假。**mock 档构造不出 matched，与 case.pre 自述一致。**

### 3.2 real / showcase 档：要后端互选，而仓里没有那份夹具
- `swipe.ts:357-371` 走 `likeUserApi(...)` 并以 `result.matched` 写 `lastSwipeResult`。
- `likeUserApi` 实体在 `apps/client/src/stores/discover/api.ts:121-135`：`POST /matches/like` ⇒ `matched: data !== null && data !== undefined`，注释自述"仅后端生成心动信号（互相喜欢）时返回非空"。
- 后端：`apps/api/.../match/MatchController.java:148` `@PostMapping("/like")`、`:151`「若双向喜欢则生成 HeartSignal（匹配成功）」、`:156`「data 为 HeartSignalView（如双向喜欢则非空）」、`:169` `matchService.likeUser(...)`。
- 夹具这一环我查了才敢说：**仓里没有任何造互选的数据**。`apps/api/src/main/resources` 下**零个 `.sql`**；全仓只有 `apps/api/scripts/output/app-assets-seed*.sql`，逐条看全是 `INSERT INTO media_asset`（`tag-mutual` 那处命中是素材文件名 `tag-mutual.svg`，不是数据行）；`scripts/qa/*.mjs|*.cjs` 里没有任何脚本调 `matches/like` 或以身份 B 先喜欢 A。
⇒ 缺的是「B 先喜欢 A」这条前置夹具，三档都给不了。

### 3.3 执行器还额外把本页钉在预览态
- `scripts/qa/r-exec-cli.mjs:1180-1181` 的 `ROUTE_QUERY` 表**按页**硬写 `"subpackages/discover-extra/discover/matching": "dev-preview=1"`；全文件**无 `--query` 旗标、无按 case 覆写的入口**（我 grep `--query|queryOverride|PAGE_QUERY` 零命中）⇒ 只要跑这页就带预览态。
- `apps/client/src/subpackages/discover-extra/discover/matching.vue:119-120` 收到 `dev-preview=1` 即 `previewMode.value = true`；`:89` 的 watch 首行 `if (!checked.value || !animated || previewMode.value) return;` 直接早退 ⇒ `consumeCardFromDeck()` + `redirectToSuccess()` 这条链**永不执行**。
- 在盘旁证：`exec-A-real/exec-results.json` 的 MT03 = `status=EXECUTED`、`observed=top=subpackages/discover-extra/discover/matching`（停在本页，从未落到 match-success）；游客腿 `exec-guest-real-final` 的 MT03 = `FAILED top=pages/login/index ≠ …/matching`。
- 判点本身（完整路由栈）是**有通道**的（执行器用 routeStack 取证）⇒ 所以这条不是"不可自动化"，是**缺后端互选夹具 + 缺按 case 定制 query**＝需环境。

### 3.4 两处要更正的归因、三处已漂的行号（盘上原文 vs HEAD）
1. **归因更正**：计划 `$comment`/`$evidenceDetail.MT03` 说"mock 档还有第二条把 matched 钉死的路：`apps/client/src/services/api.ts:984-986` 的 `likeUser()` 在 `useMock()` 时直接 `return { matched:false }`"。该函数**确实存在且行为如述**（我读了 `:984-986`），但**不在这页的调用链上**：`swipe.ts:23` 引的 `likeUserApi` 来自 `../api`＝`stores/discover/api.ts`，那里**没有** mock 短路，总是发 `/matches/like`。⇒ "第二条路"是别处的代码，mock 档钉死 matched 的**唯一**有效成因是 §3.1 的概率恒 0。结论不变，归因要改。
2. **行号漂移**（同一句话在 `unverifiable-recheck-1.json` 里还另有一组旧值 `matching.vue:87` + `r-exec-cli.mjs:193`）：
   - `r-exec-cli.mjs:289`（计划引） ⇒ HEAD 实为 `:1180-1181` 的 `ROUTE_QUERY`（`:289` 现在是 `--selftest` 用例数组的一行，不是注入点）。
   - 判据正文引的 `matching.vue:47-52`（redirectTo）、`:68`（consumeCardFromDeck） ⇒ HEAD 实为 `:64-66`（`uni.redirectTo`）与 watch 内 `:90-91`。**这属于判据正文里的行号，改它=改判据文本，不在本车道权限内**，只登记不擅动。
   - `MatchController.java:148-160` ⇒ HEAD 语义完整落在 `:148/:151/:156/:169`，实质成立。

## 4. MT03 的诚实落点（可指给用户的地址）
先给"它现在被登记在哪"的实测：`reports/audit/round-7/open-row-dispositions.json`（81 条 C 轴去向，`MT03 present=false`）、`reports/audit/round-7/openrows-blockers-v33.json`（8 行，按缺陷 ID 键，`MT03_HITS=0`）、`reports/audit/round-7/frame-debt-triage.json`（无 MT03）；`tapfix-unverifiable.json` 里 MT03 归的是**另一条轴**（"判据点名的是数值，不是可点物件"），不是档/夹具这一问的答案。⇒ 除了计划文件的 `$comment` 与提交信息，**没有任何一处能被指到**。本节就是那个地址（不新开文件，避免第二个真相源）：

> **MT03@subpackages/discover-extra/discover/matching —— 判为「需环境」，不落 `automatable:false` 章，不派生免检。**
> 不可拍的原因（逐条在 §3 有实测行号）：
> ① `status=matched` 在 mock 档恒假：三档 `stores/discover/constants.js` 内联 env 快照都没有 `VITE_MOCK_MATCH_PROBABILITY` 键 ⇒ 读概率的函数尾 `return 0` ⇒ `swipe.ts:270` 的 `Math.random() < 0` 恒假；
> ② real/showcase 档要后端回非空 `HeartSignalView`（`MatchController.java:151/:156`），而仓里**没有任何造"B 先喜欢 A"互选状态的种子或脚本**（`apps/api/src/main/resources` 零 `.sql`；唯一的 `app-assets-seed*.sql` 全是 `media_asset` 行）；
> ③ 即使①②解决，执行器仍按页硬塞 `dev-preview=1`（`r-exec-cli.mjs:1180-1181`）⇒ `matching.vue:119-120` 置 `previewMode` ⇒ `:89` watch 首行早退，`redirectTo` 链不执行；要按 case 定制 query，而执行器没有 per-case query 通道（G-16）。
> 解除条件（谁做完哪一件，这行才能重开）：**(a)** 后端互选夹具脚本（或一条能造 `heart_signals` 双向记录的 seed）**＋(b)** 执行器支持 per-case deep-link query 以绕开 `dev-preview=1`。两件缺一件都不算解开。
> 不许做的事：按 `case.pre` 自己写明的裁定，**禁止手工改写 store 冒充 matched**；也不许把它盖章成"不可自动化"（那是把"欠环境"说成"永远测不了"）。

## 5. 走 sanctioned 路径的实跑读数
唯一写者：`scripts/qa/apply-ops-cellplans.mjs`（N=node v22.17.0；node on PATH 是 v16 会崩）。**我没有手改任何 ops JSON**。

### 5.1 干跑（不给 `--apply` 就是干跑；本工具无 `--dry` 旗标）
```
OPSCELL 计划=1 份｜A 组=0 行｜B 组=3 行｜其中已落地=3 待改=0｜拒绝=0
  ALREADY cellplan-round8-held4.json :: H03 已盖章不可自动化
  ALREADY cellplan-round8-held4.json :: N05 已盖章不可自动化
  ALREADY cellplan-round8-held4.json :: VI09 已盖章不可自动化
OPSCELL_RESULT=PASS 计划 3 行全部已在正文里，本轮无需改动（幂等复跑）
```
exit=0。跨计划同跑（held4 + round8-unverifiable）= `B 组=85 行｜已落地=85 待改=0｜拒绝=0`，`OPSCELL_RESULT=PASS`，exit=0（85 = 82 + 3，与 §2.1 的"进计划 82 + 暂扣 3"对得上）。

### 5.2 `--apply` 原文行 + 净新增 vs 自报
```
OPSCELL 计划=1 份｜A 组=0 行｜B 组=3 行｜其中已落地=3 待改=0｜拒绝=0
OPSCELL_RESULT=PASS 计划 3 行全部已在正文里，本轮无需改动（幂等复跑）
```
`APPLY_EXIT=0`，且 `git status --short reports/audit/round-6/ops/` 之后为空 ⇒ **`--apply` 在这一版盘上是真·无操作**（工具在 `todoA.length+todoB.length===0` 时就 `exit 0`，写盘循环根本没进）。

**净新增 vs 自报（跨计划 `.pre-ops-cellplan*.bak` 对账，我自己数的）**：
- 三条（H03/N05/VI09）在**所有** `pre-ops-cellplan*.bak` 代次里都是 `automatable=undefined`、`notAutomatableFrom=null`、无 `notAutomatableAlso` ⇒ 落盘前**无一被别的计划盖过章** ⇒ **净新增=3**，与工具自报一致（本例没有 §2.1 记的那个"自报虚高"缺陷发作，因为那 5 条重叠发生在另一批里）。
- 全仓 13 份 `cellplan-*.json` 里**只有 held4 一份**点名这三个 id ⇒ 无跨计划共章、无 `--allow-conflict` 需求。
- 但要如实报一条**当时的自报数无法复证**：11:51/12:47 那一跑的 OPSCELL 原文**没有被留档**（我 grep 遍 `reports/audit/round-7`、`.zcode/tmp`、`tmp/qa` 找不到含 held4 那次落盘读数的日志）。所以我能证的是"净新增=3（盘面对）"，**不能**声称"工具当时也报 3"。
- 顺带实测到一条工具自身的缺陷（不在本车道改）：`KNOWN=["plan","bands","apply"]`（`:29`）里**没有** `allow-conflict`，而 `:179/:184` 却实现并依赖 `--allow-conflict` ⇒ 真撞号时那条逃生门会被自己的未知旗标闸 `exit 2` 挡死。

### 5.3 守恒（我自己量的，不是引用 1107）
`node` 直扫 `reports/audit/round-6/ops/*.json`：**24 份 manifest、用例总数 1107、不可解析 0**。四个被点名 manifest 的行数改前=改后：PAGES-HOME-INDEX 48、PAGES-NEARBY-INDEX 42、次要22 78、…-DISCOVER-MATCHING 24。本轮无写盘 ⇒ 守恒未被触碰（工具自己的 `OPSCELL_CONSERVATION`/`OPSCELL_REREAD` 两行只在真有 `todo` 时才会印，本轮没走到，这是**读数缺失**不是失败）。

## 6. 两道门写前/写后退出码 + 语料戳
| 门 | 命令 | 写前 | 写后 |
|---|---|---|---|
| 源码形状 | `"$N" scripts/qa/verify-source-shape.mjs --dry` | **exit 0**（`SRC_SHAPE total=99 成立=99 不成立=0 补丁=182（守恒：yes）`、`SRC_SHAPE_RESULT=OK`） | **exit 0**（同读数，一字不差） |
| 台账 | `"$N" scripts/qa/verify-ledger.mjs reports/audit/round-6` | **exit 0**（`LEDGER_RESULT=PASS；另有 5 条非 ID 截断串待改源头写法`、`DATA_ROWS=236 OFF_SCHEMA_ROWS=0`） | **exit 0**（同读数） |

（注意 `SRC_SHAPE total` 现在实测 **99**、`SRC_SHAPE_DUP 重复=3`，followups §8 记的是 98；这是别的车道带进来的量，不是本车道改的，我只报我量到的。）

"写后"两列是**本车道全部写动作（仅新建本报告一个文件）完成之后重取**的，不是引用写前那次。工作树核对：`git status --short reports/audit/round-6/ops scripts/qa` 只剩 `M scripts/qa/emit-round-report.mjs`（面板车道的在途改动，**我从未碰它**）＋本报告的 `??`；`find reports/audit -name "*.pre-ops-cellplan*" | wc -l` 改动前后都是 **45** ⇒ 本车道一次工具写盘都没发生。

语料戳（`scripts/qa/verify-ops-corpus-stamp.mjs`，旗标实测为 `--selftest` / `--write [--ops 目录] [--out 戳文件]` / `--check [--ops 目录] [--stamp 戳文件]`）：
- `--selftest` ⇒ `STAMP_SELFTEST 负例=3 队列口径=9 写戳保护=3 表内语料腿=8 表内非语料腿=4 结果=PASS`，**exit 0**。
- `--check` ⇒ `STAMP_OPS=reports/audit/round-6 files=24 cases=1107 canon=0fef00d141e7 戳记=0fef00d141e7 记于=2026-09-29T05:05:26.125Z gitSha=83fd47a7 当前gitSha=1788675d`、`STAMP_RESULT=PASS 语料与戳一致（cases=1107 与记录相同，判据内容零漂移）`，**exit 0**。
- **我没有 `--write`**：本车道对 ops 零写 ⇒ 无戳可重打。戳的 `记于=…T05:05:26Z`（=13:05 +0800）正落在 held4 提交（13:03 `4727f38b`）之后 ⇒ **那 3 行的改动早就被现戳覆盖**，`canon=0fef00d141e7 / cases=1107 / 零漂移` 与我编排给的旧读数一致，且我这次是**当场量的**。

## 7. 遗留 / 未做（如实，不粉）
1. **本轮我一行 ops 都没写**（该写的早已由 `4727f38b` 写完）。gap 的"技术活"部分实际已收口；本节才是活口子。
2. **已落盘的三条里有一条的理由正文含已被 HEAD 推翻的话**（这是本车道最重要的新发现，逐条实测）：
   - `VI09`：stamped `why` 写"三档 vip/index.wxml 逐字节相同(80e97fdd753ba01f)、开关 class 位只有作用域哈希、`apply-ops-cellplans.mjs:118` 只收 .class/#id"。**三处都塌**：① B7 命名刀（提交 `6c2c03fe` 15:35，产物 20:38/20:40 重建）已给该开关作者类名 `auto-renew__switch`（`apps/client/src/subpackages/vip/index.vue:533`），三档 wxml 现同为 `d10bd6f5817d5c49`、各 1 枚 switch；② `:118` 的正则 `/^[.#][\w-]+$/` 实测对 `.data-v-f489de86` 返回 **true**（它拒的是裸标签/标签链，从不拒作用域哈希）——`reports/audit/round-7/decisions-v33.md` §26 已自纠此事并承诺"在 B7 落地的同一波里一并改口径"。**归因 owner 是那条车道，我不双写、不手改盘上正文。**VI09 真正仍成立的是档轴（showcase 唯一翻 `membershipEnabled`）+ 执行器无 `change`/属性读通道（`r-exec-cli.mjs:332` 自述"只有一个元素级下发点 `element(isInput?"input":"tap")`"）。
   - `H03` / `N05`：两条 stamped `why` 都以"落不了 A 组"为由写着 `r-exec-cli.mjs` **"无 pullDown op / 无 network 计数通道"**。这句话在 HEAD **已经是错的**：`pullDown` 已接（`:350 VERB_PULLDOWN_RE`、`:363-364` 走 `evaluate(uni.startPullDownRefresh)`，`--gestures` 下发，`:267-268` 有正/负例）、`--net-count` 已接（`:119`，且 `:716` 自己写着"那句『本通道没有这条』在 `--net-count` 存在之后就变成谎话"），`scrollTo` 在 `:579`。**档结论（real）不受影响、不需要重开**；但"盖章理由"的这一半过期了，是否把这两行重判成可拍，属于**新的判域决定**，按规矩交回你裁，我不擅自撤章、更不把它们改判成免检。
   - `N05` 的引证行号另漂：`r-exec-cli.mjs:549-551`（游客×mock 硬拒）在 HEAD 是 `:1500-1505`，且现在多一条 `--allow-guest-mock` 显式放行口。
3. 计划文件里 MT03 那条"mock 档第二把钉死 matched 的路"（`services/api.ts:984-986`）不在该页调用链上，见 §3.4-1：结论不变、归因要改。改它要么动计划文件（历史计划，属留档原文），要么在我这份报告里更正（我选后者）。
4. 工具的 `--allow-conflict` 自锁缺陷（§5.2 末）与 `OPSCELL` 落盘读数不留档这两件，本车道未改（`apply-ops-cellplans.mjs` 不在我的可改清单内，且改它要配能变红的负例）。
5. 未碰：UI/DevTools、租约（未取）、重建（未跑）、`.zcode/` DSL、任何 `verify-*.mjs`、`emit-round-report.mjs`。本轮全部命令都是只读或对 ops 的只读复算。
