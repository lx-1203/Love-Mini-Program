-- =====================================================================
-- V2026.10.14.0005__realign_circle_regions.sql
-- 真大区重排（裁定 §2「要真大区」）
--
-- 背景：种子树（V2026.08.28）把 20 所学校按"录入顺序"而不是地理位置挂在三个大区下，
-- 实测出现「北京大学 / 清华大学 挂在华东大区」这类与名称矛盾的归属，
-- 于是"按大区收缩"这个产品语义是假的——绑华东大区的管理员看到的是两所北京学校。
--
-- 本迁移只做一件事：把每个三级节点（学校）按真实地理位置重新挂到大区，
-- 并把新路径级联到所有带圈层列的行。S 段（学校自己的编号）保持不变，只改 R 段，
-- 因此映射是单射、不会与任何现存路径撞车。
--
-- 大区节点：2=华东大区(C1/R1) 3=华南大区(C1/R2) 4=华北大区(C1/R3) 11=其他区域(C1/R9)
-- 重排（13 所学校换区）：
--   华北：北京大学 S1、清华大学 S2、北京师范大学 S7、北京理工大学 S8、南开大学 S14（天津）
--   华东：复旦大学 S3、上海交通大学 S4、东南大学 S9、浙江大学 S10、南京大学 S12、同济大学 S15
--   华南：广州大学 S16、中山大学 S17
-- 保持不动：中国人民大学 S5、北京航空航天大学 S6（本就在华北），
--   武汉大学 S11、西安交通大学 S13、华中科技大学 S18、四川大学 S19、哈尔滨工业大学 S20（留在「其他区域」，
--   即华中/西北/西南/东北——树上没有这四个大区节点，不自造节点，也不把它们塞进不相干的大区）。
--
-- 幂等：全部语句以「旧路径」为条件。跑过一次之后这些行不再匹配，重复执行为 0 行影响。
-- 回滚：逐行原值已留档 reports/audit/circle-realign-2026-10-14/prestate.sql（3968 行）。
-- 已应用过的库不会重跑本文件（Flyway 版本递增）；本文件落库后不得再修改。
-- =====================================================================

-- ---- 1. 用户：users.circle_path ----
UPDATE users
SET circle_path = CASE circle_path
        WHEN 'C1/R1/S1'  THEN 'C1/R3/S1'
        WHEN 'C1/R1/S2'  THEN 'C1/R3/S2'
        WHEN 'C1/R2/S3'  THEN 'C1/R1/S3'
        WHEN 'C1/R2/S4'  THEN 'C1/R1/S4'
        WHEN 'C1/R9/S7'  THEN 'C1/R3/S7'
        WHEN 'C1/R9/S8'  THEN 'C1/R3/S8'
        WHEN 'C1/R9/S9'  THEN 'C1/R1/S9'
        WHEN 'C1/R9/S10' THEN 'C1/R1/S10'
        WHEN 'C1/R9/S12' THEN 'C1/R1/S12'
        WHEN 'C1/R9/S14' THEN 'C1/R3/S14'
        WHEN 'C1/R9/S15' THEN 'C1/R1/S15'
        WHEN 'C1/R9/S16' THEN 'C1/R2/S16'
        WHEN 'C1/R9/S17' THEN 'C1/R2/S17'
        ELSE circle_path
    END,
    updated_at = updated_at
WHERE circle_path IN ('C1/R1/S1', 'C1/R1/S2', 'C1/R2/S3', 'C1/R2/S4', 'C1/R9/S7', 'C1/R9/S8',
                      'C1/R9/S9', 'C1/R9/S10', 'C1/R9/S12', 'C1/R9/S14', 'C1/R9/S15', 'C1/R9/S16', 'C1/R9/S17');

-- ---- 2. 帖子：posts.owner_circle_path ----
UPDATE posts
SET owner_circle_path = CASE owner_circle_path
        WHEN 'C1/R1/S1'  THEN 'C1/R3/S1'
        WHEN 'C1/R1/S2'  THEN 'C1/R3/S2'
        WHEN 'C1/R2/S3'  THEN 'C1/R1/S3'
        WHEN 'C1/R2/S4'  THEN 'C1/R1/S4'
        WHEN 'C1/R9/S7'  THEN 'C1/R3/S7'
        WHEN 'C1/R9/S8'  THEN 'C1/R3/S8'
        WHEN 'C1/R9/S9'  THEN 'C1/R1/S9'
        WHEN 'C1/R9/S10' THEN 'C1/R1/S10'
        WHEN 'C1/R9/S12' THEN 'C1/R1/S12'
        WHEN 'C1/R9/S14' THEN 'C1/R3/S14'
        WHEN 'C1/R9/S15' THEN 'C1/R1/S15'
        WHEN 'C1/R9/S16' THEN 'C1/R2/S16'
        WHEN 'C1/R9/S17' THEN 'C1/R2/S17'
        ELSE owner_circle_path
    END
