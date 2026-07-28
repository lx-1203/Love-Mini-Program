import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import i18n from "./i18n";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
// 注册 vue-i18n：提供 $t 全局方法与 useI18n() 组合式 API（Task 3.2.2）
app.use(i18n);
// 类型断言：vue-router 4.x 的 Router 类型与 Vue Plugin 类型存在已知不匹配
app.use(router as never);
app.mount("#app");
