import { beforeEach, describe, expect, it, vi } from "vitest";
import { isTabPath, openAppPath, replaceAppPath } from "../utils/navigation";

describe("navigation utils", () => {
  const switchTab = vi.fn();
  const navigateTo = vi.fn();
  const redirectTo = vi.fn();

  beforeEach(() => {
    switchTab.mockReset();
    navigateTo.mockReset();
    redirectTo.mockReset();
    vi.stubGlobal("uni", {
      switchTab,
      navigateTo,
      redirectTo,
    });
    // 2026-09-06 openAppPath 新增页面栈溢出兜底（getCurrentPages），mp 全局在 node 测试环境不存在，
    // stub 为空栈以走 navigateTo 主链路（语义不变）。
    vi.stubGlobal("getCurrentPages", () => []);
  });

  it("detects tab bar paths", () => {
    expect(isTabPath("/pages/home/index")).toBe(true);
    expect(isTabPath("pages/village/index")).toBe(false);
    expect(isTabPath("/pages/nearby/index")).toBe(true);
    expect(isTabPath("/pages/discover/index")).toBe(true);
    expect(isTabPath("/pages/messages/index")).toBe(true);
    expect(isTabPath("/pages/profile/index")).toBe(true);
    expect(isTabPath("/subpackages/chat/chat-session/index")).toBe(false);
    expect(isTabPath("/subpackages/setup/schedule/index")).toBe(false);
  });

  it("opens tab pages with switchTab", () => {
    openAppPath("/pages/home/index");

    expect(switchTab).toHaveBeenCalledWith({ url: "/pages/home/index" });
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("opens non-tab pages with navigateTo", () => {
    openAppPath("/subpackages/setup/schedule/index");

    // 2026-09-06 openAppPath 新增页面栈溢出兜底：navigateTo 现固定携带 fail 回调
    //（webview count limit 时降级 redirectTo），断言改为校验 url 与调用次数（语义不变）。
    expect(navigateTo).toHaveBeenCalledTimes(1);
    expect(vi.mocked(navigateTo).mock.calls[0]![0]).toMatchObject({
      url: "/subpackages/setup/schedule/index",
    });
    expect(switchTab).not.toHaveBeenCalled();
  });

  it("replaces tab pages with switchTab", () => {
    replaceAppPath("/pages/home/index");

    expect(switchTab).toHaveBeenCalledWith({ url: "/pages/home/index" });
    expect(redirectTo).not.toHaveBeenCalled();
  });

  it("replaces non-tab pages with redirectTo", () => {
    replaceAppPath("/subpackages/setup/profile/index");

    expect(redirectTo).toHaveBeenCalledWith({ url: "/subpackages/setup/profile/index" });
    expect(switchTab).not.toHaveBeenCalled();
  });
});
