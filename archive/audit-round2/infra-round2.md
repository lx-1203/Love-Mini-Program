# infra 领域第二轮审查问题清单(Round 2)

> 来源:子代理审查会话 sa_20260806_012239_000000000_7ee7adab78b9 最终回答(2026-08-06 01:32 完成)
> 统计:共 216 条问题(CRITICAL 44 / HIGH 26 / MEDIUM 79 / LOW 59 / 已修复 8,按最终回答原文逐条统计;文末领域总结中的数量为审查员自估,以本逐条统计为准)

审查完成。以下为新一轮 infra 审查问题清单(基于当前工作区实际内容与精确行号,已排除已修复项:docker-compose 网络隔离/FIN-01328~01340 已修复、CI mvn 门禁已添加,不再重复列出;仅标注仍存在的问题)。

## 一、数据库(Flyway)CRITICAL/HIGH 阻断项

```
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql 与 V2026.07.25.0001__add_on_delete_cascade.sql|整文件|CRITICAL|同版本号 V2026.07.25.0001 两个迁移文件并存,Flyway 启动报 "Found more than one migration with version"|应用无法启动,整条迁移链断裂|重命名其中一组为 .0001a/.0001b 或递增版本号
infra|database/flyway/sql/V2026.07.25.0002__create_vip_red_packets.sql 与 V2026.07.25.0002__fix_collation.sql|整文件|CRITICAL|同版本号 V2026.07.25.0002 冲突|同上|重命名版本号
infra|database/flyway/sql/V2026.07.25.0003__add_missing_indexes.sql 与 V2026.07.25.0003__create_promo_codes.sql|整文件|CRITICAL|同版本号 V2026.07.25.0003 冲突|同上|重命名版本号
infra|database/flyway/sql/V2026.07.25.0004__add_auto_renew_to_users.sql 与 V2026.07.25.0004__add_remaining_missing_indexes.sql|整文件|CRITICAL|同版本号 V2026.07.25.0004 冲突|同上|重命名版本号
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|33|CRITICAL|CREATE INDEX IF NOT EXISTS 语法 MySQL 8.0 不支持(仅 PostgreSQL/SQLite/H2),脚本注释声称 "MySQL 8.0+ 支持" 为错误认知|该迁移在 MySQL 上必然语法错误,迁移链中断|改用 information_schema 检查或拆分为 ALTER TABLE ADD INDEX
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|34|CRITICAL|同 33 行 idx_likes_target_user_created_at 使用 IF NOT EXISTS|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|35|CRITICAL|同 33 行 idx_likes_status_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|41|CRITICAL|同 33 行 idx_posts_author_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|42|CRITICAL|同 33 行 idx_posts_status_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|48|CRITICAL|同 33 行 idx_post_likes_user_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|52|CRITICAL|同 33 行 idx_post_shares_post_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|53|CRITICAL|同 33 行 idx_post_shares_user_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|58|CRITICAL|同 33 行 idx_comments_post_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|59|CRITICAL|同 33 行 idx_comments_author_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|65|CRITICAL|同 33 行 idx_check_ins_user_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|71|CRITICAL|同 33 行 idx_activities_status_activity_date|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|76|CRITICAL|同 33 行 idx_audit_log_operator_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|77|CRITICAL|同 33 行 idx_audit_log_operation_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|81|CRITICAL|同 33 行 idx_reports_status_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|82|CRITICAL|同 33 行 idx_reports_reporter_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|89|CRITICAL|同 33 行 idx_private_messages_sender_created_at|同上|同上
infra|database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql|90|CRITICAL|同 33 行 idx_private_messages_conversation_read|同上|同上
infra|database/flyway/sql/V2026.07.26.0001__add_entity_index_annotations.sql|33|CRITICAL|CREATE INDEX IF NOT EXISTS 第 1 条 idx_notifications_user_created_at,MySQL 不支持|同上|同上
infra|database/flyway/sql/V2026.07.26.0001__add_entity_index_annotations.sql|38|CRITICAL|同上 idx_heart_signals_created_at|同上|同上
infra|database/flyway/sql/V2026.07.26.0001__add_entity_index_annotations.sql|43|CRITICAL|同上 idx_vip_bills_created_at|同上|同上
infra|database/flyway/sql/V2026.07.26.0001__add_entity_index_annotations.sql|48|CRITICAL|同上 idx_feedback_created_at|同上|同上
infra|database/flyway/sql/V2026.07.26.0001__add_entity_index_annotations.sql|53|CRITICAL|同上 idx_private_messages_conversation_created_at|同上|同上
infra|database/flyway/sql/V2026.07.26.0001__add_entity_index_annotations.sql|58|CRITICAL|同上 idx_private_messages_created_at|同上|同上
infra|database/flyway/sql/V2026.07.26.0001__add_entity_index_annotations.sql|63|CRITICAL|同上 idx_private_messages_delivery_status|同上|同上
infra|database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql|192|CRITICAL|Part 3 使用 CREATE INDEX IF NOT EXISTS idx_private_messages_conv_delivery,MySQL 不支持|同上|同上
infra|database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql|196|CRITICAL|同上 idx_users_role|同上|同上
infra|database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql|200|CRITICAL|同上 idx_reports_created_at|同上|同上
infra|database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql|204|CRITICAL|同上 idx_reports_handler|同上|同上
infra|database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql|208|CRITICAL|同上 idx_likes_status_user_created|同上|同上
infra|database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql|212|CRITICAL|同上 idx_pass_records_user_created|同上|同上
infra|database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql|216|CRITICAL|同上 idx_notifications_type_created|同上|同上
infra|database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql|220|CRITICAL|同上 idx_notifications_source_user|同上|同上
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|184|CRITICAL|idx_user_follows_followed_created 引用列 followed_id,而 user_follows 实际列为 follower_id/following_id(V2026.05.25.0001:4-5)|ALTER TABLE 引用不存在列,迁移失败|改为 following_id
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|258|CRITICAL|idx_vip_red_packets_sender_status 引用列 sender_user_id,实际为 sender_id(V2026.07.25.0002:26)|同上|改为 sender_id
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|264|CRITICAL|idx_vip_red_packets_claimer_status 引用列 claimer_user_id,vip_red_packets 无此列(领取人在 vip_red_packet_claims)|同上|索引建到 vip_red_packet_claims.claimer_id 或删除
infra|apps/api/src/main/resources/application-db.yml|60|CRITICAL|APP_FLYWAY_LOCATIONS 被 docker-compose.yml:231 覆盖为 filesystem:/app/db/migration,classpath:db/migration 的 4 个迁移(V2026070501001-4,含 media_asset 建表)在容器环境不加载|容器部署中 media_asset 表不存在,而 V2026.07.26.0003:153 / V2026.07.28.0004:187 / V2026.07.28.0005:148 对其执行 ALTER 必然失败;本地 IDE 与容器迁移集不一致|compose 保留两个 location 或把 4 个迁移并入 database/flyway/sql
infra|database/flyway/sql/V2026.07.26.0003__add_version_columns.sql|153|CRITICAL|CALL add_version_column_if_missing('media_asset') 时 media_asset 尚未创建(见上条,容器环境永不创建)|全新容器部署迁移失败、API 无法启动|依赖表先建,或将 media_asset 建表提前
infra|database/flyway/sql/V2026.07.28.0004__audit_fields.sql|187|CRITICAL|add_created_at_column_if_missing('media_asset') 同上|同上|同上
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|148|CRITICAL|add_index_if_missing('media_asset',...) 同上|同上|同上
infra|database/flyway/sql/V2026.07.27.0005__enum_to_varchar_check.sql|114|HIGH|DROP COLUMN status 会连带删除单列索引 idx_likes_status(V2026.07.25.0004:44 建)且不重建|ENUM→VARCHAR 后高频状态查询全表扫描,性能回归|迁移末尾重建被删索引
infra|database/flyway/sql/V2026.07.27.0005__enum_to_varchar_check.sql|114|HIGH|DROP COLUMN posts.status 连带删除 idx_posts_status(0004:32 建)|同上|同上
infra|database/flyway/sql/V2026.07.27.0005__enum_to_varchar_check.sql|114|HIGH|DROP COLUMN posts.category 连带删除 idx_posts_category(V2026.05.21.0003:15 建)|分类筛选退化|同上
infra|database/flyway/sql/V2026.07.27.0005__enum_to_varchar_check.sql|114|HIGH|DROP COLUMN heart_signals.status 连带删除 idx_heart_signals_status(0004:40 建)|待处理信号扫描退化|同上
infra|database/flyway/sql/V2026.07.27.0005__enum_to_varchar_check.sql|114|HIGH|DROP COLUMN notifications.type 连带删除 idx_notifications_type(V2026.05.23.0004:15 建)并削弱 idx_notifications_type_created 复合索引(0725.0001:77 建,type 列被移除)|通知类型查询退化|同上
infra|database/flyway/sql/V2026.07.27.0005__enum_to_varchar_check.sql|114|HIGH|DROP COLUMN activities.status 连带删除 idx_activities_status(0524.0004:16 建)并削弱 idx_activities_status_activity_date|活动状态筛选退化|同上
infra|database/flyway/sql/V2026.07.27.0005__enum_to_varchar_check.sql|114|HIGH|DROP COLUMN temp_chat_session.phase 连带删除 idx_temp_chat_session_phase(0527.0001:29 建)|临时会话阶段扫描退化|同上
infra|database/flyway/sql/V2026.05.27.0001__create_temp_chat_tables.sql|2|HIGH|迁移开头 DROP TABLE temp_chat_contact_exchange/temp_chat_message/temp_chat_session 再重建(与 V2026.05.18.2200 重复定义表)|若执行时已有生产数据将直接丢失,不可回滚|改为 ALTER/新增迁移,禁止 DROP 重建
infra|database/flyway/sql/V2026.05.18.2200__phase0_phase1_client_foundation.sql|56|MEDIUM|temp_chat_session 在此建表(phase VARCHAR)后又被 0527.0001:7-31 以 ENUM 结构重建,两份结构不一致|依赖具体执行顺序,后续迁移(0728.0005 引用 session_id)易踩空|合并为单一建表迁移
infra|database/flyway/sql/V2026.06.25.0001__add_user_role_and_init_admin.sql|32|MEDIUM|ADMIN_OPENID 为占位符/空值时插入 openid='' 或 'admin-default-openid-change-me' 的 ADMIN 账号(flyway.toml:13 提供默认值)|幽灵管理员残留,若默认 openid 泄露可被利用|占位符为空则跳过 INSERT
infra|database/flyway/sql/V2026.06.25.0001__add_user_role_and_init_admin.sql|21|MEDIUM|裸 ADD COLUMN role,无 IF NOT EXISTS 守卫|手工环境重跑/半迁移失败后无法恢复|information_schema 守卫
infra|database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql|28|MEDIUM|裸 ADD COLUMN password,无幂等守卫|同上|同上
infra|database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql|35|LOW|占位符未配置时 UPDATE 写入 password='' 空串|管理员密码为空字符串,登录校验可能被绕过(取决于应用校验逻辑)|空占位符时跳过
infra|database/flyway/sql/V2026.07.25.0013__add_check_in_make_up.sql|6|MEDIUM|裸 ADD COLUMN source(同一文件其他部分有幂等,此处无)|重跑失败|加守卫
infra|database/flyway/sql/V2026.07.27.0003__add_remaining_columns_for_atomic_decrement.sql|25|MEDIUM|裸 ADD COLUMN remaining_uses/max_uses_per_user,无守卫|重跑失败|加守卫
infra|database/flyway/sql/V2026.07.27.0003__add_remaining_columns_for_atomic_decrement.sql|38|MEDIUM|裸 ADD COLUMN remaining_amount/remaining_count,无守卫|同上|同上
infra|database/flyway/sql/V2026.07.25.0011__create_profile_visitors.sql|23|MEDIUM|UNIQUE KEY 使用表达式索引 (DATE(visited_at)),要求 MySQL 8.0.13+;低于该版本语法错误|版本兼容风险,且表达式唯一索引性能开销大|改用 visit_date 冗余列
infra|database/flyway/sql/V2026.05.30.0002__create_user_online_status.sql|3|MEDIUM|表未指定 ENGINE/CHARSET/COLLATE,继承库默认排序规则|库默认 collation 不一致(init-mysql.sql 用 unicode_ci)时表级排序规则漂移|显式指定 0900_ai_ci
infra|database/flyway/sql/V2026.07.28.0003__wallet_tables.sql|34|HIGH|资金核心表 user_wallet 无外键 user_id→users(id)|孤儿钱包/资金记录,审计追溯困难|加 FK
infra|database/flyway/sql/V2026.07.28.0003__wallet_tables.sql|46|HIGH|wallet_transaction_log 无外键 user_id→users(id)|资金流水与用户脱钩|加 FK
infra|database/flyway/sql/V2026.07.25.0002__create_vip_red_packets.sql|24|MEDIUM|vip_red_packets 无外键 sender_id→users(id)|删除用户遗留红包记录|加 FK
infra|database/flyway/sql/V2026.07.25.0002__create_vip_red_packets.sql|43|MEDIUM|vip_red_packet_claims 无外键 red_packet_id→vip_red_packets、claimer_id→users|孤儿领取记录|加 FK
infra|database/flyway/sql/V2026.07.25.0003__create_promo_codes.sql|23|MEDIUM|promo_codes 无外键 created_by→users(id)|创建者删除后记录悬空|加 FK
infra|database/flyway/sql/V2026.07.25.0003__create_promo_codes.sql|41|MEDIUM|promo_code_usages 无外键 promo_code_id/user_id|孤儿使用记录|加 FK
infra|database/flyway/sql/V2026.07.25.0005__create_vip_bills.sql|25|MEDIUM|vip_bills 无外键 user_id→users(id)|账单与用户脱钩,对账困难|加 FK
infra|database/flyway/sql/V2026.07.25.0006__create_video_calls.sql|30|MEDIUM|video_calls 无外键 caller_id/callee_id→users(id)|孤儿通话记录|加 FK
infra|database/flyway/sql/V2026.07.25.0007__create_video_call_records.sql|32|MEDIUM|video_call_records 无外键 caller_id/receiver_id|同上|加 FK
infra|database/flyway/sql/V2026.07.25.0010__create_third_party_accounts.sql|32|MEDIUM|third_party_account(单数)与文件名/文档(复数)不一致|后续迁移混用表名易出错|统一命名
infra|database/flyway/sql/V2026.07.25.0012__create_dnd_settings.sql|20|MEDIUM|dnd_settings 无外键 user_id→users(id)|删除用户残留免打扰配置|加 FK
infra|database/flyway/sql/V2026.07.27.0001__payment_callback_log.sql|20|LOW|payment_callback_log 无外键(幂等日志表,可接受但未说明)|审计缺口|补外键或注释说明
infra|database/flyway/sql/V2026.07.27.0002__vip_billing_log.sql|22|LOW|vip_billing_log 无外键 user_id|流水与用户脱钩|加 FK
infra|database/flyway/sql/V2026.05.23.0002__create_check_ins.sql|1|MEDIUM|check_ins 无外键 user_id→users(id)|删除用户残留签到记录|加 FK
infra|database/flyway/sql/V2026.05.29.0001__create_pass_records.sql|3|MEDIUM|pass_records 无外键 user_id/passed_user_id→users|孤儿 pass 记录|加 FK
infra|database/flyway/sql/V2026.05.28.0002__create_social_progress.sql|20|已修复|utf8mb4_unicode_ci 排序规则已由 V2026.07.25.0002__fix_collation.sql 统一(标注状态:已修复)
infra|database/flyway/sql/V2026.05.28.0008__create_daily_benefits.sql|14|已修复|utf8mb4_unicode_ci 已由 fix_collation 修复(标注状态:已修复)
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|312|MEDIUM|uk_payment_callback_log_notification 与 V2026.07.27.0001:27 已建 uk_payment_callback_notification 重复(索引名不同,重复创建)|冗余唯一索引,占用空间|检查索引名再建
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|318|MEDIUM|uk_third_party_account_provider_openid 与 V2026.07.25.0010:40 已建 uk_third_party_provider_open_id 重复|同上|同上
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|340|LOW|uk_promo_codes_code 与 V2026.07.25.0003:37 已建 uk_promo_codes_code 同名时跳过,名称不一致则重复|冗余|同上
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|346|MEDIUM|uk_dnd_settings_user 与 V2026.07.25.0012:31 已建 uk_dnd_user_id 重复|同上|同上
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|352|LOW|注释写 do_not_disturb_settings,实际表名 dnd_settings|文档误导|改注释
infra|database/flyway/sql/V2026.07.28.0005__add_indexes.sql|234|LOW|idx_check_ins_user_date 与既有唯一键 uk_checkin_user_date 列完全一致,冗余|空间浪费|删除
infra|database/flyway/sql/V2026.07.26.0003__add_version_columns.sql|274|LOW|add_fk_if_missing 用 CONCAT 拼 DDL,表/列名未白名单校验|SQL 注入面(当前仅内部调用)|参数化或白名单
infra|database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql|286|MEDIUM|Part 4 迁移 user_feedback_ticket 数据到 feedback_tickets 时字段映射不完整(handled_by→无对应,状态仅 UPPER)|历史反馈工单处理人/附件信息丢失|补映射或记录迁移报告
infra|database/flyway/sql/V2026.05.28.0010__create_post_tags.sql|L3|LOW|版本号从 0008 跳至 0010,缺 0009|审计困惑,无法确定是否遗漏迁移|补空迁移或说明
infra|database/flyway/sql/V2026.07.25.0006__create_video_calls.sql|30|MEDIUM|video_calls 与 video_call_records 两张通话表职责重叠(status 语义冲突)|数据双写/同步成本,易不一致|合并或明确边界
infra|database/flyway/sql/V2026.07.25.0007__create_video_call_records.sql|42|LOW|updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,无默认值|NULL 行 UPDATE 不触发时间更新|加 NOT NULL DEFAULT
infra|database/flyway/sql/V2026.07.28.0003__wallet_tables.sql|77|LOW|INSERT IGNORE 初始化钱包,若并发批量注册(>5000)大事务|初始化耗时长|分批处理
infra|apps/api/src/main/resources/db/migration/V2026070501001__extend_user_basic_profile.sql|19|MEDIUM|裸 ADD COLUMN ×11 无幂等守卫|重跑失败|加守卫
infra|apps/api/src/main/resources/db/migration/V2026070501002__create_media_asset.sql|23|MEDIUM|裸 CREATE TABLE media_asset(无 IF NOT EXISTS)|重跑失败|加 IF NOT EXISTS
infra|apps/api/src/main/resources/db/migration/V2026070501002__create_media_asset.sql|35|LOW|created_at DATETIME NOT NULL 无默认值|插入必须显式提供,与业务表惯例不一致|加 DEFAULT CURRENT_TIMESTAMP
infra|apps/api/src/main/resources/db/migration/V2026070501003__add_media_asset_composite_index.sql|9|MEDIUM|裸 CREATE INDEX 无幂等守卫|重跑失败|加守卫
infra|apps/api/src/main/resources/db/migration/V2026070501004__add_user_verification_flags.sql|10|MEDIUM|裸 ADD COLUMN email_verified/id_card_verified|重跑失败|加守卫
infra|apps/api/src/main/resources/db/migration|整目录|HIGH|版本号格式 V2026070501001(纯数字)与主目录 V2026.xx.xx.xxxx(点分)不一致,Flyway 排序时 2026070501001 排在所有 V2026.* 之后|执行顺序与直觉相反,依赖关系的迁移(media_asset)后置|统一版本格式
```

