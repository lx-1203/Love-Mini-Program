import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { i18n, t } from "../i18n";
import zhCN from "../i18n/locales/zh-CN";
import {
  formatDateTime,
  formatRelativeTime,
  formatChatListTime,
  normalizeLocale,
  DEFAULT_LOCALE,
} from "../utils/time";

/**
 * Task 3.2.1 / 3.2.4 - i18n 与时间格式化单元测试
 *
 * 语言口径（2026-10-29 产品决定：英文版不上线）：
 * - en-US 语言包已从 apps/client/src/i18n/locales 移除，唯一语言资源为 zh-CN；
 * - 因此「英文译文」类断言全部改写为「非中文 locale 回退到 zh-CN 文案」，
 *   验的是 vue-i18n fallbackLocale 的真实行为，不是被删掉的资源；
 * - utils/time.ts 的 locale 参数走 Intl.DateTimeFormat 与本模块自带的
 *   星期/昨天/相对时间常量表，与语言包无关，故 en-US 档位格式化用例保留。
 *
 * 测试范围：
 * 1. i18n 实例默认配置（locale / fallbackLocale / messages 结构）
 * 2. locale 取值：非 zh-CN locale 回退到 zh-CN 文案
 * 3. 翻译完整性：zh-CN 叶子 key 数量下限 + 核心命名空间存在 + 无空值
 * 4. 占位符插值：t('likes.minutesAgo', { n: 5 }) 正确替换
 * 5. 时间格式化工具（utils/time.ts）：
 *    - formatDateTime 在不同 locale 下输出符合预期格式（Intl 能力，与语言包无关）
 *    - formatRelativeTime 输出相对时间文案
 *    - normalizeLocale 容错处理
 *    - formatChatListTime 在不同场景下输出正确格式
 *
 * 工程约束（per project_memory）：
 * - 不使用 import.meta.env.DEV（mp-weixin 不支持）
 * - 不使用 catch {} 空绑定（mp-weixin 不兼容）
 * - 不使用 :hover 伪类
 * - 使用 services/env.ts 的 isMockMode 而非 import.meta.env.DEV
 */

describe("i18n - vue-i18n 实例配置", () => {
  beforeEach(() => {
    // 每个用例前重置 locale 为默认中文，避免用例间状态污染
    i18n.global.locale.value = "zh-CN";
  });

  it("默认 locale 应为 zh-CN", () => {
    expect(i18n.global.locale.value).toBe("zh-CN");
  });

  it("fallbackLocale 应为 zh-CN", () => {
    // vue-i18n 9.x Composition API：fallbackLocale 通过 options 配置，可通过 global.fallbackLocale.value 访问
    expect(i18n.global.fallbackLocale.value).toBe("zh-CN");
  });

  it("应只加载 zh-CN 一种语言资源（英文版不上线，2026-10-29）", () => {
    expect(i18n.global.messages.value["zh-CN"]).toBeDefined();
    // en-US 资源已随产品决定移除：注册表里既没有该键，可用 locale 也只有一档
    expect(i18n.global.messages.value["en-US"]).toBeUndefined();
    expect(i18n.global.availableLocales).toEqual(["zh-CN"]);
  });

  it("legacy 模式应为 false（启用 Composition API）", () => {
    // vue-i18n 9.x：legacy: false 时使用 Composition API
    // 通过 mode 不可直接访问，间接验证：global.t 应为函数
    expect(typeof i18n.global.t).toBe("function");
  });
});

describe("i18n - locale 切换", () => {
  beforeEach(() => {
    i18n.global.locale.value = "zh-CN";
  });

  it("zh-CN 下应返回中文翻译", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("common.confirm")).toBe("确认");
    expect(t("common.cancel")).toBe("取消");
    expect(t("home.welcome")).toBe("校园恋爱");
  });

  it("非中文 locale（en-US）下 t() 应回退到 zh-CN 文案", () => {
    // 英文版不上线：en-US 未注册任何资源，vue-i18n 走 fallbackLocale('zh-CN')
    i18n.global.locale.value = "en-US";
    expect(t("common.confirm")).toBe("确认");
    expect(t("common.cancel")).toBe("取消");
    expect(t("home.welcome")).toBe("校园恋爱");
  });

  it("locale 变更后 t() 响应式求值，且不因资源缺失露出 raw key", () => {
    i18n.global.locale.value = "zh-CN";
    const zhValue = t("common.save");
    expect(zhValue).toBe("保存");

    // 切到已下线的英文档位：仍解析为中文兜底文案，而不是 "common.save" 这种 raw key
    i18n.global.locale.value = "en-US";
    const fallbackValue = t("common.save");
    expect(fallbackValue).toBe("保存");
    expect(fallbackValue).not.toBe("common.save");

    i18n.global.locale.value = "zh-CN";
    expect(t("common.save")).toBe("保存");
  });

  it("缺失 key 时应回退到 fallbackLocale", () => {
    // en-US 档位整体无资源 ⇒ 命中 fallbackLocale，取到中文文案
    i18n.global.locale.value = "en-US";
    expect(t("common.confirm")).toBe("确认");

    // 不存在的 key：根据 vue-i18n 行为，回退到 fallback 后仍找不到则返回 key 本身
    i18n.global.locale.value = "zh-CN";
    expect(t("nonexistent.key.path")).toBe("nonexistent.key.path");
  });
});

