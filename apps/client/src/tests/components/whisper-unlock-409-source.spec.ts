import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n, t } from "../../i18n";
import { AppApiError } from "../../services/api-error";

/**
 * 悄悄话解锁失败的 409 双来源分支判点（第六轮修复波 W2c 条目 1）。
 *
 * 被测分支（两处，口径完全相同）：
 * - `components/discover/CardDetailOverlay.vue` `handleWhisperUnlock()` catch
 * - `components/discover/CardSwiper.vue` `handleWhisperUnlock()` catch
 * 判据字面量：`status === 409 && conflictCode !== "IDEMPOTENT_CONFLICT"`。
 *
 * 为什么要这条判点：后端 409 有**两个**生产者，只按 status 分支会把后者也提示成「余额不足」：
 * - `GlobalExceptionHandler.handleInsufficientBalance`（:196-205）⇒ 409 + `code:"INSUFFICIENT_BALANCE"`，
 *   这是该提示唯一该出现的来源；
 * - `IdempotentInterceptor:192` 抛 `IdempotencyException`（ERROR_CODE = `IDEMPOTENT_CONFLICT`）
 *   ⇒ 同为 409，但语义是「同键重放，动作其实已经发生/正在发生」，钱已扣，提示余额不足是假的。
 * 这两处改动落盘时**没有任何 spec 走到过该分支**（`npx vitest run src/tests/components` 65 文件
 * 692 例全绿即为证据：分支无判点＝删掉排除条件也不会有人红）。
 *
 * 载具可达性实测（写在这里防下一个读者误以为「这条分支今天就能在后端复现」）：
 * - `clientApi.unlockWhisper` 走 `POST /recommendations/{userId}/whisper/unlock`，该端点**没有**
 *   `@Idempotent`（RecommendationController:560 只有 @PostMapping/@PreAuthorize），
 *   且 `services/http.ts` 的自动补键拦截器对未手设键的写请求**每次生成新键**（P1-1，2026-10-25）
 *   ⇒ 今天这一发的 IDEMPOTENT_CONFLICT 只能来自别处，对本端点属**防御性排除**。
 * - 真正常驻该业务码的是 `stores/coins.ts` spend()：它手设 `Idempotency-Key: UNLOCK-{scene}-{targetId}`
 *   （跨点击稳定的业务键），打到 `POST /wallet/unlock`（WalletController:425-428）/
 *   `/wallet/deduct`（:458-460），两个端点都标了 `@Idempotent` ⇒ 同目标二次点击在 TTL 内必回
 *   409 + IDEMPOTENT_CONFLICT。同一组件树的私信解锁（`handleMessage`）就是这条路。
 * - 结论：本判点钉的是**客户端分支口径**（后端契约变化时的行为承诺），不是「当前后端可复现的一次响应」。
 *
 * 夹具选型（为什么两处共用一份表）：两处是同一口径的复制粘贴，判点写成
 * 「一张期望表 × 两个宿主组件」而不是两份各自的用例——
 * 1) 任一文件里把排除条件删掉/写歪都会红（各文件独立有覆盖，不是只测一处）；
 * 2) 期望表只有一份，不会出现「改了 A 的口径忘了改 B 的题语」这种判点漂移；
 * 3) 两处的入参都是同一个 `AppApiError` 形状，分开写只会把 4 个组合抄两遍。
 */

vi.mock("../../services/api", () => ({
  clientApi: {
    getWhisper: vi.fn(),
    unlockWhisper: vi.fn(),
  },
}));

vi.mock("../../utils/navigation", () => ({
  openAppPath: vi.fn(),
}));

vi.mock("../../services/env", () => ({
  isDev: false,
}));

// real 档：只有 `useMock() === false` 才会调 clientApi.unlockWhisper 并落进这段 catch。
// mock 档走 coinsStore.spend 本地抛 Error（无 status/code），压根到不了 409 分支。
vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: () => false,
}));

import CardDetailOverlay from "../../components/discover/CardDetailOverlay.vue";
import CardSwiper from "../../components/discover/CardSwiper.vue";
import { clientApi } from "../../services/api";
import type { DiscoverCard } from "../../stores/discover/types";

/** 语言包里的余额提示真值（zh-CN.ts:1033）。刻意写死字面量：拿 t(key) 当期望值＝恒真。 */
const BALANCE_TOAST = "交友币余额不足，解锁失败";
/** 兜底 modal 的标题真值（zh-CN.ts:1076）。 */
const FAIL_MODAL_TITLE = "解锁失败";
/** 余额提示所用键名：解析失败时会原样露出这串，必须断言它没进 toast。 */
const BALANCE_KEY = "discover.whisperUnlockFailBalance";

function makeCard(overrides: Partial<DiscoverCard> = {}): DiscoverCard {
  return {
    id: "card-1",
    userId: "user-1",
    name: "小甜",
    avatar: "https://cdn.example.com/avatar.jpg",
    headline: "22岁 · 大四",
    bio: "喜欢摄影和电影",
    tags: ["摄影", "电影"],
    commonGround: "同城",
    availability: "在线",
    images: [],
    isSameSchool: true,
    commonCircleCount: 2,
    personality: ["温柔体贴"],
    mbti: "INFJ",
    recentPosts: [],
    ...overrides,
  };
}

