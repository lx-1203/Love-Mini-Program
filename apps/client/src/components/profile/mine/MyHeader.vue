<script setup lang="ts">
import { computed } from "vue";
import type { UserProfileDTO } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";
import { resolveMediaUrl } from "../../../utils/media";
import { profileMetaLine } from "../../../utils/profile-meta";

const props = withDefaults(defineProps<{
  profile: UserProfileDTO;
  editLabel?: string;
}>(), {
  editLabel: "编辑资料",
});

const emit = defineEmits<{
  (e: "edit"): void;
  (e: "tapAvatar"): void;
}>();

function handleSettings() {
  uni.navigateTo({ url: "/subpackages/profile-extra/settings/index" });
}

const metaLine = computed(() => profileMetaLine(props.profile.basic));

const certLabel = computed(() => {
  if (!props.profile.identity.verified) return "";
  return props.profile.identity.student ? "学生认证" : "已认证";
});

const genderIconSrc = computed(() => {
  if (props.profile.basic.gender === "female") return IMAGE_PATHS.ICONS_EMOJI.GENDER_FEMALE;
  if (props.profile.basic.gender === "male") return IMAGE_PATHS.ICONS_EMOJI.GENDER_MALE;
  return "";
});
</script>

<template>
  <view class="my-header">
    <view class="my-header__icons">
      <!-- MP-R1-PROFILE-215：原生分享按钮，触发所在页 pages/profile/index.vue 的 onShareAppMessage
           2026-10-26 对齐理想图（已经填完资料的个人主页.png）：导航图标为无底深色裸图标
           （撤 rgba 白圆底），第一枚字形由「▦」文本改为二维码图标（定位角块+点阵） -->
      <button class="my-header__icon my-header__icon--share" open-type="share" hover-class="my-header__icon--pressed" aria-label="分享">
        <image class="my-header__qr" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.QR_CODE_SVG)" mode="aspectFit" alt="" />
      </button>
      <view class="my-header__icon" hover-class="my-header__icon--pressed" role="button" aria-label="设置" @tap="handleSettings">
        <image class="my-header__icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.SETTINGS" mode="aspectFit" alt="" />
      </view>
    </view>
    <view class="my-header__content">
      <view class="my-header__avatar" @tap="emit('tapAvatar')">
        <image
          v-if="props.profile.basic.avatar"
          class="my-header__avatar-img"
          :src="props.profile.basic.avatar"
          mode="aspectFill"
          alt=""
        />
        <text v-else class="my-header__avatar-initial">{{ (props.profile.basic.name || "?").charAt(0) }}</text>
        <view v-if="props.profile.identity.verified" class="my-header__cert-dot">
          <image class="my-header__cert-dot-icon" :src="IMAGE_PATHS.ICONS_COMMON.CHECK_WHITE_SVG" mode="aspectFit" alt="" />
        </view>
      </view>

      <view class="my-header__info">
        <view class="my-header__name-row">
          <text class="my-header__name">{{ props.profile.basic.name }}</text>
          <image v-if="genderIconSrc" class="my-header__gender" :src="genderIconSrc" mode="aspectFit" alt="" />
          <view class="my-header__online"><text class="my-header__online-text">在线</text></view>
        </view>
        <text v-if="metaLine" class="my-header__meta">{{ metaLine }}</text>
        <view v-if="certLabel" class="my-header__cert">
          <text class="my-header__cert-text">{{ certLabel }}</text>
        </view>
        <text v-if="props.profile.intro.bio" class="my-header__bio">{{ props.profile.intro.bio }}</text>
      </view>

      <view class="my-header__right">
        <view class="my-header__edit" hover-class="my-header__edit--pressed" @tap="emit('edit')">
          <text class="my-header__edit-text">{{ editLabel }}</text>
        </view>
      </view>
    </view>
    <slot name="bottom" />
  </view>
</template>

