-- ============================================================
-- 迁移：把 5 条【已应用但不可重放】的历史迁移的 schema 终态收敛成 guarded 形态
--       （S3-A，2026-10-31）
-- ============================================================
-- 为什么改不了那 5 个文件本身（实测，非推测）：
--   SELECT version, success, checksum, installed_on FROM flyway_schema_history
--    WHERE version IN ('2026.07.27.0003','2026.08.08.0003','2026.08.10.0032',
--                      '2026.08.15.0004','2026.10.05.0001','2026.10.31.0002');
--   ⇒ 前 5 条全部 success=1（已应用，installed_on 2026-08-26 ~ 2026-10-09），
--     '2026.10.31.0002' 返回 0 行（尚未应用，故那条单独重写成 guarded）。
--   Flyway 用 checksum 校验已应用文件；改动其中任何一个的字节内容都会让下一次
--   migrate 以 "Migration checksum mismatch" 直接失败 ⇒ 这 5 个文件【必须保持原样】。
--   本仓已有同类先例与口径：scripts/qa/index-impact-2026-10-30.md
--   「已应用的迁移文件不可改写（Flyway 校验和），故留在原地」。
--
-- 已知非幂等的历史文件清单（本条迁移负责收敛其【DDL】终态）：
--   1) V2026.07.27.0003__add_remaining_columns_for_atomic_decrement.sql
--      ALTER promo_codes(2 列) → UPDATE×2 → ALTER vip_red_packets(2 列) → UPDATE
--      半路失败后重放 ⇒ 1060 Duplicate column 'remaining_uses'。
--   2) V2026.08.08.0003__users_phone_unique.sql
--      UPDATE×2 → ALTER TABLE users ADD UNIQUE KEY uk_users_phone
--      半路失败后重放 ⇒ 1061 Duplicate key name 'uk_users_phone'。
--   3) V2026.08.10.0032__add_category_to_interest_circles.sql
--      ALTER interest_circles ADD COLUMN category → UPDATE×8 ⇒ 1060。
--   4) V2026.08.15.0004__message_v3_refactor.sql
--      UPDATE×2 → ALTER official_messages ADD COLUMN(2 列) → UPDATE×2 ⇒ 1060。
--   5) V2026.10.05.0001__add_media_asset_category.sql
--      ALTER media_asset ADD COLUMN category → UPDATE → CREATE INDEX idx_media_asset_category
--      ⇒ 1060，重放还会把 category 已改成 ID_CARD 的行按新逻辑再判一遍。
--
-- 本迁移做什么（也只做什么）：
--   把上述 5 个文件的【DDL 终态】用 information_schema 守卫重写一遍，因此它在
--     * 完全应用过的库（本仓 dev campus_love）上是【零改动 no-op】——实测这些
--       列/索引均已存在（见下）；
--     * 曾经半路失败、repair 后无法重放的库上，会把缺的那几列/索引补齐，
--       让链条能往前推，运维不必手写补丁（这正是「resumable」的落点）。
--   守卫形态沿用 V2026.07.26.0002 已确立的 DROP/CREATE PROCEDURE + CALL + DROP 口径。
--
-- 本迁移【不做】的事及原因（重要，别误读为遗漏）：
--   * 不重放那 5 个文件里的任何 DML（UPDATE 回填/数据订正）。
--     反例：promo_codes.remaining_uses 的口径是 max_uses - used_count，
--     上线后 used_count 已随真实使用增长；今天再跑一次这条 UPDATE 会
--     【凭空多发兑换码】。official_accounts / official_messages 的账号合并 UPDATE
--     同理（会把用户后来手工改过的文案覆盖回 2026-08 的版本）。
--     ⇒ DML 侧的不可重放只能靠「不再重放」来保证，不能靠守卫语句来补救。
--   * 不为 vip_red_packets 补列：该表已由 V2026.08.09.0006__remove_red_packet.sql
--     `DROP TABLE IF EXISTS` 正式移除（实测 information_schema.TABLES 里 0 行、
--     Java 侧 0 引用），当前「表不存在」就是正确的终态。补列反而会复活一张死表。
--     副作用记录：这意味着 V2026.07.27.0003 现在【连语法上都无法重放】
--     （ALTER 一张不存在的表 ⇒ 1146 Table doesn't exist），不只是 Duplicate column。
--     这条只作历史事实登记，不做处理。
--   * 不新增 repeatable（R__）脚本：全仓 231 个文件都是 V*，引入 R__ 会改变
--     迁移执行次序模型（R__ 每轮 migrate 都在全部 V* 之后重跑），影响面超出本发现项，
--     留给协调会话决定。
--
-- 回滚（Flyway 不自动回滚）：本迁移为纯守卫收敛，不改变任何已应用库的状态，
--   无需回滚；如需撤销记录，DELETE FROM flyway_schema_history WHERE version='2026.10.31.0003'
--   （不要删除本文件——它会改变后续 migrate 的校验序列）。
-- ============================================================

