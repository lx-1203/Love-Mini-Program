import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

// mock resolveMediaUrl 以避免引入鉴权代理逻辑
vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (url: string) => url ?? "",
}));

import SafeImage from "../../components/common/SafeImage.vue";

describe("SafeImage component - 安全图片组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件
   */
  function mountImage(props?: {
    src?: string;
    fallback?: string;
    mode?: string;
    customClass?: string;
    lazyLoad?: boolean;
    alt?: string;
  }) {
    return mount(SafeImage, {
      props: props ?? {},
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          image: { template: '<img class="mock-image" />', name: "uni-image" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：默认 props
  // ------------------------------------------------------------------
  it("提供 src 时渲染 image 元素", () => {
    const wrapper = mountImage({ src: "https://cdn.example.com/a.png" });
    expect(wrapper.find(".safe-image").exists()).toBe(true);
    expect(wrapper.find(".safe-image__img").exists()).toBe(true);
  });

  it("未提供 src 时（空字符串）仍渲染 image 元素", () => {
    const wrapper = mountImage({ src: "" });
    expect(wrapper.find(".safe-image").exists()).toBe(true);
  });

  it("加载中显示骨架屏", () => {
    const wrapper = mountImage({ src: "https://cdn.example.com/a.png" });
    // 初始 isLoading=true，骨架屏应渲染
    expect(wrapper.find(".safe-image__skeleton").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("提供 alt 时 aria-label 包含该 alt", () => {
    const wrapper = mountImage({ src: "https://cdn.example.com/a.png", alt: "用户头像" });
    expect(wrapper.find(".safe-image").attributes("aria-label")).toBe("用户头像");
  });

  it("未提供 alt 时 aria-label 使用默认文案", () => {
    const wrapper = mountImage({ src: "https://cdn.example.com/a.png" });
    expect(wrapper.find(".safe-image").attributes("aria-label")).toBe("图片");
  });

  it("加载中 aria-busy=true", () => {
    const wrapper = mountImage({ src: "https://cdn.example.com/a.png" });
    expect(wrapper.find(".safe-image").attributes("aria-busy")).toBe("true");
  });

  // ------------------------------------------------------------------
  // 错误降级与重试
  // ------------------------------------------------------------------
  it("图片加载成功后隐藏骨架屏", async () => {
    const wrapper = mountImage({ src: "https://cdn.example.com/a.png" });
    expect(wrapper.find(".safe-image__skeleton").exists()).toBe(true);

    // 触发 load 事件
    await wrapper.find(".safe-image__img").trigger("load");
    expect(wrapper.find(".safe-image__skeleton").exists()).toBe(false);
  });

  it("图片加载失败时未达重试上限不立即降级", async () => {
    const wrapper = mountImage({ src: "https://cdn.example.com/broken.png" });
    // 第一次失败：retryCount < MAX_RETRY，应重试而非降级到 fallback
    await wrapper.find(".safe-image__img").trigger("error");
    expect(wrapper.find(".safe-image__img--fallback").exists()).toBe(false);
  });

  it("fallback 切换后渲染 fallback 图片", async () => {
    const wrapper = mountImage({
      src: "https://cdn.example.com/broken.png",
      fallback: "/static/assets/default-avatar.png",
    });
    // 触发 3 次 error 达到 MAX_RETRY+1
    const img = wrapper.find(".safe-image__img");
    await img.trigger("error");
    await img.trigger("error");
    await img.trigger("error");
    // 此时应切换到 fallback
    expect(wrapper.find(".safe-image__img--fallback").exists()).toBe(true);
  });
});
