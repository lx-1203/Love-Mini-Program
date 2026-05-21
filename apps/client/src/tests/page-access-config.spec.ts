import { describe, expect, it } from "vitest";
import { chatPageRequirements, homePageRequirements } from "../config/page-access";

describe("page access config", () => {
  it("keeps the home page open to any logged-in user", () => {
    expect(homePageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: false,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });

  it("keeps the chat list open to any logged-in user", () => {
    expect(chatPageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: false,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });
});
