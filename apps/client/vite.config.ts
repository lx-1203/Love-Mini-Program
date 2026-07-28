import { createRequire } from "node:module";
import { defineConfig, loadEnv, type Plugin } from "vite";
import path from "node:path";
import uni from "@dcloudio/vite-plugin-uni";

const require = createRequire(import.meta.url);

/**
 * Vite 插件：持久化补丁 @dcloudio/uni-h5-vue 的 updateSlots 函数
 *
 * 问题根因：
 *   - @vue/shared 的 def() 函数使用 Object.defineProperty 但未设置 writable: true，
 *     导致 instance.slots._ 属性默认为 non-writable
 *   - updateSlots 调用 extend(slots, children) = Object.assign(slots, children)，
 *     尝试将 children._ 赋值到 slots._ 时因 non-writable 抛出 TypeError
 *   - 影响 home/likes/village/messages/chat 5 个页面正常渲染
 *
 * 修复方案：将 extend(slots, children) 替换为跳过 isInternalKey 的 for 循环赋值，
 *   避免赋值到 non-writable 的 slots._ 属性
 *
 * 持久性：即使 npm install 重装依赖，本插件仍会在 transform 阶段自动应用补丁
 */
function patchUniH5VueUpdateSlots(): Plugin {
  const TARGET_FILE = "@dcloudio/uni-h5-vue/dist/vue.runtime.esm.js";
  const ORIGINAL = "extend(slots, children);";
  const REPLACEMENT =
    "for (const _k in children) { if (!isInternalKey(_k)) { try { slots[_k] = children[_k]; } catch (_e) { /* skip non-writable */ } } }";

  return {
    name: "patch-uni-h5-vue-update-slots",
    enforce: "pre",
    apply: "serve",
    transform(code, id) {
      if (!id.includes(TARGET_FILE) || !code.includes(ORIGINAL)) {
        return null;
      }
      return {
        code: code.split(ORIGINAL).join(REPLACEMENT),
        map: null,
      };
    },
  };
}

type UniAliasEntry = Record<string, unknown> & {
  customResolver?: unknown;
};

type UniResolveConfig = {
  alias?: UniAliasEntry[];
  [key: string]: unknown;
};

function patchUniAliasResolverDeprecation() {
  const resolveModule = require("@dcloudio/vite-plugin-uni/dist/config/resolve.js") as {
    createResolve?: (...args: unknown[]) => UniResolveConfig;
    __campusLovePatched?: boolean;
  };

  if (resolveModule.__campusLovePatched || typeof resolveModule.createResolve !== "function") {
    return;
  }

  const originalCreateResolve = resolveModule.createResolve;

  resolveModule.createResolve = (...args: unknown[]) => {
    const resolved = originalCreateResolve(...args);

    if (!Array.isArray(resolved.alias)) {
      return resolved;
    }

    return {
      ...resolved,
      alias: resolved.alias.map((entry) => {
        if (!entry || typeof entry !== "object" || !("customResolver" in entry)) {
          return entry;
        }

        const { customResolver: _customResolver, ...rest } = entry;
        return rest;
      }),
    };
  };

  resolveModule.__campusLovePatched = true;
}

patchUniAliasResolverDeprecation();

/**
 * 将 .env 中的 VITE_ 前缀变量通过 Vite define 注入为 process.env.XXX 常量。
 *
 * 设计原因：
 * - 客户端代码（src/services/env.ts）需读取 VITE_API_MODE / VITE_API_BASE_URL 等变量。
 * - 直接使用 import.meta.env.XXX 在 mp-weixin 生产包中存在兼容性风险（project_memory 约束）。
 * - 通过 define 在构建期替换为字面量后，客户端只访问 process.env.XXX，产物中不再保留
 *   import.meta 语法，双端行为一致。
 *
 * 取值优先级：使用 defineConfig 的函数形式接收 mode，并显式调用 Vite 的 loadEnv
 * 加载对应 .env.[mode] 文件，确保在 uni-app 的多平台构建流程中也能正确读取环境变量。
 * loadEnv 的第三个参数 'VITE_' 表示只加载以 VITE_ 开头的变量，与客户端读取逻辑一致。
 *
 * @param mode - Vite 构建模式（如 development / production / mp-weixin / real）
 */
