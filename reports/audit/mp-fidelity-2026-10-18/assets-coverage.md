# R6/L03 门新建：verify-app-assets-coverage（cdn 桶覆盖 + 同字节 + 反向守恒）

- 门文件：`scripts/qa/verify-app-assets-coverage.mjs`（本轮只新建这一个文件，未接线）
- 单一真源输入：`apps/client/config/cdn-buckets.json`（schema `mp-cdn-buckets/v1`，实测 sha8=`27ab20e3`，cdnPrefixes=6、localPrefixes=2）
- 被测端点：`GET http://127.0.0.1:8080/api/v1/media/app-assets/{rel}`（匿名，rel = 包内路径去掉 `static/` 段）
- 跑法（本仓纪律，Node22）：`/d/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/verify-app-assets-coverage.mjs`
- 本报告里的每一条数字都是 2026-10-19 本轮实测；未测到的地方逐条写在「未取证/限制」里，不折算成通过。

## 1. 真实全量读数（同机同码路连跑 5 发，读数一字不差）

总账：`ASSETCOV_COVERAGE 桶=6 分母=166 200同字节=160 404=0 DRIFT=6 其它状态=0 网络失败=0`

| 桶（契约 cdnPrefixes） | 分母（枚举全部真实文件，无抽样） | 字节 | 200 且同字节 | 404 | DRIFT |
|---|---|---|---|---|---|
| static/generated/ | 21 | 6,396,538 | 21 | 0 | 0 |
| static/assets/images/covers/ | 37 | 6,283,764 | 31 | 0 | **6** |
| static/assets/images/posters/ | 6 | 835,275 | 6 | 0 | 0 |
| static/assets/images/avatars/ | 71 | 951,752 | 71 | 0 | 0 |
| static/assets/images/people/ | 21 | 999,151 | 21 | 0 | 0 |
| static/assets/images/posts/ | 10 | 556,968 | 10 | 0 | 0 |
| **合计** | **166** | 15,023,448 | **160** | **0** | **6** |

- 枚举口径：包内根 `apps/client/src`（前缀自带 `static/` 段），递归 `readdirSync`，不走 glob/find（本仓大目录 `**` 会静默零命中）。166 = 21+37+6+71+21+10，与 `find apps/client/src/static/<桶> -type f` 逐桶计数一致（21/37/6/71/21/10）。
- 覆盖这一轴本轮**没有 404**：166/166 都拿到 HTTP 200。这不等于没问题 —— 见下面 DRIFT。
- 判决行原文（5 发一致；单发实测 1.7 s，并发 8，166 发 HTTP 请求）：
  `ASSETCOV_RESULT=FAIL 分母=166 404=0 DRIFT=6 其它状态=0 空集桶=0 反向命中=0（另量不到 0 个）⇒ 字节漂移 6 个`　exit=**1**

## 2. DRIFT 完整清单（要拿去安排修复的就是这 6 条；两侧 sha256 前 8 位）

| # | rel（包内路径，修复时后端应按这份重灌） | localSha8 | remoteSha8 | localBytes | remoteBytes |
|---|---|---|---|---|---|
| 1 | `static/assets/images/covers/circle-food.png` | `ba7c9efe` | `97990598` | 45,594 | 292,002 |
| 2 | `static/assets/images/covers/circle-music.png` | `44717855` | `2af4f269` | 41,965 | 348,242 |
| 3 | `static/assets/images/covers/circle-photo.png` | `52d65766` | `8a26be4d` | 47,398 | 379,897 |
| 4 | `static/assets/images/covers/circle-sky.png` | `72e83d1c` | `a6081f09` | 36,383 | 186,949 |
| 5 | `static/assets/images/covers/circle-sports.png` | `16abd6ef` | `463ad724` | 42,631 | 313,326 |
| 6 | `static/assets/images/covers/circle-travel.png` | `f990be61` | `8caf4544` | 43,254 | 324,340 |

- 形状与 L01 实测吻合：后端是**未压缩的旧版**（186KB～380KB），包内是压缩后版本（36KB～47KB）。全部不 404，全部画面会漂。
- 后端 URL（同源，把 `static/` 段去掉即可逐条复核）：`http://127.0.0.1:8080/api/v1/media/app-assets/assets/images/covers/<文件名>`。
- 独立复核（不信门自己的一面之词，用 curl + `sha256sum` 走另一条码路）：
  - `circle-food.png` 远端 = `97990598…`，本地 = `ba7c9efe…` ⇒ 与门报的 local/remote 方向一致，没有把两侧说反。
  - `campus-gate.jpg`（一条 PASS 项）远端 = 本地 = `ded23739…` ⇒ 同字节判定这条码路也在真判。

