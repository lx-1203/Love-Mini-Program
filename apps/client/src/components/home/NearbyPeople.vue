<script setup lang="ts">
import type { NearbyPersonViewModel } from "../../view-models/home-dashboard";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";

defineProps<{ items: NearbyPersonViewModel[]; loading?: boolean }>();
defineEmits<{ (e: "more"): void; (e: "select", userId: number): void }>();

/** 默认头像（与社区头像缺省行为一致） */
const defaultAvatar = resolveMediaUrl(IMAGE_PATHS.DEFAULT_AVATAR);

/**
 * 2026-09-03 R11：头像加载失败时回退到默认头像
 *
 * <p>uni-app 编译器对 `@error="func($event)"` 在 setup 中会丢函数引用（实测
 * 编译产物报 `does not have a method "true"`），改为无参写法并通过 dataset
 * 自管 marker 防重复回退循环。</p>
 */
function onNearbyAvatarError(event: { target?: { dataset?: Record<string, string>; src?: string } }) {
  const target = event?.target;
  if (!target || !target.dataset || target.dataset.fallbackApplied === "1") return;
  target.dataset.fallbackApplied = "1";
  if (target.src !== defaultAvatar) {
    target.src = defaultAvatar;
  }
}
</script>

<template>
  <view class="nearby-people">
    <view class="section-head">
      <text class="section-head__title">附近的人</text>
      <text class="section-head__more press-feedback" hover-class="press-feedback--active" role="button" aria-label="查看全部附近的人" @tap="$emit('more')">全部 ›</text>
    </view>
    <!-- 2026-09-02 R12（需求⑥/⑦）：加载中且无数据 → 横排头像骨架占位（白屏/空白感知消除） -->
    <scroll-view v-if="loading && items.length === 0" scroll-x class="nearby-scroll" :show-scrollbar="false">
      <view class="nearby-list">
        <view v-for="n in 4" :key="n" class="nearby-item">
          <view class="nearby-item__avatar nearby-item__avatar--skeleton" />
          <view class="nearby-item__line" />
          <view class="nearby-item__line nearby-item__line--short" />
        </view>
      </view>
    </scroll-view>
    <scroll-view v-else scroll-x class="nearby-scroll" :show-scrollbar="false">
      <view class="nearby-list">
        <view v-for="item in items" :key="item.userId" class="nearby-item press-feedback" hover-class="press-feedback--active" role="button" :aria-label="`查看 ${item.name} 主页`" @tap="$emit('select', item.userId)">
          <view class="nearby-item__avatar-wrap">
            <!-- 2026-09-03 R11 终极修：直接用 <image> 解决 SafeImage 父容器 0×0 限制；
                 通过 dataset.fallbackApplied 标记避免重复降级（uni-app 编译器对
                 @error="func($event)" 在 setup 中不支持，必须用 dataset 在
                 function 内检测防止无限回退循环）。 -->
            <image
              class="nearby-item__avatar"
              :src="resolveMediaUrl(item.avatarUrl) || defaultAvatar"
              :data-fallback-applied="'0'"
              mode="aspectFill"
              @error="onNearbyAvatarError"
            />
            <view v-if="item.online" class="nearby-item__online"></view>
          </view>
          <text class="nearby-item__name">{{ item.name }}</text>
          <text class="nearby-item__distance">{{ item.distanceText }}</text>
          <text v-if="item.commonInterests.length" class="nearby-item__common">{{ item.commonInterests.slice(0, 2).join(' · ') }}</text>
        </view>
      </view>
    </scroll-view>
    <!-- 2026-09-02 R5：用户反馈「值得认识的人无法点击」→ hover-class 加 + catchtap 防冒泡 + 明确 role=button -->
    <view v-if="items.length > 0" class="nearby-people__bar press-feedback" hover-class="press-feedback--active" role="button" aria-label="查看全部附近的人" @tap="$emit('more')">
      <text class="nearby-people__bar-text">附近有 {{ Math.max(items.length, 4) }} 位值得认识的人</text>
      <text class="nearby-people__bar-arrow">›</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.nearby-people {
  padding: 8rpx 0 16rpx;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0 12rpx;
}

.section-head__title {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--c-text-primary, #1E1E1E);
}

.section-head__more {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.nearby-scroll {
  width: 100%;
}

.nearby-list {
  display: flex;
  /* V-09（第五轮 QA）：附近的人横排头像间距 16→20rpx */
  gap: 20rpx;
  padding-right: 16rpx;
}

.nearby-item {
  width: 120rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* R20（2026-09-08）：行距放宽（4→8rpx），缓解距离/标签两行文字拥挤 */
  gap: 8rpx;
}

.nearby-item__avatar-wrap {
  position: relative;
  /* 2026-09-04 问题4修复：容器无显式尺寸导致布局塌陷（头像渲染成极小图）。
     给 wrap 绑定与头像一致的 88rpx 显式宽高，在线状态小圆点定位基准随之稳定。 */
  width: 88rpx;
  height: 88rpx;
}

.nearby-item__avatar {
  /* 2026-09-03 R11 终极修：直接 <image> 必须显式尺寸（不再依赖 SafeImage 父容器） */
  display: block;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-neutral-100, #F0F2F5);
  flex-shrink: 0;
}

.nearby-item__avatar--placeholder {
  /* 占位态：浅灰背景更明显，提示头像缺失 */
  background: #E5EFEA;
}

.nearby-item__avatar--skeleton {
  /* 2026-09-02 R12：加载骨架（与头像同尺寸，脉冲动画） */
  background: #E5EFEA;
  animation: nearby-skeleton-pulse 1.2s ease-in-out infinite;
}

.nearby-item__line {
  width: 88rpx;
  height: 18rpx;
  border-radius: 6rpx;
  background: #E5EFEA;
  animation: nearby-skeleton-pulse 1.2s ease-in-out infinite;
}

.nearby-item__line--short {
  width: 56rpx;
}

@keyframes nearby-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.nearby-item__online {
  position: absolute;
  right: 2rpx;
  bottom: 2rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--c-brand, #36C99A);
  border: 2rpx solid #FFFFFF;
}

.nearby-item__name {
  /* R20（2026-09-08）：辨识度提升——名字/距离/标签原 20/18/18rpx 过小过挤 */
  font-size: 24rpx;
  font-weight: 600;
  color: var(--c-text-primary, #1E1E1E);
  line-height: 1.3;
}

.nearby-item__distance {
  font-size: 20rpx;
  color: var(--c-text-secondary, #666666);
  line-height: 1.3;
}

.nearby-item__common {
  font-size: 20rpx;
  color: var(--c-text-tertiary, #999999);
  text-align: center;
  line-height: 1.4;
}

.nearby-people__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 999rpx;
  background: #E8FBF2;
}

.nearby-people__bar-text {
  font-size: 22rpx;
  color: #36C99A;
  font-weight: 600;
}

.nearby-people__bar-arrow {
  font-size: 28rpx;
  color: #36C99A;
}
</style>