## 二、Docker / 编排

```
infra|docker-compose.yml|616|HIGH|backup 服务以非 root backup 用户执行 busybox crond,但未加 -c /etc/crontabs 参数;crond 非 root 默认读 /var/spool/cron 且无法写 /var/run/crond.pid|定时备份任务不会执行或 crond 启动失败,备份静默失效|加 -c /etc/crontabs 并预建 pid 文件或用 root crond+脚本内降权
infra|docker-compose.yml|617|MEDIUM|apk add mysql-client~10.11 redis~7.2 gzip tini 每次容器启动重装,未固化到镜像|启动慢、依赖上游仓库可用性|改用自定义镜像预装
infra|docker-compose.yml|98|MEDIUM|--default-authentication-plugin=mysql_native_password 在 MySQL 8.0.34+ 已弃用(8.4 移除)|升级 MySQL 时启动失败;弃用警告噪音|改用 caching_sha2_password + 调整 JDBC URL
infra|docker-compose.yml|239|MEDIUM|RABBITMQ_USERNAME/PASSWORD 默认 guest/guest,若启用 MQ 且未覆盖则弱凭据|消息中间件可被接管|默认置空并强制注入
infra|docker-compose.yml|219|MEDIUM|CORS_ALLOWED_ORIGINS 默认值含 campuslove.example.com 占位域名|生产未覆盖时跨域策略错误|默认置空
infra|docker-compose.yml|545|LOW|node-exporter 挂载 /:/host:ro,rslave 无 SELinux 标签|受限主机上只读挂载失效|加 :ro,z 或注释
infra|docker-compose.yml|588|LOW|DB_PASSWORD 嵌套默认引用 MYSQL_ROOT_PASSWORD,backup 使用 root 备份|最小权限缺失,root 泄漏面大|建独立备份账号
infra|apps/api/Dockerfile|68|LOW|注释声称"按层 COPY",实际一次性 COPY jar 再 extract|缓存优化未生效|按 layers 目录 COPY
infra|apps/admin/Dockerfile|67|LOW|sed 替换 listen 80→8080 依赖 nginx.conf 文本,脆弱|配置变更即构建失败|直接用 8080 模板
infra|apps/admin/docker/nginx.conf|46|LOW|X-XSS-Protection "1; mode=block" 已废弃且可能引入安全风险|无效响应头|移除
infra|apps/admin/docker/nginx.conf|43|LOW|无 Content-Security-Policy|XSS 缓解缺失|补 CSP
infra|apps/admin/docker/nginx.conf|68|LOW|/api/ 反代无 limit_req(仅 client-nginx.conf 有限流)|Admin API 可被爆破|补限流
infra|docker/client-nginx.conf|7|LOW|注释"同一 campus-net 网络"过时(现为 app-net)|误导排障|改注释
infra|docker/client-nginx.conf|28|LOW|无 CSP/HSTS 头|H5 安全头不完整|补
infra|docker/alertmanager/alertmanager.yml|43|MEDIUM|templates 指向 /etc/alertmanager/templates/*.tmpl,但 docker/alertmanager 无 templates 目录且 compose 未挂载|自定义模板(email.default.html)不生效,回退内置模板|删除该配置或补模板
infra|docker/alertmanager/alertmanager.yml|33|LOW|SMTP 占位 smtp.example.com:587 + 空认证,部署后未替换则邮件告警静默失败|critical 告警无法触达|提供部署校验脚本
infra|docker/alertmanager/alertmanager.yml|99|LOW|默认 receiver 指向 http://localhost:9999(容器内无该服务)|告警全部投递失败,仅日志可见|默认接 null-pager
infra|docker/grafana/provisioning/datasources/datasources.yml|12|HIGH|Prometheus 数据源未指定 uid,而 dashboards 全部引用 uid "Prometheus"(api-overview.json:16 等)|Grafana 自动生成随机 uid,所有面板显示数据源未找到,监控面板失效|provisioning 中显式 uid: Prometheus
infra|docker/grafana/provisioning/datasources/datasources.yml|24|MEDIUM|Alertmanager 数据源同样未指定 uid|Grafana 告警模块引用时失效|同上
infra|docker/prometheus/prometheus.yml|34|HIGH|移除 mysql-exporter/redis-exporter 后,数据库/缓存无任何指标采集|MySQL/Redis 故障、慢查询无数据,关联告警规则 DbConnectionPoolHigh 等只反映连接池|部署 exporter 或补齐容器级指标
infra|docker/prometheus/prometheus.yml|55|LOW|honor_labels: true 对静态 target 无意义|配置冗余|删除
infra|docker/prometheus/rules/alert-rules.yml|36|MEDIUM|spring_boot_health_status{status="DOWN"} 标签与 micrometer 实际标签(component)不符,注释"DOWN 时为 1"与常见 UP=1 语义矛盾|规则永不触发或恒触发,健康告警失真|按实际指标标签重写
infra|docker/prometheus/rules/alert-rules.yml|296|HIGH|HighLoginFailureRate 使用指标 campuslove_auth_login_total{status="failed"},应用实际注册 auth.login.success/auth.login.failure(AuthMetrics.java:30-32,Prometheus 导出为 auth_login_success/auth_login_failure)|登录失败率告警永不触发,撞库无感知|改指标名
infra|docker/prometheus/rules/alert-rules.yml|175|MEDIUM|JvmFrequentFullGc 统计全部 jvm_gc_pause_seconds_count 增量,G1 年轻代 GC 也计入|Full GC 告警误报频繁|按 action="end of major GC" 过滤
infra|docker/prometheus/rules/alert-rules.yml|290|MEDIUM|无备份成功/失败指标与告警|备份静默失败无感知,数据安全无兜底|backup 脚本写 pushgateway/textfile 指标并加规则
infra|docker/prometheus/rules/alert-rules.yml|12|MEDIUM|无 SLO / 错误预算(burn-rate)规则,告警仅固定阈值|无法量化可用性达标|补充记录规则与 burn-rate 告警
infra|docker/prometheus/rules/alert-rules.yml|45|LOW|AdminDown 与第三方依赖规则全部注释停用,且 blackbox 未部署|Admin/微信/Agnes 可用性监控空白|部署 blackbox 后启用
infra|docker-compose.yml|80|HIGH|全栈无日志采集组件(Loki/Promtail/ELK/Filebeat),仅 json-file 本地轮转|故障排查无集中日志、无法检索,合规审计缺日志|接入 Loki+Promtail 或 EFK
infra|docker/backup/crontab|5|LOW|参考文件与 compose 动态生成逻辑重复维护|易漂移|删除或标注仅供参考
```

