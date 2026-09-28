# 遗留测试数据清单（G8/G9 写进真实库的行）

- 来源：`reports/audit/real-e2e/g8-rings-20260927-0520.log`（mtime 2026-09-27T05:22:36.436Z）、`reports/audit/real-e2e/g8-rings-20260927-prev.log`（mtime 2026-09-28T07:25:49.193Z）、`reports/audit/real-e2e/g8-rings.txt`（mtime 2026-09-28T07:25:49.293Z）、`reports/audit/real-e2e/g9-assets.txt`（mtime 2026-09-25T07:43:34.149Z）、`reports/audit/real-e2e/summary.md`（mtime 2026-09-25T07:52:50.465Z）
- 处置口径：**保留**（④ 的可辩护默认）。理由：这些行是本轮判据的证据本体，删掉即把已成立的结论改成不可复查。
- 守恒：日志里去重主键 11 个，全部入册（分类 11 条含兜底），无「部分收录」。
- ⚠ 分类为 `id-unclassified` 的行表示日志上下文里认不出它属于哪张表；**它们同样不许进删除脚本**，只能人工对过 schema 再定。
- ⚠ 取证日志会被下一轮 G8 覆盖（本目录只有 5 份），所以这份清单必须在每次 G8 之后重跑生成。

| 类型 | 指纹 | 依据 | 来源文件 |
|---|---|---|---|
| post | `277` | G8 环内按 id 写入/回读过的行 | g8-rings-20260927-0520.log |
| id-unclassified | `306` | 同一行原文：RING8 [OK ] 创建响应回主键 data.id :: HTTP 200，data. | g8-rings-20260927-0520.log |
| id-unclassified | `38` | 同一行原文：NG10 [OK ] 匿名回复透传并可读回 :: POST replies -> 200  | g8-rings-20260927-0520.log |
| comment | `1245` | 同一行原文：G8_ARTIFACTS=posts.id=277 ; comments. | g8-rings-20260927-0520.log |
| title | `G8取证2609270520号` | 按命名前缀可反查的测试数据 | g8-rings-20260927-0520.log |
| post | `236` | G8 环内按 id 写入/回读过的行 | g8-rings-20260927-prev.log |
| comment | `1205` | 同一行原文：G8_ARTIFACTS=posts.id=236 ; comments. | g8-rings-20260927-prev.log |
| title | `G8取证2609250743号` | 按命名前缀可反查的测试数据 | g8-rings-20260927-prev.log |
| post | `284` | G8 环内按 id 写入/回读过的行 | g8-rings.txt |
| id-unclassified | `311` | 同一行原文：RING8 [OK ] 创建响应回主键 data.id :: HTTP 200，data. | g8-rings.txt |
| id-unclassified | `43` | 同一行原文：NG10 [OK ] 匿名回复透传并可读回 :: POST replies -> 200  | g8-rings.txt |
| comment | `1250` | 同一行原文：G8_ARTIFACTS=posts.id=284 ; comments. | g8-rings.txt |
| title | `G8取证2609280724号` | 按命名前缀可反查的测试数据 | g8-rings.txt |
| user | `100151` | 同一行原文：- 身份账号：`users. | summary.md |

要清理时按 `test-data-cleanup.sql` 走：默认 BEGIN/ROLLBACK 演练，确认影响行数后才允许显式改成提交。

## 累积台账（跨轮只增不换）

- 台账文件 `test-data-ledger.json`：本轮之前 13 条 → 现在 18 条（新增 5）。
- 其中 4 条是**弱指纹**：只在报告文字里出现，原始取证日志已被后一次 G8 覆盖，机器不可复核 ⇒ 这些行不许进删除脚本，只能作为"库里可能有"的提示。
- 本轮由弱升强 0 条（取证日志重新认出了这些主键 ⇒ 就地升级，不另记一条；台账里同一身份只留一条）。

| 类型 | 主键 | 强度 | 首次入册 | 依据 |
|---|---|---|---|---|
| post | `236` | 强（取证日志） | 2026-09-26 | G8 环内按 id 写入/回读过的行 |
| comment | `1205` | 强（取证日志） | 2026-09-26 | 同一行原文：G8_ARTIFACTS=posts.id=236 ; comments. |
| title | `G8取证2609250743号` | 强（取证日志） | 2026-09-26 | 按命名前缀可反查的测试数据 |
| user | `100151` | 强（取证日志） | 2026-09-26 | 同一行原文：- 身份账号：`users. |
| posts | `270` | 弱（报告文字） | 2026-09-26 | 只在报告文字里出现（原始取证日志已被后一次 G8 覆盖，不可机器复核） |
| comments | `1238` | 弱（报告文字） | 2026-09-26 | 只在报告文字里出现（原始取证日志已被后一次 G8 覆盖，不可机器复核） |
| campus_topics | `299` | 弱（报告文字） | 2026-09-26 | 只在报告文字里出现（原始取证日志已被后一次 G8 覆盖，不可机器复核） |
| campus_replies | `31` | 弱（报告文字） | 2026-09-26 | 只在报告文字里出现（原始取证日志已被后一次 G8 覆盖，不可机器复核） |
| post | `277` | 强（取证日志） | 2026-09-27 | G8 环内按 id 写入/回读过的行 |
| id-unclassified | `306` | 强（取证日志） | 2026-09-27 | 同一行原文：RING8 [OK ] 创建响应回主键 data.id :: HTTP 200，data. |
| id-unclassified | `38` | 强（取证日志） | 2026-09-27 | 同一行原文：NG10 [OK ] 匿名回复透传并可读回 :: POST replies -> 200  |
| comment | `1245` | 强（取证日志） | 2026-09-27 | 同一行原文：G8_ARTIFACTS=posts.id=277 ; comments. |
| title | `G8取证2609270520号` | 强（取证日志） | 2026-09-27 | 按命名前缀可反查的测试数据 |
| post | `284` | 强（取证日志） | 2026-09-28 | G8 环内按 id 写入/回读过的行 |
| id-unclassified | `311` | 强（取证日志） | 2026-09-28 | 同一行原文：RING8 [OK ] 创建响应回主键 data.id :: HTTP 200，data. |
| id-unclassified | `43` | 强（取证日志） | 2026-09-28 | 同一行原文：NG10 [OK ] 匿名回复透传并可读回 :: POST replies -> 200  |
| comment | `1250` | 强（取证日志） | 2026-09-28 | 同一行原文：G8_ARTIFACTS=posts.id=284 ; comments. |
| title | `G8取证2609280724号` | 强（取证日志） | 2026-09-28 | 按命名前缀可反查的测试数据 |