function resolveViteEnvDefine(mode: string) {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  // 列出所有需要在客户端代码中通过 process.env.XXX 访问的 Vite 环境变量。
  // 新增 VITE_SENTRY_DSN：用于 Sentry SDK 初始化，未配置时跳过 Sentry 初始化。
  return Object.fromEntries(
    ["VITE_API_MODE", "VITE_API_BASE_URL", "VITE_APP_VERSION", "VITE_SENTRY_DSN"].map((key) => {
      const value = env[key] ?? "";
      return [`process.env.${key}`, JSON.stringify(value)];
    })
  );
}

// 构建目标按平台条件化：
// - mp-weixin：基础库不支持 ES2019 optional catch binding (catch {})，需 es2018 让 esbuild 把 catch {} 转译为 catch (e) {}
// - H5：必须 ≥ es2020 以保留 import.meta 语法（@vitejs/plugin-vue 注入的 HMR 代码 import.meta.hot.on('file-changed', ...)
//   在 es2018 target 下会被 esbuild 错误转译为未定义的 import_meta 变量，导致 App.vue 入口导入失败、全页面空白）
const isMpWeixin = process.env.UNI_PLATFORM === "mp-weixin";
const isH5 = process.env.UNI_PLATFORM === "h5";
const buildTarget: string | string[] = isMpWeixin
  ? "es2018"
  : ["es2020", "edge88", "firefox78", "chrome87", "safari14"];

/**
 * H5 构建时的分包策略（manualChunks）。
 *
 * 性能优化（P1）：将第三方依赖按生态拆分为独立 chunk，避免单个 vendor 包过大，
 * 同时利用浏览器并行下载能力提升首屏加载速度。
 *
 * 拆分策略：
 * - vue-vendor: Vue 核心生态（vue / vue-i18n / pinia），变更频率低，可长期缓存
 * - gsap: GSAP 动画库，仅在动画页面使用
 * - vueuse: @vueuse/core 组合式工具库
 * - sentry: @sentry/* 错误监控 SDK（按需拆分，便于浏览器长期缓存）
 *
 * 注意：
 * - 仅在 H5 构建时启用。mp-weixin 由 uni-app 编译器自动处理依赖与分包，强制 manualChunks
 *   会破坏其依赖分析导致运行时错误。
 * - vue 已通过 resolve.alias 重定向到 @dcloudio/uni-h5-vue/dist/vue.runtime.esm.js，
 *   因此 vue-vendor chunk 中的 "vue" 入口实际指向 uni-h5-vue 产物。
 * - 不显式拆分 @dcloudio/uni-h5，因为 @sentry/vue 内部 import
 *   "@sentry/browser"（传递依赖，pnpm 未 hoist 到顶层），显式拆分会触发 rollup 主动
 *   解析其依赖图导致构建失败。让 rollup 默认行为处理这些库即可。
 *
 * @param id - 模块绝对路径
 * @returns chunk 名称，undefined 表示交由 rollup 默认行为
 */