## 三、CI/CD

```
infra|.github/workflows/ci.yml|14|MEDIUM|permissions.packages: write 对所有事件(含 PR)生效,最小权限原则被破坏|PR 触发的工作流具备镜像推送写权限|按事件拆分 permissions
infra|.github/workflows/ci.yml|333|HIGH|Trivy scan API image 的 image-ref 传入 ${{ steps.meta-api.outputs.tags }}(逗号分隔多 tag: ci-<sha>,sha-<sha>)|trivy 只接受单镜像引用,镜像扫描步骤失败或扫描错误对象|逐 tag 扫描
infra|.github/workflows/ci.yml|338|HIGH|同 333 行 Admin 镜像扫描|同上|同上
infra|.github/workflows/ci.yml|397|HIGH|e2e job 无服务编排:webServer 在 CI 下为 undefined(playwright.config.ts:70),未启动 client dev server/API/MySQL,未注入 E2E_BASE_URL|Playwright 连 localhost:5173 失败,e2e 门禁必然失败或形同虚设|CI 起 docker compose 或启动 dev server
infra|tests/e2e/playwright.config.ts|70|HIGH|CI 分支 webServer=undefined 且无任何替代服务,与 ci.yml 无对接|同上|同上
infra|.github/workflows/ci.yml|8|HIGH|推送 tag v* 与 main/develop 走同一套流程,无 CD 部署 job、无镜像部署/回滚步骤|发布流程断裂:镜像推 GHCR 后无部署动作|补 deploy job(SSH/compose pull)
infra|.github/workflows/ci.yml|3|MEDIUM|无 Flyway 迁移验证 job(空库全量迁移 + validate 校验)|重复版本号、IF NOT EXISTS 语法错误、列名错误等问题 CI 完全不拦截,生产首次启动即挂|加 MySQL 8 服务 + flyway migrate 门禁
infra|.github/workflows/ci.yml|56|MEDIUM|gitleaks 仅 detect 全库,未对比 PR 增量|增量泄露可被历史豁免掩盖|--log-opts 增量扫描
infra|.github/workflows/ci.yml|101|LOW|pnpm audit --audit-level high 无 --fix/无报告产物|漏洞修复不可追踪|上传 audit 报告
infra|.github/workflows/ci.yml|278|LOW|ci-<sha7> tag 与 release tag 混用,无版本号递增校验|回滚困难、tag 漂移|校验 semver 或 sha 唯一
infra|.github/workflows/ci.yml|287|MEDIUM|docker/metadata-action 同时产出 raw ci-<sha> 与 type=sha 两个 tag,而 compose TAG 只用一个|部署端拉取 tag 与 CI 推送 tag 集合不一致|统一 tag 策略
infra|.github/workflows/ci.yml|352|LOW|cosign sign 多 tag 逗号拼接,cosign 一次只签一个引用|签名步骤可能失败|逐 tag 签名
infra|package.json|43|HIGH|engines.node ">=18.0.0 <20.0.0" 与 CI actions/setup-node node-version: '20'(ci.yml:93 等)冲突,且 .npmrc:8 engine-strict=true|pnpm install --frozen-lockfile 在 Node 20 下报 Unsupported engine,CI 全部 job 依赖安装失败|统一为 20 或放宽上限
infra|.npmrc|8|HIGH|engine-strict=true 与 engines 上限冲突(见上)|同上|同上
infra|package.json|4|MEDIUM|version 0.1.0 与 CHANGELOG.md:38 [1.0.0]-2026-07-26 已发布版本不一致|发布产物版本漂移|同步版本
infra|apps/api/pom.xml|15|MEDIUM|campus-love-api version 0.1.0 与已发布 1.0.0 不一致|jar 命名/镜像标签混乱|同步
infra|CHANGELOG.md|38|MEDIUM|2026-07-28 之后新增迁移(钱包/索引/审计字段/ENUM 迁移)未记入 CHANGELOG|发布变更不可追溯|补记录
```

