-- ============================================================
-- 迁移：修复语音介绍 URL（原 Google Actions 音频已失效）
-- ============================================================
-- 背景：
--   0025 中 voice.intro.url 指向 actions.google.com/sounds ，
--   该地址在本地网络已无法访问（超时）。替换为 MDN CC0 公有领域
--   音频（https://interactive-examples.mdn.mozilla.net/media/cc0-audio/），
--   已验证可直接播放（200, audio/mpeg），无版权风险。
--
--   幂等性：固定 config_key + 值判断，可安全重跑。
-- ============================================================

UPDATE app_config
SET config_value = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
    description = '语音介绍示例 URL（MDN CC0 公有领域音频，可直接播放）',
    updated_at = NOW()
WHERE config_key = 'voice.intro.url';
