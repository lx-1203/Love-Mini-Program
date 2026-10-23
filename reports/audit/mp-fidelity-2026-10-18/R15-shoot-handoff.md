# R15 复拍腿交接（2026-10-23 09:05Z 断点）：盘上状态、卡在哪、下一步照哪跑

本轮 R14 已完整收口并推送（见文末读数）。R15 是**验证 R14fix 是否真上屏**的那一腿，
它需要设备腿（微信开发者工具 automator 通道），而这一腿在断点上是断的。
本文只记实测状态与可复现命令，不记推测。

## 一、已经做完、不用重做的部分

| 步 | 状态 | 读数与出处 |
|---|---|---|
| R14 找茬 14 车道 | 完成 | `verify-finder-lane`：可用帧 134、`hash_mismatch=0 ungrepable_citations=0 axis_invalid=0`，defects=204 |
| R14 聚合 | 完成 | `AGGREGATE_RESULT=PASS defects=204 batches=76 rejected=0 互斥=成立` → `fixlist-R14.json` |
| P1 落判 | 完成 | `R14-p0-adjudication.md`：15 派修 / 2 在册 / （车道另证伪 1） |
| R14fix 七车道 | 完成 | 53 修 / 2 在册 / 1 证伪；逐车道 brief↔交付件行号集合比对**零漏行**（`FXA/FXB/FXC/FXD/FXE/FXF/FXG.md`） |
| 四道门（合并态复跑） | 全绿 | vue-tsc exit 0｜vitest 121 files/1384 tests｜check-project-rules 446 files/0 errors/152 warns｜`I18N_RESULT=PASS` |
| 缺陷册 | 完成 | `defects-R14.md`：条数=204 页面=67 帧=132 空帧段=0 |
| 发布链重建（R15 用） | **PASS** | `tmp/qa/build-R15b.log`：`RELEASECHAIN_RESULT=PASS steps=13 out=apps/client/dist/build/mp-weixin-real`（首跑 `build-R15.log` 是 FAIL，见下） |
| fixvis 豁免件 | 已备 | `fixvis-expected-unchanged-R15.json`：6 个帧 / 7 条车道自陈零像素行，每条引用 FX 交件原文 |

## 二、断点：设备腿的档位不符

1. 第一次发布链跑**失败**：`RELEASECHAIN_RESULT=FAIL reason=prestate-restore-exit-1`，
   根因是 `[prepare-static]` 的 `mv static_prepare_6116_… -> src\static: Permission denied`。
   链自己回滚并中止（"不带半棵树上构建"），工作树零污染（`git status apps/client/src` = 0 行）。
   **直接重跑同一发就过了** ⇒ 判为 Windows 目录句柄瞬时占用，不是状态坏了。
   另记：后台包装命令的 exit=0 会盖住脚本真实退出码，必须读日志里的 `BUILD_EXIT=` 行。
2. `open-project-window.mjs --project <real dist> --settle 20` 跑了 500s 被我 timeout 杀掉（exit 124，
   属载具不属被测物），期间连续多次 `automation_evaluate` 成功返回 ⇒ 开窗动作本身在推进。
3. 但 `ws-channel-up.mjs` 报 **`WS_UP_BAND_RESULT=mismatch exit=2`**：
   通道上活着的实例与 `--project` 档位不符。它明确拒绝——
   "拿它出帧会得到标签与画面不一致的证据（round-8b 的 real 标签 × mock 画面就是这么来的）"。
   同时给的话只有两条：① 改走 CLI 桥出帧；② 这一腿按 `NOT_SHOOTABLE` 记账换载体。
   **两条都不能拿来出 R15 的保真帧**：CLI 桥是 193x413，与本轮 14 轮沿用的
   automator 378x814 不同尺，覆盖门自己写着"禁与 CLI 跨尺比像素"。
4. 用 PowerShell 数了一遍进程：活着的 8 个 `WeChatAppEx` 全部来自
   `Tencent\xwechat\xplugin\plugins\RadiumWMPF\…\runtime`，那是**微信桌面客户端**的小程序运行时，
   不是微信开发者工具。⇒ 开发者工具主进程当前不在盘上，端口上那个实例是历史遗留的自动化实例。

