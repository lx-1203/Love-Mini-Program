<script setup lang="ts">
/**
 * 聊天页 - 会话列表
 */
import { ref } from "vue";
import { openAppPath } from "../../utils/navigation";

// 会话列表（模拟）
const conversations = ref([
  {
    id: "1",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=10",
    nickname: "小红",
    lastMessage: "今晚一起去图书馆吗？",
    time: "10:30",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=11",
    nickname: "小明",
    lastMessage: "好的，明天见！",
    time: "昨天",
    unread: 0,
    online: false,
  },
  {
    id: "3",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=12",
    nickname: "校园活动助手",
    lastMessage: "您报名的「周末音乐节」即将开始",
    time: "昨天",
    unread: 1,
    online: true,
    isOfficial: true,
  },
  {
    id: "4",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=13",
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
  openAppPath(`/subpackages/chat/detail/index?id=${conversationId}`);
}
</script>

<template>
  <view class="chat-page">
    <!-- 页面标题 -->
    <view class="chat-header">
      <text class="chat-header__title">聊天</text>
    </view>

    <!-- 话题推荐助手 -->
    <view class="topic-assistant">
      <text class="topic-assistant__label">💡 话题推荐</text>
      <scroll-view scroll-x class="topic-scroll" show-scrollbar="false">
        <view class="topic-list">
          <view
            v-for="(topic, index) in topicSuggestions"
            :key="index"
            class="topic-tag"
          >
            <text class="topic-tag__text">{{ topic }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 会话列表 -->
    <scroll-view scroll-y class="chat-scroll">
      <view class="conversation-list">
        <view
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          @click="goToChat(conv.id)"
        >
          <view class="conversation-item__avatar-wrap">
            <image class="conversation-item__avatar" :src="conv.avatar" mode="aspectFill" />
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
  height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 页面标题 ========== */
.chat-header {
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  background: linear-gradient(to bottom, var(--td-bg-app-page), transparent);
  z-index: 10;
}

.chat-header__title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

/* ========== 话题推荐助手 ========== */
.topic-assistant {
  padding: 16rpx 32rpx;
  background: linear-gradient(135deg, var(--td-brand-color-1), rgba(37, 99, 235, 0.05));
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.topic-assistant__label {
  font-size: 24rpx;
  color: var(--td-brand-color-6);
  font-weight: 600;
  margin-bottom: 12rpx;
  display: block;
}

.topic-scroll {
  width: 100%;
}

.topic-list {
  display: flex;
  gap: 12rpx;
  padding-right: 32rpx;
}

.topic-tag {
  flex-shrink: 0;
  padding: 10rpx 20rpx;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid var(--td-brand-color-3);
}

.topic-tag__text {
  font-size: 24rpx;
  color: var(--td-brand-color-6);
}

/* ========== 滚动区域 ========== */
.chat-scroll {
  flex: 1;
  overflow: hidden;
}

/* ========== 会话列表 ========== */
.conversation-list {
  display: flex;
  flex-direction: column;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 32rpx;
  background: #ffffff;
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.conversation-item:active {
  background: var(--td-bg-color-surface);
}

.conversation-item__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.conversation-item__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--td-bg-color-surface);
}

.conversation-item__online {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #10b981;
  border: 3rpx solid #ffffff;
}

.conversation-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.conversation-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item__name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.conversation-item__time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.conversation-item__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item__message {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 16rpx;
}

.conversation-item__badge {
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.conversation-item__badge-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 600;
}

.conversation-item__official {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: var(--td-brand-color-1);
}

.conversation-item__official text {
  font-size: 20rpx;
  color: var(--td-brand-color-6);
  font-weight: 600;
}

/* ========== 底部留白 ========== */
.chat-footer {
  height: 40rpx;
}
</style>
