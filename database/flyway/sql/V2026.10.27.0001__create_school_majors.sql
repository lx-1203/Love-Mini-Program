-- =====================================================================
-- V2026.10.27.0001__create_school_majors.sql
-- 「校园专业字典」机制 + 通用基线（后端真源，供 GET /api/v1/config/campuses 的 majors 字段消费）
--
-- 【这张表建的是什么，不是什么——请先读完再动数据】
-- 建的是：(1) 学校→专业目录的存储机制（表 + 唯一约束 + 排序）；
--         (2) 一份**通用基线**专业目录（67 条），对所有学校共享。
-- 建的不是：任何一所学校「实际开设哪些专业」的事实陈述。
--
-- 为什么只有基线、没有按校清单：
--   全仓没有任何权威来源证明「某校开某专业」。逐层核对过的既有数据面：
--   - schools 表（V2026.08.07.0010 + V2026.08.08.0012 共 17 所）只有
--     id/name/code/status/sort_order/时间戳，无专业列；
--   - campus_certifications.major 是**用户自己申报的单个专业**（VARCHAR(100) 自由文本，
--     CampusController 仅 @Size(max=100) 校验），它是「学生说自己在哪个专业」，
--     不是「学校开哪些专业」，拿它聚合出来的按校清单是伪字典，宁可不要；
--   - 客户端 apps/client/src/config/schools.ts 的 MAJORS 67 条是人工罗列的通用目录，
--     从未标注归属学校。
--   凭空给 17 所学校各编一份开课清单 = 把猜测烤进数据库，之后没人能分辨它是数据还是编的。
--
-- 因此本迁移采用「单一基线档 + 按校档覆盖」口径：
--   school_code = '*'  ⇒ 通用基线档（保留字符，不属于任何学校的 schools.code；
--                  之所以用 '*' 而不是 NULL：MySQL 唯一索引允许多个 NULL 行，
--                  用 NULL 表示基线就等于基线档没有防重约束）。
--   school_code = 具体 code ⇒ 该校专属目录（覆盖基线）。
--   读取方（RealConfigService.loadCampuses）优先按校取，取不到 ⇒ **回退基线并记一行日志**，
--   绝不静默、也绝不因为「这所学校没数据」而下发空列表让用户面对空 picker。
--
-- 【待导入的按校真源 = 本迁移留下的口子】
-- 权威来源应是：教育部学科备案 / 各校本科招生网公布的当年招生专业目录。
-- 拿到之后按 (school_code, name) INSERT 即可覆盖基线，无需再改表结构与后端代码。
-- 在那次导入之前，**17 所学校全部走基线回退**（这是当前真实数据状态，不是缺陷）。
--
-- 本次刻意**未写入任何按校示例行**（连 DEMO-ONLY 都没有）：
--   机制与两条分支（按校命中 / 按校缺数回退）已由单元测试
--   apps/api/src/test/java/com/campuslove/api/clientconfig/RealConfigServiceCampusMajorTest.java
--   用 mock 覆盖，不需要往真库塞假数据来验证链路。若将来确需联调按校命中，
--   INSERT 若干行后 `DELETE FROM school_majors WHERE school_code <> '*'` 一次清空即可。
--
-- 也刻意**未建 degree（授予学位门类）列**：同样没有权威来源，建了就是一个恒空列，
--   等到导入真源时再 ALTER 加，成本比误导低。
--
-- 幂等：information_schema 守卫建表；INSERT IGNORE 依赖 uk_school_majors_school_name 防重。
-- 回滚：DROP TABLE IF EXISTS school_majors;
-- =====================================================================

-- ---- 1. 建表（幂等） ----
SET @has_school_majors := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'school_majors'
);

