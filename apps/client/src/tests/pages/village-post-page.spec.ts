import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive } from "vue";
import { i18n } from "../../i18n";
import VillagePostPage from "../../subpackages/village/village/post.vue";

/**
 * MP-R2-POST-013：发布目标解析失败（isCircleTarget 且 targetCircle 为 null，
 * 例：恢复草稿时圈子已退出）时，「发布到」副标题须与标题兜底（兴趣圈帖子）、
 * 圈子标签（village.post.visibilityCircleMembers）同语义，不得回落到
 * 「默认公开 · 所有人可见」。
 */

vi.mock("@dcloudio/uni-app", () => ({
  onLoad: vi.fn(),
  onUnload: vi.fn(),
}));

vi.mock("../../stores/circle", () => ({
  useCircleStore: vi.fn(() =>
    reactive({
      circles: [] as unknown[],
      joinedCircles: [] as unknown[],
      errorMessage: null as string | null,
      fetchCircles: vi.fn(() => Promise.resolve()),
      createTopic: vi.fn(),
    })
  ),
}));

vi.mock("../../stores/village", () => ({
  useVillageStore: vi.fn(() =>
    reactive({
      errorMessage: null as string | null,
      createPost: vi.fn(),
      dispose: vi.fn(),
    })
  ),
}));

vi.mock("../../services/api", () => ({
  clientApi: {
    uploadPostImage: vi.fn(),
    deleteDraft: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../../utils/media", () => ({
  isUploadedMediaUrl: vi.fn(() => false),
  chooseImages: vi.fn(() => Promise.resolve([])),
  resolveMediaUrl: (v: string) => v,
}));

vi.mock("../../utils/compress-image", () => ({
  compressImages: vi.fn((v: unknown[]) => Promise.resolve(v)),
}));

vi.mock("../../utils/privacy", () => ({
  ensurePrivacyAuthorized: vi.fn(() => Promise.resolve(true)),
}));

function mountPost() {
  return mount(VillagePostPage, {
    global: { plugins: [i18n], stubs: { scrollview: true } },
  });
}

describe("village/post 发布到兜底（MP-R2-POST-013）", () => {
  it("圈子目标未解析：副标题走圈子成员可见兜底，与标题/标签同语义", async () => {
    const wrapper = mountPost();
    const vm = wrapper.vm as unknown as { targetType: string; targetCircle: unknown };
    vm.targetType = "circle";
    vm.targetCircle = null;
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".post-to__name").text()).toBe("兴趣圈帖子");
    expect(wrapper.find(".post-to__subtitle").text()).toBe(
      i18n.global.t("village.post.visibilityCircleMembers")
    );
    expect(wrapper.find(".post-to__subtitle").text()).not.toContain("所有人可见");
  });

  it("圈子目标已解析：副标题为成员数短格式，标题为圈名", async () => {
    const wrapper = mountPost();
    const vm = wrapper.vm as unknown as {
      targetType: string;
      targetCircle: unknown;
      targetId: number | null;
    };
    vm.targetType = "circle";
    vm.targetId = 1;
    vm.targetCircle = { id: "1", name: "摄影圈", memberCount: 12345, isJoined: true };
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".post-to__name").text()).toBe("摄影圈");
    expect(wrapper.find(".post-to__subtitle").text()).toBe("1.2w 成员");
  });

  it("个人动态目标：副标题保持默认公开文案", async () => {
    const wrapper = mountPost();
    const vm = wrapper.vm as unknown as { targetType: string; targetCircle: unknown };
    vm.targetType = "general";
    vm.targetCircle = null;
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".post-to__name").text()).toBe("个人动态");
    expect(wrapper.find(".post-to__subtitle").text()).toBe("默认公开 · 所有人可见");
  });
});
