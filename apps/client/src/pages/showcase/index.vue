<!--
  全功能展示页（超级管理员展示版）
  - 仅在 VITE_SHOWCASE_MODE=true 的展示构建中作为主入口使用
  - 覆盖 pages.json 全部页面，按业务模块分组，演示者可一键跳转体验
  - TabBar 页面使用 switchTab，其余使用 navigateTo
-->
<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { isShowcaseMode } from "../../config/showcase";

interface ShowcaseItem {
  /** 页面路径（switchTab 需要无前导斜杠一致性由 navigate 函数处理） */
  path: string;
  /** 展示标题 */
  title: string;
  /** 副标题说明 */
  desc: string;
  /** 图标 chip 字符（取标题首字，视觉占位） */
  char: string;
  /** chip 背景色 token */
  chipBg: string;
  /** 是否为 TabBar 页面（switchTab 跳转） */
  isTab?: boolean;
}

interface ShowcaseGroup {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  items: ShowcaseItem[];
}

/** 分组：按业务模块组织全部页面 */
const groups: ShowcaseGroup[] = [
  {
    id: "journey",
    title: "核心旅程",
    subtitle: "登录 · 资料 · 认证",
    accent: "linear-gradient(135deg, #3B9DE5, #5BC0DE)",
    items: [
      { path: "/pages/login/index", title: "登录页", desc: "微信 / 手机号 / 游客登录", char: "登", chipBg: "var(--c-tint-blue-soft, #E8F4FF)", isTab: false },
      { path: "/subpackages/setup/profile/index", title: "基础资料", desc: "头像 / 昵称 / 性别 / 兴趣", char: "资", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/subpackages/setup/campus/index", title: "学校信息", desc: "学校 / 专业 / 年级", char: "校", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/subpackages/setup/recommend-pref/index", title: "推荐计划", desc: "匹配偏好设置", char: "荐", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/pages/campus/certification", title: "校园认证", desc: "学生证 / 教育邮箱认证", char: "证", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/pages/verification/index", title: "恋爱认证", desc: "人工认证 · 真人认证", char: "认", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/subpackages/setup/schedule/index", title: "时间安排", desc: "作息 / 课表偏好", char: "时", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
    ],
  },
  {
    id: "match",
    title: "匹配",
    subtitle: "寻觅 · 喜欢 · 心动信号 · 附近",
    accent: "linear-gradient(135deg, #FF8C42, #FFB06A)",
    items: [
      { path: "/pages/discover/index", title: "寻觅 · 匹配", desc: "滑动卡片 / 喜欢 / 悄悄话", char: "觅", chipBg: "var(--c-tint-orange-50, #FFF4EC)", isTab: true },
      { path: "/pages/discover/history", title: "今日已看", desc: "今日浏览记录", char: "今", chipBg: "var(--c-tint-orange-50, #FFF4EC)" },
      { path: "/pages/likes/index", title: "喜欢", desc: "喜欢我的 / 我喜欢的", char: "喜", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/heart-signals/index", title: "心动信号 · 缘分速配", desc: "随机匹配 / 渐进解锁", char: "缘", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/love-center/nearby", title: "附近的人", desc: "同城 / 附近用户", char: "近", chipBg: "var(--c-tint-orange-50, #FFF4EC)" },
    ],
  },
  {
    id: "home",
    title: "首页与成长",
    subtitle: "签到 · 恋爱中心 · 每日一问",
    accent: "linear-gradient(135deg, #3FCF8E, #5BC0DE)",
    items: [
      { path: "/pages/home/index", title: "首页", desc: "签到 / 匹配入口 / 恋爱咨询", char: "首", chipBg: "var(--c-bg-brand, #E8F8F0)", isTab: true },
      { path: "/pages/daily-question/index", title: "每日一问", desc: "每天一个心动提问", char: "问", chipBg: "var(--c-bg-brand, #E8F8F0)" },
      { path: "/pages/love-center/index", title: "恋爱中心", desc: "咨询 / 课程 / 测试", char: "恋", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/love-center/consulting", title: "恋爱咨询", desc: "恋爱 / 社交四板块课程", char: "询", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/love-center/mbti", title: "MBTI 测试", desc: "16 型人格测试", char: "测", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/subpackages/discover/activities/index", title: "活动", desc: "校园活动报名", char: "活", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
      { path: "/pages/activities/detail", title: "活动详情", desc: "活动内容 / 报名", char: "动", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
    ],
  },
  {
    id: "chat",
    title: "聊天",
    subtitle: "会话 · 视频通话",
    accent: "linear-gradient(135deg, #7C6CF0, #A78BFA)",
    items: [
      { path: "/pages/messages/index", title: "消息", desc: "会话 / 官方号 / 通知", char: "消", chipBg: "var(--c-tint-purple-soft, #F3EFFF)", isTab: true },
      { path: "/pages/chat-session/index", title: "聊天会话", desc: "临时匿名聊天 / 渐进解锁", char: "聊", chipBg: "var(--c-tint-purple-soft, #F3EFFF)" },
      { path: "/pages/chat/video-call", title: "视频通话", desc: "1v1 实时视频（展示）", char: "视", chipBg: "var(--c-tint-purple-soft, #F3EFFF)" },
    ],
  },
  {
    id: "community",
    title: "社区",
    subtitle: "村口 · 兴趣圈 · 校园",
    accent: "linear-gradient(135deg, #10B981, #34D399)",
    items: [
      { path: "/pages/village/index", title: "村口 · 圈子", desc: "关注 / 同城 / 发现", char: "村", chipBg: "var(--c-bg-brand, #E8F8F0)", isTab: true },
      { path: "/pages/village/post", title: "发布帖子", desc: "图文动态发布", char: "发", chipBg: "var(--c-bg-brand, #E8F8F0)" },
      { path: "/pages/village/detail", title: "帖子详情", desc: "点赞 / 评论 / 分享", char: "帖", chipBg: "var(--c-bg-brand, #E8F8F0)" },
      { path: "/pages/village/tag-posts", title: "标签帖子", desc: "按标签浏览", char: "标", chipBg: "var(--c-bg-brand, #E8F8F0)" },
      { path: "/pages/circles/index", title: "兴趣圈", desc: "圈子广场", char: "圈", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/circles/topics", title: "话题列表", desc: "热门话题", char: "话", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/circles/topic-detail", title: "话题详情", desc: "话题动态流", char: "题", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/circles/post-topic", title: "发布话题", desc: "参与话题互动", char: "参", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/campus/index", title: "校园", desc: "校园话题 / 活动", char: "园", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/pages/campus/post-topic", title: "校园发帖", desc: "发布校园话题", char: "帖", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/pages/campus/topic-detail", title: "校园话题详情", desc: "校园话题动态", char: "题", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/subpackages/discover/discussions/index", title: "讨论圈", desc: "开放式讨论", char: "讨", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
      { path: "/pages/feedback/history", title: "反馈历史", desc: "我的反馈记录", char: "馈", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
    ],
  },
  {
    id: "commerce",
    title: "商业化",
    subtitle: "VIP · 优惠码 · 逛逛",
    accent: "linear-gradient(135deg, #F59E0B, #FBBF24)",
    items: [
      { path: "/pages/vip/index", title: "开通 VIP", desc: "月度 / 季度 / 年度会员", char: "V", chipBg: "var(--c-vip-bg-soft, #FEF3C7)" },
      { path: "/pages/wallet/index", title: "我的钱包", desc: "交友币余额 / 账单 / 充值", char: "币", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
      { path: "/pages/vip/promo-code", title: "优惠码", desc: "兑换码 / 优惠", char: "券", chipBg: "var(--c-vip-bg-soft, #FEF3C7)" },
      { path: "/pages/vip/bills", title: "账单记录", desc: "消费 / 续费记录", char: "账", chipBg: "var(--c-vip-bg-soft, #FEF3C7)" },
      { path: "/pages/shop/index", title: "逛逛", desc: "积分商城 / 好物", char: "逛", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
    ],
  },
  {
    id: "profile",
    title: "个人中心与设置",
    subtitle: "我的 · 安全 · 帮助",
    accent: "linear-gradient(135deg, #64748B, #94A3B8)",
    items: [
      { path: "/pages/profile/index", title: "我的", desc: "个人信息 / 动态 / 菜单", char: "我", chipBg: "var(--c-neutral-100, #F1F5F9)", isTab: true },
      { path: "/pages/profile/visitors", title: "谁看过我", desc: "访客记录", char: "访", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/profile/album", title: "我的相册", desc: "照片墙管理", char: "相", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/profile/tasks", title: "任务中心", desc: "每日任务 / 奖励", char: "务", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/profile/privacy", title: "权限设置", desc: "同校推荐 / 接收信息", char: "权", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/settings/index", title: "设置", desc: "通用设置", char: "设", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/settings/dnd", title: "免打扰", desc: "勿扰时段", char: "免", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/subpackages/support/feedback/index", title: "反馈中心", desc: "意见 / 建议 / 投诉", char: "反", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/subpackages/legal/privacy/index", title: "隐私政策", desc: "个人信息保护", char: "私", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/subpackages/legal/agreement/index", title: "用户协议", desc: "服务条款", char: "协", chipBg: "var(--c-neutral-100, #F1F5F9)" },
    ],
  },
];

const pageVisible = ref(false);
let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  // 非展示构建包直达本页时（如被扫码/分享）回落到发现页，保证正式包无展示痕迹
  if (!isShowcaseMode) {
    uni.switchTab({ url: "/pages/discover/index" });
    return;
  }
  pageVisible.value = false;
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageEnterTimer = null;
    pageVisible.value = true;
  }, 30);
});

onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
});

/** 跳转到目标页面（Tab 用 switchTab，其余 navigateTo） */
function navigate(item: ShowcaseItem) {
  if (item.isTab) {
    uni.switchTab({ url: item.path });
  } else {
    uni.navigateTo({ url: item.path });
  }
}

/** 返回上一页 */
function goBack() {
  uni.navigateBack({
    fail: () => {
      // 无上级页面（如直达）时回首页
      uni.switchTab({ url: "/pages/discover/index" });
    },
  });
}
</script>

<template>
  <view class="sc-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部品牌栏 -->
    <view class="sc-header">
      <view
        class="sc-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="goBack"
      >
        <text class="sc-header__back-icon">←</text>
      </view>
      <view class="sc-header__titles">
        <text class="sc-header__title">全功能展示</text>
        <text class="sc-header__subtitle">超级管理员模式 · 所有功能已解锁</text>
      </view>
      <view class="sc-header__badge">
        <text class="sc-header__badge-text">SHOWCASE</text>
      </view>
    </view>

    <!-- 说明卡片 -->
    <view class="sc-notice card-stagger">
      <view class="sc-notice__dot" />
      <view class="sc-notice__body">
        <text class="sc-notice__title">欢迎使用展示版</text>
        <text class="sc-notice__text">
          以下分组覆盖全部功能页面，点击任意卡片即可体验。Tab 页面使用底部切换，其余页面可返回本页继续浏览。
        </text>
      </view>
    </view>

    <!-- 分组卡片 -->
    <view
      v-for="group in groups"
      :key="group.id"
      class="sc-group"
    >
      <view class="sc-group__head">
        <view class="sc-group__accent" :style="{ background: group.accent }" />
        <text class="sc-group__title">{{ group.title }}</text>
        <text class="sc-group__subtitle">{{ group.subtitle }}</text>
        <text class="sc-group__count">{{ group.items.length }} 项</text>
      </view>

      <view class="sc-group__list" role="list">
        <view
          v-for="(item, idx) in group.items"
          :key="idx"
          class="sc-item list-item"
          :class="{ 'sc-item--tab': item.isTab }"
          hover-class="sc-item--active"
          hover-stay-time="120"
          role="listitem"
          :aria-label="item.title"
          @tap="navigate(item)"
        >
          <view class="sc-item__chip" :style="{ background: item.chipBg }">
            <text class="sc-item__chip-text">{{ item.char }}</text>
          </view>
          <view class="sc-item__body">
            <view class="sc-item__title-row">
              <text class="sc-item__title">{{ item.title }}</text>
              <text v-if="item.isTab" class="sc-item__tab-tag">Tab</text>
            </view>
            <text class="sc-item__desc">{{ item.desc }}</text>
          </view>
          <text class="sc-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
$text-secondary: var(--c-neutral-500);
$text-tertiary: var(--c-text-tertiary);
$divider: var(--c-neutral-200);
$card-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.sc-page {
  min-height: 100%;
  background: $bg-page;
  padding-bottom: env(safe-area-inset-bottom);
}

/* ---------- 顶部品牌栏 ---------- */
.sc-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 28rpx;
  background: linear-gradient(135deg, #3B9DE5 0%, #5BC0DE 55%, #7C6CF0 115%);
  border-radius: 0 0 36rpx 36rpx;
}

.sc-header__back {
  width: 68rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.28));
  flex-shrink: 0;
  transition: all var(--d-fast, 120ms) ease;
}

