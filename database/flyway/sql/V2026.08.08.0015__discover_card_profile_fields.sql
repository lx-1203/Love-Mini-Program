-- ============================================================================
-- V2026.08.08.0015：寻觅页匹配卡片完整字段落地
-- ----------------------------------------------------------------------------
-- 为 user_basic_profile 补充卡片/详情页所需的人口学与画像字段：
--   occupation       职业（展示文本）
--   income_range     月收入档位（3k-8k / 8k-15k / 15k-30k / 30k+）
--   personality_tags 性格标签（JSON 数组）
--   mbti             MBTI 人格类型
--   expected_partner 期待的人物画像描述
--   birth_year       出生年份（年龄 = 当前年份 - birth_year）
--
-- 全部列可空/带默认值，兼容存量行；种子值由本迁移 UPDATE 补齐（确定性取值，
-- 幂等可安全重跑）。旧 seed 迁移均为显式列名 INSERT，不受新增列影响。
-- ============================================================================

ALTER TABLE user_basic_profile
  ADD COLUMN occupation VARCHAR(64) NULL COMMENT '职业（展示文本）',
  ADD COLUMN income_range VARCHAR(16) NULL COMMENT '月收入档位：3k-8k/8k-15k/15k-30k/30k+',
  ADD COLUMN personality_tags JSON NULL COMMENT '性格标签（JSON 数组，空数组由应用层默认）',
  ADD COLUMN mbti VARCHAR(8) NULL COMMENT 'MBTI 人格类型',
  ADD COLUMN expected_partner VARCHAR(255) NULL COMMENT '期待的人物画像描述',
  ADD COLUMN birth_year INT NULL COMMENT '出生年份（年龄=当前年-birth_year）';

-- 种子数据（R4-00423 环境守卫）：仅演示环境（demo_seed=true）且仅限虚拟用户 ID 区间
-- （10001-10056）确定性填充——原实现按 ELT(MOD) 随机覆盖 user_id IN (1, 8, 47)，
-- 其中 id=1 为超级管理员，真实账号资料会被演示数据覆盖污染。
UPDATE user_basic_profile SET
  occupation = ELT(1 + (user_id MOD 6), '产品经理', '互联网运营', '研究生在读', '程序员', '设计', '自媒体'),
  income_range = ELT(1 + (user_id MOD 4), '3k-8k', '8k-15k', '15k-30k', '30k+'),
  mbti = ELT(1 + (user_id MOD 8), 'INFJ', 'INTP', 'ENFP', 'ISFP', 'ENTJ', 'INFP', 'ESTJ', 'ISTP'),
  expected_partner = ELT(1 + (user_id MOD 4),
    '真诚、边界感清晰，聊天节奏合拍。',
    '喜欢深度对话，对生活有自己的节奏。',
    '温柔有耐心，愿意从一杯咖啡慢慢认识彼此。',
    '直接、不绕弯子，共同规划未来的生活。'),
  birth_year = 2026 - (20 + (user_id MOD 6)),
  personality_tags = JSON_ARRAY(
    ELT(1 + (user_id MOD 5), '阳光开朗', '慢热但真诚', '理性务实', '温柔细腻', '幽默健谈'),
    -- 循环取模：第二个标签索引 = 1 + ((MOD + 1) MOD 5)，避免 MOD=4 时 ELT 越界返回 NULL
    ELT(1 + ((user_id MOD 5) + 1) % 5, '行动力强', '共情力强', '安静专注', '靠谱', '爱探索'))
WHERE '${demo_seed}' = 'true' AND user_id BETWEEN 10001 AND 10056;