SET @sql_school_majors := IF(
    @has_school_majors = 0,
    'CREATE TABLE school_majors (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        school_code VARCHAR(32) NOT NULL DEFAULT ''*'' COMMENT ''开设该专业的高校编码（schools.code）；星号档＝通用基线（不属于任何具体学校，所有无按校数据的学校共用）'',
        name VARCHAR(100) NOT NULL COMMENT ''专业全称，直接展示给用户；与 campus_certifications.major 同宽，认证值可直接落在字典内'',
        category VARCHAR(64) NULL COMMENT ''学科门类分组（工学/理学/经管/…），仅用于展示分组，可空；沿用客户端 MAJORS 原有的分节口径'',
        sort_order INT NOT NULL DEFAULT 0 COMMENT ''同档内排序权重（升序），决定 picker 选项顺序'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_school_majors_school_name (school_code, name),
        KEY idx_school_majors_school_code (school_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''高校专业字典（星号档＝通用基线，具体 code 档＝该校专属）''',
    'SELECT 1'
);
PREPARE stmt_school_majors FROM @sql_school_majors;
EXECUTE stmt_school_majors;
DEALLOCATE PREPARE stmt_school_majors;

-- ---- 2. 通用基线 67 条（school_code = '*'） ----
-- 来源：apps/client/src/config/schools.ts:74-95 的 MAJORS 常量（逐条平移，顺序不变、
-- 分节注释作为 category）。这是「客户端一直在用、但从来没有后端真源」的那 67 条，
-- 入库后客户端的本地常量降级为「后端不可达时的兜底」，真源归本表。
INSERT IGNORE INTO school_majors (school_code, name, category, sort_order) VALUES
-- 工学
('*', '计算机科学与技术',       '工学', 1),
('*', '软件工程',               '工学', 2),
('*', '电子信息工程',           '工学', 3),
('*', '通信工程',               '工学', 4),
('*', '人工智能',               '工学', 5),
('*', '自动化',                 '工学', 6),
('*', '电气工程及其自动化',     '工学', 7),
('*', '机械工程',               '工学', 8),
('*', '机械设计制造及其自动化', '工学', 9),
('*', '土木工程',               '工学', 10),
('*', '建筑学',                 '工学', 11),
('*', '城乡规划',               '工学', 12),
('*', '材料科学与工程',         '工学', 13),
('*', '能源与动力工程',         '工学', 14),
('*', '航空航天工程',           '工学', 15),
('*', '车辆工程',               '工学', 16),
('*', '环境工程',               '工学', 17),
('*', '化学工程与工艺',         '工学', 18),
('*', '生物医学工程',           '工学', 19),
-- 理学
('*', '数学与应用数学',         '理学', 20),
('*', '信息与计算科学',         '理学', 21),
('*', '物理学',                 '理学', 22),
('*', '应用物理学',             '理学', 23),
('*', '化学',                   '理学', 24),
('*', '应用化学',               '理学', 25),
('*', '生物科学',               '理学', 26),
('*', '生物技术',               '理学', 27),
('*', '统计学',                 '理学', 28),
('*', '地理科学',               '理学', 29),
-- 经管
('*', '经济学',                 '经管', 30),
('*', '金融学',                 '经管', 31),
('*', '金融工程',               '经管', 32),
('*', '国际经济与贸易',         '经管', 33),
('*', '会计学',                 '经管', 34),
('*', '财务管理',               '经管', 35),
('*', '市场营销',               '经管', 36),
('*', '工商管理',               '经管', 37),
('*', '人力资源管理',           '经管', 38),
('*', '信息管理与信息系统',     '经管', 39),
('*', '电子商务',               '经管', 40),
('*', '物流管理',               '经管', 41),
-- 法学与人文社科
('*', '法学',                   '法学与人文社科', 42),
('*', '社会学',                 '法学与人文社科', 43),
('*', '新闻学',                 '法学与人文社科', 44),
('*', '传播学',                 '法学与人文社科', 45),
('*', '汉语言文学',             '法学与人文社科', 46),
('*', '英语',                   '法学与人文社科', 47),
('*', '日语',                   '法学与人文社科', 48),
('*', '翻译',                   '法学与人文社科', 49),
('*', '历史学',                 '法学与人文社科', 50),
('*', '哲学',                   '法学与人文社科', 51),
('*', '心理学',                 '法学与人文社科', 52),
('*', '教育学',                 '法学与人文社科', 53),
-- 医学与农学
('*', '临床医学',               '医学与农学', 54),
('*', '口腔医学',               '医学与农学', 55),
('*', '药学',                   '医学与农学', 56),
('*', '护理学',                 '医学与农学', 57),
('*', '农学',                   '医学与农学', 58),
('*', '园艺学',                 '医学与农学', 59),
-- 艺术与设计
('*', '工业设计',               '艺术与设计', 60),
('*', '视觉传达设计',           '艺术与设计', 61),
('*', '环境设计',               '艺术与设计', 62),
('*', '数字媒体艺术',           '艺术与设计', 63),
('*', '产品设计',               '艺术与设计', 64),
('*', '音乐表演',               '艺术与设计', 65),
('*', '舞蹈学',                 '艺术与设计', 66),
('*', '播音与主持艺术',         '艺术与设计', 67);
