<script setup lang="ts">
/**
 * 签到分享卡片组件（功能8）
 *
 * 用于在用户签到成功后弹出分享卡片，展示连续签到天数、今日获得积分等信息，
 * 并提供"分享给好友"和"保存图片"两个操作。
 *
 * 数据来源：父组件通过 props 传入 consecutiveDays / earnedPoints / checkInDate
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（mp-weixin 不支持），改用 hover-class
 * - 不使用 import.meta.env.DEV（mp-weixin 运行时会报错）
 * - 不使用 optional catch binding（catch {}），mp-weixin 不兼容
 * - 不使用 backdrop-filter（仅 H5 条件编译）
 * - 分享：mp-weixin 使用 uni.share，H5 回退到 setClipboardData
 * - 保存图片：mp-weixin 使用 uni.saveImageToPhotosAlbum，H5 仅提示
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import { successHaptic, errorHaptic } from "../../utils/haptic";

/**
 * ShareCard Props
 */
const props = defineProps<{
  /** 是否显示分享卡片 */
  visible: boolean;
  /** 连续签到天数 */
  consecutiveDays: number;
  /** 今日获得积分 */
  earnedPoints: number;
  /** 签到日期（yyyy-MM-dd），可选，默认今天 */
  checkInDate?: string;
}>();

/**
 * ShareCard Emits
 */
const emit = defineEmits<{
  /** 关闭卡片（点击遮罩或关闭按钮） */
  (e: "close"): void;
  /** 分享成功 */
  (e: "shared"): void;
  /** 保存图片成功 */
  (e: "saved"): void;
}>();

const { t } = useI18n();

/** 签到图标路径（模板中通过此常量引用，避免内联 IMAGE_PATHS 长链） */
const checkinIcon = IMAGE_PATHS.ICONS_SOCIAL.CHECKIN;

/** 是否正在执行分享/保存操作（防重复触发） */
const isProcessing = ref(false);

/** 当前日期字符串（用于卡片展示，props 未传时取今天） */
const todayString = computed(() => {
  if (props.checkInDate) return props.checkInDate;
  // mp-weixin 与 H5 均支持 Date，但需注意时区；以本地日期为准
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
});

/** 分享文案（用于复制到剪贴板或传递给 uni.share） */
const shareText = computed(() => {
  return t("home.shareCardSubtitle", {
    n: props.consecutiveDays,
    points: props.earnedPoints,
  });
});

/** "天" 标签（Task 28：直接使用 i18n 键，避免字符串替换 fallback） */
const daysLabel = computed(() => t("home.daysLabel"));

/** "积分" 标签 */
const pointsLabel = computed(() => t("home.pointsLabel"));

/**
 * 关闭卡片
 */
function handleClose() {
  if (isProcessing.value) return;
  emit("close");
}

/**
 * 分享给好友
 *
 * mp-weixin：调用 uni.share，scene=WXSceneSession（分享到好友会话）
 * H5：调用 uni.setClipboardData 复制文案到剪贴板
 * 失败统一 toast 提示，成功统一 toast 提示
 */
async function handleShare() {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    // #ifdef MP-WEIXIN
    await new Promise<void>((resolve, reject) => {
      uni.share({
        provider: "weixin",
        scene: "WXSceneSession",
        type: 0, // 0=图文
        title: t("home.shareCardTitle"),
        summary: shareText.value,
        // mp-weixin 分享需要 imageUrl，此处使用应用内的图标资源
        // （static 路径下的图片在小程序内可被分享 SDK 读取）
        imageUrl: checkinIcon,
        success: () => resolve(),
        fail: (err) => reject(err),
      });
    });
    successHaptic();
    uni.showToast({ title: t("home.shareSuccess"), icon: "success" });
    emit("shared");
    // #endif

    // #ifdef H5
    await new Promise<void>((resolve, reject) => {
      uni.setClipboardData({
        data: `${t("home.shareCardTitle")}\n${shareText.value}`,
        success: () => resolve(),
        fail: (err) => reject(err),
      });
    });
    successHaptic();
    uni.showToast({ title: t("home.shareSuccess"), icon: "success" });
    emit("shared");
    // #endif

    // #ifndef MP-WEIXIN || H5
    // 其他平台（App 等）回退到剪贴板
    await new Promise<void>((resolve, reject) => {
      uni.setClipboardData({
        data: `${t("home.shareCardTitle")}\n${shareText.value}`,
        success: () => resolve(),
        fail: (err) => reject(err),
      });
    });
    uni.showToast({ title: t("home.shareSuccess"), icon: "success" });
    emit("shared");
    // #endif
  } catch (error) {
    console.error("[ShareCard.handleShare] 分享失败:", error);
    errorHaptic();
    uni.showToast({
      title: t("home.shareFailed"),
      icon: "none",
    });
  } finally {
    isProcessing.value = false;
  }
}

/**
 * 保存图片到相册
 *
 * mp-weixin：调用 uni.saveImageToPhotosAlbum，需用户授权 scope.writePhotosAlbum
 * H5：H5 端无法直接保存到相册，提示用户长按图片保存
 * 失败统一 toast 提示
 */
