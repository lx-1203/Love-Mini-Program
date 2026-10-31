import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { i18n } from "../../i18n";

/**
 * WhisperComposeSheet（悄悄话付费发送弹层）—— 两个 P1 缺陷的回归测。
 *
 * 缺陷 A（单位）：`:94` 把 **分** 余额塞进「余额：{n} 交友币」，而钱包页余额卡印的是元
 *   ⇒ 同一账号「钱包 20 / 这里 2000」；旁边的「价格：200 交友币」也是手抄的分值。
 *   断言用**数字**而不是快照，单位再漂移会被数打到。
 *
 * 缺陷 B（付费动作双花）：`handleSend` 没有在途闸（`sending` 只 relabel 按钮），
 *   且 `clientRequestId` 是**每次调用**现生成的 `whisper-${Date.now()}-${random}`
 *   ⇒ 服务端按 clientRequestId 的去重（已核 apps/api `RealWhisperService.send()`：
 *   `findByClientRequestId` 命中即返回旧记录、不再扣费）永远合并不了两连击
 *   ⇒ 快速两下 = 发两条、扣两次钱。
 */

/** clientApi.sendWhisper 的收口桩：记录 payload，响应由每个用例决定 */
const apiStub = vi.hoisted(() => ({
  calls: [] as Array<{ receiverId: number; content: string; clientRequestId: string }>,
  next: () => Promise.resolve({ status: "SENT" }) as Promise<unknown>,
}));

vi.mock("../../services/api", () => ({
  clientApi: {
    sendWhisper: (payload: { receiverId: number; content: string; clientRequestId: string }) => {
      apiStub.calls.push(payload);
      return apiStub.next();
    },
  },
}));

/** showErrorToast 的收口桩（失败路径只要知道「有没有按失败处理」） */
const errorToastStub = vi.hoisted(() => ({ calls: 0 }));
vi.mock("../../utils/error-toast", () => ({
  showErrorToast: () => {
    errorToastStub.calls += 1;
  },
}));

import WhisperComposeSheet from "../../components/discover/WhisperComposeSheet.vue";
import { useCoinsStore } from "../../stores/coins";

let pinia: Pinia;

function mountSheet(
  props: { visible?: boolean; userId?: number; userName?: string } = {}
) {
  return mount(WhisperComposeSheet, {
    props: { visible: true, userId: 42, userName: "小甜", ...props },
    global: {
      plugins: [i18n, pinia],
      stubs: {
        view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        textarea: { template: '<textarea class="mock-textarea"></textarea>', name: "uni-textarea" },
      },
    },
  });
}

/** 组件的 textarea 走 uni 事件形态（`$event.detail.value`），故用 CustomEvent 注水 */
async function typeContent(
  wrapper: ReturnType<typeof mountSheet>,
  text: string
): Promise<void> {
  const el = wrapper.find("textarea").element as HTMLTextAreaElement;
  el.dispatchEvent(new CustomEvent("input", { detail: { value: text } }));
  await wrapper.vm.$nextTick();
}

function setBalance(cents: number): void {
  useCoinsStore().balanceCents = cents;
}

