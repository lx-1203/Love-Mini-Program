# R11 修车波处置登记（184 行 / 14 车道，来自车道交付件逐条处置行）

生成：2026-10-22　派单件：`tmp/qa/lanes/R11fix/dispatch-manifest.json`（51 批次 / 184 行 / 51 个互斥文件）
读法：本件只登记**处置声明**；每条是否真上屏由 `fix-visibility-R12.json` 按帧判。

## 过程事故（必须记，否则会被当成"一切顺利"）

本波派发时额度两次耗尽，实际经历了「14 → 9 → 1 → 14」的反复：

1. 第一发 14 条里只有 FXA / FXI 回报完成；
2. 磁盘上却有 9 份交付件——其中 **6 份只有骨架**（FXE/FXH/FXK/FXL/FXM/FXN），
   另 5 条（FXB/FXC/FXD/FXG/FXJ）连交付件都没有；
3. **最危险的一点**：这 8 条"死掉"的车道已经在 **14 个源文件**里留下了未记录的改动
   （FXD×2、FXE×3、FXG×1、FXH×3、FXK×2、FXL×1、FXM×1、FXN×1）。
   已先 `git diff` 全量备份到 `tmp/qa/r11fix-backup/partial-*.patch`（135KB），再验证
   `vue-tsc` 仍退 0（说明半成品在结构上自洽），才允许续做。
4. 重派时逐条要求"先 `git diff` 审自己的既有改动，保留/补完/纠正"，而不是覆盖重做。
5. 我方验收器自己也出过一次假绿：第一版用关键词「待填」判完成，而 FXF 的骨架写的是空的
   `- 处置：`，不含那两个字 ⇒ 被误判为完成。改成「字段是否为空」后才发现 FXF 有 51 个空字段。

## 计数
- 派发 184 行（13 P0 + 56 P1 + 其余含在同批次的 P2/P3），14 车道全部交件
- 越界写 **0 处**（49 个改动文件 ⊆ 51 个派发文件集）
- 两个派发文件未动，均有逐条理由：`EmptyState.vue`（FXA 判该卡证伪：`min-height:88rpx` 早已在盘）、
  `village/village/index.vue`（FXI 判 D08/D09 属取景前提，放宽登录门即违反 §12.2）

## 13 条 P0 的落点（全部走"接真字段"或"撤掉承诺"两种形态，无一条换新常量）
| defect_id | 处置 |
|---|---|
| R11-L01-D17 首页进度假计数 | 按四格现算（1/4→2/4、25%→50%） |
| R11-L04-D01 圈成员数哈希造数 | 整行撤下；追查发现卡建议改读的 `friendJoinedCount` 本身也是估算列（`RealCircleService:187-195`），故未接 |
| R11-L04-D15 学校卡写死数字表 | 整行撤除 |
| R11-L06-D01 昵称槽出兜底串 | 改既有「匿名用户」；蒙面态收起重复「在线」 |
| R11-L07-D01 角标 1 vs 概览 0/0/0 | 按真值收敛 |
| R11-L08-D18 CardSwiper 80% 假匹配 | 整块撤除（与 MatchSuccess 同批，§12.3） |
| R11-L09-D01 咨询价目表无真相源 | 价目/课程/讲师/报名控件整块撤除，落「筹备中」 |
| R11-L09-D13 「匹配概率提升 1.5 倍」 | 权益 5 格收 3 格，撤掉无实现支撑的两格 |
| R11-L10-D03 装饰图当本人生活照 | 撤 `DEMO_PHOTOS` 兜底，空态走灰骨架 |
| R11-L11-D15 无会话却断言「认识 1 天」 | 错误态撤掉整条身份带 |
| R11-L12-D15 步骤表漏「时间安排」 | 补步并在组件内映射旧编号 |
| R11-L13-D16/D19 legal「最后更新」现造 | 撤日期 + 披露兜底态；上游根因另记（客户端期望 `{items:[…]}`，后端返裸 record） |

## 主代理补做的三件事（车道写集之外）

1. **`native-switch-naming.spec.ts` 抓到真回归**：FXJ 按卡把 privacy 两枚原生 switch 改成自绘轨道后，
   两枚用了同一个 class ⇒ 把测试第 10 行记录过的「同页两枚选择器歧义」装了回来。
   已补 `--allow` / `--receive` 区分修饰类；测试同时重推导为「原生 switch 或 role="switch" 都算控件、
   总数仍钉死 9」，并新增「自绘开关必须带 aria-checked」。
   变异验证：删掉修饰类 ⇒ 该 spec 1 failed；还原后 10 passed。
2. **i18n 棘轮抓到真回归**：撤内容后 8 个键变成零消费者（1263 > 允许 1257）。
   删掉 zh/en 两侧对应 16 行后回到 1255 PASS。
3. **构建门抓到类型与单测都覆盖不到的错误**：`activities/detail.vue` 的样式块注释里写了
   `#{$text-tertiary}`，Dart Sass 在 loud comment 里照样求值 ⇒ `Undefined variable`，构建退 1。
   `vue-tsc`、`vitest`、`check-project-rules` 此时**全绿**——这条只有真跑构建才看得见。
   已改为不经插值的写法，并全仓扫过同形态（只剩 `_mixins.scss` 里两处合法插值）。

## 交付侧取证
- `vue-tsc --noEmit` 退 0
- `check-project-rules` 446 files / 0 errors / 150 warns → PASS
- `verify-i18n-orphan` PASS（孤儿 1255 ≤ 棘轮 1257，pair 差异 0）
- `vitest` 121 files / 1384 tests 全绿（三份规格按新契约重推导，非删断言）
- `build-real-isolated` G7_RESULT=PASS