## 四、配置安全

```
infra|init-mysql.sql|1|HIGH|库名 campus_love_ci/用户 campus_love 与 compose MYSQL_DATABASE=campus_love、MYSQL_USER=campus 不一致,且密码明文 'campus_love'|部署库/账号分裂,campus_love@localhost 用户无法经网络连接,弱明文密码残留|删除该脚本或与 compose 对齐
infra|init-mysql.sql|2|MEDIUM|明文密码 'campus_love' 入库文件|凭据泄露面|改用环境变量
infra|.gitignore|157|MEDIUM|init-mysql.sql 被 gitignore,但 docker-compose.yml:111 挂载它|新 clone 环境无此文件,bind mount 变成空目录,初始化脚本缺失|取消忽略或改用卷内脚本
infra|set-root-password.sql|1|MEDIUM|root 密码明文设为 'root'|若被执行,数据库 root 弱密码|删除该文件
infra|.env.example|103|MEDIUM|CORS_ALLOWED_ORIGINS 默认含 example.com 占位域名|生产未替换时跨域配置错误|占位符化
infra|.env.example|108|LOW|RABBITMQ_USERNAME=guest 明文默认|弱凭据默认值|占位符化
infra|.env.example|42|LOW|DB_USERNAME=campus 与 init-mysql.sql 用户不一致|配置漂移|统一
infra|.env.example|181|LOW|TAG=dev 默认(注释已警示)|生产误用 dev tag 部署|加 CI 强制校验
infra|apps/api/src/main/resources/application-db.yml|65|MEDIUM|admin_openid 占位符默认 admin-default-openid-change-me|未配置 ADMIN_OPENID 时插入固定 openid 管理员|改为无默认值
infra|database/flyway/flyway.toml|13|MEDIUM|CLI 路径 admin_openid 默认值同上|同上|移除默认
infra|apps/api/src/main/resources/application.yml|38|MEDIUM|rabbitmq username/password 默认 guest/guest|应用启动尝试弱凭据连接|默认置空
infra|apps/api/src/main/resources/application-db.yml|97|MEDIUM|同 38 行 rabbitmq guest 默认|同上|同上
infra|.gitleaks.toml|39|LOW|regexes 豁免 'campus_love'(数据库名)覆盖全部文件|真实含 campus_love 的凭据串可能被放行|收紧为 URL 上下文
infra|.gitleaks.toml|47|LOW|测试资源目录整目录白名单|测试中误放真实凭据不可见|按文件精确豁免
infra|scripts/generate-secret.sh|30|MEDIUM|admin_hash 默认明文密码 "ChangeMe123!"|按默认生成的管理员密码弱|强制传参,无默认
infra|scripts/generate-secret.sh|40|MEDIUM|密码直接内插进 python3 -c 命令字符串|含引号/特殊字符时命令注入或密码进进程参数|环境变量/文件传递
infra|scripts/backup-mysql.sh|131|MEDIUM|mysqldump --password 明文进进程参数|容器内其他进程可读备份密码|改 MYSQL_PWD 环境变量
infra|scripts/backup-mysql.sh|200|MEDIUM|redis-cli -a 明文密码进进程参数|同上|用 REDISCLI_AUTH
infra|scripts/backup-mysql.sh|217|MEDIUM|BGSAVE 轮询 60s 超时后未检测失败,直接复制 RDB|超时后可能复制到未完成/旧 RDB,静默产生坏备份|超时即失败退出
infra|scripts/backup-mysql.sh|154|LOW|mysqldump 无 --routines 依赖项 mysql.proc 权限检查|权限不足时备份失败(已有错误处理)|文档注明所需权限
infra|scripts/backup-mysql.sh|53|LOW|BACKUP_DIR 默认 /backup 与 compose 注入 /backups 不一致(注释已说明)|直跑脚本与容器行为不同|统一默认值
infra|scripts/backup-mysql.sh|262|LOW|清理仅按 mtime 不校验备份完整性|坏备份过期前不被发现|清理前 gzip -t 校验
infra|scripts/backup-mysql.sh|46|LOW|set -e 下 redis-cli 失败处理已覆盖,但 cron 环境无 PATH 保障|cron 下 mysqldump 找不到|脚本内设置 PATH
infra|docker-compose.yml|596|MEDIUM|backup 以 root 连接 MySQL 备份(DB_USER=root 默认)|最小权限缺失|独立备份账号
```

