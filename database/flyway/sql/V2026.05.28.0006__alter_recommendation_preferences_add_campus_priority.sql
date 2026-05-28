ALTER TABLE recommendation_preferences
    ADD COLUMN campus_priority TINYINT(1) NOT NULL DEFAULT 1 COMMENT '校园优先：启用后同校用户推荐权重+30%并排序靠前'
    AFTER scope;