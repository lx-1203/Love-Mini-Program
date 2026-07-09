<script setup lang="ts">
/**
 * 帖子详情页
 * 展示完整帖子内容、评论列表和互动功能
 * 包含作者交互卡片（关注/私信/校友标签）、相似作者推荐和转发功能
 */
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useVillageStore, formatRelativeTime } from "../../stores/village";
import { useMessagesStore } from "../../stores/messages";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import { reportTarget } from "../../services/report-api";
import SafeImage from "../../components/common/SafeImage.vue";
import { IMAGE_PATHS } from "../../config/images";

const villageStore = useVillageStore();
const messagesStore = useMessagesStore();
const sessionStore = useSessionStore();
const { currentPost, comments, loading, similarAuthors, loadingSimilarAuthors } = storeToRefs(villageStore);

/** 评论输入内容 */
const commentContent = ref("");
/** 是否正在提交评论 */
const isSubmitting = ref(false);
/** 转发弹窗是否显示 */
const showShareModal = ref(false);
/** 转发附加评论 */
const shareComment = ref("");
/** 是否正在转发 */
const isSharing = ref(false);

const pageVisible = ref(false);
onShow(() => {
  pageVisible.value = false;
  setTimeout(() => {
    pageVisible.value = true;
  }, 30);
});

/**
 * 返回上一页
 */
function goBack() {
  uni.navigateBack();
}

