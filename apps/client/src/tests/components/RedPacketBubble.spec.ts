import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {
  showToast: vi.fn(),
};

import RedPacketBubble from "../../components/chat/RedPacketBubble.vue";

describe("RedPacketBubble component - 红包消息气泡组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountBubble(props?: {
    redPacketId?: number;
    blessing?: string;
    status?: "PENDING" | "DEPLETED" | "EXPIRED" | "CLAIMED";
    sender?: "self" | "peer";
    totalAmount?: number;
    totalCount?: number;
    claimedCount?: number;
    claimedByMe?: boolean;
  }) {
    return mount(RedPacketBubble, {
      props: {
        redPacketId: 100,
        blessing: "祝你天天开心",
        status: "PENDING",
        sender: "peer",
        ...props,
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("渲染 rp-bubble 容器", () => {
    const wrapper = mountBubble();
    expect(wrapper.find(".rp-bubble").exists()).toBe(true);
  });

  it("渲染红包标题与祝福语", () => {
    const wrapper = mountBubble({ blessing: "新婚快乐" });
    expect(wrapper.find(".rp-bubble__blessing").text()).toBe("新婚快乐");
  });

  it("未传 blessing 时使用默认祝福文案", () => {
    const wrapper = mountBubble({ blessing: undefined });
    expect(wrapper.find(".rp-bubble__blessing").text().length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // 发送方样式
  // ------------------------------------------------------------------
  it("sender=self 添加 rp-bubble--self class", () => {
    const wrapper = mountBubble({ sender: "self" });
    expect(wrapper.find(".rp-bubble").classes()).toContain("rp-bubble--self");
  });

  it("sender=peer 添加 rp-bubble--peer class", () => {
    const wrapper = mountBubble({ sender: "peer" });
    expect(wrapper.find(".rp-bubble").classes()).toContain("rp-bubble--peer");
  });

  // ------------------------------------------------------------------
  // 状态样式
  // ------------------------------------------------------------------
  it("status=EXPIRED 添加 rp-bubble--expired class", () => {
    const wrapper = mountBubble({ status: "EXPIRED" });
    expect(wrapper.find(".rp-bubble").classes()).toContain("rp-bubble--expired");
  });

  it("status=DEPLETED 添加 rp-bubble--depleted class", () => {
    const wrapper = mountBubble({ status: "DEPLETED" });
    expect(wrapper.find(".rp-bubble").classes()).toContain("rp-bubble--depleted");
  });

  it("peer 红包 claimedByMe=true 添加 rp-bubble--claimed class", () => {
    const wrapper = mountBubble({ sender: "peer", claimedByMe: true });
    expect(wrapper.find(".rp-bubble").classes()).toContain("rp-bubble--claimed");
  });

  // ------------------------------------------------------------------
  // 点击交互：可领取状态触发 claim
  // ------------------------------------------------------------------
  it("peer 未领取且 PENDING 时点击触发 claim 事件", async () => {
    const wrapper = mountBubble({
      sender: "peer",
      claimedByMe: false,
      status: "PENDING",
      redPacketId: 42,
    });
    await wrapper.find(".rp-bubble").trigger("tap");
    expect(wrapper.emitted("claim")).toBeTruthy();
    expect(wrapper.emitted("claim")![0]).toEqual([42]);
  });

  it("self 红包点击触发 viewDetail 事件", async () => {
    const wrapper = mountBubble({
      sender: "self",
      status: "CLAIMED",
      redPacketId: 88,
    });
    await wrapper.find(".rp-bubble").trigger("tap");
    expect(wrapper.emitted("viewDetail")).toBeTruthy();
    expect(wrapper.emitted("viewDetail")![0]).toEqual([88]);
  });

  it("peer 已领取红包点击触发 viewDetail 事件", async () => {
    const wrapper = mountBubble({
      sender: "peer",
      claimedByMe: true,
      status: "CLAIMED",
      redPacketId: 7,
    });
    await wrapper.find(".rp-bubble").trigger("tap");
    expect(wrapper.emitted("viewDetail")).toBeTruthy();
    expect(wrapper.emitted("viewDetail")![0]).toEqual([7]);
  });

  it("过期红包点击不触发任何事件并 toast 提示", async () => {
    const wrapper = mountBubble({ status: "EXPIRED" });
    await wrapper.find(".rp-bubble").trigger("tap");
    expect(wrapper.emitted("claim")).toBeFalsy();
    expect(wrapper.emitted("viewDetail")).toBeFalsy();
    expect((globalThis as any).uni.showToast).toHaveBeenCalled();
  });
});
