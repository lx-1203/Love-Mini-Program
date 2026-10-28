import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 通知中心页（2026-10-28）：
 * 首页铃铛必须进入通知中心；列表必须拉 /notifications/list、可标记已读、按引用类型跳转。
 */
describe("通知中心页契约", () => {
  const pageSource = readFileSync(
    resolve(__dirname, "../../subpackages/profile-extra/notifications/index.vue"),
    "utf-8"
  );
  const homeSource = readFileSync(resolve(__dirname, "../../pages/home/index.vue"), "utf-8");
  const storeSource = readFileSync(resolve(__dirname, "../../stores/messages.ts"), "utf-8");
  const zhSource = readFileSync(resolve(__dirname, "../../i18n/locales/zh-CN.ts"), "utf-8");
  const enSource = readFileSync(resolve(__dirname, "../../i18n/locales/en-US.ts"), "utf-8");

  it("首页铃铛进入通知中心而非消息 tab", () => {
    expect(homeSource).toContain('@notifyTap="goNotifications"');
    expect(homeSource).toContain("ROUTES.PROFILE.NOTIFICATIONS");
  });

  it("页面拉通知、标记已读、按引用类型跳转", () => {
    expect(pageSource).toContain("messagesStore.fetchNotifications()");
    expect(pageSource).toContain("messagesStore.markNotificationRead(item.id)");
    expect(pageSource).toContain("resolveNotificationTarget(item)");
    expect(pageSource).toContain("messagesStore.markAllNotificationsRead()");
  });

  it("通知模型保留 referenceType 与头像", () => {
    expect(storeSource).toContain("referenceType?: string | null");
    expect(storeSource).toContain("sourceAvatar?: string | null");
    expect(storeSource).toContain('"topic_like": "topic_like"');
  });

  it("中英文案成对存在", () => {
    expect(zhSource).toContain('"title": "通知中心"');
    expect(zhSource).toContain('"empty": "暂无通知"');
    expect(enSource).toContain('title: "Notifications"');
    expect(enSource).toContain('empty: "No notifications"');
  });
});