DROP PROCEDURE IF EXISTS converge_legacy_nonidempotent_schema;
DELIMITER $$
CREATE PROCEDURE converge_legacy_nonidempotent_schema()
BEGIN
    -- ---- V2026.07.27.0003：promo_codes 原子扣减两列 ----
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = 'promo_codes'
          AND column_name = 'remaining_uses'
    ) THEN
        ALTER TABLE promo_codes
            ADD COLUMN remaining_uses INT NOT NULL DEFAULT 0
                COMMENT '剩余可用次数（原子扣减用）' AFTER used_count;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = 'promo_codes'
          AND column_name = 'max_uses_per_user'
    ) THEN
        ALTER TABLE promo_codes
            ADD COLUMN max_uses_per_user INT NOT NULL DEFAULT 1
                COMMENT '单用户最大使用次数' AFTER max_uses;
    END IF;

    -- ---- V2026.08.08.0003：users.phone 唯一约束 ----
    -- 注意：ADD UNIQUE 在存在重复 phone 时会以 1062 失败——这是【期望】行为，
    -- 与 V2026.08.19.x 之后的口径一致：宁可报错也不静默去重真实账号。
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
          AND index_name = 'uk_users_phone'
    ) THEN
        ALTER TABLE users ADD UNIQUE INDEX uk_users_phone (phone);
    END IF;

    -- ---- V2026.08.10.0032：interest_circles.category ----
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = 'interest_circles'
          AND column_name = 'category'
    ) THEN
        ALTER TABLE interest_circles
            ADD COLUMN category VARCHAR(20) NULL
                COMMENT '圈子分类（study/sports/music/movie/travel/game/food/reading，NULL=未分类）'
                AFTER description;
    END IF;

    -- ---- V2026.08.15.0004：official_messages 活动卡两列 ----
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = 'official_messages'
          AND column_name = 'card_activity_id'
    ) THEN
        ALTER TABLE official_messages
            ADD COLUMN card_activity_id BIGINT NULL COMMENT '活动卡关联的 activities.id';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = 'official_messages'
          AND column_name = 'recommend_reason'
    ) THEN
        ALTER TABLE official_messages
            ADD COLUMN recommend_reason TEXT NULL COMMENT '活动卡推荐理由（面向用户）';
    END IF;

    -- ---- V2026.10.05.0001：media_asset.category 列 + 索引 ----
    -- 列的默认值必须是 GENERAL：与实体 MediaAsset.category 及访问分级
    -- （ID_CARD 走严格档）保持一致，缺它会让旧行读出 NULL 而被判成「未登记」。
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = 'media_asset'
          AND column_name = 'category'
    ) THEN
        ALTER TABLE media_asset
            ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'GENERAL'
                COMMENT '业务分类：GENERAL/AVATAR/POST/VOICE/VIDEO/ID_CARD（ID_CARD 仅本人/ADMIN 可读）';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = 'media_asset'
          AND index_name = 'idx_media_asset_category'
    ) THEN
        CREATE INDEX idx_media_asset_category ON media_asset (category);
    END IF;
END$$
DELIMITER ;

CALL converge_legacy_nonidempotent_schema();
DROP PROCEDURE IF EXISTS converge_legacy_nonidempotent_schema;
