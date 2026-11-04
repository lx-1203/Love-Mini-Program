/**
 * 帖子详情页「评论区交互组」composable（R3 第二刀，2026-11-05，第八辑）。
 *
 * <p>从 {@code village/detail.vue} 抽出的内聚块：楼中楼回复模式（P1-02/R16）、
 * 回复展开/收起（>3 默认收起）、评论点赞（R16 失败可见）、评论图片预览。
 * 与 {@link use-post-actions}（首刀）同构：依赖全回调注入、零全局依赖、可独立单测。</p>
 *
 * <p><b>逻辑与抽取前逐行等价</b>（含历史修复语义：回复必聚焦弹键盘〔R16〕、
 * 收起必有展开按钮〔R16〕、点赞失败 toast 而非仅 console〔R16〕）。</p>
 */
import { computed, ref } from "vue";
import type { CommentItem } from "../../../stores/village/types";

/** 评论区交互依赖注入（全部经回调，composable 零依赖） */
export interface UseCommentInteractionsOptions {
  /** i18n 翻译函数（页面 useI18n().t） */
  t: (key: string, named?: Record<string, unknown>) => string;
  /** 点赞评论（villageStore.likeComment） */
  likeComment: (commentId: string) => Promise<void>;
  /** 聚焦评论输入框（页面 focusCommentInput：触觉+下一 tick 弹键盘） */
  focusInput: () => void;
}

export function useCommentInteractions(options: UseCommentInteractionsOptions) {
  const { t } = options;

  /**
   * P1-02 楼中楼：正在回复的根评论（null 表示普通根评论输入）。
   * 点击某条根评论的「回复」按钮后置为对应评论，提交时携带其 id 作为 parentId。
   */
  const replyingTo = ref<CommentItem | null>(null);

  /** 评论输入内容（输入框 v-model；取消回复时随模式一并清空） */
  const commentContent = ref("");

  /** 回复模式下输入框 placeholder（"回复 @昵称"）；普通模式为理想图「说点什么...」 */
  const replyPlaceholder = computed(() =>
    replyingTo.value
      ? t("village.detail.replyToPlaceholder", { name: replyingTo.value.author.name })
      : t("village.commentPlaceholder"),
  );

  /** 展开状态按根评论 id 记录（>3 条回复默认收起） */
  const expandedReplies = ref<Set<string>>(new Set());

  /** 评论图片预览（uni 原生查看器） */
  function previewCommentImage(images: string[], current: number) {
    uni.previewImage({ urls: images, current });
  }

  /**
   * P1-02 楼中楼：点击根评论「回复」按钮，进入回复模式。
   * 输入框聚焦后提交将携带 parentId。
   * R16：补输入框聚焦 + 键盘弹起（此前只有提示条变化，用户感知「无法回复」）。
   */
  function startReply(comment: CommentItem) {
    replyingTo.value = comment;
    options.focusInput();
  }

  /** R16：展开/收起楼中楼（>3 条回复默认收起，此前的收起没有展开按钮） */
  function toggleReplies(comment: CommentItem) {
    const next = new Set(expandedReplies.value);
    if (next.has(comment.id)) {
      next.delete(comment.id);
    } else {
      next.add(comment.id);
    }
    expandedReplies.value = next;
  }

  /** 取消回复模式（不提交；输入内容一并清空——与抽取前逐行等价） */
  function cancelReply() {
    replyingTo.value = null;
    commentContent.value = "";
  }

  /** 该根评论的楼中楼是否处于收起态（>3 条且未展开） */
  function isRepliesCollapsed(comment: CommentItem): boolean {
    const replies = comment.replies ?? [];
    return replies.length > 3 && !expandedReplies.value.has(comment.id);
  }

  /** 楼中楼可见回复（收起态只露前 3 条） */
  function visibleReplies(comment: CommentItem): CommentItem[] {
    const replies = comment.replies ?? [];
    return isRepliesCollapsed(comment) ? replies.slice(0, 3) : replies;
  }

  /**
   * 点赞/取消点赞评论
   * R16：失败补用户可见 toast（此前仅 console.error，用户侧表现为"点了没反应"）
   */
  async function handleCommentLike(commentId: string) {
    try {
      await options.likeComment(commentId);
    } catch (error) {
      console.error("评论点赞失败:", error);
      uni.showToast({ title: t("village.likeFailed"), icon: "none" });
    }
  }

  return {
    replyingTo,
    commentContent,
    replyPlaceholder,
    expandedReplies,
    previewCommentImage,
    startReply,
    toggleReplies,
    cancelReply,
    isRepliesCollapsed,
    visibleReplies,
    handleCommentLike,
  };
}
