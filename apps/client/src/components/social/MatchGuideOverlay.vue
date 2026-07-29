<script setup lang="ts">
/**
 * 匹配成功引导弹窗组件
 *
 * 匹配成功后展示破冰话题、共同兴趣圈、活动推荐，
 * 引导用户从匹配进入对话，降低破冰门槛。
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IMAGE_PATHS } from '../../config/images'

const { t } = useI18n()

// ==================== Props ====================

const props = defineProps<{
  /** 匹配对象昵称 */
  partnerName: string
  /** 匹配对象头像 */
  partnerAvatar: string
  /** 破冰话题列表 */
  icebreakers: string[]
  /** 共同兴趣圈 */
  commonCircles: Array<{ id: string; name: string; icon: string }>
  /** 推荐活动 */
  activities: Array<{ id: string; title: string; scheduleText: string }>
  /** 会话ID（用于跳转聊天） */
  sessionId?: string
}>()

// ==================== Emits ====================

const emit = defineEmits<{
  /** 关闭弹窗 */
  (e: 'close'): void
  /** 选择破冰话题 */
  (e: 'select-icebreaker', topic: string): void
  /** 开始聊天 */
  (e: 'start-chat'): void
}>()

// ==================== 状态 ====================

const visible = ref(true)

// ==================== 方法 ====================

function close() {
  visible.value = false
  emit('close')
}

function selectIcebreaker(topic: string) {
  emit('select-icebreaker', topic)
  close()
}

function startChat() {
  emit('start-chat')
  close()
}

/** 副标题：包含匹配对象昵称 */
const subtitleText = computed(() =>
  t('matchGuide.subtitle', { name: props.partnerName })
)

/** 弹窗整体 ARIA 标签 */
const overlayAriaLabel = computed(() =>
  t('matchGuide.ariaLabel', { name: props.partnerName })
)

// 修复（严格模式 noUnusedLocals）：overlayAriaLabel 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用。
defineExpose({ overlayAriaLabel });
</script>

<template>
  <view
    v-if="visible"
    class="mgo-overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="overlayAriaLabel"
  >
    <view
      class="mgo-mask"
      @tap="close"
      role="button"
      :aria-label="t('matchGuide.maskAria')"
    />
    <view class="mgo-card">
      <!-- 匹配成功头部 -->
      <view class="mgo-header">
        <view class="mgo-avatars">
          <view class="mgo-avatar-placeholder">
            <image
              class="mgo-avatar-img"
              :src="IMAGE_PATHS.ICONS_SOCIAL.MATCH"
              mode="aspectFit"
              role="img"
              :aria-label="t('discover.matchSuccessTitle')"
            />
          </view>
        </view>
        <text class="mgo-title">{{ t('discover.matchSuccessTitle') }}</text>
        <text class="mgo-subtitle">{{ subtitleText }}</text>
      </view>

      <!-- 破冰话题推荐 -->
      <view v-if="icebreakers.length" class="mgo-section">
        <text class="mgo-section-title">{{ t('matchGuide.icebreakerTitle') }}</text>
        <view class="mgo-topic-list" role="list">
          <view
            v-for="(topic, index) in icebreakers" :key="index"
            class="mgo-topic-chip"
            @tap="selectIcebreaker(topic)"
            role="button"
            :aria-label="t('matchGuide.icebreakerAria', { topic })"
          >
            <text class="mgo-topic-text">{{ topic }}</text>
          </view>
        </view>
      </view>

      <!-- 共同兴趣圈 -->
      <view v-if="commonCircles.length" class="mgo-section">
        <text class="mgo-section-title">{{ t('matchGuide.commonCircleTitle') }}</text>
        <view class="mgo-circle-list" role="list">
          <view
            v-for="circle in commonCircles" :key="circle.id"
            class="mgo-circle-chip"
            role="img"
            :aria-label="circle.name"
          >
            <text class="mgo-circle-icon">{{ circle.icon }}</text>
            <text class="mgo-circle-name">{{ circle.name }}</text>
          </view>
        </view>
      </view>

      <!-- 活动推荐 -->
      <view v-if="activities.length" class="mgo-section">
        <text class="mgo-section-title">{{ t('matchGuide.activityTitle') }}</text>
        <view class="mgo-activity-list" role="list">
          <view
            v-for="act in activities" :key="act.id"
            class="mgo-activity-item"
            role="img"
            :aria-label="t('matchGuide.activityAria', { title: act.title, time: act.scheduleText })"
          >
            <text class="mgo-activity-title">{{ act.title }}</text>
            <text class="mgo-activity-time">{{ act.scheduleText }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="mgo-actions">
        <view
          class="mgo-btn mgo-btn--primary"
          @tap="startChat"
          role="button"
          :aria-label="t('matchGuide.startChat')"
        >
          {{ t('matchGuide.startChat') }}
        </view>
        <view
          class="mgo-btn mgo-btn--ghost"
          @tap="close"
          role="button"
          :aria-label="t('matchGuide.later')"
        >
          {{ t('matchGuide.later') }}
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 弹窗容器 ==================== */
.mgo-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mgo-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-overlay-strong);
  /* mp-weixin 不支持，H5 保留毛玻璃；mp-weixin 通过提高遮罩不透明度 0.5→0.7 近似降级 */
  // #ifdef H5
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);
  // #endif
}