describe("i18n - 翻译 key 完整性", () => {
  /**
   * 递归收集对象的所有叶子 key（点号分隔路径）。
   *
   * @param obj - 待遍历的对象
   * @param prefix - 当前路径前缀
   * @returns 叶子 key 数组（如 ['common.confirm', 'home.welcome']）
   */
  function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        keys.push(...collectKeys(value as Record<string, unknown>, path));
      } else {
        keys.push(path);
      }
    }
    return keys;
  }

  /**
   * 递归收集对象的所有叶子条目（路径 + 值），口径与 {@link collectKeys} 一致。
   *
   * @param obj - 待遍历的对象
   * @param prefix - 当前路径前缀
   * @returns 叶子条目数组（如 [['common.confirm', '确认']]）
   */
  function collectLeafEntries(
    obj: Record<string, unknown>,
    prefix = "",
  ): Array<[string, unknown]> {
    const entries: Array<[string, unknown]> = [];
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        entries.push(...collectLeafEntries(value as Record<string, unknown>, path));
      } else {
        entries.push([path, value]);
      }
    }
    return entries;
  }

  it("zh-CN 键集应自洽：叶子路径唯一且文案值非空", () => {
    // 英文包下线后没有「zh/en 键集一致」可验，改为把同等强度的成对性约束
    // 落在唯一语言资源自身：路径不得重复、叶子值不得为空串/null/undefined。
    const entries = collectLeafEntries(zhCN as unknown as Record<string, unknown>);
    const uniquePaths = new Set(entries.map((e) => e[0]));
    expect(uniquePaths.size).toBe(entries.length);

    // login.guestLoginDesc 是「访客入口不要描述语」的有意空串（zh-CN.ts:2199），
    // 其余键都必须有文案：新增的空值/漏填会在这里红，而不是被成对检查掩盖。
    const emptyLeaves = entries
      .filter(([, value]) => value === "" || value === null || value === undefined)
      .map(([path]) => path);
    expect(emptyLeaves).toEqual(["login.guestLoginDesc"]);
  });

  it("zh-CN 应至少包含 1500 个翻译 key", () => {
    const zhKeys = collectKeys(zhCN as unknown as Record<string, unknown>);
    expect(zhKeys.length).toBeGreaterThanOrEqual(1500);
  });

  it("应覆盖核心页面文案（home/discover/chat/profile/likes）", () => {
    const zhKeys = new Set(collectKeys(zhCN as unknown as Record<string, unknown>));
    // 校验核心页面顶层命名空间存在
    expect(zhKeys.has("home.welcome")).toBe(true);
    expect(zhKeys.has("discover.title")).toBe(true);
    expect(zhKeys.has("chat.title")).toBe(true);
    expect(zhKeys.has("profile.title")).toBe(true);
    expect(zhKeys.has("likes.title")).toBe(true);
  });
});

describe("i18n - 占位符插值", () => {
  beforeEach(() => {
    i18n.global.locale.value = "zh-CN";
  });

  it("zh-CN 下应正确替换 {n} 占位符", () => {
    expect(t("common.minutesAgo", { n: 5 })).toBe("5分钟前");
    expect(t("common.hoursAgo", { n: 2 })).toBe("2小时前");
    expect(t("home.checkinSuccess", { n: 7 })).toBe("签到成功！连续7天");
  });

  it("非中文 locale 下 {n} 占位符插值仍回退 zh-CN 文案", () => {
    // 英文包已下线：回退链取的是 zh-CN 模板，插值同样要成立
    i18n.global.locale.value = "en-US";
    expect(t("common.minutesAgo", { n: 5 })).toBe("5分钟前");
    expect(t("common.hoursAgo", { n: 2 })).toBe("2小时前");
    expect(t("home.checkinSuccess", { n: 7 })).toBe("签到成功！连续7天");
  });

  it("多占位符应同时替换", () => {
    i18n.global.locale.value = "zh-CN";
    // likes.monthDay: "{m}月{d}日"
    expect(t("likes.monthDay", { m: 7, d: 26 })).toBe("7月26日");
  });
});

