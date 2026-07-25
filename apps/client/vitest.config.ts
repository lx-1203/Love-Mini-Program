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
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      include: [
        "src/stores/**/*.ts",
        "src/components/common/Button.vue",
        "src/components/common/Ripple.vue",
        "src/services/env.ts",
        "src/utils/haptic.ts",
        "src/view-models/profile.ts",
      ],
      exclude: [
        "src/tests/**",
        "src/**/*.spec.ts",
        "src/types/**",
        "src/config/**",
        "src/services/mocks/**",
      ],
      // 阈值设定依据：当前 Phase K 首轮覆盖率基线
      // 核心组件（Button/Ripple/checkin/profile/likes）覆盖率 ≥ 70%
      // 整体覆盖率受未测试 store 影响（activity/campus/chat/circle 等暂未编写测试）
      // 后续 Phase L 可补全 store 测试以提升阈值
      thresholds: {
        statements: 25,
        branches: 55,
        functions: 50,
        lines: 25,
      },
    },
  },
});
