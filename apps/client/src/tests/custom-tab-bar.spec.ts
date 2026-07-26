import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pagesJson from "../pages.json";

/**
 * 自定义 TabBar 配置回归测试
 *
 * 验证点：
 * - src/custom-tab-bar/index.js 中的 tab.path 必须与 pages.json 的 pagePath 保持一致
 * - 微信小程序 wx.switchTab 要求路径不带前导斜杠，且必须与 pages.json 注册路径完全匹配
 * - 图标路径（iconPath / activeIconPath）保留前导斜杠以指向项目根目录静态资源
 */
describe("custom-tab-bar configuration", () => {
  const customTabBarSource = readFileSync(
    resolve(__dirname, "../custom-tab-bar/index.js"),
    "utf-8"
  );

  /** 从 JS 源码中提取 tabs 数组内的对象配置 */
  function extractTabConfig(source: string): Array<{
    id: string;
    path: string;
    iconPath: string;
    activeIconPath: string;
  }> {
    const tabsMatch = source.match(/data:\s*\{\s*tabs:\s*\[([\s\S]*?)\],/);
    if (!tabsMatch) {
      throw new Error("无法从 custom-tab-bar/index.js 中解析 tabs 数组");
    }

    // 修复（严格模式 noUncheckedIndexedAccess）：tabsMatch[1] 索引访问返回 string | undefined，
    // 前面已校验 tabsMatch 非空，但 [1] 仍可能为 undefined，此处提取后做非空校验。
    const tabsContent = tabsMatch[1];
    if (!tabsContent) {
      throw new Error("无法从 custom-tab-bar/index.js 中解析 tabs 数组内容");
    }
    const tabBlocks = tabsContent.match(/\{\s*id:\s*"[^"]+"[\s\S]*?\}/g) ?? [];
    return tabBlocks.map((block) => {
      const id = block.match(/id:\s*"([^"]+)"/)?.[1] ?? "";
      const path = block.match(/path:\s*"([^"]+)"/)?.[1] ?? "";
      const iconPath = block.match(/iconPath:\s*"([^"]+)"/)?.[1] ?? "";
      const activeIconPath = block.match(/activeIconPath:\s*"([^"]+)"/)?.[1] ?? "";
      return { id, path, iconPath, activeIconPath };
    });
  }

  it("tab 路径应与 pages.json 的 pagePath 完全一致（不带前导斜杠）", () => {
    const tabs = extractTabConfig(customTabBarSource);
    const expectedPaths = pagesJson.tabBar.list.map((item) => item.pagePath);

    expect(tabs.map((tab) => tab.path)).toEqual(expectedPaths);
    for (const tab of tabs) {
      expect(tab.path.startsWith("/")).toBe(false);
    }
  });

  it("图标路径应保留前导斜杠以指向项目根目录", () => {
    const tabs = extractTabConfig(customTabBarSource);

    for (const tab of tabs) {
      expect(tab.iconPath.startsWith("/")).toBe(true);
      expect(tab.activeIconPath.startsWith("/")).toBe(true);
    }
  });

  it("tab 顺序和数量应与 pages.json 保持一致", () => {
    const tabs = extractTabConfig(customTabBarSource);

    expect(tabs.length).toBe(pagesJson.tabBar.list.length);
    expect(tabs.map((tab) => tab.id)).toEqual([
      "discover",
      "village",
      "home",
      "chat",
      "profile",
    ]);
  });
});
