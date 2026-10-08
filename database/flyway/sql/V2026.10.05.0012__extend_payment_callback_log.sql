-- ============================================================
-- 迁移：扩容支付回调日志表 payment_callback_log（回调全量留痕）
-- ============================================================
-- 背景（2026-10-05 微信支付工程补齐）：
--   原表仅记录 (notification_id, order_no, amount, status) 四个摘要字段，
--   回调验签失败/金额对账失败时无原始报文可查，支付争议无法取证。
--   本次扩容：
--   * raw_body        —— 回调 HTTP 请求体原文（TEXT）；
--   * headers         —— 关键请求头快照（Wechatpay-Timestamp/Nonce/Serial，JSON）；
--   * wx_transaction_id —— 微信支付交易单号（解密载荷回填）；
--   * mchid           —— 微信侧商户号（对账用）；
--   * detail          —— 处理结果详情（对账差异、失败原因）。
--
-- 幂等语义变更说明：
--   回调幂等主判定已迁移到 vip_order 状态机（订单已 SUCCESS 的重复通知直接
--   返回成功应答）；notification_id 唯一索引保留作为留痕去重与对账辅助。
-- ============================================================

ALTER TABLE payment_callback_log
    ADD COLUMN raw_body TEXT                                 COMMENT '回调HTTP请求体原文（验签/取证用）',
    ADD COLUMN headers VARCHAR(1024)                         COMMENT '关键请求头快照（JSON）',
    ADD COLUMN wx_transaction_id VARCHAR(64)                 COMMENT '微信支付交易单号（解密载荷回填）',
    ADD COLUMN mchid VARCHAR(32)                             COMMENT '微信侧商户号（对账用）',
    ADD COLUMN detail VARCHAR(512)                           COMMENT '处理结果详情（对账差异/失败原因）';

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- ALTER TABLE payment_callback_log
--     DROP COLUMN raw_body,
--     DROP COLUMN headers,
--     DROP COLUMN wx_transaction_id,
--     DROP COLUMN mchid,
--     DROP COLUMN detail;
