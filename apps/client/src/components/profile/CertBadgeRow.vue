<script setup lang="ts">
/**
 * CertBadgeRow — 认证成就名牌行（2026-08-13，B5）
 *
 * 三级认证体系（用户拍板）：
 * ① 年龄认证「18+」（基础级，注册门强制）
 * ② 实名认证「实名」（中等级，身份证）
 * ③ 学历认证「学历」（最高级，机器 + 人工 + 学信网三层核验，须先实名）
 *
 * 名牌为渐变圆角方牌横排展示于昵称行下方；小程序无悬停——
 * 名牌恒显短标签（视觉等同 QQ 认证名牌），点击任一枚 → 半屏专业详情面板。
 * 未获得的认证半透明 + 「待认证」角标，点击同样进面板引导。
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";

/** 认证项（由父组件组装数据） */
export interface CertBadgeItem {
  /** 认证 ID：age / realname / education */
  id: "age" | "realname" | "education";
  /** 名牌图标 */
  icon: string;
  /** 是否已获得（false 显示半透明 + 待认证角标） */
  earned: boolean;
}

const props = defineProps<{
  badges: CertBadgeItem[];
}>();

const emit = defineEmits<{
  (e: "tap", badge: CertBadgeItem): void;
}>();

const { t } = useI18n();

/** 三级认证短标签（i18n profile.certBadgeNames.*） */
function badgeLabel(id: CertBadgeItem["id"]): string {
  const keys = {
    age: "profile.certBadgeNames.age",
    realname: "profile.certBadgeNames.realname",
    education: "profile.certBadgeNames.education",
  } as const;
  return t(keys[id]);
}

/** 名牌图标（按认证级别） */
function badgeIcon(id: CertBadgeItem["id"]): string {
  const icons = {
    age: IMAGE_PATHS.ICONS_COMMON.NEW_BADGE,
    realname: IMAGE_PATHS.ICONS_COMMON.CHECK_WHITE_SVG,
    education: IMAGE_PATHS.ICONS_COMMON.GRADUATION_CAP_SVG,
  } as const;
  return icons[id];
}
</script>

<template>
  <view
    class="cert-badge-row"
    role="list"
    :aria-label="t('profile.certBadgesTitle')"
  >
    <view
      v-for="badge in props.badges"
      :key="badge.id"
      class="cert-badge"
      :class="[
        `cert-badge--${badge.id}`,
        { 'cert-badge--pending': !badge.earned },
      ]"
      role="listitem"
      :aria-label="`${badgeLabel(badge.id)}${badge.earned ? '' : t('profile.certBadgePendingSuffix')}`"
      @tap.stop="emit('tap', badge)"
    >
      <image
        class="cert-badge__icon"
        :src="badge.icon || badgeIcon(badge.id)"
        mode="aspectFit"
        alt=""
      />
      <text class="cert-badge__label">{{ badgeLabel(badge.id) }}</text>
      <!-- 学历认证三层核验微标（机器·人工·学信网，凸显严谨） -->
      <view v-if="badge.id === 'education'" class="cert-badge__triple" aria-hidden="true">
        <view v-for="n in 3" :key="n" class="cert-badge__triple-dot" />
      </view>
      <!-- 未获得：待认证角标 -->
      <view v-if="!badge.earned" class="cert-badge__pending-tag">
        <text class="cert-badge__pending-text">{{ t('profile.certBadgePending') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cert-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2, 12rpx);
  width: 100%;
}

/* 名牌本体：渐变圆角方牌（QQ 认证名牌范式） */
.cert-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  flex-shrink: 0;
}

/* ① 年龄认证：品牌绿渐变 */
.cert-badge--age {
  background: linear-gradient(135deg, var(--c-brand-400, #6fe0b0) 0%, var(--c-brand-500, #3fcf8e) 100%);
  box-shadow: 0 2rpx 10rpx var(--c-brand-border-tint-stronger, rgba(63, 207, 142, 0.35));
}

/* ② 实名认证：蓝金渐变（中等级） */
.cert-badge--realname {
  background: linear-gradient(135deg, #4f8ef7 0%, #c9a36a 100%);
  box-shadow: 0 2rpx 10rpx rgba(79, 142, 247, 0.3);
}

/* ③ 学历认证：金绿渐变（最高级） */
.cert-badge--education {
  background: linear-gradient(135deg, #c9a36a 0%, var(--c-brand-500, #3fcf8e) 100%);
  box-shadow: 0 2rpx 10rpx rgba(201, 163, 106, 0.35);
}

/* 未获得：半透明 + 灰度 */
.cert-badge--pending {
  opacity: 0.55;
  filter: grayscale(0.7);
}

.cert-badge__icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.cert-badge__label {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
  line-height: 1.4;
}

/* 学历认证三层核验微标（机器·人工·学信网） */
.cert-badge__triple {
  display: flex;
  gap: 2rpx;
  margin-left: 2rpx;
}

.cert-badge__triple-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: var(--c-neutral-0, #ffffff);
  opacity: 0.9;
}

/* 待认证角标（右上角小标签） */
.cert-badge__pending-tag {
  position: absolute;
  top: -10rpx;
  right: -6rpx;
  padding: 2rpx 8rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-neutral-600, #5b6470);
}

.cert-badge__pending-text {
  font-size: 16rpx;
  color: var(--c-text-inverse, #ffffff);
  line-height: 1.2;
}
</style>
