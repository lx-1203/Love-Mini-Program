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
  });

  it("detects tab bar paths", () => {
    expect(isTabPath("/pages/discover/index")).toBe(true);
    expect(isTabPath("pages/messages/index")).toBe(true);
    expect(isTabPath("/pages/chat-session/index")).toBe(false);
    expect(isTabPath("/subpackages/setup/schedule/index")).toBe(false);
  });

  it("opens tab pages with switchTab", () => {
    openAppPath("/pages/discover/index");

    expect(switchTab).toHaveBeenCalledWith({ url: "/pages/discover/index" });
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("opens non-tab pages with navigateTo", () => {
    openAppPath("/subpackages/setup/schedule/index");

    expect(navigateTo).toHaveBeenCalledWith({ url: "/subpackages/setup/schedule/index" });
    expect(switchTab).not.toHaveBeenCalled();
  });

  it("replaces tab pages with switchTab", () => {
    replaceAppPath("/pages/discover/index");

    expect(switchTab).toHaveBeenCalledWith({ url: "/pages/discover/index" });
    expect(redirectTo).not.toHaveBeenCalled();
  });

  it("replaces non-tab pages with redirectTo", () => {
    replaceAppPath("/subpackages/setup/profile/index");

    expect(redirectTo).toHaveBeenCalledWith({ url: "/subpackages/setup/profile/index" });
    expect(switchTab).not.toHaveBeenCalled();
  });
});
