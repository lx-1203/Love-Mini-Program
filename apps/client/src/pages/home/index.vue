<script setup lang="ts">
/**
 * 首页 - 校园聚合页
 * 包含：学校选择器、校园圈活动、课表空档、校园墙、逛逛推荐、社交升温进度
 */
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "../../stores/activity";
import { useCheckInStore } from "../../stores/checkin";
import { useSocialProgressStore } from "../../stores/social-progress";
import { openAppPath } from "../../utils/navigation";
import SocialProgressIndicator from "../../components/social/SocialProgressIndicator.vue";
import SocialOnboardingOverlay, {
  hasSeenOnboarding,
} from "../../components/social/SocialOnboardingOverlay.vue";

const activityStore = useActivityStore();
const checkInStore = useCheckInStore();
const socialProgressStore = useSocialProgressStore();

// 学校选择
const currentSchool = ref("北京大学");
const schools = ["北京大学", "清华大学", "复旦大学", "浙江大学"];
const showSchoolPicker = ref(false);

function selectSchool(school: string) {
  currentSchool.value = school;
  showSchoolPicker.value = false;
}

// 课表数据（模拟）
const weekDays = ["周一", "周二", "周三", "周四", "周五"];
const currentDay = ref(0);
const schedule = ref([
  { time: "08:00-09:35", course: "高等数学", classroom: "教三201", occupied: true },
  { time: "10:00-11:35", course: "", classroom: "", occupied: false },
  { time: "14:00-15:35", course: "大学英语", classroom: "外语楼301", occupied: true },
  { time: "16:00-17:35", course: "", classroom: "", occupied: false },
  { time: "19:00-20:35", course: "", classroom: "", occupied: false },
]);

// 校园墙帖子（模拟）
const posts = ref([
  {
    id: "1",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
    nickname: "小明",
    school: "北京大学",
    grade: "大三",
    content: "今天在图书馆看到一本好书，推荐给大家！",
    images: ["https://picsum.photos/300/300?random=1"],
    location: "图书馆",
    likes: 23,
    comments: 5,
    isLiked: false,
  },
  {
    id: "2",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
    nickname: "小红",
    school: "清华大学",
    grade: "大二",
    content: "有人一起上晚自习吗？求组队！",
    images: [],
    location: "教学楼",
    likes: 15,
    comments: 8,
    isLiked: true,
  },
]);

// 逛逛推荐（模拟）
const shopItems = ref([
  { id: "1", title: "校园文创帆布袋", price: 29.9, sales: 128, image: "https://picsum.photos/200/200?random=10" },
  { id: "2", title: "音乐节早鸟票", price: 99, sales: 56, image: "https://picsum.photos/200/200?random=11" },
  { id: "3", title: "食堂优惠券", price: 9.9, sales: 234, image: "https://picsum.photos/200/200?random=12" },
]);

// ==================== 社交升温进度 ====================

/** 是否展开完整的升温进度指示器 */
const showSocialProgress = ref(false);

/** 是否展示新用户引导浮层 */
const showOnboarding = ref(false);

/** 切换升温进度展开/收起 */
function toggleSocialProgress() {
  showSocialProgress.value = !showSocialProgress.value;
}

/** 关闭引导浮层 */
function handleOnboardingClose() {
  showOnboarding.value = false;
}

/** 用户完成引导，关闭浮层并展开进度 */
function handleOnboardingStart() {
  showOnboarding.value = false;
  showSocialProgress.value = true;
}

function toggleLike(postId: string) {
  const post = posts.value.find((p) => p.id === postId);
  if (post) {
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
  }
}

onMounted(() => {
  void activityStore.fetchActivities();
  void checkInStore.fetchStatus();
  void socialProgressStore.fetchProgress();

  // 新用户首次访问时展示社交升温引导浮层
  if (!hasSeenOnboarding()) {
    showOnboarding.value = true;
  }
});
</script>

