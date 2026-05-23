-- 破冰话题表
-- 存储通用破冰话题模板，用于匹配破冰引导功能
CREATE TABLE IF NOT EXISTS icebreaker_topics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 插入通用破冰话题种子数据
INSERT INTO icebreaker_topics (content, category) VALUES
('你最近在看什么书？', 'interests'),
('你最喜欢的校园角落是哪里？', 'campus'),
('如果可以学一门新技能，你会选什么？', 'interests'),
('你周末一般怎么过？', 'lifestyle'),
('最近有什么让你开心的小事？', 'daily'),
('你最喜欢学校附近的哪家餐厅？', 'campus'),
('如果来一场说走就走的旅行，你想去哪？', 'lifestyle'),
('你有什么特别的兴趣爱好吗？', 'interests'),
('最近在追什么剧或综艺？', 'daily'),
('你觉得大学里最重要的事是什么？', 'campus'),
('你最喜欢哪个季节？为什么？', 'daily'),
('如果可以拥有一个超能力，你选什么？', 'fun'),
('你平时喜欢运动吗？最喜欢什么运动？', 'lifestyle'),
('你有什么一直想尝试但还没做的事？', 'interests'),
('你最喜欢的电影是什么？', 'daily'),
('你觉得最浪漫的事是什么？', 'romantic'),
('你理想中的周末是怎样的？', 'lifestyle'),
('你有什么隐藏技能吗？', 'fun'),
('如果可以回到过去，你想回到什么时候？', 'fun'),
('你最欣赏什么样的人？', 'romantic');
