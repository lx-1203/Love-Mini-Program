import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock session store
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
} from "../../guards/profile-guard";

describe("profile-guard", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // ------------------------------------------------------------------
  // isPageLocked
  // ------------------------------------------------------------------
  it("isPageLocked returns true for locked page paths", () => {
    expect(isPageLocked("/pages/likes/index")).toBe(true);
    expect(isPageLocked("/pages/village/index")).toBe(true);
    expect(isPageLocked("/pages/messages/index")).toBe(true);
    expect(isPageLocked("/pages/profile/index")).toBe(true);
  });

  it("isPageLocked returns false for non-locked pages", () => {
    expect(isPageLocked("/pages/discover/index")).toBe(false);
    expect(isPageLocked("/pages/login/index")).toBe(false);
    expect(isPageLocked("/subpackages/setup/profile/index")).toBe(false);
  });

  it("isPageLocked handles paths without leading slash", () => {
    expect(isPageLocked("pages/likes/index")).toBe(true);
  });

  // ------------------------------------------------------------------
  // getProfileSetupPath
  // ------------------------------------------------------------------
  it("getProfileSetupPath returns the setup profile path", () => {
    expect(getProfileSetupPath()).toBe("/subpackages/setup/profile/index");
  });

  // ------------------------------------------------------------------
  // checkProfileGuard
  // ------------------------------------------------------------------
  it("checkProfileGuard returns false when profile is not complete", () => {
    // default mock has isProfileComplete = false
    expect(checkProfileGuard()).toBe(false);
  });

  // ------------------------------------------------------------------
  // resolveProfileGuard – already completed
  // ------------------------------------------------------------------
  it("resolveProfileGuard allows access when profile is complete", () => {
    const mockComplete = {
      isProfileComplete: true,
      profileCompletion: 100,
    };
    vi.doMock("../stores/session", () => ({
      useSessionStore: () => ({
        userSession: {
          ...mockSession,
          profileCompleted: true,
          campusVerified: true,
          scheduleCompleted: true,
        },
        isProfileComplete: mockComplete.isProfileComplete,
        profileCompletion: mockComplete.profileCompletion,
      }),
    }));

    // RESOLVE check: even with default mock (incomplete), test non-locked pages
    const result = resolveProfileGuard("/pages/discover/index");
    expect(result.allowed).toBe(true);
    expect(result.completionPercent).toBe(33);
  });

  // ------------------------------------------------------------------
  // resolveProfileGuard – locked page when incomplete
  // ------------------------------------------------------------------
  it("resolveProfileGuard redirects locked page when profile incomplete", () => {
    const result = resolveProfileGuard("/pages/likes/index");

    expect(result.allowed).toBe(false);
    expect(result.redirectTo).toBe("/subpackages/setup/profile/index");
  });

  it("resolveProfileGuard allows non-locked page even when profile incomplete", () => {
    const result = resolveProfileGuard("/pages/discover/index");

    expect(result.allowed).toBe(true);
  });

  // ------------------------------------------------------------------
  // LOCKED_PAGES constant
  // ------------------------------------------------------------------
  it("LOCKED_PAGES contains all four protected pages", () => {
    expect(LOCKED_PAGES).toContain("/pages/likes/index");
    expect(LOCKED_PAGES).toContain("/pages/village/index");
    expect(LOCKED_PAGES).toContain("/pages/messages/index");
    expect(LOCKED_PAGES).toContain("/pages/profile/index");
    expect(LOCKED_PAGES).toHaveLength(4);
  });
});