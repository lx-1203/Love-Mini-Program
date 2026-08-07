// ============================================================
// Admin v2 公共格式化工具（复制自旧后台 apps/admin）
// ------------------------------------------------------------
// 背景：Users / Posts / Reports / Feedback / AuditLogs 五个视图
// 各自维护一份 formatDate/formatDuration 实现，行为不一致且重复。
// 本文件收敛为统一实现：
//   - formatDateTime：locale 跟随当前 i18n 语言；
//   - formatDuration：耗时格式化（ms/s）；
//   - maskSensitiveJson / maskSensitiveUrl：审计日志脱敏。
// ============================================================

import { getLocale } from "../i18n";

/** 空值展示占位符（由各视图按 i18n 语义传入，默认 "—"） */
export const EMPTY_PLACEHOLDER = "—";

/**
 * 统一时间格式化：ISO 字符串 → 本地可读时间（跟随当前 i18n locale）。
 *
 * @param iso ISO 时间字符串（可含 Z 时区后缀或裸 LocalDateTime）
 * @param fallback 空值/解析失败时的兜底展示（默认 "—"）
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(iso?: string | null, fallback: string = EMPTY_PLACEHOLDER): string {
  if (!iso) return fallback;
  try {
    // 兼容后端 LocalDateTime（无时区后缀）：直接按本地时区解析展示；
    // 带 Z 后缀的 UTC 时间由 Date 自动转换为本地时区。
    return new Date(iso).toLocaleString(getLocale(), { hour12: false });
  } catch {
    return iso;
  }
}

/**
 * 兼容 ISO 时间的简易展示（截到秒，保持字符串原样）。
 * 用于审计日志等需要紧凑展示的列；含时区后缀时按本地时区转换。
 */
export function formatTimeCompact(iso?: string | null, fallback: string = "-"): string {
  if (!iso) return fallback;
  // 含时区后缀（Z/±hh:mm）时交给 Date 转本地时区
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(iso)) {
    return formatDateTime(iso, fallback);
  }
  // 无时区后缀：保持服务器时间原样，仅截到秒（兼容毫秒）
  return iso.replace("T", " ").slice(0, 19) || fallback;
}

/** 一秒钟的毫秒数（消除魔法数字 1000） */
export const MILLIS_PER_SECOND = 1000;

/**
 * 耗时格式化：毫秒 → "123ms" / "1.23s"。
 */
export function formatDuration(ms?: number | null): string {
  if (ms === undefined || ms === null) return "-";
  if (ms < MILLIS_PER_SECOND) return `${ms}ms`;
  return `${(ms / MILLIS_PER_SECOND).toFixed(2)}s`;
}

/** 敏感字段名（键名不区分大小写匹配） */
const SENSITIVE_KEYS = [
  "password",
  "passwd",
  "pwd",
  "token",
  "secret",
  "authorization",
  "access_token",
  "refresh_token",
  "id_token",
  "credential",
  "private_key",
];

/** 判断键名是否为敏感字段 */
function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/-/g, "_");
  return SENSITIVE_KEYS.some((k) => normalized === k || normalized.includes(k));
}

/**
 * 递归 JSON 脱敏。
 *
 * 先尝试 JSON.parse 后递归遍历（覆盖任意嵌套层级），
 * 解析失败再回退正则替换（覆盖非 JSON 文本）。
 *
 * @param raw 原始文本（JSON 字符串或任意文本）
 * @returns 脱敏后的文本，敏感值统一替换为 ******
 */
export function maskSensitiveJson(raw?: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as unknown;
    return JSON.stringify(maskValue(parsed));
  } catch {
    // 非 JSON 文本：回退正则（兼容引号/无引号/单引号格式）
    return raw.replace(
      /("(?:password|passwd|pwd|token|secret|authorization|access_token|refresh_token|credential|private_key)"\s*:\s*")([^"]*)(")/gi,
      "$1******$3",
    );
  }
}

/** 递归遍历并脱敏对象/数组/标量值 */
function maskValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item));
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSensitiveKey(key) ? "******" : maskValue(val);
    }
    return result;
  }
  return value;
}

/**
 * URL query 参数脱敏。
 *
 * 审计日志 requestUrl 明文展示完整 query，若含 token/secret
 * 等敏感参数会泄露凭据；展示前把敏感参数值替换为 ******。
 */
export function maskSensitiveUrl(url?: string | null): string {
  if (!url) return "";
  const queryStart = url.indexOf("?");
  if (queryStart < 0) return url;
  const base = url.slice(0, queryStart);
  const query = url.slice(queryStart + 1);
  if (!query) return url;
  const params = query.split("&").map((pair) => {
    const eq = pair.indexOf("=");
    const key = eq >= 0 ? pair.slice(0, eq) : pair;
    if (isSensitiveKey(decodeURIComponent(key))) {
      return `${key}=******`;
    }
    return pair;
  });
  return `${base}?${params.join("&")}`;
}