**结论：R15 取景必须先有一个真·冷启的开发者工具实例挂在 real 产物上，`ws-channel-up` 退 0 才允许出帧。**
不许在 mismatch 下硬出帧，也不许把这一腿记成"这一档已经测过"。

## 三、下一程照这个顺序跑

```bash
cd "D:/6/恋爱小程序"
# 1) 清掉历史自动化实例（只杀自动化 IDE，别碰微信客户端的 WeChatAppEx）
#    先数一遍确认归属，再按 pid 点杀；close() 会关掉整个 IDE 实例，冷启时正好
# 2) 冷启挂 real 产物（冷编译实测要等 ~200s，别用短 timeout）
/d/nodejs/node.exe scripts/qa/open-project-window.mjs \
  --project "D:\6\恋爱小程序\apps\client\dist\build\mp-weixin-real" --settle 20
# 3) 门：档位必须退 0，否则回到第 1 步，不要继续
/d/nodejs/node.exe scripts/qa/ws-channel-up.mjs    # 期望 WS_UP_BAND_RESULT=ok exit=0
# 4) 全量复拍 R15（140+ 帧，每帧实测 15→55s，预算按最大值给；login 这轮会自然进分母）
/d/nodejs/node.exe scripts/qa/shoot-fidelity-sweep.mjs \
  --ledger reports/audit/mp-fidelity-2026-10-18/baseline-ledger.json \
  --round R15 --identity A --params scripts/qa/fidelity-sweep-params.json \
  --out tmp/qa/frames/R15/real-f0677920
# 5) 三道门 + 收口
node scripts/qa/verify-sweep-coverage.mjs --ledger ... --manifest tmp/qa/frames/R15/real-f0677920/sweep-manifest.json --blocked reports/audit/mp-fidelity-2026-10-18/blocked-routes.json
node scripts/qa/verify-fix-visibility.mjs --prev tmp/qa/frames/R14/real-f0677920/sweep-manifest.json \
  --cur tmp/qa/frames/R15/real-f0677920/sweep-manifest.json \
  --fixlist reports/audit/mp-fidelity-2026-10-18/fixlist-R14-dispatched.json \
  --expected-unchanged reports/audit/mp-fidelity-2026-10-18/fixvis-expected-unchanged-R15.json \
  --out reports/audit/mp-fidelity-2026-10-18/fix-visibility-R15.json
node scripts/qa/verify-admin-roundtrip.mjs --round R15 --out reports/audit/mp-fidelity-2026-10-18/roundtrip-R15.json
# 6) 派单件要先补一份"过滤版"再喂 fixvis（同 fixlist-R13-dispatched 先例）：
#    按 tmp/qa/lanes/R14fix/dispatch-manifest.json 的 dispatchedBatches 过滤 fixlist-R14.json
#    → reports/audit/mp-fidelity-2026-10-18/fixlist-R14-dispatched.json
# 7) R15 找茬波（emit-fidelity-lanes --round R15 --all --fixed fixlist-R14-dispatched --fixvis fix-visibility-R15）
```

## 四、两个已知会红的点，先说清免得当成回归

1. **7 条零像素行**（FXC L01-D05 热区、FXF L10-D24/D25、FXG L08-D05 / L07-D10 / L07-D17 / L07-D21）
   已由 `fixvis-expected-unchanged-R15.json` 逐条引用车道自陈处置豁免。
   豁免件是"书面处置"，不是放宽判据：若这些帧真出现差异，要回头查是谁改的。
2. **FXA 自己登记的一条来回风险**：R14-L08-D01 按卡执行后视口余量集中成 action 与 footer 之间一条带，
   与 R11-L08-D10（center→space-between）的判点构成两轮来回风险。R15 泳道若重报同轴，
   要先读 FXA.md 这段再判，别直接算新增。

## 五、本轮已推送的账（origin/main）

`426a0ed8` R14 复拍腿三件 + 历史证据回填 → `7ad36e5d` login 取景仪器修复（coverage 判据翻绿）
→ `9ffcbb9f` R14 聚合与落判 → `9088b4a5` R14fix 修车波 → `3f2caa76` R14 缺陷册。
收口门读数：`FIDELITY_CLOSEOUT_RESULT 判据=8 不中=1`，唯一不中是 `newdefects`
（末轮 P1 需为 0，正等 R15 复拍 + R15 找茬波来判）。