<template>
  <view class="home-page">
    <!-- 顶部学校选择器 -->
    <view class="home-header">
      <view class="school-selector" @click="showSchoolPicker = true">
        <text class="school-selector__icon">🏫</text>
        <text class="school-selector__name">{{ currentSchool }}</text>
        <text class="school-selector__arrow">▼</text>
      </view>
      <view class="school-badge">
        <text class="school-badge__text">本校限定</text>
      </view>
    </view>

    <!-- 学校选择弹窗 -->
    <view v-if="showSchoolPicker" class="school-picker" @click="showSchoolPicker = false">
      <view class="school-picker__content" @click.stop>
        <view class="school-picker__header">
          <text class="school-picker__title">选择学校</text>
          <text class="school-picker__close" @click="showSchoolPicker = false">✕</text>
        </view>
        <view class="school-picker__list">
          <view
            v-for="school in schools"
            :key="school"
            class="school-picker__item"
            :class="{ 'school-picker__item--active': school === currentSchool }"
            @click="selectSchool(school)"
          >
            <text class="school-picker__item-name">{{ school }}</text>
            <text v-if="school === currentSchool" class="school-picker__item-check">✓</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="home-scroll">
      <!-- 校园圈活动 -->
      <view class="section">
        <view class="section__header">
          <text class="section__title">🎉 校园圈活动</text>
          <text class="section__more" @click="openAppPath('/pages/circle/index')">更多 ›</text>
        </view>
        <scroll-view scroll-x class="activity-scroll" show-scrollbar="false">
          <view class="activity-list">
            <view
              v-for="item in activityStore.activities.slice(0, 5)"
              :key="item.id"
              class="activity-card"
              @click="openAppPath('/subpackages/discover/activities/index')"
            >
              <view class="activity-card__image">
                <text class="activity-card__placeholder">🎊</text>
              </view>
              <view class="activity-card__info">
                <text class="activity-card__title">{{ item.title }}</text>
                <text class="activity-card__time">{{ item.scheduleText }}</text>
                <view class="activity-card__status" :class="`activity-card__status--${item.status}`">
                  <text>{{ item.status === 'open' ? '报名中' : item.status === 'ongoing' ? '进行中' : '预告' }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 课表空档 -->
      <view class="section">
        <view class="section__header">
          <text class="section__title">📅 课表空档</text>
          <text class="section__more" @click="openAppPath('/subpackages/setup/schedule/index')">编辑课表 ›</text>
        </view>
        <view class="schedule-card">
          <view class="schedule-days">
            <view
              v-for="(day, index) in weekDays"
              :key="day"
              class="schedule-day"
              :class="{ 'schedule-day--active': currentDay === index }"
              @click="currentDay = index"
            >
              <text class="schedule-day__name">{{ day }}</text>
            </view>
          </view>
          <view class="schedule-slots">
            <view
              v-for="(slot, index) in schedule"
              :key="index"
              class="schedule-slot"
              :class="{ 'schedule-slot--free': !slot.occupied }"
            >
              <text class="schedule-slot__time">{{ slot.time }}</text>
              <view class="schedule-slot__content">
                <text v-if="slot.occupied" class="schedule-slot__course">{{ slot.course }}</text>
                <text v-if="slot.occupied" class="schedule-slot__classroom">{{ slot.classroom }}</text>
                <text v-else class="schedule-slot__free">空闲 ✨</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 校园墙 -->
      <view class="section">
        <view class="section__header">
          <text class="section__title">💬 校园墙</text>
          <text class="section__more" @click="openAppPath('/pages/circle/index')">进入圈子 ›</text>
        </view>
        <view class="post-list">
          <view v-for="post in posts" :key="post.id" class="post-card">
            <view class="post-card__header">
              <image class="post-card__avatar" :src="post.avatar" mode="aspectFill" />
              <view class="post-card__meta">
                <text class="post-card__nickname">{{ post.nickname }}</text>
                <text class="post-card__school">{{ post.school }} · {{ post.grade }}</text>
              </view>
            </view>
            <text class="post-card__content">{{ post.content }}</text>
            <view v-if="post.images.length > 0" class="post-card__images">
              <image
                v-for="(img, idx) in post.images"
                :key="idx"
                class="post-card__image"
                :src="img"
                mode="aspectFill"
              />
            </view>
            <view class="post-card__footer">
              <text class="post-card__location">📍 {{ post.location }}</text>
              <view class="post-card__actions">
                <view class="post-card__action" @click="toggleLike(post.id)">
                  <text :class="post.isLiked ? 'post-card__action--active' : ''">
                    {{ post.isLiked ? '❤️' : '🤍' }} {{ post.likes }}
                  </text>
                </view>
                <view class="post-card__action">
                  <text>💬 {{ post.comments }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 逛逛推荐 -->
      <view class="section">
        <view class="section__header">
          <text class="section__title">🛍️ 逛逛推荐</text>
          <text class="section__more" @click="openAppPath('/pages/shop/index')">更多 ›</text>
        </view>
        <scroll-view scroll-x class="shop-scroll" show-scrollbar="false">
          <view class="shop-list">
            <view
              v-for="item in shopItems"
              :key="item.id"
              class="shop-card"
              @click="openAppPath('/subpackages/shop/detail/index')"
            >
              <image class="shop-card__image" :src="item.image" mode="aspectFill" />
              <text class="shop-card__title">{{ item.title }}</text>
              <view class="shop-card__bottom">
                <text class="shop-card__price">¥{{ item.price }}</text>
                <text class="shop-card__sales">已售 {{ item.sales }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 社交升温进度卡片 -->
      <view class="section">
        <view class="section__header">
          <text class="section__title">🔥 社交升温进度</text>
          <text class="section__more" @click="toggleSocialProgress">
            {{ showSocialProgress ? '收起 ›' : '展开 ›' }}
          </text>
        </view>

        <!-- 紧凑进度小卡片 -->
        <view v-if="!showSocialProgress" class="social-mini-card" @click="toggleSocialProgress">
          <view class="social-mini-card__progress">
            <view class="social-mini-card__bar-track">
              <view
                class="social-mini-card__bar-fill"
                :style="{ width: socialProgressStore.progressPercentage + '%' }"
              />
            </view>
            <text class="social-mini-card__percent">
              {{ socialProgressStore.progressPercentage }}%
            </text>
          </view>
          <view class="social-mini-card__info">
            <text class="social-mini-card__label">
              {{ socialProgressStore.progress?.tierLabel ?? '加载中...' }}
            </text>
            <text class="social-mini-card__hint">
              {{ socialProgressStore.nextAction || '点击查看完整进度' }}
            </text>
          </view>
          <text class="social-mini-card__arrow">›</text>
        </view>

        <!-- 完整进度指示器 -->
        <SocialProgressIndicator v-else />
      </view>

      <!-- 底部留白 -->
      <view class="home-footer" />
    </scroll-view>

    <!-- 社交升温新用户引导浮层 -->
    <SocialOnboardingOverlay
      v-if="showOnboarding"
      @close="handleOnboardingClose"
      @start="handleOnboardingStart"
    />
  </view>
</template>

<style scoped lang="scss">
.home-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 顶部学校选择器 ========== */
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  background: linear-gradient(to bottom, var(--td-bg-app-page), transparent);
  z-index: 10;
}

.school-selector {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.school-selector__icon {
  font-size: 32rpx;
}

.school-selector__name {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.school-selector__arrow {
  font-size: 20rpx;
  color: var(--td-text-color-secondary);
  margin-left: 4rpx;
}

.school-badge {
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
  padding: 6rpx 16rpx;
  border-radius: 999px;
}

.school-badge__text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 600;
}

/* ========== 学校选择弹窗 ========== */
.school-picker {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.school-picker__content {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 32rpx);
}

.school-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.school-picker__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.school-picker__close {
  font-size: 32rpx;
  color: var(--td-text-color-secondary);
  padding: 8rpx;
}

.school-picker__list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.school-picker__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-radius: 16rpx;
  background: var(--td-bg-color-surface);
}

.school-picker__item--active {
  background: var(--td-brand-color-1);
}

.school-picker__item-name {
  font-size: 28rpx;
  color: var(--td-text-color-primary);
}

.school-picker__item-check {
  font-size: 28rpx;
  color: var(--td-brand-color-6);
  font-weight: 700;
}

/* ========== 滚动区域 ========== */
.home-scroll {
  flex: 1;
  overflow: hidden;
}

/* ========== 通用区块 ========== */
.section {
  margin-bottom: 24rpx;
  padding: 0 32rpx;
}

.section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.section__more {
  font-size: 26rpx;
  color: var(--td-brand-color-6);
  font-weight: 500;
}

/* ========== 活动横向滚动 ========== */
.activity-scroll {
  width: 100%;
}

.activity-list {
  display: flex;
  gap: 20rpx;
  padding-right: 32rpx;
}

.activity-card {
  flex-shrink: 0;
  width: 280rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
}

.activity-card__image {
  width: 100%;
  height: 160rpx;
  background: linear-gradient(135deg, var(--td-brand-color-2), var(--td-brand-color-3));
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-card__placeholder {
  font-size: 48rpx;
}

.activity-card__info {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.activity-card__title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-card__time {
  font-size: 22rpx;
  color: var(--td-text-color-secondary);
}

.activity-card__status {
  display: inline-flex;
  padding: 4rpx 12rpx;
  border-radius: 999px;
  align-self: flex-start;
}

.activity-card__status--open {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.activity-card__status--ongoing {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.activity-card__status--upcoming {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

/* ========== 课表空档 ========== */
.schedule-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
}

.schedule-days {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.schedule-day {
  flex: 1;
  padding: 12rpx 0;
  border-radius: 12rpx;
  background: var(--td-bg-color-surface);
  text-align: center;
}

.schedule-day--active {
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
}

.schedule-day__name {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.schedule-day--active .schedule-day__name {
  color: #ffffff;
  font-weight: 600;
}

.schedule-slots {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.schedule-slot {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: var(--td-bg-color-surface);
}

.schedule-slot--free {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.15);
}

.schedule-slot__time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  width: 140rpx;
  flex-shrink: 0;
}

.schedule-slot__content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.schedule-slot__course {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.schedule-slot__classroom {
  font-size: 22rpx;
  color: var(--td-text-color-secondary);
}

.schedule-slot__free {
  font-size: 26rpx;
  color: #10b981;
  font-weight: 600;
}

/* ========== 校园墙帖子 ========== */
.post-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.post-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
}

.post-card__header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.post-card__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--td-bg-color-surface);
}

.post-card__meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.post-card__nickname {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.post-card__school {
  font-size: 22rpx;
  color: var(--td-text-color-secondary);
}

.post-card__content {
  font-size: 28rpx;
  color: var(--td-text-color-primary);
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.post-card__images {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}

.post-card__image {
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  background: var(--td-bg-color-surface);
}

.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-card__location {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.post-card__actions {
  display: flex;
  gap: 24rpx;
}

.post-card__action {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.post-card__action--active {
  color: #ef4444;
}

/* ========== 逛逛推荐 ========== */
.shop-scroll {
  width: 100%;
}

.shop-list {
  display: flex;
  gap: 20rpx;
  padding-right: 32rpx;
}

.shop-card {
  flex-shrink: 0;
  width: 240rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
}

.shop-card__image {
  width: 100%;
  height: 200rpx;
  background: var(--td-bg-color-surface);
}

.shop-card__title {
  font-size: 24rpx;
  color: var(--td-text-color-primary);
  padding: 12rpx 16rpx 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shop-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 16rpx 16rpx;
}

.shop-card__price {
  font-size: 28rpx;
  font-weight: 700;
  color: #ef4444;
}

.shop-card__sales {
  font-size: 20rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 底部留白 ========== */
.home-footer {
  height: 40rpx;
}

/* ========== 社交升温紧凑卡片 ========== */
.social-mini-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
}

.social-mini-card:active {
  opacity: 0.7;
}

.social-mini-card__progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.social-mini-card__bar-track {
  width: 100rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: var(--td-bg-color-surface);
  overflow: hidden;
}

.social-mini-card__bar-fill {
  height: 100%;
  border-radius: 4rpx;
  background: linear-gradient(90deg, var(--td-brand-color-6), var(--td-brand-color-7));
  transition: width 0.5s ease;
}

.social-mini-card__percent {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--td-brand-color-6);
}

.social-mini-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.social-mini-card__label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.social-mini-card__hint {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.social-mini-card__arrow {
  font-size: 36rpx;
  color: var(--td-text-color-placeholder);
  font-weight: 300;
  flex-shrink: 0;
}
</style>
