import { createApp } from "vue";
// 全局设计令牌（:root 变量）——必须全局引入，scoped 内 :root 会失效（见 admin-tokens.css 头注释）
import "./styles/admin-tokens.css";
// Element Plus 全量注册（W2 决策：管理后台 bundle 优先级低于稳定性，采用全量而非按需插件）
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
// EP 主题覆盖：--admin-* → --el-* 映射，必须在 EP css 之后引入（见 element-override.css 头注释）
import "./styles/element-override.css";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import i18n from "./i18n";
import { useSessionStore } from "./stores/session";
import { setupRouterGuards } from "./router/guards";

/**
 * Admin v2 应用入口。
 *
 * 初始化顺序（有依赖关系，不可随意调换）：
 * 1. createApp + pinia —— store 先就绪；
 * 2. i18n —— 非组件场景（api/stores）通过全局 t() 使用文案；
 * 3. setupRouterGuards(router) —— 守卫内部使用 useSessionStore / useMenuStore，
 *    必须在 pinia 安装之后注册；
 * 4. bootstrap() —— 从 localStorage 恢复会话（admin_v2_token / admin_v2_user）；
 * 5. mount。
 *
 * 动态路由说明：菜单由守卫按需加载（首次进入受保护路由时
 * 调用 menuStore.loadMenus() + addDynamicRoutes()），无需在此处预加载。
 */
const app = createApp(App);
const pinia = createPinia();

app.use(ElementPlus);
app.use(pinia);
app.use(i18n);

// 在 pinia 就绪后注册路由守卫（守卫内使用 useSessionStore / useMenuStore）
setupRouterGuards(router);

// 类型断言：vue-router 4.x 的 Router 类型与 Vue Plugin 类型存在已知不匹配
app.use(router as never);

// 启动时从 localStorage 恢复会话，确保 isLoggedIn 在守卫之外也可用
const sessionStore = useSessionStore();
void sessionStore.bootstrap();

app.mount("#app");
