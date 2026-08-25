<script setup lang="ts">
/**
 * 帖子详情页
 * 展示完整帖子内容、评论列表和互动功能
 * 包含作者交互卡片（关注/私信/校友标签）、相似作者推荐和转发功能
 */
import { ref, computed } from "vue";
import { onLoad, onUnload, onShareAppMessage, onShareTimeline } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useVillageStore, formatRelativeTime, type CommentItem } from "../../stores/village";
// R4-00087：评论分页加载更多（契约 CommentListResponse 含 total/page/pageSize）
import { mapToCommentItem } from "../../stores/village/utils";
import type { CommentListResponse } from "../../stores/village/types";
import { request } from "../../services/http";
import { useMock } from "../../stores/helpers/use-mock";
import { useMessagesStore } from "../../stores/messages";
import { useReportStore } from "../../stores/report";
// 修复（严格模式 noUnusedLocals）：useSessionStore 导入后未使用，已移除。
import { openAppPath } from "../../utils/navigation";
// R4-00088：页面跳转路径统一走 ROUTES 常量
import { ROUTES } from "../../constants/routes";
import SafeImage from "../../components/common/SafeImage.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import PostReportDialog from "../../components/social/PostReportDialog.vue";
// 2026-08-08 频道化重构：帖子详情页活动卡（活动链接帖展开）
import ActivityCard from "../../components/village/ActivityCard.vue";
import { IMAGE_PATHS } from "../../config/images";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";

const villageStore = useVillageStore();
const messagesStore = useMessagesStore();
const reportStore = useReportStore();
const { t } = useI18n();
// 修复（严格模式 noUnusedLocals）：sessionStore 声明后未在脚本/模板引用，已移除。
// 修复（严格模式 noUnusedLocals）：loadingSimilarAuthors 从 storeToRefs 解构后未引用，已移除。
const { currentPost, comments, loading, similarAuthors } = storeToRefs(villageStore);

/**
 * R4-00086：昵称首字符兜底（author.name 为空/null 时返回占位符，
 * 避免 name[0] 抛 TypeError 中断渲染）。
 */
function initialOf(name?: string | null): string {
  return name && name.length > 0 ? name.charAt(0) : "?";
}

/** 评论输入内容 */
const commentContent = ref("");
/** 是否正在提交评论 */
const isSubmitting = ref(false);
/**
 * P1-02 楼中楼：正在回复的根评论（null 表示普通根评论输入）。
 * 点击某条根评论的「回复」按钮后置为对应评论，提交时携带其 id 作为 parentId。
 */
const replyingTo = ref<CommentItem | null>(null);

/** 回复模式下输入框 placeholder（"回复 @昵称"） */
const replyPlaceholder = computed(() =>
  replyingTo.value
    ? t("village.detail.replyToPlaceholder", { name: replyingTo.value.author.name })
    : t("village.detail.commentInputPlaceholder"),
);
/** 转发弹窗是否显示 */
const showShareModal = ref(false);
/** 转发附加评论 */
const shareComment = ref("");
/** 是否正在转发 */
const isSharing = ref(false);
/** 帖子举报弹窗是否显示 */
const showReportDialog = ref(false);

/* ========== R4-00087：评论分页加载更多 ========== */
/** 当前已加载的评论页码（从第 1 页开始） */
const commentPage = ref(1);
/** 评论分页大小（对齐后端默认/契约 pageSize） */
const COMMENT_PAGE_SIZE = 20;
/** 是否正在加载更多评论 */
const loadingMoreComments = ref(false);
/** 是否还有更多评论（服务端总数 > 已加载根评论数；mock 模式一次性返回全部，无分页） */
const commentHasMore = computed(() => {
  if (useMock()) return false;
  return comments.value.length < (currentPost.value?.comments ?? 0);
});

/**
 * 加载下一页评论（后端 GET /posts/{postId}/comments 支持 page/pageSize 分页）。
 * 追加到 store 的 comments 列表，与首屏 fetchComments 共用渲染。
 */
async function loadMoreComments(): Promise<void> {
  const post = currentPost.value;
  if (!post || loadingMoreComments.value || !commentHasMore.value) return;
  loadingMoreComments.value = true;
  try {
    const data = await request<CommentListResponse>({
      url: `/posts/${post.id}/comments`,
      method: "GET",
      data: { page: commentPage.value + 1, pageSize: COMMENT_PAGE_SIZE },
    });
    commentPage.value = data.page;
    villageStore.comments = [
      ...villageStore.comments,
      ...data.items.map(mapToCommentItem),
    ];
  } catch (_e) {
    uni.showToast({ title: t("village.detail.loadMoreCommentsFailed"), icon: "none" });
  } finally {
    loadingMoreComments.value = false;
  }
}

function goToUserProfile(userId: string | number | undefined) {
  if (userId == null || userId === "") return;
  openAppPath(`${ROUTES.PROFILE.INDEX}?userId=${userId}`);
}

/**
 * 2026-08-08 贴吧式楼中楼：根评论的楼中楼回复默认收起（展示"展开 X 条回复"），
 * 点击展开/收起；replies 超 3 条时默认收起，否则直接展示。
 */
const expandedReplies = ref<Set<string>>(new Set());

function isRepliesCollapsed(comment: CommentItem): boolean {
  const replies = comment.replies ?? [];
  return replies.length > 3 && !expandedReplies.value.has(comment.id);
}

function visibleReplies(comment: CommentItem): CommentItem[] {
  const replies = comment.replies ?? [];
  return isRepliesCollapsed(comment) ? replies.slice(0, 3) : replies;
}

/**
 * SubTask 5.5.2：图片加载失败 key 集合。
 *
 * <p>记录已触发 @error 的图片唯一 key，模板通过 contains 判断切换为占位元素，
 * 避免 broken image 残留显示。key 命名规则：</p>
 * <ul>
 *   <li>{@code author} — 作者头像</li>
 *   <li>{@code comment-{id}} — 评论头像</li>
 *   <li>{@code similar-{userId}} — 相似作者头像</li>
 *   <li>{@code post-img-{idx}} — 帖子正文图片</li>
 * </ul>
 */
const failedImageKeys = ref<Set<string>>(new Set());

/**
 * SubTask 5.5.2：图片 @error 回调。
 *
 * <p>将失败图片的 key 加入集合，触发模板 v-if 切换为占位元素（首字 / 默认占位图）。
 * 同一 key 仅记录一次，避免重复触发。</p>
 *
 * @param key 图片唯一标识
 */
function onImageError(key: string) {
  if (!failedImageKeys.value.has(key)) {
    failedImageKeys.value = new Set(failedImageKeys.value).add(key);
  }
}

/** SubTask 5.5.2：判断图片是否已失败，用于模板 v-if 切换占位元素 */
function isImageFailed(key: string): boolean {
  return failedImageKeys.value.has(key);
}


/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
// R4-00159：页面卸载时清理 village store 定时器/请求资源（评论防抖、点赞 in-flight 等）
onUnload(() => {
  villageStore.dispose();
});

/**
 * 返回上一页
 */
function goBack() {
  uni.navigateBack();
}

/** 举报原因选项（与产品约定，覆盖常见违规场景） */
const REPORT_REASONS = computed(() => [
  t("village.detail.reportReasonSpam"),
  t("village.detail.reportReasonAbuse"),
  t("village.detail.reportReasonPorn"),
  t("village.detail.reportReasonIllegal"),
  t("village.detail.reportReasonOther"),
]);

