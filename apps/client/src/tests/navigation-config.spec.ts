import { describe, expect, it } from "vitest";
import { appTabs } from "../config/navigation";
import pagesJson from "../../pages.json";
import runtimePagesJson from "../pages.json";

describe("app tab navigation", () => {
  it("keeps the final five tabs in the expected order", () => {
    expect(appTabs.map((tab) => tab.id)).toEqual([
      "discover",
      "likes",
      "village",
      "messages",
      "profile",
    ]);
    expect(appTabs.map((tab) => tab.path)).toEqual([
      "/pages/discover/index",
      "/pages/likes/index",
      "/pages/village/index",
      "/pages/messages/index",
      "/pages/profile/index",
    ]);
  });

  it("matches the uni-app tabBar configuration", () => {
    const expectedTabPaths = [
      "pages/discover/index",
      "pages/likes/index",
      "pages/village/index",
      "pages/messages/index",
      "pages/profile/index",
    ];

    expect(pagesJson.tabBar.list.map((item) => item.pagePath)).toEqual(expectedTabPaths);
    expect(runtimePagesJson.tabBar.list.map((item) => item.pagePath)).toEqual(expectedTabPaths);
  });

  it("keeps root and runtime pages.json in sync for the tab bar", () => {
    expect(runtimePagesJson.tabBar.list).toEqual(pagesJson.tabBar.list);
  });
});
