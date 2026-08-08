// ============================================================
// Admin v2 导出文件命名工具（R4-00454）
// ------------------------------------------------------------
// 收敛各业务模块 CSV 导出文件名的生成策略：
//   - 业务对象型导出：<prefix>-<id>.csv      （如 activity_enrollments-42.csv）
//   - 时间切片型导出：<prefix>-<yyyyMMdd>.csv（如 promo-codes-20260809.csv）
// 统一通过本工具生成，避免各模块命名风格漂移（下划线/连字符混用、
// 日期格式不一致等）。修改命名策略只需改动此处。
// ============================================================

/** 将日期对象格式化为 yyyyMMdd（导出文件名用，本地时区） */
export function formatDatePart(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/**
 * 生成 CSV 导出文件名：`<prefix>-<ref>.csv`。
 *
 * @param prefix 业务前缀（如 "activity_enrollments" / "promo-codes"）
 * @param ref    业务对象 ID 或日期切片（formatDatePart 输出）
 */
export function buildExportCsvName(prefix: string, ref: string | number): string {
  return `${prefix}-${ref}.csv`;
}
