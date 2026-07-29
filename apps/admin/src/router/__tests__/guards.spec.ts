/**
 * Task 14 路由守卫单元测试。
 *
 * 验证点：
 *  1. isTokenValid：空 token / 非 JWT / 过期 JWT / 有效 JWT / dev token 五种分支
 *  2. getCurrentRole：localStorage 无 admin_user / 角色为 ADMIN / 角色为 user 三种分支
 *  3. setupRouterGuards：未登录访问受保护路由跳转 /login?redirect=...
 *  4. setupRouterGuards：已登录访问 /login 跳转首页（避免重复登录）
 *  5. setupRouterGuards：角色不在 meta.roles 跳转 /403
 *  6. setupRouterGuards：角色匹配 meta.roles 正常放行
 *
 * 工程约束：
 * - 不使用 import.meta.env.DEV（mp-weixin 不支持）
 * - 不使用 catch {} 空绑定（mp-weixin 不兼容）
 * - 不引入 jsdom 依赖：手动 mock localStorage（与 session.test.ts 保持一致），
 *   atob / Buffer 在 Node 16+ 全局可用
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
// 修复 no-duplicate-imports：合并 vue-router 的重复 import
import { createMemoryHistory, createRouter, type Router, type RouteRecordRaw } from "vue-router";

// ---------------------------------------------------------------------------
// localStorage mock：与 session.test.ts 保持一致风格，避免引入 jsdom 依赖
// ---------------------------------------------------------------------------
const storageData: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: vi.fn((key: string) => storageData[key] ?? null) as Storage["getItem"],
  setItem: vi.fn((key: string, value: string) => {
    storageData[key] = String(value);
  }) as Storage["setItem"],
  removeItem: vi.fn((key: string) => {
    delete storageData[key];
  }) as Storage["removeItem"],
  clear: vi.fn(() => {
    Object.keys(storageData).forEach((k) => delete storageData[k]);
  }) as Storage["clear"],
  key: vi.fn((index: number) => Object.keys(storageData)[index] ?? null) as Storage["key"],
  get length() {
    return Object.keys(storageData).length;
  },
} as Storage;

// 导入被测对象（必须在 localStorage mock 设置之后，确保模块初始化时读到 mock）
import {
  isTokenValid,
  getCurrentRole,
  setupRouterGuards,
} from "../guards";

/**
 * 构造测试用 router 实例。
 *
 * 使用 createMemoryHistory 避免依赖浏览器 URL，便于在 Node.js 测试环境
 * 中独立验证守卫行为。路由表覆盖 Login / Forbidden / Dashboard / Users
 * 四类典型场景，对应守卫的四个分支。
 */
function buildTestRouter(): Router {
  const routes: RouteRecordRaw[] = [
    {
      path: "/login",
      name: "Login",
      component: { template: "<div>login</div>" },
      meta: { requiresAuth: false },
    },
    {
      path: "/403",
      name: "Forbidden",
      component: { template: "<div>forbidden</div>" },
      meta: { requiresAuth: false },
    },
    {
      path: "/",
      name: "Dashboard",
      component: { template: "<div>dashboard</div>" },
      meta: { requiresAuth: true, roles: ["admin", "super_admin"] },
    },
    {
      path: "/users",
      name: "Users",
      component: { template: "<div>users</div>" },
      meta: { requiresAuth: true, roles: ["admin", "super_admin"] },
    },
  ];
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });
  setupRouterGuards(router);
  return router;
}

