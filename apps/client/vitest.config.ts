import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
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