WHERE owner_circle_path IN ('C1/R1/S1', 'C1/R1/S2', 'C1/R2/S3', 'C1/R2/S4', 'C1/R9/S7', 'C1/R9/S8',
                            'C1/R9/S9', 'C1/R9/S10', 'C1/R9/S12', 'C1/R9/S14', 'C1/R9/S15', 'C1/R9/S16', 'C1/R9/S17');

-- ---- 3. 评论 / 悄悄话 / 校内话题 / 圈子话题：同名级联 ----
-- 这三张表的圈层列目前 0 行有值（实测），但级联规则必须一致，
-- 否则将来一有数据就会与所属帖子/用户的路径分叉。
UPDATE comments
SET owner_circle_path = CASE owner_circle_path
        WHEN 'C1/R1/S1'  THEN 'C1/R3/S1'
        WHEN 'C1/R1/S2'  THEN 'C1/R3/S2'
        WHEN 'C1/R2/S3'  THEN 'C1/R1/S3'
        WHEN 'C1/R2/S4'  THEN 'C1/R1/S4'
        WHEN 'C1/R9/S7'  THEN 'C1/R3/S7'
        WHEN 'C1/R9/S8'  THEN 'C1/R3/S8'
        WHEN 'C1/R9/S9'  THEN 'C1/R1/S9'
        WHEN 'C1/R9/S10' THEN 'C1/R1/S10'
        WHEN 'C1/R9/S12' THEN 'C1/R1/S12'
        WHEN 'C1/R9/S14' THEN 'C1/R3/S14'
        WHEN 'C1/R9/S15' THEN 'C1/R1/S15'
        WHEN 'C1/R9/S16' THEN 'C1/R2/S16'
        WHEN 'C1/R9/S17' THEN 'C1/R2/S17'
        ELSE owner_circle_path
    END
WHERE owner_circle_path IN ('C1/R1/S1', 'C1/R1/S2', 'C1/R2/S3', 'C1/R2/S4', 'C1/R9/S7', 'C1/R9/S8',
                            'C1/R9/S9', 'C1/R9/S10', 'C1/R9/S12', 'C1/R9/S14', 'C1/R9/S15', 'C1/R9/S16', 'C1/R9/S17');

UPDATE private_messages
SET owner_circle_path = CASE owner_circle_path
        WHEN 'C1/R1/S1'  THEN 'C1/R3/S1'
        WHEN 'C1/R1/S2'  THEN 'C1/R3/S2'
        WHEN 'C1/R2/S3'  THEN 'C1/R1/S3'
        WHEN 'C1/R2/S4'  THEN 'C1/R1/S4'
        WHEN 'C1/R9/S7'  THEN 'C1/R3/S7'
        WHEN 'C1/R9/S8'  THEN 'C1/R3/S8'
        WHEN 'C1/R9/S9'  THEN 'C1/R1/S9'
        WHEN 'C1/R9/S10' THEN 'C1/R1/S10'
        WHEN 'C1/R9/S12' THEN 'C1/R1/S12'
        WHEN 'C1/R9/S14' THEN 'C1/R3/S14'
        WHEN 'C1/R9/S15' THEN 'C1/R1/S15'
        WHEN 'C1/R9/S16' THEN 'C1/R2/S16'
        WHEN 'C1/R9/S17' THEN 'C1/R2/S17'
        ELSE owner_circle_path
    END
WHERE owner_circle_path IN ('C1/R1/S1', 'C1/R1/S2', 'C1/R2/S3', 'C1/R2/S4', 'C1/R9/S7', 'C1/R9/S8',
                            'C1/R9/S9', 'C1/R9/S10', 'C1/R9/S12', 'C1/R9/S14', 'C1/R9/S15', 'C1/R9/S16', 'C1/R9/S17');

