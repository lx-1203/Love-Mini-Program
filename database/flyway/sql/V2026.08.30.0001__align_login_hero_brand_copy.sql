-- 登录页主视觉文案对齐理想图《登录页面》：
-- 品牌区左上为「寻觅」+ 副标「遇见同频的人」（此前为运营横幅文案「欢迎来到校园恋爱社区」）。
-- 说明文案（hero_desc / hero_desc_sub / discover_desc）已在前端 i18n 与本表 desc 字段对齐。
UPDATE app_login_hero_config
SET hero_title = '寻觅',
    hero_subtitle = '遇见同频的人',
    updated_at = CURRENT_TIMESTAMP
WHERE scene_key = 'default';
