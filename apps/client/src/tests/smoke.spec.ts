/**
 * Smoke 测试：覆盖关键基础模块的"可加载 + 行为契约"。
 *
 * 目的：
 * - 不是为了堆覆盖率，而是验证核心模块在测试环境中能正常加载并表现出契约行为；
 * - 这些模块是应用启动与 UI 渲染的基础（设计 tokens、主题工具、振动反馈、
 *   资料视图模型、微信兼容层），一旦因重构/依赖变更导致导出断裂，应立即被捕获。
 *
 * 覆盖模块：
 * - src/theme/tokens.ts：设计 tokens 结构稳定性
 * - src/theme/utils.ts：主题工具函数行为
 * - src/utils/haptic.ts：振动反馈不抛错契约
 * - src/view-models/profile.ts：资料完善度视图模型
 * - src/compat/index.ts：微信 JSAPI 兼容层可加载
 */

import { describe, expect, it, vi } from "vitest";
import { designTokens, darkThemeTokens, warmThemeTokens, getThemeTokens } from "@/theme/tokens";
import {
  rpx,
  getColor,
  getShadow,
  getRadius,
  getSpacing,
  getGradient,
  classNames,
  mapVariantToClass,
  getComponentRadius,
} from "@/theme/utils";
import { lightHaptic, mediumHaptic, heavyHaptic, successHaptic, errorHaptic } from "@/utils/haptic";
import { toProfileCompletion } from "@/view-models/profile";
import { patchDeprecatedApi } from "@/compat";

// ============================================================
// 设计 Tokens 结构稳定性
// ============================================================
describe("design tokens - 结构契约", () => {
  it("应包含完整的色板梯度（brand 50~900）", () => {
    // brand 色板是品牌主色，缺失任一梯度会导致按钮/卡片渲染异常
    const brandKeys = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    for (const k of brandKeys) {
      // 修复（严格模式 TS7053）：brand 是字面量键签名的只读对象，number 类型无法直接索引；
      // 通过 as keyof typeof 收敛 k 为合法键，保留运行时访问语义。
      const key = k as keyof typeof designTokens.color.brand;
      expect(designTokens.color.brand[key]).toBeTruthy();
    }
  });

  it("应包含关键语义色（success/warning/error/info）", () => {
    // 语义色用于状态指示（签到成功、警告、错误），缺失会导致状态展示缺失
    expect(designTokens.color.success).toBeTruthy();
    expect(designTokens.color.warning).toBeTruthy();
    expect(designTokens.color.error).toBeTruthy();
    expect(designTokens.color.info).toBeTruthy();
  });

  it("应包含圆角/间距/阴影/zIndex 完整集合", () => {
    // 这些 token 是布局基础，缺失会导致组件样式错乱
    expect(designTokens.radius).toBeDefined();
    expect(designTokens.spacing).toBeDefined();
    expect(designTokens.shadow).toBeDefined();
    expect(designTokens.zIndex).toBeDefined();
    // 抽样验证关键值，避免空对象
    expect(designTokens.radius.full).toBe(9999);
    expect(designTokens.spacing[0]).toBe(0);
    expect(designTokens.shadow.none).toBe("none");
    expect(designTokens.zIndex.modal).toBeGreaterThan(designTokens.zIndex.base);
  });

  it("三种主题（light/dark/warm）均应可获取且互不相同", () => {
    // 验证 getThemeTokens 切换函数契约
    const light = getThemeTokens("light");
    const dark = getThemeTokens("dark");
    const warm = getThemeTokens("warm");
    const defaultTheme = getThemeTokens(); // 默认应等价于 light

    expect(light).toBe(designTokens);
    expect(dark).toBe(darkThemeTokens);
    expect(warm).toBe(warmThemeTokens);
    expect(defaultTheme).toBe(light);

    // 暗色主题背景应为深色（与亮色不同）
    expect(dark.color.bg.page).not.toBe(light.color.bg.page);
    // 暖色主题背景应与亮色不同
    expect(warm.color.bg.page).not.toBe(light.color.bg.page);
  });
});

