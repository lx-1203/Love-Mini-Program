import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import LockScreen from "../../components/common/LockScreen.vue";

// mock navigation utility – factory must be inline for hoisting
vi.mock("../../utils/navigation", () => ({
  openAppPath: vi.fn(),
}));

import { openAppPath } from "../../utils/navigation";

describe("LockScreen component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // mount helper with uni-app element stubs
  function mountLockScreen(props?: {
    pageName?: string;
    completionPercent?: number;
  }) {
    return mount(LockScreen, {
      props: props ?? {},
      global: {
        stubs: {
          view: {
            template: '<div class="mock-view"><slot /></div>',
            name: "uni-view",
          },
          text: {
            template: '<span class="mock-text"><slot /></span>',
            name: "uni-text",
          },
          button: {
            template:
              '<button class="mock-button" @click="$emit(\'tap\')"><slot /></button>',
            name: "uni-button",
            emits: ["tap"],
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染锁定页面显示正确的页面名称
  // ------------------------------------------------------------------
  it("renders the lock message with the correct page name", () => {
    const wrapper = mountLockScreen({ pageName: "喜欢" });

    const title = wrapper.find(".lock-screen__title");
    expect(title.text()).toContain("喜欢");
    expect(title.text()).toContain("完善资料后才能解锁");
  });

  it("renders default page name when not provided", () => {
    const wrapper = mountLockScreen();

    const title = wrapper.find(".lock-screen__title");
    expect(title.text()).toContain("此功能");
  });

  // ------------------------------------------------------------------
  // 不同页面显示不同文案
  // ------------------------------------------------------------------
  it("shows different copy for different pages", () => {
    const likesWrapper = mountLockScreen({ pageName: "喜欢" });
    expect(likesWrapper.find(".lock-screen__title").text()).toContain("喜欢");

    const villageWrapper = mountLockScreen({ pageName: "村口" });
    expect(villageWrapper.find(".lock-screen__title").text()).toContain("村口");

    const messagesWrapper = mountLockScreen({ pageName: "消息" });
    expect(messagesWrapper.find(".lock-screen__title").text()).toContain("消息");
  });

  // ------------------------------------------------------------------
  // 点击"立即完善"按钮触发跳转
  // ------------------------------------------------------------------
  it("calls openAppPath when the action button is clicked", async () => {
    const wrapper = mountLockScreen();

    const btn = wrapper.find(".lock-screen__btn");
    await btn.trigger("tap");

    expect(openAppPath).toHaveBeenCalledWith(
      "/subpackages/setup/profile/index"
    );
  });

  // ------------------------------------------------------------------
  // 副标题文案
  // ------------------------------------------------------------------
  it("shows completion percent in subtitle when provided", () => {
    const wrapper = mountLockScreen({ completionPercent: 66 });

    const subtitle = wrapper.find(".lock-screen__subtitle");
    expect(subtitle.text()).toContain("66%");
  });

  it("shows default subtitle when completionPercent is zero or undefined", () => {
    const wrapper = mountLockScreen({ completionPercent: 0 });

    const subtitle = wrapper.find(".lock-screen__subtitle");
    expect(subtitle.text()).toContain("完善资料，开启更多校园恋爱功能");
  });

  it("shows default subtitle when completionPercent is not provided", () => {
    const wrapper = mountLockScreen();

    const subtitle = wrapper.find(".lock-screen__subtitle");
    expect(subtitle.text()).toContain("完善资料，开启更多校园恋爱功能");
  });

  // ------------------------------------------------------------------
  // 底部提示渲染
  // ------------------------------------------------------------------
  it("renders the footer tip text", () => {
    const wrapper = mountLockScreen();

    const footer = wrapper.find(".lock-screen__footer-text");
    expect(footer.text()).toBe("资料越完善，匹配越精准");
  });
});