/* ==================== 卡片 ==================== */
.mgo-card {
  position: relative;
  width: 620rpx;
  max-height: 80vh;
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 32rpx);
  padding: 48rpx 36rpx;
  box-shadow: 0 20rpx 60rpx var(--c-neutral-shadow-xl), 0 4rpx 16rpx var(--c-neutral-shadow-md);
  overflow-y: auto;
}

/* ==================== 头部 ==================== */
.mgo-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 36rpx;
}

.mgo-avatars {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mgo-avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: var(--r-circle, 50%);
  background: linear-gradient(135deg, var(--c-brand-50), var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx var(--c-secondary-blue-bg-tint-light);
}

.mgo-avatar-emoji {
  font-size: var(--fs-7xl, 56rpx);
}

.mgo-title {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 800;
  color: var(--c-text-primary);
}

.mgo-subtitle {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary);
}

/* ==================== 区块 ==================== */
.mgo-section {
  margin-bottom: 28rpx;
}

.mgo-section-title {
  display: block;
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
  color: var(--c-text-primary);
  margin-bottom: 16rpx;
}

/* ==================== 破冰话题 ==================== */
.mgo-topic-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.mgo-topic-chip {
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, var(--c-brand-50), var(--c-secondary-blue-bg-tint));
  border-radius: var(--r-lg, 16rpx);
  border: 1px solid var(--c-secondary-blue-border-tint);
  transition: all var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.mgo-topic-chip:active {
  transform: scale(0.98);
  background: var(--c-brand-100);
}

.mgo-topic-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-secondary-blue-500);
  line-height: 1.4;
}

/* ==================== 兴趣圈 ==================== */
.mgo-circle-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.mgo-circle-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: var(--c-bg-surface);
  border-radius: var(--r-full, 9999rpx);
}

.mgo-circle-icon {
  font-size: var(--fs-lg, 28rpx);
}

.mgo-circle-name {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary);
}

/* ==================== 活动 ==================== */
.mgo-activity-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.mgo-activity-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  background: var(--c-bg-surface);
  border-radius: var(--r-md, 12rpx);
  transition: all var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.mgo-activity-item:active {
  background: var(--c-border-default);
}

.mgo-activity-title {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary);
  font-weight: 500;
}

.mgo-activity-time {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-secondary);
}

/* ==================== 操作按钮 ==================== */
.mgo-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 32rpx;
}

.mgo-btn {
  width: 100%;
  height: 88rpx;
  border-radius: var(--r-full, 9999rpx);
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  transition: all var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.mgo-btn:active {
  transform: scale(0.97);
}

.mgo-btn--primary {
  background: var(--c-secondary-blue-400);
  color: var(--c-text-inverse);
  box-shadow: 0 4rpx 16rpx var(--c-secondary-blue-shadow-soft);
}

.mgo-btn--ghost {
  background: transparent;
  color: var(--c-text-secondary);
}

.mgo-btn--ghost:active {
  background: var(--c-bg-surface);
  color: var(--c-secondary-blue-400);
}
</style>
