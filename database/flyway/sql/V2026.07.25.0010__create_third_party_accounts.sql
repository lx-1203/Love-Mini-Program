-- ============================================================
-- 第三方账号绑定表（功能2：登录第三方账号）
-- ============================================================
-- 用途：记录本系统用户与第三方平台（微信 / Apple）账号的绑定关系，
--       支持通过第三方账号直接登录或绑定后切换登录方式。
--
-- 字段说明：
--   id          主键 ID
--   user_id     本系统用户 ID（关联 users.id）
--   provider    第三方平台标识：WECHAT（微信）/ APPLE（Apple ID）
--   open_id     第三方平台的 openId（已 SHA-256 派生 hash，避免明文存储）
--               WECHAT：微信 openId hash
--               APPLE：Apple Sub Identifier hash
--   union_id    第三方平台的 unionId（仅微信有，Apple 为 NULL）
--   created_at  绑定时间
--
-- 索引说明：
--   uk_third_party_provider_open_id   (provider, open_id) 唯一索引，
--                                     避免同一第三方账号绑定多个本系统用户
--   idx_third_party_user_id           user_id 普通索引，用于查询用户绑定的所有平台
--   idx_third_party_union_id          union_id 普通索引，用于通过 unionId 跨小程序合并账号
--
-- 安全说明：
--   - open_id 字段不存储明文，存储 SHA-256 派生 hash（64 位 hex 字符串）
--   - 与 users.openid 字段的 hash 策略保持一致（RealAuthService#hashOpenid）
--   - 数据库泄露时无法直接还原第三方身份标识
--
-- DOWN 回滚：
--   DROP TABLE IF EXISTS third_party_account;
-- ============================================================

CREATE TABLE IF NOT EXISTS `third_party_account` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `user_id`    BIGINT       NOT NULL COMMENT '本系统用户 ID（关联 users.id）',
    `provider`   VARCHAR(16)  NOT NULL COMMENT '第三方平台标识：WECHAT / APPLE',
    `open_id`    VARCHAR(128) NOT NULL COMMENT '第三方 openId（SHA-256 派生 hash 存储）',
    `union_id`   VARCHAR(128) NULL COMMENT '第三方 unionId（仅微信有，Apple 为 NULL）',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '绑定时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_third_party_provider_open_id` (`provider`, `open_id`),
    KEY `idx_third_party_user_id` (`user_id`),
    KEY `idx_third_party_union_id` (`union_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '第三方账号绑定表';