<style scoped lang="scss">
.my-header {
  position: relative;
  /* R3：顶部加状态栏高度（--statusbar 由 useMenuButtonRect 注入）——
     头部为页面首元素，原 48rpx 起排使「编辑资料」胶囊与微信胶囊叠压
     2026-10-26 对齐理想图（P5#7）：头部渐变取样 rgb(202,242,223)，原 #E8F5E9 起点饱和度低，
     起点加深到 #CAF2DF */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 64rpx) 32rpx 56rpx;
  background: linear-gradient(160deg, #CAF2DF 0%, #F0FFF5 100%);
  border-radius: 0 0 40rpx 40rpx;
}

.my-header__icons {
  position: absolute;
  /* 状态栏下方起排，且与胶囊同带时横向再避让胶囊本体（87px） */
  top: calc(var(--statusbar, env(safe-area-inset-top)) + 16rpx);
  right: calc(var(--capsule-right, 7px) + 104px);
  display: flex;
  gap: 16rpx;
  z-index: 2;
}

.my-header__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  /* 2026-10-26 对齐理想图：导航图标无白色圆底（裸图标），盒保留维持热区 */
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-header__icon--pressed {
  opacity: 0.75;
}

/* 2026-10-26：二维码图标（定位角块+点阵），替代原「▦」文本字形 */
.my-header__qr {
  width: 36rpx;
  height: 36rpx;
}

/* 分享为原生 button（open-type="share"），复位默认样式以对齐 my-header__icon */
.my-header__icon--share {
  margin: 0;
  padding: 0;
  border: none;
  line-height: 1;
}

.my-header__icon--share::after {
  border: none;
}

.my-header__icon-img {
  width: 34rpx;
  height: 34rpx;
  /* 2026-10-26：settings-gear.svg 烘焙描边为浅灰 #94A3B8，mp <image> 不响应 CSS color，
     用 filter 压成理想图的深色裸图标（与 qr-code 同重量） */
  filter: saturate(0) brightness(0.34);
}

.my-header__content {
  display: flex;
  align-items: flex-start;
  gap: 28rpx;
}

.my-header__avatar {
  position: relative;
  flex-shrink: 0;
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  border: 6rpx solid #FFFFFF;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
  background: #E8FBF3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-header__avatar-img {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}

.my-header__avatar-initial {
  font-size: 64rpx;
  font-weight: 800;
  color: #36C99A;
}

.my-header__cert-dot {
  position: absolute;
  right: 2rpx;
  bottom: 2rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: var(--c-brand, #36C99A);
  border: 4rpx solid var(--c-bg-container, #FFFFFF);
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-header__cert-dot-icon {
  width: 26rpx;
  height: 26rpx;
}

.my-header__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-top: 16rpx;
}

.my-header__online {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  /* R13-L02-D03（2026-10-22）：#36C99A 上白字 20rpx 实算 2.10:1，低于 P2 档 3:1。
     底色改 --c-brand-800 #156B51（theme/design-variables.scss:267），白字 6.45:1。
     不取「浅底深字」档：--c-brand-100 底会把徽标从实心变浅底，与卡内其余实心徽标不同族。 */
  background: var(--c-brand-800, #156B51);
}

.my-header__online-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 600;
  line-height: 1.6;
}

.my-header__name-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12rpx;
}

.my-header__name {
  font-size: 52rpx;
  font-weight: 800;
  color: #222222;
  line-height: 1.1;
}

.my-header__meta {
  font-size: 26rpx;
  color: #666666;
  font-weight: 500;
}

.my-header__gender {
  width: 34rpx;
  height: 34rpx;
  margin-left: 8rpx;
  color: #FF6B9D;
}

.my-header__cert {
  align-self: flex-start;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid rgba(54, 201, 154, 0.5);
}

.my-header__cert-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #36C99A;
}

.my-header__bio {
  font-size: 24rpx;
  color: #555555;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.my-header__right {
  flex-shrink: 0;
  padding-top: 20rpx;
}

.my-header__edit {
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  /* 2026-10-26 对齐理想图（P5#2）：白底黑字无边框胶囊（撤浅色描边） */
  border: none;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
}

.my-header__edit--pressed {
  opacity: 0.85;
}

.my-header__edit-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #222222;
}
</style>
