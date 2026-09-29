# realcov-nominate — 把 REALCOV_UNCOVERED 从一个数变成一本账

车道：`scripts/qa/verify-real-coverage.mjs`（唯一被改的门文件）+ 新测试 `scripts/qa/test-real-coverage-nominate.mjs`。
判点 `const ok = uncovered === 0 && conserved;` **一字未改**（diff 里它是上下文行，不是 ± 行）。
未碰：`r-exec-cli.mjs`（别的车道在改，git status 里它的 M 不是我）、`triage-exec-failures.mjs`、`apps/client/src/**`、`reports/**`（全程只读）、`.zcode/workflows/**`。
全程离线：不开模拟器、不抢 ui-lease、不写 reports/ 下任何文件。

## 0. 基线（改动前实测）

命令（PATH 上的 node 是 v16，会因 `import.meta.dirname` 崩，全部走 Node 22）：
`/d/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-real-coverage.mjs > .zcode/tmp/realcov-baseline.txt 2>&1` → `EXIT=1`

```
REALCOV_CASES=236 EXEC_ROWS=15363
REALCOV_NEVER_ON_REAL=0 REAL_BAND_BUT_ALL_SKIPPED=10 JUDGED_MISSING_A=10 JUDGED_MISSING_GUEST=2
REALCOV_COVERED=198
REALCOV_UNCOVERED=10／236（阈值同旧：非免检欠账 =0 才绿）
REALCOV_CONSERVATION=OK 免检=28 + 覆盖=198 + 欠账=10 = 236／236
REALCOV_RESULT=FAIL（…）
```
→ 只有 `NO_A_JUDGED` / `NO_GUEST_JUDGED` 两个桶各印前 6 条（截断），**欠账并集本身没有署名行**。

## 1. 实现（三件事 + 一条门对自己的断言）

1. 纯函数 `buildUncoveredLedger(m, ids, uncovered)`：输入就是算 `uncovered` 的那三个数组
   （`neverOnReal` / `noA` / `noGuest`），不另起判点。产出：
   - 每行 `  UNCOVERED <suite>|<id> 缺=<轴>`，轴词表固定 `never-on-real` / `login` / `guest`，两轴同缺写 `login+guest`；
   - **无上限**（不许"另 N 条未点名"——台账必须完整才对得上数）；
   - 排序 = suite→id，UTF-16 码元序（不用 localeCompare）⇒ 跨平台可复现。
2. 汇总行 `REALCOV_UNCOVERED_LIST=<n>`，紧挨 `REALCOV_UNCOVERED=`（绿的时候也印 `=0`，不许沉默）。
3. 门对自己的守恒断言 `REALCOV_UNCOVERED_LEDGER=OK|FAIL`，四条不变量：
   ① 点名数 = `REALCOV_UNCOVERED`；② 每条点名的都在判据集 `ids` 里；
   ③ 每条至少归上一根轴；④ `never-on-real` 不与具体轴并存（`judge` 里那句 `continue` 的互斥）。
   任一不成立 ⇒ 印 `  UNCOVERED_LEDGER_BAD <原因>` 并以门自己的名字判红。
4. 退出口：`const pass = ok && ledgerOk;`（`ok` 那行原样保留）。`ledgerOk` 恒真时
   `REALCOV_RESULT` 与改前**逐字相同**；台账红只可能来自门自己算错。
5. `--selftest` 加 6 条台账样本（2 条正例 + 4 条**负**样本：欠账数>点名数 / 判据集外的幽灵行 /
   never-on-real 与具体轴同一行 / 零欠账），并让原有 30 例每例都过一遍台账闭合。
   `REALCOV_SELFTEST=PASS cases=36 bad=0 台账负样本=6`（原 `cases=30`）。

## 2. 差异

完整 diff（154 行）：`.zcode/tmp/realcov-nominate.diff`；复现 `git diff -U3 -- scripts/qa/verify-real-coverage.mjs`
（`git diff --stat`：`116 insertions(+), 3 deletions(-)`，3 处删除全是旧的结果行与退出口）。
两处操作性改动（其余是纯注释与本文件的自样本）：

