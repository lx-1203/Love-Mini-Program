import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
const showToast = vi.fn();
(globalThis as any).uni = { showToast };

// mock createAudioPlayer 以避免依赖 uni.createInnerAudioContext
const mockPlay = vi.fn();
vi.mock("../../utils/audio-recorder", () => ({
  createAudioPlayer: () => ({
    play: mockPlay,
    stop: vi.fn(),
    destroy: vi.fn(),
  }),
}));

import VoiceMessageBubble from "../../components/chat/VoiceMessageBubble.vue";

describe("VoiceMessageBubble component - 语音消息气泡组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountBubble(props?: {
    audioUrl?: string;
    durationSeconds?: number;
    expired?: boolean;
    sender?: "self" | "peer";
  }) {
    return mount(VoiceMessageBubble, {
      props: {
        audioUrl: "https://cdn.example.com/voice.amr",
        durationSeconds: 10,
        expired: false,
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
  it("渲染 voice-bubble 容器", () => {
    const wrapper = mountBubble();
    expect(wrapper.find(".voice-bubble").exists()).toBe(true);
  });

  it("渲染语音时长（带 ″ 符号）", () => {
    const wrapper = mountBubble({ durationSeconds: 25 });
    expect(wrapper.find(".voice-bubble__duration").text()).toContain("25");
    expect(wrapper.find(".voice-bubble__duration").text()).toContain("″");
  });

  // ------------------------------------------------------------------
  // 发送方样式
  // ------------------------------------------------------------------
  it("sender=self 添加 voice-bubble--self class", () => {
    const wrapper = mountBubble({ sender: "self" });
    expect(wrapper.find(".voice-bubble").classes()).toContain("voice-bubble--self");
  });

  it("sender=peer 添加 voice-bubble--peer class", () => {
    const wrapper = mountBubble({ sender: "peer" });
    expect(wrapper.find(".voice-bubble").classes()).toContain("voice-bubble--peer");
  });

  // ------------------------------------------------------------------
  // 过期状态
  // ------------------------------------------------------------------
  it("expired=true 时添加 voice-bubble--expired class", () => {
    const wrapper = mountBubble({ expired: true });
    expect(wrapper.find(".voice-bubble").classes()).toContain("voice-bubble--expired");
  });

  it("expired=true 时显示暂停图标", () => {
    const wrapper = mountBubble({ expired: true });
    expect(wrapper.find(".voice-bubble__icon-emoji").text()).toBe("⏸");
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击未过期语音调用 player.play", async () => {
    mockPlay.mockImplementation((_url: string, _cb: (playing: boolean) => void) => {
      _cb(true);
    });
    const wrapper = mountBubble({
      audioUrl: "https://cdn.example.com/voice.amr",
      expired: false,
    });
    await wrapper.find(".voice-bubble").trigger("tap");
    expect(mockPlay).toHaveBeenCalled();
  });

  it("点击过期语音 toast 提示不调用 player.play", async () => {
    const wrapper = mountBubble({ expired: true });
    await wrapper.find(".voice-bubble").trigger("tap");
    expect(mockPlay).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });

  it("audioUrl 为空且未过期时点击切换 UI 模拟播放", async () => {
    const wrapper = mountBubble({ audioUrl: "", expired: false });
    await wrapper.find(".voice-bubble").trigger("tap");
    // 切换到播放态
    expect(wrapper.find(".voice-bubble").classes()).toContain("voice-bubble--playing");
  });

  // ------------------------------------------------------------------
  // 宽度自适应
  // ------------------------------------------------------------------
  it("短时长语音 minWidth 较小", () => {
    const wrapper = mountBubble({ durationSeconds: 3 });
    const style = wrapper.find(".voice-bubble").attributes("style") || "";
    // 基础 120 + 3*12 = 156rpx
    expect(style).toContain("156");
  });

  it("长时长语音 minWidth 受限（上限 480rpx）", () => {
    const wrapper = mountBubble({ durationSeconds: 60 });
    const style = wrapper.find(".voice-bubble").attributes("style") || "";
    expect(style).toContain("480");
  });

  // ------------------------------------------------------------------
  // 播放图标切换
  // ------------------------------------------------------------------
  it("未播放且未过期时显示静音图标", () => {
    const wrapper = mountBubble({ expired: false, audioUrl: "https://cdn.example.com/a.amr" });
    expect(wrapper.find(".voice-bubble__icon-emoji").text()).toBe("🔈");
  });

  it("audioUrl 为空时显示暂停图标", () => {
    const wrapper = mountBubble({ audioUrl: "" });
    expect(wrapper.find(".voice-bubble__icon-emoji").text()).toBe("⏸");
  });
});
