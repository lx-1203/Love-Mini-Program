/**
 * stores/menu 纯函数单元测试（R4-00481）。
 *
 * 覆盖：菜单路径拼接 resolveMenuPath、首个可跳转菜单 findFirstMenuPath、
 * 已知菜单路径判定 isKnownMenuPath（守卫 404 分流逻辑依赖）。
 */
import { describe, expect, it } from "vitest";
import { resolveMenuPath, findFirstMenuPath, isKnownMenuPath } from "./menu";
import type { AdminMenuNode } from "./menu";

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
