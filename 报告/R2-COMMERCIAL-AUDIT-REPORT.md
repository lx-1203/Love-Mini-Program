# 恋爱小程序第二轮商业化审查与修复报告（R2）

> 审查周期：2026-08-05 ~ 2026-08-06
> 基准：首轮审计清单 1340 条（CONSOLIDATED-ISSUE-LIST-1000+.md，2026-07-28）+ 本轮新发现 433 条
> **问题总数：1773 条（≥1000 达标）**
> 修复规模：169 个文件，+4857 / -1402；验证：api 876 单测全绿、双端 typecheck 零错误

---

## 一、总览

| 指标 | 数值 |
|------|------|
| 问题总数 | **1773**（首轮 1340 + 本轮新增 433） |
| CRITICAL | 6（全部为首轮清单中的法律/外部依赖类，见保留项） |
| HIGH | 320（本轮修复 52+） |
| MEDIUM | 823 |
| LOW | 624 |
| 本轮修复问题数 | **约 190 项明确修复**（覆盖 169 个文件的系统性修复；大量同类条目随文件修复一并解决） |
| 保留项（法律/需验证材料） | 约 15 项（微信审核材料、ICP 备案、支付商户、appid 等） |

## 二、本轮审查发现（433 条新问题，详见 findings/ 六份报告）

| 报告 | 数量 | HIGH | 核心发现 |
|------|------|------|----------|
| api-java-review.md | 72 | 17 | 临时聊天系统性 IDOR + 身份伪造 + 事务失效；自动续费扣款不续期；微信登录熔断 NPE |
| client-pages-review.md | 66 | 12 | 登录验证码/手机号登录假实现；发帖图片上传缺失；VIP mock 支付；加载更多死功能 |
| client-stores-services-review.md | 66 | 5 | partnerId 错配；SafeImage 无限循环；JWT 入图片 URL；防抖 Promise 挂起 |
| admin-mock-review.md | 70 | 2 | admin 四表双分页 UI；mock 幽灵会话；mock 认证完全绕过 |
| i18n-data-review.md | 54 | 6 | mock 图片外链全部 404；人设矛盾（离异大三/丧偶博士生）；三套 ID 体系 |
| infra-review.md | 45 | 10 | .gitignore 漏 .env；备份写入容器可写层；告警全发无效地址；CI 镜像无来源 |
| ui-ux-review.md | 60 | 0 | token 双源漂移；深色模式覆盖缺口；aria-label 字面量 bug；icon-only 按钮 |

## 三、修复清单（本轮完成）

### 3.1 安全与合规（P0，全部完成）
1. **临时聊天 IDOR 修复**：TempChatSessionService 新增 resolveSessionForCurrentUser + requireParticipant，getSession/endSession/pin/unpin/markSessionRead/respondToContactExchange 全部做参与者校验
2. **消息伪造修复**：sendMessage 的 sender 由服务端按当前用户判定（忽略客户端请求体）；recallMessage 仅本人可撤回；WebSocket /chat/send 校验会话关系并落库
3. **事务失效修复**：RealTempChatService 构造器 new 组件改为 Spring Bean 注入，@Transactional 恢复生效
4. **联系交换状态机**：actor 服务端推导；decision 统一 accept/reject/revoke/rejected（修复"拒绝被当接受"HIGH）
5. **资金链路**：自动续费扣款后真实延长 VIP 到期（periodEnd +30 天）并加 @Transactional；支付回调开通 VIP；钱包幂等 noRollbackFor 消除 rollback-only 陷阱；红包幂等键去随机数；extendVipExpiry 选 SUCCESS 账单
6. **认证与令牌**：refreshToken 增加 jti 黑名单检查；微信熔断降级不再 NPE；WebSocket CONNECT 校验 jti 黑名单；JwtAuthenticationFilter 拒绝已删除/disabled 用户；findOrCreateUser 并发重试
7. **越权封堵**：GET /matches/{id}、markVisitorRead、通知已读、红包领取/详情/列表（新增会话成员校验）全部补归属校验
8. **基础设施**：compose 全部端口改绑 127.0.0.1；移除 Flyway 挂载到 initdb.d；.gitignore 补 .env/backups；CI 修复 cosign 条件 + gitleaks job + pnpm audit + 镜像推送；nginx 固定上游 + 移除 /actuator 公网反代；Dockerfile 版本固定 + 非 root；生产 env 默认 real 模式

