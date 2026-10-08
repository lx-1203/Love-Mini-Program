# database/sanitize —— 生产建库后 QA 种子数据清理

## 背景

新环境从 `database/flyway/sql/` 的 Flyway 链建库时，会**自带演示数据**：
链内含 29 个 seed 迁移（`V2026.08.07.0021__seed_50_virtual_users.sql`、
`V2026.08.07.0022__seed_profiles_and_posts.sql`、`V2026.08.07.0004__seed_super_test_account.sql`
等），会写入 100+ 个虚拟用户（openid 形如 `seed-user-10001`，id 10001-10056、
20057-20099）、帖子/评论/圈子/活动/私信等演示内容，以及一个密码公开写死的
「超级测试账号」。这些数据直接上生产会形成假用户/假内容与泄露面，
**上生产前先跑本目录的 [`prod-sanitize.sql`](./prod-sanitize.sql) 清理**。

## 使用方法

```bash
mysql -h <生产库地址> -u <管理员账号> -p <库名> < database/sanitize/prod-sanitize.sql
```

1. 脚本全程包在事务里，结尾默认 `ROLLBACK`：先看每段清理语句报告的影响行数；
2. 确认无误后，把脚本最后一行 `ROLLBACK;` 改为 `COMMIT;`（或手工执行 `COMMIT`）重跑一次；
3. 若要连同「超级测试账号」一并删除，先把脚本中的
   `SET @purge_super_test_account = 0;` 改为 `1`（**前提：已有正式管理员账号**，
   否则管理后台无法登录）。

## 脚本做什么

| 清理块 | 内容 |
| --- | --- |
| 1 | 圈定 QA 种子用户集合（`openid LIKE 'seed-user-%'`，可选含超级测试账号） |
| 2 | 动态发现全库所有含用户外键列（`user_id`/`author_id`/`sender_id`/`user_a_id` 等，列名与实体 `@Column` 实名核对）的表，按种子用户集合删除衍生行 |
| 3 | 体验账号运行时演示数据：`guest-demo-*` 私信会话/消息、`guest-demo-whisper-*` 悄悄话 |
| 4 | 回滚种子改过的系统配置：`match_config.candidatePageSize` 200 → 50 |
| 5 | 孤儿行清扫（种子帖子删除后残留的 post_tags/post_likes/comments 等） |
| 6 | 复核查询（剩余种子用户数应为 0） |

## 脚本不做什么（需运营确认后手工处理）

以下内容**不在脚本自动清理范围**，因为它们可能是运营上台必需或需人工甄别：

- `menus` / `roles` / `role_menus` —— 管理后台菜单与角色（admin UI 依赖）；
- `dicts` / `dict_items` —— 字典配置；
- `schools` —— 种子写入的 17 所学校（若生产只服务特定学校，手工删多余的）；
- `app_config` / `app_switch` / `match_config` 其余行 —— 运营配置（candidatePageSize 已自动回滚）；
- `interest_circles` / `campus_topics` / `activities` / `shop_items` / `daily_questions` ——
  种子写入的演示圈子/话题/活动/商品，如需保留运营自建内容，请按 id 甄别后手工删除；
- `media_asset` 对应的**磁盘文件**（`uploads/` 下）—— 数据库行删除后文件仍占空间，
  需配合磁盘清理；实名认证照片另受 `app.verification.photo-retention-days` 保留策略约束；
- `audit_log` / `payment_callback_log` 等审计/资金凭证 —— 按合规要求保留。

## 相关文件

- `database/sanitize/prod-sanitize.sql` —— 清理脚本本体；
- `database/flyway/sql/V2026.08.07.0021__seed_50_virtual_users.sql` 等种子迁移 —— 清理范围的来源；
- `apps/api/src/main/java/com/campuslove/api/auth/GuestDemoDataProvisioner.java` —— 体验账号演示数据的播种方。
