-- ============================================================
-- 迁移：创建用户设备会话表 user_device_session（3-D 设备管理）
-- ============================================================
-- 背景：
--   设备管理：登录成功时按 (user_id, device_id) 记录一条设备会话，
--   用户可在「账号安全」页查看设备列表并吊销某台设备（该设备 token 立即失效）。
--
-- 设计说明：
--   * device_id：登录请求携带的客户端设备标识；请求未携带时统一记 "unknown"
--   * (user_id, device_id) 唯一：同一设备重复登录走 UPSERT（更新 jti/活跃时间），
--     被吊销后再次登录自动复活该行（revoked 重置为 FALSE）
--   * last_token_jti：该设备最近一次登录签发的 JWT jti，吊销设备时加入黑名单
--     （TokenBlacklistService，Redis + 本地内存降级），实现「该设备 token 立即失效」
--   * revoked：true 表示已被用户从设备列表吊销；设备列表原样返回（前端置灰展示）
--   * version 乐观锁列：与项目 Task 2.1.1 数据一致性基础设施保持一致
-- ============================================================

CREATE TABLE IF NOT EXISTS user_device_session (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户 ID',
    device_id VARCHAR(128) NOT NULL DEFAULT 'unknown' COMMENT '设备标识（请求未携带时 unknown）',
    platform VARCHAR(32) NOT NULL DEFAULT 'unknown' COMMENT '登录平台（wechat/phone/apple/guest/unknown）',
    last_token_jti VARCHAR(64) COMMENT '该设备最近签发 JWT 的 jti（吊销设备时加入黑名单）',
    last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近活跃时间',
    revoked BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已被吊销',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '首次登录时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最近更新时间',
    version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    UNIQUE KEY uk_user_device (user_id, device_id),
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='用户登录设备会话表';
