import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import UnlockGuideModal from "../../components/UnlockGuideModal.vue";

describe("UnlockGuideModal component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/button）以便在 jsdom 中渲染
   * 注意：仅在显式传入 featureName 时才传给组件，否则触发组件内 fallback「此功能」
   */
  function mountModal(props?: {
    visible?: boolean;
    pageTitle?: string;
    featureName?: string;
    completionPercent?: number;
  }) {
    // 仅在显式传入 featureName 时才传给组件，否则触发组件内 fallback「此功能」
    const vueProps: {
      visible: boolean;
      completionPercent: number;
      featureName?: string;
    } = {
      visible: props?.visible ?? true,
      completionPercent: props?.completionPercent ?? 50,
    };
    if (props?.featureName !== undefined) {
      vueProps.featureName = props.featureName;
    }
    return mount(UnlockGuideModal, {
      props: vueProps,
      global: {
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          button: {
            // stub：点击时 emit "tap" 事件，模拟 uni-app button @tap 行为
            template: '<button class="mock-button" @click="$emit(\'tap\')"><slot /></button>',
            name: "uni-button",
            emits: ["tap"],
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：弹窗显示正确文案
  // ------------------------------------------------------------------
  it("renders the unlock message with the correct feature name", () => {
    const wrapper = mountModal({ featureName: "喜欢列表" });
    const message = wrapper.find(".unlock-modal__message");
    expect(message.text()).toContain("完成资料完善即可解锁");
    expect(message.text()).toContain("喜欢列表");
  });

  it("renders default feature name when not provided", () => {
    // 不传 featureName，组件应 fallback 到「此功能」
    const wrapper = mountModal();
    const message = wrapper.find(".unlock-modal__message");
    expect(message.text()).toContain("此功能");
  });

  it("shows completion percent in subtitle when 0 < percent < 100", () => {
    const wrapper = mountModal({ completionPercent: 50 });
    const subtitle = wrapper.find(".unlock-modal__subtitle");
    expect(subtitle.text()).toContain("50%");
  });

  it("shows default subtitle when completionPercent is 0", () => {
    const wrapper = mountModal({ completionPercent: 0 });
    const subtitle = wrapper.find(".unlock-modal__subtitle");
    expect(subtitle.text()).toContain("完善资料，开启更多校园恋爱功能");
  });

  it("shows default subtitle when completionPercent is 100", () => {
    const wrapper = mountModal({ completionPercent: 100 });
    const subtitle = wrapper.find(".unlock-modal__subtitle");
    expect(subtitle.text()).toContain("完善资料，开启更多校园恋爱功能");
  });

  // ------------------------------------------------------------------
  // 显示/隐藏
  // ------------------------------------------------------------------
  it("renders modal when visible is true", () => {
    const wrapper = mountModal({ visible: true });
    expect(wrapper.find(".unlock-modal").exists()).toBe(true);
  });

  it("does not render modal when visible is false", () => {
    const wrapper = mountModal({ visible: false });
    expect(wrapper.find(".unlock-modal").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 按钮交互：点击「去完善资料」触发 confirm 事件
  // ------------------------------------------------------------------
  it("emits confirm event when primary button is clicked", async () => {
    const wrapper = mountModal({ visible: true });
    const primaryBtn = wrapper.find(".unlock-modal__btn--primary");
    await primaryBtn.trigger("tap");
    expect(wrapper.emitted("confirm")).toBeTruthy();
    expect(wrapper.emitted("confirm")?.length).toBe(1);
  });

  // ------------------------------------------------------------------
  // 按钮交互：点击「暂不完善」触发 cancel 事件
  // ------------------------------------------------------------------
  it("emits cancel event when secondary button is clicked", async () => {
    const wrapper = mountModal({ visible: true });
    const secondaryBtn = wrapper.find(".unlock-modal__btn--secondary");
    await secondaryBtn.trigger("tap");
    expect(wrapper.emitted("cancel")).toBeTruthy();
    expect(wrapper.emitted("cancel")?.length).toBe(1);
  });

  // ------------------------------------------------------------------
  // 按钮交互：点击「暂不完善」同步触发 update:visible(false) 支持 v-model
  // ------------------------------------------------------------------
  it("emits update:visible(false) when secondary button is clicked", async () => {
    const wrapper = mountModal({ visible: true });
    const secondaryBtn = wrapper.find(".unlock-modal__btn--secondary");
    await secondaryBtn.trigger("tap");
    expect(wrapper.emitted("update:visible")).toBeTruthy();
    expect(wrapper.emitted("update:visible")?.[0]).toEqual([false]);
  });

  // ------------------------------------------------------------------
  // 不同功能名称展示不同文案
  // ------------------------------------------------------------------
  it("shows different copy for different feature names", () => {
    const likesWrapper = mountModal({ featureName: "喜欢列表" });
    expect(likesWrapper.find(".unlock-modal__message").text()).toContain("喜欢列表");

    const villageWrapper = mountModal({ featureName: "村口/讨论圈" });
    expect(villageWrapper.find(".unlock-modal__message").text()).toContain("村口/讨论圈");

    const messagesWrapper = mountModal({ featureName: "消息" });
    expect(messagesWrapper.find(".unlock-modal__message").text()).toContain("消息");
  });

  // ------------------------------------------------------------------
  // 按钮文案渲染
  // ------------------------------------------------------------------
  it("renders the correct button text", () => {
    const wrapper = mountModal({ visible: true });
    const primaryText = wrapper.find(".unlock-modal__btn--primary .unlock-modal__btn-text").text();
    expect(primaryText).toBe("去完善资料");

    const secondaryText = wrapper.find(".unlock-modal__btn--secondary .unlock-modal__btn-text").text();
    expect(secondaryText).toBe("暂不完善");
  });
});