UPDATE campus_topics
SET owner_circle_path = CASE owner_circle_path
        WHEN 'C1/R1/S1'  THEN 'C1/R3/S1'
        WHEN 'C1/R1/S2'  THEN 'C1/R3/S2'
        WHEN 'C1/R2/S3'  THEN 'C1/R1/S3'
        WHEN 'C1/R2/S4'  THEN 'C1/R1/S4'
        WHEN 'C1/R9/S7'  THEN 'C1/R3/S7'
        WHEN 'C1/R9/S8'  THEN 'C1/R3/S8'
        WHEN 'C1/R9/S9'  THEN 'C1/R1/S9'
        WHEN 'C1/R9/S10' THEN 'C1/R1/S10'
        WHEN 'C1/R9/S12' THEN 'C1/R1/S12'
        WHEN 'C1/R9/S14' THEN 'C1/R3/S14'
        WHEN 'C1/R9/S15' THEN 'C1/R1/S15'
        WHEN 'C1/R9/S16' THEN 'C1/R2/S16'
        WHEN 'C1/R9/S17' THEN 'C1/R2/S17'
        ELSE owner_circle_path
    END
WHERE owner_circle_path IN ('C1/R1/S1', 'C1/R1/S2', 'C1/R2/S3', 'C1/R2/S4', 'C1/R9/S7', 'C1/R9/S8',
                            'C1/R9/S9', 'C1/R9/S10', 'C1/R9/S12', 'C1/R9/S14', 'C1/R9/S15', 'C1/R9/S16', 'C1/R9/S17');

UPDATE circle_topics
SET owner_circle_path = CASE owner_circle_path
        WHEN 'C1/R1/S1'  THEN 'C1/R3/S1'
        WHEN 'C1/R1/S2'  THEN 'C1/R3/S2'
        WHEN 'C1/R2/S3'  THEN 'C1/R1/S3'
        WHEN 'C1/R2/S4'  THEN 'C1/R1/S4'
        WHEN 'C1/R9/S7'  THEN 'C1/R3/S7'
        WHEN 'C1/R9/S8'  THEN 'C1/R3/S8'
        WHEN 'C1/R9/S9'  THEN 'C1/R1/S9'
        WHEN 'C1/R9/S10' THEN 'C1/R1/S10'
        WHEN 'C1/R9/S12' THEN 'C1/R1/S12'
        WHEN 'C1/R9/S14' THEN 'C1/R3/S14'
        WHEN 'C1/R9/S15' THEN 'C1/R1/S15'
        WHEN 'C1/R9/S16' THEN 'C1/R2/S16'
        WHEN 'C1/R9/S17' THEN 'C1/R2/S17'
        ELSE owner_circle_path
    END
WHERE owner_circle_path IN ('C1/R1/S1', 'C1/R1/S2', 'C1/R2/S3', 'C1/R2/S4', 'C1/R9/S7', 'C1/R9/S8',
                            'C1/R9/S9', 'C1/R9/S10', 'C1/R9/S12', 'C1/R9/S14', 'C1/R9/S15', 'C1/R9/S16', 'C1/R9/S17');

-- ---- 4. 圈层树本身：换父节点 + 换路径（最后做，前三步按旧路径匹配） ----
UPDATE circle_layer
SET circle_path = CASE id
        WHEN 5  THEN 'C1/R3/S1'
        WHEN 6  THEN 'C1/R3/S2'
        WHEN 7  THEN 'C1/R1/S3'
        WHEN 8  THEN 'C1/R1/S4'
        WHEN 12 THEN 'C1/R3/S7'
        WHEN 13 THEN 'C1/R3/S8'
        WHEN 14 THEN 'C1/R1/S9'
        WHEN 15 THEN 'C1/R1/S10'
        WHEN 17 THEN 'C1/R1/S12'
        WHEN 19 THEN 'C1/R3/S14'
        WHEN 20 THEN 'C1/R1/S15'
        WHEN 21 THEN 'C1/R2/S16'
        WHEN 22 THEN 'C1/R2/S17'
        ELSE circle_path
    END,
    parent_id = CASE id
        WHEN 5  THEN 4
        WHEN 6  THEN 4
        WHEN 7  THEN 2
        WHEN 8  THEN 2
        WHEN 12 THEN 4
        WHEN 13 THEN 4
        WHEN 14 THEN 2
        WHEN 15 THEN 2
        WHEN 17 THEN 2
        WHEN 19 THEN 4
        WHEN 20 THEN 2
        WHEN 21 THEN 3
        WHEN 22 THEN 3
        ELSE parent_id
    END
WHERE level = 3
  AND circle_path IN ('C1/R1/S1', 'C1/R1/S2', 'C1/R2/S3', 'C1/R2/S4', 'C1/R9/S7', 'C1/R9/S8',
                      'C1/R9/S9', 'C1/R9/S10', 'C1/R9/S12', 'C1/R9/S14', 'C1/R9/S15', 'C1/R9/S16', 'C1/R9/S17');