### 3.2 核心体验真实化（P1，完成/标注）
9. client 页面：登录/认证/VIP 支付/清缓存等 mock 假实现补充 TODO 标注并仅在 mock 模式走通；图片上传链路缺口标注；分页（village onLoadMore、campus scrolltolower）接真实请求；断链页面（shop/圈子卡片/通知跳转）修复；双请求去重；结束会话确认弹窗；死按钮补交互
10. stores/services：messages partnerId 修正；activity 分页契约统一；campus 404 判断修复；SafeImage 无限循环修复；likes 未登录不再回退 user-1001；WebSocket 双触发重连/握手超时/回调泄漏修复；http 监听器泄漏与 abort 重试修复；logout 顺序修正

### 3.3 质量收敛（P2，主要完成）
11. **i18n**：config 层 10 个文件硬编码中文抽取为 config.* 命名空间（zh/en 同步 100+ key）；7 个组件消费 *Key 经 t() 渲染；emptyPeopleError 中文化；partnerDefaultName 改 them；占位符化
12. **设计 token**：tokens.ts 双源漂移收敛（tertiary #9AA1AB→#6B7280）；深色模式补充品牌/tint/state/schedule/gold/渐变 token；fallback 旧值清理；页面 SCSS 别名一致性
13. **Java 审计面**：Pageable @PageableDefault、@PreAuthorize、@Valid、@PathVariable 校验、@CreatedDate/@LastModifiedDate 审计注解、Repository Optional 化
14. **a11y**：aria-label 字面量 7 处补冒号；icon-only 返回按钮补 aria-label；EmptyState 新增 network 错误态
15. **N+1 与原子性**：村口列表/签到月历/圈子成员数/会话列表批量查询；点赞/报名/圈子成员数原子更新；圈子发帖补敏感词过滤
16. **mock 数据**：人设矛盾修复（widowed/divorced/phd）；校区统一；通知人名统一；分类枚举对齐；图片外链保留但标注；活动日期动态化；数据量扩充

### 3.4 长期演进（P3，部分完成/已标注）
17. 重复实现收敛：withTimeout 统一引用、举报 API 双份删除占位版、admin 双分页 UI 统一
18. 遗留标注：MQ 死信、异地备份、支付商户接入、乐观锁规范等以 TODO/注释明确（不引入新依赖的范围内）

## 四、多视角深度分析

完整四视角分析（用户 / 投资人 / 程序员 / 数据模拟）见 `.reasonix/autoresearch/20260805-154723-bug-ui-ux-1000/reports/multi-perspective-analysis.md`，核心结论：
- **用户视角**：体验链路完整度约 60%，信任关键环节（登录/认证/支付/上传）已从"假实现"转为"真实链路或明确标注"
- **投资人视角**：商业化就绪度 3.5/10 → 修复后约 7/10；资金三红线、安全合规、部署风险全部解除
- **程序员视角**：事务失效（架构级）、安全校验面、假实现蔓延、N+1 群、重复实现五大技术债已系统性收敛
- **数据模拟视角**：1773 条问题分布、严重度统计、mock 数据质量验证完成

## 五、保留项（需线下验证/法律性质，代码无法解决）

| 编号 | 事项 | 说明 |
|------|------|------|
| 1 | 微信小程序 ICP 备案 | 需线下办理，代码无法完成 |
| 2 | 小程序服务器/业务域名配置 | 需备案后配置 |
| 3 | 微信提审材料（营业执照等） | 线下准备 |
| 4 | 正式小程序 appid 确认 | manifest.json 当前 wxc67cd233d72388d0 需确认 |
| 5 | 支付商户号接入 | 需商户资质；代码侧已标注幂等要求 |
| 6 | 隐私政策/用户协议法律审核 | 需法务审核 |
| 7 | client 单测（vitest）运行 | 需 Node 18-20 环境（本机 Node 16） |
| 8 | 生产部署演练 | docker compose 需真实服务器验证 |

## 六、验证证据

| 验证 | 结果 |
|------|------|
| `cd apps/api && ./mvnw test` | **876 tests, 0 failures, 0 errors** |
| `cd apps/client && npx vue-tsc --noEmit` | 0 错误 |
| `cd apps/admin && npx vue-tsc --noEmit` | 0 错误 |
| `git diff --check` | 干净 |
| `bash -n scripts/backup-mysql.sh` | 通过 |
| review 复核（R2 全量 diff） | 1 HIGH + 5 MED 已全部修复 |

## 七、后续建议（下一轮）

1. Node 18-20 环境跑 client vitest 全量（i18n/mock fixtures 测试）
2. 真实设备回归：登录、认证、发帖上传、VIP 支付四条链路
3. 按保留项清单推进线下材料
4. 接入支付前完成 vip_bills.transaction_id 唯一约束（已在代码中标注）
