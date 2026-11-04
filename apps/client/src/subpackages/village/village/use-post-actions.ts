/**
 * 帖子详情页「长按操作组」composable（R3 首刀，2026-11-05，第七辑）。
 *
 * <p>从 {@code village/detail.vue} 抽出的内聚块：帖子长按菜单（复制/举报/〔作者〕编辑/删除）、
 * 作者删除三段式（二次确认→store 删除→失败可见）、评论举报三段式（选原因→可选描述→提交）。
 * 对应第六辑 R6-5 评估结论——本块依赖 currentPost/isOwnPost/双 store/i18n/goBack/handleReportPost
 * 六处上下文，按 N-5 先例（use-typing-indicator.ts）以回调注入全部依赖，composable 零全局依赖、可单测。</p>
 *
 * <p><b>逻辑与抽取前逐行等价</b>（含全部历史修复注释语义）：
 * 复制走 uni.setClipboardData；编辑跳统一发布页 ?edit= 态（P1-1）；
 * 删除三段不许静默（2026-10-31）；举报原因 noUncheckedIndexedAccess 兜底；
 * 作者判定只控菜单可见性，授权由后端 403 兜底。</p>
 */
import { computed } from "vue";

/** 帖子操作菜单依赖注入（全部经回调，composable 零依赖） */
export interface UsePostActionsOptions {
  /** i18n 翻译函数（页面 useI18n().t） */
  t: (key: string) => string;
  /** 当前帖子（null=未加载，全部操作跳过） */
  getPost: () => { id: string; content: string } | null;
  /** 是否作者本人（只控菜单可见性；授权由后端 403 兜底） */
  isOwnPost: () => boolean;
  /** 删除帖子（villageStore.deletePost；后端幂等，重复删恒 200） */
  deletePost: (postId: string) => Promise<void>;
  /** 删除失败文案来源（villageStore.errorMessage: string | null，null/空串走兜底文案） */
  getDeleteErrorMessage: () => string | null;
  /** 举报提交（reportStore.reportTarget("COMMENT", ...)；返回值仅用于调用方 toast 判断，composable 不消费） */
  reportComment: (commentId: string, reason: string, description?: string) => Promise<unknown>;
  /** 打开帖子举报弹窗（页面内 showReportDialog=true 的包装） */
  onReportPost: () => void;
  /** 返回上一页（删除成功后离开详情） */
  goBack: () => void;
}

