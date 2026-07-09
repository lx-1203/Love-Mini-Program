<script setup lang="ts">
/**
 * 首页 - 校园聚合页
 * 包含：学校选择器、校园圈活动、课表空档、校园墙、逛逛推荐、社交升温进度
 */
import { ref, computed, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useActivityStore } from "../../stores/activity";
import { useCheckInStore } from "../../stores/checkin";
import { useSocialProgressStore } from "../../stores/social-progress";
import { useDiscoverStore } from "../../stores/discover";
import { useScheduleStore, WEEK_DAYS } from "../../stores/schedule";
import { openAppPath } from "../../utils/navigation";
import SocialProgressIndicator from "../../components/social/SocialProgressIndicator.vue";
import SocialOnboardingOverlay from "../../components/social/SocialOnboardingOverlay.vue";
import { hasSeenOnboarding } from "../../components/social/onboarding-utils";
import SafeImage from "../../components/common/SafeImage.vue";
import MatchCountChip from "../../components/common/MatchCountChip.vue";
import { IMAGE_PATHS } from "../../config/images";

/** Emoji 替换 SVG 图标路径（统一通过 IMAGE_PATHS.ICONS_EMOJI 引用，避免硬编码） */
const emojiIcons = {
  search: IMAGE_PATHS.ICONS_EMOJI.SEARCH,
  sparkles: IMAGE_PATHS.ICONS_EMOJI.SPARKLES,
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  chat: IMAGE_PATHS.ICONS_EMOJI.CHAT,
  fire: IMAGE_PATHS.ICONS_EMOJI.FIRE,
  gift: IMAGE_PATHS.ICONS_EMOJI.GIFT,
  cake: IMAGE_PATHS.ICONS_EMOJI.CAKE,
  group: IMAGE_PATHS.ICONS_EMOJI.GROUP,
  microphone: IMAGE_PATHS.ICONS_EMOJI.MICROPHONE,
  smile: IMAGE_PATHS.ICONS_EMOJI.SMILE,
  thumbsUp: IMAGE_PATHS.ICONS_EMOJI.THUMBS_UP,
  bookmark: IMAGE_PATHS.ICONS_EMOJI.BOOKMARK,
  // 通用图标（学校、庆典）- SVG 变体，支持 currentColor 主题色
  school: IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG,
  celebration: IMAGE_PATHS.ICONS_COMMON.CELEBRATION_SVG,
} as const;

const activityStore = useActivityStore();
const checkInStore = useCheckInStore();
const socialProgressStore = useSocialProgressStore();
const discoverStore = useDiscoverStore();
/** 共享 discover store 的剩余匹配次数（与寻觅页 count-chip 数据源一致） */
const { remainingCount } = storeToRefs(discoverStore);

// ==================== 推荐用户数据（真实头像，替代 emoji）====================
const recommendUsers = [
  { avatar: IMAGE_PATHS.AVATARS.AVATAR_1, nickname: '小柚子', info: '北大·大二', matchPercent: 95 },
  { avatar: IMAGE_PATHS.AVATARS.AVATAR_2, nickname: '阳光学长', info: '清华·大三', matchPercent: 88 },
  { avatar: IMAGE_PATHS.AVATARS.AVATAR_3, nickname: '甜甜圈', info: '复旦·大一', matchPercent: 92 },
  { avatar: IMAGE_PATHS.AVATARS.AVATAR_4, nickname: '向日葵', info: '浙大·大二', matchPercent: 85 },
  { avatar: IMAGE_PATHS.AVATARS.AVATAR_5, nickname: '星星', info: '北大·研一', matchPercent: 90 },
  { avatar: IMAGE_PATHS.AVATARS.AVATAR_6, nickname: '大海', info: '清华·大四', matchPercent: 87 },
];

// 学校选择
const currentSchool = ref("北京大学");
const schools = ["北京大学", "清华大学", "复旦大学", "浙江大学"];
const showSchoolPicker = ref(false);

function selectSchool(school: string) {
  currentSchool.value = school;
  showSchoolPicker.value = false;
}

// 课表数据（从 schedule store 拉取，支持课程/活动/自定义三类）
const scheduleStore = useScheduleStore();
const weekDays = WEEK_DAYS;
const currentDay = ref(0);

/** 当前选中天的时段视图（含 item 与 isFree 信息） */
const currentDaySlots = computed(() =>
  scheduleStore.dayTimeSlots(currentDay.value)
);

/** 课表类型图例 */
const scheduleLegends = [
  { type: "course", label: "课程", colorVar: "var(--c-schedule-course)" },
  { type: "activity", label: "活动", colorVar: "var(--c-schedule-activity)" },
  { type: "custom", label: "自定义", colorVar: "var(--c-schedule-custom)" },
] as const;

/** 获取课表项主标题（根据 type 返回不同字段） */
function getItemTitle(
  item: { type: string; courseName?: string; activityName?: string; title?: string } | undefined
): string {
  if (!item) return "";
  if (item.type === "course") return item.courseName || "未命名课程";
  if (item.type === "activity") return item.activityName || "未命名活动";
  return item.title || "自定义安排";
}

/** 获取课表项副标题（位置/教室 + 主办方/教师/备注） */
function getItemSubtitle(
  item: {
    type: string;
    classroom?: string;
    location?: string;
    teacher?: string;
    sponsor?: string;
    note?: string;
  } | undefined
): string {
  if (!item) return "";
  if (item.type === "course") {
    return [item.classroom, item.teacher].filter(Boolean).join(" · ");
  }
  if (item.type === "activity") {
    return [item.location, item.sponsor ? `主办：${item.sponsor}` : ""].filter(Boolean).join(" · ");
  }
  return [item.location, item.note].filter(Boolean).join(" · ");
}

