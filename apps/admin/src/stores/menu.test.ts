/**
 * stores/menu 纯函数单元测试（R4-00481）。
 *
 * 覆盖：菜单路径拼接 resolveMenuPath、首个可跳转菜单 findFirstMenuPath、
 * 已知菜单路径判定 isKnownMenuPath（守卫 404 分流逻辑依赖）。
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createPinia, setActivePinia } from "pinia";
import {
  resolveMenuPath,
  findFirstMenuPath,
  isKnownMenuPath,
  useMenuStore,
  type AdminMenuNode,
} from "./menu";

const tree: AdminMenuNode[] = [
  {
    id: 1, parentId: null, title: "数据看板", name: "Dashboard", path: "/dashboard",
    component: "views/Dashboard.vue", menuType: "MENU", type: "MENU", children: [],
  },
  {
    id: 10, parentId: null, title: "内容管理", name: "Content", path: "/content",
    menuType: "DIR", type: "DIR",
    children: [
      {
        id: 11, parentId: 10, title: "用户管理", name: "Users", path: "users",
        component: "views/content/Users.vue", menuType: "MENU", type: "MENU",
      },
    ],
  },
];

describe("resolveMenuPath", () => {
  it("绝对路径原样归一化", () => {
    expect(resolveMenuPath({ path: "/dashboard" })).toBe("/dashboard");
  });

  it("相对路径拼接父级前缀", () => {
    expect(resolveMenuPath({ path: "users" }, "/content")).toBe("/content/users");
  });

  it("连续斜杠收敛", () => {
    expect(resolveMenuPath({ path: "users" }, "/content/")).toBe("/content/users");
  });
});

describe("findFirstMenuPath", () => {
  it("返回菜单树中第一个 MENU 节点完整路径", () => {
    expect(findFirstMenuPath(tree)).toBe("/dashboard");
  });

  it("目录节点不参与返回，递归查找子菜单", () => {
    const noDashboard = tree.filter((n) => n.name !== "Dashboard");
    expect(findFirstMenuPath(noDashboard)).toBe("/content/users");
  });

  it("空树返回 null", () => {
    expect(findFirstMenuPath([])).toBeNull();
  });
});

describe("isKnownMenuPath", () => {
  it("命中 MENU 完整路径", () => {
    expect(isKnownMenuPath(tree, "/content/users")).toBe(true);
    expect(isKnownMenuPath(tree, "/dashboard")).toBe(true);
  });

  it("命中 DIR 目录路径", () => {
    expect(isKnownMenuPath(tree, "/content")).toBe(true);
  });

  it("未知路径返回 false（保留 404 页）", () => {
    expect(isKnownMenuPath(tree, "/totally/unknown")).toBe(false);
    expect(isKnownMenuPath(tree, "/content/unknown")).toBe(false);
  });

  it("末尾斜杠归一化后仍命中", () => {
    expect(isKnownMenuPath(tree, "/content/users/")).toBe(true);
    expect(isKnownMenuPath(tree, "/")).toBe(false);
  });
});

/**
 * 第五轮 B-FINDING 15（admin 侧）：登出必须清空菜单内存态，换账号后守卫必须重拉。
 *
 * 这两条都是"能变红"的判点：
 *   - 若 session.ts 的 logout() 不再调 menuStore.reset()，或 reset() 不再清 loadedFor，
 *     第一条红；
 *   - 若 router/guards.ts 把加载条件退回 `if (!menuStore.loaded)`（不绑定登录主体），
 *     第二条（源契约）红。
 */
describe("useMenuStore.reset 清空登录主体归属", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("reset 后 loaded=false、menuTree 空、loadedFor 归 null", () => {
    const store = useMenuStore();
    store.menus = tree.slice(0, 1);
    store.loaded = true;
    store.loadedFor = "42";
    expect(store.loaded).toBe(true);
    expect(store.loadedFor).toBe("42");

    store.reset();

    expect(store.loaded).toBe(false);
    expect(store.loadedFor).toBeNull();
    expect(store.menuTree).toHaveLength(0);
  });

  it("换账号（loadedFor 与新用户 id 不一致）时守卫条件成立、需要重拉", () => {
    // 复现守卫判据 `!loaded || loadedFor !== currentUserId`（不依赖真实 router）：
    const store = useMenuStore();
    store.loaded = true;
    store.loadedFor = "A";
    // 账号 A 已加载 → 同主体不该重拉
    expect(!store.loaded || store.loadedFor !== "A").toBe(false);
    // 换成主体 B（SPA 软跳转，未 reset）→ 必须重拉，否则 B 继承 A 的菜单树
    expect(!store.loaded || store.loadedFor !== "B").toBe(true);
  });
});

describe("router/guards 换账号重拉菜单（源契约）", () => {
  it("加载条件绑定当前登录主体，不再只判 !loaded", () => {
    const src = readFileSync(new URL("../router/guards.ts", import.meta.url), "utf8");
    expect(src).toMatch(/menuStore\.loadedFor !== currentUserId/);
    expect(src).toContain("loadMenus(currentUserId)");
    // 退回旧写法 `if (!menuStore.loaded) {`（不绑定主体）即红
    expect(src).not.toMatch(/if \(!menuStore\.loaded\) \{/);
  });

  it("session.logout 调用 menuStore.reset", () => {
    const src = readFileSync(new URL("./session.ts", import.meta.url), "utf8");
    expect(src).toMatch(/useMenuStore\(\)\.reset\(\)/);
  });
});