// ============================================================
// 主题工具函数行为
// ============================================================
describe("theme utils - 行为契约", () => {
  it("rpx 应将数字转为 rpx 字符串", () => {
    expect(rpx(16)).toBe("16rpx");
    expect(rpx(0)).toBe("0rpx");
  });

  it("getColor 应按点分路径解析颜色，无效路径返回空串", () => {
    // 有效路径
    expect(getColor("brand.500")).toBe(designTokens.color.brand[500]);
    expect(getColor("success")).toBe(designTokens.color.success);
    // 无效路径：返回空串而非抛错（避免 UI 渲染崩溃）
    expect(getColor("nonexistent.path")).toBe("");
    expect(getColor("brand.9999")).toBe("");
  });

  it("getShadow / getRadius / getSpacing / getGradient 应返回对应值", () => {
    expect(getShadow("none")).toBe("none");
    expect(getShadow("brand")).toBe(designTokens.shadow.brand);
    // getRadius / getSpacing 返回带 rpx 后缀
    expect(getRadius("full")).toBe("9999rpx");
    expect(getSpacing(4)).toBe("16rpx");
    // getGradient 返回 linear-gradient 字符串
    expect(getGradient("brand")).toContain("linear-gradient");
  });

  it("classNames 应过滤 falsy 值并拼接", () => {
    // 过滤 false/undefined/null/空串，仅保留 truthy 字符串
    expect(classNames("a", "b", false, undefined, null, "", "c")).toBe("a b c");
    expect(classNames()).toBe("");
  });

  it("mapVariantToClass 应按 prefix--variant 格式拼接", () => {
    expect(mapVariantToClass("primary", "btn")).toBe("btn--primary");
  });

  it("getComponentRadius 应返回对应组件的圆角 rpx", () => {
    // 各组件半径应能正常取值并附带 rpx 单位
    expect(getComponentRadius("button")).toBe(`${designTokens.component.button.radius}rpx`);
    expect(getComponentRadius("card")).toBe(`${designTokens.component.card.radius}rpx`);
    expect(getComponentRadius("tag")).toBe(`${designTokens.component.tag.radius}rpx`);
    expect(getComponentRadius("input")).toBe(`${designTokens.component.input.radius}rpx`);
  });
});

// ============================================================
// 振动反馈工具契约
// ============================================================
describe("haptic - 不抛错契约", () => {
  it("lightHaptic/mediumHaptic/heavyHaptic 在 H5 测试环境应静默失败不抛错", () => {
    // H5 端 uni.vibrateShort 不支持 type 参数或不存在，
    // 这些函数应通过 try/catch 静默失败而非抛错。
    expect(() => lightHaptic()).not.toThrow();
    expect(() => mediumHaptic()).not.toThrow();
    expect(() => heavyHaptic()).not.toThrow();
  });

  it("successHaptic/errorHaptic 触发组合振动不应抛错", () => {
    // successHaptic：两次 lightHaptic（带 setTimeout）
    // errorHaptic：medium + light（带 setTimeout）
    // 验证组合调用不会因 uni 缺失而抛错
    expect(() => successHaptic()).not.toThrow();
    expect(() => errorHaptic()).not.toThrow();
  });

  it("2026-08-08 产品要求禁用震动：haptic 不再调用 uni.vibrateShort", () => {
    // 产品要求全站禁用震动（vibrateWithType 直接 return）：
    // 即使 uni.vibrateShort 存在也不得被调用，调用方不受影响
    const originalVibrate = (globalThis as any).uni?.vibrateShort;
    const mockVibrate = vi.fn(() => {
      throw new Error("not supported");
    });
    if (!(globalThis as any).uni) (globalThis as any).uni = {};
    (globalThis as any).uni.vibrateShort = mockVibrate;

    try {
      expect(() => lightHaptic()).not.toThrow();
      expect(mockVibrate).not.toHaveBeenCalled();
    } finally {
      // 还原：若原方法存在则还原，否则删除 mock
      if (originalVibrate) {
        (globalThis as any).uni.vibrateShort = originalVibrate;
      } else {
        delete (globalThis as any).uni.vibrateShort;
      }
    }
  });
});

// ============================================================
// 资料视图模型契约
// ============================================================
describe("view-models/profile - toProfileCompletion 契约", () => {
  it("应返回 3 个固定步骤（profile/campus/schedule）", () => {
    // 构造最小可用的 UserSession 输入（仅需要 toProfileCompletion 用到的字段）
    const session = {
      profileCompleted: true,
      campusVerified: false,
      scheduleCompleted: true,
    } as any;

    const steps = toProfileCompletion(session);
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.id)).toEqual(["profile", "campus", "schedule"]);
  });

  it("应正确映射 session 字段到步骤完成状态", () => {
    const session = {
      profileCompleted: false,
      campusVerified: true,
      scheduleCompleted: false,
    } as any;

    const steps = toProfileCompletion(session);
    // 修复（严格模式 noUncheckedIndexedAccess）：steps[0] / [1] / [2] 索引访问返回 T | undefined，
    // toProfileCompletion 返回固定 3 元素数组，此处使用非空断言 ! 简化类型。
    expect(steps[0]!.done).toBe(false); // profile
    expect(steps[1]!.done).toBe(true); // campus
    expect(steps[2]!.done).toBe(false); // schedule
  });
});

// ============================================================
// 微信兼容层可加载性
// ============================================================
describe("compat - patchDeprecatedApi 可加载性", () => {
  it("patchDeprecatedApi 应为可调用函数", () => {
    expect(typeof patchDeprecatedApi).toBe("function");
  });

  it("在非微信环境（无 wx 全局）调用应安全返回不抛错", () => {
    // 测试环境无 wx 全局对象，函数应在 typeof wx === "undefined" 检查处提前返回
    expect(() => patchDeprecatedApi()).not.toThrow();
  });
});
