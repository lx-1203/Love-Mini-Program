/**
 * 时间格式化工具集（Task 3.2.4）。
 *
 * 设计说明：
 * - 使用原生 Intl.DateTimeFormat 实现本地化时间格式化，避免引入 dayjs 等额外依赖；
 * - 根据当前 i18n locale（zh-CN / en-US）切换输出格式；
 * - mp-weixin 兼容：Intl.DateTimeFormat 在 mp-weixin 与 H5 端均原生支持，
 *   无需 polyfill；
 * - 不使用 optional catch binding（catch 必须带参数），与项目硬约束一致。
 *
 * 引用关系：
 * - 通过 i18n 模块的 getLocale() 获取当前 locale，避免重复维护 locale 状态；
 * - 不直接 import i18n 实例（防止循环依赖），由调用方按需传入 locale 或使用默认值。
 */

/**
 * 支持的 locale 类型。
 *
 * 与 apps/client/src/i18n/index.ts 中 createI18n 的 locale 一致：
 * - 'zh-CN'：简体中文
 * - 'en-US'：美式英文
 */
export type SupportedLocale = "zh-CN" | "en-US";

/**
 * 相对时间文案表（infra R2-00129）。
 *
 * 原实现直接在 formatRelativeTime 内硬编码中文/英文文案，现抽为具名常量表集中维护：
 * - 行为与原先完全一致（zh 兜底中文、en 英文）；
 * - 后续接入完整 i18n 时，仅需将本表替换为 t() 调用，调用方无需改动。
 */
const RELATIVE_TIME_TEXT: Record<
  SupportedLocale,
  {
    justNow: string;
    minute: (n: number) => string;
    hour: (n: number) => string;
    day: (n: number) => string;
  }
> = {
  "zh-CN": {
    justNow: "刚刚",
    minute: (n) => `${n} 分钟前`,
    hour: (n) => `${n} 小时前`,
    day: (n) => `${n} 天前`,
  },
  "en-US": {
    justNow: "just now",
    minute: (n) => `${n} minute${n === 1 ? "" : "s"} ago`,
    hour: (n) => `${n} hour${n === 1 ? "" : "s"} ago`,
    day: (n) => `${n} day${n === 1 ? "" : "s"} ago`,
  },
};

/**
 * 聊天列表“昨天”文案表（infra R2-00129）。
 */
const CHAT_LIST_YESTERDAY_TEXT: Record<SupportedLocale, string> = {
  "zh-CN": "昨天",
  "en-US": "Yesterday",
};

/**
 * 聊天列表星期文案表（infra R2-00129），索引与 Date.getDay() 对齐（0=周日）。
 */