/** 课表项类型 class（用于色块样式映射） */
function getItemClass(type: string): string {
  if (type === "course") return "schedule-slot--course";
  if (type === "activity") return "schedule-slot--activity";
  return "schedule-slot--custom";
}

/**
 * 点击时段：空闲时段弹出"添加安排"操作表，已占用时段提示去编辑
 * 使用 uni.showActionSheet 实现 mp-weixin 兼容
 */
function onSlotTap(slot: { isFree: boolean; item?: { type: string } }): void {
  if (!slot.isFree && slot.item) {
    // 已占用：跳转到编辑页查看详情
    openAppPath("/subpackages/setup/schedule/index");
    return;
  }
  uni.showActionSheet({
    itemList: ["添加课程", "添加活动", "添加自定义安排"],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.showToast({ title: "课程编辑开发中", icon: "none" });
      } else if (res.tapIndex === 1) {
        uni.showToast({ title: "活动编辑开发中", icon: "none" });
      } else if (res.tapIndex === 2) {
        uni.showToast({ title: "自定义编辑开发中", icon: "none" });
      }
    },
    fail: (_e) => {
      // 用户取消，无需处理
    },
  });
}

// 校园墙帖子（模拟）
const posts = ref([
  {
    id: "1",
    avatar: IMAGE_PATHS.AVATARS.AVATAR_1,
    nickname: "小明",
    school: "北京大学",
    grade: "大三",
    content: "今天在图书馆看到一本好书，推荐给大家！",
    images: [IMAGE_PATHS.POSTS.CAMPUS_LIBRARY],
    location: "图书馆",
    likes: 23,
    comments: 5,
    isLiked: false,
  },
  {
    id: "2",
    avatar: IMAGE_PATHS.AVATARS.AVATAR_2,
    nickname: "小红",
    school: "清华大学",
    grade: "大二",
    content: "有人一起上晚自习吗？求组队！",
    images: [IMAGE_PATHS.ACTIVITIES.ACTIVITY_STUDY],
    location: "教学楼",
    likes: 15,
    comments: 8,
    isLiked: true,
  },
]);

