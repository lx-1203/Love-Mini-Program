-- ============================================================================
-- third-party-binding-provenance.sql —— 第三方绑定来源核查（P0-1 收口配套，2026-10-25）
-- ============================================================================
-- 背景：
--   P0-1 之前 POST /auth/third-party/bind 直接信任客户端传入的 provider/openId/unionId，
--   攻击者可为「别人的真实第三方身份」建绑定并把绑定挂到自己账号上（账号预劫持）。
--   b3da9b6a 起改为服务端凭据派生身份，新写入不再可伪造；但**已入库的历史行**仍是活的：
--   第三方登录按 (provider, SHA-256(已验证 openid)) 查绑定（ThirdPartyAuthService#doLogin），
--   受害者用自己的真实微信登录时，会命中攻击者当初伪造写入的那一行，
--   拿到的却是攻击者账号的 JWT。
--
-- 为什么必须靠时间切界 + 形状判据，而不是看 open_id 形态：
--   修复前后 open_id 都以 SHA-256 hex 落库（V2026.07.25.0010 建表注释即写明哈希存储），
--   被投毒的行与合法行在字段形态上无法区分。
--
-- 本脚本职责：**只核查，不处置**。全部为 SELECT，无任何 DML/DDL。
--   处置（解绑 / 要求重新验证 / 保留）属产品与运营裁定，且需要先备份与 ROLLBACK 干跑，
--   对齐 database/backup 既有协议，不在本脚本臆造。
--
-- 执行方式（只读账号即可）：
--   mysql --read-only -h <host> -u <readonly_user> -p <dbname> \
--         -e "SET @cutoff='2026-10-24 22:44:29'; SOURCE database/audit/third-party-binding-provenance.sql;"
--   @cutoff 取 P0-1 修复**在生产上线**的时刻（上面的默认值是提交时间 b3da9b6a，
--   若上线晚于提交，请改成实际上线时刻；宁可放宽不可收紧）。
--
-- 三段输出：
--   1) 总览：各 provider 的绑定行数、@cutoff 之前（来源不可信）的行数；
--   2) 强嫌疑：绑定行的第三方身份同时是**另一个账号**的自然登录身份
--      （users.openid = '<provider小写>:<同一哈希>' 且 user_id 不同）——
--      这正是「A 的真实微信身份被绑到 B 账号」的形状；
--   3) 待处置清单：@cutoff 之前全部绑定行的脱敏视图（只出 open_id 哈希前 8 位）。
-- ============================================================================

-- @cutoff 由调用方设置；未设置时不静默用全表扫描冒充结论，直接以哨兵值报错式返回空。
SET @cutoff = IFNULL(@cutoff, '1970-01-01 00:00:00');

-- ---------------------------------------------------------------------------
-- 1) 总览
-- ---------------------------------------------------------------------------
SELECT
    t.provider                                                        AS 平台,
    COUNT(*)                                                          AS 绑定总数,
    SUM(t.created_at < @cutoff)                                       AS cutoff前来源不可信,
    SUM(t.created_at >= @cutoff)                                      AS cutoff后服务端派生
FROM third_party_account t
GROUP BY t.provider;

-- ---------------------------------------------------------------------------
-- 2) 强嫌疑：第三方身份的自然主人是另一个账号
--    （ThirdPartyAuthService#createNewUserAndBind 以 provider:hash 作为 openid 建用户，
--      故 natural.openid 命中同一条哈希即说明该真实身份本属于 natural 账号）
-- ---------------------------------------------------------------------------
SELECT
    t.id                                                              AS 绑定ID,
    t.provider                                                        AS 平台,
    CONCAT(LEFT(t.open_id, 8), '…')                                   AS 第三方身份哈希前缀,
    t.created_at                                                      AS 绑定时间,
    t.user_id                                                         AS 被绑到的账号,
    b.nickname                                                        AS 被绑到的账号昵称,
    b.role                                                            AS 被绑到的账号角色,
    b.status                                                          AS 被绑到的账号状态,
    natural.id                                                        AS 该身份的自然主人,
    natural.nickname                                                  AS 自然主人昵称,
    CASE WHEN t.created_at < @cutoff THEN 'cutoff前' ELSE 'cutoff后' END AS 来源窗口
FROM third_party_account t
JOIN users b ON b.id = t.user_id
JOIN users natural
     ON natural.openid = CONCAT(LOWER(t.provider), ':', t.open_id)
    AND natural.id <> t.user_id
WHERE t.created_at < @cutoff
ORDER BY t.created_at;

-- ---------------------------------------------------------------------------
-- 3) 待处置清单：@cutoff 之前的全部绑定行（脱敏）
--    SUSPECT = 命中第 2 段的形状；UNVERIFIED = 来源不可信但身份自然主人不明
-- ---------------------------------------------------------------------------
SELECT
    t.id                                                              AS 绑定ID,
    t.provider                                                        AS 平台,
    CONCAT(LEFT(t.open_id, 8), '…')                                   AS 第三方身份哈希前缀,
    IF(t.union_id IS NULL, NULL, CONCAT(LEFT(t.union_id, 8), '…'))    AS unionId前缀,
    t.created_at                                                      AS 绑定时间,
    t.user_id                                                         AS 被绑到的账号,
    b.role                                                            AS 被绑到的账号角色,
    IFNULL(natural.id, 0)                                             AS 身份自然主人ID,
    CASE WHEN natural.id IS NOT NULL THEN 'SUSPECT' ELSE 'UNVERIFIED' END AS 判定
FROM third_party_account t
JOIN users b ON b.id = t.user_id
LEFT JOIN users natural
     ON natural.openid = CONCAT(LOWER(t.provider), ':', t.open_id)
    AND natural.id <> t.user_id
WHERE t.created_at < @cutoff
ORDER BY 判定, t.created_at;
