# 执行器/能力车道（carrier lane）2026-10-13 — 验收续作

来源：`reports/audit/ui-audit-2026-10-09/sort-round3.json` 的 `R3-OT-01` / `R3-02` / `R3-NET-04` /
`R3-08` / `R3-PFI25-03` / `R3-07`。本车道只做**离线可证**的执行器改造；活体重跑归后续带设备的车道。

边界：不碰 DevTools / wechatide / 浏览器 / 后端 / 任何设备腿。不碰 `verify-real-coverage.mjs`、
`apps/client/src/**`、`reports/audit/ui-audit-2026-10-09/tour-ledger.json`（并发车道在写）。不提交。

> **本文件的可信度声明（重要）**：原 carrier 车道在 150 回合上限中途死亡，最后一句是
> `Let me verify the file region state:`，下面这份骨架当时只有 1166 字节、从未填过。
> 续作车道**不继承、不采信**它的任何自述；本文一切结论都是续作车道当场从磁盘/运行时量出来的。
> 运行口径：Node 22（`D:/codex-tools/node-v22.17.0-win-x64/node.exe`）；PATH 上的 node 是 v16，
> 会把这些文件判成假红。

## 基线（续作车道接手时实测，机器行）

```
CAPRECIPES_TEST=PASS（checks=71）    SUMMARY: assertion failures = 0
CAPS_TEST=PASS（checks=65）          SUMMARY: assertion failures = 0
VERB_TEST=FAIL                       SUMMARY: assertion failures = 1
  FAIL 闸只在 STRICT_VERBS 下生效（非破坏性：不带旗标时旧腿的判决一字不变）
```

改动面（`git diff --stat`，未提交）：`case-recipes.json` +64 / `exec-capabilities.mjs` +366 /
`r-exec-cli.mjs` +78 / `r-exec-ws.mjs` +159 / `test-cap-recipes.cjs` +40 / `test-exec-verb-dispatch.cjs` +7。

## A. 开页形态 + handler 直调（R3-OT-01 / R3-02）—— 待核

## B. netFault functionDeclaration 集成 + 「臂展后置 + 页内重触发」判点形态（R3-NET-04 / R3-08）—— 待核

## C. PFI25 配方重排的核验（R3-PFI25-03 / R3-07）—— 待核

## D. 那条 RED 的处置（冻结字面量 vs 行为不变量）—— 待填

## 台账诊断被源码证伪之处 —— 待填

## 遗留 / 下一步（需要活体会话的事）—— 待填