function lastRequestId(): string {
  return apiStub.calls[apiStub.calls.length - 1].clientRequestId;
}

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  apiStub.calls.length = 0;
  apiStub.next = () => Promise.resolve({ status: "SENT" });
  errorToastStub.calls = 0;
  (globalThis as Record<string, any>).uni = {
    ...(globalThis as Record<string, any>).uni,
    showToast: vi.fn(),
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("WhisperComposeSheet · 金额单位（余额与价格同一个口径）", () => {
  it("余额 2000 分 ⇒ 印 20，绝不印 2000；价格取扣费同源价 ⇒ 印 2", () => {
    setBalance(2000);
    const wrapper = mountSheet();
    const [price, balance] = wrapper.findAll(".whisper-sheet__meta-text").map((n) => n.text());
    expect(price).toBe("价格：2 交友币");
    expect(balance).toBe("余额：20 交友币");
    expect(wrapper.text()).not.toContain("2000");
    // 分→元的显式关系（换算系数再被改动会直接被数字打到）
    expect(Number(balance.replace(/[^0-9.]/g, ""))).toBe(2000 / 100);
  });

  it("余额 150 分、单价 200 分 ⇒ 屏上是 1.5 与 2（用户能看出钱不够）", () => {
    setBalance(150);
    const wrapper = mountSheet();
    const [price, balance] = wrapper.findAll(".whisper-sheet__meta-text").map((n) => n.text());
    expect(price).toBe("价格：2 交友币");
    expect(balance).toBe("余额：1.5 交友币");
  });
});

describe("WhisperComposeSheet · 付费动作防双花（clientRequestId + 在途闸）", () => {
  it("快速两击只发一次请求，且第二次派发被在途闸吃掉", async () => {
    let release: (v: unknown) => void = () => {};
    apiStub.next = () => new Promise((r) => {
      release = r;
    });
    setBalance(2000);
    const wrapper = mountSheet();
    await typeContent(wrapper, "想认识你");

    await wrapper.find(".whisper-sheet__send").trigger("tap");
    await wrapper.find(".whisper-sheet__send").trigger("tap");
    await flushPromises();

    expect(apiStub.calls).toHaveLength(1);
    expect(apiStub.calls[0].clientRequestId).toBeTruthy();
    // 按钮在途期间是禁用态（不只是文案变了）
    const send = wrapper.find(".whisper-sheet__send");
    expect(send.classes()).toContain("whisper-sheet__send--pending");
    expect(send.attributes("aria-disabled")).toBe("true");

    release({ status: "SENT" });
    await flushPromises();
    expect(wrapper.emitted("sent")).toBeTruthy();
    expect(wrapper.find(".whisper-sheet__send--pending").exists()).toBe(false);
  });

  it("clientRequestId 在「打开弹层」时生成，而不是在点击时生成", async () => {
    vi.useFakeTimers();
    const openedAt = Date.parse("2026-10-31T10:00:00Z");
    vi.setSystemTime(openedAt);
    setBalance(2000);
    const wrapper = mountSheet();
    // 打开后过了 5 秒才点：键里的时间戳必须是「打开」那一刻
    vi.setSystemTime(openedAt + 5000);
    await typeContent(wrapper, "想认识你");
    await wrapper.find(".whisper-sheet__send").trigger("tap");
    await flushPromises();

    expect(apiStub.calls).toHaveLength(1);
    expect(lastRequestId()).toContain(String(openedAt));
    expect(lastRequestId()).not.toContain(String(openedAt + 5000));
  });

  it("失败后为下一次显式重试换键（旧键会命中服务端 PAY_FAILED 记录 ⇒ 假成功）", async () => {
    setBalance(2000);
    apiStub.next = () => Promise.reject(new Error("boom"));
    const wrapper = mountSheet();
    await typeContent(wrapper, "想认识你");

    await wrapper.find(".whisper-sheet__send").trigger("tap");
    await flushPromises();
    await wrapper.find(".whisper-sheet__send").trigger("tap");
    await flushPromises();

    expect(apiStub.calls).toHaveLength(2);
    expect(apiStub.calls[1].clientRequestId).not.toBe(apiStub.calls[0].clientRequestId);
    expect(errorToastStub.calls).toBe(2);
    expect(wrapper.emitted("sent")).toBeFalsy();
  });

  it("关闭再打开 = 新的编辑会话 ⇒ 新键", async () => {
    setBalance(2000);
    const wrapper = mountSheet();
    await typeContent(wrapper, "想认识你");
    await wrapper.find(".whisper-sheet__send").trigger("tap");
    await flushPromises();
    const firstId = lastRequestId();

    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    await typeContent(wrapper, "再想认识你");
    await wrapper.find(".whisper-sheet__send").trigger("tap");
    await flushPromises();

    expect(apiStub.calls).toHaveLength(2);
    expect(lastRequestId()).not.toBe(firstId);
  });

  it("空内容不发请求（在途闸没有把校验短路掉）", async () => {
    setBalance(2000);
    const wrapper = mountSheet();
    await wrapper.find(".whisper-sheet__send").trigger("tap");
    await flushPromises();
    expect(apiStub.calls).toHaveLength(0);
    expect(globalThis.uni.showToast).toHaveBeenCalled();
  });
});