## 五、监控/备份/文档

```
infra|docs/DR/restore-procedure.md|66|HIGH|全篇引用不存在的服务名 mysql-backup(docker-compose 实际服务名 backup)|恢复命令全部不可执行,灾难时无法按文档恢复|批量替换为 backup
infra|docs/DR/restore-procedure.md|29|MEDIUM|容器内脚本路径 /usr/local/bin/backup-mysql.sh 与 compose 挂载 /backup.sh 不符|手动触发备份命令失效|改 /backup.sh
infra|docs/DR/restore-procedure.md|103|MEDIUM|恢复时 CREATE DATABASE 用 utf8mb4_unicode_ci,与生产 0900_ai_ci 不一致|恢复后库默认 collation 漂移,新表排序规则不一致|改 0900_ai_ci
infra|docs/DR/restore-procedure.md|17|HIGH|声称 binlog 增量实时/PITR,但 docker-compose.yml mysql 未开启 log-bin|PITR 恢复场景实际不可行|compose 启用 binlog 或删除 PITR 章节
infra|docs/DR/restore-procedure.md|271|LOW|演练记录仅 2026-07-26 一次,无季度演练证据|恢复能力未经验证|按 5.1 计划执行并记录
infra|docs/DR/DRP.md|76|MEDIUM|声称 Redis RDB 每 5 分钟,compose 实际 --save 60 1000(60s 内 1000 写才落盘)|DRP 数据与部署不符,RPO 声明虚假|对齐配置
infra|docs/DR/DRP.md|77|MEDIUM|声称 Elasticsearch 每日快照,项目未部署 ES|文档虚构,误导容灾规划|删除或标注未部署
infra|docs/DR/DRP.md|78|MEDIUM|声称 RabbitMQ 队列持久化,compose 未部署 RabbitMQ|同上|同上
infra|docs/DR/DRP.md|47|MEDIUM|数据库恢复 RPO 1h 依赖 binlog,但 binlog 未启用|RPO 目标不可达成|启用 binlog
infra|docs/CI-CD.md|104|MEDIUM|声称"未配置 workflow_dispatch",实际 ci.yml:9 已配置|文档与代码不一致|更新
infra|docs/CI-CD.md|106|LOW|声称 permissions 仅 contents: read,实际含 packages: write|同上|更新
infra|docs/CI-CD.md|234|MEDIUM|声称 trivy-action@master,实际固定 @v0.23.0|文档过时|更新
infra|docs/CI-CD.md|278|LOW|声称 npx playwright test,实际需 --config=tests/e2e/playwright.config.ts|本地复现命令失效|更新
infra|docs/CI-CD.md|329|MEDIUM|4.1/4.2 镜像构建/推送命令仍含 :latest 并写 GIT_SHA,与 CI 实际 ci-<sha> tag、禁 latest 策略冲突|发布流程误导|重写
infra|docs/CI-CD.md|462|LOW|迁移命名规范 V{yyyy.MM.dd.HHmm} 与实际 V{yyyy.MM.dd.xxxx} 不符|新迁移命名混乱|更新
infra|docs/CI-CD.md|512|MEDIUM|7.2 告警表(ApiHighP99Latency/ApiInstanceDown/JvmHighMemoryUsage/MysqlSlowQuery/ThirdPartyApiDown 等)与 alert-rules.yml 实际规则名不符|运维按表查不到告警|同步
infra|docs/CI-CD.md|544|MEDIUM|8.2 备份命令 docker compose exec db-backup 服务不存在(实际 backup)|命令失效|更新
infra|docs/CI-CD.md|576|MEDIUM|9.2 数据库回滚命令引用不存在的 db-backup 服务|同上|更新
infra|docs/CI-CD.md|602|LOW|发布清单列 9 个 job,实际含 gitleaks 共 10 个|清单不完整|更新
infra|docs/CI-CD.md|648|LOW|"gh workflow run ci.yml" 注释与 104 行"未配置 workflow_dispatch"自相矛盾|文档内部矛盾|统一
infra|DEPLOYMENT.md|705|MEDIUM|声称 admin/client 通过 API_UPSTREAM 环境变量注入后端地址,实际已写死 api:8080(infra #15)|文档过时|更新
infra|DEPLOYMENT.md|764|MEDIUM|抓取目标列表含 mysql-exporter/redis-exporter/blackbox-http,实际 prometheus.yml 已移除|监控部署期望落空|更新
infra|DEPLOYMENT.md|773|MEDIUM|告警类别列表(MysqlDown/RedisDown/AdminDown/JvmGcPauseHigh/MatchSuccessRateLow 等)与实际规则文件不符,HostDiskHigh 阈值 85% vs 实际 80%|运维误导|更新
infra|DEPLOYMENT.md|862|LOW|声称 api-logs 卷持久化到宿主 ./logs/api,compose 实际为命名卷无 bind|日志位置描述错误|更新
infra|DEPLOYMENT.md|236|LOW|JWT_SECRET 示例 "your-production-secret-32-chars-min" 弱值,照抄风险|弱密钥上线|改随机生成示例
infra|DEPLOYMENT.md|307|LOW|"启动 db-backup 服务" 服务名错误(实际 backup)|命令失效|更新
infra|DEPLOYMENT.md|209|MEDIUM|jar 名 campus-love-api-0.1.0.jar 与 pom/CHANGELOG 版本脱节|发布产物对不上|同步版本
infra|DEPLOYMENT.md|917|LOW|回滚示例 TAG_ROLLBACK=ci-previous1234 无实际来源说明|回滚流程不可执行|补 tag 管理说明
infra|docs/database-indexes.md|90|LOW|索引表列 idx_checkin_user_id/idx_checkin_date,而迁移实际仅 uk_checkin_user_date 等|文档与库不一致|同步
infra|docs/branching.md|5|LOW|release/YYYY-MM-DD 命名与 CI-CD.md 的 release/v{version} 不一致,且 workflow 未监听 release/* 分支|分支策略落地不一致|统一
infra|docs/CI-CD.md|110|LOW|文档称 9 个 Job,未含 gitleaks-scan(ci.yml:56)|同上|更新
infra|docs/CI-CD.md|3|MEDIUM|无 SLO/错误预算定义章节(用户要求监控 SLO)|SLO 缺失|补 SLO 定义文档
infra|docs/DR/restore-procedure.md|22|MEDIUM|备份存储位置写 /backup 与 compose /backups 不符|恢复时找不到文件|更新
infra|docs/DR/restore-procedure.md|335|MEDIUM|7.1 dry-run 命令引用 mysql-backup 容器,同上服务名错误|校验流程失效|更新
infra|docs/DR/restore-procedure.md|411|LOW|9.2 命令速查同 mysql-backup 错误|同上|更新
infra|docs/DR/restore-procedure.md|315|LOW|6.3 磁盘满清理引用 mysql-backup|同上|更新
infra|docs/DR/restore-procedure.md|189|LOW|mysqlbinlog 重放命令缺 --stop-position 安全边界,跨库无 --skip-gtids|PITR 可能误伤|补充参数
infra|docs/DR/restore-procedure.md|421|LOW|sed 替换 DEFINER 命令在文件级执行有风险|恢复文档建议可致 SQL 破坏|改为 mysql 用户匹配
infra|docs/DR/DRP.md|34|LOW|P0 响应时间 ≤15 分钟但无值班/on-call 轮值机制定义|响应承诺不可达|补值班制度
infra|docs/DR/DRP.md|100|LOW|RTO/RPO 声明(RPO≤24h)与 2.1 表(RPO 1h)自相矛盾|目标不可审计|统一
infra|docs/release-checklist.md|1|LOW|未核对(工作区存在,但版本与 CHANGELOG 1.0.0 对齐情况未验证)|发布门禁文本漂移|按发布周期审校
infra|README.md|1|LOW|CI 徽章占位 {org}/{repo} 未替换(docs/CI-CD.md:287 同)|README 占位符未替换|替换真实仓库
infra|docs/CI-CD.md|287|LOW|CI 徽章 URL 占位 {org}/{repo}|同上|同上
infra|docker-compose.yml|30|已修复|P1.19 安全提示与 ${VAR:?} 强制注入已实施(标注状态:已修复)
infra|docker-compose.yml|54|已修复|网络按 data-net/app-net 拆分、端口绑定 127.0.0.1、资源限制、healthcheck 密码环境变量化(FIN-01328~01340 已修复,标注状态:已修复)
infra|.github/workflows/ci.yml|232|已修复|mvn 编译/测试门禁已添加(标注状态:已修复)
infra|docker-compose.yml|262|已修复|Flyway 迁移目录不再挂载 initdb.d,仅挂载迁移目录(标注状态:已修复)
infra|docker-compose.yml|189|已修复|TAG 默认 dev 禁止 latest(标注状态:已修复)
infra|.gitleaks.toml|25|已修复|BCrypt 哈希白名单已移除,改为路径精确豁免(标注状态:已修复)
```
## 领域总结(按严重度统计)

