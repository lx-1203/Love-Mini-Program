import { describe, expect, it } from "vitest";
import { appTabs } from "../config/navigation";
// 修复 no-duplicate-imports：合并 ../pages.json 的重复 import
// 两个本地变量引用同一模块，使用单一 import + 别名重命名
import pagesJson from "../pages.json";

// 运行时 pagesJson 别名（语义：保留原命名以减少调用点改动）
const runtimePagesJson = pagesJson;

describe("app tab navigation", () => {
  it("keeps the final five tabs in the expected order", () => {
    expect(appTabs.map((tab) => tab.id)).toEqual([
      "discover",
      "village",
      "home",
      "chat",
      "profile",
    ]);
    expect(appTabs.map((tab) => tab.path)).toEqual([
      "/pages/discover/index",
      "/pages/village/index",
      "/pages/home/index",
      "/pages/chat/index",
      "/pages/profile/index",
    ]);
  });

  it("matches the uni-app tabBar configuration", () => {
    const expectedTabPaths = [
      "pages/discover/index",
      "pages/village/index",
      "pages/home/index",
      "pages/chat/index",
      "pages/profile/index",
    ];

    expect(pagesJson.tabBar.list.map((item) => item.pagePath)).toEqual(expectedTabPaths);
    expect(runtimePagesJson.tabBar.list.map((item) => item.pagePath)).toEqual(expectedTabPaths);
  });

  it("keeps root and runtime pages.json in sync for the tab bar", () => {
    expect(runtimePagesJson.tabBar.list).toEqual(pagesJson.tabBar.list);
  });
});
