import { describe, expect, it } from "vitest";
import {
  discoverPageRequirements,
  likesPageRequirements,
  villagePageRequirements,
  messagesPageRequirements,
  profilePageRequirements,
} from "../config/page-access";

describe("page access config", () => {
  it("keeps the discover page open to any visitor (免登录可逛，登录后可互动)", () => {
    expect(discoverPageRequirements).toEqual({
      requiresAuth: false,
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

  it("keeps the village page open to any visitor (免登录可浏览社区，认证类功能单独校验)", () => {
    expect(villagePageRequirements).toEqual({
      requiresAuth: false,
      requiresProfile: false,
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

  it("keeps the profile page open to any visitor (页内引导完善资料，编辑类功能登录后可用)", () => {
    expect(profilePageRequirements).toEqual({
      requiresAuth: false,
      requiresProfile: false,
      requiresCampus: false,
      requiresSchedule: false,
    });
  });
});