const CHAT_LIST_WEEKDAYS_TEXT: Record<SupportedLocale, readonly string[]> = {
  "zh-CN": ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  "en-US": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

/**
 * 默认 locale：简体中文。
 *
 * 与 i18n/index.ts 中 createI18n({ locale: 'zh-CN' }) 保持一致。
 * 当调用方未指定 locale 时使用。
 */
export const DEFAULT_LOCALE: SupportedLocale = "zh-CN";

/**
 * 将 locale 字符串标准化为 SupportedLocale。
 *
 * 处理逻辑：
 * - 'zh-CN' / 'zh' / 'zh-cn' / 'zh-Hans' / 'zh-TW'（暂按简体处理） → 'zh-CN'
 * - 'en-US' / 'en' / 'en-GB' / 其他 en 变体 → 'en-US'
 * - 其他语言或无效值 → 'zh-CN'（默认值）
 *
 * @param raw - 原始 locale 字符串（可能来自 navigator.language / Accept-Language / 用户设置）
 * @returns 标准化后的 SupportedLocale
 */
export function normalizeLocale(raw: string | undefined | null): SupportedLocale {
  if (!raw) {
    return DEFAULT_LOCALE;
  }
  const lower = raw.toLowerCase();
  // 中文（含简体、繁体、Hans、Hant、CN、TW、HK、SG）统一映射到 zh-CN
  if (lower.startsWith("zh")) {
    return "zh-CN";
  }
  // 英文（含 US、GB、AU、CA、IN 等所有变体）统一映射到 en-US
  if (lower.startsWith("en")) {
    return "en-US";
  }
  // 其他语言暂回退到默认中文（后续扩展可在此添加更多映射）
  return DEFAULT_LOCALE;
}

/**
 * 时间格式化选项（用于 Intl.DateTimeFormat 构造函数的 options 参数）。
 *
 * 提供两档预设：
 * - 'full'：完整日期时间（年月日 + 时分），用于详情页、消息时间戳
 * - 'date'：仅日期（年月日），用于个人主页、签到记录
 * - 'time'：仅时间（时分），用于聊天消息时间戳
 * - 'relative'：相对时间（刚刚 / N 分钟前 / N 小时前 / N 天前），用于列表项
 */
export type TimeFormatPreset = "full" | "date" | "time" | "relative";

/**
 * 各 locale + preset 对应的 Intl.DateTimeFormat options。
 *
 * 设计原则：
 * - 中文使用 24 小时制，英文使用 12 小时制（更符合各 locale 习惯）；
 * - 日期分隔符：中文用 '-'，英文用 '/'；
 * - 完整格式包含年份，避免历史时间歧义。
 */
const FORMAT_OPTIONS: Record<SupportedLocale, Record<TimeFormatPreset, Intl.DateTimeFormatOptions>> = {
  "zh-CN": {
    full: {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    date: {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
    time: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    relative: {
      // relative 预设由 formatRelativeTime 单独处理，此处仅占位
    },
  },
  "en-US": {
    full: {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
    date: {
      year: "numeric",
      month: "short",
      day: "2-digit",
    },
    time: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
    relative: {},
  },
};

/**
 * 将时间戳/Date 格式化为指定 locale 与 preset 的字符串。
 *
 * @param input - 时间戳（毫秒）或 Date 对象；无效时返回占位符
 * @param preset - 格式预设（'full' / 'date' / 'time' / 'relative'），默认 'full'
 * @param locale - locale 字符串，未指定时使用 DEFAULT_LOCALE
 * @returns 格式化后的时间字符串；输入无效时返回 '-'
 *
 * @example
 * formatDateTime(Date.now(), 'full', 'zh-CN')      // '2026-07-26 14:30'
 * formatDateTime(Date.now(), 'full', 'en-US')      // 'Jul 26, 2026, 02:30 PM'
 * formatDateTime(Date.now(), 'date', 'zh-CN')      // '2026-07-26'
 * formatDateTime(Date.now(), 'time', 'en-US')      // '02:30 PM'
 * formatDateTime(Date.now() - 60000, 'relative')   // '1 分钟前' / '1 minute ago'
 */
export function formatDateTime(
  input: number | Date | string | null | undefined,
  preset: TimeFormatPreset = "full",
  locale: SupportedLocale | string = DEFAULT_LOCALE,
): string {
  if (input === null || input === undefined) {
    return "-";
  }

  // 字符串时间戳解析：兼容 ISO 字符串与纯数字字符串
  let date: Date;
  if (typeof input === "string") {
    // 纯数字字符串视为时间戳（毫秒）
    if (/^\d+$/.test(input)) {
      date = new Date(parseInt(input, 10));
    } else {
      // ISO 字符串或 RFC2822 格式
      date = new Date(input);
    }
  } else if (typeof input === "number") {
    date = new Date(input);
  } else {
    date = input;
  }

  // 校验 Date 有效性：Invalid Date 时 getTime() 返回 NaN
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const normalizedLocale = normalizeLocale(locale);

  // 相对时间走独立函数处理
  if (preset === "relative") {
    return formatRelativeTime(date, normalizedLocale);
  }

  const options = FORMAT_OPTIONS[normalizedLocale][preset];
  try {
    // Intl.DateTimeFormat 在 mp-weixin 与 H5 端均原生支持，无需 polyfill
    const formatter = new Intl.DateTimeFormat(
      normalizedLocale === "zh-CN" ? "zh-CN" : "en-US",
      options,
    );
    return formatter.format(date);
  } catch (_e) {
    // 极端情况下（如 mp-weixin 旧版本不支持某些 options）回退到 toLocaleString
    try {
      return date.toLocaleString();
    } catch (_e2) {
      // 再失败则返回 ISO 字符串
      return date.toISOString();
    }
  }
}

/**
 * 将时间戳/Date 格式化为相对时间字符串。
 *
 * 输出格式（中文）：
 * - < 60 秒：刚刚
 * - < 60 分钟：N 分钟前
 * - < 24 小时：N 小时前
 * - < 7 天：N 天前
 * - ≥ 7 天：回退到绝对日期（YYYY-MM-DD）
 *
 * 输出格式（英文）：
 * - < 60 秒：just now
 * - < 60 分钟：N minute(s) ago
 * - < 24 小时：N hour(s) ago
 * - < 7 天：N day(s) ago
 * - ≥ 7 天：回退到绝对日期（MMM DD, YYYY）
 *
 * @param input - 时间戳（毫秒）或 Date 对象
 * @param locale - locale 字符串，未指定时使用 DEFAULT_LOCALE
 * @returns 相对时间字符串
 */
export function formatRelativeTime(
  input: number | Date,
  locale: SupportedLocale | string = DEFAULT_LOCALE,
): string {
  let date: Date;
  if (typeof input === "number") {
    date = new Date(input);
  } else {
    date = input;
  }

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const normalizedLocale = normalizeLocale(locale);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // 相对时间文案统一走具名常量表（infra R2-00129）
  if (normalizedLocale === "zh-CN") {
    const zh = RELATIVE_TIME_TEXT["zh-CN"];
    if (diffSec < 60) {
      return zh.justNow;
    }
    if (diffMin < 60) {
      return zh.minute(diffMin);
    }
    if (diffHour < 24) {
      return zh.hour(diffHour);
    }
    if (diffDay < 7) {
      return zh.day(diffDay);
    }
    // ≥ 7 天回退到绝对日期
    return formatDateTime(date, "date", "zh-CN");
  }

  // 英文相对时间文案（infra R2-00129）
  const en = RELATIVE_TIME_TEXT["en-US"];
  if (diffSec < 60) {
    return en.justNow;
  }
  if (diffMin < 60) {
    return en.minute(diffMin);
  }
  if (diffHour < 24) {
    return en.hour(diffHour);
  }
  if (diffDay < 7) {
    return en.day(diffDay);
  }
  return formatDateTime(date, "date", "en-US");
}

/**
 * 获取当前 locale（从 vue-i18n 全局实例读取）。
 *
 * 用于在不直接依赖 i18n 模块的场景下获取当前 locale，
 * 例如 utils 内部其他工具函数。
 *
 * 实现说明：
 * - 通过动态 import 避免循环依赖；
 * - 若 i18n 模块加载失败或未初始化，回退到 DEFAULT_LOCALE。
 *
 * @returns 当前 locale（'zh-CN' 或 'en-US'）
 */
export async function getCurrentLocaleAsync(): Promise<SupportedLocale> {
  try {
    const i18nModule = await import("../i18n");
    const current = i18nModule.i18n.global.locale.value;
    return normalizeLocale(current);
  } catch (_e) {
    // i18n 模块加载失败时回退到默认 locale
    return DEFAULT_LOCALE;
  }
}

/**
 * 同步获取当前 locale（从全局 i18n 实例读取）。
 *
 * 与 getCurrentLocaleAsync 不同，本函数同步返回，适用于不能使用 async 的场景。
 * 若 i18n 模块尚未加载，回退到 DEFAULT_LOCALE。
 *
 * 注意：本函数通过 require 同步加载 i18n 模块，在 mp-weixin 端可正常工作，
 * 但在 vite 的 HMR 环境下可能产生警告，建议优先使用 getCurrentLocaleAsync。
 *
 * @returns 当前 locale（'zh-CN' 或 'en-US'）
 */
export function getCurrentLocale(): SupportedLocale {
  try {
    // 使用全局对象上的 i18n 实例（若有），避免直接 require 导致的循环依赖
    const globalI18n = (globalThis as unknown as { __I18N__?: { locale?: { value?: string } } }).__I18N__;
    if (globalI18n && globalI18n.locale && globalI18n.locale.value) {
      return normalizeLocale(globalI18n.locale.value);
    }
  } catch (_e) {
    // 静默降级
  }
  return DEFAULT_LOCALE;
}

/**
 * 格式化时间戳为聊天会话列表项显示时间。
 *
 * 规则：
 * - 当天：仅显示时间（如 '14:30' / '02:30 PM'）
 * - 昨天：显示 '昨天' / 'Yesterday'
 * - 本周内：显示星期几（如 '周三' / 'Wed'）
 * - 更早：显示日期（如 '2026-07-20' / 'Jul 20, 2026'）
 *
 * @param input - 时间戳或 Date 对象
 * @param locale - locale 字符串
 * @returns 格式化后的会话时间字符串
 */
export function formatChatListTime(
  input: number | Date,
  locale: SupportedLocale | string = DEFAULT_LOCALE,
): string {
  let date: Date;
  if (typeof input === "number") {
    date = new Date(input);
  } else {
    date = input;
  }

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const normalizedLocale = normalizeLocale(locale);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const inputDateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((todayStart - inputDateStart) / (24 * 60 * 60 * 1000));

  // 中文（infra R2-00129: 文案走具名常量表）
  if (normalizedLocale === "zh-CN") {
    if (diffDays === 0) {
      // 当天，显示时间
      return formatDateTime(date, "time", "zh-CN");
    }
    if (diffDays === 1) {
      return CHAT_LIST_YESTERDAY_TEXT["zh-CN"];
    }
    if (diffDays > 0 && diffDays < 7) {
      // 本周内，显示星期几
      return CHAT_LIST_WEEKDAYS_TEXT["zh-CN"][date.getDay()] ?? "";
    }
    // 更早，显示日期
    return formatDateTime(date, "date", "zh-CN");
  }

  // 英文（infra R2-00129）
  if (diffDays === 0) {
    return formatDateTime(date, "time", "en-US");
  }
  if (diffDays === 1) {
    return CHAT_LIST_YESTERDAY_TEXT["en-US"];
  }
  if (diffDays > 0 && diffDays < 7) {
    return CHAT_LIST_WEEKDAYS_TEXT["en-US"][date.getDay()] ?? "";
  }
  return formatDateTime(date, "date", "en-US");
}

export default {
  formatDateTime,
  formatRelativeTime,
  formatChatListTime,
  normalizeLocale,
  getCurrentLocale,
  getCurrentLocaleAsync,
  DEFAULT_LOCALE,
};