describe("utils/time - normalizeLocale", () => {
  it("null / undefined 应回退到默认 zh-CN", () => {
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale("")).toBe(DEFAULT_LOCALE);
  });

  it("zh 开头应映射到 zh-CN", () => {
    expect(normalizeLocale("zh-CN")).toBe("zh-CN");
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("zh-cn")).toBe("zh-CN");
    expect(normalizeLocale("zh-Hans")).toBe("zh-CN");
    expect(normalizeLocale("zh-TW")).toBe("zh-CN");
  });

  it("en 开头应映射到 en-US", () => {
    expect(normalizeLocale("en-US")).toBe("en-US");
    expect(normalizeLocale("en")).toBe("en-US");
    expect(normalizeLocale("en-GB")).toBe("en-US");
    expect(normalizeLocale("en-AU")).toBe("en-US");
  });

  it("其他语言应回退到默认 zh-CN", () => {
    expect(normalizeLocale("ja-JP")).toBe("zh-CN");
    expect(normalizeLocale("ko-KR")).toBe("zh-CN");
    expect(normalizeLocale("fr-FR")).toBe("zh-CN");
  });
});

describe("utils/time - formatDateTime", () => {
  // 固定时间戳避免用例受时间漂移影响
  // 2026-07-26 14:30:00 UTC+8 (Asia/Shanghai)
  // 使用 ISO 字符串构造 Date，避免时区差异
  const testDate = new Date("2026-07-26T14:30:00+08:00");
  const testTimestamp = testDate.getTime();

  it("null / undefined 输入应返回 '-'", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime(undefined)).toBe("-");
  });

  it("无效 Date 应返回 '-'", () => {
    expect(formatDateTime(new Date("invalid-date"))).toBe("-");
    expect(formatDateTime("invalid-date")).toBe("-");
  });

  it("zh-CN full 预设应输出 24 小时制日期时间", () => {
    const result = formatDateTime(testTimestamp, "full", "zh-CN");
    // 验证包含年份、月份、日期、小时、分钟
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/07/);
    expect(result).toMatch(/26/);
    expect(result).toMatch(/14/);
    expect(result).toMatch(/30/);
  });

  it("en-US full 预设应输出 12 小时制日期时间", () => {
    const result = formatDateTime(testTimestamp, "full", "en-US");
    // 英文应包含 AM/PM 标识
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/26/);
    // 12 小时制：14:30 → 02:30 PM
    expect(result).toMatch(/PM/i);
  });

  it("date 预设应只输出日期", () => {
    const zhResult = formatDateTime(testTimestamp, "date", "zh-CN");
    expect(zhResult).toMatch(/2026/);
    expect(zhResult).toMatch(/07/);
    expect(zhResult).toMatch(/26/);
    // 不应包含时间部分
    expect(zhResult).not.toMatch(/\d{2}:\d{2}/);
  });

  it("time 预设应只输出时间", () => {
    const zhResult = formatDateTime(testTimestamp, "time", "zh-CN");
    expect(zhResult).toMatch(/14/);
    expect(zhResult).toMatch(/30/);
    // 不应包含年份
    expect(zhResult).not.toMatch(/2026/);
  });

  it("数字字符串时间戳应正确解析", () => {
    const result = formatDateTime(String(testTimestamp), "full", "zh-CN");
    expect(result).toMatch(/2026/);
  });

  it("ISO 字符串应正确解析", () => {
    const result = formatDateTime("2026-07-26T14:30:00+08:00", "full", "zh-CN");
    expect(result).toMatch(/2026/);
  });

  it("默认 locale 应为 zh-CN", () => {
    const result = formatDateTime(testTimestamp, "full");
    expect(result).toMatch(/2026/);
  });
});

describe("utils/time - formatRelativeTime", () => {
  it("刚刚 / just now（< 60 秒）", () => {
    const now = Date.now();
    expect(formatRelativeTime(now, "zh-CN")).toBe("刚刚");
    expect(formatRelativeTime(now, "en-US")).toBe("just now");
  });

  it("N 分钟前 / N minute(s) ago", () => {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    expect(formatRelativeTime(fiveMinAgo, "zh-CN")).toBe("5 分钟前");
    expect(formatRelativeTime(fiveMinAgo, "en-US")).toBe("5 minutes ago");

    const oneMinAgo = now - 60 * 1000;
    expect(formatRelativeTime(oneMinAgo, "en-US")).toBe("1 minute ago");
  });

  it("N 小时前 / N hour(s) ago", () => {
    const now = Date.now();
    const twoHourAgo = now - 2 * 60 * 60 * 1000;
    expect(formatRelativeTime(twoHourAgo, "zh-CN")).toBe("2 小时前");
    expect(formatRelativeTime(twoHourAgo, "en-US")).toBe("2 hours ago");

    const oneHourAgo = now - 60 * 60 * 1000;
    expect(formatRelativeTime(oneHourAgo, "en-US")).toBe("1 hour ago");
  });

  it("N 天前 / N day(s) ago", () => {
    const now = Date.now();
    const threeDayAgo = now - 3 * 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(threeDayAgo, "zh-CN")).toBe("3 天前");
    expect(formatRelativeTime(threeDayAgo, "en-US")).toBe("3 days ago");

    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(oneDayAgo, "en-US")).toBe("1 day ago");
  });

  it("≥ 7 天应回退到绝对日期", () => {
    const now = Date.now();
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;
    const zhResult = formatRelativeTime(tenDaysAgo, "zh-CN");
    const enResult = formatRelativeTime(tenDaysAgo, "en-US");
    // 应回退到 date 预设的输出
    expect(zhResult).toMatch(/2016|2017|2018|2019|2020|2021|2022|2023|2024|2025|2026/);
    expect(enResult).toMatch(/2016|2017|2018|2019|2020|2021|2022|2023|2024|2025|2026/);
  });

  it("无效 Date 应返回 '-'", () => {
    expect(formatRelativeTime(new Date("invalid"), "zh-CN")).toBe("-");
  });
});

