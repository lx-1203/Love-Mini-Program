import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
// 类型断言：vue-router 4.x 的 Router 类型与 Vue Plugin 类型存在已知不匹配
app.use(router as never);
app.mount("#app");
