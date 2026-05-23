-- 每日一问 - 问题表
CREATE TABLE IF NOT EXISTS daily_questions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    question_date DATE NOT NULL COMMENT '问题日期(每天一个唯一问题)',
    question_text VARCHAR(500) NOT NULL COMMENT '问题文本',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_daily_questions_date (question_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='每日一问问题表';

-- 每日一问 - 回答表
CREATE TABLE IF NOT EXISTS daily_answers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    question_id BIGINT UNSIGNED NOT NULL COMMENT '关联问题ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '回答用户ID',
    content VARCHAR(2000) NOT NULL COMMENT '回答内容',
    is_anonymous TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否匿名(0=否,1=是)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_daily_answers_question (question_id),
    KEY idx_daily_answers_user (user_id),
    KEY idx_daily_answers_created (created_at),
    CONSTRAINT fk_daily_answers_question FOREIGN KEY (question_id) REFERENCES daily_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='每日一问回答表';