## 3. 反向守恒（localPrefixes = icons / svg-spec）：NOT-EVIDENCED，不是绿

`ASSETCOV_REVERSE_SCAN dist=apps/client/dist/build/mp-weixin band=MODE:mp-weixin-mock API:mock real档=否 扫描文本文件=806 app-assets串出现次数=2 命中localPrefixes引用=0（包内 localPrefixes 枚举=482）`
`ASSETCOV_REVERSE=NOT-EVIDENCED reason=产物档位不是 real（MODE:mp-weixin-mock API:mock）⇒ 这一档由 prepare-static 还原完整 static 树，本来就不证明 real 档的引用形态`

- 盘上唯一的 mp-weixin 产物是 **mock 档**（`config/env.js` 里 `VITE_API_MODE:"mock"`），且**没有** `CDN_OFFLOAD_MANIFEST.json`。本车道不许跑构建 ⇒ real 档产物这一轴**没取证**，门按 exit 2 报，不折算成"0 命中所以通过"。
- 扫到的 2 处 `app-assets` 串在 `utils/media.js` 与 `config/images.js` 里，都是前缀常量（不是指向 icons/svg-spec 的完整 URL）⇒ 命中 0。这一句只是说明扫描真的跑了，不是判绿依据。
- 参照系（L01 实测，本门不重复判它，只解释为什么这条判据要紧）：`assets/icons/` 350 个里 1 个 404、2 个差字节；`assets/svg-spec/` 132 个**全部**差字节。也就是说后端那份根本不能当 icons/svg-spec 的来源，产物一旦真去 http 拿它们，画面就漂、或直接空源。

## 4. 空集不许绿 + fail-closed（本轮实跑的各条前置失败读数）

| 场景（真实盘/参数） | 判决行 | exit |
|---|---|---|
| 契约缺失 `--buckets tmp/.../nope.json` | `ASSETCOV_CONTRACT=INVALID reason=契约文件不存在 …` + `ASSETCOV_RESULT=ERROR 分母=0` | 2 |
| 后端不可达 `--base http://127.0.0.1:18099` | `ASSETCOV_PROBE=UNREACHABLE … TypeError:ECONNREFUSED（连通性两发均失败）` + `ASSETCOV_COVERAGE 分母=166 200=0 404=0 DRIFT=0 其它=0 网络失败=166 ⇒ 本轮一个响应体都没拿到，"0 个问题"不可作为达标依据` | 2 |
| 产物目录不存在 `--dist …/no-such-dist`（本轮因同时有 6 条 DRIFT，硬缺陷优先） | `ASSETCOV_REVERSE=NOT-EVIDENCED` + `ASSETCOV_RESULT=FAIL` | 1 |
| 未知旗标 `--plans x` | `ASSETCOV_RESULT=ERROR reason=未知旗标 --plans …` | 2 |
| 老 node（无 fetch/AbortSignal.timeout） | `ASSETCOV_RESULT=ERROR reason=探针不可用…` | 2 |
| 枚举根口径写错 `--static apps/client/src/static`（真实盘，本轮实测） | `ASSETCOV_HINT 全部 6 个桶都枚举到 0 个文件 ⇒ 先核 --static 口径…` + `ASSETCOV_RESULT=FAIL 分母=0 … 空集桶=6 ⇒ 空集桶 static/generated/（目录不存在）；…`（8 条空集逐个点名） | 1（**红，不绿**） |

空集桶与"清单空"两例只能在夹具里造（不许动真实盘），见第 5 节 selftest。

## 5. `--selftest`：14 例，逐例都能红、撤掉都能绿

`/d/…/node.exe scripts/qa/verify-app-assets-coverage.mjs --selftest` ⇒ **rc=0**，`ASSETCOV_SELFTEST 用例=14 通过=14 失败=0`，`ASSETCOV_SELFTEST_RESULT=PASS`。
注入的坏件覆盖 6 类（题目要求 ≥4），每类都跑「注入→红」与「撤掉→绿」两发；负例是**真起一个临时 HTTP 服务**（`node:http`，随机端口）+ 真走同一条 `evaluate()` 码路，不是把判定函数 mock 掉。

