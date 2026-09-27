import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildChatMessageRows } from "../../subpackages/chat/chat-session/view-models";

/**
 * 聊天详情页 smoke（2026-08-15 增补）：
 * - 在线状态改用 POST /users/online-status/batch（fetchOnlineStatusApi），
 *   不再请求已废弃的 GET /online-status（real 模式 404）
 * - createSelectorQuery().in() 判空，避免组件销毁后 .in(null) 读 $scope 抛错
 */
describe("ChatSession 页面 smoke", () => {
  const chatSource = readFileSync(
    resolve(__dirname, "../../subpackages/chat/chat-session/index.vue"),
    "utf-8"
  );

  it("在线状态走统一批量端点 fetchOnlineStatusApi", () => {
    expect(chatSource).toContain("fetchOnlineStatusApi");
    expect(chatSource).toContain("online-status/batch");
    // 仅断言请求代码（反引号 url 模板）已移除；注释中提及历史端点属文档说明
    expect(chatSource).not.toContain("url: `/online-status?userIds=");
  });

  it("createSelectorQuery().in() 判空防 $scope 空指针", () => {
    expect(chatSource).toContain("instance ? uni.createSelectorQuery().in(instance) : uni.createSelectorQuery()");
  });

  /**
   * 消息行模型（MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-001）：
   * 本地删除的消息必须先过滤再建行，否则被删消息那条时间条会孤立残留（后继行不是消息）。
   */
  describe("消息行模型：时间条不得孤立", () => {
    const messages = [
      { id: "m-1", sentAt: "2026-09-20T16:07:00" },
      { id: "m-2", sentAt: "2026-09-20T16:37:00" },
      { id: "m-3", sentAt: "2026-09-20T19:59:00" },
    ];
    const deleted = new Set(["m-2"]);

    it("删除位于两条时间条之间的消息后，每条时间条的后继仍是消息行", () => {
      const rows = buildChatMessageRows(messages.filter((m) => !deleted.has(m.id)));
      expect(rows.map((row) => row.type)).toEqual(["timebar", "message", "timebar", "message"]);
      rows.forEach((row, index) => {
        if (row.type === "timebar") {
          expect(rows[index + 1]?.type).toBe("message");
        }
      });
    });

    it("页面按 deletedMessageIds 过滤消息后再调 buildChatMessageRows（不得建行后滤行）", () => {
      expect(chatSource).toContain("deletedMessageIds.value.has(m.id)");
      expect(chatSource).not.toMatch(/buildChatMessageRows\(\s*currentMessagesView\.value\s*\)\.filter/);
    });
  });
});

/**
 * 空态与键盘态的样式分支（MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-007 / -A02）：
 * 前者要求空会话提示竖向落到滚动区中心，后者要求「零渲染差异的死分支」不得复活。
 */
describe("ChatSession 页面样式分支", () => {
  const source = readFileSync(
    resolve(__dirname, "../../subpackages/chat/chat-session/index.vue"),
    "utf-8"
  );
  /** 注释里提及历史类名属文档说明（与「在线状态」用例同一口径）；删除类断言只看可执行代码 */
  const codeOnly = source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("007：空态分支挂 chat-list--empty 并以 justify-content 竖向居中", () => {
    expect(source).toContain(`'chat-list--empty': !messagesStore.currentMessages.length`);
    expect(source).toMatch(/\.chat-list--empty\s*\{[^}]*justify-content:\s*center\s*;/);
  });

  it("A02：.wechat-input-bar--keyboard-up 死分支（绑定 + 样式）已删除", () => {
    expect(codeOnly).not.toContain("wechat-input-bar--keyboard-up");
  });

  it("A02：键盘态差异化仍由唯一有差异的外层 .chat-input-area--keyboard-up 承担", () => {
    expect(codeOnly).toContain(`'chat-input-area--keyboard-up': keyboardHeight > 0`);
    expect(codeOnly).toMatch(/^\.chat-input-area--keyboard-up\s*\{/m);
  });
});
