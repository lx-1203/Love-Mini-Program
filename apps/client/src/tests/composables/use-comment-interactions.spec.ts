import { afterEach, describe, expect, it, vi } from "vitest";
import { useCommentInteractions } from "../../subpackages/village/village/use-comment-interactions";
import type { CommentItem } from "../../stores/village/types";

/**
 * R3 第二刀（2026-11-05，第八辑）：评论区交互组 composable 守护单测。
 *
 * <p>覆盖从 detail.vue 抽出时的全部历史修复语义：回复必聚焦弹键盘（R16）、
 * 取消回复清空输入（逐行等价）、>3 条回复默认收起+展开（R16）、
 * 点赞失败用户可见 toast（R16）。uni 桩还原遵循 R7-8 纪律（afterEach 兜底）。</p>
 */

const uniOriginals = new Map<string, unknown>();

function stubUni(
  name: string,
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

afterEach(() => {
  vi.restoreAllMocks();
  const holder = uni as unknown as Record<string, unknown>;
  for (const [name, original] of uniOriginals) {
    holder[name] = original;
  }
  uniOriginals.clear();
});

function comment(id: string, replies: CommentItem[] = []): CommentItem {
  return {
    id,
    author: { userId: "u-1", name: "林同学" },
    content: "评论内容",
    createdAt: "2026-11-05 10:00:00",
    likes: 0,
    isLiked: false,
    replies,
  } as unknown as CommentItem;
}

function makeInteractions(overrides: Partial<Parameters<typeof useCommentInteractions>[0]> = {}) {
  const calls = {
    likedIds: [] as string[],
    focusCount: 0,
    toasts: [] as string[],
  };
  const api = useCommentInteractions({
    t: (key: string, named?: Record<string, unknown>) =>
      named && named.name ? `${key}:{name=${String(named.name)}}` : key,
    likeComment: async (commentId: string) => {
      calls.likedIds.push(commentId);
    },
    focusInput: () => {
      calls.focusCount += 1;
    },
    ...overrides,
  });
  return { api, calls };
}

describe("use-comment-interactions：楼中楼回复模式（P1-02/R16）", () => {
  it("startReply 进入回复模式并聚焦输入框（R16：键盘必须弹起）", () => {
    const { api, calls } = makeInteractions();
    const target = comment("c-1");
    api.startReply(target);
    expect(api.replyingTo.value?.id).toBe("c-1");
    expect(calls.focusCount).toBe(1);
  });

  it("replyPlaceholder 回复模式带昵称、普通模式用默认占位", () => {
    const { api } = makeInteractions();
    expect(api.replyPlaceholder.value).toBe("village.commentPlaceholder");
    api.startReply(comment("c-1"));
    expect(api.replyPlaceholder.value).toBe(
      "village.detail.replyToPlaceholder:{name=林同学}",
    );
  });

  it("cancelReply 退出回复模式并清空输入内容（逐行等价）", () => {
    const { api } = makeInteractions();
    api.startReply(comment("c-1"));
    api.commentContent.value = "写了一半的回复";
    api.cancelReply();
    expect(api.replyingTo.value).toBeNull();
    expect(api.commentContent.value).toBe("");
  });
});

describe("use-comment-interactions：楼中楼展开/收起（R16）", () => {
  const fourReplies = [comment("r-1"), comment("r-2"), comment("r-3"), comment("r-4")];

  it(">3 条回复默认收起，只露前 3 条", () => {
    const { api } = makeInteractions();
    const root = comment("c-1", fourReplies);
    expect(api.isRepliesCollapsed(root)).toBe(true);
    expect(api.visibleReplies(root)).toHaveLength(3);
    expect(api.visibleReplies(root)[0]?.id).toBe("r-1");
  });

  it("toggleReplies 展开后全量可见，再 toggle 收起（R16：收起必须有展开按钮）", () => {
    const { api } = makeInteractions();
    const root = comment("c-1", fourReplies);
    api.toggleReplies(root);
    expect(api.isRepliesCollapsed(root)).toBe(false);
    expect(api.visibleReplies(root)).toHaveLength(4);
    api.toggleReplies(root);
    expect(api.isRepliesCollapsed(root)).toBe(true);
  });

  it("≤3 条回复永不收起", () => {
    const { api } = makeInteractions();
    const root = comment("c-1", [comment("r-1"), comment("r-2")]);
    expect(api.isRepliesCollapsed(root)).toBe(false);
    expect(api.visibleReplies(root)).toHaveLength(2);
  });

  it("replies 缺失（undefined）视作空，不抛错", () => {
    const { api } = makeInteractions();
    const root = comment("c-1");
    expect(api.visibleReplies(root)).toEqual([]);
  });

  it("展开状态按根评论 id 独立（互不影响）", () => {
    const { api } = makeInteractions();
    const a = comment("c-1", fourReplies);
    const b = comment("c-2", fourReplies);
    api.toggleReplies(a);
    expect(api.isRepliesCollapsed(a)).toBe(false);
    expect(api.isRepliesCollapsed(b)).toBe(true);
  });
});

describe("use-comment-interactions：评论点赞（R16 失败可见）", () => {
  it("点赞走注入的 likeComment", async () => {
    const { api, calls } = makeInteractions();
    await api.handleCommentLike("c-1");
    expect(calls.likedIds).toEqual(["c-1"]);
  });

  it("失败必须 toast（此前仅 console.error，用户「点了没反应」）", async () => {
    const toasts: string[] = [];
    const restore = stubUni("showToast", ((opts: { title: string }) => {
      toasts.push(opts.title);
    }) as never);
    const { api } = makeInteractions({
      likeComment: async () => {
        throw new Error("network");
      },
    });
    await api.handleCommentLike("c-1");
    restore();
    expect(toasts).toEqual(["village.likeFailed"]);
  });
});

describe("use-comment-interactions：评论图片预览", () => {
  it("走 uni.previewImage 原生查看器（urls+current 直通）", () => {
    const previews: Array<{ urls: string[]; current: number }> = [];
    const restore = stubUni("previewImage", ((opts: { urls: string[]; current: number }) => {
      previews.push(opts);
    }) as never);
    const { api } = makeInteractions();
    api.previewCommentImage(["a.png", "b.png"], 1);
    restore();
    expect(previews).toEqual([{ urls: ["a.png", "b.png"], current: 1 }]);
  });
});