/**
 * 构造一个 base64 编码的 JWT payload（不含签名，签名段随意填充）。
 *
 * JWT 由 header.payload.signature 三段组成，本测试只关心 payload 中的 exp 字段。
 * guards.ts 使用 atob 解码 base64（Node 16+ 全局可用），并已处理 -/_ 替换以兼容 base64url。
 *
 * @param payload 序列化为 JSON 的 payload 对象（如 { exp: 1234567890 }）
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `${header}.${body}.signature`;
}

describe("isTokenValid - JWT 解析与过期校验", () => {
  beforeEach(() => {
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    vi.clearAllMocks();
  });

  it("空字符串 token 应返回 false", () => {
    expect(isTokenValid("")).toBe(false);
  });

  it("dev-admin-token- 前缀 token 应视为永不过期（开发环境 mock）", () => {
    expect(isTokenValid("dev-admin-token-1234567890")).toBe(true);
  });

  it("非 JWT 格式（段数不为 3）应返回 false", () => {
    expect(isTokenValid("not-a-jwt")).toBe(false);
    expect(isTokenValid("only.two")).toBe(false);
    expect(isTokenValid("a.b.c.d")).toBe(false);
  });

  it("JWT payload 不含 exp 字段时视为永不过期", () => {
    const token = makeJwt({ sub: "admin" });
    expect(isTokenValid(token)).toBe(true);
  });

  it("JWT 已过期（exp < 当前时间）应返回 false", () => {
    const exp = Math.floor(Date.now() / 1000) - 3600; // 1 小时前过期
    const token = makeJwt({ sub: "admin", exp });
    expect(isTokenValid(token)).toBe(false);
  });

  it("JWT 未过期（exp > 当前时间）应返回 true", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600; // 1 小时后过期
    const token = makeJwt({ sub: "admin", exp });
    expect(isTokenValid(token)).toBe(true);
  });

  it("JWT payload 非法 JSON 应返回 false", () => {
    const badPayload = Buffer.from("not-json").toString("base64");
    const token = `header.${badPayload}.sig`;
    expect(isTokenValid(token)).toBe(false);
  });
});

describe("getCurrentRole - 角色读取与归一化", () => {
  beforeEach(() => {
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    vi.clearAllMocks();
  });

  it("localStorage 无 admin_user 应返回空串", () => {
    expect(getCurrentRole()).toBe("");
  });

  it("admin_user 为非法 JSON 应返回空串", () => {
    storageData["admin_user"] = "{not-json";
    expect(getCurrentRole()).toBe("");
  });

  it("admin_user.role='ADMIN' 应归一化为小写 'admin'", () => {
    storageData["admin_user"] = JSON.stringify({
      id: 1,
      username: "admin",
      role: "ADMIN",
    });
    expect(getCurrentRole()).toBe("admin");
  });

  it("admin_user.role='Super_Admin' 应归一化为小写 'super_admin'", () => {
    storageData["admin_user"] = JSON.stringify({
      id: 2,
      username: "root",
      role: "Super_Admin",
    });
    expect(getCurrentRole()).toBe("super_admin");
  });

  it("admin_user 不含 role 字段应返回空串", () => {
    storageData["admin_user"] = JSON.stringify({ id: 3, username: "noob" });
    expect(getCurrentRole()).toBe("");
  });
});

describe("setupRouterGuards - 全局前置守卫", () => {
  let router: Router;

  beforeEach(() => {
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    vi.clearAllMocks();
    router = buildTestRouter();
  });

  it("未登录访问 /users 应跳转 /login?redirect=/users", async () => {
    await router.push("/users");
    await router.isReady();
    // 等待守卫异步完成（vue-router 守卫是同步 + 异步组合，push 后路由可能未立即更新）
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.redirect).toBe("/users");
  });

  it("未登录访问 / 应跳转 /login?redirect=/", async () => {
    await router.push("/");
    await router.isReady();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.redirect).toBe("/");
  });

  it("已登录访问 /login 应跳转首页（避免重复登录）", async () => {
    // 模拟有效 token：dev-admin-token 前缀视为永不过期
    storageData["admin_token"] = "dev-admin-token-test";
    storageData["admin_user"] = JSON.stringify({
      id: 1,
      username: "admin",
      role: "ADMIN",
    });

    await router.push("/login");
    await router.isReady();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.name).toBe("Dashboard");
  });

  it("已登录但角色不在 meta.roles 应跳转 /403", async () => {
    // 模拟 token 有效但角色为普通用户
    storageData["admin_token"] = "dev-admin-token-test";
    storageData["admin_user"] = JSON.stringify({
      id: 2,
      username: "user",
      role: "USER",
    });

    await router.push("/users");
    await router.isReady();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.name).toBe("Forbidden");
  });

  it("已登录且角色匹配应正常放行到目标路由", async () => {
    storageData["admin_token"] = "dev-admin-token-test";
    storageData["admin_user"] = JSON.stringify({
      id: 1,
      username: "admin",
      role: "ADMIN",
    });

    await router.push("/users");
    await router.isReady();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.name).toBe("Users");
    expect(router.currentRoute.value.path).toBe("/users");
  });

  it("已登录 super_admin 角色也应放行", async () => {
    storageData["admin_token"] = "dev-admin-token-test";
    storageData["admin_user"] = JSON.stringify({
      id: 9,
      username: "root",
      role: "super_admin",
    });

    await router.push("/");
    await router.isReady();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.name).toBe("Dashboard");
  });

  it("未登录访问 /403 应允许（无需鉴权）", async () => {
    await router.push("/403");
    await router.isReady();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.name).toBe("Forbidden");
  });

  it("已登录访问 /login 后再次访问 /users 应放行（守卫状态持久）", async () => {
    storageData["admin_token"] = "dev-admin-token-test";
    storageData["admin_user"] = JSON.stringify({
      id: 1,
      username: "admin",
      role: "ADMIN",
    });

    await router.push("/login");
    await router.isReady();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.currentRoute.value.name).toBe("Dashboard");

    await router.push("/users");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.currentRoute.value.name).toBe("Users");
  });
});

/**
 * 验证 setupRouterGuards 注册的是 beforeEach 守卫（非 afterEach/beforeResolve）。
 *
 * 此用例防止后续重构误改守卫注册时机，导致鉴权在路由进入后才触发（已造成数据泄露）。
 */
describe("setupRouterGuards - 守卫注册正确性", () => {
  it("应在 router 上注册 beforeEach 守卫", () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/",
          name: "Home",
          component: { template: "<div/>" },
        },
      ],
    });
    const spy = vi.spyOn(router, "beforeEach");
    setupRouterGuards(router);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