```js
@@ 读数尾部（原 :509 之后）@@
 console.log(`REALCOV_COVERED=${coveredN}`);console.log(`REALCOV_UNCOVERED=${uncovered}／${req.length}（阈值同旧：非免检欠账 =0 才绿）`);
+const ledger = buildUncoveredLedger(m, ids, uncovered);
+console.log(`REALCOV_UNCOVERED_LIST=${ledger.enumerated.length}（逐条点名，排序=suite→id；轴词表 ${AXIS_ORDER.join("|")}，两轴同缺写 ${AXIS_LOGIN}+${AXIS_GUEST}；本数必须等于 REALCOV_UNCOVERED）`);
+if (ledger.enumerated.length) {
+  console.log(`  UNCOVERED 轴口径 never-on-real=…；login=…；guest=… ⇒ 缺哪根轴去补哪条腿，别改标签、别把 mock 行改成 real 来"补数"`);
+  for (const k of ledger.enumerated) console.log(`  UNCOVERED ${k} 缺=${ledger.axisOf(k)}`);
+}

@@ 退出口（原 :514-516）@@
 const ok = uncovered === 0 && conserved;          // ← 一字未改
-console.log(`REALCOV_RESULT=${ok ? "PASS" : "FAIL"}（…）`);
-process.exit(ok ? 0 : 1);
+const ledgerOk = ledger.ok;
+console.log(`REALCOV_UNCOVERED_LEDGER=${ledgerOk ? "OK" : "FAIL"} 点名=${ledger.enumerated.length} 欠账=${uncovered} 判据外=${ledger.enumerated.filter((k) => !ids.has(k)).length}（…）`);
+for (const p of ledger.problems) console.log(`  UNCOVERED_LEDGER_BAD ${p}`);
+const pass = ok && ledgerOk;
+console.log(`REALCOV_RESULT=${pass ? "PASS" : "FAIL"}（…）` + (ledgerOk ? "" : " ← 这一格的红是本门台账不闭合（REALCOV_UNCOVERED_LEDGER=FAIL），不是欠账新增，先修点名再谈欠账"));
+process.exit(pass ? 0 : 1);
```

新增文件：`scripts/qa/test-real-coverage-nominate.mjs`（文件名匹配聚合器的 `^test-.+\.(cjs|mjs)$`，自动被发现）。

## 3. 真实盘上点名出的 10 行（改后门自己印的）

`node22 scripts/qa/verify-real-coverage.mjs` → `EXIT=1`（与改前同判点、同红）

```
REALCOV_UNCOVERED=10／236        REALCOV_UNCOVERED_LIST=10
  UNCOVERED PAGES-PROFILE-INDEX|PFI25 缺=login
  UNCOVERED SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI25 缺=login
  UNCOVERED SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI34 缺=login
  UNCOVERED 次要18|TD03 缺=login
  UNCOVERED 次要20|OT05 缺=login
  UNCOVERED 次要20|OT06 缺=login+guest
  UNCOVERED 次要20|OT09 缺=login
  UNCOVERED 次要20|VRN07 缺=login
  UNCOVERED 次要21|OC09 缺=login+guest
  UNCOVERED 次要22|VB03 缺=login
REALCOV_CONSERVATION=OK 免检=28 + 覆盖=198 + 欠账=10 = 236／236
REALCOV_UNCOVERED_LEDGER=OK 点名=10 欠账=10 判据外=0
REALCOV_RESULT=FAIL
```

8 条缺登录轴、2 条两轴都缺（那 2 条判据没标 `identities` ⇒ 双身份各要一条），**0 条 never-on-real**。

### 3.1 这 10 行的下一步（一次性只读探针 `.zcode/tmp/realcov-axis-probe.mjs`，全文 `.zcode/tmp/realcov-axis-probe.txt`）