describe("utils/time - formatChatListTime", () => {
  it("当天应显示时间", () => {
    const now = new Date();
    const result = formatChatListTime(now, "zh-CN");
    // 当天显示时间（如 '14:30'）
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("昨天应显示 '昨天' / 'Yesterday'", () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    // 重置时间为正午避免时区边界问题
    yesterday.setHours(12, 0, 0, 0);

    expect(formatChatListTime(yesterday, "zh-CN")).toBe("昨天");
    expect(formatChatListTime(yesterday, "en-US")).toBe("Yesterday");
  });

  it("本周内应显示星期几", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    threeDaysAgo.setHours(12, 0, 0, 0);

    const zhResult = formatChatListTime(threeDaysAgo, "zh-CN");
    const enResult = formatChatListTime(threeDaysAgo, "en-US");

    const zhWeekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const enWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    expect(zhWeekdays).toContain(zhResult);
    expect(enWeekdays).toContain(enResult);
  });

  it("无效 Date 应返回 '-'", () => {
    expect(formatChatListTime(new Date("invalid"), "zh-CN")).toBe("-");
  });
});

describe("Task 3.1 - 设计 Token 完整性回归", () => {
  /**
   * 验证设计 Token 文件包含完整的 token 类别：
   * - 颜色（color）
   * - 字号（typography.size）
   * - 间距（spacing）
   * - 阴影（shadow）
   * - 圆角（radius）
   * - 动画时长（motion.duration）
   */
  it("设计 Token 应包含所有必要类别", async () => {
    const { designTokens } = await import("../theme/tokens");
    expect(designTokens.color).toBeDefined();
    expect(designTokens.typography).toBeDefined();
    expect(designTokens.spacing).toBeDefined();
    expect(designTokens.shadow).toBeDefined();
    expect(designTokens.radius).toBeDefined();
    expect(designTokens.motion).toBeDefined();
  });

  it("颜色应包含主色（brand 500 #36C99A）", async () => {
    const { designTokens } = await import("../theme/tokens");
    expect(designTokens.color.brand[500]).toBe("#36C99A");
  });

  it("字号应包含完整梯度（display/h1/h2/h3/body/caption）", async () => {
    const { designTokens } = await import("../theme/tokens");
    expect(designTokens.typography.size.display).toBeDefined();
    expect(designTokens.typography.size.h1).toBeDefined();
    expect(designTokens.typography.size.h2).toBeDefined();
    expect(designTokens.typography.size.h3).toBeDefined();
    expect(designTokens.typography.size.body).toBeDefined();
    expect(designTokens.typography.size.caption).toBeDefined();
  });

  it("动画时长应包含 fast/normal/slow", async () => {
    const { designTokens } = await import("../theme/tokens");
    expect(designTokens.motion.duration.fast).toBeDefined();
    expect(designTokens.motion.duration.normal).toBeDefined();
    expect(designTokens.motion.duration.slow).toBeDefined();
  });

  it("阴影应包含多档（sm/md/lg/xl）", async () => {
    const { designTokens } = await import("../theme/tokens");
    expect(designTokens.shadow.sm).toBeDefined();
    expect(designTokens.shadow.md).toBeDefined();
    expect(designTokens.shadow.lg).toBeDefined();
    expect(designTokens.shadow.xl).toBeDefined();
  });

  it("圆角应包含完整梯度（xs/sm/md/lg/xl/full）", async () => {
    const { designTokens } = await import("../theme/tokens");
    expect(designTokens.radius.xs).toBeDefined();
    expect(designTokens.radius.sm).toBeDefined();
    expect(designTokens.radius.md).toBeDefined();
    expect(designTokens.radius.lg).toBeDefined();
    expect(designTokens.radius.xl).toBeDefined();
    expect(designTokens.radius.full).toBeDefined();
  });
});