.sc-header__back-icon {
  font-size: var(--fs-3xl, 36rpx);
  color: $white;
  font-weight: 600;
}

.sc-header__titles {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.sc-header__title {
  font-size: 36rpx;
  font-weight: 700;
  color: $white;
  letter-spacing: 1rpx;
}

.sc-header__subtitle {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-overlay-white-text-soft, rgba(255, 255, 255, 0.82));
}

.sc-header__badge {
  padding: 8rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.28));
  flex-shrink: 0;
}

.sc-header__badge-text {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: $white;
  letter-spacing: 2rpx;
}

/* ---------- 说明卡片 ---------- */
.sc-notice {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  margin: 28rpx 32rpx 0;
  padding: 24rpx;
  border-radius: var(--r-xl, 24rpx);
  background: linear-gradient(135deg, var(--c-tint-amber-50, #FFFBEB) 0%, var(--c-tint-orange-50, #FFF4EC) 100%);
  border: 2rpx solid var(--c-vip-border-light, rgba(245, 158, 11, 0.25));
  box-shadow: $card-shadow;
}

.sc-notice__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-warning, #F59E0B);
  margin-top: 12rpx;
  flex-shrink: 0;
}

.sc-notice__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.sc-notice__title {
  font-size: var(--fs-base, 26rpx);
  font-weight: 700;
  color: var(--c-text-warning-dark, #92400e);
}

.sc-notice__text {
  font-size: var(--fs-sm, 22rpx);
  line-height: 1.6;
  color: var(--c-text-warning-dark, #92400e);
}

/* ---------- 分组 ---------- */
.sc-group {
  margin: 32rpx 32rpx 0;
}

.sc-group__head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.sc-group__accent {
  width: 10rpx;
  height: 32rpx;
  border-radius: var(--r-sm, 8rpx);
}

.sc-group__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: $text-primary;
}

.sc-group__subtitle {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  flex: 1;
}

.sc-group__count {
  font-size: var(--fs-xs, 20rpx);
  color: $text-tertiary;
  background: var(--c-neutral-100, #F1F5F9);
  padding: 4rpx 14rpx;
  border-radius: var(--r-full, 9999rpx);
}

.sc-group__list {
  border-radius: var(--r-xl, 24rpx);
  overflow: hidden;
  background: var(--c-neutral-0);
  box-shadow: $card-shadow;
}

/* ---------- 列表项 ---------- */
.sc-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid $bg-page;
  transition: background var(--d-fast, 120ms) ease;
}

.sc-item:last-child {
  border-bottom: none;
}

.sc-item--active {
  background: var(--c-neutral-50, #F8FAFC);
}

.sc-item--tab {
  border-left: 6rpx solid var(--c-info-500, #3B82F6);
}

.sc-item__chip {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-lg, 20rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sc-item__chip-text {
  font-size: var(--fs-lg, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.sc-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.sc-item__title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.sc-item__title {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: $text-primary;
}

.sc-item__tab-tag {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-info-500, #3B82F6);
  font-weight: 700;
  padding: 2rpx 10rpx;
  border-radius: var(--r-sm, 8rpx);
  background: var(--c-tint-blue-soft, #E8F4FF);
}

.sc-item__desc {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-item__arrow {
  font-size: var(--fs-2xl, 32rpx);
  color: var(--c-neutral-300, #CBD5E1);
  font-weight: 600;
  flex-shrink: 0;
}

.safe-bottom {
  height: 48rpx;
}
</style>