十行**同一个形状**：real 档**有行**（每条 10—16 行、跨 exec-A-real* / exec-guest-real* / exec-interact-real-sc-r10 / exec-real-co* 等多条腿），
但 **real 档判过的身份 = {}**——全部 `status=SKIPPED`。这就是读数行里 `REAL_BAND_BUT_ALL_SKIPPED=10` 与欠账 10 条一模一样的原因：
欠的不是"少跑一条腿"，是"这些用例在 real 档从来没有被**判过**一次"。主要跳过原因（按条数）：

| 用例 | 页 | real 档 SKIPPED 行 | 主因（次数） |
|---|---|---|---|
| PAGES-PROFILE-INDEX\|PFI25 | pages/profile/index | 11 | 交互腿下发全失败/类名不在×8；"本切片只跑 mock 产物"×2；NOT_SHOOTABLE(voice-preview__delete)×1 |
| SUBPACKAGES-VILLAGE…\|VI25 | village/index | 10 | 交互腿下发全失败×5；mock-only×2；observe-only×1；栈顶=pages/login/index×1；NOT_SHOOTABLE(post-card__audit)×1 |
| …VI34 | village/index | 10 | 同上（交互腿×5、mock-only×2、observe-only×1、栈顶不对×1、NOT_SHOOTABLE(skeleton-line--w60)×1） |
| 次要18\|TD03 | circles/topic-detail | 12 | **交互禁触（注销/解绑/清空不可逆）⇒ DENY ×9**；mock-only×2；VEHICLE_DENY(交互动词词表命中)×1 |
| 次要20\|OT05 | profile-extra/profile/other | 13 | 交互腿下发全失败×9；mock-only×2；"身份标为 A/B 而当前腿是 guest"×1；NOT_SHOOTABLE×1 |
| 次要20\|OT06 | 同上 | 15 | 交互腿下发全失败×12；mock-only×2；NOT_SHOOTABLE×1 |
| 次要20\|OT09 | 同上 | 13 | **交互禁触（不可逆）DENY ×9**；mock-only×2；身份范围不匹配×1；… |
| 次要20\|VRN07 | profile-extra/verification/real-name | ~14 | 交互腿下发全失败×7；action 含交互动词但没点名可交互元素×5；mock-only×2；无 --tap×1；NOT_SHOOTABLE(retry-btn)×1 |
| 次要21\|OC09 | subpackages/chat/official-chat/index | ~16 | 见 probe 全文（同类：交互腿下发失败 + 前置配方缺失） |
| 次要22\|VB03 | subpackages/vip/bills | 14 | 栈顶=pages/profile/index（没落在声明页）×4；observe-only×3；action 没点名元素×2；mock-only×2；身份范围不匹配×2；NOT_SHOOTABLE(tapTarget 空)×1 |

派活方向因此分成三堆（都**不是**"再点一次就行"）：① 交互下发失败/类名不在 ⇒ 欠前置配方（先展开/先切态）；
② `TD03`/`OT09` 的 9×DENY ⇒ 不可逆动作，需要会话隔离或独立账号才能真判，否则它们永久只能进免检桶（判据台盖章 `automatable:false` 才是出路，不是降阈值）；
③ `VB03`/`VRN07` 的"没落在声明页 / action 没点名元素" ⇒ 判据与 cellplan 的形状问题。

## 4. 负例测试的红/绿读数

夹具：`.zcode/tmp/realcov-nominate/`（两本判据 FIXTURE-A/FIXTURE-B，共 6 条 requiresReal：双身份、只登录、只游客、`automatable:false` 免检各一形状；一条 `exec-fixture-leg` 执行腿）。照 `test-landing-identity-scope.mjs` 的既有夹具写法（临时目录 + `spawnSync(门, ["--ops",…,"--dir",…])` + 读退出码）。

