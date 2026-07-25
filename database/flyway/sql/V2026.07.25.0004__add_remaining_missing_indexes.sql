-- ============================================================
-- 迁移：补充第二轮审计发现的缺失查询索引
-- ============================================================
-- 背景：
--   第二轮索引审计发现以下高频查询字段完全无索引覆盖，
--   在数据量增长后将导致全表扫描。
--
--   1. users.phone              — 手机号登录/注册查询
--   2. users.created_at         — 用户列表按时间排序
--   3. private_messages.is_read — 会话未读计数
--   4. posts.status             — 帖子列表过滤（几乎所有查询都带 status='active'）
--   5. visitors.is_read         — 未读访客计数
--   6. heart_signals.status     — 待处理心动信号扫描
--   7. likes.status             — 有效点赞过滤
--   8. icebreaker_topics        — 话题分类+活跃状态筛选
-- ============================================================

-- 1. users.phone — 手机号登录
ALTER TABLE users
    ADD INDEX idx_users_phone (phone);

-- 2. users.created_at — 用户列表排序
ALTER TABLE users
    ADD INDEX idx_users_created_at (created_at);

-- 3. private_messages.is_read — 未读消息计数（组合索引覆盖 is_read 过滤）
ALTER TABLE private_messages
    ADD INDEX idx_pm_conv_read (conversation_id, is_read);

-- 4. posts.status — 帖子列表过滤
ALTER TABLE posts
    ADD INDEX idx_posts_status (status);

-- 5. visitors.is_read — 未读访客
ALTER TABLE visitors
    ADD INDEX idx_visitors_visited_read (visited_user_id, is_read);

-- 6. heart_signals.status — 待处理的信号扫描
ALTER TABLE heart_signals
    ADD INDEX idx_heart_signals_status (status);

-- 7. likes.status — 有效点赞过滤
ALTER TABLE likes
    ADD INDEX idx_likes_status (status);

-- 8. icebreaker_topics — 分类+活跃状态组合筛选
ALTER TABLE icebreaker_topics
    ADD INDEX idx_it_category_active (category, is_active);

-- 9. icebreaker_topics.usage_count — 按使用频率排序
ALTER TABLE icebreaker_topics
    ADD INDEX idx_it_usage_count (usage_count);
