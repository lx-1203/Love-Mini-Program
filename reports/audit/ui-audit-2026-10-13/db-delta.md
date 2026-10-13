# 本程数据库写入对账（2026-10-13）

起点基线在设备腿与所有探活动作之前捕获：`db-baseline.txt`（同日 19:2x，后端刚由本程拉起）。
收尾复量逐表对照，**全部不变**：

| 表 | 基线 | 收尾 | 差 |
|---|---|---|---|
| users | 280 | 280 | 0 |
| posts | 263 | 263 | 0 |
| comments | 1183 | 1183 | 0 |
| media_asset | 1831 | 1831 | 0 |
| post_likes | 121 | 121 | 0 |
| vip_order | 0 | 0 | 0 |
| user_agreement_consent | 280 | 280 | 0 |

补充判点：`SELECT … FROM comments WHERE created_at >= '2026-10-13'` 返回 0 行
⇒ 今天没有任何新评论行。

## 为什么专门记这一件

1. 本程确实向真库发过**会产生写入的端点调用**：`POST /api/v1/auth/guest-login` 被调用多次
   （env 车道为验证 `APP_GUEST_LOGIN_ENABLED=true` 调过，带内车道为取真 token 又调过）。
   它返回的是同一个演示账号 `userId=100151`（复用既有游客账号，不每次新建一行），
   所以计数没动。这一点必须写成"实测计数未变 + 复用同一账号"，
   不能写成"我没写库"——我确实调过写端点。
2. 台账里有既存裁定 `decisions#6`（分环境处置：生产/准生产清、开发库可留），
   其执行件 `database/sanitize/prod-sanitize.sql` 是「事务包裹 + 默认 ROLLBACK」且 SQL 形如
   先 DELETE 再 INSERT。本程**没有**执行它，也没有以任何 `--apply` 方式改过数据；
   带 DELETE 的脚本要先把手作用域钉死才能跑，这条纪律继续生效。
3. 上一轮谱系留着的真实测试数据（`posts 230–235`、`comments 1201–1204`、若干 media_asset 行）
   本程未增未减，仍按用户既有裁定"留在库里、写进终报"处理，不借"清理"名义自行删除。
4. 设备腿侧的护栏同样是"不写"：破坏性动作（删除/解绑/同意类）一律 SKIP(guard)，
   支付/VIP 只验封存态；`post_likes`/`vip_order` 计数为 0 变化与这条一致。

## 口径

这份对账只说明"**本程**没有让行数发生变化"，不说明库里本来干净；
也不覆盖 Redis：Redis 的 AOF 在本程由只读车道保护性启动过（`appendonly yes`，
`AOF is valid`，先备份再启，实测 +176B 纯追加、DBSIZE=54），
那是速率限制/Redisson 状态一类易失数据，不属于"业务表写入"，故单列不并入上表。
