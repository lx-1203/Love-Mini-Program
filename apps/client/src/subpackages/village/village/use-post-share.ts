/**
 * 帖子详情页「转发弹窗」composable（R3 第三刀，2026-11-05，第九辑）。
 *
 * <p>从 {@code village/detail.vue} 抽出的内聚块：转发弹窗三态（打开/关闭/确认提交）。
 * 与前两刀（use-post-actions/use-comment-interactions）同构：依赖全回调注入、
 * 零全局依赖、可独立单测。</p>
 *
 * <p><b>逻辑与抽取前逐行等价</b>：打开清空附言；确认走 store 转发（sharePost），
 * 成功关弹窗+success toast；失败 toast 后端文案或兜底（不关弹窗，附言保留可重试）；
 * isSharing 全程防重入（finally 复位）。noop 为 mp-weixin catchtap 占位
 * （catchtap 必须绑定 handler）随组迁移。</p>
 */
import { ref } from "vue";

/** 转发弹窗依赖注入（全部经回调，composable 零依赖） */
export interface UsePostShareOptions {
  /** i18n 翻译函数（页面 useI18n().t） */
  t: (key: string) => string;
  /** 当前帖子（null=未加载，打开/确认跳过） */
  getPost: () => { id: string } | null;
  /** 转发提交（villageStore.sharePost；附言空串转 undefined） */
  sharePost: (postId: string, comment?: string) => Promise<void>;
  /** 转发失败文案来源（villageStore.errorMessage: string | null，null/空串走兜底） */
  getShareErrorMessage: () => string | null;
}

export function usePostShare(options: UsePostShareOptions) {
  const { t } = options;

  /** 转发弹窗是否显示 */
  const showShareModal = ref(false);
  /** 转发附言（打开时清空；失败保留可重试） */
  const shareComment = ref("");
  /** 提交中（防重入；finally 复位） */
  const isSharing = ref(false);

  /** 打开转发弹窗（附言清空重来） */
  function openShareModal() {
    if (!options.getPost()) return;
    shareComment.value = "";
    showShareModal.value = true;
  }

  /** 关闭转发弹窗（附言一并清空） */
  function closeShareModal() {
    showShareModal.value = false;
    shareComment.value = "";
  }

  /**
   * 确认转发：成功关弹窗+toast；失败 toast 后端文案/兜底（弹窗不关、附言保留可重试）。
   */
  async function confirmShare() {
    const post = options.getPost();
    if (!post) return;

    isSharing.value = true;
    try {
      await options.sharePost(post.id, shareComment.value.trim() || undefined);
      showShareModal.value = false;
      shareComment.value = "";
      uni.showToast({ title: t("village.detail.shareSuccess"), icon: "success" });
    } catch (_error) {
      uni.showToast({
        title: options.getShareErrorMessage() || t("village.detail.shareFailed"),
        icon: "none",
      });
    } finally {
      isSharing.value = false;
    }
  }

  return {
    showShareModal,
    shareComment,
    isSharing,
    openShareModal,
    closeShareModal,
    confirmShare,
  };
}
