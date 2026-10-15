-- revert notes 2026-10-14T16:05:17+08:00
UPDATE circle_layer SET name='上海交大' WHERE id=8;
DELETE FROM circle_layer WHERE circle_path='C1/R9' OR circle_path LIKE 'C1/R9/%';
