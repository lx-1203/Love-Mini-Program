-- ============================================================
-- 迁移：为 outbox_event 增加 dedup_key（幂等键）与 claimed_at（行认领时间）
--       （MQ 补偿链路 P0，2026-10-31）
-- ============================================================
-- 背景（实测自 V2026.08.09.0012__create_outbox_event.sql，非推测）：
--   outbox_event 建表时只有 PRIMARY KEY (id) 与一条【非唯一】索引
--     KEY idx_outbox_status_created (status, created_at)
--   ——表结构上不存在任何「同一业务事件只能有一行」的约束。
--   而 MessageProducer.compensatePendingEvents 是 @Scheduled(fixedDelay=30000) 的
--   定时任务，既无分布式锁也无行认领：它 findTop100ByStatus… 读出 PENDING 行后
--   直接 convertAndSend，发完才把状态写回 SENT。滚动重启 / 多副本期间两个 JVM 会
--   扫到同一批行并各发一次 ⇒ 每个 payload 被投递两次；消费端
--   （NotificationConsumer 无条件 new Notification() + save）没有幂等保护，
--   于是站内通知重复入库、微信订阅消息重复发送——而订阅消息是一次性配额，
--   重复发送直接烧掉用户仅有的一次推送机会。
--
-- 本迁移提供两列，配合代码侧改造：
--   1) dedup_key：业务事件幂等键（由生产者写入，来自消息体 eventId）。
--      + UNIQUE KEY uk_outbox_dedup_key ⇒ 同一业务事件在补偿表里【落不下第二行】，
--        这是数据库层给「生产者重试 / 双实例同时补偿落库」兜的底。
--        允许 NULL：无法确定业务身份的事件不强行赋键（MySQL 唯一索引不约束 NULL），
--        宁可少一层保护，也不能因为键算错而丢掉真实事件。
--   2) claimed_at：行认领时间（配合 status='IN_PROGRESS'）。
--      补偿任务改为「先按 id 条件更新认领（UPDATE … WHERE status='PENDING'），
--      只有影响行数 == 1 才允许投递」——这是跨 JVM 重复投递的【真正】防线，
--      Redisson sweep 锁只是纵深防御。claimed_at 同时用于回收
--      「认领后进程被杀」的僵尸行（超过超时阈值重新置回 PENDING），
--      否则新增 IN_PROGRESS 状态会把事件永久卡在中间态（比改造前更糟）。
--      注意 status 列是 VARCHAR(16)（非 ENUM、无 CHECK 约束），故 'IN_PROGRESS'
--      （11 字符）可直接写入，无需本迁移修改列定义。
--
-- 回填口径（存量行，必须【确定性】且【不得合并合法的不同事件】）：
--   dedup_key = CONCAT('legacy-', LPAD(id,20,'0'), '-', LEFT(SHA2(CONCAT(
--                   queue_type,'|',routing_key,'|',payload_json), 256), 24))
--   * 确定性：完全由行自身已有列算出，同一行重跑本 UPDATE 得到同一值
--     （迁移中断后重放安全，不会把历史行改出一堆新键）。
--   * 不合并：键里嵌了本行 id ⇒ 每行必然唯一，唯一索引建立时不会与任何行相撞。
--     反之，若只按 payload 哈希回填就会出错：本缺陷本身已在表里留下过
--     「两行 payload 完全相同」的记录，而这类记录既可能是 bug 造成的重复，
--     也可能是【合法的不同事件】（同一用户同一秒内两次语义相同的互动、
--     签到事件 payload 不带唯一 id 等）。从存量数据无法区分这两者，
--     所以回填既不能把它们折叠（会丢真实通知），也不能让它们共享一个键
--     （会让 ADD UNIQUE INDEX 直接失败，迁移跑不完）。
--   * 因此 legacy- 前缀的键只用于「行自身可追溯」，不参与跨行去重；
--     真正具备跨行去重能力的键，只来自本迁移之后由生产者写入的 eventId。
--     运维识别方式：dedup_key LIKE 'legacy-%' 即存量行。
--   * 长度核算：'legacy-'(7) + LPAD(id,20)(20) + '-'(1) + SHA2 前缀(24) = 52
--     ⇒ VARCHAR(64) 够用（eventId 为 UUID 时 36 字符，同样够用）。
--
-- 字段说明：
--   * dedup_key  VARCHAR(64) NULL COMMENT 业务事件幂等键（唯一索引）
--   * claimed_at DATETIME    NULL COMMENT 补偿任务认领该行的时间（僵尸认领回收依据）
--   * idx_outbox_claim (status, claimed_at)：扫描超时 IN_PROGRESS 行用，
--     已有 idx_outbox_status_created 只覆盖 (status, created_at)，帮不上这个查询。
--
-- 部署顺序（重要）：本迁移必须先于应用发版执行——
--   application-real.yml 的 hibernate ddl-auto=validate 会校验实体列，
--   OutboxEvent 新增 dedupKey/claimedAt 映射后，缺列会导致上下文启动失败（预期行为）。
--
-- 回滚（Flyway 不自动回滚，手动执行）：
--   DROP INDEX uk_outbox_dedup_key ON outbox_event;
--   DROP INDEX idx_outbox_claim ON outbox_event;
--   ALTER TABLE outbox_event DROP COLUMN dedup_key, DROP COLUMN claimed_at;
--   （回滚前先把 status='IN_PROGRESS' 的行置回 PENDING，否则僵尸行无人认领：
--     UPDATE outbox_event SET status='PENDING', claimed_at=NULL WHERE status='IN_PROGRESS';）
-- ============================================================

ALTER TABLE outbox_event
    ADD COLUMN dedup_key VARCHAR(64) DEFAULT NULL COMMENT '业务事件幂等键（生产者 eventId；legacy- 前缀为存量行回填，不参与跨行去重）' AFTER payload_json,
    ADD COLUMN claimed_at DATETIME DEFAULT NULL COMMENT '补偿任务认领该行的时间（用于回收认领后进程崩溃的僵尸行）' AFTER sent_at;

-- 存量行确定性回填：WHERE dedup_key IS NULL 使本语句可安全重放（幂等）。
UPDATE outbox_event
   SET dedup_key = CONCAT(
         'legacy-',
         LPAD(id, 20, '0'),
         '-',
         LEFT(SHA2(CONCAT(queue_type, '|', routing_key, '|', payload_json), 256), 24)
       )
 WHERE dedup_key IS NULL;

-- 回填完成后再建唯一索引：若上面「不合并」的假设被现实推翻（出现重复键），
-- 这里会直接报错而不是静默丢事件，符合 fail-fast 口径。
CREATE UNIQUE INDEX uk_outbox_dedup_key ON outbox_event (dedup_key);

CREATE INDEX idx_outbox_claim ON outbox_event (status, claimed_at);
