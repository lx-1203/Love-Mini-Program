import { describe, expect, it } from "vitest";
import { mockFixtures } from "../services/mocks/fixtures";
import { toHomeViewModel } from "../view-models/home-dashboard";

describe("首页 homeFeed 契约", () => {
  it("mock 首页必须永远有今日推荐", () => {
    const feed = mockFixtures.getHomeDashboard().homeFeed;
    expect(feed.todayRecommendation).toBeTruthy();
    expect(feed.todayRecommendation?.photoUrl).toBeTruthy();
  });

  it("首页模块数量与设计稿一致", () => {
    const vm = toHomeViewModel(mockFixtures.getHomeDashboard().homeFeed);
    expect(vm.loveProgress.total).toBe(4);
    expect(vm.loveProgress.steps.length).toBe(4);
    expect(vm.interestRecommendations.length).toBeGreaterThanOrEqual(4);
    expect(vm.nearbyPeople.length).toBeGreaterThanOrEqual(5);
    expect(vm.communityPosts.length).toBeGreaterThanOrEqual(1);
    expect(vm.relationActivity.totalUnread).toBeGreaterThan(0);
  });
});
