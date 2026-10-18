<script setup lang="ts">
import { computed } from "vue";
import type { UserProfileDTO } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";
import { profileMetaParts } from "../../../utils/profile-meta";

const props = defineProps<{ profile: UserProfileDTO; online?: boolean }>();
const emit = defineEmits<{
  (e: "like"): void;
  (e: "message"): void;
  /** R2b-L06-D22：底栏恢复理想图的 3 枚布局后，「送心动卡」入口降级到身份卡右侧
   *  （D14 的胶囊组下方）。上游 other.vue 的 @whisper → WhisperComposeSheet 链路不变。 */
  (e: "whisper"): void;
}>();

/** 在线状态：唯一来源（profile.online → prop → 默认为在线）。
 *  R2b-L06-D12：此前画面上的「在线」胶囊其实来自第三行 distance-row（margin-top:16rpx 另起一行），
 *  姓名行的胶囊另有 v-if 分支，同一状态两个渲染源 → 位置漂移 + 文案重复。现在只保留姓名行这一处。 */
const online = computed(() => props.profile.online ?? props.online ?? true);

/** 距离文案（理想图第三行本体只有 "2.3km"，「在线」不再在此重复 —— 见 D12） */
const distanceText = computed(() => props.profile.distanceText ?? "");

/** 基本信息行：年龄 · 学校 · 城市，与「我的页」MyHeader 共用 utils/profile-meta 的同一份口径
 *  （MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001：两页原先同一份数据渲染成两种顺序）。 */
const basicInfo = computed(() => profileMetaParts(props.profile.basic));

const genderIconSrc = computed(() => {
  if (props.profile.basic.gender === "female") return IMAGE_PATHS.ICONS_EMOJI.GENDER_FEMALE;
  if (props.profile.basic.gender === "male") return IMAGE_PATHS.ICONS_EMOJI.GENDER_MALE;
  return "";
});
</script>

<template>
  <view class="public-identity">
    <view class="public-identity__main">
      <view class="public-identity__info">
        <view class="public-identity__name-row">
          <text class="public-identity__name">{{ profile.basic.name }}</text>
          <view v-if="genderIconSrc" class="public-identity__gender" :class="`public-identity__gender--${profile.basic.gender}`">
            <image class="public-identity__gender-symbol" :src="genderIconSrc" mode="aspectFit" alt="" />
          </view>
          <view v-if="online" class="public-identity__online">
            <text class="public-identity__online-dot"></text>
            <text class="public-identity__online-text">在线</text>
          </view>
        </view>
        <text v-if="profile.relation.matchScore" class="public-identity__match">
          匹配度 {{ profile.relation.matchScore }}%
        </text>
      </view>
      <view class="public-identity__actions">
        <!-- R2b-L06-D14：理想图身份卡右侧是上下叠放的两枚「图标 + 文字」胶囊
             （浅粉底粉字「喜欢」/ 浅绿底绿字「打招呼」）。实帧是两枚 80rpx 纯图标圆钮，
             没有任何文字标签，用户无法判断动作。配色沿用原注释口径，补齐 <text>。 -->
        <view class="public-identity__pill public-identity__pill--like" hover-class="public-identity__pill--pressed" @tap="emit('like')">
          <image class="public-identity__pill-icon" :src="IMAGE_PATHS.ICONS_V2.HEART_PINK" mode="aspectFit" alt="" />
          <text class="public-identity__pill-text public-identity__pill-text--like">喜欢</text>
        </view>
        <view class="public-identity__pill public-identity__pill--hello" hover-class="public-identity__pill--pressed" @tap="emit('message')">
          <image class="public-identity__pill-icon" :src="IMAGE_PATHS.ICONS_V2.CHAT_GREEN" mode="aspectFit" alt="" />
          <text class="public-identity__pill-text public-identity__pill-text--hello">打招呼</text>
        </view>
        <!-- R2b-L06-D22：底栏的「心动卡」按理想图撤出后，入口降级为身份卡内的次级文字链 -->
        <view class="public-identity__whisper" hover-class="public-identity__whisper--pressed" @tap="emit('whisper')">
          <text class="public-identity__whisper-text">送心动卡</text>
        </view>
      </view>
    </view>
    <!-- R2b-L06-D13：理想图姓名下方两行（「21岁 · 北京大学 · 北京」/「2.3km」）。
         原实现两行各挂 v-if，无数据时整块塌陷 → 身份卡比理想图矮一半。
         现在缺项只省略缺的那一段（profileMetaParts 已保证不产空段），全缺时给固定占位文案。 -->
    <view class="public-identity__meta-row">
      <template v-if="basicInfo.length">
        <template v-for="(part, index) in basicInfo" :key="part">
          <text v-if="index > 0" class="public-identity__meta-sep">·</text>
          <text class="public-identity__meta-item">{{ part }}</text>
        </template>
      </template>
      <text v-else class="public-identity__meta-item public-identity__meta-item--empty">资料暂未完善</text>
    </view>
    <!-- 距离行（理想图第三行）：只出距离，「在线」不再在此重复渲染（R2b-L06-D12）。
         后端 /profile/{id} 目前不下发 distanceText/online 字段，真机常为空 → 见修复报告。 -->
    <view v-if="distanceText" class="public-identity__distance-row">
      <text class="public-identity__distance-text">{{ distanceText }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-identity {
  margin: -72rpx 40rpx 0;
  padding: 148rpx 32rpx 28rpx;
  border-radius: 40rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 4;
}

.public-identity__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}

