import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { designTokens, darkThemeTokens, warmThemeTokens } from "../theme/tokens";

/**
 * 令牌裁决回归（decisions-v33 §1 / §2，2026-09-29 裁定「一律按判据补齐实现」）。
 *
 * ── §2 `--c-text-inverse` 与 `--c-bg-container` 同值 ──────────────────────────
 * 判据原文（MP-R2-PAGES-REGISTER-INDEX-014 · reports/audit/round-6/issue-matrix.md:119 处置列）：
 *   「（A）彩色底上的白色**前景**…→ `var(--c-text-inverse)`
 *     （浅色 #FFFFFF、暗色 #1A1F26 皆为「叠在彩色/浅色块上的反色前景」语义）。
 *     **禁**改 `var(--c-bg-container)`」
 * 同值时这条「禁改」逐像素不可判（round7-NOTES §25：「用对用错逐像素一致，这条判据永不可判」）。
 * 修法取自另一条判据的字面要求（MP-R2VIS-THEME-DESIGN-VARIABLES-002 · 同文件:175）：
 *   「图上徽标的底色/前景走图片遮罩令牌，不再在暗色变量块里重复定义 --c-text-inverse」
 * ⇒ --c-text-inverse 归口到本仓既有的图片遮罩白字档 --c-overlay-text-primary
 *   （rgba(255, 255, 255, 0.95)，同文件 :710 原值，与 :742 --c-badge-on-image-text 同一范式），
 *   不新增色值、不动 --c-bg-container（#FFFFFF 由 v3.1 契约与消息页白底裁决定性）。
 *
 * ── §1 `--r-lg` 与判据正面冲突（已按裁决停手，此处只钉现状）────────────────────
 * 判据原文（MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-004 · 同文件:171 处置列）：
 *   「②其余 6 处（999/8/32/6/16/20rpx）…**逐值找等值令牌**（999→--r-full、16→--r-lg）
 *     或按 nit 保留，**不等值即不替换**」
 * 同一条判据的「等值」约束把 --r-lg 同时钉在 16rpx（括号例）与 20rpx（HEAD :1085 的 20rpx
 * 字面量已按等值换成 var(--r-lg, 20rpx)，见 publish.vue:1126），无任何标量可同时满足；
 * 权威设计规范 §1.4（deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:86）
 * 又把圆角档写死为 4/8/12/【20】/24/32/9999 rpx ⇒ 改令牌值即改设计口径 = 只能改判据。
 * 按裁定「不许为过门而改判据」，本项 BLOCKED，下面只钉住三处实现值一致 + 16rpx 字面量仍在，
 * 使任何一方被单方面悄悄挪动时这里先变红。
 */

const SRC = (rel: string) => readFileSync(resolve(__dirname, "..", rel), "utf-8");

const DESIGN_VARS = SRC("theme/design-variables.scss");
const UNIFIED_TOKENS = SRC("styles/tokens.scss");
const PUBLISH_VUE = SRC("subpackages/village/village/publish.vue");

/** 取 `page { ... }` 规则体内某令牌的声明值（剥掉行注释，只看真实声明）。 */
function declaredValue(css: string, token: string): string | null {
  const code = css.replace(/\/\/[^\n]*/g, "");
  const m = code.match(new RegExp(`^\\s*${token}:\\s*([^;]+);`, "m"));
  return m ? m[1]!.trim() : null;
}

/** 取 @mixin dark-theme-vars 的规则体。 */
function darkMixinBody(css: string): string {
  const start = css.indexOf("@mixin dark-theme-vars");
  expect(start, "styles/tokens.scss 应存在 @mixin dark-theme-vars").toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error("@mixin dark-theme-vars 括号未闭合");
}

