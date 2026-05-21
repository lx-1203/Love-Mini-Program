import { describe, expect, it } from "vitest";
import { resolveSessionAccess } from "../guards/session-guard";

describe("resolveSessionAccess", () => {
  it("redirects anonymous users away from protected pages", () => {
    expect(
      resolveSessionAccess(
        {
          isLoggedIn: false,
          profileCompleted: false,
          campusCompleted: false,
          scheduleCompleted: false,
          featureFlags: {},
        },
        {
          requiresAuth: true,
          requiresProfile: false,
          requiresCampus: false,
          requiresSchedule: false,
        }
      )
    ).toEqual({
      allowed: false,
      redirectTo: "/pages/login/index",
    });
  });

  it("forces logged-in users through the completion funnel", () => {
    expect(
      resolveSessionAccess(
        {
          isLoggedIn: true,
          profileCompleted: false,
          campusCompleted: false,
          scheduleCompleted: false,
          featureFlags: {},
        },
        {
          requiresAuth: true,
          requiresProfile: true,
          requiresCampus: true,
          requiresSchedule: true,
        }
      )
    ).toEqual({
      allowed: false,
      redirectTo: "/subpackages/setup/profile/index",
    });
  });

  it("allows logged-in users onto auth-only pages even when setup is incomplete", () => {
    expect(
      resolveSessionAccess(
        {
          isLoggedIn: true,
          profileCompleted: false,
          campusCompleted: false,
          scheduleCompleted: false,
          featureFlags: {},
        },
        {
          requiresAuth: true,
          requiresProfile: false,
          requiresCampus: false,
          requiresSchedule: false,
        }
      )
    ).toEqual({
      allowed: true,
    });
  });
});
