import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

// mock resolveMediaUrl
vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (url: string) => url ?? "",
}));

import ChatItem from "../../components/chat/ChatItem.vue";

describe("ChatItem component - 会话列表项组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountItem(props?: {
    id?: string;
    avatarUrl?: string;
    initials?: string;
    name?: string;
    lastMessage?: string;
    time?: string;
    unread?: number;
    online?: boolean;
    isOfficial?: boolean;
    isMatch?: boolean;
  }) {
    return mount(ChatItem, {
      props: {
        name: "小明",
        lastMessage: "你好",
        time: "10:00",
        ...props,
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          image: { template: '<img class="mock-image" />', name: "uni-image" },
          Avatar: { template: '<div class="mock-avatar" />', name: "avatar" },
          UnreadBadge: { template: '<div class="mock-unread-badge" />', name: "unread-badge" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("渲染 chat-item 容器", () => {
    const wrapper = mountItem();
    expect(wrapper.find(".chat-item").exists()).toBe(true);
  });

  it("渲染 name 文本", () => {
    const wrapper = mountItem({ name: "小红" });
    expect(wrapper.find(".chat-item-name").text()).toContain("小红");
  });

  it("渲染 lastMessage 文本", () => {
    const wrapper = mountItem({ lastMessage: "明天见" });
    expect(wrapper.find(".chat-item-msg").text()).toBe("明天见");
  });

  it("渲染 time 文本", () => {
    const wrapper = mountItem({ time: "12:34" });
    expect(wrapper.find(".chat-item-time").text()).toBe("12:34");
  });

  // ------------------------------------------------------------------
  // 未读徽章
  // ------------------------------------------------------------------
  it("unread=0 时不渲染 UnreadBadge", () => {
    const wrapper = mountItem({ unread: 0 });
    expect(wrapper.find(".mock-unread-badge").exists()).toBe(false);
  });

  it("unread>0 时渲染 UnreadBadge", () => {
    const wrapper = mountItem({ unread: 3 });
    expect(wrapper.find(".mock-unread-badge").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 匹配标识
  // ------------------------------------------------------------------
  it("isMatch=true 时渲染匹配徽章", () => {
    const wrapper = mountItem({ isMatch: true });
    expect(wrapper.find(".chat-item-match").exists()).toBe(true);
  });

  it("isMatch=false 时不渲染匹配徽章", () => {
    const wrapper = mountItem({ isMatch: false });
    expect(wrapper.find(".chat-item-match").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击 chat-item 触发 tap 事件", async () => {
    const wrapper = mountItem();
    await wrapper.find(".chat-item").trigger("tap");
    expect(wrapper.emitted("tap")).toBeTruthy();
    expect(wrapper.emitted("tap")!.length).toBe(1);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("容器 role=button", () => {
    const wrapper = mountItem();
    expect(wrapper.find(".chat-item").attributes("role")).toBe("button");
  });
});