/**
 * Task 3.3 - 文案 i18n 化回归测试
 *
 * 覆盖范围：
 * 1. Admin 后台 8+ 视图 i18n key 存在性（SubTask 3.3.2）
 * 2. 14 个 Store 错误回退消息 i18n key 存在性（SubTask 3.3.3）
 * 3. 法律文本 i18n key 存在性（SubTask 3.3.5）
 * 4. 核心模块 locale 取值与中文兜底验证（英文版不上线后无「切英文出英文」一档）
 */
describe("Task 3.3.2 - Admin 视图 i18n key 存在性", () => {
  /**
   * 递归收集对象的所有叶子 key（点号分隔路径）。
   */
  function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        keys.push(...collectKeys(value as Record<string, unknown>, path));
      } else {
        keys.push(path);
      }
    }
    return keys;
  }

  const zhKeys = new Set(
    collectKeys(zhCN as unknown as Record<string, unknown>),
  );

  /**
   * Admin 后台 8+ 视图清单（SubTask 3.3.2 要求至少 8 个视图）。
   * 每个视图对应 admin.<view> 命名空间。
   * 2026-10-29：英文版不上线，en-US 侧键位存在性检查随资源一并移除，只验 zh-CN。
   */
  const adminViews = [
    "admin.login",
    "admin.layout",
    "admin.dashboard",
    "admin.users",
    "admin.posts",
    "admin.feedback",
    "admin.reports",
    "admin.auditLogs",
    "admin.notifyConfig",
    "admin.sensitiveWords",
    "admin.contentAudit",
  ];

  it("应至少覆盖 8 个 Admin 视图命名空间", () => {
    expect(adminViews.length).toBeGreaterThanOrEqual(8);
  });

  it.each(adminViews)(
    "zh-CN 应包含 %s.* 命名空间",
    (namespace) => {
      // 验证该命名空间下至少有一个 key
      const hasKey = [...zhKeys].some((k) => k.startsWith(`${namespace}.`));
      expect(hasKey).toBe(true);
    },
  );

  it("zh-CN 的 Admin 视图词条合计应不低于 40 条", () => {
    const total = adminViews.reduce(
      (sum, namespace) =>
        sum + [...zhKeys].filter((k) => k.startsWith(`${namespace}.`)).length,
      0,
    );
    // 正向计数下限（英文版下线后唯一语言资源的体量守卫，防空集合恒真）
    expect(total).toBeGreaterThanOrEqual(40);
  });

  it("admin.login 在 zh-CN 下应返回中文标题", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("admin.login.title")).toBe("管理员登录");
  });

  it("admin.login 在非中文 locale 下应回退到 zh-CN 文案", () => {
    i18n.global.locale.value = "en-US";
    // en-US 资源已删除，vue-i18n 按 fallbackLocale 取中文，不得露出 raw key
    expect(t("admin.login.title")).toBe("管理员登录");
    i18n.global.locale.value = "zh-CN";
  });

  it("admin.common.logout 在 zh-CN 下应返回'退出登录'", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("admin.common.logout")).toBe("退出登录");
  });
});

describe("Task 3.3.3 - 14 个 Store 错误回退消息 i18n key 存在性", () => {
  function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        keys.push(...collectKeys(value as Record<string, unknown>, path));
      } else {
        keys.push(path);
      }
    }
    return keys;
  }

  const zhKeys = new Set(
    collectKeys(zhCN as unknown as Record<string, unknown>),
  );

  /**
   * Store 模块清单（SubTask 3.3.3 要求覆盖 14+ 个 Store）。
   * 每个 Store 对应 storeErrors.<module> 命名空间。
   * 修复（R4-batch2）：原断言 14 但清单仅 13 项且漏掉 activity/report/session。
   * 2026-08-10：视频通话功能整体下架，storeErrors.videoCall 已随模块移除，断言 16 → 15。
   * 2026-10-29：英文版不上线，en-US 侧键位存在性检查随资源一并移除，只验 zh-CN。
   */
  const storeModules = [
    "storeErrors.campus",
    "storeErrors.checkin",
    "storeErrors.circle",
    "storeErrors.dailyQuestion",
    "storeErrors.chat",
    "storeErrors.promoCode",
    "storeErrors.vip",
    "storeErrors.profile",
    "storeErrors.likes",
    "storeErrors.messages",
    "storeErrors.discover",
    "storeErrors.village",
    "storeErrors.activity",
    "storeErrors.report",
    "storeErrors.session",
  ];

  it("应覆盖 15 个 Store 模块", () => {
    expect(storeModules.length).toBe(15);
  });

  it.each(storeModules)(
    "zh-CN 应包含 %s.* 命名空间",
    (namespace) => {
      const hasKey = [...zhKeys].some((k) => k.startsWith(`${namespace}.`));
      expect(hasKey).toBe(true);
    },
  );

  it("zh-CN 的 storeErrors 词条合计应不低于 45 条", () => {
    const total = storeModules.reduce(
      (sum, namespace) =>
        sum + [...zhKeys].filter((k) => k.startsWith(`${namespace}.`)).length,
      0,
    );
    // 正向计数下限：15 个模块 × 每模块至少 3 条，防止命名空间清单退化为空匹配
    expect(total).toBeGreaterThanOrEqual(45);
  });

  it("storeErrors.checkin.timeout 在 zh-CN 下应返回中文", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("storeErrors.checkin.timeout")).toBe("签到请求超时，请稍后重试");
  });

  it("storeErrors.likes.cannotLikeSelf 在 zh-CN 下应返回中文", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("storeErrors.likes.cannotLikeSelf")).toBe("不能喜欢自己哦");
  });

  it("storeErrors.messages.contentEmpty 在 zh-CN 下应返回中文", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("storeErrors.messages.contentEmpty")).toBe("消息内容不能为空");
  });

  it("storeErrors.village.postContentTooLong 应支持 {n} 占位符", () => {
    i18n.global.locale.value = "zh-CN";
    const result = t("storeErrors.village.postContentTooLong", { n: 500 });
    expect(result).toContain("500");
    expect(result).toContain("字");
  });
});

