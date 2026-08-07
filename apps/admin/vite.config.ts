import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

/**
 * Admin（eladmin 风格重构后台）Vite 配置。
 *
 * 主后台，端口 5177。旧后台已迁移至 apps/admin-legacy（端口 5178）作为回退。
 * 构建/代理策略：
 * - 业务代码别名 @ → ./src（与 tsconfig.json paths 保持一致）
 * - /api 代理到本地 Spring Boot 后端（默认 8080，可用 ADMIN_API_PROXY_TARGET 覆盖）
 * - 开发环境注入 VITE_ 前缀环境变量为 process.env.XXX
 */
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      // 业务代码别名：与 tsconfig.json paths 保持一致，便于 import "@/..." 写法
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // 主后台端口 5177（旧后台已迁至 apps/admin-legacy，端口 5178）
    port: 5177,
    host: true,
    proxy: {
      // 将前端 /api 请求代理到后端 Spring Boot 服务（默认端口 8080）。
      // 路径重写：保持 /api 前缀不变，后端 Controller 也使用 /api/... 路径，无需重写。
      "/api": {
        target: process.env.ADMIN_API_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
        ws: false,
        // 同源代理转发时移除浏览器注入的 Origin 头：后端以 real profile 运行时
        // CORS 白名单默认为空（CORS_ALLOWED_ORIGINS 未配置），透传 Origin 会导致
        // 后端返回 403 Invalid CORS request。代理转发属于服务端到服务端请求，
        // 移除 Origin 后不触发后端 CORS 校验，语义与同源访问一致。
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
          });
        },
      },
    },
  },
  // 全局常量定义：将 VITE_ 前缀环境变量注入为 process.env.XXX，统一访问入口
  define: Object.fromEntries(
    ["VITE_API_BASE_URL", "VITE_DEV_DEFAULT_USERNAME", "VITE_DEV_DEFAULT_PASSWORD"].map((key) => {
      const env = loadEnv(mode, process.cwd(), "VITE_");
      return [`process.env.${key}`, JSON.stringify(env[key] ?? "")];
    })
  ),
  // 性能优化：生产环境移除 console 和 debugger
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
    pure: mode === "production" ? ["console.log", "console.debug"] : [],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    target: "es2015",
    sourcemap: mode === "development" ? true : "hidden",
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    minify: "esbuild",
    reportCompressedSize: false,
    rollupOptions: {
      treeshake: mode === "production" ? true : true,
      output: {
        manualChunks(id) {
          // 仅处理 node_modules 中的第三方依赖，业务代码交由 Vite 默认分割
          if (!id.includes("node_modules")) {
            return undefined;
          }
          // vendor-vue：Vue 核心生态（vue / vue-router / pinia）合并为单 chunk
          if (
            id.includes("node_modules/vue/") ||
            id.includes("node_modules/@vue/") ||
            id.includes("node_modules/vue-router/") ||
            id.includes("node_modules/pinia/")
          ) {
            return "vendor-vue";
          }
          // 其他第三方依赖默认归入 vendor-misc
          return "vendor-misc";
        },
      },
    },
  },
}));
