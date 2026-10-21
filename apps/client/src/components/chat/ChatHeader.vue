<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";
// R20（2026-09-08）：var(--statusbar, env(safe-area-inset-top)) 在模拟器/无刘海机型为 0，
// 头部会顶进状态栏与系统时间叠印 → 改用 JS 注入的 statusBarHeight
import { useStatusBarHeight } from "../../composables/useStatusBarHeight";
// R9-L11-D12：胶囊（菜单按钮）实测矩形，头部右侧按胶囊左缘让位
import { getMenuButtonRect, getWindowWidth } from "../../compat";

const statusBarHeightPx = useStatusBarHeight();

/* R9-L11-D12（层级遮挡 P1，2026-10-18）：自绘「···」more 盒原右缘=378−12=366px，
   整枚被微信原生胶囊（实测 x=288..369 / y=50..76）盖住，父级 @more="openNavMenu"
   在画面上没有任何可点区域。env()/静态 rpx 在不同机型上与胶囊宽度不成比例
   （见已知机制 §4：本运行档 env 恒 0），故按实测胶囊左缘注入右 padding：
   paddingRight = windowWidth − rect.left + 4px（4px 视觉间隙）。测得即生效，
   测不到时退回样式表里的 184rpx 兜底（既有值，不改设计稿位移量级）。 */
const capsulePadRightPx = ref(0);
onMounted(() => {
  try {
    const rect = getMenuButtonRect();
    const windowWidth = getWindowWidth();
    if (rect && windowWidth && rect.left > 0) {
      capsulePadRightPx.value = Math.max(0, windowWidth - rect.left) + 4;
    }
  } catch {
    capsulePadRightPx.value = 0;
  }
});

const headerStyle = computed(() => {
  const style: Record<string, string> = {
    paddingTop: Math.max(statusBarHeightPx.value, 20) + "px",
  };
  if (capsulePadRightPx.value > 0) {
    style.paddingRight = capsulePadRightPx.value + "px";
  }
  return style;
});

const props = withDefaults(
  defineProps<{
    avatar?: string;
    nickname: string;
    online?: boolean;
    relationDays?: number;
  }>(),
  { avatar: "", online: false, relationDays: 1 }
);

const emit = defineEmits<{
  back: [];
  more: [];
  "avatar-tap": [];
  "avatar-pat": [];
}>();

/** 2026-08-23：头像单击/双击检测（双击=拍一拍，单击=弹出菜单） */
let avatarTapTimer: ReturnType<typeof setTimeout> | null = null;
let lastAvatarTap = 0;
function onAvatarTap() {
  const now = Date.now();
  if (now - lastAvatarTap < 300) {
    if (avatarTapTimer) { clearTimeout(avatarTapTimer); avatarTapTimer = null; }
    lastAvatarTap = 0;
    emit("avatar-pat");
    return;
  }
  lastAvatarTap = now;
  if (avatarTapTimer) clearTimeout(avatarTapTimer);
  avatarTapTimer = setTimeout(() => {
    avatarTapTimer = null;
    emit("avatar-tap");
  }, 300);
}

/* R6-L14-D01（素材缺失 P1）：MESSAGE_ICONS 整组是 `/static/assets/message/...` 字面量，
   而 `static/assets/message/` 在 cdn-buckets.json 的 cdnPrefixes 里 ⇒ real 发布包整目录不随包
   （实测 apps/client/dist/build/mp-weixin-real/static/assets 下无 message/），
   裸绑常量必 404：帧上标题右侧心形位 x128-146 墨迹像素 = 0。
   本文件 :58 的头像已经过 resolveMediaUrl，这三枚漏了 ⇒ 按 §1.6 铁律 3 补齐。
   注：解析后落后端 app-assets/assets/message/svg/icon/heart.svg，该素材 stroke 写的是
   currentColor（盘上已核对），经 <image> 加载时前景取不到 CSS color —— 出图后的实际墨色
   取决于 F1 车道的 SVG 烘焙，本条只解「0 墨迹」。 */
const ringSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.MESSAGE_ICONS.AVATAR_RING));
const onlineSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.MESSAGE_ICONS.ONLINE));
const heartSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.MESSAGE_ICONS.HEART));
</script>

<template>
  <view class="chat-header" role="banner" :style="headerStyle">
    <view class="chat-header__back" hover-class="chat-header__hover" @tap="emit('back')">
      <text class="chat-header__back-text">‹</text>
    </view>
    <view class="chat-header__avatar-wrap" @tap="onAvatarTap">
      <image v-if="props.avatar" class="chat-header__avatar" :src="resolveMediaUrl(props.avatar)" mode="aspectFill" />
      <view v-else class="chat-header__avatar chat-header__avatar--fallback">
        <text class="chat-header__avatar-text">{{ (nickname || "?").charAt(0) }}</text>
      </view>
      <image class="chat-header__ring" :src="ringSrc" mode="aspectFit" />
      <image v-if="online" class="chat-header__online" :src="onlineSrc" mode="aspectFit" />
    </view>
    <view class="chat-header__title-wrap">
      <view class="chat-header__title-row">
        <text class="chat-header__title">{{ nickname }}</text>
        <image class="chat-header__heart" :src="heartSrc" mode="aspectFit" />
        <text class="chat-header__days">认识 {{ relationDays }} 天</text>
      </view>
      <text class="chat-header__status">{{ online ? "在线" : "离线" }}</text>
    </view>
    <view class="chat-header__more" hover-class="chat-header__hover" @tap="emit('more')">
      <text class="chat-header__more-text">···</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.chat-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  padding-top: calc(var(--statusbar, env(safe-area-inset-top)) + 20rpx);
  /* R9-L11-D12（层级遮挡 P1）：右侧自绘「···」more 盒原右缘=378−12=366px，整枚落在
     微信原生胶囊 x=288..369 / y=50..76 之下（父级 @more="openNavMenu" 无可达出口）。
     运行时由 headerStyle 按实测胶囊左缘注入 padding-right（windowWidth − rect.left + 4px，
     本帧=378−288+4=94px ⇒ more 盒右缘=284px，与胶囊留 4px）；此处 184rpx 仅作测量失败兜底
     （184rpx=92.7px ⇒ 右缘 285.3px，仍在胶囊左缘 288px 之外）。 */
  padding-right: 184rpx;
  /* 2026-08-26：背景统一为页面底（--c-bg-page #EEF7F2），
     避免顶部纯白与下方内容浅灰绿拼接成"上下背景不一致" */
  background: var(--c-bg-page, #EEF7F2);
  border-bottom: 1rpx solid #EEF2F0;
}
.chat-header__back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-header__back-text {
  font-size: 56rpx;
  color: #36C99A;
  /* R21：‹ 字形默认行高导致视觉重心偏下，与头像中心不对齐 → 收紧行高并上移微调 */
  line-height: 1;
  margin-top: -8rpx;
}
.chat-header__avatar-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
}
.chat-header__avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
}
.chat-header__avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F8F1;
}
.chat-header__avatar-text {
  font-size: 32rpx;
  color: #36C99A;
  font-weight: 700;
}
.chat-header__ring {
  pointer-events: none;
  position: absolute;
  left: 0;
  top: 0;
  width: 80rpx;
  height: 80rpx;
}
.chat-header__online {
  pointer-events: none;
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  width: 24rpx;
  height: 24rpx;
}
.chat-header__title-wrap {
  flex: 1;
  min-width: 0;
}
.chat-header__title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.chat-header__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-header__heart {
  width: 28rpx;
  height: 28rpx;
}
.chat-header__days {
  font-size: 22rpx;
  color: #FF6B81;
}
.chat-header__status {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #999999;
}
.chat-header__more {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-header__more-text {
  font-size: 40rpx;
  color: #666666;
}
.chat-header__hover {
  opacity: 0.7;
}
</style>