describe("Task 3.3.5 - 法律文本 i18n key 存在性", () => {
  function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        keys.push(...collectKeys(value as Record<string, unknown>, path));
      } else {
        keys.push(path);
      }
    }
    return keys;
  }

  const zhKeys = new Set(
    collectKeys(zhCN as unknown as Record<string, unknown>),
  );

  /**
   * 法律文本必备 key 清单（用户协议 / 隐私政策 / 授权同意）。
   * 2026-10-29：英文版不上线，en-US 侧键位存在性检查随资源一并移除，只验 zh-CN。
   *
   * 2026-10-31 S2-6：清单里**不再有 legal.*.content**——语言包里的第二份法律全文已删除，
   * 正式正文唯一来源是后端 legal_document 表（GET /v1/config/legal），离线兜底摘要在
   * config/legal-texts.ts。语言侧只保留标题/按钮等 UI 字串；
   * 「语言包不含法律正文」这条反向断言见 src/tests/config/legal-texts.spec.ts。
   */
  const requiredLegalKeys = [
    "legal.userAgreement.title",
    "legal.userAgreement.accept",
    "legal.privacyPolicy.title",
    "legal.privacyPolicy.accept",
    "legal.consent.title",
    "legal.consent.agree",
  ];

  it.each(requiredLegalKeys)(
    "zh-CN 应包含 key: %s",
    (key) => {
      expect(zhKeys.has(key)).toBe(true);
    },
  );

  it("zh-CN 的 legal.* 词条合计应不低于 6 条", () => {
    const total = [...zhKeys].filter((k) => k.startsWith("legal.")).length;
    // 正向计数下限：与必备清单等量，防止 legal 命名空间被整段裁掉后仍「逐条通过」
    expect(total).toBeGreaterThanOrEqual(requiredLegalKeys.length);
  });

  it("legal.userAgreement.title 在 zh-CN 下应返回'用户协议'", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("legal.userAgreement.title")).toBe("用户协议");
  });

  it("legal.privacyPolicy.title 在 zh-CN 下应返回'隐私政策'", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("legal.privacyPolicy.title")).toBe("隐私政策");
  });

  it("legal.consent.agree 在 zh-CN 下应返回'同意并继续'", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("legal.consent.agree")).toBe("同意并继续");
  });
});

describe("Task 3.3 - 核心模块 locale 取值与中文兜底验证", () => {
  /**
   * 验证 Task 3.3 新增的模块（admin / storeErrors / legal / success）在
   * locale 取值时的响应式行为。
   *
   * 2026-10-29 英文版不上线：en-US 资源已删除，这些模块不再存在「切英文出英文」
   * 一档。此处按真实行为改写为——历史遗留的非中文 locale 值必须落回 zh-CN 文案，
   * 既不能是空串，也不能露出 raw key。
   */
  beforeEach(() => {
    i18n.global.locale.value = "zh-CN";
  });

  it("admin 模块：zh-CN 取中文，非中文 locale 回退 zh-CN", () => {
    i18n.global.locale.value = "zh-CN";
    const zhTitle = t("admin.login.title");
    expect(zhTitle).toBe("管理员登录");

    i18n.global.locale.value = "en-US";
    const fallbackTitle = t("admin.login.title");
    expect(fallbackTitle).toBe("管理员登录");
    expect(fallbackTitle).not.toBe("admin.login.title");

    // 切回 zh-CN
    i18n.global.locale.value = "zh-CN";
    expect(t("admin.login.title")).toBe("管理员登录");
  });

  it("storeErrors 模块：非中文 locale 回退 zh-CN 文案", () => {
    i18n.global.locale.value = "zh-CN";
    const zhMsg = t("storeErrors.checkin.timeout");
    expect(zhMsg).toBe("签到请求超时，请稍后重试");

    i18n.global.locale.value = "en-US";
    const fallbackMsg = t("storeErrors.checkin.timeout");
    expect(fallbackMsg).toBe(zhMsg);
    expect(fallbackMsg).not.toBe("");
  });

  it("legal 模块：非中文 locale 回退 zh-CN 文案", () => {
    i18n.global.locale.value = "zh-CN";
    const zhTitle = t("legal.userAgreement.title");
    expect(zhTitle).toBe("用户协议");

    i18n.global.locale.value = "en-US";
    const fallbackTitle = t("legal.userAgreement.title");
    expect(fallbackTitle).toBe("用户协议");
    expect(fallbackTitle).not.toBe("");
  });

  it("success 模块：非中文 locale 回退 zh-CN 文案", () => {
    i18n.global.locale.value = "zh-CN";
    expect(t("success.saved")).toBe("保存成功");

    i18n.global.locale.value = "en-US";
    expect(t("success.saved")).toBe("保存成功");
  });
});

