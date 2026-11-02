# 第八轮：修复残留项 + 审查总账（2026-11-02 深夜）

上游：第七轮审查总账（`2026-11-02-round7-audit.md`）§1 里唯一剩的可修代码项 + 三条新审查轴。
执行形态：子代理配额窗口至 11-03 00:24 未开，全部由主控串行完成。

## 1. 修复（提交 `bc326fc1`）

**E F-3/F-4：第三轴的 CREATE 体盲区与单点泛化** —— `namedReferenceHits` 列源从
`ErasureMigrationGraph.columnsByTable()`（只认 CREATE 体）换成 `buildSchema()`（ALTER/ADD COLUMN/
存储过程补列全认）；列名→清单表匹配加单复数归一（+s/+es/y→ies）。**实测命中 1 → 35**：
35 条全部是「命中表已在清单内受看管」的形状（多为清单表自身无 FK 的 `user_id→users` 与
`comment_likes.comment_id→comments` 一类），**无新逃逸**——泛化能力从单点变成真有覆盖面的轴，
而穷尽判点（命中表必须点名或豁免）保持原样。防空转报数改成动态（`当前命中=N：[...]`），
不再留「全库 0 命中」那种静态旧串（本次取真值时它误导过一次，已修）。
读数：清除域显式类清单 **44/44 绿**（1 skip 真库门）；全量 `mvnw test` **1910/0/11**。

## 2. 审查三轴（主控串行；判定全部回到盘上读数）

### R8-A｜资金域端到端（wxpay 回调 → vip_order/bills → wallet）—— 阴性，两处关键面确认

- **支付回调链**（`BillingController` → `WxPayCallbackVerifier` → `VipOrderService.handlePayNotification`）：
  RSA-SHA256 验签 + 时间戳容差防重放 + notificationId 幂等 + **金额对账**（回调 total vs 服务端订单
  定价，容差 1 分，缺失即 FAIL——「1 分钱买会员」的洞不在）+ 状态机迁移（PENDING→PAYING→SUCCESS，
  竞态两处兜底：IllegalOrderStateException 幂等应答、乐观锁冲突幂等应答）+ 账单写入失败返回 FAIL
  触发微信重试（transaction_id 唯一约束防重复账单）。
- **退款回调**（`WxPayRefundNotifyController`）：同一验签器 + REFUNDING/SUCCESS→REFUNDED 状态机。
- **unlock 无身份旁路确认**：`RealWalletUnlockService` 全文无 VIP 概念，任何身份直调
  `/wallet/unlock` 都按定价扣费——与客户端「后端无旁路、VIP 免费只在本地」的注释一致；
  「VIP 解锁不落库、刷新回退」是已登记遗留债（第六轮），非新发现。

### R8-B｜前端 store 层系统性 —— 阴性：answerHasMore 病族不复制

- `hasMore: true` 冷启动全仓 8 处（activity/messages×2/discover/campus/circle/search + discover/storage
  复位）。逐个查消费者：**渲染可见「加载更多」入口的只有 3 页**，其中 search 是反向判据
  （`v-if="!hasMore && posts.length>0"`——冷启动隐藏，安全）；circles/topic-detail 的
  `repliesHasMore` 与 village/detail 的 `commentHasMore` 都是**派生式 computed**
  （已加载数 < 服务端总数），首拉前恒 false——这正是第七轮裁定的正确形态。
  store 层的冷启动 true 只驱动滚动拉取（多发一次空页请求后自愈），不驱动可见入口。
- 登出登记：`logout-registry.spec.ts` 穷尽门在链内（chain EXIT=0），无漂移。

### R8-C｜判据字面钉死复扫（rounds 6-7 新 spec）—— 阴性：精确计数都是行为钉

逐条归类 7 个新 spec 里的精确断言：`reqCount("/products")===1`、`/matches/like` 计数、
`fetchActivityDetail\(` 单入口、充值请求计数、注册表 Set 相等——全部是**受控桩环境下的行为
不变量**或**登记表对账**（改动面须显式过账），不是钉易漂内容（anchor=11、corpus=1107 那族）。
基线类（a11y 23/61、press 尾单 2 页）都是只许降棘轮；防空转用的是下限地板（≥7/≥30/≥2）。

## 3. 终验

链 35 条 `CONTRACTS_EXIT=0`（含 i18n 四维）· 后端 `1910/0/11` · 客户端 166 文件/1733 例
（本批未触客户端，上轮全量读数仍有效）· qa 自检 1/64（唯一红为真机腿，不变）。

## 4. 边界（不变）+ 下一步

真机 measure 腿 · CI 首跑（静态两项已修，Trivy 棘轮待首跑）· 真容器 textfile 5 项 ·
DBA/影子库（79 条真执行）· 多副本限流。子代理配额 11-03 00:24 重置后可再派深水车道
（候选轴：消息域实时链路、admin 写面全量反证、`ensurePrivacyAuthorized` 真机形态）。
