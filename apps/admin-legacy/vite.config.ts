import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      // 业务代码别名：与 tsconfig.json paths 保持一致，便于 import "@/..." 写法
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // 旧后台回退端口 5178（主后台 apps/admin 使用 5177）
    port: 5178,
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
  // 全局常量定义：将 VITE_ 前缀环境变量注入为 process.env.XXX，统一访问入口
  // 避免在代码中散落 import.meta.env.XXX，便于后续替换为运行时配置
  define: Object.fromEntries(
    ["VITE_API_BASE_URL", "VITE_DEV_DEFAULT_USERNAME", "VITE_DEV_DEFAULT_PASSWORD"].map((key) => {
      const env = loadEnv(mode, process.cwd(), "VITE_");
      return [`process.env.${key}`, JSON.stringify(env[key] ?? "")];
    })
  ),
  // 性能修复：生产环境移除 console 和 debugger
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
    pure: mode === "production" ? ["console.log", "console.debug"] : [],
  },
  // 性能修复：添加构建优化配置
  build: {
    // 输出目录：默认 dist（与 admin 现有约定一致）
    outDir: "dist",
    // 静态资源目录：相对于 outDir，所有 js/css 之外的资源放入此目录
    assetsDir: "assets",
    // 构建目标：es2015 保证 IE11+ 兼容性（虽然现代浏览器已普及，但保留兼容底线）
    target: "es2015",
    // Sourcemap 配置：
    // - 开发模式：生成 sourcemap 便于调试
    // - 生产模式：'hidden' 生成 sourcemap 但不在产物中引用（用于错误监控上传，不暴露给终端用户）
    sourcemap: mode === "development" ? true : "hidden",
    // 提高 chunk 大小警告阈值（vendor chunk 通常较大，避免噪音告警）
    chunkSizeWarningLimit: 1000,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 压缩器：esbuild 比 terser 快 20-40 倍
    minify: "esbuild",
    // 关闭 gzip 压缩大小报告，加速构建
    reportCompressedSize: false,
    // 手动分包：使用函数形式，便于未来按需扩展（如引入 vant/element-plus/echarts/dayjs 等）
    // 仅对实际安装的依赖生成 chunk，避免空 chunk 导致构建错误
    rollupOptions: {
      // 启用 tree-shaking，剔除未使用的导出
      treeshake: mode === "production" ? true : true,
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
  },
  // 资源压缩插件示例（未引入新依赖，需要时安装 vite-plugin-compression 启用）：
  // import viteCompression from "vite-plugin-compression";
  // plugins: [
  //   vue(),
  //   viteCompression({
  //     algorithm: "gzip",
  //     ext: ".gz",
  //     threshold: 10240, // 仅压缩 >10KB 的资源
  //     deleteOriginFile: false,
  //   }),
  // ],
}));
