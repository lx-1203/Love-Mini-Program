import { createSSRApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import gsapPlugin from "./plugins/gsap";

// 微信小程序兼容层：仅在 mp-weixin 环境下动态加载，避免 H5 端 import 报错
async function loadAndPatchWxCompat(): Promise<void> {
  // #ifdef MP-WEIXIN
  try {
    const mod = await import("./compat");
    if (typeof mod.patchDeprecatedApi === "function") {
      mod.patchDeprecatedApi();
    }
  } catch (_e) {
    console.warn("[compat] patchDeprecatedApi failed:", _e);
  }
  // #endif
}

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(gsapPlugin);

  // 全局错误处理：捕获 Vue 组件内部未处理的错误
  app.config.errorHandler = (err, _instance, info) => {
    console.error("[Vue Error]", err, info);
  };

  // 全局警告处理：捕获 Vue 运行时警告（仅开发环境）
  app.config.warnHandler = (msg, _instance, trace) => {
    console.warn("[Vue Warn]", msg, trace);
  };

  // 在 Vue 应用创建完成后再 patch 微信弃用 API，
  // 避免在 createSSRApp 之前修改 wx 全局对象导致组件作用域初始化异常
  loadAndPatchWxCompat();

  return {
    app,
    pinia,
  };
}
