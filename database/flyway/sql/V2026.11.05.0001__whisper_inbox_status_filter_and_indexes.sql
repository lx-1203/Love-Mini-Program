-- 第五辑审查修复（2026-11-05）
-- 1) R5-a：收/发件箱排序复合索引——findByReceiverId/queryByReceiverIdOrderByCreatedAtDesc
--    与 findBySenderId/queryBySenderIdOrderByCreatedAtDesc、countBySenderIdAndCreatedAtBetween
--    均按 (id, created_at) 排序/区间统计；此前仅有 (sender_id) 与 (receiver_id, status)，
--    排序需 filesort。10 万行量级前补齐（第四辑报告 R9-a 附注）。
--    注：idx_whisper_receiver_status 保留——countActiveBetween 的 receiver 分支仍可用。
-- 2) R5-1（同批登记）：PAY_FAILED/REFUNDED 审计行泄入收件人收件箱的修复在应用层
--    （WhisperMessageRepository 收件查询加状态过滤），本迁移只补索引；PAY_FAILED/REFUNDED
--    行的落库语义不变（账务对账仍依赖 client_request_id 关联，见 RealWhisperService 注释）。
ALTER TABLE whisper_message
    ADD KEY idx_whisper_receiver_created (receiver_id, created_at),
    ADD KEY idx_whisper_sender_created (sender_id, created_at);
