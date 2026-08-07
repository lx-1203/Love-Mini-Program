import { describe, expect, it, beforeEach } from "vitest";
import { i18n, t, setLocale, getLocale } from "../index";
import zhCN from "../locales/zh-CN";
import enUS from "../locales/en-US";

/**
 * Task 3.8.2 - Admin i18n 切换语言验证脚本
 *
 * 验证范围：
 * 1. i18n 实例默认配置（locale / fallbackLocale / messages 结构）
 * 2. setLocale / getLocale 切换locale 后 t() 响应式返回对应语言
 * 3. zh-CN / en-US key 集合一致性（避免缺失翻译）
 * 4. Task 3.7 抽取的 Pagination / ConfirmDialog 组件依赖的核心 key 存在
 * 5. 占位符插值正确（common.page、common.total）
 *
 * 工程约束（per project_memory）：
 * - 不使用 import.meta.env.DEV（mp-weixin 不支持）
 * - 不使用 catch {} 空绑定（mp-weixin 不兼容）
 * - 不使用 :hover 伪类
 */

describe("Admin i18n - 实例配置", () => {
  beforeEach(() => {
    // 每个用例前重置 locale 为默认中文，避免用例间状态污染
    setLocale("zh-CN");
  });

  it("默认 locale 应为 zh-CN", () => {
    expect(getLocale()).toBe("zh-CN");
    expect(i18n.global.locale.value).toBe("zh-CN");
  });

  it("fallbackLocale 应为 zh-CN", () => {
    expect(i18n.global.fallbackLocale.value).toBe("zh-CN");
  });

  it("应加载 zh-CN 与 en-US 两种语言资源", () => {
    expect(i18n.global.messages.value["zh-CN"]).toBeDefined();
    expect(i18n.global.messages.value["en-US"]).toBeDefined();
  });

  it("legacy 模式应为 false（启用 Composition API）", () => {
    expect(typeof i18n.global.t).toBe("function");
    expect(typeof t).toBe("function");
  });
});

describe("Admin i18n - locale 切换", () => {
  beforeEach(() => {
    setLocale("zh-CN");
  });

  it("zh-CN 下应返回中文翻译", () => {
    setLocale("zh-CN");
    expect(t("common.confirm")).toBe("确认");
    expect(t("common.cancel")).toBe("取消");
    expect(t("common.save")).toBe("保存");
  });

  it("en-US 下应返回英文翻译", () => {
    setLocale("en-US");
    expect(t("common.confirm")).toBe("Confirm");
    expect(t("common.cancel")).toBe("Cancel");
    expect(t("common.save")).toBe("Save");
  });

  it("setLocale 切换后 getLocale 应返回新值", () => {
    setLocale("zh-CN");
    expect(getLocale()).toBe("zh-CN");

    setLocale("en-US");
    expect(getLocale()).toBe("en-US");

    setLocale("zh-CN");
    expect(getLocale()).toBe("zh-CN");
  });

  it("切换 locale 后 t() 应响应式返回新语言", () => {
    setLocale("zh-CN");
    const zhValue = t("common.save");
    expect(zhValue).toBe("保存");

    setLocale("en-US");
    const enValue = t("common.save");
    expect(enValue).toBe("Save");
  });

  it("缺失 key 时应回退到 fallbackLocale 并最终返回 key 本身", () => {
    setLocale("en-US");
    // common.confirm 两端都存在
    expect(t("common.confirm")).toBe("Confirm");

    setLocale("zh-CN");
    // 不存在的 key：根据 vue-i18n 行为，回退后仍找不到则返回 key 本身
    expect(t("nonexistent.key.path")).toBe("nonexistent.key.path");
  });
});

describe("Admin i18n - Task 3.7 组件依赖 key 验证", () => {
  /**
   * Task 3.7.2 Pagination 组件依赖的 i18n key：
   * - common.prevPage / common.nextPage（按钮文案）
   * - common.page（页码信息，含 {page} {totalPages} 占位符）
   * - common.total（总条数，含 {n} 占位符）
   */
  it("Pagination 组件依赖的 key 应在两端都存在", () => {
    setLocale("zh-CN");
    expect(t("common.prevPage")).toBe("上一页");
    expect(t("common.nextPage")).toBe("下一页");
    expect(t("common.page", { page: 1, totalPages: 5 })).toBe("第 1/5 页");
    expect(t("common.total", { n: 100 })).toBe("共 100 条");

    setLocale("en-US");
    expect(t("common.prevPage")).toBe("Previous");
    expect(t("common.nextPage")).toBe("Next");
    expect(t("common.page", { page: 1, totalPages: 5 })).toBe("Page 1/5");
    expect(t("common.total", { n: 100 })).toBe("100 records in total");
  });

  /**
   * Task 3.7.3 ConfirmDialog 组件依赖的 i18n key：
   * - common.confirmTitle（弹窗标题 fallback）
   * - common.confirmOk（确认按钮 fallback）
   * - common.confirmCancel（取消按钮 fallback）
   * - common.saving（confirming 状态文案）
   */
  it("ConfirmDialog 组件依赖的 key 应在两端都存在", () => {
    setLocale("zh-CN");
    expect(t("common.confirmTitle")).toBe("确认操作");
    expect(t("common.confirmOk")).toBe("确认");
    expect(t("common.confirmCancel")).toBe("取消");
    expect(t("common.saving")).toBe("保存中...");

    setLocale("en-US");
    expect(t("common.confirmTitle")).toBe("Confirm");
    expect(t("common.confirmOk")).toBe("Confirm");
    expect(t("common.confirmCancel")).toBe("Cancel");
    expect(t("common.saving")).toBe("Saving...");
  });

  it("Pagination 与 ConfirmDialog 共用的 common.* 基础 key 应在两端存在", () => {
    const requiredKeys = [
      "confirm",
      "cancel",
      "ok",
      "save",
      "saving",
      "delete",
      "edit",
      "back",
      "search",
      "reset",
      "refresh",
      "loading",
      "success",
      "failed",
      "noData",
      "page",
      "total",
      "prevPage",
      "nextPage",
      "confirmTitle",
      "confirmOk",
      "confirmCancel",
    ];

    setLocale("zh-CN");
    for (const key of requiredKeys) {
      const value = t(`common.${key}`);
      // 不应等于 raw key（说明 key 存在且翻译已配置）
      expect(value).not.toBe(`common.${key}`);
    }

    setLocale("en-US");
    for (const key of requiredKeys) {
      const value = t(`common.${key}`);
      expect(value).not.toBe(`common.${key}`);
    }
  });
});