// 逛逛推荐（模拟）
const shopItems = ref([
  { id: "1", title: "校园文创帆布袋", price: 29.9, sales: 128, image: IMAGE_PATHS.PRODUCTS.MERCH_1 },
  { id: "2", title: "音乐节早鸟票", price: 99, sales: 56, image: IMAGE_PATHS.PRODUCTS.TICKET_1 },
  { id: "3", title: "食堂优惠券", price: 9.9, sales: 234, image: IMAGE_PATHS.PRODUCTS.FOOD_1 },
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

/**
 * 执行每日签到
 */
async function handleCheckIn() {
  if (checkInStore.loading || checkInStore.checkedIn) return;
  try {
    await checkInStore.checkIn();
    uni.showToast({
      title: `签到成功！连续${checkInStore.consecutiveDays}天`,
      icon: "success",
      duration: 2000,
    });
  } catch (error) {
    console.error("[首页签到] 失败:", error);
    uni.showToast({
      title: "签到失败，请稍后重试",
      icon: "none",
      duration: 2000,
    });
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
  <view class="home-page page-fade-in">
    <!-- 学校选择弹窗 -->
    <view v-if="showSchoolPicker" class="school-picker" @tap="showSchoolPicker = false">
      <view class="school-picker__content" @tap.stop>
        <view class="school-picker__header">
          <text class="school-picker__title">选择学校</text>
          <text class="school-picker__close" @tap="showSchoolPicker = false">✕</text>
        </view>
        <view class="school-picker__list">
          <view
            v-for="school in schools"
            :key="school"
            class="school-picker__item"
            :class="{ 'school-picker__item--active': school === currentSchool }"
            @tap="selectSchool(school)"
          >
            <text class="school-picker__item-name">{{ school }}</text>
            <text v-if="school === currentSchool" class="school-picker__item-check">✓</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="home-scroll" :show-scrollbar="false">
      <!-- 顶部区域 -->
      <view class="top-section">
        <view class="greeting-row">
          <view class="greeting-left">
            <text class="greeting-text">Hi, 同学👋</text>
            <text class="greeting-subtitle">今天想遇见谁呢？</text>
          </view>
          <view class="greeting-right">
            <MatchCountChip :count="remainingCount" />
            <view class="notification-btn">
              <text class="notification-icon">🔔</text>
              <view class="notification-dot"></view>
            </view>
          </view>
        </view>

        <!-- 搜索框 -->
        <view class="search-box press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/discover/index')">
          <image class="search-icon" :src="emojiIcons.search" mode="aspectFit" />
          <text class="search-placeholder">搜索用户/话题/动态</text>
        </view>

        <!-- 学校选择器 -->
        <view class="school-selector press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="showSchoolPicker = true">
          <image class="school-icon" :src="emojiIcons.school" mode="aspectFit" />
          <text class="school-name">{{ currentSchool }}</text>
          <text class="school-arrow">▼</text>
          <view class="school-badge">
            <text class="school-badge__text">本校限定</text>
          </view>
        </view>
      </view>

      <!-- 签到入口 -->
      <view class="section-wrap">
        <view v-if="!checkInStore.checkedIn && !checkInStore.loading" class="checkin-card card-base btn-press press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleCheckIn">
          <view class="checkin-icon-wrap checkin-icon-wrap--gradient">
            <image class="checkin-emoji" :src="emojiIcons.sparkles" mode="aspectFit" />
          </view>
          <view class="checkin-info">
            <text class="checkin-title">今日签到</text>
            <text class="checkin-desc">签到后解锁更多推荐机会</text>
          </view>
          <text class="checkin-arrow">›</text>
        </view>

        <view v-else-if="checkInStore.checkedIn" class="checkin-card card-base checkin-card--done">
          <view class="checkin-icon-wrap checkin-icon-wrap--success">
            <image class="checkin-emoji" :src="emojiIcons.sparkles" mode="aspectFit" />
          </view>
          <view class="checkin-info">
            <text class="checkin-title checkin-title--dark">已连续签到 {{ checkInStore.consecutiveDays }} 天</text>
            <text class="checkin-desc checkin-desc--gray">明日继续签到可获得更多权益</text>
          </view>
          <view class="checkin-streak">
            <text class="checkin-streak-text">{{ checkInStore.consecutiveDays }}天</text>
          </view>
        </view>
      </view>

      <!-- 彩色功能宫格 -->
      <view class="section-wrap">
        <view class="function-grid-card card-base">
          <view class="function-grid">
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/discover/index')">
              <view class="function-icon function-icon--pink">
                <image class="function-emoji" :src="emojiIcons.location" mode="aspectFit" />
              </view>
              <text class="function-label">附近的人</text>
            </view>
            <view class="function-item function-item--highlight press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/discover/index')">
              <view class="function-icon function-icon--purple">
                <image class="function-emoji" :src="emojiIcons.heart" mode="aspectFit" />
              </view>
              <text class="function-label">兴趣匹配</text>
            </view>
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/messages/index')">
              <view class="function-icon function-icon--orange">
                <image class="function-emoji" :src="emojiIcons.microphone" mode="aspectFit" />
              </view>
              <text class="function-label">语音房</text>
            </view>
            <view class="function-item function-item--highlight press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/discover/index')">
              <view class="function-icon function-icon--red">
                <image class="function-emoji" :src="emojiIcons.heart" mode="aspectFit" />
              </view>
              <text class="function-label">CP匹配</text>
            </view>
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/subpackages/discover/activities/index')">
              <view class="function-icon function-icon--green">
                <image class="function-emoji" :src="emojiIcons.sparkles" mode="aspectFit" />
              </view>
              <text class="function-label">校园活动</text>
            </view>
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/village/index')">
              <view class="function-icon function-icon--cyan">
                <image class="function-emoji" :src="emojiIcons.group" mode="aspectFit" />
              </view>
              <text class="function-label">恋爱事务所</text>
            </view>
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/daily-question/index')">
              <view class="function-icon function-icon--yellow">
                <image class="function-emoji" :src="emojiIcons.chat" mode="aspectFit" />
              </view>
              <text class="function-label">真心话</text>
            </view>
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/daily-question/index')">
              <view class="function-icon function-icon--blue">
                <image class="function-emoji" :src="emojiIcons.gift" mode="aspectFit" />
              </view>
              <text class="function-label">恋爱测试</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Banner轮播 -->
      <view class="section-wrap">
        <view class="section-header">
          <text class="section-title section-title-brand">每日缘分</text>
        </view>
        <scroll-view scroll-x class="banner-scroll" :show-scrollbar="false">
          <view class="banner-list">
            <view class="banner-card banner-card--romance press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/discover/index')">
              <view class="banner-content">
                <view class="banner-tag">
                  <image class="banner-tag__icon" :src="emojiIcons.sparkles" mode="aspectFit" />
                  <text class="banner-tag__text">每日推荐</text>
                </view>
                <text class="banner-title">今日缘分值98%</text>
                <text class="banner-desc">3位与你高度契合的同学</text>
              </view>
              <image class="banner-emoji" :src="emojiIcons.heart" mode="aspectFit" />
            </view>
            <view class="banner-card banner-card--green press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/subpackages/discover/activities/index')">
              <view class="banner-content">
                <view class="banner-tag">
                  <image class="banner-tag__icon" :src="emojiIcons.gift" mode="aspectFit" />
                  <text class="banner-tag__text">新人专属</text>
                </view>
                <text class="banner-title">新人礼遇</text>
                <text class="banner-desc">完成任务领专属徽章</text>
              </view>
              <image class="banner-emoji" :src="emojiIcons.gift" mode="aspectFit" />
            </view>
            <view class="banner-card banner-card--warm press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/subpackages/discover/activities/index')">
              <view class="banner-content">
                <view class="banner-tag">
                  <image class="banner-tag__icon" :src="emojiIcons.location" mode="aspectFit" />
                  <text class="banner-tag__text">周末活动</text>
                </view>
                <text class="banner-title">周末派对</text>
                <text class="banner-desc">校园桌游局报名中</text>
              </view>
              <image class="banner-emoji" :src="emojiIcons.sparkles" mode="aspectFit" />
            </view>
            <view class="banner-card banner-card--purple press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/circles/index')">
              <view class="banner-content">
                <view class="banner-tag">
                  <image class="banner-tag__icon" :src="emojiIcons.fire" mode="aspectFit" />
                  <text class="banner-tag__text">热门话题</text>
                </view>
                <text class="banner-title">毕业季告白</text>
                <text class="banner-desc">勇敢说出心里话</text>
              </view>
              <image class="banner-emoji" :src="emojiIcons.bookmark" mode="aspectFit" />
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 校园圈活动 -->
      <view class="section-wrap">
        <view class="section-header">
          <text class="section-title section-title-brand">校园圈活动</text>
          <text class="section-more" @tap="openAppPath('/pages/circles/index')">更多 ›</text>
        </view>
        <scroll-view scroll-x class="activity-scroll" :show-scrollbar="false">
          <view class="activity-list">
            <view
              v-for="item in activityStore.activities.slice(0, 5)"
              :key="item.id"
              class="activity-card-new list-item"
              @tap="openAppPath('/subpackages/discover/activities/index')"
            >
              <view class="activity-card__image-wrap">
                <image
                  v-if="item.coverImage"
                  class="activity-card__img"
                  :src="item.coverImage"
                  mode="aspectFill"
                />
                <view v-else class="activity-card__placeholder">
                  <image class="activity-placeholder-emoji" :src="emojiIcons.celebration" mode="aspectFit" />
                </view>
                <view class="activity-card__status" :class="`activity-status--${item.status}`">
                  <text class="activity-status-text">{{ item.status === 'open' ? '报名中' : item.status === 'ongoing' ? '进行中' : '预告' }}</text>
                </view>
              </view>
              <view class="activity-card__info-new">
                <text class="activity-card__title-new">{{ item.title }}</text>
                <text class="activity-card__time-new">{{ item.scheduleText }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 为你推荐 -->
      <view class="section-wrap">
        <view class="section-header">
          <text class="section-title section-title-brand">为你推荐</text>
          <text class="section-more section-more--green">换一批</text>
        </view>
        <scroll-view scroll-x class="recommend-scroll" :show-scrollbar="false">
          <view class="recommend-list card-stagger">
            <view class="user-card list-item" v-for="(user, i) in recommendUsers" :key="i">
              <view class="user-avatar-wrap">
                <view class="user-avatar-ring">
                  <view class="user-avatar">
                    <SafeImage
                      :src="user.avatar"
                      custom-class="user-avatar__img"
                      mode="aspectFill"
                    />
                  </view>
                </view>
                <view class="online-dot"></view>
              </view>
              <text class="user-nickname">{{ user.nickname }}</text>
              <text class="user-info">{{ user.info }}</text>
              <view class="match-tag">
                <image class="match-tag__icon" :src="emojiIcons.heart" mode="aspectFit" />
                <text class="match-text">匹配度{{ user.matchPercent }}%</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 本周安排 -->
      <view class="section-wrap">
        <view class="section-header">
          <text class="section-title section-title-brand">本周安排</text>
          <text
            class="section-more"
            @tap="openAppPath('/subpackages/setup/schedule/index')"
          >编辑 ›</text>
        </view>

        <!-- 课表卡片 -->
        <view class="schedule-card-new card-base">
          <!-- 类型图例 -->
          <view class="schedule-legend">
            <view
              v-for="legend in scheduleLegends"
              :key="legend.type"
              class="schedule-legend__item"
            >
              <view class="schedule-legend__dot" :style="{ background: legend.colorVar }"></view>
              <text class="schedule-legend__label">{{ legend.label }}</text>
            </view>
          </view>

          <!-- 周一到周日 7 天 -->
          <view class="schedule-days-new">
            <view
              v-for="(day, index) in weekDays"
              :key="day"
              class="schedule-day-new"
              :class="{ 'schedule-day--active-new': currentDay === index }"
              @tap="currentDay = index"
            >
              <text class="schedule-day__name-new">{{ day }}</text>
            </view>
          </view>

          <!-- 时段列表 -->
          <view class="schedule-slots-new">
            <view
              v-for="slot in currentDaySlots"
              :key="slot.index"
              class="schedule-slot-new press-feedback"
              :class="slot.isFree ? 'schedule-slot--free-new' : getItemClass(slot.item?.type || 'custom')"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              @tap="onSlotTap(slot)"
            >
              <text class="schedule-slot__time-new">{{ slot.start }}-{{ slot.end }}</text>
              <view class="schedule-slot__content-new">
                <template v-if="!slot.isFree && slot.item">
                  <text class="schedule-slot__course-new">{{ getItemTitle(slot.item) }}</text>
                  <text class="schedule-slot__classroom-new">{{ getItemSubtitle(slot.item) }}</text>
                </template>
                <view v-else class="schedule-slot__free-new">
                  <image class="schedule-slot__free-icon" :src="emojiIcons.sparkles" mode="aspectFit" />
                  <text class="schedule-slot__free-text">空闲，可添加安排</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 热门动态 -->
      <view class="section-wrap">
        <view class="section-header">
          <text class="section-title section-title-brand">校园新鲜事</text>
          <text class="section-more" @tap="openAppPath('/pages/circles/index')">进入圈子 ›</text>
        </view>
        <view class="post-list-new">
          <view v-for="post in posts" :key="post.id" class="post-card-new list-item">
            <view class="post-card__header-new">
              <view class="post-avatar-wrap">
                <view class="post-avatar">
                  <SafeImage
                    :src="post.avatar"
                    custom-class="post-avatar__img"
                    mode="aspectFill"
                  />
                </view>
              </view>
              <view class="post-meta-new">
                <text class="post-nickname-new">{{ post.nickname }}</text>
                <text class="post-school-new">{{ post.school }} · {{ post.grade }} · 2小时前</text>
              </view>
            </view>
            <text class="post-content-new">{{ post.content }}</text>
            <view v-if="post.images.length > 0" class="post-images-new">
              <view
                v-for="(img, idx) in post.images.slice(0, 3)"
                :key="idx"
                class="post-image-item img-rounded"
              >
                <SafeImage
                  :src="img"
                  custom-class="post-image__img"
                  mode="aspectFill"
                />
              </view>
            </view>
            <view class="post-footer-new">
              <view class="post-location-new">
                <image class="post-location-emoji" :src="emojiIcons.location" mode="aspectFit" />
                <text class="post-location-text">{{ post.location }}</text>
              </view>
              <view class="post-actions-new">
                <view :class="['post-action-new', post.isLiked ? 'post-action--liked' : '']" @tap="toggleLike(post.id)">
                  <image class="post-action-emoji" :src="emojiIcons.heart" mode="aspectFit" />
                  <text class="post-action-count">{{ post.likes }}</text>
                </view>
                <view class="post-action-new">
                  <image class="post-action-emoji" :src="emojiIcons.chat" mode="aspectFit" />
                  <text class="post-action-count">{{ post.comments }}</text>
                </view>
                <view class="post-action-new">
                  <image class="post-action-emoji" :src="emojiIcons.bookmark" mode="aspectFit" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 逛逛推荐 -->
      <view class="section-wrap">
        <view class="section-header">
          <text class="section-title section-title-brand">逛逛推荐</text>
          <text class="section-more" @tap="openAppPath('/pages/shop/index')">更多 ›</text>
        </view>
        <scroll-view scroll-x class="shop-scroll-new" :show-scrollbar="false">
          <view class="shop-list-new">
            <view
              v-for="item in shopItems"
              :key="item.id"
              class="shop-card-new list-item"
              @tap="openAppPath('/subpackages/shop/detail/index')"
            >
              <view class="shop-image-wrap">
                <SafeImage
                  :src="item.image"
                  custom-class="shop-image__img"
                  mode="aspectFill"
                />
              </view>
              <text class="shop-title-new">{{ item.title }}</text>
              <view class="shop-bottom-new">
                <text class="shop-price-new">¥{{ item.price }}</text>
                <text class="shop-sales-new">已售{{ item.sales }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 社交升温进度 -->
      <view class="section-wrap">
        <view class="section-header">
          <view class="section-title-group">
            <text class="section-title section-title-brand">社交升温进度</text>
            <image class="section-title__icon" :src="emojiIcons.fire" mode="aspectFit" />
          </view>
          <text class="section-more" @tap="toggleSocialProgress">
            {{ showSocialProgress ? '收起 ›' : '展开 ›' }}
          </text>
        </view>

        <view v-if="!showSocialProgress" class="social-mini-card-new card-base press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="toggleSocialProgress">
          <view class="social-progress-wrap">
            <view class="social-bar-track">
              <view
                class="social-bar-fill"
                :style="{ width: socialProgressStore.progressPercentage + '%' }"
              />
            </view>
            <text class="social-percent">{{ socialProgressStore.progressPercentage }}%</text>
          </view>
          <view class="social-info-new">
            <text class="social-label">{{ socialProgressStore.progress?.tierLabel ?? '加载中...' }}</text>
            <text class="social-hint">{{ socialProgressStore.nextAction || '点击查看完整进度' }}</text>
          </view>
          <text class="social-arrow">›</text>
        </view>

        <SocialProgressIndicator v-else />
      </view>

      <!-- 底部留白 -->
      <view class="home-footer-space"></view>
    </scroll-view>

    <!-- 悬浮发布按钮 -->
    <view class="fab-container">
      <view class="fab-bubble">
        <text class="fab-bubble-text">发布动态</text>
      </view>
      <view class="fab-button press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/circles/index')">
        <text class="fab-icon">+</text>
      </view>
    </view>

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
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  background: var(--c-gradient-page);
}

.home-scroll {
  flex: 1;
  height: 100vh;
}

.section-wrap {
  padding: 0 var(--page-padding);
  margin-bottom: var(--sp-8);
}

/* ========== 顶部区域 ========== */
.top-section {
  position: relative;
  padding: calc(env(safe-area-inset-top) + var(--sp-6)) var(--page-padding) var(--sp-6);
  background: var(--c-gradient-brand-overlay);
}

.greeting-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
}

.greeting-left {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.greeting-text {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.2;
}

.greeting-subtitle {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.greeting-right {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.notification-btn {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-md);
}

.notification-icon {
  font-size: var(--fs-3xl);
}

.notification-dot {
  position: absolute;
  top: var(--sp-4);
  right: var(--sp-4);
  width: var(--sp-4);
  height: var(--sp-4);
  background: var(--c-error);
  border-radius: var(--r-full);
  border: 3rpx solid var(--c-bg-container);
}

/* ========== 搜索框 ========== */
.search-box {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  height: 88rpx;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(10px);
  border: var(--border-subtle);
  border-radius: var(--r-xl);
  padding: 0 28rpx;
  margin-bottom: var(--sp-5);
}

.search-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: var(--sp-2);
  opacity: 0.6;
  flex-shrink: 0;
}

.search-placeholder {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

/* ========== 学校选择器 ========== */
.school-selector {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-6);
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
  border: var(--border-subtle);
  border-radius: var(--r-lg);
  align-self: flex-start;
}

.school-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: var(--sp-2);
  color: var(--c-brand-500);
  flex-shrink: 0;
}

.school-name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.school-arrow {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  margin: 0 var(--sp-2);
}

.school-badge {
  background: var(--c-gradient-brand);
  padding: 6rpx var(--sp-4);
  border-radius: var(--r-full);
  margin-left: var(--sp-2);
}

.school-badge__text {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 签到卡片 ========== */
.checkin-card {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: 28rpx;
  border-radius: var(--r-xl);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand-lg);
}

.checkin-card:active {
  transform: scale(0.98);
}

.checkin-card--done {
  background: var(--c-bg-container);
  box-shadow: var(--s-card-soft);
  border: var(--border-subtle);
}

.checkin-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkin-icon-wrap--gradient {
  background: rgba(255,255,255,0.25);
}

.checkin-icon-wrap--success {
  background: rgba(63,207,142,0.1);
}

.checkin-emoji {
  width: 56rpx;
  height: 56rpx;
  color: #ffffff;
}

.checkin-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.checkin-title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-inverse);
}

.checkin-title--dark {
  color: var(--c-text-primary);
}

.checkin-desc {
  font-size: var(--fs-base);
  color: rgba(255,255,255,0.85);
}

.checkin-desc--gray {
  color: var(--c-text-tertiary);
}

.checkin-arrow {
  font-size: var(--fs-5xl);
  color: rgba(255,255,255,0.8);
  font-weight: 300;
}

.checkin-streak {
  background: var(--c-romance-50);
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-lg);
}

.checkin-streak-text {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-romance-500);
}