/**
 * 长按帖子正文：弹出操作菜单（复制内容 / 举报）。
 * P2 修复（长按复制支持）：
 * - 复制内容：调用 uni.setClipboardData 将帖子正文写入剪贴板
 * - 举报：复用 handleReportPost 触发举报弹窗
 * 使用 uni.showActionSheet 弹出原生操作菜单，与系统交互一致。
 */
async function handlePostLongpress() {
  if (!currentPost.value) return;
  // 操作菜单：复制 + 举报（Task 28: 文案走 i18n）
  const copyContentLabel = t("village.detail.copyContent");
  const reportLabel = t("village.detail.reportAction");
  const actions = [copyContentLabel, reportLabel];
  try {
    const res = await uni.showActionSheet({ itemList: actions });
    const action = actions[res.tapIndex] ?? actions[0] ?? "";
    if (action === copyContentLabel) {
      // 调用 uni.setClipboardData 写入剪贴板
      uni.setClipboardData({
        data: currentPost.value.content || "",
        fail: () => {
          uni.showToast({ title: t("village.detail.copyFailed"), icon: "none" });
        },
      });
    } else if (action === reportLabel) {
      // 触发举报弹窗
      handleReportPost();
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
    await reportStore.reportTarget("COMMENT", comment.id, reason, description);
    uni.showToast({ title: t("village.detail.reportSubmitted"), icon: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("village.detail.reportFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/**
 * 跳转标签聚合页
 */
function goToTagPosts(tagName: string) {
  const cleanTag = tagName.startsWith("#") ? tagName.slice(1) : tagName;
  openAppPath(`${ROUTES.VILLAGE.TAG_POSTS}?tagName=${encodeURIComponent(cleanTag)}`);
}

/**
 * 2026-08-08 频道化重构：跳转活动详情页（帖子内活动卡）
 */
function goToActivityDetail(activityId: number | string) {
  openAppPath(`${ROUTES.ACTIVITY_DETAIL}?id=${encodeURIComponent(String(activityId))}`);
}

/**
 * 打开帖子举报弹窗。
 * 由顶部「举报」按钮触发，弹窗内部负责原因选择与 API 调用。
 */
function handleReportPost() {
  if (!currentPost.value) return;
  showReportDialog.value = true;
}

/**
 * 帖子举报提交成功回调。
 * 由 PostReportDialog submitted 事件触发，关闭弹窗并提示用户。
 */
function handleReportSubmitted() {
  showReportDialog.value = false;
}

/**
 * 处理点赞
 */
async function handleLike() {
  if (!currentPost.value) return;
  try {
    await villageStore.likePost(currentPost.value.id);
  } catch (error) {
    // review #41：原实现仅 console.error 静默失败，现补充用户可见提示
    console.error("点赞失败:", error);
    uni.showToast({ title: t("village.likeFailed"), icon: "none" });
  }
}

/**
 * 处理关注
 */
async function handleFollow() {
  if (!currentPost.value) return;
  try {
    await villageStore.followUser(currentPost.value.author.userId);
  } catch (error) {
    // review #41：原实现仅 console.error 静默失败，现补充用户可见提示
    console.error("关注失败:", error);
    uni.showToast({ title: t("village.followFailed"), icon: "none" });
  }
}

/**
 * 提交评论（P1-02：回复模式下携带 parentId 创建楼中楼回复）
 */
async function submitComment() {
  if (!currentPost.value || !commentContent.value.trim()) return;

  isSubmitting.value = true;
  try {
    await villageStore.commentPost(
      currentPost.value.id,
      commentContent.value.trim(),
      replyingTo.value?.id ?? undefined,
    );
    commentContent.value = "";
    replyingTo.value = null;
    uni.showToast({ title: t("village.commentSuccess"), icon: "success" });
  } catch (_error) {
    uni.showToast({
      title: villageStore.errorMessage || t("village.detail.commentFailed"),
      icon: "none",
    });
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * P1-02 楼中楼：点击根评论「回复」按钮，进入回复模式。
 * 输入框聚焦后提交将携带 parentId。
 */
function startReply(comment: CommentItem) {
  replyingTo.value = comment;
}

/** 取消回复模式（不提交） */
function cancelReply() {
  replyingTo.value = null;
  commentContent.value = "";
}

/**
 * 点赞/取消点赞评论
 */
async function handleCommentLike(commentId: string) {
  try {
    await villageStore.likeComment(commentId);
  } catch (error) {
    console.error("评论点赞失败:", error);
  }
}

/**
 * 打开转发弹窗
 */
function openShareModal() {
  if (!currentPost.value) return;
  shareComment.value = "";
  showShareModal.value = true;
}

/**
 * 关闭转发弹窗
 */
/* ========== 空操作占位（catchtap 占位 handler，mp-weixin 要求 catchtap 必须绑定 handler） ========== */
function noop() {}

function closeShareModal() {
  showShareModal.value = false;
  shareComment.value = "";
}

/**
 * 确认转发
 */
async function confirmShare() {
  if (!currentPost.value) return;

  isSharing.value = true;
  try {
    await villageStore.sharePost(currentPost.value.id, shareComment.value.trim() || undefined);
    showShareModal.value = false;
    shareComment.value = "";
    uni.showToast({ title: t("village.detail.shareSuccess"), icon: "success" });
  } catch (_error) {
    uni.showToast({
      title: villageStore.errorMessage || t("village.detail.shareFailed"),
      icon: "none",
    });
  } finally {
    isSharing.value = false;
  }
}

/**
 * 关注/取消关注相似作者
 */
async function handleFollowSimilarAuthor(userId: string) {
  try {
    await villageStore.followUser(userId);
    // 同步更新相似作者列表中的 isFollowed 状态
    const author = similarAuthors.value.find((a) => a.userId === userId);
    if (author) {
      author.isFollowed = !author.isFollowed;
    }
  } catch (error) {
    console.error("关注相似作者失败:", error);
  }
}

/**
 * 私信相似作者
 */
function sendMessageToSimilarAuthor(userId: string) {
  const existingSession = messagesStore.sessions.find(
    (s) => s.partnerId === userId && s.sessionType === "private"
  );
  if (existingSession) {
    openAppPath(`${ROUTES.CHAT.SESSION}?sessionId=${existingSession.id}`);
  } else {
    openAppPath(`${ROUTES.CHAT.SESSION}?userId=${userId}`);
  }
}


onLoad((query) => {
  // 支持通过 URL id 参数加载帖子（从通知、分享等入口进入）
  const postId = query?.id;
  if (postId && typeof postId === "string" && postId.trim().length > 0) {
    // 如果 currentPost 尚未设置或 ID 不匹配，主动加载
    if (!currentPost.value || currentPost.value.id !== postId) {
      void villageStore.setCurrentPost(postId).then(() => {
        if (currentPost.value) {
          void villageStore.fetchComments(currentPost.value.id);
          void villageStore.fetchSimilarAuthors(currentPost.value.id);
        }
      });
      return;
    }
  }

  // infra R2-00072: 无 query.id 时不再静默依赖 store 残留 currentPost
  // （直开分享链接可能展示他人帖子），无可用帖子时清空并提示错误态
  if (!currentPost.value) {
    villageStore.clearCurrentPost();
    uni.showToast({ title: t("village.detail.postNotExist"), icon: "none" });
    return;
  }

  // 已有 currentPost（通过 setCurrentPost 导航而来），加载评论
  if (currentPost.value) {
    // R4-00087：进入新帖子时重置评论分页游标
    commentPage.value = 1;
    void villageStore.fetchComments(currentPost.value.id);
    void villageStore.fetchSimilarAuthors(currentPost.value.id);
  }
});

// 修复（严格模式 noUnusedLocals）：handleCommentLike/noop 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ handleCommentLike, noop });

/**
 * 帖子分享（2026-08-10 A3 补齐）：分享卡片指向帖子详情，
 * 标题取帖子标题/摘要（无标题时取内容前 24 字）。
 */
onShareAppMessage(() => {
  const post = currentPost.value;
  if (!post) return { title: t("share.shareVillage"), path: ROUTES.TAB.VILLAGE };
  const title = (post.title?.trim() || post.content?.trim() || "").slice(0, 24);
  return {
    title: title ? t("share.sharePostDetail", { title }) : t("share.shareVillage"),
    path: `${ROUTES.VILLAGE.DETAIL}?id=${encodeURIComponent(String(post.id))}`,
  };
});

/** 朋友圈分享（query 带帖子 id） */
onShareTimeline(() => {
  const post = currentPost.value;
  const title = (post?.title?.trim() || post?.content?.trim() || "").slice(0, 24);
  return {
    title: title ? t("share.sharePostDetail", { title }) : t("share.shareVillage"),
    query: post ? `id=${encodeURIComponent(String(post.id))}` : "",
  };
});
</script>

<template>
  <view class="detail-page">
    <!-- 顶部导航栏 -->
    <view class="detail-header">
      <view class="detail-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('village.backAria')" @tap="goBack">
        <image class="back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
      </view>
      <text class="detail-header__title">{{ t("village.detailTitle") }}</text>
      <!-- 理想图：右侧三点菜单（···），点击弹出操作菜单（举报/复制等） -->
      <view
        class="detail-header__menu press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('village.reportPostAria')"
        @tap="handlePostLongpress"
      >
        <text class="detail-header__menu-dots">···</text>
      </view>
    </view>

    <!-- 帖子内容 -->
    <scroll-view v-if="currentPost" class="detail-body" scroll-y>
      <!-- ===== 作者交互卡片 ===== -->
      <!-- 理想图：扁平行内作者行（头像 + 名字 + 校徽 + 关注按钮） -->
      <view class="author-inline">
        <!-- 作者头像（点击进主页） -->
        <view class="author-inline__avatar" @tap="goToUserProfile(currentPost.author.userId)">
          <image
            v-if="currentPost.author.avatar && !isImageFailed('author')"
            class="author-inline__avatar-img"
            :src="resolveMediaUrl(currentPost.author.avatar)"
            mode="aspectFill"
            lazy-load alt=""
            @error="onImageError('author')"
          />
          <text v-else class="author-inline__avatar-char">{{ initialOf(currentPost.author.name) }}</text>
        </view>
        <!-- 作者信息行（名字 + 校徽） -->
        <view class="author-inline__info">
          <view class="author-inline__name-row">
            <text class="author-inline__name">{{ currentPost.author.name }}</text>
            <view v-if="currentPost.isAlumni" class="author-inline__badge">
              <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="author-inline__badge-icon" mode="aspectFit" />
              <text class="author-inline__badge-text">{{ currentPost.author.campusName || t("village.alumni") }}</text>
            </view>
          </view>
          <!-- 频道 · 时间 -->
          <text class="author-inline__meta">{{ currentPost.author.headline || t("village.detail.statsView") }} · {{ formatRelativeTime(currentPost.createdAt) }}</text>
        </view>
        <!-- 关注按钮（右侧） -->
        <view
          class="author-inline__follow press-feedback"
          :class="{ 'author-inline__follow--active': currentPost.isFollowed }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('village.followAria')"
          @tap="handleFollow"
        >
          <text class="author-inline__follow-text">{{ currentPost.isFollowed ? t("village.followed") : t("village.follow") }}</text>
        </view>
      </view>

      <!-- ===== 帖子正文：长按弹出复制 / 举报菜单（P2 长按复制支持） ===== -->
      <view class="post-section">
        <view class="post-body" @longpress="handlePostLongpress">
          <text class="post-content">{{ currentPost.content }}</text>

          <!-- 图片网格（理想图：1张大图 + 3张小图布局） -->
          <view v-if="currentPost.images.length > 0" class="post-images">
            <SafeImage
              v-for="(img, idx) in currentPost.images" :key="img || idx"
              custom-class="post-image"
              :src="img"
              :fallback="IMAGE_PATHS.POST_PLACEHOLDER"
              mode="aspectFill"
              :lazy-load="true"
            />
          </view>

          <!-- 2026-08-08 频道化重构：关联活动卡（活动链接帖展开） -->
          <view v-if="currentPost.activity" class="post-activity">
            <ActivityCard
              :activity="currentPost.activity"
              compact
              @open-detail="goToActivityDetail"
            />
          </view>

          <!-- 话题标签 -->
          <view v-if="currentPost.tags.length > 0" class="post-tags">
            <text
              v-for="(tag, idx) in currentPost.tags" :key="idx"
              class="post-tag"
              @tap="goToTagPosts(tag)"
            >{{ tag }}</text>
          </view>
        </view>

        <!-- 2026-08-26 P0：理想图位置标签（绿色定位 + 学校 + 距离） -->
        <view v-if="currentPost.author.campusName" class="post-location">
          <image class="post-location__pin" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
          <text class="post-location__text">{{ currentPost.author.campusName }}</text>
          <text class="post-location__distance">· 距你 1.2km</text>
        </view>

        <!-- 2026-08-26 P0：理想图行内互动栏（点赞数 | 评论数 | 分享） -->
        <view class="post-actions-inline">
          <view
            class="post-actions-inline__item"
            :class="{ 'post-actions-inline__item--active': currentPost.isLiked }"
            role="button"
            :aria-label="t('village.likePostAria')"
            @tap="handleLike"
          >
            <image class="post-actions-inline__icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
            <text class="post-actions-inline__count">{{ currentPost.likes }}</text>
          </view>
          <view
            class="post-actions-inline__item"
            role="button"
            :aria-label="t('village.detail.statsComment')"
          >
            <image class="post-actions-inline__icon" :src="IMAGE_PATHS.ICONS_EMOJI.COMMENT" mode="aspectFit" alt="" />
            <text class="post-actions-inline__count">{{ currentPost.comments }}</text>
          </view>
          <view
            class="post-actions-inline__item post-actions-inline__item--share"
            role="button"
            :aria-label="t('village.sharePostAria')"
            @tap="openShareModal"
          >
            <text class="post-actions-inline__icon">↗</text>
            <text class="post-actions-inline__count">{{ t("village.detail.shareAction") }}</text>
          </view>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="comments-section">
        <view class="comments-header">
          <text class="comments-title">{{ t("village.detail.commentsTitle") }}</text>
          <!-- P1-02：计数改用服务端总数（currentPost.comments 来自详情 commentCount），
               替代本地 comments.length（树形结构下根评论数 ≠ 总评论数） -->
          <text class="comments-count">({{ currentPost.comments }})</text>
          <view class="comments-sort"><text class="comments-sort__text">最热</text></view>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="comments-loading" role="status" aria-live="polite">
          <view class="loading-spinner" />
          <text class="loading-text">{{ t("village.detail.loadingComments") }}</text>
        </view>

        <!-- 评论列表（P1-02 楼中楼：根评论 + 缩进子评论） -->
        <view v-else-if="comments.length > 0" class="comments-list" role="list">
          <view
            v-for="(comment, _idx) in comments" :key="comment.id"
            class="comment-item list-item"
            @longpress="handleReportComment(comment)"
          >
            <!-- 2026-08-08 头像点击进主页：根评论作者头像 -->
            <view
              class="comment-avatar"
              @tap="goToUserProfile(comment.author.userId)"
            >
              <image
                v-if="comment.author.avatar && !isImageFailed('comment-' + comment.id)"
                class="comment-avatar__img"
                :src="resolveMediaUrl(comment.author.avatar)"
                mode="aspectFill" lazy-load alt=""
                @error="onImageError('comment-' + comment.id)"
              />
              <text v-else class="comment-avatar__text">{{ initialOf(comment.author.name) }}</text>
            </view>
            <view class="comment-content">
              <view class="comment-header">
                <view class="comment-header__left">
                  <text class="comment-author">{{ comment.author.name }}</text>
                  <!-- 评论者校徽 -->
                  <view v-if="comment.author.campusName" class="comment-school-badge">
                    <text class="comment-school-badge__text">{{ comment.author.campusName }}</text>
                  </view>
                </view>
              </view>
              <text class="comment-text">{{ comment.content }}</text>
              <view class="comment-actions">
                <text class="comment-time">{{ formatRelativeTime(comment.createdAt) }}</text>
                <text class="comment-dot">·</text>
                <!-- P1-02 楼中楼：根评论「回复」按钮 -->
                <view
                  class="comment-reply-btn press-feedback"
                  hover-class="press-feedback--active"
                  hover-stay-time="120"
                  role="button"
                  :aria-label="t('village.detail.replyTo', { name: comment.author.name })"
                  @tap.stop="startReply(comment)"
                >
                  <text class="comment-reply-btn__text">{{ t("village.detail.reply") }}</text>
                </view>
               </view>
               <!-- 右侧爱心 -->
               <view class="comment-heart-wrap">
                 <view
                   class="comment-heart"
                   :class="{ 'comment-heart--active': comment.isLiked }"
                   @tap.stop="handleCommentLike(comment.id)"
                 >
                   <image class="comment-heart__icon" :src="comment.isLiked ? IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED : IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE" mode="aspectFit" alt="" />
                 </view>
                 <text v-if="comment.likes > 0" class="comment-heart__count">{{ comment.likes }}</text>
               </view>
             </view>
             <!-- P1-02 楼中楼：缩进子评论 -->
             <view v-if="comment.replies && comment.replies.length > 0" class="comment-replies">
               <view
                 v-for="reply in visibleReplies(comment)" :key="reply.id"
                 class="comment-reply list-item"
                 @longpress="handleReportComment(reply)"
               >
                 <view
                   class="comment-reply__avatar"
                   @tap.stop="goToUserProfile(reply.author.userId)"
                 >
                   <image
                     v-if="reply.author.avatar && !isImageFailed('reply-' + reply.id)"
                     class="comment-reply__avatar-img"
                     :src="resolveMediaUrl(reply.author.avatar)"
                     mode="aspectFill" lazy-load alt=""
                     @error="onImageError('reply-' + reply.id)"
                   />
                   <text v-else class="comment-reply__avatar-text">{{ initialOf(reply.author.name) }}</text>
                 </view>
                 <view class="comment-reply__content">
                   <view class="comment-reply__header">
                     <text class="comment-reply__author">{{ reply.author.name }}</text>
                     <text v-if="reply.replyTo" class="comment-reply__text-ref">（{{ t("village.replyToPrefix", { name: reply.replyTo }) }}）</text>
                   </view>
                   <text class="comment-reply__text">{{ reply.content }}</text>
                   <view class="comment-reply__meta">
                     <text class="comment-reply__time">{{ formatRelativeTime(reply.createdAt) }}</text>
                     <text class="comment-dot">·</text>
                     <view
                       class="comment-reply-btn press-feedback"
                       hover-class="press-feedback--active"
                       hover-stay-time="120"
                       role="button"
                       @tap.stop="startReply(reply)"
                     >
                       <text class="comment-reply-btn__text">{{ t("village.detail.reply") }}</text>
                     </view>
                   </view>
                 </view>
                 <view class="comment-heart-wrap">
                   <view
                     class="comment-heart"
                     :class="{ 'comment-heart--active': reply.isLiked }"
                     @tap.stop="handleCommentLike(reply.id)"
                   >
                     <image class="comment-heart__icon" :src="reply.isLiked ? IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED : IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE" mode="aspectFit" alt="" />
                   </view>
                   <text v-if="reply.likes > 0" class="comment-heart__count">{{ reply.likes }}</text>
                 </view>
             </view>
           </view>
         </view>
       </view>

        <!-- 空状态 -->
        <view v-else class="comments-empty">
          <text class="comments-empty__text">{{ t("village.detail.emptyComments") }}</text>
        </view>

        <!-- R4-00087：评论分页「加载更多」 -->
        <view
          v-if="commentHasMore"
          class="comments-more press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('village.detail.loadMoreComments')"
          @tap="loadMoreComments"
        >
          <text class="comments-more__text">
            {{ loadingMoreComments ? t("village.detail.loadingMoreComments") : t("village.detail.loadMoreComments") }}
          </text>
        </view>
      </view>

      <!-- ===== 相似作者推荐 ===== -->
      <view v-if="similarAuthors.length > 0" class="similar-authors-section">
        <view class="similar-authors-header">
          <text class="similar-authors-title">{{ t("village.detail.similarTitle") }}</text>
          <text class="similar-authors-subtitle">{{ t("village.detail.similarSubtitle") }}</text>
        </view>

        <view class="similar-authors-list" role="list">
          <view
            v-for="author in similarAuthors" :key="author.userId"
            class="similar-author-card list-item"
          >
            <view class="similar-author-main">
              <!-- 2026-08-08 头像点击进主页：相似作者头像 -->
              <view
                class="similar-author-avatar"
                @tap="goToUserProfile(author.userId)"
              >
                <image
                  v-if="author.avatar && !isImageFailed('similar-' + author.userId)"
                  class="similar-author-avatar__img"
                  :src="resolveMediaUrl(author.avatar)"
                  mode="aspectFill" lazy-load alt=""
                  @error="onImageError('similar-' + author.userId)"
                />
                <text v-else class="similar-author-avatar__char">{{ initialOf(author.name) }}</text>
                <!-- 头像左上角身份徽章（校友） -->
                <view v-if="author.isAlumni" class="similar-author-avatar__badge">
                  <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="similar-author-avatar__badge-icon" mode="aspectFit" />
                </view>
              </view>
              <view class="similar-author-info">
                <view class="similar-author-name-row">
                  <text class="similar-author-name">{{ author.name }}</text>
                  <!-- 同校标签 -->
                  <view v-if="author.isAlumni" class="identity-tag identity-tag--alumni">
                    <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="identity-tag__icon" mode="aspectFit" />
                    <text class="identity-tag__text">{{ t("village.alumni") }}</text>
                  </view>
                </view>
                <text class="similar-author-headline">{{ author.headline }}</text>
                <!-- 共同兴趣 -->
                <view v-if="author.commonInterests.length > 0" class="similar-author-interests">
                  <text class="common-interest-label">{{ t("village.detail.commonInterestsLabel") }}</text>
                  <text
                    v-for="(interest, idx) in author.commonInterests" :key="interest"
                    class="common-interest-chip"
                  >{{ interest }}{{ idx < author.commonInterests.length - 1 ? "、" : "" }}</text>
                </view>
              </view>
            </view>
            <!-- 操作按钮 -->
            <view class="similar-author-actions">
              <view
                class="action-btn action-btn--follow"
                :class="{ 'action-btn--follow-active': author.isFollowed }"
                role="button"
                :aria-label="t('village.followSimilarAria')"
                @tap="handleFollowSimilarAuthor(author.userId)"
              >
                <text class="action-btn__text">
                  {{ author.isFollowed ? t("village.followed") : t("village.follow") }}
                </text>
              </view>
              <view class="action-btn action-btn--message" role="button" :aria-label="t('village.sendMessageSimilarAria')" @tap="sendMessageToSimilarAuthor(author.userId)">
                <text class="action-btn__text">{{ t("village.detail.message") }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="body-footer" />
    </scroll-view>

    <!-- 帖子不存在 -->
    <EmptyState
      v-else
      :title="t('village.detail.postNotExist')"
      :action-text="t('village.detail.backToVillage')"
      type="no-data"
      @action="goBack"
    />

    <!-- 底部互动栏 -->
    <!-- 理想图：底部输入栏（说点什么... + @ + 表情 + 图片） -->
    <view v-if="currentPost" class="detail-input-bar">
      <!-- 回复模式提示条 -->
      <view v-if="replyingTo" class="reply-mode-bar">
        <text class="reply-mode-bar__text">{{ t("village.detail.replyingTo", { name: replyingTo.author.name }) }}</text>
        <view class="reply-mode-bar__cancel press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('village.detail.cancelReply')" @tap="cancelReply">
          <image class="reply-mode-bar__cancel-text" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
        </view>
      </view>
      <view class="input-bar">
        <view class="input-bar__field">
          <input
            v-model="commentContent"
            class="input-bar__input"
            :placeholder="replyPlaceholder"
            confirm-type="send"
            @confirm="submitComment"
            :aria-label="replyPlaceholder"
          />
        </view>
        <view class="input-bar__actions">
          <!-- @ 提及 -->
          <view class="input-bar__icon press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button">
            <text class="input-bar__icon-text">@</text>
          </view>
          <!-- 表情 -->
          <view class="input-bar__icon press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button">
            <image class="input-bar__icon-text" style="width: 32rpx; height: 32rpx;" :src="IMAGE_PATHS.ICONS_EMOJI.SMILE" mode="aspectFit" alt="" />
          </view>
          <!-- 图片 -->
          <view class="input-bar__icon press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button">
            <image class="input-bar__icon-text" style="width: 32rpx; height: 32rpx;" :src="IMAGE_PATHS.ICONS_EMOJI.IMAGE" mode="aspectFit" alt="" />
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 转发确认弹窗 ===== -->
    <!--
      无障碍（a11y）：role / aria-* 属性直接放在 view 上。
      说明：uni-app 不支持属性级条件编译（#ifdef H5 不能写在开标签内部），
      否则会破坏 Vue 模板解析导致下游变量被误判为未使用。
      mp-weixin 端会忽略未知 HTML 属性，因此 H5 与小程序两端均安全。
    -->
    <view
      v-if="showShareModal"
      class="share-modal-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('village.detail.shareModalTitle')"
      @tap="closeShareModal"
    >
      <view class="share-modal" catchtap="noop">
        <!-- 弹窗标题 -->
        <view class="share-modal__header">
          <text class="share-modal__title">{{ t("village.detail.shareModalTitle") }}</text>
          <view
            class="share-modal__close press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('village.detail.close')"
            @tap="closeShareModal"
          >
            <text class="share-modal__close-icon">X</text>
          </view>
        </view>

        <!-- 附加评论输入 -->
        <view class="share-modal__body">
          <textarea
            v-model="shareComment"
            class="share-modal__textarea"
            :placeholder="t('village.detail.shareCommentPlaceholder')"
            :maxlength="200"
            auto-height
            :aria-label="t('village.detail.additionalCommentLabel')"
          />
          <text class="share-modal__count">{{ shareComment.length }}/200</text>
        </view>

        <!-- 操作按钮 -->
        <view class="share-modal__footer">
          <view
            class="share-modal__btn share-modal__btn--cancel press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('village.detail.cancelShare')"
            @tap="closeShareModal"
          >
            <text class="share-modal__btn-text">{{ t("common.cancel") }}</text>
          </view>
          <view
            class="share-modal__btn share-modal__btn--confirm press-feedback"
            :class="{ 'share-modal__btn--loading': isSharing }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('village.detail.confirmShare')"
            @tap="confirmShare"
          >
            <text class="share-modal__btn-text">{{ isSharing ? t("village.detail.sharing") : t("village.detail.confirmShare") }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 帖子举报弹窗 ===== -->
    <!--
      修复（严格模式 noUnusedLocals）：PostReportDialog 已导入但未在模板中渲染，
      导致 typecheck 报错 TS6133。现补全弹窗渲染，使 handleReportPost → showReportDialog
      → PostReportDialog → handleReportSubmitted 形成完整举报流程闭环。
    -->
    <PostReportDialog
      v-model:visible="showReportDialog"
      :post-id="currentPost?.id ?? null"
      @submitted="handleReportSubmitted"
    />
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand);
$green-light: var(--c-brand-50);
$pink-primary: var(--c-romance-500);
$pink-light: var(--c-romance-100);
$gold-vip: var(--c-vip-from);
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
$text-secondary: var(--c-neutral-500);
$text-tertiary: var(--c-neutral-400);
$border-light: var(--c-tint-gray-50);
$card-soft-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: $bg-page;
}

/* ========== 顶部导航栏 ========== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-bottom: 1rpx solid #F1F1F1;
  z-index: 10;
}

.detail-header__back {
  /* 修复 P2（触摸目标过小）：min-height/min-width ≥88rpx（44px @2x），满足 iOS HIG / Material Design 标准 */
  padding: 16rpx 24rpx;
  min-width: 88rpx;
  min-height: 88rpx;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
}

/* #ifdef H5 */
.detail-header__back:active {
  opacity: 0.7;
  transform: scale(0.96);
}
/* #endif */

.back-icon {
  width: 40rpx;
  height: 40rpx;
  display: block;
  font-weight: 500;
}

.detail-header__title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 700;
  /* R4-02537：品牌色底上的反色文字改用 --c-text-inverse（深色模式自动适配） */
  color: var(--c-text-primary, #333A37);
  text-align: left;
}

.detail-header__spacer {
/* 理想图：右侧三点菜单 */
.detail-header__menu {
  min-width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 16rpx;
}

.detail-header__menu-dots {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--c-text-primary, #333A37);
  letter-spacing: 4rpx;
}

/* 理想图：评论 header 更新 */
.comment-header__left {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.comment-school-badge {
  display: inline-flex;
  align-items: center;
  padding: 2rpx 10rpx;
  border-radius: var(--r-full, 9999rpx);
  background: $green-light;
}

.comment-school-badge__text {
  font-size: var(--fs-xs, 20rpx);
  color: $green-primary;
  font-weight: 500;
}

/* 理想图：评论右侧爱心 */
.comment-heart-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
  margin-left: auto;
  padding-left: 16rpx;
}

.comment-heart {
  font-size: var(--fs-xl, 30rpx);
  color: $text-tertiary;
  padding: 4rpx;
}

.comment-heart--active {
  color: $pink-primary;
}

.comment-heart__icon {
  width: 32rpx;
  height: 32rpx;
  color: $text-tertiary;
}

.comment-heart__count {
  font-size: var(--fs-xs, 20rpx);
  color: $text-tertiary;
}

/* 评论 dot 分隔符 */
.comment-dot {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  margin: 0 4rpx;
}
}

/* ========== 帖子内容容器 ========== */
.detail-body {
  flex: 1;
}

/* ================================================================
   作者交互卡片
   ================================================================ */
.author-card {
  /* R4-02537：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  margin: 20rpx 24rpx;
  padding: 28rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: $card-soft-shadow;
  transition: transform var(--d-fast, 120ms) ease;
}

/* 作者基础信息行 */
.author-card__main {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.author-avatar {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-circle, 50%);
  overflow: visible;
  background: linear-gradient(135deg, $green-light, var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 4rpx solid $green-light;
  /* Phase D1: 头像光环 - 双层品牌色阴影 */
  box-shadow: 0 0 0 4rpx var(--c-brand-50),
              0 0 0 8rpx var(--c-brand-100);
}

.author-avatar__img {
  width: 100%;
  height: 100%;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
}

.author-avatar__char {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  color: $green-primary;
}

/* Phase D1: 头像左上角身份徽章 */
.author-avatar__badge {
  position: absolute;
  top: -6rpx;
  left: -6rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: var(--r-circle, 50%);
  background: linear-gradient(135deg, var(--c-brand-400), var(--c-brand-500));
  /* R4-02537：头像描边保持白色（深色下视觉惯例，对齐 --avatar-border 设计） */
  border: 2rpx solid var(--c-neutral-0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx var(--c-brand-border-tint-stronger);
  z-index: 2;
}

.author-avatar__badge-icon {
  width: 20rpx;
  height: 20rpx;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
  flex: 1;
}

.author-info__name {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 600;
  color: $text-primary;
  /* 修复（P1 BUG）：原实现缺少文本裁剪，长昵称会推动身份标签换行 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
  min-width: 0;
}

/* 身份标签（校友等） */
.identity-tag {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 14rpx;
  border-radius: var(--r-full, 9999rpx);
  flex-shrink: 0;
}

.identity-tag--alumni {
  background: $green-light;
  border: 1rpx solid var(--c-brand-border-tint-stronger);
}

.identity-tag__icon {
  width: 24rpx;
  height: 24rpx;
}

.identity-tag__text {
  font-size: var(--fs-sm, 22rpx);
  color: $green-primary;
  font-weight: 600;
}

.author-info__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}

/* P1-16：作者信息段（年龄 · 城市 · 学历） */
.author-info__meta {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  opacity: 0.9;
}

.author-info__headline {
  font-size: var(--fs-lg, 28rpx);
  color: $text-tertiary;
  line-height: 1.4;
  /* Phase D1: 简介最多 2 行 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 2.8em;
  /* #endif */
}

/* 学校标签 */
.author-card__tags {
  margin-bottom: 16rpx;
}

.author-tag--campus {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 18rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $pink-light, var(--c-romance-200));
}

.author-tag__text {
  font-size: var(--fs-base, 24rpx);
  color: $pink-primary;
  font-weight: 500;
}

/* 兴趣标签 */
.author-card__interests {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.interest-chip {
  font-size: var(--fs-base, 24rpx);
  color: $text-secondary;
  background: $bg-page;
  padding: 8rpx 18rpx;
  border-radius: var(--r-full, 9999rpx);
  font-weight: 500;
}

/* Phase D1: 兴趣 chip 按类别着色（4 种颜色） */
.interest-chip--sports {
  color: var(--c-brand-500);
  background: var(--c-brand-50);
}

.interest-chip--arts {
  color: var(--c-lavender-500);
  background: var(--c-lavender-50);
}

.interest-chip--tech {
  color: var(--c-sky-500);
  background: var(--c-sky-50);
}

.interest-chip--life {
  color: var(--c-apricot-500);
  background: var(--c-apricot-50);
}

/* 操作按钮行 */
.author-card__actions {
  display: flex;
  gap: 20rpx;
}

.action-btn--follow {
  flex: 1;
  padding: 18rpx 0;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger);
}

/* #ifdef H5 */
.action-btn--follow:active {
  transform: scale(0.96);
}
/* #endif */

.action-btn--follow-active {
  background: $bg-page;
  border: 2rpx solid $border-light;
  box-shadow: none;
}

.action-btn--message {
  flex: 1;
  padding: 18rpx 0;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $pink-primary, var(--c-romance-400));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
  box-shadow: 0 4rpx 12rpx var(--s-romance);
}

/* #ifdef H5 */
.action-btn--message:active {
  transform: scale(0.96);
}
/* #endif */

.action-btn__text {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.action-btn--follow-active .action-btn__text {
  color: $text-tertiary;
}

.action-btn--message .action-btn__text {
  color: var(--c-text-inverse);
}

/* ================================================================
   帖子正文卡片
   ================================================================ */
.detail-post {
  /* R4-02537：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  padding: 28rpx 32rpx;
  margin: 0 24rpx 16rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: $card-soft-shadow;
}

/* 帖子正文 */
.post-body {
  margin-bottom: 24rpx;
}

.post-content {
  font-size: var(--fs-xl, 30rpx);
  color: $text-primary;
  line-height: 1.8;
  display: block;
  margin-bottom: 20rpx;
}

/* 图片网格 */
/* 理想图：图片网格（第1张大图 + 后续3列小图） */
.post-images {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

/* 2026-08-08 频道化重构：帖子内活动卡间距 */
.post-activity {
  margin-bottom: 20rpx;
}

.post-image {
  width: calc(33.33% - 8rpx);
  height: 220rpx;
  border-radius: var(--r-lg, 16rpx);
  background: $bg-page;
}

/* 第1张图占满整行（大图效果） */
.post-image:first-child {
  width: 100%;
  height: 400rpx;
  border-radius: var(--r-lg, 16rpx);
}

/* 话题标签 */
.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.post-tag {
  font-size: var(--fs-md, 26rpx);
  color: $green-primary;
  background: $green-light;
  padding: 8rpx 18rpx;
  border-radius: var(--r-full, 9999rpx);
  font-weight: 500;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.post-tag:active {
  transform: scale(0.96);
  /* 修复（P1 sass 兼容性）：原实现使用 darken($green-light, 5%)，
     但 $green-light 是 CSS 变量 var(--c-brand-50, ...)，sass darken 函数无法处理 CSS 变量。
     改用 brightness filter 实现按压变暗效果，避免 sass 编译失败。
     brightness(0.95) ≈ darken 5% 的视觉效果。 */
  filter: brightness(0.95);
}
/* #endif */

/* 帖子元信息 */
.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20rpx;
  border-top: 1rpx solid $border-light;
}

.post-time {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.post-stats {
  display: flex;
  gap: 24rpx;
}

.post-stats__item {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

/* ========== 评论区 ========== */
.comments-section {
  /* R4-02537：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  padding: 28rpx 32rpx;
  margin: 0 24rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: $card-soft-shadow;
}

/* ================================================================
   相似作者推荐
   ================================================================ */
.similar-authors-section {
  /* R4-02537：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  padding: 28rpx 32rpx;
  margin: 16rpx 24rpx 0;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: $card-soft-shadow;
}

.similar-authors-header {
  margin-bottom: 24rpx;
}

.similar-authors-title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: $text-primary;
  display: block;
}

.similar-authors-subtitle {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
  margin-top: 6rpx;
  display: block;
}

.similar-authors-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.similar-author-card {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 24rpx;
  background: $bg-page;
  border-radius: var(--r-lg, 20rpx);
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.similar-author-card:active {
  transform: scale(0.98);
}
/* #endif */

.similar-author-main {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}

.similar-author-avatar {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-circle, 50%);
  overflow: visible;
  background: linear-gradient(135deg, $green-light, var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  /* Phase D1: 头像光环 */
  box-shadow: 0 0 0 4rpx var(--c-brand-50),
              0 0 0 8rpx var(--c-brand-100);
}

.similar-author-avatar__img {
  width: 100%;
  height: 100%;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
}

.similar-author-avatar__char {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: $green-primary;
}

/* Phase D1: 相似作者头像左上角身份徽章 */
.similar-author-avatar__badge {
  position: absolute;
  top: -4rpx;
  left: -4rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: var(--r-circle, 50%);
  background: linear-gradient(135deg, var(--c-brand-400), var(--c-brand-500));
  /* R4-02537：头像描边保持白色（深色下视觉惯例，对齐 --avatar-border 设计） */
  border: 2rpx solid var(--c-neutral-0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx var(--c-brand-border-tint-stronger);
  z-index: 2;
}

.similar-author-avatar__badge-icon {
  width: 18rpx;
  height: 18rpx;
}

.similar-author-info {
  flex: 1;
  min-width: 0;
}

.similar-author-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}

.similar-author-name {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 600;
  color: $text-primary;
}

.similar-author-headline {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
  display: block;
  margin-bottom: 10rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.similar-author-interests {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx;
}

.common-interest-label {
  font-size: var(--fs-base, 24rpx);
  color: $text-secondary;
}

.common-interest-chip {
  font-size: var(--fs-base, 24rpx);
  color: $pink-primary;
  font-weight: 500;
}

.similar-author-actions {
  display: flex;
  gap: 20rpx;
}

.similar-author-actions .action-btn--follow,
.similar-author-actions .action-btn--message {
  flex: 1;
  padding: 14rpx 0;
  border-radius: var(--r-full, 9999rpx);
  display: flex;
  align-items: center;
  justify-content: center;
}

.similar-author-actions .action-btn--follow {
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  box-shadow: 0 4rpx 12rpx var(--c-brand-shadow-tint-mid);
}

/* #ifdef H5 */
.similar-author-actions .action-btn--follow:active {
  transform: scale(0.96);
}
/* #endif */

.similar-author-actions .action-btn--follow-active {
  /* R4-02537：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border: 2rpx solid $border-light;
  box-shadow: none;
}

.similar-author-actions .action-btn--message {
  background: linear-gradient(135deg, $pink-primary, var(--c-romance-400));
  box-shadow: 0 4rpx 12rpx var(--c-shadow-romance-tint);
}

/* #ifdef H5 */
.similar-author-actions .action-btn--message:active {
  transform: scale(0.96);
}
/* #endif */

.similar-author-actions .action-btn__text {
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
}

.similar-author-actions .action-btn--follow .action-btn__text {
  color: var(--c-text-inverse);
}

.similar-author-actions .action-btn--follow-active .action-btn__text {
  color: $text-tertiary;
}

.similar-author-actions .action-btn--message .action-btn__text {
  color: var(--c-text-inverse);
}

/* ========== 评论区 ========== */

.comments-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 24rpx;
}

.comments-sort {
  margin-left: auto;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: #F2F5F4;
}

.comments-sort__text {
  font-size: 22rpx;
  color: var(--c-brand, #36C99A);
  font-weight: 600;
}


.comments-title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: $text-primary;
}

.comments-count {
  font-size: var(--fs-md, 26rpx);
  color: $green-primary;
  background: $green-light;
  padding: 4rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  font-weight: 600;
}

/* 评论加载 */
.comments-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx 0;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid $border-light;
  border-top-color: $green-primary;
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: var(--fs-md, 26rpx);
  color: $text-tertiary;
}

/* 评论列表 */
.comments-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.comment-item {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  background: $bg-page;
  border-radius: var(--r-lg, 20rpx);
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.comment-item:active {
  transform: scale(0.98);
}
/* #endif */

.comment-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, $green-light, var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comment-avatar__img {
  width: 100%;
  height: 100%;
}

.comment-avatar__text {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: $green-primary;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

/* 2026-08-08 走查 P1：贴吧式楼层号（1F/2F/...） */
.comment-floor {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: var(--c-brand-600);
  background: var(--c-brand-50);
  padding: 2rpx 10rpx;
  border-radius: var(--r-full, 999rpx);
  line-height: 1.4;
}

.comment-author {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: $text-primary;
}

.comment-time {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

.comment-text {
  font-size: var(--fs-lg, 28rpx);
  color: $text-secondary;
  line-height: 1.6;
  display: block;
  margin-bottom: 12rpx;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

/* P1-02 楼中楼：根评论「回复」按钮 */
.comment-reply-btn {
  display: flex;
  align-items: center;
  padding: 8rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R4-02537：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
}

.comment-reply-btn__text {
  font-size: var(--fs-base, 24rpx);
  color: $green-primary;
  font-weight: 500;
}

/* P1-02 楼中楼：缩进子评论容器（左竖线 + 左内边距形成层级感） */
.comment-replies {
  margin-top: 16rpx;
  border-left: 4rpx solid $green-light;
  padding-left: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.comment-reply {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  background: $bg-page;
  border-radius: var(--r-lg, 20rpx);
}

.comment-reply__avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, $green-light, var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comment-reply__avatar-img {
  width: 100%;
  height: 100%;
}

.comment-reply__avatar-text {
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
  color: $green-primary;
}

.comment-reply__content {
  flex: 1;
  min-width: 0;
}

.comment-reply__header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}

.comment-reply__author {
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
  color: $text-primary;
}

.comment-reply__time {
  font-size: var(--fs-xs, 20rpx);
  color: $text-tertiary;
}

.comment-reply__text {
  font-size: var(--fs-md, 26rpx);
  color: $text-secondary;
  line-height: 1.6;
  display: block;
  margin-bottom: 8rpx;
}

/* "回复 @昵称"前缀高亮 */
.comment-reply__text-ref {
  color: $green-primary;
}

/* P1-02 楼中楼：底部回复模式提示栏 */
.reply-mode-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 8rpx 16rpx;
  margin-bottom: 8rpx;
  border-radius: var(--r-lg, 20rpx);
  background: $green-light;
}

.reply-mode-bar__text {
  font-size: var(--fs-md, 26rpx);
  color: $green-primary;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reply-mode-bar__cancel {
  padding: 6rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R4-02537：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  flex-shrink: 0;
}

.reply-mode-bar__cancel-text {
  width: 26rpx;
  height: 26rpx;
  color: $text-tertiary;
}

.comment-like {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R4-02537：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.comment-like:active {
  transform: scale(0.96);
}
/* #endif */

.comment-like__icon {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.comment-like__count {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.comment-like--active .comment-like__icon,
.comment-like--active .comment-like__count {
  color: $pink-primary;
}

/* 评论空状态 */
.comments-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.comments-empty__text {
  font-size: var(--fs-lg, 28rpx);
  color: $text-tertiary;
}

/* R4-00087：评论分页「加载更多」按钮 */
.comments-more {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 热区高度 ≥ 44px 可点击标准 */
  min-height: 88rpx;
  margin-top: var(--sp-4);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-border-light);
}

.comments-more__text {
  font-size: var(--fs-md);
  font-weight: 500;
  color: var(--c-brand-700);
}

.body-footer {
  height: 40rpx;
}

/* ========== 帖子不存在 ========== */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.empty-state__text {
  font-size: var(--fs-xl, 30rpx);
  color: $text-tertiary;
}

.empty-state__back {
  padding: 18rpx 48rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.empty-state__back:active {
  transform: scale(0.96);
}
/* #endif */

.back-text {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 底部互动栏 ========== */
/* ================================================================
   理想图：作者扁平行内布局
   ================================================================ */
.author-inline {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx 16rpx;
  gap: 16rpx;
}

.author-inline__avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, $green-light, var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
}

.author-inline__avatar-img {
  width: 100%;
  height: 100%;
  border-radius: var(--r-circle, 50%);
}

.author-inline__avatar-char {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: $green-primary;
}

.author-inline__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.author-inline__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.author-inline__name {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 600;
  color: $text-primary;
}

.author-inline__badge {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: var(--r-full, 9999rpx);
  background: $green-light;
  border: 1rpx solid var(--c-brand-border-tint-stronger);
}

.author-inline__badge-icon {
  width: 20rpx;
  height: 20rpx;
}

.author-inline__badge-text {
  font-size: var(--fs-xs, 20rpx);
  color: $green-primary;
  font-weight: 500;
}

.author-inline__meta {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

.author-inline__follow {
  padding: 10rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  border: 2rpx solid $green-primary;
  background: transparent;
  flex-shrink: 0;
}

.author-inline__follow-text {
  font-size: var(--fs-base, 24rpx);
  color: $green-primary;
  font-weight: 600;
}

.author-inline__follow--active {
  background: $bg-page;
  border-color: $border-light;
}

.author-inline__follow--active .author-inline__follow-text {
  color: $text-tertiary;
}

/* ================================================================
   理想图：帖子正文区域（无边框）
   ================================================================ */
.post-section {
  padding: 0 32rpx 16rpx;
}

.post-section .post-body {
  margin-bottom: 0;
}

.post-section .post-content {
  font-size: var(--fs-xl, 30rpx);
  color: $text-primary;
  line-height: 1.7;
}

/* 理想图：位置标签 */
.post-location {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 0 20rpx;
}

.post-location__pin {
  width: 28rpx;
  height: 28rpx;
  color: $green-primary;
}

.post-location__text {
  font-size: var(--fs-base, 24rpx);
  color: $green-primary;
  font-weight: 500;
}

.post-location__distance {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

/* 理想图：行内互动栏 */
.post-actions-inline {
  display: flex;
  align-items: center;
  gap: 48rpx;
  padding: 16rpx 0 20rpx;
}

.post-actions-inline__item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.post-actions-inline__item--active .post-actions-inline__icon {
  color: $pink-primary;
}

.post-actions-inline__item--active .post-actions-inline__count {
  color: $pink-primary;
}

.post-actions-inline__item--share {
  margin-left: auto;
}

.post-actions-inline__icon {
  width: 32rpx;
  height: 32rpx;
  color: $text-tertiary;
}

.post-actions-inline__count {
  font-size: var(--fs-lg, 28rpx);
  color: $text-secondary;
  font-weight: 500;
}

/* ================================================================
   理想图：底部输入栏
   ================================================================ */
.detail-input-bar {
  background: var(--c-bg-container);
  border-top: 1rpx solid $border-light;
  padding-bottom: calc(env(safe-area-inset-bottom) + 12rpx);
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
}

.input-bar__field {
  flex: 1;
  background: $bg-page;
  border-radius: var(--r-full, 9999rpx);
  padding: 0 24rpx;
}

.input-bar__input {
  height: 72rpx;
  font-size: var(--fs-lg, 28rpx);
  color: $text-primary;
}

.input-bar__actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex-shrink: 0;
}

.input-bar__icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
}

.input-bar__icon-text {
  font-size: var(--fs-2xl, 32rpx);
  color: $text-secondary;
}

/* ================================================================
   转发弹窗
   ================================================================ */
.share-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-overlay-mid-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.share-modal {
  width: 620rpx;
  /* R4-02537：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xxl, 28rpx);
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx var(--c-overlay-text-shadow-mid);
}

.share-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 20rpx;
  border-bottom: 1rpx solid $border-light;
}

.share-modal__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: $text-primary;
}

.share-modal__close {
  /* 修复 P2（触摸目标过小）：56rpx → 88rpx（44px @2x），满足 iOS HIG / Material Design 标准 */
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-circle, 50%);
  background: $bg-page;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.share-modal__close:active {
  transform: scale(0.96);
  /* 修复（P1 sass 兼容性）：原实现使用 darken($bg-page, 3%)，
     但 $bg-page 是 CSS 变量 var(--c-bg-page, ...)，sass darken 函数无法处理 CSS 变量。
     改用 brightness filter 实现按压变暗效果。 */
  filter: brightness(0.97);
}
/* #endif */

.share-modal__close-icon {
  font-size: var(--fs-md, 26rpx);
  color: $text-tertiary;
  font-weight: 600;
}

.share-modal__body {
  padding: 24rpx 32rpx;
}

.share-modal__textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 20rpx;
  border-radius: var(--r-lg, 20rpx);
  background: $bg-page;
  font-size: var(--fs-lg, 28rpx);
  color: $text-primary;
  box-sizing: border-box;
}

.share-modal__count {
  display: block;
  text-align: right;
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  margin-top: 12rpx;
}

.share-modal__footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 32rpx 32rpx;
}

.share-modal__btn {
  flex: 1;
  padding: 22rpx 0;
  border-radius: var(--r-full, 9999rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.share-modal__btn:active {
  transform: scale(0.96);
}
/* #endif */

.share-modal__btn--cancel {
  background: $bg-page;
  border: 2rpx solid $border-light;
}

.share-modal__btn--confirm {
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger);
}

.share-modal__btn--loading {
  opacity: 0.6;
  pointer-events: none;
}

.share-modal__btn-text {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: $text-secondary;
}

.share-modal__btn--confirm .share-modal__btn-text {
  color: var(--c-text-inverse);
}

/* ========== v3 Nearby 冻结：帖子认识 TA ========== */
.author-meet {
  margin-top: 18rpx;
  display: inline-flex;
  padding: 12rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #FF8DB7 0%, #FF6B81 100%);
}

.author-meet__text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}
</style>