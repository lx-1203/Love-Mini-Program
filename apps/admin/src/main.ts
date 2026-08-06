import { createApp, type Plugin } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import i18n from "./i18n";
import { setupRouterGuards } from "./router/guards";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
// 注册 vue-i18n：提供 $t 全局方法与 useI18n() 组合式 API（Task 3.2.2）
app.use(i18n);

// Task 14：在 pinia 就绪后注册路由守卫，确保 localStorage 读取与角色校验生效。
// 守卫实现见 router/guards.ts，便于单元测试复用。
setupRouterGuards(router);

// infra R2-00318：类型断言收窄——Router 类型未显式实现 Vue Plugin 接口，
// 但 vue-router 4.x 提供 install(app) 方法，可安全断言为 Plugin。
// 原 `as never` 掩盖真实类型问题，这里用 Plugin 类型保留类型检查。
app.use(router as unknown as Plugin);

// infra R2-00319：会话恢复只保留 App.vue onMounted 中的一次 bootstrap()。
// 原 main.ts 与 App.vue 各调用一次 bootstrap()，属冗余异步调用（竞态窗口）。
// 移除本处调用，避免两次读取 localStorage 相互覆盖。

app.mount("#app");
