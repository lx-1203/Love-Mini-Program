import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import i18n from "./i18n";
import { useSessionStore } from "./stores/session";
import { setupRouterGuards } from "./router/guards";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
// 注册 vue-i18n：提供 $t 全局方法与 useI18n() 组合式 API（Task 3.2.2）
app.use(i18n);

// Task 14：在 pinia 就绪后注册路由守卫，确保 localStorage 读取与角色校验生效。
// 守卫实现见 router/guards.ts，便于单元测试复用。
setupRouterGuards(router);

// 类型断言：vue-router 4.x 的 Router 类型与 Vue Plugin 类型存在已知不匹配
app.use(router as never);

// 启动时从 localStorage 恢复会话，确保 isLoggedIn 在守卫之外也可用
const sessionStore = useSessionStore();
void sessionStore.bootstrap();

app.mount("#app");
