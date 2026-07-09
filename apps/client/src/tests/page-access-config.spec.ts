import { describe, expect, it } from "vitest";
import {
  discoverPageRequirements,
  likesPageRequirements,
  villagePageRequirements,
  messagesPageRequirements,
  profilePageRequirements,
} from "../config/page-access";

describe("page access config", () => {
  it("keeps the discover page open to any logged-in user", () => {
    expect(discoverPageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: false,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });

  it("keeps the likes page requiring profile completion", () => {
    expect(likesPageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: true,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });

  it("keeps the village page requiring profile completion", () => {
    expect(villagePageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: true,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });

  it("keeps the messages page requiring profile completion", () => {
    expect(messagesPageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: true,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });

  it("keeps the profile page open to any logged-in user", () => {
    expect(profilePageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: false,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });
});