type UiSpy = ReturnType<typeof vi.fn>;

/** uni.showToast / uni.showModal 探针（setup.ts 的桩是空函数，这里换成可断言的 spy） */
interface UniProbe {
  showToast: UiSpy;
  showModal: UiSpy;
  restore: () => void;
}

function installUniProbe(): UniProbe {
  const target = globalThis as unknown as { uni: Record<string, unknown> };
  const originalToast = target.uni.showToast;
  const originalModal = target.uni.showModal;
  const showToast = vi.fn();
  const showModal = vi.fn();
  target.uni.showToast = showToast;
  target.uni.showModal = showModal;
  return {
    showToast,
    showModal,
    restore: () => {
      target.uni.showToast = originalToast;
      target.uni.showModal = originalModal;
    },
  };
}

/** 悄悄话弹层探针：记录 showResult / resetToPaywall（父组件通过 ref 命令式驱动弹层状态） */
interface SheetProbe {
  showResult: UiSpy;
  resetToPaywall: UiSpy;
  component: Record<string, unknown>;
}

function makeSheetProbe(): SheetProbe {
  const showResult = vi.fn();
  const resetToPaywall = vi.fn();
  return {
    showResult,
    resetToPaywall,
    component: {
      name: "WhisperUnlockSheet",
      emits: ["close", "chat", "unlock", "unlocked", "reply"],
      methods: { showResult, resetToPaywall },
      template: '<view class="stub-whisper-sheet" />',
    },
  };
}

type ToastExpect = "balance" | "none";
type ModalExpect = "fallback" | "none";

interface Case {
  id: string;
  /** 抛给 catch 的错误对象（null = 不抛错，走成功路） */
  error: (() => unknown) | null;
  toast: ToastExpect;
  modal: ModalExpect;
  /** 兜底 modal 正文（仅 modal === "fallback" 时有意义） */
  modalContent?: string;
}

/**
 * 四种 409/500 组合 + 一发成功对照。
 * 期望列即「现口径」：`code` 缺失的 409 仍给余额提示（组件注释写明了理由——
 * 宁可提示保守，也不退回弹后端原文），这条是刻意的保守选择，本表把它钉住而不是放任。
 */
const CASES: Case[] = [
  {
    id: "409 + INSUFFICIENT_BALANCE ⇒ 余额提示，不弹兜底 modal",
    error: () =>
      new AppApiError({
        status: 409,
        error: "Conflict",
        code: "INSUFFICIENT_BALANCE",
        message: "余额不足",
      }),
    toast: "balance",
    modal: "none",
  },
  {
    id: "409 + IDEMPOTENT_CONFLICT ⇒ 不得提示余额不足，走兜底 modal",
    error: () =>
      new AppApiError({
        status: 409,
        error: "Conflict",
        code: "IDEMPOTENT_CONFLICT",
        message: "重复请求，请勿连续提交",
      }),
    toast: "none",
    modal: "fallback",
    modalContent: "重复请求，请勿连续提交",
  },
  {
    id: "500 ⇒ 走兜底 modal",
    error: () =>
      new AppApiError({
        status: 500,
        error: "Internal Server Error",
        code: "INTERNAL_ERROR",
        message: "服务端异常",
      }),
    toast: "none",
    modal: "fallback",
    modalContent: "服务端异常",
  },
  {
    id: "409 + code 缺失 ⇒ 按现口径仍给余额提示（刻意保守）",
    error: () =>
      new AppApiError({
        status: 409,
        error: "Conflict",
        message: "数据冲突，可能存在重复或违反约束的数据",
      }),
    toast: "balance",
    modal: "none",
  },
  {
    // 载具自证：error === null ⇒ 成功路。没有这条，前面四条万一「根本没进 catch」
    // 也可能凑出「没弹 modal」的读数；成功路明确证明 toast/modal 的缺席是分支给的。
    id: "解锁成功（对照：不抛错）⇒ 不提示失败、不弹兜底 modal",
    error: null,
    toast: "none",
    modal: "none",
  },
];

/** 后端 DataIntegrityViolationException 也映射成 409 且不带 code —— 它正是「无 code 的 409」这一档的真实生产者之一。 */
interface HostDef {
  name: string;
  mount: (sheet: SheetProbe) => VueWrapper;
}

