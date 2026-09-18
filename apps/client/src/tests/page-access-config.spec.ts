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

  // 2026-08-24 页面权限放宽（commit 19e8f97 重新应用）：likes 页会话层仅要求登录，
  // 资料完善硬门槛移至 guards/profile-guard（LOCKED_PAGES + UnlockGuideModal）承接。
  it("keeps the likes page requiring auth (profile gate handled by profile-guard modal)", () => {
    expect(likesPageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: false,
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

  // 2026-08-24 页面权限放宽：messages 页会话层仅要求登录（同 likes，profile 门槛由 profile-guard 承接）。
  it("keeps the messages page requiring auth (profile gate handled by profile-guard modal)", () => {
    expect(messagesPageRequirements).toEqual({
      requiresAuth: true,
      requiresProfile: false,
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
