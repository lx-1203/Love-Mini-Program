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

  /**
   * P1 修复（2026-10-31）：这一屏的余额此前印的是**分**。
   *
   * 改前实况：`:balance-cents="coinsStore.balanceCents"`（分）被原样填进
   * 「当前余额 {n} 交友币」，而同一条费用行走的是 `UNLOCK_COST_YUAN.WHISPER`（元）⇒
   * 同一个账号钱包页说 20、这里说 2000；而「余额不足」判定吃的是分
   * （`balanceCents >= WHISPER_COST_CENTS`），与印在它旁边的数字自相矛盾。
   *
   * 这里刻意用**数字断言**而不是快照：单位再漂移（比如有人把换算改成 *1000）
   * 会直接被数值打到，而不是只改一张快照就悄悄过。
   */
  describe("金额单位：余额与费用同一条口径（元）", () => {
    /** 抠出「当前余额 {n} 交友币」里那个数字 */
    function printedBalance(wrapper: ReturnType<typeof mountSheet>): number | null {
      const m = wrapper.find(".whisper-sheet__balance").text().match(/当前余额\s*([\d.]+)\s*交友币/);
      return m ? Number(m[1]) : null;
    }

    it("余额 2000 分（=20 元）渲染 20，绝不渲染 2000", () => {
      const wrapper = mountSheet({ balanceCents: 2000 });
      expect(wrapper.find(".whisper-sheet__balance").text()).toBe("当前余额 20 交友币");
      expect(printedBalance(wrapper)).toBe(20);
      // 分→元的显式关系：印出来的数 = cents/100，且不等于 cents 本身
      expect(printedBalance(wrapper)).toBe(2000 / 100);
      expect(printedBalance(wrapper)).not.toBe(2000);
      expect(wrapper.text()).not.toContain("2000");
    });

    it("费用行与余额行同单位：解锁需 2 交友币 / 余额 5 交友币（500 分）", () => {
      const wrapper = mountSheet({ balanceCents: 500 });
      expect(wrapper.find(".whisper-letter__cost").text()).toBe("解锁需 2 交友币");
      expect(wrapper.find(".whisper-sheet__balance").text()).toBe("当前余额 5 交友币");
    });

    it("余额 1.5 元（150 分）< 单价 2 元 ⇒ 进入余额不足态", () => {
      const wrapper = mountSheet({ balanceCents: 150 });
      expect(printedBalance(wrapper)).toBe(1.5);
      expect(wrapper.find(".whisper-sheet__balance").classes()).toContain(
        "whisper-sheet__balance--insufficient"
      );
    });

    it("余额恰好等于单价（200 分 = 2 元）⇒ 不算不足（分对分比较，不能被单位换算带偏）", () => {
      const wrapper = mountSheet({ balanceCents: 200 });
      expect(wrapper.find(".whisper-sheet__balance").text()).toBe("当前余额 2 交友币");
      expect(wrapper.find(".whisper-sheet__balance").classes()).not.toContain(
        "whisper-sheet__balance--insufficient"
      );
    });

    it("余额未知（null）⇒ 印 -- 且不拦（由后端兜底校验）", () => {
      const wrapper = mountSheet({ balanceCents: null });
      expect(wrapper.find(".whisper-sheet__balance").text()).toBe("当前余额 -- 交友币");
      expect(wrapper.find(".whisper-sheet__balance").classes()).not.toContain(
        "whisper-sheet__balance--insufficient"
      );
    });
  });
});