export function usePostActions(options: UsePostActionsOptions) {
  const { t } = options;

  /** 举报原因选项（与产品约定，覆盖常见违规场景） */
  const REPORT_REASONS = computed(() => [
    t("village.detail.reportReasonSpam"),
    t("village.detail.reportReasonAbuse"),
    t("village.detail.reportReasonPorn"),
    t("village.detail.reportReasonIllegal"),
    t("village.detail.reportReasonOther"),
  ]);

  /**
   * 作者删除自己的帖子（2026-10-31）。
   *
   * <p>三段都必须显式落地，任何一段都不许静默：</p>
   * <ol>
   *   <li>二次确认（删除是不可逆操作，误触成本由确认弹窗兜住）；
   *       确认弹窗自身起不来 ⇒ 提示失败，不当成「用户取消」；</li>
   *   <li>调用 store（real 档 DELETE /api/v1/posts/{id}；后端幂等，重复删恒 200）；</li>
   *   <li>失败 ⇒ 一律 toast 后端文案（403/404/429）或兜底文案，<b>留在当前页</b>，
   *       帖子仍在列表里可重试。绝不用空 catch 把失败吞成「看起来删掉了」——
   *       那是本仓已多次复发的缺陷形态。</li>
   * </ol>
   */
  async function handleDeletePost() {
    const post = options.getPost();
    if (!post) return;

    let confirmed = false;
    try {
      const res = await uni.showModal({
        title: t("village.detail.deleteConfirmTitle"),
        content: t("village.detail.deleteConfirmContent"),
        confirmText: t("village.detail.deleteConfirmOk"),
        cancelText: t("village.detail.deleteConfirmCancel"),
      });
      confirmed = !!res.confirm;
    } catch (modalError: unknown) {
      // 弹窗起不来（低版本容器/被系统打断）也要让用户知道操作没生效
      console.error("删除确认弹窗不可用:", modalError);
      uni.showToast({ title: t("village.detail.deleteFailed"), icon: "none" });
      return;
    }
    if (!confirmed) return; // 用户主动取消：不删、不报错

    try {
      await options.deletePost(post.id);
      uni.showToast({ title: t("village.detail.deleteSuccess"), icon: "success" });
      // 成功后帖子已不在数据源里，停留在详情只会渲染一条 404 的空壳 ⇒ 回村口列表
      options.goBack();
    } catch (error: unknown) {
      console.error("删除帖子失败:", error);
      uni.showToast({
        title: options.getDeleteErrorMessage() || t("village.detail.deleteFailed"),
        icon: "none",
      });
    }
  }

  /**
   * 长按帖子正文 / 顶部三点菜单：弹出操作菜单（复制内容 / 举报 /〔作者本人〕编辑/删除）。
   * P2 修复（长按复制支持）：
   * - 复制内容：调用 uni.setClipboardData 将帖子正文写入剪贴板
   * - 举报：复用 onReportPost 触发举报弹窗
   * 2026-10-31 用户内容生命周期：作者本人的帖子追加「删除」项（非作者看不到该项，
   * 后端仍有 403 兜底——前端的可见性只是体验，不是授权）。
   * P1-1（2026-11-03）：作者本人追加「编辑」项（置于删除前）——跳转统一发布页编辑态
   * （?edit=<postId>），只改 title/content/tags/images，提交后帖子回待审。
   * 使用 uni.showActionSheet 弹出原生操作菜单，与系统交互一致。
   */
  async function handlePostLongpress() {
    // 快照式守卫（与原版「守卫后每次重读」的唯一差异）：竞态下（菜单弹出期间帖子被清空）
    // 原版 null.id 会 throw 并被下方 catch 吞成无反馈；快照版操作针对菜单时刻的帖子，行为可预期。
    const post = options.getPost();
    if (!post) return;
    // 操作菜单：复制 + 举报 +〔仅作者〕编辑/删除（Task 28: 文案走 i18n）
    const copyContentLabel = t("village.detail.copyContent");
    const reportLabel = t("village.detail.reportAction");
    const editLabel = options.isOwnPost() ? t("village.detail.editAction") : "";
    const deleteLabel = options.isOwnPost() ? t("village.detail.deleteAction") : "";
    const actions = deleteLabel
      ? [copyContentLabel, reportLabel, editLabel, deleteLabel]
      : [copyContentLabel, reportLabel];
    try {
      const res = await uni.showActionSheet({ itemList: actions });
      const action = actions[res.tapIndex] ?? actions[0] ?? "";
      if (action === copyContentLabel) {
        // 调用 uni.setClipboardData 写入剪贴板
        uni.setClipboardData({
          data: post.content || "",
          fail: () => {
            uni.showToast({ title: t("village.detail.copyFailed"), icon: "none" });
          },
        });
      } else if (action === reportLabel) {
        // 触发举报弹窗
        options.onReportPost();
      } else if (editLabel !== "" && action === editLabel) {
        // P1-1（2026-11-03）：作者编辑——跳统一发布页编辑态（publish.vue 解析 ?edit= 回填）。
        // 作者判定仅控制菜单可见性，非作者直链进入时后端 PUT 403 兜底
        uni.navigateTo({
          url: `/subpackages/village/village/publish?edit=${encodeURIComponent(post.id)}`,
        });
      } else if (deleteLabel !== "" && action === deleteLabel) {
        // 作者删除自己的帖子（二次确认 + 失败可见）
        await handleDeletePost();
      }
    } catch (_e) {
      // 用户取消选择，静默退出
    }
  }

  /**
   * 长按评论触发举报流程。
   * 1. 弹出 ActionSheet 选择举报原因
   * 2. 弹出 Modal 收集可选补充描述
   * 3. 调用后端举报接口持久化
   *
   * @param comment 被举报的评论对象
   */
  async function handleReportComment(comment: { id: string }) {
    // 1. 选择举报原因
    let reason: string;
    try {
      const reasons = REPORT_REASONS.value;
      const res = await uni.showActionSheet({ itemList: reasons });
      // 修复（严格模式 noUncheckedIndexedAccess）：reasons[res.tapIndex] 索引访问返回 string | undefined，
      // 此处兜底取第一项，确保 reason 始终为 string（与 itemList 一一对应，正常流程不会越界）。
      reason = reasons[res.tapIndex] ?? reasons[0] ?? "";
    } catch (_e) {
      // 用户取消选择，静默退出
      return;
    }

    // 2. 收集可选补充描述
    let description: string | undefined;
    try {
      const res = await uni.showModal({
        title: t("village.detail.reportDescTitle"),
        editable: true,
        placeholderText: t("village.detail.reportDescPlaceholder"),
        confirmText: t("village.detail.reportSubmit"),
        cancelText: t("village.detail.reportSkip"),
      });
      if (res.confirm && res.content) {
        description = res.content;
      }
    } catch (_e) {
      // 取消则不附加描述，继续提交
    }

    // 3. 调用举报接口
    try {
      await options.reportComment(comment.id, reason, description);
      uni.showToast({ title: t("village.detail.reportSubmitted"), icon: "success" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("village.detail.reportFailed");
      uni.showToast({ title: message, icon: "none" });
    }
  }

  return {
    REPORT_REASONS,
    handlePostLongpress,
    handleDeletePost,
    handleReportComment,
  };
}