/* ========== 功能宫格 ========== */
.function-grid-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-8);
  box-shadow: var(--s-card-soft);
}

.function-grid {
  display: flex;
  flex-wrap: wrap;
}

.function-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
}

.function-item:active {
  transform: scale(0.96);
}

/* ========== 高亮功能项（兴趣匹配 / CP匹配） ========== */
.function-item--highlight {
  position: relative;
  background: var(--c-romance-50);
  border: 2rpx solid var(--c-romance-200);
  border-radius: var(--r-lg);
  transform: scale(1.05);
  box-shadow: 0 8rpx 24rpx rgba(236, 72, 153, 0.15);

  .function-icon {
    background: var(--c-romance-100);
    transform: scale(1.08);
  }
}

.function-item--highlight::before {
  content: '热门';
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: linear-gradient(135deg, var(--c-romance-400), var(--c-accent-400));
  color: var(--c-text-inverse);
  font-size: var(--fs-xs);
  font-weight: 700;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-lg) var(--r-lg) var(--r-lg) 0;
  z-index: 2;
  box-shadow: 0 2rpx 8rpx rgba(236, 72, 153, 0.3);
}

.function-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.function-icon--pink {
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: 0 6px 16px rgba(236, 72, 153, 0.3);
}

.function-icon--purple {
  background: linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%);
  box-shadow: 0 6px 16px rgba(139, 92, 246, 0.3);
}

