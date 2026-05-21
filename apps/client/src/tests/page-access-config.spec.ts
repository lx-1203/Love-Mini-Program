import { describe, expect, it } from "vitest";
import { chatPageRequirements, homePageRequirements } from "../config/page-access";

describe("page access config", () => {
  it("requires profile for home page (Day 1 tightening)", () => {
    expect(homePageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: true,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });

  it("requires profile + campus for chat page (Day 1 tightening)", () => {
    expect(chatPageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: true,
      requiresCampus: true,
      requiresSchedule: false,
    });
  });
});
