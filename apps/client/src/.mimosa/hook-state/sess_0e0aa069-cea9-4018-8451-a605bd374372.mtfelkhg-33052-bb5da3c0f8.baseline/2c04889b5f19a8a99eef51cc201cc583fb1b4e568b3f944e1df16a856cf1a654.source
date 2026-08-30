import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import Skeleton from "../../components/common/Skeleton.vue";

describe("Skeleton component - 骨架屏组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view）以便在 jsdom 中渲染
   */
  function mountSkeleton(props?: {
    variant?: "card" | "list" | "avatar" | "paragraph";
    count?: number;
  }) {
    return mount(Skeleton, {
      props: props ?? {},
      global: {
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("默认 variant=card count=1 渲染单个骨架", () => {
    const wrapper = mountSkeleton();
    expect(wrapper.find(".skeleton").exists()).toBe(true);
    expect(wrapper.findAll(".skeleton-item").length).toBe(1);
  });

  it("role=status 表示状态信息", () => {
    const wrapper = mountSkeleton();
    expect(wrapper.find(".skeleton").attributes("role")).toBe("status");
  });

  it("aria-live=polite 表示动态更新", () => {
    const wrapper = mountSkeleton();
    expect(wrapper.find(".skeleton").attributes("aria-live")).toBe("polite");
  });

  it("aria-busy=true 表示加载中", () => {
    const wrapper = mountSkeleton();
    expect(wrapper.find(".skeleton").attributes("aria-busy")).toBe("true");
  });

  it("aria-label=加载中", () => {
    const wrapper = mountSkeleton();
    expect(wrapper.find(".skeleton").attributes("aria-label")).toBe("加载中");
  });

  // ------------------------------------------------------------------
  // 渲染：count 多个骨架
  // ------------------------------------------------------------------
  it("count=3 渲染 3 个骨架", () => {
    const wrapper = mountSkeleton({ count: 3 });
    expect(wrapper.findAll(".skeleton-item").length).toBe(3);
  });

  it("count=5 渲染 5 个骨架", () => {
    const wrapper = mountSkeleton({ count: 5 });
    expect(wrapper.findAll(".skeleton-item").length).toBe(5);
  });

  // ------------------------------------------------------------------
  // 渲染：variant 切换
  // ------------------------------------------------------------------
  it("variant=card 渲染 skeleton-card 结构", () => {
    const wrapper = mountSkeleton({ variant: "card" });
    expect(wrapper.find(".skeleton-card").exists()).toBe(true);
    expect(wrapper.find(".skeleton-card-img").exists()).toBe(true);
    expect(wrapper.find(".skeleton-card-body").exists()).toBe(true);
  });

  it("variant=list 渲染 skeleton-list 结构", () => {
    const wrapper = mountSkeleton({ variant: "list" });
    expect(wrapper.find(".skeleton-list").exists()).toBe(true);
    expect(wrapper.find(".skeleton-avatar").exists()).toBe(true);
    expect(wrapper.find(".skeleton-lines").exists()).toBe(true);
  });

  it("variant=avatar 渲染 skeleton-avatar-wrap 结构", () => {
    const wrapper = mountSkeleton({ variant: "avatar" });
    expect(wrapper.find(".skeleton-avatar-wrap").exists()).toBe(true);
    expect(wrapper.find(".skeleton-avatar-lg").exists()).toBe(true);
  });

  it("variant=paragraph 渲染 skeleton-paragraph 结构", () => {
    const wrapper = mountSkeleton({ variant: "paragraph" });
    expect(wrapper.find(".skeleton-paragraph").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // shimmer 动画类
  // ------------------------------------------------------------------
  it("所有 shimmer 元素带 shimmer class", () => {
    const wrapper = mountSkeleton({ variant: "card" });
    expect(wrapper.find(".skeleton-card-img").classes()).toContain("shimmer");
  });

  it("list 变体的 avatar 与 line 都带 shimmer class", () => {
    const wrapper = mountSkeleton({ variant: "list" });
    expect(wrapper.find(".skeleton-avatar").classes()).toContain("shimmer");
    expect(wrapper.findAll(".skeleton-line").length).toBeGreaterThan(0);
    for (const line of wrapper.findAll(".skeleton-line")) {
      expect(line.classes()).toContain("shimmer");
    }
  });
});