.function-icon--orange {
  background: linear-gradient(135deg, #FB923C 0%, var(--c-accent-400) 100%);
  box-shadow: 0 6px 16px rgba(249, 115, 22, 0.3);
}

.function-icon--red {
  background: linear-gradient(135deg, #F87171 0%, var(--c-error) 100%);
  box-shadow: 0 6px 16px rgba(229, 69, 77, 0.3);
}

.function-icon--green {
  background: linear-gradient(135deg, #34D399 0%, var(--c-success) 100%);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
}

.function-icon--cyan {
  background: linear-gradient(135deg, #22D3EE 0%, #06B6D4 100%);
  box-shadow: 0 6px 16px rgba(6, 182, 212, 0.3);
}

.function-icon--yellow {
  background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
}

.function-icon--blue {
  background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
}

.function-emoji {
  width: 56rpx;
  height: 56rpx;
  color: #ffffff;
}

.function-label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 500;
}

/* ========== 分区标题 ========== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-5);
}

.section-title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.section-title-group {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
}

.section-title__icon {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-romance-500);
  flex-shrink: 0;
}

.section-more {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

.section-more--green {
  color: var(--c-brand-500);
  font-weight: 500;
}

/* ========== Banner轮播 ========== */
.banner-scroll {
  width: 100%;
}

.banner-list {
  display: flex;
  gap: var(--sp-5);
  padding-right: var(--page-padding);
}

.banner-card {
  flex-shrink: 0;
  width: 300rpx;
  height: 180rpx;
  border-radius: var(--r-xl);
  padding: var(--sp-6);
  display: flex;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.banner-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%);
  pointer-events: none;
}

.banner-card:active {
  transform: scale(0.98);
}

.banner-card--romance {
  background: var(--c-gradient-romance);
}

.banner-card--green {
  background: var(--c-gradient-float-btn);
}

.banner-card--warm {
  background: linear-gradient(135deg, #FB923C 0%, #F59E0B 100%);
}

.banner-card--purple {
  background: linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%);
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  z-index: 1;
}

.banner-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-xs);
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.2);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
  align-self: flex-start;
}

