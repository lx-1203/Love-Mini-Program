import { describe, expect, it } from "vitest";
import { i18n } from "../../i18n";
import { MATCH_HIGH_THRESHOLD } from "../../constants/match";

/**
 * 匹配卡片改版契约测试（2026-08-14）：
 * - 匹配度强调阈值常量
 * - 粉圈 / 悄悄话升级 i18n key 存在
 */
describe("匹配卡片改版契约（2026-08-14）", () => {
  it("MATCH_HIGH_THRESHOLD = 85", () => {
    expect(MATCH_HIGH_THRESHOLD).toBe(85);
  });

  it("粉圈文案 i18n key 存在", () => {
    const high = i18n.global.t("discover.matchHighLabel");
    const normal = i18n.global.t("discover.matchLabel");
    expect(high.length).toBeGreaterThan(0);
    expect(normal.length).toBeGreaterThan(0);
    expect(high).not.toBe(normal);
  });

  it("悄悄话升级文案 i18n key 存在", () => {
    const keys = [
      "discover.whisperGuideTitle",
      "discover.whisperGuideDesc",
      "discover.whisperListTitle",
      "discover.whisperReplyPlaceholder",
      "discover.whisperReplySend",
      "discover.whisperReplyHint",
    ];
    for (const key of keys) {
      expect(i18n.global.t(key).length).toBeGreaterThan(0);
    }
  });

  it("主页双 Tab 文案 i18n key 存在", () => {
    expect(i18n.global.t("profile.tabAbout").length).toBeGreaterThan(0);
    expect(i18n.global.t("profile.tabPosts").length).toBeGreaterThan(0);
  });
});
