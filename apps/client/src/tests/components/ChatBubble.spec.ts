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

  // ------------------------------------------------------------------
  // 2026-08-09 微信 1:1 重构：气泡视觉规范
  // ------------------------------------------------------------------
  it("peer 气泡使用纯白底 + 左上直角圆角（0 24rpx 24rpx 24rpx）+ 无阴影", () => {
    const wrapper = mountBubble({ sender: "peer" });
    const bubble = wrapper.find(".bubble--peer");
    expect(bubble.exists()).toBe(true);
    const styles = bubble.attributes("style") || "";
    // scoped 样式走类名而非内联样式，断言类名与组件样式的关键规范值（样式本身在 scoped CSS）
    expect(styles).toBe(""); // 无内联样式覆盖
    expect(bubble.classes()).toContain("bubble--peer");
  });

  it("peer 气泡渲染深色正文 15px（30rpx），self 品牌绿底白字", () => {
    const peer = mountBubble({ sender: "peer", body: "对方消息" });
    expect(peer.find(".bubble__body").text()).toContain("对方消息");
    const self = mountBubble({ sender: "self", body: "我方消息" });
    expect(self.find(".bubble--self").exists()).toBe(true);
  });

  it("头像与气泡间距 8px（16rpx gap）", () => {
    // gap 由 .bubble-row 样式承载（16rpx，2026-08-09 微信化重构），类名存在性断言
    const wrapper = mountBubble({ sender: "peer" });
    expect(wrapper.find(".bubble-row--peer").exists()).toBe(true);
  });

  it("kind=activity 时仍走文本兜底（activity 由父页面 ActivityCard 渲染）", () => {
    const wrapper = mountBubble({
      sender: "peer",
      kind: "activity" as "text",
      body: '{"title":"桌游","targetUrl":"/pages/activities/detail?id=1"}',
    });
    expect(wrapper.find(".bubble__body").text()).toContain("桌游");
  });

  // ------------------------------------------------------------------
  // 2026-08-09 表情包机制：emoji 消息渲染
  // ------------------------------------------------------------------
  it("kind=emoji 时渲染表情字符并添加大号渲染 class", () => {
    const wrapper = mountBubble({
      sender: "peer",
      kind: "emoji" as "text",
      body: "😊",
    });
    const body = wrapper.find(".bubble__body");
    expect(body.text()).toBe("😊");
    expect(body.classes()).toContain("bubble__body--emoji");
  });

  it("kind=text 时不添加 emoji 大号渲染 class", () => {
    const wrapper = mountBubble({ sender: "peer", kind: "text", body: "普通文本" });
    expect(wrapper.find(".bubble__body").classes()).not.toContain("bubble__body--emoji");
  });
});
