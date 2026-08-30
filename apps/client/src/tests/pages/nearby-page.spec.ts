import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pagesJson from "../../pages.json";
import { i18n } from "../../i18n";

/**
 * Nearby（v3 冻结）页面 smoke：
 * - 附近 Tab 已注册
 * - 附近首页 = 分区聚合（人 → 兴趣圈 → 校园圈 → 活动 → 附近动态），无 CardSwiper、无「开始匹配」
 * - 附近的人/同城的人 = 单页双态列表，整行进入他人主页
 * - 兴趣圈详情 = 四 Tab + 认识 TA
 * - 校园圈 Hub = 四态权限
 * - 认识 TA 统一走他人主页（不直接 like/建聊天）
 */
describe("Nearby v3 页面 smoke", () => {
  const nearbySource = readFileSync(
    resolve(__dirname, "../../pages/nearby/index.vue"),
    "utf-8"
  );
  const peopleSource = readFileSync(
    resolve(__dirname, "../../subpackages/discover-extra/nearby/people.vue"),
    "utf-8"
  );
  const topicsSource = readFileSync(
    resolve(__dirname, "../../subpackages/circles/circles/topics.vue"),
    "utf-8"
  );
  const campusHubSource = readFileSync(
    resolve(__dirname, "../../subpackages/campus/campus/hub.vue"),
    "utf-8"
  );

  it("附近页已注册为 Tab", () => {
    const tab = pagesJson.tabBar.list.find((item) => item.pagePath === "pages/nearby/index");
    expect(tab).toBeTruthy();
    expect(tab?.text).toBe("附近");
    expect(pagesJson.tabBar.list.map((item) => item.pagePath)).toContain("pages/nearby/index");
  });

  it("附近首页为分区聚合：人 → 兴趣圈 → 校园圈 → 活动 → 动态", () => {
    expect(nearbySource).toContain("nearby-home");
    expect(nearbySource).toContain("NearbySection");
    expect(nearbySource).toContain("people-entry");
    expect(nearbySource).toContain("circle-mini");
    expect(nearbySource).toContain("campus-entry");
    expect(nearbySource).toContain("nearby-post-item");
    expect(nearbySource).toContain("useTabBar(1)");
    // 冻结红线：Nearby 不出现 CardSwiper / 开始匹配
    expect(nearbySource).not.toContain("CardSwiper");
    expect(nearbySource).not.toContain("开始匹配");
  });

  it("附近的人/同城的人 = 单页双态列表，无 CardSwiper、无操作按钮", () => {
    expect(peopleSource).toContain("scope");
    expect(peopleSource).toContain("people-row");
    expect(peopleSource).toContain("openUserProfile");
    expect(peopleSource).not.toContain("CardSwiper");
    expect(peopleSource).not.toContain("MatchActionButton");
  });

  it("兴趣圈详情包含 动态/精选/成员/活动 四 Tab 与认识 TA", () => {
    expect(topicsSource).toContain("detailTab");
    expect(topicsSource).toContain("circle-tabs");
    expect(topicsSource).toContain("detailMembers");
    expect(topicsSource).toContain("detailActivities");
    expect(topicsSource).toContain("meetAuthor");
  });

  it("校园圈 Hub 包含四态权限文案", () => {
    expect(campusHubSource).toContain("campus-hub");
    expect(campusHubSource).toContain("statusVerified");
    expect(campusHubSource).toContain("statusPending");
    expect(campusHubSource).toContain("statusPublic");
  });

  it("认识 TA 统一进入他人主页（不直接 like/建聊天）", () => {
    const detailSource = readFileSync(
      resolve(__dirname, "../../subpackages/village/village/detail.vue"),
      "utf-8"
    );
    for (const src of [nearbySource, peopleSource, detailSource]) {
      expect(src).toContain("openUserProfile");
    }
    // 帖子/附近场景不得直接调用 likeUser 或打开 chat-session
    expect(nearbySource).not.toContain("likeUser(");
    expect(detailSource).not.toContain("likeUser(");
    expect(nearbySource).not.toContain("chat-session");
  });

  it("未登录时不发受保护请求（getToken 守卫 + LockScreen 登录引导）", () => {
    expect(nearbySource).toContain("getToken");
    expect(nearbySource).toContain("if (!getToken()) return");
    expect(nearbySource).toContain("LockScreen");
    expect(nearbySource).toContain("watch(");
  });

  it("附近 i18n 文案齐备", () => {
    for (const key of ["title", "homeSubtitle", "peopleNearby", "peopleCity", "hotCircles", "campusCircles", "nearbyPosts", "peopleEmpty", "viewAll"]) {
      expect(i18n.global.t(`nearby.${key}`).length).toBeGreaterThan(0);
    }
    for (const key of ["detailFeed", "detailHot", "detailMembersTab", "detailActivitiesTab", "meetAuthor"]) {
      expect(i18n.global.t(`circle.${key}`).length).toBeGreaterThan(0);
    }
  });
});