describe("Task 3.5 - 常量化完整性回归", () => {
  /**
   * 验证 Task 3.5 创建的常量文件包含必要的导出。
   *
   * 超时口径同 Task 3.3.4：这几条走 await import 的冷模块图，在并行负载下会挤爆
   * 5000ms 默认预算（2026-10-29 移除 en-US 语言包后同批跑 5 个 spec 实测
   * routes.ts 一条 5033ms 超时，单独跑 1.5s 全绿）——属测量仪表预算不足，非产品缺陷，
   * 断言本身不放宽。
   */
  it("constants/routes.ts 应导出页面路径常量", async () => {
    const routes = await import("../constants/routes");
    expect(routes).toBeDefined();
    // 至少应包含核心页面路径常量
    expect(typeof routes).toBe("object");
  }, { timeout: 30_000 });

  it("constants/storage-keys.ts 应导出 Storage key 常量", async () => {
    const storageKeys = await import("../constants/storage-keys");
    expect(storageKeys).toBeDefined();
    expect(typeof storageKeys).toBe("object");
  }, { timeout: 30_000 });

  it("constants/api-params.ts 应导出 API 参数常量", async () => {
    const apiParams = await import("../constants/api-params");
    expect(apiParams).toBeDefined();
    expect(typeof apiParams).toBe("object");
  }, { timeout: 30_000 });

  it("constants/limits.ts 应导出魔法数字常量", async () => {
    const limits = await import("../constants/limits");
    expect(limits).toBeDefined();
    expect(typeof limits).toBe("object");
  }, { timeout: 30_000 });
});

