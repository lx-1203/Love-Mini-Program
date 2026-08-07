// ============================================================
// Admin v2 公共常量（复制自旧后台 apps/admin）
// ------------------------------------------------------------
// 收敛各视图散落的魔法数字：分页大小、toast 时长、趋势天数等。
// 视图应引用本文件常量，禁止在业务代码中直接写裸数字。
// ============================================================

/** 列表默认每页条数（Users/Posts/Reports/AuditLogs 共用） */
export const DEFAULT_PAGE_SIZE = 20;

/** 轻提示（toast）自动消失时长（毫秒）（Feedback/NotifyConfig 共用） */
export const TOAST_DURATION_MS = 3000;

/** 看板"匹配趋势"展示的天数（与后端 dailyTrend 近 30 日对齐） */
export const TREND_DAYS = 30;

/** 一秒钟的毫秒数（审计耗时格式化用） */
export const MILLIS_PER_SECOND = 1000;

/** 敏感词长度上限（与后端 SensitiveWordCreateRequest @Size(max=64) 对齐） */
export const WORD_MAX_LENGTH = 64;

/** 昵称长度上限（与后端 AdminUserUpdateRequest 校验对齐） */
export const NICKNAME_MAX_LENGTH = 20;

/** 反馈回复/审核备注的文本长度上限 */
export const REMARK_MAX_LENGTH = 500;
