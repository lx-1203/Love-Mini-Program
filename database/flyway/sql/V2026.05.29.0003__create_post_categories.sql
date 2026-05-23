-- 创建帖子分类表
-- 存储帖子分类信息，如约会、学习、生活、活动、求助等
CREATE TABLE IF NOT EXISTS post_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    code VARCHAR(50) NOT NULL COMMENT '分类代码',
    icon VARCHAR(100) DEFAULT NULL COMMENT '图标名',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序顺序',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    PRIMARY KEY (id),
    UNIQUE KEY uk_post_categories_code (code),
    KEY idx_post_categories_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='帖子分类表';

-- 插入默认分类数据
INSERT INTO post_categories (name, code, icon, sort_order, is_active) VALUES
('约会', 'dating', 'heart', 1, 1),
('学习', 'study', 'book', 2, 1),
('生活', 'life', 'coffee', 3, 1),
('活动', 'activity', 'calendar', 4, 1),
('求助', 'help', 'help-circle', 5, 1);
