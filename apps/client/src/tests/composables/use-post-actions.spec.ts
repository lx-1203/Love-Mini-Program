import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { usePostActions } from "../../subpackages/village/village/use-post-actions";

/**
 * R3 首刀（2026-11-05，第七辑）：长按操作组 composable 守护单测。
 *
 * <p>覆盖从 detail.vue 抽出时的全部历史修复语义：作者判定只控菜单可见性（P1-1/2026-10-31）、
 * 删除三段不许静默（2026-10-31）、复制/举报/编辑分发、评论举报三段式与失败可见。
 * uni.* 由 tests/setup.ts 全局桩 + 用例内替换驱动。</p>
 */

/** 构造一套记录调用的依赖注入 */
function makeDeps(overrides: Partial<Parameters<typeof usePostActions>[0]> = {}) {
  const calls = {
    deletedIds: [] as string[],
    reported: [] as Array<{ id: string; reason: string; description?: string }>,
    reportPostOpened: 0,
    backCount: 0,
    toasts: [] as string[],
    clipboard: [] as string[],
    navigatedTo: [] as string[],
    deleteErrorMessage: "",
  };
  const api = usePostActions({
    t: (key: string) => key,
    getPost: () => ({ id: "p-1", content: "正文内容" }),
    isOwnPost: () => false,
    deletePost: async (id: string) => {
      calls.deletedIds.push(id);
      if (calls.deleteErrorMessage) throw new Error("store-failed");
    },
    getDeleteErrorMessage: () => calls.deleteErrorMessage,
    reportComment: async (id: string, reason: string, description?: string) => {
      calls.reported.push({ id, reason, description });
    },
    onReportPost: () => {
      calls.reportPostOpened += 1;
    },
    goBack: () => {
      calls.backCount += 1;
    },
    ...overrides,
  });
  return { api, calls };
}

/**
 * 替换 uni API 为可控桩。
 * R7-8（2026-11-05）：setup.ts 对 globalThis.uni 是「不存在才注入」（:159）——手动改属性后
 * 同 worker 后续文件的 setup 不再重新注入，泄漏即跨文件污染（单跑绿/全量红）。
 * 因此原值统一记入 uniOriginals，由 afterEach 兜底还原（断言中途 throw 也必跑）。
 */
const uniOriginals = new Map<string, unknown>();

function stubUni<K extends "showActionSheet" | "showModal" | "showToast" | "setClipboardData" | "navigateTo">(
  name: K,
  impl: (args: never) => unknown,
): () => void {
  const holder = uni as unknown as Record<string, unknown>;
  if (!uniOriginals.has(name)) {
    uniOriginals.set(name, holder[name]);
  }
  holder[name] = impl;
  return () => {
    holder[name] = uniOriginals.get(name);
  };
}

/** toast 记录桩（对 success/error 两种 icon 均记录 title） */
function recordToasts(sink: string[]): () => void {
  return stubUni("showToast", ((opts: { title: string }) => {
    sink.push(opts.title);
  }) as never);
}

afterEach(() => {
  vi.restoreAllMocks();
  // R7-8：兜底还原本用例替换过的全部 uni 键（restore 函数漏调/断言中途 throw 均覆盖）
  const holder = uni as unknown as Record<string, unknown>;
  for (const [name, original] of uniOriginals) {
    holder[name] = original;
  }
  uniOriginals.clear();
});

describe("use-post-actions：长按菜单构建与分发", () => {
  it("非作者菜单只有 [复制, 举报]（作者项不出现——可见性只是体验，授权由后端兜底）", async () => {
    const { api } = makeDeps();
    let itemList: string[] = [];
    const restore = stubUni("showActionSheet", ((opts: { itemList: string[] }) => {
      itemList = opts.itemList;
      return Promise.reject(new Error("cancel")); // 用户取消，静默退出
    }) as never);
    await api.handlePostLongpress();
    restore();
    expect(itemList).toEqual(["village.detail.copyContent", "village.detail.reportAction"]);
  });

  it("作者本人菜单为 [复制, 举报, 编辑, 删除]", async () => {
    const { api } = makeDeps({ isOwnPost: () => true });
    let itemList: string[] = [];
    const restore = stubUni("showActionSheet", ((opts: { itemList: string[] }) => {
      itemList = opts.itemList;
      return Promise.reject(new Error("cancel"));
    }) as never);
    await api.handlePostLongpress();
    restore();
    expect(itemList).toEqual([
      "village.detail.copyContent",
      "village.detail.reportAction",
      "village.detail.editAction",
      "village.detail.deleteAction",
    ]);
  });

  it("帖子未加载（getPost=null）时菜单不起", async () => {
    const { api } = makeDeps({ getPost: () => null });
    const sheet = vi.fn();
    const restore = stubUni("showActionSheet", sheet as never);
    await api.handlePostLongpress();
    restore();
    expect(sheet).not.toHaveBeenCalled();
  });

  it("tap 复制 → setClipboardData 收到帖子正文", async () => {
    const { api, calls } = makeDeps();
    const restoreSheet = stubUni("showActionSheet", (() =>
      Promise.resolve({ tapIndex: 0 })) as never);
    const restoreClipboard = stubUni("setClipboardData", ((opts: { data: string }) => {
      calls.clipboard.push(opts.data);
    }) as never);
    await api.handlePostLongpress();
    restoreSheet();
    restoreClipboard();
    expect(calls.clipboard).toEqual(["正文内容"]);
  });

  it("tap 举报 → 打开帖子举报弹窗（onReportPost）", async () => {
    const { api, calls } = makeDeps();
    const restore = stubUni("showActionSheet", (() => Promise.resolve({ tapIndex: 1 })) as never);
    await api.handlePostLongpress();
    restore();
    expect(calls.reportPostOpened).toBe(1);
  });

  it("作者 tap 编辑 → 跳统一发布页编辑态 ?edit=<postId>", async () => {
    const { api, calls } = makeDeps({ isOwnPost: () => true });
    const restoreSheet = stubUni("showActionSheet", (() =>
      Promise.resolve({ tapIndex: 2 })) as never);
    const restoreNav = stubUni("navigateTo", ((opts: { url: string }) => {
      calls.navigatedTo.push(opts.url);
    }) as never);
    await api.handlePostLongpress();
    restoreSheet();
    restoreNav();
    expect(calls.navigatedTo).toEqual([
      `/subpackages/village/village/publish?edit=${encodeURIComponent("p-1")}`,
    ]);
  });
});