.banner-tag__icon {
  width: 20rpx;
  height: 20rpx;
  color: rgba(255,255,255,0.95);
  flex-shrink: 0;
}

.banner-tag__text {
  font-size: var(--fs-xs);
  color: rgba(255,255,255,0.95);
  font-weight: 500;
}

.banner-title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.banner-desc {
  font-size: var(--fs-sm);
  color: rgba(255,255,255,0.8);
}

.banner-emoji {
  width: 96rpx;
  height: 96rpx;
  opacity: 0.4;
  position: absolute;
  right: var(--sp-4);
  bottom: var(--sp-2);
  color: rgba(255,255,255,0.9);
}

/* ========== 活动卡片 ========== */
.activity-scroll {
  width: 100%;
}

.activity-list {
  display: flex;
  gap: var(--sp-5);
  padding-right: var(--page-padding);
}

.activity-card-new {
  flex-shrink: 0;
  width: 260rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: var(--s-sm);
}

.activity-card-new:active {
  transform: scale(0.98);
}

.activity-card__image-wrap {
  position: relative;
  width: 100%;
  height: 140rpx;
  background: linear-gradient(135deg, var(--c-brand-200), var(--c-brand-300));
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-card__img {
  width: 100%;
  height: 100%;
}

.activity-card__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--c-romance-100), var(--c-romance-200));
}

