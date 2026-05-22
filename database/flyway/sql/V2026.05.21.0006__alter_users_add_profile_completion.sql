ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_completion TINYINT NOT NULL DEFAULT 0 COMMENT '资料完善度百分比(0-100)',
ADD COLUMN IF NOT EXISTS following_count INT NOT NULL DEFAULT 0 COMMENT '关注数',
ADD COLUMN IF NOT EXISTS followers_count INT NOT NULL DEFAULT 0 COMMENT '粉丝数';

CREATE INDEX IF NOT EXISTS idx_users_profile_completion ON users(profile_completion);