const HOSTS: HostDef[] = [
  {
    name: "CardDetailOverlay",
    mount: (sheet) =>
      mount(CardDetailOverlay, {
        props: { visible: true, card: makeCard() },
        global: {
          plugins: [i18n],
          stubs: {
            SafeImage: { template: '<image class="stub-safe-image" />' },
            AvatarFrame: { template: '<view class="stub-avatar-frame" />' },
            VerificationBadge: { template: '<view class="stub-verification-badge" />' },
            WhisperUnlockSheet: sheet.component,
            scrollView: { template: '<view class="stub-scroll"><slot /></view>' },
            swiper: { template: '<view class="stub-swiper"><slot /></view>' },
            swiperItem: { template: '<view class="stub-swiper-item"><slot /></view>' },
          },
        },
      }),
  },
  {
    name: "CardSwiper",
    mount: (sheet) =>
      mount(CardSwiper, {
        props: { cards: [makeCard()], remainingCount: 10 },
        global: {
          plugins: [i18n],
          stubs: {
            SafeImage: { template: '<image class="stub-safe-image" />' },
            AvatarFrame: { template: '<view class="stub-avatar-frame" />' },
            VerificationBadge: { template: '<view class="stub-verification-badge" />' },
            CardDetailOverlay: { template: '<view class="stub-card-detail" />' },
            LongPressMenu: { template: '<view class="stub-long-press" />' },
            WhisperUnlockSheet: sheet.component,
            swiper: { template: '<view class="stub-swiper"><slot /></view>' },
            swiperItem: { template: '<view class="stub-swiper-item"><slot /></view>' },
          },
        },
      }),
  },
];

describe.each(HOSTS)("悄悄话解锁 409 双来源分支（$name）", (host) => {
  let probe: UniProbe;
  let sheet: SheetProbe;
  let wrapper: VueWrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    probe = installUniProbe();
    sheet = makeSheetProbe();
    wrapper = host.mount(sheet);
    vi.mocked(clientApi.unlockWhisper).mockReset();
  });

  afterEach(() => {
    probe.restore();
    wrapper.unmount();
  });

  /** 触发弹层的「解锁查看」——真组件里 handleWhisperUnlock 只挂在 @unlock 上，没有 defineExpose */
  async function tapUnlock(): Promise<void> {
    const child = wrapper.findComponent({ name: "WhisperUnlockSheet" });
    expect(child.exists(), "WhisperUnlockSheet 未渲染，@unlock 挂不到 handleWhisperUnlock").toBe(true);
    child.vm.$emit("unlock");
    await flushPromises();
  }

  it.each(CASES)("$id", async (c) => {
    if (c.error) {
      vi.mocked(clientApi.unlockWhisper).mockRejectedValue(c.error());
    } else {
      vi.mocked(clientApi.unlockWhisper).mockResolvedValue({
        unlocked: true,
        whispers: ["想对你说的话"],
        balanceCents: 600,
      });
    }

    await tapUnlock();

    // 载具有效性：必须真的走了 real 档（否则这段 catch 一行都没执行）
    expect(clientApi.unlockWhisper).toHaveBeenCalledTimes(1);
    expect(clientApi.unlockWhisper).toHaveBeenCalledWith("user-1");

    if (c.toast === "balance") {
      expect(probe.showToast).toHaveBeenCalledTimes(1);
      const opts = probe.showToast.mock.calls[0]?.[0] as { title?: string; icon?: string };
      expect(opts.title, `余额提示文案不再是语言包真值（页面会印出裸键或错句）`).toBe(BALANCE_TOAST);
      expect(opts.title, "t() 解析失败露出裸键名").not.toBe(BALANCE_KEY);
      expect(opts.icon).toBe("none");
      expect(probe.showModal).not.toHaveBeenCalled();
    } else {
      expect(probe.showToast, "非余额档不得提示「余额不足」").not.toHaveBeenCalled();
    }

    if (c.modal === "fallback") {
      expect(probe.showModal).toHaveBeenCalledTimes(1);
      const opts = probe.showModal.mock.calls[0]?.[0] as {
        title?: string;
        content?: string;
        showCancel?: boolean;
      };
      expect(opts.title).toBe(FAIL_MODAL_TITLE);
      expect(opts.content).toContain(c.modalContent ?? "");
      expect(opts.showCancel).toBe(false);
    } else {
      expect(probe.showModal).not.toHaveBeenCalled();
    }

    if (c.error) {
      // 失败必回退付费墙（四处分支共用的前置动作，漏掉就是「扣费失败但弹层停在结果态」）
      expect(sheet.resetToPaywall).toHaveBeenCalledTimes(1);
      expect(sheet.showResult).not.toHaveBeenCalled();
    }
  });

  it("成功路：不提示失败、弹层进入结果态（反向对照，证明上面四条都只在失败时成立）", async () => {
    vi.mocked(clientApi.unlockWhisper).mockResolvedValue({
      unlocked: true,
      whispers: ["第一句", "第二句"],
      balanceCents: 600,
    });
    await tapUnlock();
    expect(clientApi.unlockWhisper).toHaveBeenCalledTimes(1);
    expect(sheet.showResult).toHaveBeenCalledWith(["第一句", "第二句"]);
    expect(sheet.resetToPaywall).not.toHaveBeenCalled();
    expect(probe.showToast).not.toHaveBeenCalled();
    expect(probe.showModal).not.toHaveBeenCalled();
  });

  it("余额提示确实取自语言包（键被删/改名时 t() 会回吐裸键名，此条即红）", () => {
    expect(t(BALANCE_KEY)).toBe(BALANCE_TOAST);
    expect(t("discover.unlockFailTitle")).toBe(FAIL_MODAL_TITLE);
  });
});