| 例 | 注入/状态 | expect | got | 判决行命中 | verdict |
|---|---|---|---|---|---|
| green-baseline | 健康夹具 | 0 | 0 | RESULT=PASS | PASS |
| inject-404 | 后端删 1 张 | 1 | 1 | `ASSETCOV_MISSING rel=static/assets/images/covers/circle-food.png` | PASS |
| revert-404→绿 | 撤掉 | 0 | 0 | RESULT=PASS | PASS |
| inject-drift | 后端换成旧版字节 | 1 | 1 | `ASSETCOV_DRIFT rel=static/generated/images/campus/a-gate.jpg` | PASS |
| revert-drift→绿 | 撤掉 | 0 | 0 | RESULT=PASS | PASS |
| inject-empty-bucket-dir | 契约仍声明、桶目录被删 | 1 | 1 | `ASSETCOV_EMPTY prefix=static/assets/images/posters/` | PASS |
| revert-empty-bucket→绿 | 撤掉 | 0 | 0 | RESULT=PASS | PASS |
| inject-empty-cdnPrefixes | `cdnPrefixes: []` | 2 | 2 | `ASSETCOV_CONTRACT=INVALID` + `RESULT=ERROR 分母=0` | PASS |
| inject-reverse-http | 产物里塞一条把 icons 指后端的 http 串 | 1 | 1 | `ASSETCOV_REVERSE=FAIL` + `ASSETCOV_REVERSE_HIT file=components/leak.js` | PASS |
| revert-reverse→绿 | 撤掉 | 0 | 0 | `ASSETCOV_REVERSE=PASS` | PASS |
| dist-dir-missing→NOT-EVIDENCED | 产物目录不存在 | 2 | 2 | `ASSETCOV_REVERSE=NOT-EVIDENCED` | PASS |
| dist-non-real-band→NOT-EVIDENCED | 档位改 mock | 2 | 2 | 同上 | PASS |
| backend-unreachable | 端口没人听 | 2 | 2 | `ASSETCOV_PROBE=UNREACHABLE` | PASS |
| green-final-restored | 收尾复量 | 0 | 0 | RESULT=PASS | PASS |

夹具目录：`tmp/qa/fixtures/assetcov/`（永不入库；selftest 结束会自行 `rmSync` 清空，所以本节的日志跑完就没了，读数以上表为准）。

## 6. 接线三件套（主控串行做；本车道没碰任何载具）

1. **`.zcode/workflows/miniprogram-ui-audit-v38.dwf.ts` 的 `GATE_SUITE`**（:288 起那份数组，形状 `{ name, args, timeoutMs }`）。建议
   `{ name: "资产覆盖 verify-app-assets-coverage", args: ["scripts/qa/verify-app-assets-coverage.mjs"], timeoutMs: 120000 }`。
   排并发道 `GATE_SUITE` 而不是 `PANEL_SUITE`：它不取 UI/模拟器租约、不写权威判决件、只读 + 匿名 HTTP（实测 1.7 s，120 s 是 70 倍余量）；但它**要求后端在跑** ⇒ 与 `后端新鲜度 verify-backend-fresh` 同批（并发道内无先后，bash 侧建议紧跟其后）。
2. **`scripts/qa/run-final-verify-v33.sh`** 加一行 `g verify-app-assets-coverage 120 scripts/qa/verify-app-assets-coverage.mjs`（裸路径形态，被该脚本 `BARE_RE` 认；日志落 `.zcode/tmp/final-verify/verify-app-assets-coverage.log`，`g()` 会自动摘 `_RESULT=` 行）。
3. **`scripts/qa/verify-gate-list-sync.cjs`** —— 不用改它，但它是接线的验收判点，**本轮已经因为这扇新门判红**：
   实测 `gatesync rc=1`、`GATESYNC_ORPHANS=4 baseline=3`、点名 `ORPHAN scripts/qa/verify-app-assets-coverage.mjs`、`GATESYNC_RESULT=FAIL（判点数=14，不一致=1）`。
   ⇒ ①②必须**同批**点名（只加一边会同时踩"两侧清单不一致"和"孤儿门"两条判点）；两边都加后 orphan 回到基线 3、这一门才会转绿。
   条件性第四处：若带着第 2 节那 6 条 DRIFT 接进 DSL，必须把 ① 的 `name` 串（`资产覆盖 verify-app-assets-coverage`）加进 `WORKFLOW.acceptedReds`（v38 dwf:193），而 DSL 在 :1602 要求"白名单内必须被红探针证实仍能红"——本门的对应证据就是 `--selftest` 的 14 例。**先修 DRIFT 再接线的话，第 4 处不需要。**

## 7. 附带实测发现（交给主控裁，都不是本车道可写集）

- `apps/client/src/config/assets-index.ts:22-33` 在 real 档把基址拼成 `{apiRoot}/api/v1/media/app-assets/` + `static` + `/generated/...`，即多带一层 `static/` 且出现双斜杠。实测：
  - `…/app-assets/static//generated/images/campus/campus-gate.jpg` ⇒ **HTTP 400**
  - `…/app-assets/static/generated/images/campus/campus-gate.jpg` ⇒ **HTTP 404**
  - 契约口径（去掉 `static/`）`…/app-assets/generated/images/campus/campus-gate.jpg` ⇒ HTTP 200、与包内同字节
  ⇒ 该文件的 real 档 URL 与 `media.ts`/本门的口径不是同一条。当前影响面小：`CAMPUS_IMAGES`/`HOME_POSTER` 的仓内消费者只有 `services/agnes-video.ts`（及其单测），无 .vue 页面直接引用。本门不判它（判据是"契约 rel 必须 200"，多带 `static/` 的形态只作为 `ASSETCOV_URLFORM_NOTE` 报数不染色）。