| 读数 | 退出码 | REALCOV_UNCOVERED / _LIST / 点名行 / LEDGER |
|---|---|---|
| 基线（6 判据 = 免检1 + 覆盖5 + 欠账0） | **0** | 0 / 0 / 0 行 / OK |
| 对照（同一批行换一条腿目录，未变异） | 0 | 0 / 0 / 0 行 / OK |
| 变异 `guest`（删 A01 的 guest 行） | **1** | 1 / 1 / `FIXTURE-A\|A01 缺=guest` / OK |
| 变异 `login`（A02 的 A 行降为 SKIPPED） | **1** | 1 / 1 / `FIXTURE-A\|A02 缺=login` / OK |
| 变异 `never`（删 B02 两条 real 行） | **1** | 1 / 1 / `FIXTURE-B\|B02 缺=never-on-real` / OK |
| 变异 `twoaxes`（A01 换成 identity 缺失的 real 行） | **1** | 1 / 1 / `FIXTURE-A\|A01 缺=login+guest` / OK |
| 变异 `many`（三条同时缺，跨两本判据） | **1** | 3 / 3 / 顺序严格 = A01,A02,B02 / OK |

负例"真的咬得动"的三重证明：① 每个变体都断言 **exit 从 0 翻到 1 且 stdout 与基线不同**、断言被点名的那一行**在基线输出里不存在**；
② 断言变异前后的夹具 JSON 字节不同（改的是输入不是空气）；③ **把门换成改动前的旧版**（`git show HEAD:scripts/qa/verify-real-coverage.mjs` 落到
`.zcode/tmp/realcov-nominate/gate-before.mjs`，经只影响被测对象路径的 `RCOV_GATE` 指过去）后本测试必须红：
`exit=1 SUMMARY: assertion failures = 22 RCOV_TEST=FAIL`——旧门一条点名都印不出（`named=0 list=null ledger=null`），
而"欠账 ⇒ 变红"那 4 条在旧门上仍通过 ⇒ 红/绿之差确实来自点名，不是我把判点改松或改紧。
另：同一夹具跑两次 stdout 逐字相同（确定性；第一版把 tag 换名导致两条 diff 假红，已修并注明原因）。

本测试自带 42 条断言，含真盘不变量（**不硬编码 10 这个数字**，别的车道还在往盘上写腿账）：
点名行数 = `REALCOV_UNCOVERED_LIST` = `REALCOV_UNCOVERED`、`REALCOV_UNCOVERED_LEDGER=OK`、每行都有轴名。
它还把门的 `--selftest` 接了线（聚合器按文件名扫不到 `verify-*`）。

## 5. 两条终局读数（Node 22，先重定向到文件再读 `$?`）

```
$ node22 scripts/qa/test-real-coverage-nominate.mjs   → EXIT=0
  SUMMARY: assertion failures = 0 / RCOV_SUMMARY cases=42 fail=0 / RCOV_TEST=PASS
  （聚合器一行：PASS  test-real-coverage-nominate.mjs  exit=0  断言失败数=0  RCOV_TEST=PASS  2s）

$ node22 scripts/qa/run-qa-selftests.mjs             → EXIT=0
  SELFTEST_RESULT=PASS（22 个离线测试 + 1 条门自检全绿，1 个 UI 绑定测试按策略跳过）
  SELFTEST_RAN=22 SKIPPED=1 FAILED=0 NO_SUMMARY_LINE=0 覆盖文件=23/23
  GATE_SELFTESTS_RAN=1 GATE_SELFTESTS_FAILED=0

$ node22 scripts/qa/verify-real-coverage.mjs         → EXIT=1（判点未变，欠账 10 条照旧红，现已点名）
  REALCOV_UNCOVERED=10  REALCOV_UNCOVERED_LIST=10  REALCOV_UNCOVERED_LEDGER=OK  REALCOV_RESULT=FAIL
$ node22 scripts/qa/verify-real-coverage.mjs --selftest → EXIT=0
  REALCOV_SELFTEST=PASS cases=36 bad=0 台账负样本=6
```
