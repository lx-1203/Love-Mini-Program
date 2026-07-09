import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mockSession = {
  userId: "user-1",
  loggedIn: true,
  loginMethod: "wechat",
  displayName: "星野",
  phoneBound: false,
  profileCompleted: false,
  campusVerified: false,
  scheduleCompleted: false,
  campusName: null,
  featureFlags: { chat_ai_enabled: false },
};

vi.mock("../../stores/session", () => ({
  useSessionStore: () => ({
    userSession: { ...mockSession },
    isProfileComplete: false,
    profileCompletion: 33,
  }),
}));

import {
  isPageLocked,
  checkProfileGuard,
  resolveProfileGuard,
  LOCKED_PAGES,
  getProfileSetupPath,
  getFeatureName,
} from "../../guards/profile-guard";

describe("profile-guard", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("isPageLocked returns true for locked page paths", () => {
    expect(isPageLocked("/pages/likes/index")).toBe(true);
    expect(isPageLocked("/pages/village/index")).toBe(true);
    expect(isPageLocked("/pages/messages/index")).toBe(true);
  });

  it("isPageLocked returns false for non-locked pages", () => {
    expect(isPageLocked("/pages/profile/index")).toBe(false);
    expect(isPageLocked("/pages/discover/index")).toBe(false);
    expect(isPageLocked("/pages/login/index")).toBe(false);
    expect(isPageLocked("/subpackages/setup/profile/index")).toBe(false);
  });

  it("isPageLocked handles paths without leading slash", () => {
    expect(isPageLocked("pages/likes/index")).toBe(true);
  });

  it("getFeatureName returns correct name for likes page", () => {
    expect(getFeatureName("/pages/likes/index")).toBe("喜欢列表");
  });

  it("getFeatureName returns correct name for village page", () => {
    expect(getFeatureName("/pages/village/index")).toBe("村口/讨论圈");
  });

  it("getFeatureName returns correct name for messages page", () => {
    expect(getFeatureName("/pages/messages/index")).toBe("消息");
  });

  it("getFeatureName returns undefined for non-locked page", () => {
    expect(getFeatureName("/pages/discover/index")).toBeUndefined();
    expect(getFeatureName("/pages/profile/index")).toBeUndefined();
  });

  it("getFeatureName handles paths without leading slash", () => {
    expect(getFeatureName("pages/likes/index")).toBe("喜欢列表");
  });

  it("getProfileSetupPath returns the setup profile path", () => {
    expect(getProfileSetupPath()).toBe("/subpackages/setup/profile/index");
  });

  it("checkProfileGuard returns false when profile is not complete", () => {
    expect(checkProfileGuard()).toBe(false);
  });

  it("resolveProfileGuard allows access when profile is complete", () => {
    const result = resolveProfileGuard("/pages/discover/index");
    expect(result.allowed).toBe(true);
    expect(result.completionPercent).toBe(33);
    expect(result.shouldShowModal).toBeUndefined();
  });

  it("resolveProfileGuard returns shouldShowModal=true for locked likes page when incomplete", () => {
    const result = resolveProfileGuard("/pages/likes/index");
    expect(result.allowed).toBe(false);
    expect(result.shouldShowModal).toBe(true);
    expect(result.featureName).toBe("喜欢列表");
    expect(result.completionPercent).toBe(33);
    expect((result as { redirectTo?: string }).redirectTo).toBeUndefined();
  });

  it("resolveProfileGuard returns shouldShowModal=true for locked village page when incomplete", () => {
    const result = resolveProfileGuard("/pages/village/index");
    expect(result.allowed).toBe(false);
    expect(result.shouldShowModal).toBe(true);
    expect(result.featureName).toBe("村口/讨论圈");
  });

  it("resolveProfileGuard returns shouldShowModal=true for locked messages page when incomplete", () => {
    const result = resolveProfileGuard("/pages/messages/index");
    expect(result.allowed).toBe(false);
    expect(result.shouldShowModal).toBe(true);
    expect(result.featureName).toBe("消息");
  });

  it("resolveProfileGuard allows non-locked page even when profile incomplete", () => {
    const result = resolveProfileGuard("/pages/discover/index");
    expect(result.allowed).toBe(true);
    expect(result.shouldShowModal).toBeUndefined();
  });

  it("LOCKED_PAGES contains the three protected pages (excluding profile)", () => {
    expect(LOCKED_PAGES).toContain("/pages/likes/index");
    expect(LOCKED_PAGES).toContain("/pages/village/index");
    expect(LOCKED_PAGES).toContain("/pages/messages/index");
    expect(LOCKED_PAGES).not.toContain("/pages/profile/index");
    expect(LOCKED_PAGES).toHaveLength(3);
  });
});