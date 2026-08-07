-- ============================================================
-- 迁移：前端错误上报表
-- ============================================================
-- 背景（D3 修复）：
--   mp-weixin 端无法使用 Sentry SDK，客户端（services/sentry.ts 的
--   reportErrorToBackend）将异常上报到 POST /api/v1/error-reports；
--   此前后端无该接口且未 permitAll，每次上报都 401（上报通道全死）。
--   本迁移建表，配合 ErrorReportController 落库聚合，供事后排查。
--
-- 设计说明：
--   - append-only 日志表：只写不更新/删除，不引入乐观锁 version 列；
--   - context 存 JSON 文本（客户端上报前已做敏感字段脱敏与截断）；
--   - created_at 由服务端写入，不信任客户端时间戳。
-- ============================================================

CREATE TABLE error_reports (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    message    TEXT         NULL,
    stack      LONGTEXT     NULL,
    name       VARCHAR(128) NULL,
    context    LONGTEXT     NULL,
    platform   VARCHAR(32)  NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_error_reports_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
