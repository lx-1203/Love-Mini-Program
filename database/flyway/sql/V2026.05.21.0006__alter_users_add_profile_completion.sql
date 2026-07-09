-- users 表在 V2026.05.18.0001 已包含 profile_completion/following_count/followers_count 列，
-- 此处不再重复添加，仅保留索引创建。
CREATE INDEX idx_users_profile_completion ON users(profile_completion);