async function handleSaveImage() {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    // #ifdef MP-WEIXIN
    // mp-weixin：下载临时文件后保存到相册
    const downloadResult = await new Promise<string>((resolve, reject) => {
      uni.downloadFile({
        url: checkinIcon,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath);
          } else {
            reject(new Error(t("home.downloadFailedWithCode", { code: res.statusCode })));
          }
        },
        fail: (err) => reject(new Error(err.errMsg || t("home.downloadFailed"))),
      });
    });
    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: downloadResult,
        success: () => resolve(),
        fail: (err) => reject(new Error(err.errMsg || t("home.saveFailed"))),
      });
    });
    successHaptic();
    uni.showToast({ title: t("home.saveSuccess"), icon: "success" });
    emit("saved");
    // #endif

    // #ifdef H5
    // H5 端无法直接保存到相册，提示用户长按图片保存
    uni.showToast({
      title: t("home.saveFailed"),
      icon: "none",
    });
    // #endif

    // #ifndef MP-WEIXIN || H5
    uni.showToast({
      title: t("home.saveFailed"),
      icon: "none",
    });
    // #endif
  } catch (error) {
    console.error("[ShareCard.handleSaveImage] 保存失败:", error);
    errorHaptic();
    uni.showToast({
      title: t("home.saveFailed"),
      icon: "none",
    });
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <view
    v-if="visible"
    class="share-overlay"
    @tap="handleClose"
    role="dialog"
    aria-modal="true"
    :aria-label="t('home.shareCardTitle')"
  >
    <!-- 遮罩层：点击关闭 -->
    <view class="share-mask"></view>

    <!-- 卡片主体：catchtap 阻止冒泡，避免点击卡片关闭 -->
    <view class="share-card" catchtap="noop">
      <!-- 关闭按钮 -->
      <view
        class="share-close"
        hover-class="share-close--active"
        hover-stay-time="120"
        @tap="handleClose"
        role="button"
        :aria-label="t('common.cancel')"
      >
        <text class="share-close__icon">✕</text>
      </view>

      <!-- 卡片头部：品牌标识 -->
      <view class="share-header">
        <image class="share-header__icon" :src="checkinIcon" mode="aspectFit" alt="" />
        <text class="share-header__title">{{ t('home.shareCardTitle') }}</text>
      </view>

      <!-- 卡片内容：签到信息 -->
      <view class="share-body">
        <view class="share-stat">
          <text class="share-stat__value">{{ consecutiveDays }}</text>
          <text class="share-stat__label">{{ daysLabel }}</text>
        </view>
        <view class="share-divider"></view>
        <view class="share-stat">
          <text class="share-stat__value">{{ earnedPoints }}</text>
          <text class="share-stat__label">{{ pointsLabel }}</text>
        </view>
      </view>

      <!-- 签到日期 -->
      <text class="share-date">{{ todayString }}</text>

      <!-- 副标题：连续签到 N 天，今日获得 N 积分 -->
      <text class="share-subtitle">{{ shareText }}</text>

      <!-- 操作按钮 -->
      <view class="share-actions">
        <view
          class="share-btn share-btn--primary"
          hover-class="share-btn--active"
          hover-stay-time="120"
          @tap="handleShare"
        >
          <text class="share-btn__text">{{ t('home.shareCardBtn') }}</text>
        </view>
        <view
          class="share-btn share-btn--secondary"
          hover-class="share-btn--active"
          hover-stay-time="120"
          @tap="handleSaveImage"
        >
          <text class="share-btn__text">{{ t('home.shareCardSave') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.share-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal, 999);
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-bg-overlay);
}

.share-card {
  position: relative;
  width: 580rpx;
  padding: 48rpx 40rpx 40rpx;
  border-radius: var(--r-xl, 32rpx);
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-brand-500) 100%);
  box-shadow: var(--s-modal);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.share-close {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-overlay-bg-light);
}

.share-close--active {
  background: var(--c-overlay-white-bg-strong-mid);
}

.share-close__icon {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.share-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.share-header__icon {
  width: 48rpx;
  height: 48rpx;
}

.share-header__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.share-body {
  display: flex;
  align-items: center;
  gap: 40rpx;
  margin-bottom: 24rpx;
}

.share-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.share-stat__value {
  font-size: 64rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
  line-height: 1;
}

.share-stat__label {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-overlay-white-text-stronger);
}

.share-divider {
  width: 2rpx;
  height: 80rpx;
  background: var(--c-overlay-border-strong);
}

.share-date {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-overlay-text-secondary);
  margin-bottom: 12rpx;
}

.share-subtitle {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-overlay-text-primary);
  text-align: center;
  margin-bottom: 40rpx;
  line-height: 1.5;
}

.share-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  width: 100%;
}

.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--r-lg, 24rpx);
}

.share-btn--primary {
  background: var(--c-bg-container);
}

.share-btn--secondary {
  background: var(--c-overlay-bg-light);
  border: 2rpx solid var(--c-overlay-white-bg-stronger);
}

.share-btn--active {
  opacity: 0.85;
}

.share-btn__text {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 600;
}

.share-btn--primary .share-btn__text {
  color: var(--c-romance-500);
}

.share-btn--secondary .share-btn__text {
  color: var(--c-text-inverse);
}
</style>