/** 举报原因选项（与产品约定，覆盖常见违规场景） */
const REPORT_REASONS = ["垃圾广告", "辱骂攻击", "色情低俗", "违法违规", "其他"];

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
    const res = await uni.showActionSheet({ itemList: REPORT_REASONS });
    reason = REPORT_REASONS[res.tapIndex];
  } catch (_e) {
    // 用户取消选择，静默退出
    return;
  }

  // 2. 收集可选补充描述
  let description: string | undefined;
  try {
    const res = await uni.showModal({
      title: "补充描述（可选）",
      editable: true,
      placeholderText: "请输入补充描述...",
      confirmText: "提交举报",
      cancelText: "跳过",
    });
    if (res.confirm && res.content) {
      description = res.content;
    }
  } catch (_e) {
    // 取消则不附加描述，继续提交
  }

  // 3. 调用举报接口
  try {
    await reportTarget("COMMENT", comment.id, reason, description);
    uni.showToast({ title: "举报已提交", icon: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "举报失败";
    uni.showToast({ title: message, icon: "none" });
  }
}

/**
 * 跳转标签聚合页
 */
function goToTagPosts(tagName: string) {
  const cleanTag = tagName.startsWith("#") ? tagName.slice(1) : tagName;
  openAppPath(`/pages/village/tag-posts?tagName=${encodeURIComponent(cleanTag)}`);
}

/**
 * 处理点赞
 */
async function handleLike() {
  if (!currentPost.value) return;
  try {
    await villageStore.likePost(currentPost.value.id);
  } catch (error) {
    console.error("点赞失败:", error);
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
    console.error("关注失败:", error);
  }
}

/**
 * 提交评论
 */
async function submitComment() {
  if (!currentPost.value || !commentContent.value.trim()) return;

  isSubmitting.value = true;
  try {
    await villageStore.commentPost(currentPost.value.id, commentContent.value.trim());
    commentContent.value = "";
    uni.showToast({ title: "评论成功", icon: "success" });
  } catch (error) {
    uni.showToast({
      title: villageStore.errorMessage || "评论失败",
      icon: "none",
    });
  } finally {
    isSubmitting.value = false;
  }
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
 * 私信用户 - 跳转到聊天会话页
 */
function sendMessage() {
  if (!currentPost.value) return;
  // 查找与该作者的现有会话
  const targetUserId = currentPost.value.author.userId;
  const existingSession = messagesStore.sessions.find(
    (s) => s.partnerId === targetUserId && s.sessionType === "private"
  );
  if (existingSession) {
    openAppPath(`/pages/chat-session/index?sessionId=${existingSession.id}`);
  } else {
    openAppPath(`/pages/chat-session/index?userId=${targetUserId}`);
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
    uni.showToast({ title: "转发成功", icon: "success" });
  } catch (error) {
    uni.showToast({
      title: villageStore.errorMessage || "转发失败",
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
    openAppPath(`/pages/chat-session/index?sessionId=${existingSession.id}`);
  } else {
    openAppPath(`/pages/chat-session/index?userId=${userId}`);
  }
}

/* ========== 兴趣分类颜色映射（Phase D1） ========== */

/** 兴趣类别 */
type InterestCategory = "sports" | "arts" | "tech" | "life";

/** 各类别关键词集合（用于兴趣 chip 颜色映射） */
const INTEREST_KEYWORDS: Record<InterestCategory, string[]> = {
  sports: ["运动", "健身", "跑步", "篮球", "足球", "徒步", "户外", "瑜伽", "骑行", "游泳", "羽毛球", "网球", "乒乓球"],
  arts: ["阅读", "读书", "音乐", "电影", "绘画", "设计", "摄影", "写作", "书法", "戏剧", "舞蹈", "艺术", "文学"],
  tech: ["编程", "科技", "互联网", "数码", "AI", "计算机", "技术", "产品", "创业"],
  life: ["美食", "旅行", "旅游", "烹饪", "烘焙", "志愿者", "宠物", "园艺", "手工", "桌游", "生活"],
};

/**
 * 根据兴趣文本返回所属类别
 * 默认归类为 life（生活），保证视觉上有颜色
 */
function getInterestCategory(interest: string): InterestCategory {
  const text = interest.toLowerCase();
  for (const category of Object.keys(INTEREST_KEYWORDS) as InterestCategory[]) {
    if (INTEREST_KEYWORDS[category].some((kw) => text.includes(kw.toLowerCase()))) {
      return category;
    }
  }
  return "life";
}

/**
 * 返回兴趣 chip 的 CSS 类名
 */
function getInterestChipClass(interest: string): string {
  return `interest-chip--${getInterestCategory(interest)}`;
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

  // 已有 currentPost（通过 setCurrentPost 导航而来），加载评论
  if (currentPost.value) {
    void villageStore.fetchComments(currentPost.value.id);
    void villageStore.fetchSimilarAuthors(currentPost.value.id);
  }
});
</script>

<template>
  <view class="detail-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="detail-header">
      <view class="detail-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="detail-header__title">帖子详情</text>
      <view class="detail-header__spacer" />
    </view>

    <!-- 帖子内容 -->
    <scroll-view v-if="currentPost" class="detail-body" scroll-y>
      <!-- ===== 作者交互卡片 ===== -->
      <view class="author-card card-base">
        <!-- 作者基础信息 -->
        <view class="author-card__main">
          <view class="author-avatar">
            <image
              v-if="currentPost.author.avatar"
              class="author-avatar__img"
              :src="currentPost.author.avatar"
              mode="aspectFill"
            />
            <text v-else class="author-avatar__char">{{ currentPost.author.name[0] }}</text>
            <!-- 头像左上角身份徽章（校友） -->
            <view v-if="currentPost.isAlumni" class="author-avatar__badge">
              <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="author-avatar__badge-icon" mode="aspectFit" />
            </view>
          </view>
          <view class="author-info">
            <view class="author-info__name-row">
              <text class="author-info__name">{{ currentPost.author.name }}</text>
              <!-- 校友标签 -->
              <view v-if="currentPost.isAlumni" class="identity-tag identity-tag--alumni">
                <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="identity-tag__icon" mode="aspectFit" />
                <text class="identity-tag__text">校友</text>
              </view>
            </view>
            <text class="author-info__headline">{{ currentPost.author.headline }}</text>
          </view>
        </view>

        <!-- 学校标签 -->
        <view v-if="currentPost.author.campusName" class="author-card__tags">
          <view class="author-tag author-tag--campus">
            <text class="author-tag__text">{{ currentPost.author.campusName }}</text>
          </view>
        </view>

        <!-- 兴趣标签（按类别着色） -->
        <view v-if="currentPost.author.interests && currentPost.author.interests.length > 0" class="author-card__interests">
          <text
            v-for="interest in currentPost.author.interests"
            :key="interest"
            class="interest-chip"
            :class="getInterestChipClass(interest)"
          >{{ interest }}</text>
        </view>

        <!-- 操作按钮行 -->
        <view class="author-card__actions">
          <view
            class="action-btn action-btn--follow press-feedback"
            :class="{ 'action-btn--follow-active': currentPost.isFollowed }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleFollow"
          >
            <text class="action-btn__text">
              {{ currentPost.isFollowed ? "已关注" : "+ 关注" }}
            </text>
          </view>
          <view class="action-btn action-btn--message press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="sendMessage">
            <text class="action-btn__text">私信</text>
          </view>
        </view>
      </view>

      <!-- ===== 帖子正文 ===== -->
      <view class="detail-post">
        <view class="post-body">
          <text class="post-content">{{ currentPost.content }}</text>

          <!-- 图片网格 -->
          <view v-if="currentPost.images.length > 0" class="post-images">
            <image
              v-for="(img, idx) in currentPost.images"
              :key="idx"
              class="post-image"
              :src="img"
              mode="aspectFill"
        lazy-load
            />
          </view>

          <!-- 话题标签 -->
          <view v-if="currentPost.tags.length > 0" class="post-tags">
            <text
              v-for="(tag, idx) in currentPost.tags"
              :key="idx"
              class="post-tag"
              @tap="goToTagPosts(tag)"
            >{{ tag }}</text>
          </view>
        </view>

        <!-- 时间和互动数据 -->
        <view class="post-meta">
          <text class="post-time">{{ formatRelativeTime(currentPost.createdAt) }}</text>
          <view class="post-stats">
            <text class="post-stats__item">{{ currentPost.shares }} 转发</text>
            <text class="post-stats__item">{{ currentPost.comments }} 评论</text>
            <text class="post-stats__item">{{ currentPost.likes }} 赞</text>
          </view>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="comments-section">
        <view class="comments-header">
          <text class="comments-title">评论</text>
          <text class="comments-count">{{ comments.length }}</text>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="comments-loading">
          <view class="loading-spinner" />
          <text class="loading-text">加载评论中...</text>
        </view>

        <!-- 评论列表 -->
        <view v-else-if="comments.length > 0" class="comments-list">
          <view
            v-for="comment in comments"
            :key="comment.id"
            class="comment-item list-item"
            @longpress="handleReportComment(comment)"
          >
            <view class="comment-avatar">
              <image
                v-if="comment.author.avatar"
                class="comment-avatar__img"
                :src="comment.author.avatar"
                mode="aspectFill" lazy-load
              />
              <text v-else class="comment-avatar__text">{{ comment.author.name[0] }}</text>
            </view>
            <view class="comment-content">
              <view class="comment-header">
                <text class="comment-author">{{ comment.author.name }}</text>
                <text class="comment-time">{{ formatRelativeTime(comment.createdAt) }}</text>
              </view>
              <text class="comment-text">{{ comment.content }}</text>
              <view class="comment-actions">
                <view
                  class="comment-like"
                  :class="{ 'comment-like--active': comment.isLiked }"
                  @tap.stop="handleCommentLike(comment.id)"
                >
                  <text class="comment-like__icon">赞</text>
                  <text v-if="comment.likes > 0" class="comment-like__count">{{ comment.likes }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else class="comments-empty">
          <text class="comments-empty__text">暂无评论，快来抢沙发吧</text>
        </view>
      </view>

      <!-- ===== 相似作者推荐 ===== -->
      <view v-if="similarAuthors.length > 0" class="similar-authors-section">
        <view class="similar-authors-header">
          <text class="similar-authors-title">你可能还想认识</text>
          <text class="similar-authors-subtitle">兴趣相投的同学</text>
        </view>

        <view class="similar-authors-list">
          <view
            v-for="author in similarAuthors"
            :key="author.userId"
            class="similar-author-card list-item"
          >
            <view class="similar-author-main">
              <view class="similar-author-avatar">
                <image
                  v-if="author.avatar"
                  class="similar-author-avatar__img"
                  :src="author.avatar"
                  mode="aspectFill" lazy-load
                />
                <text v-else class="similar-author-avatar__char">{{ author.name[0] }}</text>
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
                    <text class="identity-tag__text">校友</text>
                  </view>
                </view>
                <text class="similar-author-headline">{{ author.headline }}</text>
                <!-- 共同兴趣 -->
                <view v-if="author.commonInterests.length > 0" class="similar-author-interests">
                  <text class="common-interest-label">共同兴趣：</text>
                  <text
                    v-for="(interest, idx) in author.commonInterests"
                    :key="interest"
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
                @tap="handleFollowSimilarAuthor(author.userId)"
              >
                <text class="action-btn__text">
                  {{ author.isFollowed ? "已关注" : "+ 关注" }}
                </text>
              </view>
              <view class="action-btn action-btn--message" @tap="sendMessageToSimilarAuthor(author.userId)">
                <text class="action-btn__text">私信</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="body-footer" />
    </scroll-view>

    <!-- 帖子不存在 -->
    <view v-else class="empty-state">
      <text class="empty-state__text">帖子不存在或已被删除</text>
      <view class="empty-state__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-text">返回广场</text>
      </view>
    </view>

    <!-- 底部互动栏 -->
    <view v-if="currentPost" class="detail-footer">
      <view class="comment-input-wrap">
        <input
          v-model="commentContent"
          class="comment-input"
          placeholder="写下你的评论..."
          confirm-type="send"
          @confirm="submitComment"
        />
      </view>
      <view class="footer-actions">
        <!-- 转发按钮 -->
        <view
          class="footer-action press-feedback"
          :class="{ 'footer-action--active': currentPost.isShared }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="openShareModal"
        >
          <text class="footer-action__icon">{{ currentPost.isShared ? "已转发" : "转发" }}</text>
          <text v-if="currentPost.shares > 0" class="footer-action__count">{{ currentPost.shares }}</text>
        </view>
        <!-- 私信按钮 -->
        <view class="footer-action press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="sendMessage">
          <text class="footer-action__icon">私信</text>
        </view>
        <!-- 点赞按钮 -->
        <view
          class="footer-action press-feedback"
          :class="{ 'footer-action--active': currentPost.isLiked }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleLike"
        >
          <text class="footer-action__icon">{{ currentPost.isLiked ? "已赞" : "点赞" }}</text>
          <text v-if="currentPost.likes > 0" class="footer-action__count">{{ currentPost.likes }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 转发确认弹窗 ===== -->
    <view v-if="showShareModal" class="share-modal-overlay" @tap="closeShareModal">
      <view class="share-modal" @tap.stop>
        <!-- 弹窗标题 -->
        <view class="share-modal__header">
          <text class="share-modal__title">转发到我的动态</text>
          <view class="share-modal__close press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="closeShareModal">
            <text class="share-modal__close-icon">X</text>
          </view>
        </view>

        <!-- 附加评论输入 -->
        <view class="share-modal__body">
          <textarea
            v-model="shareComment"
            class="share-modal__textarea"
            placeholder="说点什么吧（选填）..."
            :maxlength="200"
            auto-height
          />
          <text class="share-modal__count">{{ shareComment.length }}/200</text>
        </view>

        <!-- 操作按钮 -->
        <view class="share-modal__footer">
          <view class="share-modal__btn share-modal__btn--cancel press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="closeShareModal">
            <text class="share-modal__btn-text">取消</text>
          </view>
          <view
            class="share-modal__btn share-modal__btn--confirm press-feedback"
            :class="{ 'share-modal__btn--loading': isSharing }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="confirmShare"
          >
            <text class="share-modal__btn-text">{{ isSharing ? "转发中..." : "确认转发" }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: #3FCF8E;
$green-light: #E8F9F1;
$pink-primary: #EC4899;
$pink-light: #FCE7F3;
$gold-vip: #C9A36A;
$white: #FFFFFF;
$bg-page: #F4F6FA;
$text-primary: #1F2937;
$text-secondary: #6B7280;
$text-tertiary: #9CA3AF;
$border-light: #F3F4F6;
$card-soft-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

.detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: $bg-page;
}

/* ========== 顶部导航栏 ========== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, $green-primary 0%, #7CD9A6 60%, #F9A8C4 100%);
  z-index: 10;
}

.detail-header__back {
  padding: 8rpx 0;
  min-width: 80rpx;
}

.detail-header__back:active {
  opacity: 0.7;
  transform: scale(0.96);
}

.back-icon {
  font-size: 28rpx;
  color: $white;
  font-weight: 500;
}

.detail-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: $white;
}

.detail-header__spacer {
  min-width: 80rpx;
}

/* ========== 帖子内容容器 ========== */
.detail-body {
  flex: 1;
}

/* ================================================================
   作者交互卡片
   ================================================================ */
.author-card {
  background: $white;
  margin: 20rpx 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  box-shadow: $card-soft-shadow;
  transition: transform 0.15s ease;
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
  border-radius: 50%;
  overflow: visible;
  background: linear-gradient(135deg, $green-light, #C6F0DB);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 4rpx solid $green-light;
  /* Phase D1: 头像光环 - 双层品牌色阴影 */
  box-shadow: 0 0 0 4rpx var(--c-brand-50, #E8F8F0),
              0 0 0 8rpx var(--c-brand-100, #D1F0E0);
}

.author-avatar__img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

.author-avatar__char {
  font-size: 36rpx;
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
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-brand-400, #3FCF8E), var(--c-brand-500, #2DB97A));
  border: 2rpx solid $white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(63, 207, 142, 0.3);
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
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

/* 身份标签（校友等） */
.identity-tag {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 14rpx;
  border-radius: 999px;
  flex-shrink: 0;
}

.identity-tag--alumni {
  background: $green-light;
  border: 1rpx solid rgba(63, 207, 142, 0.3);
}

.identity-tag__icon {
  font-size: 22rpx;
}

.identity-tag__text {
  font-size: 22rpx;
  color: $green-primary;
  font-weight: 600;
}

.author-info__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
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
}

/* 学校标签 */
.author-card__tags {
  margin-bottom: 16rpx;
}

.author-tag--campus {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 18rpx;
  border-radius: 999px;
  background: linear-gradient(135deg, $pink-light, #FBCFE8);
}

.author-tag__text {
  font-size: 24rpx;
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
  border-radius: 999px;
  font-weight: 500;
}

/* Phase D1: 兴趣 chip 按类别着色（4 种颜色） */
.interest-chip--sports {
  color: var(--c-brand-500, #2DB97A);
  background: var(--c-brand-50, #E8F8F0);
}

.interest-chip--arts {
  color: var(--c-lavender-500, #8B5CF6);
  background: var(--c-lavender-50, #F5F3FF);
}

.interest-chip--tech {
  color: var(--c-sky-500, #0EA5E9);
  background: var(--c-sky-50, #F0F9FF);
}

.interest-chip--life {
  color: var(--c-apricot-500, #F97316);
  background: var(--c-apricot-50, #FFF7ED);
}

/* 操作按钮行 */
.author-card__actions {
  display: flex;
  gap: 20rpx;
}

.action-btn--follow {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 999px;
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.3);
}

.action-btn--follow:active {
  transform: scale(0.96);
}

.action-btn--follow-active {
  background: $bg-page;
  border: 2rpx solid $border-light;
  box-shadow: none;
}

.action-btn--message {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 999px;
  background: linear-gradient(135deg, $pink-primary, #F472B6);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  box-shadow: 0 4rpx 12rpx rgba(236, 72, 153, 0.3);
}

.action-btn--message:active {
  transform: scale(0.96);
}

.action-btn__text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

.action-btn--follow-active .action-btn__text {
  color: $text-tertiary;
}

.action-btn--message .action-btn__text {
  color: #ffffff;
}

/* ================================================================
   帖子正文卡片
   ================================================================ */
.detail-post {
  background: $white;
  padding: 28rpx 32rpx;
  margin: 0 24rpx 16rpx;
  border-radius: 24rpx;
  box-shadow: $card-soft-shadow;
}

/* 帖子正文 */
.post-body {
  margin-bottom: 24rpx;
}

.post-content {
  font-size: 30rpx;
  color: $text-primary;
  line-height: 1.8;
  display: block;
  margin-bottom: 20rpx;
}

/* 图片网格 */
.post-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.post-image {
  width: calc(33.33% - 7rpx);
  height: 220rpx;
  border-radius: 16rpx;
  background: $bg-page;
}

/* 话题标签 */
.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.post-tag {
  font-size: 26rpx;
  color: $green-primary;
  background: $green-light;
  padding: 8rpx 18rpx;
  border-radius: 999px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.post-tag:active {
  transform: scale(0.96);
  background: darken($green-light, 5%);
}

/* 帖子元信息 */
.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20rpx;
  border-top: 1rpx solid $border-light;
}

.post-time {
  font-size: 24rpx;
  color: $text-tertiary;
}

.post-stats {
  display: flex;
  gap: 24rpx;
}

.post-stats__item {
  font-size: 24rpx;
  color: $text-tertiary;
}

/* ========== 评论区 ========== */
.comments-section {
  background: $white;
  padding: 28rpx 32rpx;
  margin: 0 24rpx;
  border-radius: 24rpx;
  box-shadow: $card-soft-shadow;
}

/* ================================================================
   相似作者推荐
   ================================================================ */
.similar-authors-section {
  background: $white;
  padding: 28rpx 32rpx;
  margin: 16rpx 24rpx 0;
  border-radius: 24rpx;
  box-shadow: $card-soft-shadow;
}

.similar-authors-header {
  margin-bottom: 24rpx;
}

.similar-authors-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-primary;
  display: block;
}

.similar-authors-subtitle {
  font-size: 24rpx;
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
  border-radius: 20rpx;
  transition: transform 0.15s ease;
}

.similar-author-card:active {
  transform: scale(0.98);
}

.similar-author-main {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}

.similar-author-avatar {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: visible;
  background: linear-gradient(135deg, $green-light, #C6F0DB);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  /* Phase D1: 头像光环 */
  box-shadow: 0 0 0 4rpx var(--c-brand-50, #E8F8F0),
              0 0 0 8rpx var(--c-brand-100, #D1F0E0);
}

.similar-author-avatar__img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

.similar-author-avatar__char {
  font-size: 32rpx;
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
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-brand-400, #3FCF8E), var(--c-brand-500, #2DB97A));
  border: 2rpx solid $white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(63, 207, 142, 0.3);
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
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.similar-author-headline {
  font-size: 24rpx;
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
  font-size: 24rpx;
  color: $text-secondary;
}

.common-interest-chip {
  font-size: 24rpx;
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
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.similar-author-actions .action-btn--follow {
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.25);
}

.similar-author-actions .action-btn--follow:active {
  transform: scale(0.96);
}

.similar-author-actions .action-btn--follow-active {
  background: $white;
  border: 2rpx solid $border-light;
  box-shadow: none;
}

.similar-author-actions .action-btn--message {
  background: linear-gradient(135deg, $pink-primary, #F472B6);
  box-shadow: 0 4rpx 12rpx rgba(236, 72, 153, 0.25);
}

.similar-author-actions .action-btn--message:active {
  transform: scale(0.96);
}

.similar-author-actions .action-btn__text {
  font-size: 26rpx;
  font-weight: 600;
}

.similar-author-actions .action-btn--follow .action-btn__text {
  color: #ffffff;
}

.similar-author-actions .action-btn--follow-active .action-btn__text {
  color: $text-tertiary;
}

.similar-author-actions .action-btn--message .action-btn__text {
  color: #ffffff;
}

/* ========== 评论区 ========== */

.comments-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.comments-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-primary;
}

.comments-count {
  font-size: 26rpx;
  color: $green-primary;
  background: $green-light;
  padding: 4rpx 16rpx;
  border-radius: 999px;
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
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 26rpx;
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
  border-radius: 20rpx;
  transition: transform 0.15s ease;
}

.comment-item:active {
  transform: scale(0.98);
}

.comment-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, $green-light, #C6F0DB);
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
  font-size: 28rpx;
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

.comment-author {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
}

.comment-time {
  font-size: 22rpx;
  color: $text-tertiary;
}

.comment-text {
  font-size: 28rpx;
  color: $text-secondary;
  line-height: 1.6;
  display: block;
  margin-bottom: 12rpx;
}

.comment-actions {
  display: flex;
  align-items: center;
}

.comment-like {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  border-radius: 999px;
  background: $white;
  transition: all 0.15s ease;
}

.comment-like:active {
  transform: scale(0.96);
}

.comment-like__icon {
  font-size: 24rpx;
  color: $text-tertiary;
}

.comment-like__count {
  font-size: 24rpx;
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
  font-size: 28rpx;
  color: $text-tertiary;
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
  font-size: 30rpx;
  color: $text-tertiary;
}

.empty-state__back {
  padding: 18rpx 48rpx;
  border-radius: 999px;
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.3);
  transition: all 0.15s ease;
}

.empty-state__back:active {
  transform: scale(0.96);
}

.back-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

/* ========== 底部互动栏 ========== */
.detail-footer {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 32rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  background: $white;
  border-top: 1rpx solid $border-light;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.03);
}

.comment-input-wrap {
  flex: 1;
}

.comment-input {
  padding: 18rpx 28rpx;
  border-radius: 999px;
  background: $bg-page;
  font-size: 28rpx;
  color: $text-primary;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex-shrink: 0;
}

.footer-action {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 16rpx;
  border-radius: 999px;
  transition: all 0.15s ease;
}

.footer-action:active {
  transform: scale(0.96);
  background: $bg-page;
}

.footer-action__icon {
  font-size: 26rpx;
  color: $text-tertiary;
  font-weight: 500;
}

.footer-action__count {
  font-size: 24rpx;
  color: $text-tertiary;
}

.footer-action--active .footer-action__icon,
.footer-action--active .footer-action__count {
  color: $pink-primary;
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.share-modal {
  width: 620rpx;
  background: $white;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
}

.share-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 20rpx;
  border-bottom: 1rpx solid $border-light;
}

.share-modal__title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-primary;
}

.share-modal__close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $bg-page;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.share-modal__close:active {
  transform: scale(0.96);
  background: darken($bg-page, 3%);
}

.share-modal__close-icon {
  font-size: 26rpx;
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
  border-radius: 20rpx;
  background: $bg-page;
  font-size: 28rpx;
  color: $text-primary;
  box-sizing: border-box;
}

.share-modal__count {
  display: block;
  text-align: right;
  font-size: 22rpx;
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
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.share-modal__btn:active {
  transform: scale(0.96);
}

.share-modal__btn--cancel {
  background: $bg-page;
  border: 2rpx solid $border-light;
}

.share-modal__btn--confirm {
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.3);
}

.share-modal__btn--loading {
  opacity: 0.6;
  pointer-events: none;
}

.share-modal__btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-secondary;
}

.share-modal__btn--confirm .share-modal__btn-text {
  color: #ffffff;
}
</style>