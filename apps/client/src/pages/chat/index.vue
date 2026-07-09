<script setup lang="ts">
/**
 * 聊天页 - 会话列表
 */
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { openAppPath } from "../../utils/navigation";
import Skeleton from "../../components/common/Skeleton.vue";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";

/** SVG 图标资源路径 */
const iconSrc = {
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
} as const;

// 加载状态
const loading = ref(true);

// 会话列表（模拟）
const conversations = ref([
  {
    id: "1",
    avatar: "/static/default-avatar.png",
    nickname: "小红",
    lastMessage: "今晚一起去图书馆吗？",
    time: "10:30",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    avatar: "/static/default-avatar.png",
    nickname: "小明",
    lastMessage: "好的，明天见！",
    time: "昨天",
    unread: 0,
    online: false,
  },
  {
    id: "3",
    avatar: "/static/default-avatar.png",
    nickname: "校园活动助手",
    lastMessage: "您报名的「周末音乐节」即将开始",
    time: "昨天",
    unread: 1,
    online: true,
    isOfficial: true,
  },
  {
    id: "4",
    avatar: "/static/default-avatar.png",
    nickname: "阿杰",
    lastMessage: "谢谢你的资料分享！",
    time: "周一",
    unread: 0,
    online: true,
  },
]);

// 话题推荐
const topicSuggestions = ref([
  "周末有什么安排？",
  "推荐一本好书",
  "一起上自习吗？",
  "食堂哪个窗口好吃？",
]);

function goToChat(conversationId: string) {
  openAppPath(`/pages/chat-session/index?sessionId=${conversationId}`);
}

// 模拟加载
onMounted(() => {
  setTimeout(() => {
    loading.value = false;
  }, 800);
});
</script>

<template>
  <view class="chat-page page-bottom-safe page-fade-in">
    <!-- 页面顶部渐变氛围 -->
    <view class="chat-header-overlay" />
    
    <!-- 页面标题 -->
    <view class="chat-header">
      <view class="chat-header__title-area">
        <text class="chat-header__title">聊天</text>
        <text class="chat-header__subtitle">与匹配对象的消息</text>
      </view>
    </view>

    <!-- 话题推荐助手 -->
    <view class="topic-assistant">
      <view class="topic-assistant__label">
        <SafeImage :src="iconSrc.message" custom-class="topic-assistant__label-icon" mode="aspectFit" />
        <text>话题推荐</text>
      </view>
      <scroll-view scroll-x class="topic-scroll" show-scrollbar="false">
        <view class="topic-list">
          <view
            v-for="(topic, index) in topicSuggestions"
            :key="index"
            class="topic-tag press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
          >
            <text class="topic-tag__text">{{ topic }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 会话列表 -->
    <scroll-view scroll-y class="chat-scroll">
      <!-- 骨架屏加载 -->
      <view v-if="loading" class="conversation-list">
        <Skeleton variant="list" :count="4" />
      </view>

      <!-- 正常内容 -->
      <view v-else class="conversation-list card-base">
        <view
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="goToChat(conv.id)"
        >
          <view class="conversation-item__avatar-wrap">
            <SafeImage :src="conv.avatar" custom-class="conversation-item__avatar" mode="aspectFill" />
            <view v-if="conv.online" class="conversation-item__online" />
          </view>
          <view class="conversation-item__content">
            <view class="conversation-item__top">
              <text class="conversation-item__name">{{ conv.nickname }}</text>
              <text class="conversation-item__time">{{ conv.time }}</text>
            </view>
            <view class="conversation-item__bottom">
              <text class="conversation-item__message">{{ conv.lastMessage }}</text>
              <view v-if="conv.unread > 0" class="conversation-item__badge">
                <text class="conversation-item__badge-text">{{ conv.unread }}</text>
              </view>
            </view>
          </view>
          <view v-if="conv.isOfficial" class="conversation-item__official">
            <text>官方</text>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="chat-footer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.chat-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--c-gradient-page);
  position: relative;
}

.chat-header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300rpx;
  background: var(--c-gradient-brand-overlay);
  pointer-events: none;
  z-index: 0;
}

/* ========== 页面标题 ========== */
.chat-header {
  padding: var(--sp-6) var(--sp-8) var(--sp-5);
  padding-top: calc(constant(safe-area-inset-top) + var(--sp-6));
  padding-top: calc(env(safe-area-inset-top) + var(--sp-6));
  z-index: 10;
  position: relative;
}

.chat-header__title-area {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.chat-header__title {
  font-size: var(--fs-6xl);
  font-weight: 800;
  color: var(--c-text-primary);
  letter-spacing: 1rpx;
  line-height: 1.2;
}

.chat-header__subtitle {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  font-weight: 400;
}

/* ========== 话题推荐助手 ========== */
.topic-assistant {
  padding: var(--sp-5) var(--sp-6);
  margin: 0 var(--sp-8) var(--sp-5);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-romance-50) 100%);
  border-radius: var(--r-xl);
  position: relative;
  z-index: 1;
}

.topic-assistant__label {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-base);
  color: var(--c-brand);
  font-weight: 600;
  margin-bottom: var(--sp-3);
}

.topic-assistant__label-icon {
  width: var(--sp-7);
  height: var(--sp-7);
  opacity: 0.7;
}

.topic-scroll {
  width: 100%;
}

.topic-list {
  display: flex;
  gap: var(--sp-3);
  padding-right: 0;
}

.topic-tag {
  flex-shrink: 0;
  padding: var(--sp-3) var(--sp-6);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  box-shadow: var(--s-sm);
  transition: transform 0.15s ease;
}

.topic-tag:active {
  transform: scale(0.96);
}

.topic-tag__text {
  font-size: var(--fs-base);
  color: var(--c-brand);
  font-weight: 500;
}

/* ========== 滚动区域 ========== */
.chat-scroll {
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* ========== 会话列表 ========== */
.conversation-list {
  display: flex;
  flex-direction: column;
  margin: 0 var(--sp-8);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-6) var(--sp-8);
  background: var(--c-bg-container);
  position: relative;
  transition: transform 0.15s ease, background 0.15s ease;
}

.conversation-item:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 140rpx;
  right: 0;
  bottom: 0;
  height: 1rpx;
  background: var(--c-divider-light);
}

.conversation-item:active {
  background: var(--c-neutral-50);
  transform: scale(0.98);
}

.conversation-item__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.conversation-item__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand));
  border: var(--sp-1) solid var(--c-bg-container);
  box-shadow: var(--s-brand-sm);
}

.conversation-item__online {
  position: absolute;
  bottom: var(--sp-1);
  right: var(--sp-1);
  width: var(--sp-5);
  height: var(--sp-5);
  border-radius: var(--r-full);
  background: var(--c-success);
  border: var(--sp-1) solid var(--c-bg-container);
}

.conversation-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.conversation-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item__name {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.conversation-item__time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.conversation-item__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item__message {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: var(--sp-4);
}

.conversation-item__badge {
  min-width: var(--sp-9);
  height: var(--sp-9);
  border-radius: var(--r-full);
  background: var(--c-error);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--sp-2);
}

.conversation-item__badge-text {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  font-weight: 700;
}

.conversation-item__official {
  flex-shrink: 0;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-sm);
  background: var(--c-bg-brand);
}

.conversation-item__official text {
  font-size: var(--fs-xs);
  color: var(--c-brand);
  font-weight: 600;
}

/* ========== 底部留白 ========== */
.chat-footer {
  height: var(--sp-10);
}
</style>
