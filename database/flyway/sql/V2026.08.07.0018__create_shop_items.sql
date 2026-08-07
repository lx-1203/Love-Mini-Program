-- ============================================================
-- 迁移：积分商城（商品管理）
-- ============================================================
-- 背景：
--   客户端「积分商城」（pages/shop/index.vue）此前为前端静态 mock 商品，
--   无后端实体。本次引入 shop_items 表承载商品上下架管理：
--
--     title            商品标题
--     category         分类：ticket 票务 / food 餐饮 / goods 商品 / creative 文创
--     price_cents      积分价格（单位：分，避免浮点误差）
--     original_price   划线价（分，可空）
--     image_url        商品图片 URL
--     description      商品描述
--     stock            库存（-1 表示不限）
--     sales_count      已售数量
--     published        是否上架（1=上架，0=下架，下架后小程序端商城不可见）
--     sort_order       排序权重
--     campus_name      所属校区（NULL=全局商品，非空=校区商品，数据隔离维度）
--
-- 幂等性：information_schema 检查表存在性后 CREATE TABLE，可安全重跑。
-- ============================================================

SET @has_shop := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'shop_items'
);

SET @sql_shop := IF(
    @has_shop = 0,
    'CREATE TABLE shop_items (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(128) NOT NULL COMMENT ''商品标题'',
        category VARCHAR(16) NOT NULL DEFAULT ''goods'' COMMENT ''分类：ticket/food/goods/creative'',
        price_cents INT NOT NULL DEFAULT 0 COMMENT ''积分价格（分）'',
        original_price INT NULL COMMENT ''划线价（分，可空）'',
        image_url VARCHAR(512) NOT NULL DEFAULT '''' COMMENT ''商品图片 URL'',
        description VARCHAR(512) NOT NULL DEFAULT '''' COMMENT ''商品描述'',
        stock INT NOT NULL DEFAULT -1 COMMENT ''库存（-1=不限）'',
        sales_count INT NOT NULL DEFAULT 0 COMMENT ''已售数量'',
        published TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''是否上架（1=上架，0=下架）'',
        sort_order INT NOT NULL DEFAULT 0 COMMENT ''排序权重（升序）'',
        campus_name VARCHAR(128) NULL COMMENT ''所属校区（NULL=全局商品）'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_shop_items_published (published),
        KEY idx_shop_items_category (category),
        KEY idx_shop_items_campus (campus_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''积分商城商品表''',
    'SELECT 1'
);
PREPARE stmt_shop FROM @sql_shop;
EXECUTE stmt_shop;
DEALLOCATE PREPARE stmt_shop;

-- ============================================================
-- 种子数据（WHERE NOT EXISTS 幂等）：与客户端既有 mock 商品对齐
-- ============================================================
INSERT INTO shop_items (title, category, price_cents, original_price, sort_order)
SELECT '双人电影票', 'ticket', 9900, 12900, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM shop_items WHERE title = '双人电影票');

INSERT INTO shop_items (title, category, price_cents, original_price, sort_order)
SELECT '校园文创帆布包', 'creative', 2990, 3990, 2
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM shop_items WHERE title = '校园文创帆布包');

INSERT INTO shop_items (title, category, price_cents, original_price, sort_order)
SELECT '奶茶兑换券', 'food', 990, 1500, 3
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM shop_items WHERE title = '奶茶兑换券');

INSERT INTO shop_items (title, category, price_cents, original_price, sort_order)
SELECT '定制马克杯', 'goods', 1990, 2500, 4
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM shop_items WHERE title = '定制马克杯');

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DROP TABLE IF EXISTS shop_items;
