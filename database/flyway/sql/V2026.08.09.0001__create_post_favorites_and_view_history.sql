-- ============================================================
-- 迁移：帖子收藏 + 浏览记录 + 浏览量（论坛互动真实化）
-- ============================================================
-- 背景（用户需求 2026-08-08）：
--   1. post_favorites：帖子收藏记录表（收藏 toggle 真实落库）
--      —— 仿 post_likes 结构：UNIQUE(user_id, post_id) + FK 级联
--   2. post_view_history：帖子浏览历史表（登录用户浏览 upsert 刷新）
--      —— UNIQUE(user_id, post_id)，重复浏览仅刷新 viewed_at
--   3. posts.view_count：帖子浏览量（详情读取时原子 +1，匿名也计）
--
-- 注意：
--   * version 列必带（V2026.07.26.0003 起全业务表要求，实体 @Version，
--     ddl-auto=validate 会校验列名/类型/约束名与实体一致）
--   * 约束/索引命名与实体 @Table/@UniqueConstraint/@JoinColumn 逐字一致
-- ============================================================

-- ========== 1. 帖子收藏记录表 ==========
CREATE TABLE IF NOT EXISTS post_favorites (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '收藏用户ID',
    post_id BIGINT UNSIGNED NOT NULL COMMENT '被收藏帖子ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    PRIMARY KEY (id),
    -- 联合唯一约束：同一用户对同一帖子只能有一条收藏记录（幂等）
    UNIQUE KEY uk_post_favorites_user_post (user_id, post_id),
    -- 外键约束：关联用户表和帖子表（级联删除）
    CONSTRAINT fk_post_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_favorites_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    -- 索引：加速按用户或帖子查询收藏记录
    KEY idx_post_favorites_user (user_id),
    KEY idx_post_favorites_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='帖子收藏记录表';

-- ========== 2. 帖子浏览历史表 ==========
CREATE TABLE IF NOT EXISTS post_view_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '浏览用户ID',
    post_id BIGINT UNSIGNED NOT NULL COMMENT '被浏览帖子ID',
    viewed_at DATETIME NOT NULL COMMENT '最近浏览时间（重复浏览 upsert 刷新）',
    version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    PRIMARY KEY (id),
    -- 联合唯一约束：同一用户对同一帖子仅保留一条浏览记录
    UNIQUE KEY uk_post_view_history_user_post (user_id, post_id),
    -- 外键约束：关联用户表和帖子表（级联删除）
    CONSTRAINT fk_post_view_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_view_history_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    -- 索引：加速按用户查询浏览历史 / 按帖子查询浏览者
    KEY idx_post_view_history_user (user_id),
    KEY idx_post_view_history_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='帖子浏览历史表';

-- ========== 3. posts 表新增浏览量列 ==========
ALTER TABLE posts
    ADD COLUMN view_count INT NOT NULL DEFAULT 0 COMMENT '浏览量（详情读取原子 +1）' AFTER share_count;
