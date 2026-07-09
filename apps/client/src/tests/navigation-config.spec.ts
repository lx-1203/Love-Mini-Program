import { describe, expect, it } from "vitest";
import { appTabs } from "../config/navigation";
import pagesJson from "../../pages.json";
import runtimePagesJson from "../pages.json";

describe("app tab navigation", () => {
  it("keeps the final five tabs in the expected order", () => {
    expect(appTabs.map((tab) => tab.id)).toEqual([
      "home",
      "village",
      "discover",
      "chat",
      "profile",
    ]);
    expect(appTabs.map((tab) => tab.path)).toEqual([
      "/pages/home/index",
      "/pages/village/index",
      "/pages/discover/index",
      "/pages/chat/index",
      "/pages/profile/index",
    ]);
  });

  it("matches the uni-app tabBar configuration", () => {
    const expectedTabPaths = [
      "pages/home/index",
      "pages/village/index",
      "pages/discover/index",
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