- `scripts/verify-package-size.mjs:220` 自己就写着「匿名 GET 200 由 verify-app-assets-coverage 量」——本门正是那句话点名的债，两侧口径现在闭合（体积门管 fs+清单出包，本门管 HTTP 200+同字节+守恒）。
- 后端 `MediaAccessController#getAppAsset` 在 real profile 下还要 `media_asset` 表有 `type=app_asset` 且 `audit_status=approved` 的记录，否则 404。本门的 404 桶不区分「盘上没这文件」与「没注册/被驳回」，两种都必须补；要区分时看 `apps/api/uploads/app-assets/<rel>` 在不在盘上。

## 8. 未取证 / 限制（不许读成"通过"）

1. **反向守恒轴未取证**：盘上没有 real 档产物（只有 mock 档、且无 `CDN_OFFLOAD_MANIFEST.json`），本车道禁跑构建 ⇒ 该轴 exit 2。等 `build:mp-weixin:real` 落地后重跑本门才算真判。
2. 本门只到 HTTP 层：证明「匿名 GET 200 且逐字节等于包内那份」，**不**证明真机 `<image>` 能渲染（2026-09-03 那条"http 被基础库 3.16.2 拒载"的断言已被 2026-09-22 `wx.getImageInfo` 探针证伪，media.ts:291-306 有登记）。
3. 判据边界=契约：只枚举 6 个 cdnPrefixes。L01 点名的 `activities/ banners/ products/ home-split/ match/ register/` 等残留目录不在契约里 ⇒ 本门不量，等主控决定是否进桶（进了本门自动跟着量，不需要改代码）。
4. 不判 `media_asset` 注册/审核为何缺失，不判后端存储根，不改任何仓内文件（本轮只新建 `scripts/qa/verify-app-assets-coverage.mjs` + 本报告 + `tmp/qa/fixtures/assetcov/**` 夹具）。
5. 探测有重试（网络类错误重试一次），所以「404」与「网络失败」严格分桶：`网络失败` 计入 exit 2，不进 exit 1。本轮网络失败=0。

## 9. 最后一批码路修动与其复量（增量落盘，非重写）

- 修动三处，均为"让假绿更难发生"，不改任何判据阈值：
  1. 连通性探针原来在"首发网络失败、复发成功"时会把状态印成 `HTTP undefined`；现在如实写"首发失败 <原因>、复发通了 ⇒ 按可达算"。
  2. 网络错误明细把 undici 挂在 `cause`/`cause.cause` 上的 `ECONNREFUSED` 取出来（取不到会退化成 `bad port`/`fetch failed`），避免"后端没起"被读成"后端缺这张图"。
  3. 新增 `ASSETCOV_HINT`：所有 cdn 桶同时枚举到 0 时，点名"枚举根口径写错"这种操作事故（本门要 `apps/client/src`，不是 `apps/client/src/static`），仍然判红。
- 复量（改完在同一台机、同一份码重跑）：
  - `--selftest` ⇒ 用例=14 通过=14 失败=0，`ASSETCOV_SELFTEST_RESULT=PASS`，rc=0。
  - 真实全量 ⇒ `ASSETCOV_COVERAGE 桶=6 分母=166 200同字节=160 404=0 DRIFT=6 其它状态=0 网络失败=0`、`ASSETCOV_RESULT=FAIL … 字节漂移 6 个`，rc=1（与第 1 节同读数）。
  - `--static apps/client/src/static` ⇒ `ASSETCOV_HINT 全部 6 个桶都枚举到 0 个文件 …` + `ASSETCOV_RESULT=FAIL 分母=0 … 空集桶=6`，rc=1（写错口径不会变绿）。
  - `--base http://127.0.0.1:18099` ⇒ `ASSETCOV_PROBE=UNREACHABLE … TypeError:ECONNREFUSED（连通性两发均失败，首发 TypeError:ECONNREFUSED）`，rc=2。
- 门文件最终 565 行（`wc -l`）；`--check` 通过。
- 说明：`--selftest` 收尾会 `rmSync` 夹具目录（`tmp/qa/fixtures/assetcov/`），所以 selftest 的输出无法在该目录里留档；本报告第 5 节的表就是本轮终端读数的逐条誊写，重跑一次即可复现。