.activity-placeholder-emoji {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-romance-500);
}

.activity-card__status {
  position: absolute;
  top: var(--sp-3);
  left: var(--sp-3);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
}

.activity-status--open {
  background: var(--c-state-signup-bg);
  .activity-status-text {
    color: var(--c-state-signup-text);
  }
}

.activity-status--ongoing {
  background: var(--c-state-ongoing-bg);
  .activity-status-text {
    color: var(--c-state-ongoing-text);
  }
}

.activity-status--upcoming {
  background: var(--c-state-preview-bg);
  .activity-status-text {
    color: var(--c-state-preview-text);
  }
}

.activity-status-text {
  font-size: var(--fs-xs);
  font-weight: 500;
}

.activity-card__info-new {
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.activity-card__title-new {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-card__time-new {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ========== 推荐用户 ========== */
.recommend-scroll {
  width: 100%;
}

.recommend-list {
  display: flex;
  gap: var(--sp-5);
  padding-right: var(--page-padding);
}

.user-card {
  flex-shrink: 0;
  width: 180rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  padding: var(--sp-6) var(--sp-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  box-shadow: var(--s-card-soft);
}

.user-card:active {
  transform: scale(0.97);
}

.user-avatar-wrap {
  position: relative;
  margin-bottom: var(--sp-2);
}

.user-avatar-ring {
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--r-full);
  padding: 6rpx;
  background: var(--c-gradient-brand);
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: var(--r-full);
  background: var(--c-romance-50);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.user-avatar-emoji {
  font-size: 48rpx;
}

.online-dot {
  position: absolute;
  bottom: 6rpx;
  right: 6rpx;
  width: var(--sp-5);
  height: var(--sp-5);
  background: var(--c-success);
  border-radius: var(--r-full);
  border: 4rpx solid var(--c-bg-container);
}

.user-nickname {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text-primary);
}

.user-info {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.match-tag {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  margin-top: var(--sp-2);
  background: var(--c-romance-50);
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
}

.match-tag__icon {
  width: 20rpx;
  height: 20rpx;
  color: var(--c-romance-500);
  flex-shrink: 0;
}

.match-text {
  font-size: var(--fs-xs);
  color: var(--c-romance-500);
  font-weight: 500;
}

/* ========== 课表卡片 ========== */
.schedule-card-new {
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-6);
  box-shadow: var(--s-sm);
}

/* 类型图例 */
.schedule-legend {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding-bottom: var(--sp-4);
  margin-bottom: var(--sp-5);
  border-bottom: 1rpx solid var(--c-border-light);
}

.schedule-legend__item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.schedule-legend__dot {
  width: var(--sp-5);
  height: var(--sp-5);
  border-radius: var(--r-sm);
}

.schedule-legend__label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.schedule-days-new {
  display: flex;
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
}

.schedule-day-new {
  flex: 1;
  padding: var(--sp-3) 0;
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
  text-align: center;
}

.schedule-day--active-new {
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand-sm);
}

.schedule-day__name-new {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.schedule-day--active-new .schedule-day__name-new {
  color: var(--c-text-inverse);
  font-weight: 600;
}

.schedule-slots-new {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.schedule-slot-new {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
}

/* 空闲时段 */
.schedule-slot--free-new {
  background: rgba(63,207,142,0.06);
  border: 1rpx dashed rgba(63,207,142,0.3);
}

/* 课程色块（蓝色） */
.schedule-slot--course {
  background: var(--c-schedule-course);

  .schedule-slot__course-new {
    color: var(--c-schedule-course-text);
  }

  .schedule-slot__classroom-new {
    color: var(--c-schedule-course-text);
    opacity: 0.75;
  }
}

/* 活动色块（绿色） */
.schedule-slot--activity {
  background: var(--c-schedule-activity);

  .schedule-slot__course-new {
    color: var(--c-schedule-activity-text);
  }

  .schedule-slot__classroom-new {
    color: var(--c-schedule-activity-text);
    opacity: 0.75;
  }
}

/* 自定义色块（橙色） */
.schedule-slot--custom {
  background: var(--c-schedule-custom);

  .schedule-slot__course-new {
    color: var(--c-schedule-custom-text);
  }

  .schedule-slot__classroom-new {
    color: var(--c-schedule-custom-text);
    opacity: 0.75;
  }
}

.schedule-slot__time-new {
  font-size: var(--fs-sm);
  color: var(--c-text-quaternary);
  width: 160rpx;
  flex-shrink: 0;
}

.schedule-slot__content-new {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.schedule-slot__course-new {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.schedule-slot__classroom-new {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  margin-top: var(--sp-1);
}

.schedule-slot__free-new {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-base);
  color: var(--c-brand-500);
  font-weight: 500;
}

.schedule-slot__free-icon {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-brand-500);
  flex-shrink: 0;
}

.schedule-slot__free-text {
  font-size: var(--fs-base);
  color: var(--c-brand-500);
  font-weight: 500;
}

/* ========== 帖子列表 ========== */
.post-list-new {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.post-card-new {
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  padding: var(--sp-6);
  box-shadow: var(--s-card-soft);
}

.post-card-new:active {
  transform: scale(0.99);
}

.post-card__header-new {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-4);
}

.post-avatar-wrap {
  flex-shrink: 0;
}

.post-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-full);
  background: var(--c-romance-100);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.post-avatar-emoji {
  font-size: var(--fs-4xl);
}

.post-meta-new {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.post-nickname-new {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.post-school-new {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.post-content-new {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  line-height: 1.6;
  margin-bottom: var(--sp-4);
}

.post-images-new {
  display: flex;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}

.post-image-item {
  width: 160rpx;
  height: 160rpx;
  border-radius: var(--r-md);
  background: linear-gradient(135deg, var(--c-neutral-50), var(--c-neutral-100));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.post-image-emoji {
  font-size: 48rpx;
  opacity: 0.5;
}

.post-footer-new {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--sp-4);
  border-top: 1rpx solid var(--c-neutral-50);
}

.post-location-new {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.post-location-emoji {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.post-location-text {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.post-actions-new {
  display: flex;
  gap: 28rpx;
}

.post-action-new {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.post-action-new:active {
  transform: scale(0.9);
}

.post-action-emoji {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.post-action--liked .post-action-emoji {
  color: var(--c-romance-500);
}

.post-action-count {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.post-action--liked .post-action-count {
  color: var(--c-error);
}

/* ========== 逛逛推荐 ========== */
.shop-scroll-new {
  width: 100%;
}

.shop-list-new {
  display: flex;
  gap: var(--sp-5);
  padding-right: var(--page-padding);
}

.shop-card-new {
  flex-shrink: 0;
  width: 220rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: var(--s-sm);
}

.shop-card-new:active {
  transform: scale(0.97);
}

.shop-image-wrap {
  width: 100%;
  height: 180rpx;
  background: var(--c-romance-50);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shop-image-emoji {
  font-size: 64rpx;
}

.shop-title-new {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  padding: var(--sp-4) var(--sp-4) var(--sp-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.shop-bottom-new {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-4) var(--sp-4);
}

.shop-price-new {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-error);
}

.shop-sales-new {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ========== 社交升温迷你卡片 ========== */
.social-mini-card-new {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: 28rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-brand-sm);
  border: var(--c-border-card-brand);
}

.social-mini-card-new:active {
  transform: scale(0.98);
}

.social-progress-wrap {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-shrink: 0;
}

.social-bar-track {
  width: 120rpx;
  height: var(--sp-3);
  border-radius: var(--r-sm);
  background: var(--c-neutral-50);
  overflow: hidden;
}

.social-bar-fill {
  height: 100%;
  border-radius: var(--r-sm);
  background: var(--c-gradient-float-btn);
  transition: width 0.5s ease;
}

.social-percent {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-brand-500);
}

.social-info-new {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.social-label {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.social-hint {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.social-arrow {
  font-size: var(--fs-4xl);
  color: var(--c-neutral-300);
  font-weight: 300;
}

/* ========== 底部留白 ========== */
.home-footer-space {
  height: 200rpx;
}

/* ========== 悬浮发布按钮 ========== */
.fab-container {
  position: fixed;
  right: var(--page-padding);
  bottom: calc(env(safe-area-inset-bottom) + 120rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  z-index: var(--z-dropdown);
}

.fab-bubble {
  background: var(--c-neutral-800);
  padding: 10rpx var(--sp-5);
  border-radius: var(--r-full);
  opacity: 0;
  transform: translateY(10rpx);
  animation: fabBubble 3s ease-in-out infinite;
}

.fab-bubble-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
}

@keyframes fabBubble {
  0%, 100% { opacity: 0; transform: translateY(10rpx); }
  20%, 80% { opacity: 0.8; transform: translateY(0); }
}

.fab-button {
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-float-btn);
}

.fab-button:active {
  transform: scale(0.92);
}

.fab-icon {
  font-size: 56rpx;
  color: var(--c-text-inverse);
  font-weight: 300;
  line-height: 1;
}

/* ========== 学校选择弹窗 ========== */
.school-picker {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-bg-overlay);
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
}

.school-picker__content {
  width: 100%;
  background: var(--c-bg-container);
  border-radius: 32rpx 32rpx 0 0;
  padding: var(--sp-8);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-8));
}

.school-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
}

.school-picker__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.school-picker__close {
  font-size: var(--fs-2xl);
  color: var(--c-text-tertiary);
  padding: var(--sp-2);
}

.school-picker__list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.school-picker__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx var(--sp-6);
  border-radius: var(--r-lg);
  background: var(--c-neutral-50);
}

.school-picker__item--active {
  background: var(--c-bg-brand);
}

.school-picker__item-name {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
}

.school-picker__item-check {
  font-size: var(--fs-lg);
  color: var(--c-brand-500);
  font-weight: 700;
}

/* ========== 页面进入动画 ========== */
/* page-fade-in 已统一在 App.vue 中定义（300ms），此处不再重复 */
</style>