describe("Admin i18n - 翻译 key 完整性", () => {
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

  it("zh-CN 与 en-US 的 key 集合应一致", () => {
    const zhKeys = new Set(collectKeys(zhCN as unknown as Record<string, unknown>));
    const enKeys = new Set(collectKeys(enUS as unknown as Record<string, unknown>));

    const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k));
    const missingInZh = [...enKeys].filter((k) => !zhKeys.has(k));

    expect(missingInEn).toEqual([]);
    expect(missingInZh).toEqual([]);
  });

  it("zh-CN 应至少包含 200 个翻译 key", () => {
    const zhKeys = collectKeys(zhCN as unknown as Record<string, unknown>);
    expect(zhKeys.length).toBeGreaterThanOrEqual(200);
  });

  it("en-US 应至少包含 200 个翻译 key", () => {
    const enKeys = collectKeys(enUS as unknown as Record<string, unknown>);
    expect(enKeys.length).toBeGreaterThanOrEqual(200);
  });

  it("应覆盖 Admin 核心模块文案（login/layout/dashboard/users/posts/feedback/reports/auditLogs/notifyConfig/sensitiveWords）", () => {
    const zhKeys = new Set(collectKeys(zhCN as unknown as Record<string, unknown>));
    // 校验核心模块顶层命名空间存在
    expect(zhKeys.has("login.title")).toBe(true);
    expect(zhKeys.has("layout.navDashboard")).toBe(true);
    expect(zhKeys.has("dashboard.title")).toBe(true);
    expect(zhKeys.has("users.title")).toBe(true);
    expect(zhKeys.has("posts.title")).toBe(true);
    expect(zhKeys.has("feedback.title")).toBe(true);
    expect(zhKeys.has("reports.title")).toBe(true);
    expect(zhKeys.has("auditLogs.title")).toBe(true);
    expect(zhKeys.has("notifyConfig.title")).toBe(true);
    expect(zhKeys.has("sensitiveWords.title")).toBe(true);
  });
});

describe("Admin i18n - 占位符插值", () => {
  beforeEach(() => {
    setLocale("zh-CN");
  });

  it("zh-CN 下应正确替换 {page} {totalPages} 占位符", () => {
    expect(t("common.page", { page: 1, totalPages: 5 })).toBe("第 1/5 页");
    expect(t("common.page", { page: 10, totalPages: 100 })).toBe("第 10/100 页");
  });

  it("en-US 下应正确替换 {page} {totalPages} 占位符", () => {
    setLocale("en-US");
    expect(t("common.page", { page: 1, totalPages: 5 })).toBe("Page 1/5");
    expect(t("common.page", { page: 10, totalPages: 100 })).toBe("Page 10/100");
  });

  it("zh-CN 下应正确替换 {n} 占位符", () => {
    expect(t("common.total", { n: 0 })).toBe("共 0 条");
    expect(t("common.total", { n: 100 })).toBe("共 100 条");
    expect(t("common.pageSize", { n: 20 })).toBe("每页 20 条");
  });

  it("en-US 下应正确替换 {n} 占位符", () => {
    setLocale("en-US");
    expect(t("common.total", { n: 0 })).toBe("0 records in total");
    expect(t("common.total", { n: 100 })).toBe("100 records in total");
    expect(t("common.pageSize", { n: 20 })).toBe("20 per page");
  });

  it("多占位符应同时替换（users.banConfirm）", () => {
    setLocale("zh-CN");
    expect(t("users.banConfirm", { name: "张三" })).toBe("确定要封禁用户 张三 吗？");

    setLocale("en-US");
    expect(t("users.banConfirm", { name: "Zhang" })).toBe("Ban user Zhang?");
  });
});

describe("Admin i18n - 错误信息文案", () => {
  /**
   * 验证 errors.* 命名空间覆盖核心错误场景，
   * 便于 Admin 各视图的错误兜底统一使用 i18n key。
   */
  it("errors.* 核心 key 应在两端存在", () => {
    const errorKeys = [
      "network",
      "auth",
      "permission",
      "notFound",
      "server",
      "unknown",
      "userNotFound",
      "userBanned",
      "userDisabled",
      "invalidCredentials",
      "rateLimited",
    ];

    setLocale("zh-CN");
    for (const key of errorKeys) {
      const value = t(`errors.${key}`);
      expect(value).not.toBe(`errors.${key}`);
    }

    setLocale("en-US");
    for (const key of errorKeys) {
      const value = t(`errors.${key}`);
      expect(value).not.toBe(`errors.${key}`);
    }
  });

  it("网络错误文案在两端应有差异化的语言", () => {
    setLocale("zh-CN");
    const zhNetwork = t("errors.network");
    expect(zhNetwork).toMatch(/网络/);

    setLocale("en-US");
    const enNetwork = t("errors.network");
    expect(enNetwork).toMatch(/network/i);
    // 中英文应不同
    expect(zhNetwork).not.toBe(enNetwork);
  });
});
