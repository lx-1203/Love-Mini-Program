# 校园恋爱小程序 - 故障排查手册

> 对应规范：`.trae/specs/2026-07-26-commercialize-longterm-fixall/tasks.md` Task 9.2.6
> 适用对象：DevOps、运维、On-Call 工程师
> 维护者：DevOps Lead
> 最近更新：2026-07-26
> 版本：v1.0.0
> 配套文档：`docs/DR/DRP.md`、`docs/DR/restore-procedure.md`、`docs/ADMIN-GUIDE.md`、`docs/CI-CD.md`

---

## 目录

1. [故障分级与响应](#1-故障分级与响应)
2. [快速诊断工具箱](#2-快速诊断工具箱)
3. [常见故障排查](#3-常见故障排查)
4. [性能问题排查](#4-性能问题排查)
5. [数据库故障](#5-数据库故障)
6. [缓存故障](#6-缓存故障)
7. [网络与网关故障](#7-网络与网关故障)
8. [微信小程序特定问题](#8-微信小程序特定问题)
9. [WebSocket 与实时通信](#9-websocket-与实时通信)
10. [文件上传与媒体](#10-文件上传与媒体)
11. [CI/CD 故障](#11-cicd-故障)
12. [日志与监控](#12-日志与监控)

---

## 1. 故障分级与响应

### 1.1 故障等级

| 等级 | 描述 | 响应时间 | 升级路径 | 示例 |
|------|------|----------|----------|------|
| **P0 - 紧急** | 全站不可用 / 数据丢失 / 安全漏洞 | 5 分钟 | On-Call → Tech Lead → CTO | API 宕机、数据库损坏 |
| **P1 - 严重** | 核心功能不可用 / 大量用户受影响 | 15 分钟 | On-Call → Tech Lead | 微信登录失败、匹配不可用 |
| **P2 - 中等** | 部分功能异常 / 少量用户受影响 | 1 小时 | On-Call | 某校区用户无法发帖 |
| **P3 - 轻微** | 体验问题 / 单用户问题 | 4 小时 | 工单处理 | 个人主页加载慢 |

### 1.2 响应流程

```
告警触发 → On-Call 介入（5min）→ 评估等级 → 止血（30min）→ 根因分析 → 修复 → 复盘
```

#### 1.2.1 止血优先

- **优先恢复服务**，而非找到根因
- 可选手段：回滚、重启、扩容、降级、限流、停服

#### 1.2.2 沟通规范

- **告警渠道**：钉钉群 + 电话
- **进度同步**：每 30 分钟在钉钉群同步进展
- **用户公告**：≥ 30 分钟未恢复需发公告
- **复盘文档**：72 小时内提交 post-mortem

### 1.3 升级矩阵

| 时长 | P0 | P1 | P2 |
|------|-----|-----|-----|
| 0-15min | On-Call | On-Call | 工单 |
| 15-30min | + Tech Lead | + Tech Lead | On-Call |
| 30-60min | + CTO + CEO | + Tech Lead | + Tech Lead |
| 1-2h | + 全员 | + CTO | + Tech Lead |
| > 2h | 全员应急 | 全员应急 | + CTO |

---

## 2. 快速诊断工具箱

### 2.1 健康检查

```bash
# API 健康
curl -fsS https://api.campuslove.example.com/actuator/health

# Admin 健康
curl -fsS https://admin.campuslove.example.com/health

# 各组件健康
curl -fsS https://api.campuslove.example.com/actuator/health | jq '.components'
```

### 2.2 服务状态

```bash
# 全部容器状态
docker compose ps

# 特定服务状态
docker compose ps api
docker compose ps mysql
docker compose ps redis

# 资源占用
docker stats --no-stream
```

### 2.3 日志查看

```bash
# API 日志（实时）
docker compose logs -f --tail=200 api

# API 错误日志
docker compose logs api | grep -i "error\|exception"

# 特定 TraceId
docker compose logs api | grep "trace-id-xxx"

# MySQL 慢查询
docker compose exec mysql cat /var/lib/mysql/slow.log | tail -100

# Redis 慢日志
docker compose exec redis redis-cli slowlog get 10

# nginx 访问日志
docker compose exec admin cat /var/log/nginx/access.log | tail -100
```

### 2.4 数据库检查

```bash
# 进入 MySQL
docker compose exec mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" campus_love

# 查看进程列表
mysql> SHOW PROCESSLIST;

# 查看锁等待
mysql> SELECT * FROM information_schema.INNODB_LOCK_WAITS;

# 查看慢查询
mysql> SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
```

### 2.5 Redis 检查

```bash
# 进入 Redis CLI
docker compose exec redis redis-cli

# 查看内存
127.0.0.1:6379> INFO memory

# 查看 Key 数量
127.0.0.1:6379> DBSIZE

# 查看慢日志
127.0.0.1:6379> SLOWLOG GET 10

# 查看客户端
127.0.0.1:6379> CLIENT LIST
```

### 2.6 网络检查

```bash
# 端口连通性
telnet api.campuslove.example.com 443

# DNS 解析
nslookup api.campuslove.example.com

# HTTP 头部
curl -I https://api.campuslove.example.com/actuator/health

# TLS 证书
openssl s_client -connect api.campuslove.example.com:443 -servername api.campuslove.example.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

### 2.7 监控面板

- **Grafana**：https://grafana.campuslove.example.com
- **Prometheus**：https://prometheus.campuslove.example.com
- **Alertmanager**：https://alertmanager.campuslove.example.com

---

## 3. 常见故障排查

### 3.1 API 服务不可用

#### 现象

- 健康检查返回非 200
- 客户端无法登录、加载缓慢
- 502/503/504 错误

#### 排查步骤

1. **检查容器状态**：
   ```bash
   docker compose ps api
   # 若 STATUS 为 Exited 或 Restarting，进入下一步
   ```

2. **查看启动日志**：
   ```bash
   docker compose logs --tail=200 api
   ```
   常见错误：
   - `Port 8080 was already in use` → 端口冲突，停止占用进程
   - `Cannot connect to MySQL` → 数据库未就绪，检查 mysql 容器
   - `Cannot connect to Redis` → Redis 未就绪
   - `OutOfMemoryError` → JVM 内存不足，调大 `-Xmx`
   - `FileNotFoundException: application.yml` → 配置文件丢失

3. **检查依赖服务**：
   ```bash
   docker compose ps mysql redis
   curl -fsS http://mysql:3306 2>&1 | head -1  # 应返回 MySQL 版本信息
   ```

4. **检查磁盘空间**：
   ```bash
   df -h
   # 若使用率 > 90%，清理日志/镜像
   docker system prune -af --volumes
   ```

5. **检查内存**：
   ```bash
   free -h
   # 若可用 < 500MB，需扩容或重启服务
   ```

#### 止血方案

- **重启 API**：`docker compose restart api`
- **回滚版本**：`docker compose up -d --no-deps api --image campus-love-api:v0.9.0`
- **扩容**：临时调大 JVM 内存 `-XX:MaxRAMPercentage=80`
- **限流**：nginx 配置 `limit_req_zone`
- **维护页面**：`sudo nginx -s reload -c /etc/nginx/nginx-maintenance.conf`

### 3.2 微信登录失败

#### 现象

- 用户点击登录后无响应或报错
- 错误信息：`INVALID_CODE` / `WECHAT_API_ERROR` / `USER_DISABLED` / `CLIENT_ERROR`

#### 排查步骤

1. **检查微信 API 配置**：
   ```bash
   # 验证 AppID 与 Secret
   docker compose exec api env | grep -i wechat
   ```

2. **测试微信 API 连通性**：
   ```bash
   # 从 API 容器内调用微信 API
   docker compose exec api curl -fsS "https://api.weixin.qq.com/sns/jscode2session?appid=$WECHAT_APPID&secret=$WECHAT_SECRET&js_code=test&grant_type=authorization_code"
   ```
   - 返回 `errcode: 40029` → code 无效（用户重新登录）
   - 返回 `errcode: 40163` → code 已使用（用户重新登录）
   - 返回 `errcode: 45011` → 频率限制
   - 返回 `errcode: -1` → 微信 API 故障，等待恢复

3. **检查 Redis Token 黑名单**：
   ```bash
   docker compose exec redis redis-cli KEYS "jwt:blacklist:*"
   # 若数量异常多，可能误黑名单
   ```

4. **查看用户状态**：
   ```sql
   SELECT id, status, open_id FROM users WHERE open_id = 'xxx';
   -- status='disabled' 表示被封禁
   ```

5. **检查日志**：
   ```bash
   docker compose logs api | grep -i "wechat\|login"
   ```

#### 止血方案

- 微信 API 故障：等待恢复，前端显示「微信服务异常，请稍后再试」
- AppSecret 错误：紧急更新环境变量并重启 API
- 大规模失败：检查是否有 IP 被微信封禁

### 3.3 用户无法发送消息

#### 现象

- 聊天页面发送消息后无响应
- 消息状态长期「发送中」

#### 排查步骤

1. **检查 WebSocket 连接**：
   ```bash
   # 在线连接数
   docker compose exec redis redis-cli PUBSUB CHANNELS "ws:*" | wc -l
   ```

2. **检查消息队列**（如使用 RabbitMQ）：
   ```bash
   docker compose exec rabbitmq rabbitmqctl list_queues
   # 查看是否有积压
   ```

3. **检查会话状态**：
   ```sql
   SELECT id, status, expires_at FROM private_chat_sessions WHERE id = 'xxx';
   -- status='ended' 或 expires_at < NOW() 表示已过期
   ```

4. **检查双方匹配关系**：
   ```sql
   SELECT * FROM matches WHERE (user_id=A AND target_user_id=B) OR (user_id=B AND target_user_id=A);
   ```

5. **检查是否被拉黑**：
   ```sql
   SELECT * FROM user_blocks WHERE blocker_id=A AND blocked_id=B;
   ```

#### 止血方案

- WebSocket 服务重启：`docker compose restart api`
- 临时聊天过期：引导用户重新匹配
- 队列积压：扩容消费者

### 3.4 上传失败

#### 现象

- 图片/视频上传返回 500
- 上传后无法访问

#### 排查步骤

1. **检查磁盘空间**：
   ```bash
   df -h
   docker compose exec api df -h /app/uploads
   ```

2. **检查上传目录权限**：
   ```bash
   docker compose exec api ls -la /app/uploads
   # 应为 755 且 owner 为应用用户
   ```

3. **检查文件大小限制**：
   - nginx：`client_max_body_size 50M;`
   - Spring：`spring.servlet.multipart.max-file-size=50MB`

4. **检查 magic bytes 校验**：
   ```bash
   docker compose logs api | grep -i "magic\|mime"
   # 若有 magic bytes 不匹配，可能文件被篡改
   ```

5. **检查鉴权代理**：
   ```bash
   # 用真实 token 测试
   curl -H "Authorization: Bearer xxx" \
     https://api.campuslove.example.com/api/v1/media/123/202607/abc.jpg
   ```

#### 止血方案

- 磁盘满：清理旧日志、扩容磁盘
- 权限错：`chown -R app:app /app/uploads`
- 临时关闭 magic bytes 校验（不推荐，仅紧急情况）

### 3.5 客户端构建失败

#### 现象

- `pnpm run build:mp-weixin` 失败
- 微信开发者工具编译错误

#### 排查步骤

1. **查看构建日志**：
   ```bash
   pnpm --filter @campus-love/client run build:mp-weixin 2>&1 | tee build.log
   ```

2. **常见错误**：
   - `Cannot find module 'xxx'` → 依赖未安装，`pnpm install`
   - `Type 'xxx' is not assignable` → TypeScript 类型错误
   - `Unexpected token` → 语法错误或不支持的 ES 特性
   - `Module not found: Error: Can't resolve 'xxx'` → 路径错误或文件不存在

3. **检查 TypeScript**：
   ```bash
   pnpm --filter @campus-love/client run typecheck
   ```

4. **检查依赖版本**：
   ```bash
   pnpm --filter @campus-love/client outdated
   ```

5. **微信小程序限制**：
   - 主包 > 2MB → 拆分分包
   - 分包 > 16MB → 优化资源
   - 不支持的 API → 条件编译

#### 止血方案

- 回滚至上一可构建版本：`git checkout HEAD~1 -- apps/client/`
- 跳过 typecheck 临时构建（不推荐）：`pnpm run build:mp-weixin -- --no-typecheck`

---

## 4. 性能问题排查

### 4.1 API 响应慢

#### 现象

- P99 > 2s
- 用户反馈卡顿

#### 排查步骤

1. **定位慢端点**：
   ```bash
   # Prometheus 查询
   rate(http_server_requests_seconds_bucket{le="2"}[5m])
   / rate(http_server_requests_seconds_count[5m])
   ```

2. **检查 JVM**：
   ```bash
   # GC 情况
   docker compose exec api jstat -gcutil 1 1000 10

   # 线程堆栈
   docker compose exec api jstack 1 > thread-dump.txt

   # 内存直方图
   docker compose exec api jmap -histo 1 | head -50
   ```

3. **检查数据库**：
   ```bash
   # 慢查询
   docker compose exec mysql mysqladmin -u root -p processlist

   # EXPLAIN
   mysql> EXPLAIN SELECT ... FROM ... WHERE ...;
   ```

4. **检查 Redis**：
   ```bash
   docker compose exec redis redis-cli --latency
   docker compose exec redis redis-cli slowlog get 10
   ```

5. **检查网络**：
   ```bash
   # 容器间延迟
   docker compose exec api ping mysql
   docker compose exec api ping redis
   ```

#### 优化方向

- **数据库**：添加索引、优化 SQL、读写分离
- **缓存**：增加 @Cacheable、调整 TTL
- **JVM**：调大堆内存、调整 GC 算法
- **限流**：Bucket4j 限流保护
- **异步化**：非核心逻辑改异步

### 4.2 数据库慢查询

#### 现象

- 慢查询日志激增
- 数据库 CPU 高

#### 排查步骤

1. **查看慢日志**：
   ```bash
   docker compose exec mysql cat /var/lib/mysql/slow.log | tail -100
   ```

2. **EXPLAIN 分析**：
   ```sql
   EXPLAIN SELECT ...;
   -- 关注 type、key、rows、Extra
   ```

3. **检查索引使用**：
   ```sql
   SELECT * FROM sys.schema_unused_indexes WHERE object_schema = 'campus_love';
   ```

4. **检查锁等待**：
   ```sql
   SELECT * FROM information_schema.INNODB_LOCK_WAITS;
   SHOW ENGINE INNODB STATUS;
   ```

#### 优化方向

- 添加缺失索引（参考 `docs/database-indexes.md`）
- 优化 N+1 查询（参考 P2 阶段优化）
- 使用 `@EntityGraph` 预加载关联
- 拆分大事务
- 使用只读副本

### 4.3 内存泄漏

#### 现象

- JVM 内存持续增长不释放
- 频繁 Full GC
- OOM 错误

#### 排查步骤

1. **监控内存**：
   ```bash
   docker compose exec api jstat -gcutil 1 5000
   # 关注 OU（Old 区使用率），若持续增长且 Full GC 后不下降，疑似内存泄漏
   ```

2. **导出堆 dump**：
   ```bash
   docker compose exec api jmap -dump:format=b,file=/tmp/heap.hprof 1
   docker compose cp api:/tmp/heap.hprof ./heap.hprof
   ```

3. **分析 dump**：
   - 使用 MAT (Memory Analyzer Tool) 或 VisualVM
   - 查找大对象、引用链

4. **常见泄漏点**：
   - 静态集合类未清理
   - ThreadLocal 未 remove
   - 监听器未注销
   - 数据库连接未关闭

#### 止血方案

- 重启 API：`docker compose restart api`
- 调大堆内存：`-Xmx2g`
- 临时限制流量

### 4.4 高 CPU

#### 现象

- CPU 使用率持续 > 80%
- 响应时间变长

#### 排查步骤

1. **定位进程**：
   ```bash
   top -c
   # 找到 CPU 高的进程
   ```

2. **定位线程**：
   ```bash
   top -H -p <pid>
   # 找到 CPU 高的线程
   ```

3. **查看线程堆栈**：
   ```bash
   # 转换 nid（十六进制）
   printf "%x\n" <tid>
   # 在 jstack 输出中查找
   docker compose exec api jstack <pid> | grep -A 30 "nid=0x<hex>"
   ```

4. **常见原因**：
   - 死循环
   - 复杂正则
   - 频繁 Full GC
   - 加密/解密计算密集

---

## 5. 数据库故障

### 5.1 数据库不可用

#### 现象

- API 报 `Cannot connect to MySQL`
- 健康检查 `db` 组件 DOWN

#### 排查步骤

1. **检查 MySQL 容器**：
   ```bash
   docker compose ps mysql
   docker compose logs --tail=200 mysql
   ```

2. **常见错误**：
   - `InnoDB: Unable to lock ./ibdata1` → 多实例冲突，杀掉旧进程
   - `Disk full` → 磁盘满，清理
   - `Too many connections` → 连接数超限，调大 `max_connections`

3. **手动启动**：
   ```bash
   docker compose up -d mysql
   # 等待 healthy
   docker compose exec mysql mysqladmin -u root -p ping
   ```

#### 止血方案

- 重启 MySQL：`docker compose restart mysql`
- 恢复备份：见 `docs/DR/restore-procedure.md`
- 切换主从（如使用）

### 5.2 数据损坏

#### 现象

- 查询返回错误数据
- 表损坏

#### 排查步骤

1. **检查表状态**：
   ```sql
   CHECK TABLE users, posts, private_messages;
   ```

2. **修复表**：
   ```sql
   REPAIR TABLE users;
   ```

3. **检查 InnoDB 状态**：
   ```sql
   SHOW ENGINE INNODB STATUS\G
   ```

#### 止血方案

- 立即停服（避免数据继续损坏）
- 恢复最近备份：见 `docs/DR/restore-procedure.md`
- 应用 binlog 补增量

### 5.3 主从延迟

#### 现象

- 从库数据落后主库
- 读写分离场景读不到最新数据

#### 排查步骤

1. **检查从库状态**：
   ```sql
   SHOW SLAVE STATUS\G
   -- 关注 Seconds_Behind_Master
   ```

2. **检查大事务**：
   ```sql
   SELECT * FROM information_schema.INNODB_TRX ORDER BY trx_started LIMIT 5;
   ```

#### 止血方案

- 暂时切走从库流量
- 等待追平
- 优化大事务

---

## 6. 缓存故障

### 6.1 Redis 不可用

#### 现象

- API 报 `Cannot connect to Redis`
- 缓存全部失效，DB 压力骤增

#### 排查步骤

1. **检查 Redis 容器**：
   ```bash
   docker compose ps redis
   docker compose logs --tail=200 redis
   ```

2. **测试连接**：
   ```bash
   docker compose exec redis redis-cli ping
   # 应返回 PONG
   ```

3. **检查内存**：
   ```bash
   docker compose exec redis redis-cli INFO memory
   # used_memory_human、maxmemory_human
   ```

4. **检查持久化**：
   ```bash
   docker compose exec redis redis-cli INFO persistence
   # rdb_last_bgsave_status、aof_last_bgrewrite_status
   ```

#### 止血方案

- 重启 Redis：`docker compose restart redis`
- 清空缓存：`docker compose exec redis redis-cli FLUSHDB`（谨慎）
- 降级到 Caffeine 本地缓存（自动）
- 限流 API 保护 DB

### 6.2 缓存穿透

#### 现象

- 大量请求穿透到 DB
- DB CPU 高

#### 排查步骤

1. **识别穿透 Key**：
   ```bash
   docker compose logs api | grep "cache miss"
   ```

2. **检查空值缓存**：
   - 是否对不存在的 Key 缓存空值
   - TTL 是否合理

#### 止血方案

- 启用布隆过滤器
- 空值缓存延长 TTL
- 限流

### 6.3 缓存雪崩

#### 现象

- 大量 Key 同时过期
- DB 突增压力

#### 排查步骤

1. **识别批量过期**：
   ```bash
   docker compose exec redis redis-cli --bigkeys
   ```

#### 止血方案

- TTL 添加随机偏移（如 `3600 + random(300)`）
- 多级缓存（Redis + Caffeine）
- 限流

### 6.4 缓存击穿

#### 现象

- 热点 Key 过期瞬间大量请求打到 DB

#### 止血方案

- 互斥锁（Redis SETNX）
- 热点 Key 永不过期，主动更新
- 异步刷新

---

## 7. 网络与网关故障

### 7.1 502 Bad Gateway

#### 现象

- nginx 返回 502
- API 容器健康但 nginx 无法连接

#### 排查步骤

1. **检查 API 健康**：
   ```bash
   curl -fsS http://api:8080/actuator/health
   ```

2. **检查 nginx upstream**：
   ```bash
   docker compose exec admin nginx -T | grep -A 5 upstream
   ```

3. **检查容器网络**：
   ```bash
   docker network inspect campus-love-net
   ```

#### 止血方案

- 重启 nginx：`docker compose restart admin`
- 重启 API：`docker compose restart api`

### 7.2 504 Gateway Timeout

#### 现象

- nginx 等待 API 响应超时

#### 排查步骤

1. **检查 API 响应时间**：
   ```bash
   curl -w "@/tmp/curl-format" -o /dev/null -s https://api.campuslove.example.com/actuator/health
   ```

2. **检查 nginx 超时配置**：
   ```nginx
   proxy_connect_timeout 60s;
   proxy_send_timeout 60s;
   proxy_read_timeout 60s;
   ```

#### 止血方案

- 优化慢接口
- 临时调大 nginx 超时
- 限流

### 7.3 SSL 证书过期

#### 现象

- 浏览器提示证书无效
- 客户端 HTTPS 请求失败

#### 排查步骤

1. **检查证书有效期**：
   ```bash
   echo | openssl s_client -connect api.campuslove.example.com:443 -servername api.campuslove.example.com 2>/dev/null | openssl x509 -noout -dates
   ```

#### 止血方案

- 续期证书（Let's Encrypt：`certbot renew`）
- 部署新证书
- 重启 nginx

---

## 8. 微信小程序特定问题

### 8.1 隐私协议弹窗异常

#### 现象

- 隐私协议弹窗不出现
- 用户点击「同意」后无响应

#### 排查步骤

1. **检查 manifest.json**：
   ```json
   {
     "mp-weixin": {
       "__usePrivacyCheck__": true
     }
   }
   ```

2. **检查 App.vue onLaunch**：
   ```javascript
   wx.onNeedPrivacyAuthorization(resolve => {
     // 弹窗逻辑
   });
   ```

3. **检查 requiredPrivateInfos**：
   - 仅声明实际使用的接口

#### 止血方案

- 微信开发者工具重新上传
- 检查基础库版本（≥ 2.32.3）

### 8.2 微信支付失败

#### 现象

- 用户支付后未收到 VIP 权益
- 支付页面白屏

#### 排查步骤

1. **检查微信支付配置**：
   ```bash
   docker compose exec api env | grep -i wechat_pay
   ```

2. **查看支付订单**：
   ```sql
   SELECT * FROM vip_orders WHERE order_no = 'xxx';
   -- 关注 status、trade_state
   ```

3. **检查回调**：
   ```bash
   docker compose logs api | grep "wechat_pay_callback"
   ```

4. **微信商户平台对账**：
   - 登录 pay.weixin.qq.com
   - 查找对应订单

#### 止血方案

- 主动查询订单状态：调用微信支付查询 API
- 手动补偿 VIP 权益
- 通知用户

### 8.3 微信开发者工具编译失败

#### 现象

- 微信开发者工具报编译错误
- 真机预览失败

#### 排查步骤

1. **查看编译日志**：
   - 微信开发者工具 → 详情 → 本地设置 → 调试基础库
   - Console 面板查看错误

2. **常见错误**：
   - `app.json 未找到` → 检查输出目录
   - `页面路径错误` → 检查 pages.json
   - `WXSS 编译错误` → 检查样式语法
   - `ES 语法不支持` → 检查 babel 配置

3. **检查构建产物**：
   ```bash
   ls -la apps/client/dist/build/mp-weixin/
   ```

#### 止血方案

- 重新构建：`pnpm --filter @campus-love/client run build:mp-weixin`
- 清理缓存：微信开发者工具 → 工具 → 清缓存
- 重新导入项目

### 8.4 小程序提审被拒

#### 现象

- 微信审核驳回
- 修改后再次提交仍被拒

#### 排查步骤

1. **查看驳回原因**：
   - 微信公众平台 → 版本管理 → 审核记录

2. **常见驳回原因**：
   - 服务类目不符 → 修改类目或补充资质
   - 隐私政策不全 → 补充《隐私政策》
   - 诱导分享 → 移除分享得奖励逻辑
   - 虚拟支付违规 → iOS 端不允许虚拟商品支付
   - 内容违规 → 完善内容审核机制

3. **整改并重新提交**

详见 §微信小程序提审模拟。

---

## 9. WebSocket 与实时通信

### 9.1 WebSocket 连接失败

#### 现象

- 客户端无法建立 WebSocket 连接
- 实时消息不更新

#### 排查步骤

1. **检查 WebSocket 端点**：
   ```bash
   # wss 连接测试（用 websocat）
   echo "test" | websocat wss://api.campuslove.example.com/ws/chat?token=xxx
   ```

2. **检查 nginx WebSocket 配置**：
   ```nginx
   location /ws/ {
     proxy_pass http://api:8080;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     proxy_read_timeout 86400;
   }
   ```

3. **检查 Token 鉴权**：
   ```bash
   docker compose logs api | grep "websocket\|ws"
   ```

4. **检查在线连接数**：
   ```bash
   docker compose exec redis redis-cli PUBSUB NUMSUB "ws:chat:*"
   ```

#### 止血方案

- 重启 API：`docker compose restart api`
- 检查 nginx 配置
- 临时切到长轮询（如支持）

### 9.2 消息丢失

#### 现象

- 发送的消息对方未收到
- 离线消息未送达

#### 排查步骤

1. **检查消息持久化**：
   ```sql
   SELECT * FROM private_messages WHERE session_id = 'xxx' ORDER BY created_at DESC;
   ```

2. **检查推送队列**：
   ```bash
   docker compose exec redis redis-cli LLEN "push:queue"
   ```

3. **检查用户在线状态**：
   ```bash
   docker compose exec redis redis-cli GET "user:online:xxx"
   ```

#### 止血方案

- 触发消息重发
- 离线推送（小程序订阅消息）

### 9.3 频繁断线重连

#### 现象

- WebSocket 频繁断开
- 客户端日志显示重连

#### 排查步骤

1. **检查网络稳定性**：
   - 客户端弱网环境
   - nginx `proxy_read_timeout` 过短

2. **检查心跳**：
   - 客户端是否定时发送心跳
   - 服务端是否响应

3. **检查连接数限制**：
   ```bash
   docker compose exec api cat /proc/sys/net/core/somaxconn
   ulimit -n
   ```

#### 止血方案

- 调整心跳间隔（建议 30s）
- 调大 nginx 超时
- 客户端指数退避重连

---

## 10. 文件上传与媒体

### 10.1 上传大文件失败

#### 现象

- 上传 > 10MB 文件失败
- 上传过程中断

#### 排查步骤

1. **检查 nginx 限制**：
   ```nginx
   client_max_body_size 50M;
   ```

2. **检查 Spring 限制**：
   ```yaml
   spring:
     servlet:
       multipart:
         max-file-size: 50MB
         max-request-size: 50MB
   ```

3. **检查超时**：
   ```nginx
   proxy_read_timeout 300s;
   ```

#### 止血方案

- 调大限制
- 分片上传（如支持）

### 10.2 媒体访问 403

#### 现象

- 访问 `/api/v1/media/{userId}/**` 返回 403

#### 排查步骤

1. **检查 Token**：
   ```bash
   curl -H "Authorization: Bearer xxx" \
     https://api.campuslove.example.com/api/v1/media/123/202607/abc.jpg
   ```

2. **检查权限**：
   - 本人媒体：JWT userId 与 path userId 一致
   - 他人媒体：需匹配关系或管理员权限

3. **检查路径穿越**：
   ```bash
   curl -H "Authorization: Bearer xxx" \
     "https://api.campuslove.example.com/api/v1/media/123/202607/../../../etc/passwd"
   # 应返回 400
   ```

#### 止血方案

- 检查并修复权限逻辑
- 临时放通（仅紧急）

---

## 11. CI/CD 故障

### 11.1 构建失败

#### 现象

- GitHub Actions 构建失败
- CI 阻塞合并

#### 排查步骤

1. **查看 Actions 日志**：
   - GitHub → Actions → 失败的 workflow → 失败的 job

2. **常见错误**：
   - 依赖安装失败 → 检查 npm registry、pnpm 版本
   - typecheck 失败 → 修复类型错误
   - 测试失败 → 修复测试用例
   - 构建失败 → 修复构建错误
   - 镜像推送失败 → 检查 docker registry 凭证

3. **本地复现**：
   ```bash
   pnpm install
   pnpm run verify:phase01
   ```

#### 止血方案

- 修复后重新推送
- 紧急情况下手动跳过 CI（不推荐）

### 11.2 部署失败

#### 现象

- 部署脚本执行失败
- 新版本未生效

#### 排查步骤

1. **查看部署日志**：
   ```bash
   ssh deploy@server
   cd /opt/campus-love
   tail -100 deploy.log
   ```

2. **检查镜像**：
   ```bash
   docker images | grep campus-love
   docker pull campus-love-api:v1.0.0
   ```

3. **检查配置**：
   ```bash
   docker compose config
   ```

#### 止血方案

- 回滚至上一版本：`docker compose up -d --no-deps api --image campus-love-api:v0.9.0`
- 修复后重新部署

### 11.3 Flyway 迁移失败

#### 现象

- 启动时报 Flyway 错误
- 数据库 schema 不一致

#### 排查步骤

1. **查看 Flyway 状态**：
   ```bash
   docker compose exec mysql mysql -u root -p campus_love -e "SELECT * FROM flyway_schema_history;"
   ```

2. **常见错误**：
   - `Migration checksum mismatch` → 脚本被修改，需 `flyway repair`
   - `Detected resolved migration not applied to database` → 执行 `flyway migrate`
   - `Detected applied migration not resolved locally` → 脚本缺失
   - SQL 语法错误 → 修复脚本

3. **修复**：
   ```bash
   mvn -pl apps/api flyway:repair
   mvn -pl apps/api flyway:migrate
   ```

#### 止血方案

- 手动执行 SQL（紧急）
- 回滚至上一版本（如有 undo 脚本）
- 恢复数据库备份（最后手段）

---

## 12. 日志与监控

### 12.1 日志丢失

#### 现象

- 容器重启后日志丢失
- 无法找到历史日志

#### 排查步骤

1. **检查日志卷**：
   ```bash
   docker volume inspect campus-api-logs
   ```

2. **检查 logback 配置**：
   ```xml
   <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
     <file>/app/logs/application.log</file>
     <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
       <fileNamePattern>/app/logs/application-%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
       <maxFileSize>100MB</maxFileSize>
       <maxHistory>30</maxHistory>
       <totalSizeCap>10GB</totalSizeCap>
     </rollingPolicy>
   </appender>
   ```

#### 止血方案

- 配置集中式日志（Loki/ELK）
- 备份日志卷

### 12.2 监控指标缺失

#### 现象

- Grafana 面板无数据
- Prometheus 抓取失败

#### 排查步骤

1. **检查 Prometheus 抓取**：
   ```bash
   curl -fsS http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'
   ```

2. **检查 Actuator 暴露**：
   ```bash
   curl -fsS http://api:8080/actuator/prometheus | head -20
   ```

3. **检查 Prometheus 配置**：
   ```bash
   docker compose exec prometheus cat /etc/prometheus/prometheus.yml
   ```

#### 止血方案

- 重启 Prometheus
- 修复 scrape 配置
- 检查 Actuator endpoints

### 12.3 告警不触发

#### 现象

- 故障发生但未收到告警

#### 排查步骤

1. **检查 Alertmanager**：
   ```bash
   curl -fsS http://alertmanager:9093/api/v2/alerts
   ```

2. **检查告警规则**：
   ```bash
   curl -fsS http://prometheus:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.state == "firing")'
   ```

3. **检查通知渠道**：
   - 钉钉 webhook 是否失效
   - 邮件 SMTP 是否可达

#### 止血方案

- 修复告警规则
- 测试通知渠道
- 临时手动监控

---

## 附录 A：故障排查 Checklist

发现故障时按此顺序排查：

- [ ] 确认故障等级（P0/P1/P2/P3）
- [ ] 通知 On-Call 与相关团队
- [ ] 查看健康检查：`curl /actuator/health`
- [ ] 查看容器状态：`docker compose ps`
- [ ] 查看资源占用：`docker stats`、`df -h`、`free -h`
- [ ] 查看 API 日志：`docker compose logs api`
- [ ] 查看数据库状态：`SHOW PROCESSLIST`
- [ ] 查看缓存状态：`redis-cli INFO`
- [ ] 查看监控面板：Grafana
- [ ] 决定止血方案（重启/回滚/扩容/限流）
- [ ] 执行止血
- [ ] 验证恢复
- [ ] 同步进度至钉钉群
- [ ] 启动根因分析
- [ ] 修复根因
- [ ] 提交 post-mortem

---

## 附录 B：常用日志位置

| 服务 | 日志路径 |
|------|----------|
| API 应用日志 | `/app/logs/application.log`（容器内） |
| API 访问日志 | `/app/logs/access.log`（容器内） |
| MySQL | `/var/lib/mysql/slow.log`、`/var/log/mysql/error.log` |
| Redis | `docker compose logs redis`（stdout） |
| nginx | `/var/log/nginx/access.log`、`/var/log/nginx/error.log` |
| Prometheus | `docker compose logs prometheus` |
| Grafana | `/var/lib/grafana/log/grafana.log` |

---

## 附录 C：紧急联系人与升级路径

| 角色 | 姓名 | 电话 | 钉钉 | 职责 |
|------|------|------|------|------|
| On-Call（轮值） | TBD | TBD | TBD | 第一响应 |
| Tech Lead | TBD | TBD | TBD | 技术决策 |
| DevOps Lead | TBD | TBD | TBD | 部署与运维 |
| DBA | TBD | TBD | TBD | 数据库 |
| 安全 Lead | TBD | TBD | TBD | 安全事件 |
| CTO | TBD | TBD | TBD | P0 升级 |
| CEO | TBD | TBD | TBD | P0 升级 |

**升级路径**：
- On-Call（5min）→ Tech Lead（15min）→ CTO（30min）→ CEO（60min）

---

## 附录 D：Post-Mortem 模板

```markdown
# Post-Mortem: <故障标题>

## 故障概述
- **故障等级**：P0/P1/P2
- **开始时间**：YYYY-MM-DD HH:MM
- **结束时间**：YYYY-MM-DD HH:MM
- **持续时长**：XX 分钟
- **影响范围**：<用户/功能/数据>
- **影响用户数**：约 XXXX

## 时间线
| 时间 | 事件 |
|------|------|
| HH:MM | 告警触发 |
| HH:MM | On-Call 介入 |
| HH:MM | 评估为 P1 |
| HH:MM | 执行止血（重启 API） |
| HH:MM | 服务恢复 |
| HH:MM | 验证完成 |

## 根因分析
<详细描述根因，包括代码层面、流程层面>

## 影响评估
- **用户影响**：<描述>
- **业务影响**：<描述>
- **数据影响**：<描述>

## 修复措施
- **止血**：<已执行>
- **根因修复**：<已执行/计划中>

## 改进措施
- [ ] 短期：<1 周内完成>
- [ ] 中期：<1 个月内完成>
- [ ] 长期：<3 个月内完成>

## 经验教训
- <总结>

## 相关文档
- <监控截图>
- <日志片段>
- <代码 PR>
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-07-26 | v1.0 | 首次发布，覆盖 12 大类故障场景 | DevOps |
