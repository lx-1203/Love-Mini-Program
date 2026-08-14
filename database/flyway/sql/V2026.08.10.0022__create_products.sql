-- ============================================================
-- 迁移：商品表 + 种子数据（3-H 商品）
-- ============================================================
-- 背景（2026-08-10）：
--   1. 校内商品/票务/优惠券展示（前端 pages/shop/index.vue「逛逛」页）；
--   2. 分类对齐前端分类 Tab：ticket（门票）/ food（美食）/ goods（好物）/ creative（文创）；
--      「全部」= 不传 category 参数；
--   3. 种子数据与前端现有 6 个本地 mock 商品一一对齐：
--      名字/价格（元）/原价/分类/销量均取自前端 buildMockShopItems()。
--      图片 URL 沿用前端 IMAGE_PATHS.PRODUCTS 的静态资源路径
--      （/static/images/products/*.jpg，客户端本地资源；后端仅存字符串，
--       前端渲染时按自身资源策略处理）。
--   4. 价格单位：元（DECIMAL(10,2)），与前端价格展示（¥99 / ¥29.9）一致；
--      支付/积分兑换链路未接入，本表仅承载商品展示数据。
-- ============================================================

CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    name VARCHAR(64) NOT NULL COMMENT '商品名称',
    description VARCHAR(255) NULL COMMENT '商品描述',
    price DECIMAL(10,2) NOT NULL COMMENT '现价（元）',
    original_price DECIMAL(10,2) NULL COMMENT '原价（元），划线价展示',
    image_url VARCHAR(512) NULL COMMENT '商品图片 URL',
    category VARCHAR(32) NOT NULL DEFAULT 'goods' COMMENT '分类：ticket/food/goods/creative',
    sales INT NOT NULL DEFAULT 0 COMMENT '销量',
    stock INT NOT NULL DEFAULT 0 COMMENT '库存',
    status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态：1=上架，0=下架',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY idx_products_category_status (category, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='校内商品表';

-- 种子数据：对齐前端 pages/shop/index.vue buildMockShopItems() 的 6 个商品
INSERT INTO products (name, description, price, original_price, image_url, category, sales, stock, status) VALUES
('校园音乐节早鸟票', '校园音乐节早鸟票，热门抢手，手慢无', 99.00, 129.00, '/static/images/products/ticket-1.jpg', 'ticket', 56, 200, 1),
('校园文创帆布袋', '校园文创帆布袋，新品上架', 29.90, 39.90, '/static/images/products/merch-1.jpg', 'creative', 128, 300, 1),
('食堂午餐优惠券', '食堂午餐优惠券，限量供应', 9.90, 15.00, '/static/images/products/food-1.jpg', 'food', 234, 500, 1),
('校徽纪念徽章', '校徽纪念徽章，收藏必备', 19.90, 25.00, '/static/images/products/merch-2.jpg', 'goods', 89, 400, 1),
('篮球赛门票', '篮球赛门票，火热开售', 15.00, 20.00, '/static/images/products/ticket-2.jpg', 'ticket', 45, 150, 1),
('校园手绘地图', '校园手绘地图，推荐入手', 12.90, 18.00, '/static/images/products/food-2.jpg', 'creative', 167, 260, 1);
