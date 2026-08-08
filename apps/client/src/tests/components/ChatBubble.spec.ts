import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

// mock resolveMediaUrl
vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (url: string) => url ?? "",
}));

import ChatBubble from "../../components/chat/ChatBubble.vue";

describe("ChatBubble component - 聊天气泡组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountBubble(props?: {
    sender?: "self" | "peer" | "system";
    kind?: "text" | "voice" | "emoji" | "system";
    body?: string;
    sentAt?: string;
    durationSeconds?: number | null;
    recalled?: boolean;
    deliveryStatus?: "sent" | "delivered" | "read";
    quoteRef?: string | null;
    quoteBody?: string | null;
    quoteSender?: string | null;
    canInteract?: boolean;
    peerAvatar?: string;
    selfAvatar?: string;
  }) {
    return mount(ChatBubble, {
      props: {
        sender: "self",
        kind: "text",
        body: "你好",
        sentAt: "2026-07-26T10:00:00",
        ...props,
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          image: { template: '<img class="mock-image" />', name: "uni-image" },
          VoicePill: { template: '<div class="mock-voice-pill" />', name: "voice-pill" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("渲染 chat-bubble 容器", () => {
    const wrapper = mountBubble();
    expect(wrapper.find(".bubble-wrap").exists()).toBe(true);
  });

  it("kind=text 时渲染文本内容", () => {
    const wrapper = mountBubble({ kind: "text", body: "你好啊" });
    expect(wrapper.find(".bubble__body").exists()).toBe(true);
    expect(wrapper.find(".bubble__body").text()).toContain("你好啊");
  });

  it("sender=self 时添加 bubble-wrap--self class", () => {
    const wrapper = mountBubble({ sender: "self" });
    expect(wrapper.find(".bubble-wrap").classes()).toContain("bubble-wrap--self");
  });

  it("sender=peer 时添加 bubble-wrap--peer class", () => {
    const wrapper = mountBubble({ sender: "peer" });
    expect(wrapper.find(".bubble-wrap").classes()).toContain("bubble-wrap--peer");
  });

  it("sender=system 时添加 bubble-wrap--system class", () => {
    const wrapper = mountBubble({ sender: "system", kind: "system", body: "系统消息" });
    expect(wrapper.find(".bubble-wrap").classes()).toContain("bubble-wrap--system");
  });

  // ------------------------------------------------------------------
  // 撤回状态
  // ------------------------------------------------------------------
  it("recalled=true 时不渲染正常气泡内容", () => {
    const wrapper = mountBubble({ recalled: true });
    // 撤回时仅渲染 .bubble--recalled，正常气泡行 .bubble-row 不应存在
    expect(wrapper.find(".bubble-row").exists()).toBe(false);
  });

  it("recalled=true 时渲染撤回提示文案", () => {
    const wrapper = mountBubble({ recalled: true });
    expect(wrapper.find(".bubble__body--recalled").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 引用消息
  // ------------------------------------------------------------------
  it("提供 quoteRef 时渲染引用区域", () => {
    const wrapper = mountBubble({
      quoteRef: "msg-1",
      quoteBody: "原消息内容",
      quoteSender: "peer",
    });
    expect(wrapper.find(".bubble__quote").exists()).toBe(true);
  });

  it("未提供 quoteRef 时不渲染引用区域", () => {
    const wrapper = mountBubble({ quoteRef: null });
    expect(wrapper.find(".bubble__quote").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 2026-08-08 微信化重构：头像与时间
  // ------------------------------------------------------------------
  it("sender=peer 时渲染对方头像", () => {
    const wrapper = mountBubble({ sender: "peer" });
    expect(wrapper.find(".bubble-avatar--peer").exists()).toBe(true);
  });

  it("sender=self 时不渲染自己头像（微信惯例：自己消息无头像）", () => {
    const wrapper = mountBubble({ sender: "self" });
    expect(wrapper.find(".bubble-avatar").exists()).toBe(false);
  });

  it("气泡内不再渲染时间（时间由父页面微信式时间条承载）", () => {
    const wrapper = mountBubble({ sentAt: "2026-07-26T10:00:00" });
    expect(wrapper.find(".bubble__meta").exists()).toBe(false);
  });

  it("self 消息送达状态渲染 SVG 勾（sent 单勾）", () => {
    const wrapper = mountBubble({ sender: "self", deliveryStatus: "sent" });
    expect(wrapper.findAll(".bubble__status-icon").length).toBe(1);
  });

  it("self 消息已读状态渲染双勾 SVG", () => {
    const wrapper = mountBubble({ sender: "self", deliveryStatus: "read" });
    expect(wrapper.findAll(".bubble__status-icon").length).toBe(2);
  });
});