describe("令牌裁决 §2 - --c-text-inverse 与 --c-bg-container 不得同值", () => {
  it("浅色档：--c-text-inverse 归口到既有图片遮罩白字令牌，不再是字面 #FFFFFF", () => {
    expect(declaredValue(DESIGN_VARS, "--c-text-inverse")).toBe("var(--c-overlay-text-primary)");
  });

  it("浅色档：--c-overlay-text-primary 仍取原值 rgba(255, 255, 255, 0.95)（未新增色值）", () => {
    expect(declaredValue(DESIGN_VARS, "--c-overlay-text-primary")).toBe("rgba(255, 255, 255, 0.95)");
  });

  it("浅色档：--c-bg-container 保持 #FFFFFF（判据明令禁改，v3.1 契约与消息页白底也钉着它）", () => {
    expect(DESIGN_VARS).toMatch(/^\$bg-container:\s*#FFFFFF;$/m);
    expect(declaredValue(DESIGN_VARS, "--c-bg-container")).toBe("#{$bg-container}");
    expect(declaredValue(DESIGN_VARS, "--c-text-inverse")).not.toBe("#FFFFFF");
  });

  it("SCSS 侧不再留 $text-inverse 影子源（一令牌一值，禁止第二处定义）", () => {
    expect(DESIGN_VARS).not.toMatch(/^\s*\$text-inverse\s*:/m);
  });

  it("暗色档：@mixin dark-theme-vars 内不再重复定义 --c-text-inverse / --color-text-inverse", () => {
    const body = darkMixinBody(UNIFIED_TOKENS).replace(/\/\/[^\n]*/g, "");
    expect(body).not.toMatch(/--c-text-inverse\s*:/);
    expect(body).not.toMatch(/--color-text-inverse\s*:/);
    // 容器底仍在暗色块里覆写，确认只摘掉了反色前景这一条线
    expect(declaredValue(darkMixinBody(UNIFIED_TOKENS), "--c-bg-container")).toBe("#1A1F26");
  });

  it("kebab 别名 --color-text-inverse 继续等于 var(--c-text-inverse) 单一来源", () => {
    expect(declaredValue(UNIFIED_TOKENS, "--color-text-inverse")).toBe("var(--c-text-inverse)");
  });

  it("页面级强制浅色彩钉（village/detail.vue）与全局取同一个令牌，不再自带 #FFFFFF", () => {
    const detail = SRC("subpackages/village/village/detail.vue").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(detail).toMatch(/--c-text-inverse:\s*var\(--c-overlay-text-primary\)\s*;/);
    expect(detail).not.toMatch(/--c-text-inverse:\s*#FFFFFF\s*;/i);
  });

  it("TS 令牌镜像（tokens.ts）三主题的 text.inverse 均不等于同主题 bg.container", () => {
    expect(designTokens.color.text.inverse).toBe("rgba(255, 255, 255, 0.95)");
    expect(designTokens.color.text.inverse).not.toBe(designTokens.color.bg.container);
    expect(darkThemeTokens.color.text.inverse).not.toBe(darkThemeTokens.color.bg.container);
    expect(warmThemeTokens.color.text.inverse).not.toBe(warmThemeTokens.color.bg.container);
  });

  it("TS 令牌镜像与 CSS 层同值（反色前景只有一条真相源）", () => {
    const cssValue = declaredValue(DESIGN_VARS, "--c-overlay-text-primary");
    expect(designTokens.color.text.inverse).toBe(cssValue);
    expect(darkThemeTokens.color.text.inverse).toBe(cssValue);
  });

  it("消费者语义不破：注册页三处彩色底白色前景仍走 --c-text-inverse（源码级判点原样成立）", () => {
    const register = SRC("pages/register/index.vue").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const uses = [...register.matchAll(/var\(--c-text-inverse/g)];
    expect(uses.length).toBe(3);
    expect(register).toMatch(/var\(--c-bg-container/);
  });
});

describe("令牌裁决 §1 - --r-lg 冲突未裁，钉住现状不许单方面挪动", () => {
  it("SCSS / CSS 变量 / TS 三处圆角 lg 值一致（20rpx，设计规范 §1.4 口径）", () => {
    expect(DESIGN_VARS).toMatch(/^\$radius-lg:\s*20rpx;$/m);
    expect(declaredValue(DESIGN_VARS, "--r-lg")).toBe("#{$radius-lg}");
    expect(designTokens.radius.lg).toBe(20);
  });

  it("圆角令牌仍是唯一一组 $radius-* 声明（7 档，MP-R2VIS-THEME-DESIGN-VARIABLES-001 口径）", () => {
    expect([...DESIGN_VARS.matchAll(/^\s*\$radius-[a-z0-9]+:/gm)]).toHaveLength(7);
  });

  it("publish.vue 的 16rpx 字面量按判据「不等值即不替换」保留，未被 --r-lg 悄悄抬成 20rpx", () => {
    expect(PUBLISH_VUE).toMatch(/\.publish-image\s*\{[^}]*border-radius:\s*16rpx/);
    // 20rpx 那处已按等值换成 --r-lg，故 --r-lg 一旦改成 16rpx 这里就会与判据正面撞车
    expect(PUBLISH_VUE).toMatch(/\.publish-tip\s*\{[^}]*border-radius:\s*var\(--r-lg,\s*20rpx\)/);
  });
});
