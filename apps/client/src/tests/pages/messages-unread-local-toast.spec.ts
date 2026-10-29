import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 2026-10-28：消息「标为未读」由本地态改为服务端持久化。
 * 页面必须调 store、store 必须调 PUT /unread 并在失败时回滚；
 * 列表加载不再自动清空全部未读，否则持久标记会被下一次 loadPage 抹掉。
 */
describe("messages 页「标为未读」服务端同步", () => {
  const pageSource = readFileSync(
    resolve(__dirname, "../../pages/messages/index.vue"),
    "utf-8"
  );
  const storeSource = readFileSync(resolve(__dirname, "../../stores/messages.ts"), "utf-8");
  const zhSource = readFileSync(resolve(__dirname, "../../i18n/locales/zh-CN.ts"), "utf-8");

  const unreadBranch = pageSource.slice(
    pageSource.indexOf("if (tapIndex === 1) {"),
    pageSource.indexOf("if (tapIndex === 2) {")
  );

  it("长按菜单保留「标为未读」能力", () => {
    expect(pageSource).toContain('"标为未读"');
  });

  it("tapIndex===1 调 markSessionUnread 并按返回显示成功/失败 toast", () => {
    expect(unreadBranch).toContain("messagesStore.markSessionUnread(session.id)");
    expect(unreadBranch).toContain("messages.markedUnread");
    expect(unreadBranch).toContain("messages.unreadSyncFailed");
  });

  it("成功/失败文案在 zh-CN 存在（英文版不上线，唯一语言资源）", () => {
    expect(zhSource).toContain('"markedUnread": "已标为未读"');
    expect(zhSource).toContain('"unreadSyncFailed": "标记未读失败，请重试"');
    // 2026-10-29 产品决定：en-US.ts 已删除且 i18n 不再注册英文档位。
    // 恢复一份没人注册的语言包属缺陷，这里正向断言它不在仓库里。
    expect(existsSync(resolve(__dirname, "../../i18n/locales/en-US.ts"))).toBe(false);
  });

  it("store 调 PUT /unread，失败时回滚本地未读数", () => {
    expect(storeSource).toContain("markConversationUnread");
    expect(storeSource).toContain("/unread");
    expect(storeSource).toContain("session.unreadCount = previous");
  });

  it("列表加载不再自动清空全部未读", () => {
    expect(pageSource).not.toContain("void messagesStore.markAllSessionsRead();");
  });
});
