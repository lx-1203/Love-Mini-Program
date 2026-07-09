import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
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

// 构建目标按平台条件化：
// - mp-weixin：基础库不支持 ES2019 optional catch binding (catch {})，需 es2018 让 esbuild 把 catch {} 转译为 catch (e) {}
// - H5：必须 ≥ es2020 以保留 import.meta 语法（@vitejs/plugin-vue 注入的 HMR 代码 import.meta.hot.on('file-changed', ...)
//   在 es2018 target 下会被 esbuild 错误转译为未定义的 import_meta 变量，导致 App.vue 入口导入失败、全页面空白）
const isMpWeixin = process.env.UNI_PLATFORM === "mp-weixin";
const buildTarget: string | string[] = isMpWeixin
  ? "es2018"
  : ["es2020", "edge88", "firefox78", "chrome87", "safari14"];

export default defineConfig({
  resolve: {
    alias: {
      vue: fileURLToPath(
        new URL("../../node_modules/@dcloudio/uni-h5-vue/dist/vue.runtime.esm.js", import.meta.url)
      ),
    },
  },
  esbuild: {
    target: buildTarget,
  },
  build: {
    target: buildTarget,
  },
  plugins: [patchUniH5VueUpdateSlots(), uni.default()],
});