describe("Task 3.3.4 - Mock 数据 i18n 化回归", () => {
  /**
   * 验证 fixtures.ts 中的 Mock 数据已迁移为 i18n key 或可正常解析。
   * Mock 数据本身不应硬编码中文文案（应通过 i18n key 引用）。
   *
   * ⚠️ 判点修复（GAP 3，2026-10-31）：这条此前写成
   * `try { await import(...) ; expect(fixtures).toBeDefined() } catch { expect(true).toBe(true) }`
   * —— catch 里那句恒真断言让整条判点**不可能变红**（模块改名、getter 崩溃、
   * mock 数据退化成裸 i18n key 全都绿）。现在按注释里写的立项本意真断言，
   * 且下面每条都可打靶（打靶记录见本轮报告）。
   */
  // 冷模块图在并行负载下的动态 import 会挤爆 5000ms 默认预算：实测绿色跑 1076ms、一次加载跑的红色跑 5025ms 超时（Test timed out in 5000ms）——非产品缺陷，只给这一条放宽到 30s。
  it("fixtures 模块应可正常导入", async () => {
    // 动态导入 fixtures 模块，验证其结构完整
    // 注意：fixtures.ts 位于 services/mocks/ 目录下（在册真实路径，路径写错必须红）
    const fixtures = await import("../services/mocks/fixtures");
    expect(fixtures.mockFixtures).toBeTypeOf("object");
    expect(fixtures.mockFixtures).not.toBeNull();
  }, { timeout: 30_000 });

  it("在册的无参 getter 逐个可解析：返回数据、不返回空壳（展示版没数据可演＝红）", async () => {
    const { mockFixtures } = await import("../services/mocks/fixtures");
    const arrayGetters = [
      "getDiscussionRecommendations",
      "getActivityRecommendations",
      "getFollowingList",
    ] as const;
    // 这两枚的**在册初态就是空表**（悄悄话信箱要等页内 sendMessageToWhisper 写过才有条目）：
    // 只判「是不是数组」，判非空就是迁就缺陷写断言。
    const maybeEmptyArrayGetters = ["getWhisperInbox", "getWhisperSent"] as const;
    const objectGetters = [
      "getLoginHero",
      "getSession",
      "getBasicProfile",
      "getProfileStats",
      "getCampusProfile",
      "getScheduleProfile",
      "getHomeDashboard",
      "getChatOverview",
      "getMatchFormConfig",
      "getCheckInStatus",
      "getDndSetting",
    ] as const;

    for (const name of [...arrayGetters, ...maybeEmptyArrayGetters, ...objectGetters]) {
      const fn = (mockFixtures as unknown as Record<string, unknown>)[name];
      expect(typeof fn, `mockFixtures.${name} 必须是函数（门面少一枚 ⇒ 消费方拿到 undefined）`).toBe(
        "function",
      );
    }
    for (const name of arrayGetters) {
      const value = (
        mockFixtures as unknown as Record<string, () => unknown>
      )[name]();
      expect(Array.isArray(value), `mockFixtures.${name}() 应返回数组`).toBe(true);
      expect(
        (value as unknown[]).length,
        `mockFixtures.${name}() 返回空数组 ⇒ mock 档页面无可演数据`,
      ).toBeGreaterThan(0);
    }
    for (const name of maybeEmptyArrayGetters) {
      const value = (
        mockFixtures as unknown as Record<string, () => unknown>
      )[name]();
      expect(Array.isArray(value), `mockFixtures.${name}() 应返回数组`).toBe(true);
    }
    for (const name of objectGetters) {
      const value = (
        mockFixtures as unknown as Record<string, () => unknown>
      )[name]();
      expect(value, `mockFixtures.${name}() 不得返回空`).toBeDefined();
      expect(value).not.toBeNull();
      expect(typeof value).toBe("object");
    }
  }, { timeout: 30_000 });

  it("fixtures 里每一枚 t(\"key\") 都必须在语言包查得到（悬空 key＝红）", async () => {
    // SubTask 3.3.4 的立项形态：mock 展示文案经 t(*Key) 解析，而不是硬编码中文。
    // vue-i18n 对**查不到的 key 原样回吐 key 本身** ⇒ 「迁移做了但 key 写错/语言包删了」
    // 这种缺陷在页面上的形态是一串 `mockData.xxx.yyy`。本条判点抓的就是它。
    const fixturesSrc = readFileSync(
      resolve(__dirname, "../services/mocks/fixtures.ts"),
      "utf8",
    );
    const keys = [
      ...new Set(
        // 捕获**任意** t("…") 字面量：早期版本把字符集收窄成 [A-Za-z0-9_.]，
        // 结果一枚带空格的坏 key（打靶时写出来的）直接不被扫描 ⇒ 判点漏过缺陷。
        // 现在坏 key 一律进 dangling 名单（te() 对它返回 false）。
        [...fixturesSrc.matchAll(/\bt\("([^"\\]+)"\s*[,)]/gu)].map((m) => m[1]),
      ),
    ].sort();
    // 判据本身不许空转：在册 189 枚 key，少到 0 枚说明扫描口径坏了
    expect(keys.length, "fixtures.ts 里扫不到任何 t(\"key\") ⇒ 扫描口径失效").toBeGreaterThan(50);
    const dangling = keys.filter((key) => !i18n.global.te(key, "zh-CN"));
    expect(
      dangling,
      `fixtures.ts 引用了语言包里不存在的 key（页面会直接印出这串 key）：${dangling.join(", ")}`,
    ).toEqual([]);
    // 再确认可解析性：解析结果必须是**非空字符串**且**不等于 key 本身**
    for (const key of keys.slice(0, 30)) {
      const resolved = t(key);
      expect(typeof resolved, `${key} 解析结果不是字符串`).toBe("string");
      expect(resolved.length, `${key} 解析成空串`).toBeGreaterThan(0);
      expect(resolved, `${key} 原样回吐（悬空 key）`).not.toBe(key);
    }
  }, { timeout: 30_000 });

  it("mock 门面不得把裸 i18n key 当文案吐出去", async () => {
    const { mockFixtures } = await import("../services/mocks/fixtures");
    const snapshot = JSON.stringify([
      mockFixtures.getLoginHero(),
      mockFixtures.getHomeDashboard(),
      mockFixtures.getDiscussionRecommendations(),
      mockFixtures.getActivityRecommendations(),
      mockFixtures.getMatchFormConfig(),
      mockFixtures.getChatOverview(),
      mockFixtures.getSocialProgress(),
    ]);
    // 快照非空（空快照会让下面那条正则变成空判点）
    expect(snapshot.length).toBeGreaterThan(200);
    expect(snapshot).toMatch(/[\u4e00-\u9fa5]/u); // 确实带着解析后的中文
    expect(snapshot).not.toMatch(
      /"(?:config|mockData|discover|home|likes|vip|common)\.[A-Za-z0-9_.]+"/u,
    );
  }, { timeout: 30_000 });
});