describe("use-post-actions：作者删除三段式（不许静默）", () => {
  async function tapDelete(
    api: ReturnType<typeof usePostActions>,
    confirm: boolean,
  ): Promise<void> {
    const restoreSheet = stubUni("showActionSheet", (() =>
      Promise.resolve({ tapIndex: 3 })) as never);
    const restoreModal = stubUni("showModal", (() =>
      Promise.resolve({ confirm, cancel: !confirm })) as never);
    await api.handlePostLongpress();
    restoreModal();
    restoreSheet();
  }

  it("确认 → store 删除 + 离开详情页", async () => {
    const { api, calls } = makeDeps({ isOwnPost: () => true });
    await tapDelete(api, true);
    expect(calls.deletedIds).toEqual(["p-1"]);
    expect(calls.backCount).toBe(1);
  });

  it("用户取消 → 不删、不报错、不离开", async () => {
    const { api, calls } = makeDeps({ isOwnPost: () => true });
    const toasts: string[] = [];
    const restoreToast = recordToasts(toasts);
    await tapDelete(api, false);
    restoreToast();
    expect(calls.deletedIds).toEqual([]);
    expect(calls.backCount).toBe(0);
    expect(toasts).toEqual([]);
  });

  it("删除失败 → toast 后端/store 文案并留在当前页（绝不吞成「看起来删掉了」）", async () => {
    const { api, calls } = makeDeps({ isOwnPost: () => true });
    calls.deleteErrorMessage = "该帖子已被管理员锁定";
    const toasts: string[] = [];
    const restoreToast = recordToasts(toasts);
    await tapDelete(api, true);
    restoreToast();
    expect(calls.deletedIds).toEqual(["p-1"]);
    expect(calls.backCount).toBe(0);
    expect(toasts).toContain("该帖子已被管理员锁定");
  });
});

describe("use-post-actions：评论举报三段式", () => {
  it("选原因 → 可选描述 → 提交成功 toast", async () => {
    const { api, calls } = makeDeps();
    const toasts: string[] = [];
    const restoreSheet = stubUni("showActionSheet", (() =>
      Promise.resolve({ tapIndex: 2 })) as never);
    const restoreModal = stubUni("showModal", (() =>
      Promise.resolve({ confirm: true, content: "补充分明细" })) as never);
    const restoreToast = recordToasts(toasts);
    await api.handleReportComment({ id: "c-9" });
    restoreToast();
    restoreModal();
    restoreSheet();
    // REPORT_REASONS 第 3 项（tapIndex=2）＝ reportReasonPorn（t 直通 key）
    expect(calls.reported).toEqual([{ id: "c-9", reason: "village.detail.reportReasonPorn", description: "补充分明细" }]);
    expect(toasts).toContain("village.detail.reportSubmitted");
  });

  it("取消选择原因 → 静默退出，不弹描述框、不提交", async () => {
    const { api, calls } = makeDeps();
    const restoreSheet = stubUni("showActionSheet", (() =>
      Promise.reject(new Error("cancel"))) as never);
    const modal = vi.fn();
    const restoreModal = stubUni("showModal", modal as never);
    await api.handleReportComment({ id: "c-9" });
    restoreModal();
    restoreSheet();
    expect(calls.reported).toEqual([]);
    expect(modal).not.toHaveBeenCalled();
  });

  it("提交失败 → toast 错误信息（失败可见）", async () => {
    const { api } = makeDeps({
      reportComment: async () => {
        throw new Error("举报提交频繁，请稍后再试");
      },
    });
    const toasts: string[] = [];
    const restoreSheet = stubUni("showActionSheet", (() =>
      Promise.resolve({ tapIndex: 0 })) as never);
    const restoreModal = stubUni("showModal", (() =>
      Promise.resolve({ confirm: false, cancel: true })) as never);
    const restoreToast = recordToasts(toasts);
    await api.handleReportComment({ id: "c-9" });
    restoreToast();
    restoreModal();
    restoreSheet();
    expect(toasts).toContain("举报提交频繁，请稍后再试");
  });

  it("REPORT_REASONS 为五项产品约定清单", async () => {
    const { api } = makeDeps();
    await nextTick();
    expect(api.REPORT_REASONS.value).toEqual([
      "village.detail.reportReasonSpam",
      "village.detail.reportReasonAbuse",
      "village.detail.reportReasonPorn",
      "village.detail.reportReasonIllegal",
      "village.detail.reportReasonOther",
    ]);
  });
});
