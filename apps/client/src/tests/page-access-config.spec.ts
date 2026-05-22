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

  it("keeps the likes page open to any logged-in user", () => {
    expect(likesPageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: false,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });

  it("keeps the village page open to any logged-in user", () => {
    expect(villagePageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: false,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });

  it("keeps the messages page open to any logged-in user", () => {
    expect(messagesPageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: false,
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
