<script setup lang="ts">
import type { InterestCircleViewModel } from "../../view-models/home-dashboard";
import { IMAGE_PATHS } from "../../config/images";

/** 兴趣圈名称 -> 封面图路径映射（摄影大图，统一 CIRCLE_COVERS） */
const CIRCLE_COVER = {
  photo:     IMAGE_PATHS.CIRCLE_COVERS.PHOTO,
  travel:    IMAGE_PATHS.CIRCLE_COVERS.TRAVEL,
  music:     IMAGE_PATHS.CIRCLE_COVERS.MUSIC,
  food:      IMAGE_PATHS.CIRCLE_COVERS.FOOD,
  sports:    IMAGE_PATHS.CIRCLE_COVERS.SPORTS,
  reading:   IMAGE_PATHS.CIRCLE_COVERS.READING,
  game:      IMAGE_PATHS.CIRCLE_COVERS.GAME,
  pet:       IMAGE_PATHS.CIRCLE_COVERS.PET,
  study:     IMAGE_PATHS.CIRCLE_COVERS.STUDY,
  postgrad:  IMAGE_PATHS.CIRCLE_COVERS.POSTGRAD,
  astronomy: IMAGE_PATHS.CIRCLE_COVERS.ASTRONOMY,
} as const;

function circleCover(name: string): string {
  const n = name || "";
  if (n.includes("摄影")) return CIRCLE_COVER.photo;
  if (n.includes("旅行")) return CIRCLE_COVER.travel;
  if (n.includes("音乐")) return CIRCLE_COVER.music;
  if (n.includes("美食") || n.includes("食")) return CIRCLE_COVER.food;
  if (n.includes("运动") || n.includes("篮球") || n.includes("健身") || n.includes("体育")) return CIRCLE_COVER.sports;
  if (n.includes("阅读") || n.includes("读书")) return CIRCLE_COVER.reading;
  if (n.includes("游戏") || n.includes("桌游")) return CIRCLE_COVER.game;
  if (n.includes("宠物") || n.includes("萌宠")) return CIRCLE_COVER.pet;
  if (n.includes("学习") || n.includes("搭子")) return CIRCLE_COVER.study;
  if (n.includes("考研") || n.includes("深造") || n.includes("学业")) return CIRCLE_COVER.postgrad;
  if (n.includes("天文") || n.includes("星空")) return CIRCLE_COVER.astronomy;
  return IMAGE_PATHS.CIRCLE_COVERS.DEFAULT;
}

/** 格式化成员数量（万/千单位） */
function formatMemberCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

defineProps<{ items: InterestCircleViewModel[] }>();
defineEmits<{ (e: "more"): void; (e: "join", id: number): void; (e: "select", id: number): void }>();
</script>

<template>
  <view class="interest-recommend">
    <view class="section-head">
      <text class="section-head__title">兴趣推荐</text>
      <text class="section-head__more" @tap="$emit('more')">查看更多 &#8250;</text>
    </view>
    <scroll-view scroll-x class="interest-scroll" :show-scrollbar="false">
      <view class="interest-list">
        <view
          v-for="item in items"
          :key="item.id"
          class="interest-card"
          @tap="$emit('select', item.id)"
        >
          <!-- 封面图（顶部，固定高度，不加黑色浮层） -->
          <view class="interest-card__cover-wrap">
            <image
              class="interest-card__cover"
              :src="circleCover(item.name)"
              mode="aspectFill"
              alt=""
            />
          </view>
          <!-- 文案区：名称/人数在图下方（参考图：不上图覆盖） -->
          <view class="interest-card__body">
            <text class="interest-card__name">{{ item.name }}</text>
            <text class="interest-card__count">{{ formatMemberCount(item.memberCount) }} 人加入</text>
          </view>
          <view
            class="interest-card__join"
            :class="{ 'interest-card__join--joined': item.joined }"
            @tap.stop="$emit('join', item.id)"
          >
            {{ item.joined ? '已加入' : '加入' }}
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.interest-recommend {
  padding: 8rpx 32rpx 16rpx;
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

.interest-scroll {
  width: 100%;
}

.interest-list {
  display: flex;
  /* V-09（第五轮 QA）：横滑卡片间距 16→20rpx */
  gap: 20rpx;
  padding-right: 16rpx;
}

.interest-card {
  width: 216rpx;
  flex-shrink: 0;
  /* V-09：卡片圆角 16→20rpx，与全局卡片体系一致 */
  border-radius: 20rpx;
  background: #ffffff;
  border: 1rpx solid var(--c-line, #EEF2F0);
  overflow: hidden;
  box-sizing: border-box;
}

.interest-card__cover-wrap {
  position: relative;
  width: 100%;
  height: 216rpx;
  overflow: hidden;
  background: #EAF6F1;
}

.interest-card__cover {
  width: 100%;
  height: 100%;
  display: block;
}

.interest-card__body {
  padding: 14rpx 16rpx 6rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.interest-card__name {
  font-size: 26rpx;
  font-weight: 700;
  color: #1E1E1E;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.interest-card__count {
  font-size: 20rpx;
  color: #9AA39F;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.interest-card__join {
  margin: 10rpx 16rpx 14rpx;
  text-align: center;
  padding: 10rpx 0;
  border-radius: 999rpx;
  border: 2rpx solid var(--c-brand-dark, #36C99A);
  background: #ffffff;
  color: var(--c-brand-dark, #36C99A);
  font-size: 24rpx;
  font-weight: 700;
}

.interest-card__join--joined {
  background: var(--c-bg-brand, #E8FBF2);
  color: var(--c-brand, #36C99A);
  border-color: var(--c-brand-light, #D1F5E7);
}
</style>
