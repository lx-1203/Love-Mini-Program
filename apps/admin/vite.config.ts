import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5177,
    host: true,
    proxy: {
      // 将前端 /api 请求代理到后端 Spring Boot 服务（默认端口 8080）。
      // 路径重写：保持 /api 前缀不变，后端 Controller 也使用 /api/... 路径，无需重写。
      // 后端端口可通过环境变量 ADMIN_API_PROXY_TARGET 覆盖，便于本地切换端口。
      "/api": {
        target: process.env.ADMIN_API_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
        // WebSocket 代理（用于后续可能的实时通信扩展）
        ws: false,
      },
    },
  },
  // 性能修复：生产环境移除 console 和 debugger
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    pure: process.env.NODE_ENV === "production" ? ["console.log", "console.debug"] : [],
  },
  // 性能修复：添加构建优化配置
  build: {
    // 关闭 sourcemap
    sourcemap: false,
    // 提高 chunk 大小警告阈值（vendor chunk 通常较大，避免噪音告警）
    chunkSizeWarningLimit: 1000,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 手动分包：使用函数形式，便于未来按需扩展（如引入 vant/element-plus/echarts/dayjs 等）
    // 仅对实际安装的依赖生成 chunk，避免空 chunk 导致构建错误
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 仅处理 node_modules 中的第三方依赖，业务代码交由 Vite 默认分割
          if (!id.includes("node_modules")) {
            return undefined;
          }

          // vendor-vue：Vue 核心生态（vue / vue-router / pinia）
          // 这三个库版本耦合度高、体积小，合并为单 chunk 利于浏览器缓存
          if (
            id.includes("node_modules/vue/") ||
            id.includes("node_modules/@vue/") ||
            id.includes("node_modules/vue-router/") ||
            id.includes("node_modules/pinia/")
          ) {
            return "vendor-vue";
          }

          // 预留分包位（当前未安装，引入后自动生效）：
          // - vendor-ui：vant / element-plus / @arco-design/web-vue 等
          // - vendor-utils：dayjs / lodash-es / axios
          // - vendor-charts：echarts / chart.js
          // 示例：
          // if (id.includes("node_modules/vant/") || id.includes("node_modules/element-plus/")) {
          //   return "vendor-ui";
          // }
          // if (id.includes("node_modules/dayjs/") || id.includes("node_modules/lodash-es/") || id.includes("node_modules/axios/")) {
          //   return "vendor-utils";
          // }

          // 其他第三方依赖默认归入 vendor-misc，避免散落成过多小 chunk
          return "vendor-misc";
        },
      },
    },
    // 压缩配置
    minify: "esbuild",
  },
});