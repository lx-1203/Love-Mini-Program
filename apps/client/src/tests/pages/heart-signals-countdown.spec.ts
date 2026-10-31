import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { i18n } from "../../i18n";

/**
 * 心动信号页倒计时轮询的可见性配对（P1 修复 4，2026-10-31）。
 *
 * 修复前：setInterval 只在 onMounted 注册、只在 onUnmounted 清理，
 * 没有 onHide/onShow 配对。小程序里 push 新页面 / 切后台时本页实例**仍然存活**
 * （不触发 onUnmounted），于是每 30s 的 updateCountdowns() 一直在后台跑，
 * 持续改写 countdownMap.value 并持有整页作用域（页面在栈底时也一样）。
 * 现按 chat-session/index.vue 的 onHide/onShow 口径配对：隐藏即停、可见即恢复。
 */

/** 捕获页面注册的 uni-app 页面生命周期回调（测试侧手工触发） */
const lifecycle = vi.hoisted(() => ({
  onShow: null as null | (() => void),
  onHide: null as null | (() => void),
}));

vi.mock("@dcloudio/uni-app", () => ({
  onLoad: () => {},
  onShow: (fn: () => void) => {
    lifecycle.onShow = fn;
  },
  onHide: (fn: () => void) => {
    lifecycle.onHide = fn;
  },
  onUnload: () => {},
  onReady: () => {},
  onPullDownRefresh: () => {},
}));

vi.mock("../../composables/usePageAccess", () => ({
  usePageAccess: vi.fn(),
}));

vi.mock("../../composables/useMenuButtonRect", () => ({
  useMenuButtonRect: () => ({ styleVars: {} }),
}));

vi.mock("../../utils/navigation", () => ({
  openAppPath: vi.fn(),
  openUserProfile: vi.fn(),
}));

vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (url: string) => url,
}));

vi.mock("../../utils/error-toast", () => ({
  showErrorToast: vi.fn(),
}));

/** 一条待处理信号：2 小时后过期（30s 一次的重算会改变「x小时y分」文案） */
const pendingSignal = vi.hoisted(() => ({
  id: "hs-1",
  status: "pending",
  fromUserId: "u-2001",
  fromUserName: "林晓",
  fromUserAvatar: "",
  createdAt: "",
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
}));

const fetchHeartSignals = vi.fn(async () => {});

vi.mock("../../stores/likes", () => ({
  useLikesStore: vi.fn(() =>
    // storeToRefs 只把 ref/reactive 值导出为 ref ⇒ 数组/布尔必须用 ref 包一层，
    // 否则页面里 heartSignals.value 会是 undefined
    reactive({
      heartSignals: ref([pendingSignal] as unknown[]),
      loading: ref(false),
      fetchHeartSignals,
      acceptHeartSignal: vi.fn(async () => {}),
      declineHeartSignal: vi.fn(async () => {}),
    })
  ),
}));

vi.mock("../../stores/session", () => ({
  useSessionStore: vi.fn(() =>
    reactive({
      isLoggedIn: true,
      isProfileComplete: true,
      profileCompletion: 100,
      userSession: { userId: "user-1001", loggedIn: true },
    })
  ),
}));

vi.mock("../../stores/profile", () => ({
  useProfileStore: vi.fn(() =>
    reactive({
      basicProfile: null,
      load: vi.fn(async () => {}),
    })
  ),
}));

vi.mock("../../stores/chat", () => ({
  useChatStore: vi.fn(() =>
    reactive({
      startFromSignal: vi.fn(async () => ({ id: "s-1" })),
    })
  ),
}));

(globalThis as Record<string, unknown>).uni = {
  showToast: vi.fn(),
  navigateBack: vi.fn(),
  switchTab: vi.fn(),
  createSelectorQuery: () => ({
    select: () => ({ boundingClientRect: () => ({ exec: () => {} }) }),
    exec: () => {},
  }),
  getSystemInfoSync: () => ({ statusBarHeight: 20, windowWidth: 375, pixelRatio: 2 }),
};

import HeartSignalsPage from "../../subpackages/tools/heart-signals/index.vue";

function countdownText(wrapper: ReturnType<typeof mount>): string {
  return wrapper.find(".signal-card__time").text();
}

describe("心动信号页倒计时轮询与页面可见性配对（P1 修复 4）", () => {
  beforeEach(() => {
    lifecycle.onShow = null;
    lifecycle.onHide = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function mountPage() {
    return mount(HeartSignalsPage, {
      global: {
        plugins: [i18n],
        stubs: {
          "scroll-view": { template: "<div><slot /></div>", name: "uni-scroll-view" },
          view: { template: "<div><slot /></div>", name: "uni-view" },
          text: { template: "<span><slot /></span>", name: "uni-text" },
          image: { template: "<img />", name: "uni-image" },
        },
      },
    });
  }

  it("注册了 onHide 与 onShow 配对（修复前只有 onShow，无 onHide）", () => {
    mountPage();

    expect(lifecycle.onShow, "页面必须注册 onShow 以恢复轮询").toBeTypeOf("function");
    // 修复前这一句必红：整页没有 onHide，页面被压栈后定时器一直在跑
    expect(lifecycle.onHide, "页面必须注册 onHide 以暂停轮询").toBeTypeOf("function");
  });

  it("页面可见时每 30s 重算倒计时；隐藏后停止重算；再次可见恢复", async () => {
    const wrapper = mountPage();
    const timerBase = vi.getTimerCount();
    expect(timerBase, "挂载后应存在倒计时定时器").toBeGreaterThanOrEqual(1);

    // 可见：推进一个刷新周期，倒计时文案必须变化（2 小时 → 1 小时 59 分）
    const first = countdownText(wrapper);
    await vi.advanceTimersByTimeAsync(30_000);
    const second = countdownText(wrapper);
    expect(second).not.toBe(first);

    // 隐藏（push 下一页 / 切后台）：定时器必须被清掉
    lifecycle.onHide!();
    expect(vi.getTimerCount(), "onHide 必须清掉倒计时定时器").toBeLessThan(timerBase);

    const frozen = countdownText(wrapper);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(countdownText(wrapper), "页面隐藏期间不得继续改写倒计时").toBe(frozen);

    // 返回本页：轮询恢复
    lifecycle.onShow!();
    expect(vi.getTimerCount()).toBe(timerBase);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(countdownText(wrapper)).not.toBe(frozen);

    wrapper.unmount();
    expect(vi.getTimerCount(), "卸载后不得残留定时器").toBeLessThan(timerBase);
  });

  it("首帧 onMounted + onShow 连续触发不得注册第二个 interval", () => {
    mountPage();
    const afterMount = vi.getTimerCount();

    lifecycle.onShow!();
    lifecycle.onShow!();

    expect(vi.getTimerCount(), "startCountdownTimer 必须幂等").toBe(afterMount);
  });

  it("卸载后定时器不残留（保留原 onUnmounted 语义）", () => {
    const wrapper = mountPage();
    const afterMount = vi.getTimerCount();

    wrapper.unmount();

    expect(vi.getTimerCount()).toBeLessThan(afterMount);
  });
});
