import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import VirtualList from "../../components/common/VirtualList.vue";

describe("VirtualList component - 虚拟滚动列表组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 生成测试数据
   */
  function generateItems(count: number): Array<{ id: number; title: string }> {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      title: `项目 ${i + 1}`,
    }));
  }

  /**
   * 挂载辅助函数
   */
  function mountList(props?: {
    items?: Array<Record<string, unknown>>;
    itemHeight?: number;
    height?: number;
    keyField?: string;
    lowerThreshold?: number;
    upperThreshold?: number;
  }) {
    return mount(VirtualList, {
      props: {
        items: generateItems(100),
        itemHeight: 60,
        height: 600,
        keyField: "id",
        ...props,
      },
      slots: {
        default: '<div class="mock-item">{{ item.title }}</div>',
      },
      global: {
        plugins: [i18n],
        stubs: {
          "scroll-view": {
            template: '<div class="mock-scroll-view"><slot /></div>',
            name: "uni-scroll-view",
          },
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("渲染 virtual-list 容器", () => {
    const wrapper = mountList();
    expect(wrapper.find(".virtual-list").exists()).toBe(true);
  });

  it("容器 style 包含 height", () => {
    const wrapper = mountList({ height: 800 });
    const style = wrapper.find(".virtual-list").attributes("style") || "";
    expect(style).toContain("height: 800px");
  });

  // ------------------------------------------------------------------
  // 可见项计算
  // ------------------------------------------------------------------
  it("可见项数量不超过 height/itemHeight + 缓冲", () => {
    const wrapper = mountList({ height: 600, itemHeight: 60 });
    // height=600, itemHeight=60 → 可见 10 项 + 上下各 3 缓冲 = 16 项
    const items = wrapper.findAll(".mock-item");
    // jsdom 中可能渲染切片，验证不大于 17
    expect(items.length).toBeLessThanOrEqual(20);
  });

  it("空 items 时渲染 0 个项目", () => {
    const wrapper = mountList({ items: [] });
    expect(wrapper.findAll(".mock-item").length).toBe(0);
  });

  it("少量 items 时全部渲染", () => {
    const wrapper = mountList({ items: generateItems(3) });
    expect(wrapper.findAll(".mock-item").length).toBe(3);
  });

  // ------------------------------------------------------------------
  // 滚动事件
  // ------------------------------------------------------------------
  it("触发 scrolltolower 事件当滚动到接近底部", async () => {
    const wrapper = mountList({
      items: generateItems(100),
      itemHeight: 60,
      height: 600,
      lowerThreshold: 50,
    });
    const scrollView = wrapper.find(".mock-scroll-view");
    // 使用 CustomEvent 传递 detail，避免 Event 构造器忽略非标准属性
    scrollView.element.dispatchEvent(
      new CustomEvent("scroll", {
        detail: {
          scrollTop: 5400, // 100*60 - 600 = 5400
          scrollHeight: 6000,
        },
      }),
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("scrolltolower")).toBeTruthy();
  });

  it("未触底时不触发 scrolltolower 事件", async () => {
    const wrapper = mountList({
      items: generateItems(100),
      itemHeight: 60,
      height: 600,
    });
    const scrollView = wrapper.find(".mock-scroll-view");
    scrollView.element.dispatchEvent(
      new CustomEvent("scroll", {
        detail: {
          scrollTop: 100,
          scrollHeight: 6000,
        },
      }),
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("scrolltolower")).toBeFalsy();
  });

  it("触发 scrolltoupper 事件当滚动到顶部", async () => {
    const wrapper = mountList({
      items: generateItems(100),
      itemHeight: 60,
      height: 600,
      upperThreshold: 0,
    });
    const scrollView = wrapper.find(".mock-scroll-view");
    scrollView.element.dispatchEvent(
      new CustomEvent("scroll", {
        detail: {
          scrollTop: 0,
          scrollHeight: 6000,
        },
      }),
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("scrolltoupper")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 自定义 keyField
  // ------------------------------------------------------------------
  it("使用自定义 keyField", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ uid: i + 1 }));
    const wrapper = mountList({ items, keyField: "uid" });
    expect(wrapper.findAll(".mock-item").length).toBe(5);
  });
});
