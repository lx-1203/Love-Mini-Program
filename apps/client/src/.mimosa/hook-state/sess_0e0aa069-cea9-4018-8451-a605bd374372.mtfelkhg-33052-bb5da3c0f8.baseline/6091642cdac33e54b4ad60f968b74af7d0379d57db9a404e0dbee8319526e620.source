import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

(globalThis as any).uni = { showToast: vi.fn() };

import WhisperUnlockSheet from "../../components/discover/WhisperUnlockSheet.vue";

describe("WhisperUnlockSheet - 悄悄话解锁弹层（2026-08-14 多条文案 + 回复）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mountSheet(props?: { visible?: boolean; userName?: string; balanceCents?: number | null }) {
    return mount(WhisperUnlockSheet, {
      props: {
        visible: true,
        userName: "小甜",
        balanceCents: 500,
        ...props,
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          image: { template: '<img class="mock-image" />', name: "uni-image" },
          input: { template: '<input class="mock-input" />', name: "uni-input" },
        },
      },
    });
  }

  it("付费墙展示引导文案「TA 有很多想对你说的话」", () => {
    const wrapper = mountSheet();
    expect(wrapper.find(".whisper-sheet__title").text()).toContain("想对你说的话");
    expect(wrapper.find(".whisper-letter__hint").exists()).toBe(true);
  });

  it("付费墙点击解锁 emit unlock", async () => {
    const wrapper = mountSheet();
    await wrapper.find(".whisper-sheet__btn--confirm").trigger("tap");
    expect(wrapper.emitted("unlock")).toBeTruthy();
  });

  it("showResult 后渲染 3 条悄悄话并 emit unlocked", async () => {
    const wrapper = mountSheet();
    const texts = ["第一句", "第二句", "第三句"];
    (wrapper.vm as unknown as { showResult: (t: string[]) => void }).showResult(texts);
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".whisper-result-item").length).toBe(3);
    expect(wrapper.emitted("unlocked")![0]).toEqual([texts]);
  });

  it("回复内容为空时提示且不 emit reply", async () => {
    const wrapper = mountSheet();
    (wrapper.vm as unknown as { showResult: (t: string[]) => void }).showResult(["第一句"]);
    await wrapper.vm.$nextTick();
    await wrapper.find(".whisper-reply__send").trigger("tap");
    expect(wrapper.emitted("reply")).toBeFalsy();
    expect(globalThis.uni.showToast).toHaveBeenCalled();
  });

  it("输入回复后点击回复TA emit reply(text)", async () => {
    const wrapper = mountSheet();
    (wrapper.vm as unknown as { showResult: (t: string[]) => void }).showResult(["第一句"]);
    await wrapper.vm.$nextTick();
    const input = wrapper.find("input");
    await input.setValue("想认识你");
    await wrapper.find(".whisper-reply__send").trigger("tap");
    expect(wrapper.emitted("reply")![0]).toEqual(["想认识你"]);
  });

  it("结果态保留「去和TA聊天」按钮并 emit chat", async () => {
    const wrapper = mountSheet();
    (wrapper.vm as unknown as { showResult: (t: string[]) => void }).showResult(["第一句"]);
    await wrapper.vm.$nextTick();
    const chatBtn = wrapper.findAll(".whisper-sheet__btn--confirm").at(-1);
    await chatBtn!.trigger("tap");
    expect(wrapper.emitted("chat")).toBeTruthy();
  });
});
