# R2 截图矩阵（screenshot-matrix）

- 生成：2026-09-22（书记员-R2 整理落盘）；核对方式：Node 脚本读取全部 23 份 code-findings 的 issues/regressionLeads/newFindings 逐条 screenshot 字段并归一化统计；对其中引用的真实文件路径逐一 `fs.existsSync` 核对；`ls reports/screenshots/` 清点目录。

## 一、总量结论

- 本轮 295 条发现**全部为 Layer A 只读代码层审查产出，未产生任何本轮新截图**；不存在 `reports/screenshots/round-2*` 目录（ls 核实）。
- screenshot 字段取值分布（原文归一化，共 295 条）：

| screenshot 字段取值（归一化） | 条数 |
|---|---:|
| 无（其余变体，见原文） | 102 |
| （无 screenshot 字段） | 69 |
| N/A（其余变体，见原文） | 43 |
| 无（代码层审查，未截图） | 22 |
| （代码层发现，无截图） | 19 |
| N/A（Layer A 代码审查，未截图） | 18 |
| code-only（变体合并） | 16 |
| 引用既有文件路径（逐条见第二节） | 6 |

## 二、引用既有截图的存在性核对

> 少数发现的 screenshot/evidence 字段引用了**此前轮次**留下的截图作为旁证，逐条核对盘上存在性（脚本 fs.existsSync 实测）：

| 引用文件 | 引用它的发现 | 盘上 |
|---|---|---|
| reports/screenshots/round-1/A/PAGES_DISCOVER_INDEX-默认.png | MP-R2-PAGES-DISCOVER-INDEX-001、MP-R2-PAGES-DISCOVER-INDEX-002 | ✓ 存在 |
| reports/screenshots/r11-acceptance/B-b0919-r12b-subpackages_discover-extra_discover_match-success.png | MP-R2-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-001、MP-R2-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-004 | ✓ 存在 |
| reports/screenshots/r11-acceptance/A-b0919-r12b-subpackages_discover-extra_discover_match-success.png | MP-R2-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-002 | ✓ 存在 |
| reports/screenshots/r11-ideal/cur-match-success.png | MP-R2-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-009 | ✓ 存在 |

## 三、编译产物取证（login 密码框证据链复核）

- 发现 MP-R2-PAGES-LOGIN-INDEX-001 证据引用的编译产物路径（原文写「dist/build/mp-weixin/…」，相对 apps/client）：
  - `apps/client/dist/build/mp-weixin/pages/login/index.wxml`：存在，mtime=2026-09-22T01:25:15.073Z（本地 2026/9/22 上午9:25:15），7923 字节
  - `apps/client/dist/build/mp-weixin/pages/register/index.wxml`：存在，mtime=2026-09-22T01:25:15.072Z，7461 字节
- **快照差异（本会话实测，与发现引用时点不同）**：发现 001 引用的是 2026-09-22 05:50 构建产物（type="password" 原样透传、无 password 属性）；本会话复核时该文件已被 09:25 的重新构建覆盖，当前内容为 `type="text" password="{{true}}"`（grep -o '<input[^>]*login-password[^>]*>' 实测输出），对应源码 `apps/client/src/pages/login/index.vue:774 :password="true"`、git 工作区未提交 diff 显示 `-type="password"` → `+ :password="true"`——即该发现**在工作区已有修复**（详见 audit-report.md 第三节）。register 页对照 `password="{{M}}"/"{{af}}"` 维持原状。
- 本轮其余发现未引用任何图片/截图作为证据（证据均为代码 file:line、grep 命令与输出、i18n 键核对、pages.json/store 契约核对、编译产物单点取证）。

## 四、reports/screenshots/ 目录盘点（ls 实测）

现存目录/条目 22 个：2026-09-13-r3、2026-09-13-r4、2026-09-13-r5、final-verify、independent、r10-audit、r10-regress、r11-acceptance、r11-ideal、r6-admin、r6-editpage、r7-final-verify、r8-audit、r9-lifecycle、r9-lifecycle$name.png、register-verify、round-1、round-1-interact、round3、round3$1、round4、round5。其中与本轮相邻的上一轮（R1/第三周期）目录为 `round-1`（72+72 张双身份全页截图）与 `round-1-interact`（2397 张交互取证 png + 证据日志）；**本轮（R2）无新增截图目录**。
