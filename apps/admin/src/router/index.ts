import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "../stores/session";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/",
    name: "Layout",
    component: () => import("../views/Layout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "Dashboard",
        component: () => import("../views/Dashboard.vue"),
      },
      {
        path: "users",
        name: "Users",
        component: () => import("../views/Users.vue"),
      },
      {
        path: "posts",
        name: "Posts",
        component: () => import("../views/Posts.vue"),
      },
      {
        path: "feedback",
        name: "Feedback",
        component: () => import("../views/Feedback.vue"),
      },
      {
        path: "audit-logs",
        name: "AuditLogs",
        component: () => import("../views/AuditLogs.vue"),
      },
      {
        // 举报管理页面路由
        path: "reports",
        name: "Reports",
        component: () => import("../views/Reports.vue"),
      },
      { path: "notify-config", name: "NotifyConfig", component: () => import("../views/NotifyConfig.vue") },
      { path: "sensitive-words", name: "SensitiveWords", component: () => import("../views/SensitiveWords.vue") },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const sessionStore = useSessionStore();
  
  if (to.meta.requiresAuth && !sessionStore.isLoggedIn) {
    next({ name: "Login" });
  } else if (to.name === "Login" && sessionStore.isLoggedIn) {
    next({ name: "Dashboard" });
  } else {
    next();
  }
});

export default router;
