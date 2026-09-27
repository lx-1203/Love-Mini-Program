import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * MP-R2-PAGES-MESSAGES-INDEX-020（裁决 (a)）：
 * 「标为未读」后端无对应接口，unreadCount 只活在本地 store，onShow/loadPage 重新拉取即还原。
 * 保留能力的代价是必须说清楚——长按菜单第 2 项执行后要有明示「仅本机生效」的 toast 回执，
 * 且该 key 必须中英成对存在。菜单项本身不得摘除。
 */
describe("messages 页「标为未读」本地态回执 - MP-R2-PAGES-MESSAGES-INDEX-020", () => {
  const pageSource = readFileSync(
    resolve(__dirname, "../../pages/messages/index.vue"),
    "utf-8"
  );
  const zhSource = readFileSync(resolve(__dirname, "../../i18n/locales/zh-CN.ts"), "utf-8");
  const enSource = readFileSync(resolve(__dirname, "../../i18n/locales/en-US.ts"), "utf-8");

  const unreadBranch = pageSource.slice(
    pageSource.indexOf("if (tapIndex === 1) {"),
    pageSource.indexOf("if (tapIndex === 2) {")
  );

  it("长按菜单保留「标为未读」能力", () => {
    expect(pageSource).toContain('"标为未读"');
  });

  it("tapIndex===1 调用 markSessionUnread 后有 toast 回执，且文案为本地生效口径", () => {
    expect(unreadBranch).toContain("messagesStore.markSessionUnread(session.id)");
    expect(unreadBranch).toContain('uni.showToast({ title: t("messages.unreadLocalHint")');
  });

  it("unreadLocalHint 中英成对存在", () => {
    expect(zhSource).toContain('"unreadLocalHint": "已标为未读（仅本机生效，离开页面后会还原）"');
    expect(enSource).toContain(
      'unreadLocalHint: "Marked unread (local only; reverts once you leave this page)"'
    );
  });
});
