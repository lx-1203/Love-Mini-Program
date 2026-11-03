-- ============================================================
-- 迁移：帖子编辑留痕列 + 审核状态默认值统一为 pending
-- （审查修复 P1-1 / P0-1 / P2-9，2026-11-03）
--
-- 背景：
--   1. P1-1「更新帖子」：后端此前无 PUT /api/v1/posts/{id}，用户只能删了重发。
--      本迁移为 posts 表补编辑留痕列（edited_at / edit_count），
--      配合 VillagePostService.updatePost（编辑后重置 audit_status=pending 重新过审）。
--   2. P0-1 / P2-9 审核策略一致性：VillagePostService.createPost 自 2026-09-03 起
--      已显式写入 audit_status='pending'（先审后发），但列默认值仍是 'approved'
--      （V2026.06.25.0004 时代「先发后审」的遗留）——任何新增的写路径一旦
--      忘记显式赋值，帖子就会绕过审核直接可见。media_asset.audit_status 的
--      默认值自始就是 'pending'，两个内容域默认值不一致（P2-9）。
--      本迁移把列默认值收敛为 'pending'，与 service 层真实策略、media 域对齐。
--      存量行不改动（保持原审核结论）。
--
-- 注意：
--   * JPA 每次插入都会显式写入 audit_status（Post.auditStatus 字段初始化为 pending），
--     列默认值只是「漏写时的最后一道闸」，改默认值不改变任何现有代码路径的行为。
--   * ddl-auto=validate 只校验类型/可空性，不校验默认值；实体上的
--     columnDefinition 注释已同步改为 DEFAULT 'pending'。
-- ============================================================

ALTER TABLE posts
    ADD COLUMN edited_at DATETIME NULL DEFAULT NULL
        COMMENT '最近一次作者编辑时间（P1-1 编辑留痕；NULL=从未编辑）' AFTER updated_at;

ALTER TABLE posts
    ADD COLUMN edit_count INT NOT NULL DEFAULT 0
        COMMENT '作者编辑次数（P1-1 编辑留痕；每次成功编辑 +1）' AFTER edited_at;

ALTER TABLE posts
    MODIFY COLUMN audit_status VARCHAR(16) NOT NULL DEFAULT 'pending'
        COMMENT '审核状态: pending=待审核(新帖默认,先审后发) / approved=已通过 / rejected=已拒绝';