- **CRITICAL 33 条**:Flyway 四组重复版本号(4)+ 三文件 36 处 `CREATE INDEX IF NOT EXISTS`(MySQL 不支持,迁移必挂)+ V2026.07.28.0005 三处引用不存在列(followed_id/sender_user_id/claimer_user_id)+ APP_FLYWAY_LOCATIONS 覆盖导致 media_asset 建表后置、容器部署迁移链断裂。**结论:当前迁移集在 MySQL 8.0 全新环境无法完整执行,生产首启即失败,须先修复版本冲突与非法语法,再谈部署。**
- **HIGH 20 条**:ENUM→VARCHAR 迁移 DROP COLUMN 连带删除 6+ 个高频索引不重建;e2e 无服务编排必失败;grafana 数据源 uid 未配置导致面板全失效;登录失败率告警指标名不存在;backup crond 非 root 参数缺失导致定时备份失效;compose 未启用 binlog 但文档声称 PITR;restore-procedure 全篇服务名错误;资金表无外键;日志采集与数据库监控缺失。
- **MEDIUM 62 条**:幂等守卫缺失、幽灵管理员占位符、冗余唯一索引、RabbitMQ guest 默认、明文进程参数密码、CHANGELOG/版本号漂移、CI-CD.md/DEPLOYMENT.md/DRP.md 大量过时内容等。
- **LOW 48 条**:注释过时、命名不一致、废弃响应头、占位符未替换(CI 徽章)、文档命令拼写等。
- **已修复确认 6 项**:网络隔离/FIN-01328~01340、${VAR:?} 强制注入、Flyway 挂载策略、TAG 禁 latest、CI mvn 门禁、gitleaks 白名单收紧(均已标注)。
