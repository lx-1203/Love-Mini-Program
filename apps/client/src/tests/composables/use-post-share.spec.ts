import { afterEach, describe, expect, it, vi } from "vitest";
import { usePostShare } from "../../subpackages/village/village/use-post-share";

/**
 * R3 第三刀（2026-11-05，第九辑）：转发弹窗 composable 守护单测。
 *
 * <p>覆盖从 detail.vue 抽出时的全部语义：打开清附言、成功关弹窗+清附言+success toast、
 * 失败 toast 后端文案/兜底（弹窗不关、附言保留可重试）、isSharing 全程防重入（finally 复位）、
 * 未加载守卫（打开/确认均跳过）。uni 桩还原遵循 R7-8 纪律（afterEach 兜底）。</p>
 */

const uniOriginals = new Map<string, unknown>();

function stubUni(name: string, impl: (args: never) => unknown): () => void {
  const holder = uni as unknown as Record<string, unknown>;
  if (!uniOriginals.has(name)) {
    uniOriginals.set(name, holder[name]);
  }
  holder[name] = impl;
  return () => {
    holder[name] = uniOriginals.get(name);
  };
}

function recordToasts(sink: string[]): () => void {
  return stubUni("showToast", ((opts: { title: string }) => {
    sink.push(opts.title);
  }) as never);
}

afterEach(() => {
  vi.restoreAllMocks();
  const holder = uni as unknown as Record<string, unknown>;
  for (const [name, original] of uniOriginals) {
    holder[name] = original;
  }
  uniOriginals.clear();
});

function makeShare(overrides: Partial<Parameters<typeof usePostShare>[0]> = {}) {
  const calls = {
    shared: [] as Array<{ postId: string; comment?: string }>,
    shareErrorMessage: "",
    post: { id: "p-1" } as { id: string } | null,
  };
  const api = usePostShare({
    t: (key: string) => key,
    getPost: () => calls.post,
    sharePost: async (postId: string, comment?: string) => {
      calls.shared.push({ postId, comment });
      if (calls.shareErrorMessage) throw new Error("store-failed");
    },
    getShareErrorMessage: () => calls.shareErrorMessage,
    ...overrides,
  });
  return { api, calls };
}

describe("use-post-share：转发弹窗三态", () => {
  it("打开弹窗清空附言（重来不残留上次输入）", () => {
    const { api } = makeShare();
    api.shareComment.value = "上次的附言";
    api.openShareModal();
    expect(api.showShareModal.value).toBe(true);
    expect(api.shareComment.value).toBe("");
  });

  it("帖子未加载时打开跳过（不弹空窗）", () => {
    const { api, calls } = makeShare();
    calls.post = null;
    api.openShareModal();
    expect(api.showShareModal.value).toBe(false);
  });

  it("关闭弹窗并清空附言", () => {
    const { api } = makeShare();
    api.openShareModal();
    api.shareComment.value = "写了一半";
    api.closeShareModal();
    expect(api.showShareModal.value).toBe(false);
    expect(api.shareComment.value).toBe("");
  });
});

describe("use-post-share：确认转发", () => {
  it("成功：走 store（附言空白转 undefined）、关弹窗、清附言、success toast", async () => {
    const { api, calls } = makeShare();
    const toasts: string[] = [];
    const restore = recordToasts(toasts);
    api.openShareModal();
    api.shareComment.value = "  推荐给朋友  ";
    await api.confirmShare();
    restore();
    expect(calls.shared).toEqual([{ postId: "p-1", comment: "推荐给朋友" }]);
    expect(api.showShareModal.value).toBe(false);
    expect(api.shareComment.value).toBe("");
    expect(toasts).toEqual(["village.detail.shareSuccess"]);
  });

  it("附言纯空白 → comment 传 undefined（与 trim 后空串同语义）", async () => {
    const { api, calls } = makeShare();
    api.openShareModal();
    api.shareComment.value = "   ";
    await api.confirmShare();
    expect(calls.shared).toEqual([{ postId: "p-1", comment: undefined }]);
  });

  it("失败：toast 后端文案，弹窗不关、附言保留可重试", async () => {
    const { api, calls } = makeShare();
    calls.shareErrorMessage = "转发频次已达上限";
    const toasts: string[] = [];
    const restore = recordToasts(toasts);
    api.openShareModal();
    api.shareComment.value = "想保留的附言";
    await api.confirmShare();
    restore();
    expect(toasts).toEqual(["转发频次已达上限"]);
    expect(api.showShareModal.value).toBe(true, "失败必须留在弹窗里可重试");
    expect(api.shareComment.value).toBe("想保留的附言", "附言不得被失败清空");
  });

  it("失败且无后端文案 → 兜底文案", async () => {
    const { api } = makeShare({
      sharePost: async () => {
        throw new Error("x");
      },
      getShareErrorMessage: () => null,
    });
    const toasts: string[] = [];
    const restore = recordToasts(toasts);
    await api.confirmShare();
    restore();
    expect(toasts).toEqual(["village.detail.shareFailed"]);
  });

  it("isSharing 全程防重入：成功/失败后均复位", async () => {
    const { api } = makeShare();
    await api.confirmShare();
    expect(api.isSharing.value).toBe(false);
    const { api: failApi, calls } = makeShare();
    calls.shareErrorMessage = "err";
    await failApi.confirmShare();
    expect(failApi.isSharing.value).toBe(false);
  });

  it("帖子未加载时确认跳过（不发请求）", async () => {
    const { api, calls } = makeShare();
    calls.post = null;
    await api.confirmShare();
    expect(calls.shared).toEqual([]);
  });
});