function resolveH5ManualChunk(id: string): string | undefined {
  if (!isH5) return undefined;
  // 仅处理 node_modules 中的第三方依赖
  if (!id.includes("node_modules")) return undefined;

  // Vue 核心生态：vue / vue-i18n / pinia
  if (
    /[\\/]node_modules[\\/](vue|vue-i18n|pinia)[\\/]/.test(id) ||
    /[\\/]node_modules[\\/]@vue[\\/](shared|reactivity|runtime-core|runtime-dom|compiler-dom|compiler-core)[\\/]/.test(id)
  ) {
    return "vue-vendor";
  }
  // Sentry 错误监控 SDK：按需拆分，便于浏览器长期缓存
  if (/[\\/]node_modules[\\/]@sentry[\\/]/.test(id)) {
    return "sentry";
  }
  // GSAP 动画库
  if (/[\\/]node_modules[\\/]gsap[\\/]/.test(id)) {
    return "gsap";
  }
  // VueUse 组合式工具
  if (/[\\/]node_modules[\\/]@vueuse[\\/]/.test(id)) {
    return "vueuse";
  }
  // 其他第三方依赖统一归入 vendor chunk（保守策略，避免解析问题）
  return undefined;
}

/** 处理 /favicon.ico 请求 */
function faviconPlugin(): Plugin {
  return {
    name: "favicon-redirect",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/favicon.ico") {
          res.writeHead(302, { Location: "/favicon.svg" });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      // Vue 重定向到 uni-h5-vue 运行时（必须放在 @ 之前，避免被 @ 拦截）
      vue: require.resolve("@dcloudio/uni-h5-vue/dist/vue.runtime.esm.js"),
      // 业务代码别名：与 tsconfig.json paths 保持一致，便于 import "@/..." 写法
      "@": path.resolve(__dirname, "src"),
    },
  },
  esbuild: {
    target: buildTarget,
  },
  build: {
    // 构建目标：H5 = es2020+，mp-weixin = es2018（基础库兼容性）
    target: buildTarget,
    // 输出目录：H5 默认 dist/build/h5，mp-weixin 默认 dist/build/mp-weixin
    // 由 uni-app 通过 UNI_OUTPUT_DIR 环境变量覆盖，此处仅设默认值
    outDir: "dist/build",
    // 静态资源目录：相对于 outDir，所有 js/css 之外的资源放入此目录
    assetsDir: "assets",
    // 性能优化（P1）：提升 chunk 大小告警阈值至 1000KB，避免 vendor 拆分后频繁告警
    chunkSizeWarningLimit: 1000,
    // CSS 代码分割：按 chunk 拆分 CSS，避免单个超大 CSS 文件
    cssCodeSplit: true,
    // 压缩器：esbuild 比 terser 快 20-40 倍，且 vite 默认集成
    minify: "esbuild",
    // Sourcemap 配置：
    // - 开发模式（mode=development）：生成 sourcemap 便于调试
    // - 生产模式：'hidden' 生成 sourcemap 但不在产物中引用（用于 Sentry 上传，不暴露给终端用户）
    sourcemap: mode === "development" ? true : "hidden",
    // 关闭 gzip 压缩大小报告，加速构建（避免每次构建都计算 gzip 大小）
    reportCompressedSize: false,
    // H5 构建启用 manualChunks 分包，mp-weixin 不启用（由 uni-app 自动处理）
    rollupOptions: {
      // 启用 tree-shaking，剔除未使用的导出（生产环境默认开启，显式声明便于维护）
      treeshake: mode === "production" ? "smallest" : true,
      output: {
        manualChunks: resolveH5ManualChunk,
      },
    },
  },
  define: resolveViteEnvDefine(mode),
  plugins: [
    patchUniH5VueUpdateSlots(),
    faviconPlugin(),
    uni.default(),
    // 资源压缩插件示例（未引入新依赖，需要时安装 vite-plugin-compression 启用）：
    // import viteCompression from "vite-plugin-compression";
    // viteCompression({
    //   algorithm: "gzip",
    //   ext: ".gz",
    //   threshold: 10240, // 仅压缩 >10KB 的资源
    //   deleteOriginFile: false, // 保留原文件
    // }),
    //
    // 图片压缩插件示例（未引入新依赖，需要时安装 unplugin-imagemin 启用）：
    // import imagemin from "unplugin-imagemin/vite";
    // imagemin({ /* 配置项 */ }),
  ],
}));
