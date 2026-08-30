import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
});
