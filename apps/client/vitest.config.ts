import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * JSONC 预处理器：在 vite 默认 JSON 解析前剥离行注释 // 与块注释 /* *\/
 * 解决 pages.json 等含注释 JSON 文件被 import 时抛出 "invalid JSON syntax" 的问题
 * （uni-app 的 pages.json 惯例允许注释，但标准 JSON.parse 不允许）
 */
function jsoncStripPlugin(): Plugin {
  return {
    name: "jsonc-strip",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".json")) return null;
      // 仅剥离注释，保留字符串内部内容
      // 注意：用单引号避免与 JSON 内的双引号冲突
      const stripped = code
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      return { code: stripped, map: null };
    },
  };
}

/**
 * uni-app 条件编译注释剥离器：在 @vitejs/plugin-vue 处理 .vue 模板前，
 * 移除 <!-- #ifdef ... --> / <!-- #ifndef ... --> / <!-- #endif --> 标记。
 *
 * 背景：
 * - uni-app 构建时由 vite-plugin-uni 预处理这些注释，按平台保留/移除内容块；
 * - Vitest 仅使用 @vitejs/plugin-vue，不经过 uni 预处理器，
 *   当 <!-- #ifdef H5 --> 出现在标签属性列表内时，Vue 模板编译器会抛出
 *   "v-slot can only be used on components or <template> tags" 等语法错误。
 *
 * 策略：
 * - 测试环境为 jsdom（H5-like），直接剥离所有条件编译注释标记，保留内部内容；
 * - 这样 ARIA 属性（H5 专属）能在测试中正常渲染，符合 jsdom 的预期行为。
 */
function uniConditionalStripPlugin(): Plugin {
  return {
    name: "uni-conditional-strip",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".vue")) return null;
      const stripped = code
        .replace(/<!--\s*#ifdef\s+[^>]*-->/g, "")
        .replace(/<!--\s*#ifndef\s+[^>]*-->/g, "")
        .replace(/<!--\s*#endif\s*-->/g, "");
      return { code: stripped, map: null };
    },
  };
}

export default defineConfig({
  plugins: [uniConditionalStripPlugin(), vue(), jsoncStripPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  json: {
    // 允许 pages.json 含注释（uni-app 配置惯例）
    stringify: false,
    strict: false,
  },
  test: {
    environment: "jsdom",
    include: ["src/tests/**/*.spec.ts"],
    setupFiles: ["src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      // 覆盖率统计范围：覆盖全部 src 下的 ts 与 vue 文件
      // 通过 exclude 精细排除非业务代码，确保阈值反映真实业务覆盖情况
      include: [
        "src/**/*.ts",
        "src/**/*.vue",
      ],
      exclude: [
        // 测试自身不计入覆盖率
        "src/tests/**",
        "src/**/*.spec.ts",
        "src/**/*.test.ts",
        // 类型声明文件无运行时逻辑
        "src/**/*.d.ts",
        "src/types/**",
        // 入口文件包含大量框架副作用（uni-app 注入、Pinia 注册），难以单元测试
        "src/main.ts",
        // OpenAPI 自动生成的类型定义，非手写业务代码
        "src/services/generated/**",
        // Mock 数据用于测试桩，不参与覆盖率统计
        "src/services/mocks/**",
        // 纯类型/常量定义文件：无逻辑分支，覆盖率统计无意义
        "src/**/*.types.ts",
        "src/**/*.constants.ts",
        // 配置文件以静态声明为主，少量运行时逻辑由专门 spec 覆盖
        "src/config/**",
      ],
      // 阈值设定依据（P7 提升，与 Java JaCoCo 阈值对齐至 80%）：
      // - lines/functions/statements: 70 → 80（业务核心模块应稳定覆盖）
      // - branches: 65 → 75（分支覆盖略低，留出容差）
      // 该阈值为目标值；若当前测试不满足，记录差距但不降低阈值，
      // 后续通过补全 store/组件测试逐步达标。
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
