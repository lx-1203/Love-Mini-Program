import { describe, expect, it } from "vitest";

import { mapToDiscoverCard } from "../../stores/discover/utils";
import type { RecommendedPerson } from "../../services/generated/api-types-supplement";

/**
 * mapToDiscoverCard 新字段透传测试（Phase Feedback1：寻觅页改版字段）。
 *
 * 覆盖：displayId / distanceText / activeStatusText / machineVerified /
 * humanVerified / personality / mbti / whisper / whisperSent / recentPosts /
 * expectedPartner / allowMessage 的透传逻辑。
 */
describe("mapToDiscoverCard (Phase Feedback1 字段透传)", () => {
  it("透传寻觅页改版新增字段", () => {
    const raw: RecommendedPerson = {
      userId: "u-1",
      name: "测试用户",
      avatarUrl: "https://example.com/avatar.png",
      headline: "22岁 · 南京",
      displayId: "CL-4001",
      distanceText: "1.2",
      activeStatusText: "just_now",
      machineVerified: true,
      humanVerified: true,
      personality: ["温柔体贴", "文艺安静"],
      mbti: "INFJ",
      whisper: "你相信一见钟情吗？",
      whisperSent: false,
      expectedPartner: "喜欢猫、愿意一起逛展",
      allowMessage: false,
      // 2026-08-08：卡片完整字段（后端真实数据）
      occupation: "产品经理",
      incomeRange: "15k-30k",
      age: 23,
      registeredAt: "2026-03-12T08:00:00Z",
      recentPosts: [
        {
          id: "p1",
          content: "图书馆的橘猫今天又蹭了我一下午",
          likes: 32,
          comments: 8,
          isLiked: false,
          createdAt: "2026-07-20T10:00:00Z",
        },
      ],
    };

    const card = mapToDiscoverCard(raw);

    expect(card.displayId).toBe("CL-4001");
    expect(card.distanceText).toBe("1.2");
    expect(card.activeStatusText).toBe("just_now");
    expect(card.machineVerified).toBe(true);
    expect(card.humanVerified).toBe(true);
    expect(card.personality).toEqual(["温柔体贴", "文艺安静"]);
    expect(card.mbti).toBe("INFJ");
    expect(card.whisper).toBe("你相信一见钟情吗？");
    expect(card.whisperSent).toBe(false);
    expect(card.expectedPartner).toBe("喜欢猫、愿意一起逛展");
    expect(card.allowMessage).toBe(false);
    expect(card.recentPosts).toHaveLength(1);
    expect(card.recentPosts?.[0]?.likes).toBe(32);
    // 2026-08-08 新字段透传
    expect(card.occupation).toBe("产品经理");
    expect(card.incomeRange).toBe("15k-30k");
    expect(card.age).toBe(23);
    expect(card.registeredAt).toBe("2026-03-12T08:00:00Z");
  });

  it("缺省字段透传为 undefined（不产生假数据）", () => {
    const raw: RecommendedPerson = {
      userId: "u-2",
      name: "无扩展字段用户",
      avatarUrl: "",
      headline: "",
    };

    const card = mapToDiscoverCard(raw);

    expect(card.displayId).toBeUndefined();
    expect(card.distanceText).toBeUndefined();
    expect(card.activeStatusText).toBeUndefined();
    expect(card.machineVerified).toBeUndefined();
    expect(card.humanVerified).toBeUndefined();
    expect(card.personality).toBeUndefined();
    expect(card.mbti).toBeUndefined();
    expect(card.whisper).toBeUndefined();
    expect(card.recentPosts).toBeUndefined();
    expect(card.expectedPartner).toBeUndefined();
    expect(card.occupation).toBeUndefined();
    expect(card.incomeRange).toBeUndefined();
    expect(card.age).toBeUndefined();
  });
});