.public-identity__info {
  flex: 1;
  min-width: 0;
}

.public-identity__name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.public-identity__name {
  font-size: 44rpx;
  font-weight: 700;
  color: #333A37;
  line-height: 1.2;
}

/* 性别徽章：20×20px 圆形底色 + 白色符号（男蓝 #54A0FF / 女粉 #FF6B81） */
.public-identity__gender {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.public-identity__gender--male {
  background: #54A0FF;
}

.public-identity__gender--female {
  background: #FF6B81;
}

.public-identity__gender-symbol {
  width: 26rpx;
  height: 26rpx;
  color: #ffffff;
}

.public-identity__online {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #E8FBF3;
}

.public-identity__online-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #36C99A;
}

.public-identity__online-text {
  font-size: 20rpx;
  color: #36C99A;
  font-weight: 500;
}

.public-identity__match {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #FF6B81;
  font-weight: 500;
}

/* 右侧动作组（R2b-L06-D14）：上下叠放的「喜欢 / 打招呼」文字胶囊 + 次级「送心动卡」文字链。
   配色：浅粉 tint + --c-love 文字 / 浅绿 tint + 品牌绿文字（与理想图一致，不做实心强调）。 */
.public-identity__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
  flex-shrink: 0;
}

.public-identity__pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  height: 56rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
}

.public-identity__pill--pressed {
  transform: scale(0.96);
}

.public-identity__pill--like {
  background: var(--c-tint-pink-50, #FCE4EC);
}

.public-identity__pill--hello {
  /* 与本文件「在线」胶囊同档浅绿底（保持卡内两处 tint 逐字一致） */
  background: #E8FBF3;
}

.public-identity__pill-icon {
  width: 28rpx;
  height: 28rpx;
}

.public-identity__pill-text {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 600;
}

.public-identity__pill-text--like {
  color: var(--c-love, #FF6B81);
}

.public-identity__pill-text--hello {
  color: var(--c-brand, #36C99A);
}

.public-identity__whisper {
  padding: 4rpx 12rpx;
}

.public-identity__whisper--pressed {
  opacity: 0.6;
}

.public-identity__whisper-text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary, #6B7571);
  text-decoration: underline;
}

/* 基本信息行：13px 文字，· 分隔 */
.public-identity__meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 20rpx;
}

.public-identity__meta-item {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-tertiary, #6B7571);
}

.public-identity__meta-item--empty {
  color: var(--c-text-quaternary, #9AA39F);
}

.public-identity__meta-sep {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-line, #EEF2F0);
}

/* 距离行（R2b-L06-D12/D13）：理想图第三行是普通灰字（"2.3km"），
   不再是绿色胶囊 —— 绿色胶囊只用于姓名行的「在线」，避免同一状态两种渲染。 */
.public-identity__distance-row {
  display: inline-flex;
  align-items: center;
  margin-top: 8rpx;
}

.public-identity__distance-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-tertiary, #6B7571);
}
</style>
