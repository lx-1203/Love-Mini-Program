<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";
import type { RelationActivityViewModel } from "../../view-models/home-dashboard";
import SkeletonBlock from "../common/SkeletonBlock.vue";

withDefaults(defineProps<{ data: RelationActivityViewModel; loading?: boolean }>(), { loading: false });
// 2026-09-03：4 个 cell 各自可点击跳转到对应信息页（likes/whispers/visitors/matches）
defineEmits<{
  (e: "all"): void;
  (e: "liked-by"): void;     // 人喜欢了你
  (e: "whispers"): void;      // 条悄悄话
  (e: "visitors"): void;      // 人看过你
  (e: "matches"): void;       // 个新匹配
}>();
</script>

<template>
  <view class="relation-activity">
    <view class="relation-activity__head">
      <text class="relation-activity__title">关系动态</text>
      <text class="relation-activity__all" @tap="$emit('all')">全部 ›</text>
    </view>
    <!-- 2026-09-03 骨架屏：homeFeed 首拉期间占位（避免空数据跳变） -->
    <view v-if="loading" role="status" aria-live="polite">
      <SkeletonBlock variant="list" :rows="2" label="加载中" />
    </view>
    <template v-else>
    <view class="relation-activity__grid">
      <!-- 2026-09-02 R8 用户明确要求：不能仅靠颜色区分 →
           4 个 cell 改用吉祥物不同动作/姿态作主要区分（heart/shy/wave/cheer），颜色仅作辅助 -->
      <!-- 2026-09-04 问题6修复：4 个 cell 加 hover-class 自定义按下态（背景加深 + 轻微 scale），
           用户可感知按下；mp 端 hover-class 必须作为独立属性写在 class 之外 -->
      <view class="relation-cell" hover-class="relation-cell--active" @tap="$emit('liked-by')" role="button" :aria-label="`查看 ${data.likesReceived} 个喜欢我的人`">
        <view class="relation-cell__icon relation-cell__icon--pink">
          <!-- 2026-09-03 R11 终极修：pointer-events=none 让 tap 永远落到 cell view（避免 image 吃 hit-area 导致 4 cell 中部分不响应） -->
          <image class="relation-cell__icon-img" :src="resolveMediaUrl(IMAGE_PATHS.MASCOT.HEART)" mode="aspectFit" pointer-events="none" />
        </view>
        <text class="relation-cell__value">{{ data.likesReceived }}</text>
        <text class="relation-cell__label">人喜欢了你</text>
        <view v-if="(data.likesAvatars ?? []).length" class="relation-cell__avatars">
          <image v-for="(av, i) in (data.likesAvatars ?? []).slice(0, 3)" :key="i" class="relation-cell__avatar" :src="av" mode="aspectFill" pointer-events="none" />
        </view>
      </view>
      <view class="relation-cell" hover-class="relation-cell--active" @tap="$emit('whispers')" role="button" :aria-label="`查看 ${data.whispers} 条悄悄话`">
        <view class="relation-cell__icon relation-cell__icon--green">
          <!-- 悄悄话 → shy 害羞 -->
          <image class="relation-cell__icon-img" :src="resolveMediaUrl(IMAGE_PATHS.MASCOT.SHY)" mode="aspectFit" pointer-events="none" />
        </view>
        <text class="relation-cell__value">{{ data.whispers }}</text>
        <text class="relation-cell__label">条悄悄话</text>
        <view v-if="(data.whisperAvatars ?? []).length" class="relation-cell__avatars">
          <image v-for="(av, i) in (data.whisperAvatars ?? []).slice(0, 3)" :key="i" class="relation-cell__avatar" :src="av" mode="aspectFill" pointer-events="none" />
        </view>
      </view>
      <view class="relation-cell" hover-class="relation-cell--active" @tap="$emit('visitors')" role="button" :aria-label="`查看 ${data.visitors} 个访客`">
        <view class="relation-cell__icon relation-cell__icon--purple">
          <!-- 看过你 → wave 挥手 -->
          <image class="relation-cell__icon-img" :src="resolveMediaUrl(IMAGE_PATHS.MASCOT.WAVE)" mode="aspectFit" pointer-events="none" />
        </view>
        <text class="relation-cell__value">{{ data.visitors }}</text>
        <text class="relation-cell__label">人看过你</text>
        <view v-if="(data.visitorAvatars ?? []).length" class="relation-cell__avatars">
          <image v-for="(av, i) in (data.visitorAvatars ?? []).slice(0, 3)" :key="i" class="relation-cell__avatar" :src="av" mode="aspectFill" pointer-events="none" />
        </view>
      </view>
      <view class="relation-cell" hover-class="relation-cell--active" @tap="$emit('matches')" role="button" :aria-label="`查看 ${data.newMatches} 个新匹配`">
        <view class="relation-cell__icon relation-cell__icon--orange">
          <!-- 新匹配 → cheer 欢呼 -->
          <image class="relation-cell__icon-img" :src="resolveMediaUrl(IMAGE_PATHS.MASCOT.CHEER)" mode="aspectFit" pointer-events="none" />
        </view>
        <text class="relation-cell__value">{{ data.newMatches }}</text>
        <text class="relation-cell__label">个新匹配</text>
        <view v-if="(data.matchAvatars ?? []).length" class="relation-cell__avatars">
          <image v-for="(av, i) in (data.matchAvatars ?? []).slice(0, 3)" :key="i" class="relation-cell__avatar" :src="av" mode="aspectFill" pointer-events="none" />
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.relation-activity {
  margin: 0 32rpx 16rpx;
}

.relation-activity__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0 16rpx;
}

.relation-activity__title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333A37;
}

.relation-activity__all {
  font-size: 28rpx;
  color: #9AA39F;
}

.relation-activity__grid {
  display: flex;
  gap: 12rpx;
}

.relation-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 6rpx;
  border-radius: 24rpx;
  background: #EEF7F2;
}

/* 2026-09-04 问题6修复：cell 按下态（hover-class 目标样式）——背景加深 + 轻微缩小，
   让"4 格仅第一个可点"的感知问题先从可感知反馈上消除（mp 端 hover-class 独立属性生效） */
.relation-cell--active {
  background: #DFF3EA;
  transform: scale(0.97);
}

.relation-cell__icon {
  /* 2026-09-02 R6/R7：用户两次反馈"过小看不清"→ 104 → 120 */
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 2026-09-02 R9 用户要求"背景统一"：4 cell 用同一种背景色（动作区分保留，背景不再 4 色） */
.relation-cell__icon--pink,
.relation-cell__icon--green,
.relation-cell__icon--purple,
.relation-cell__icon--orange {
  background: #E8FBF2;
}

.relation-cell__icon-text {
  font-size: 26rpx;
  font-weight: 800;
}

.relation-cell__icon-img {
  /* 2026-09-03 R11 终极修：
     1) 固定 96rpx（与 120 圆圈搭配，所有图标视觉比例统一）；
     2) 同步移除 crisp-edges（非抗锯齿加重锯齿），保留 -webkit-optimize-contrast；
     3) image 元素 pointer-events 默认无 → 已在上层补 pointer-events="none" 让 cell view 永远拿到 tap。
     注：mp-weixin <image> native 渲染不响应 CSS object-fit，由 mode="aspectFit" 控制等比居中。
     2026-09-04 问题2修复：吉祥物重制为 240x240 统一规格后，图标微调至 100rpx
     （与 120rpx 圆圈比例约 83%，4 张主体视觉大小完全一致）。 */
  display: block;
  width: 100rpx;
  height: 100rpx;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: auto;
}

.relation-cell__icon--pink .relation-cell__icon-text { color: #FF6B81; }
.relation-cell__icon--green .relation-cell__icon-text { color: #36C99A; }
.relation-cell__icon--purple .relation-cell__icon-text { color: #A29BFE; }
.relation-cell__icon--orange .relation-cell__icon-text { color: #FF9F43; }

.relation-cell__avatars {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 4rpx;
}

.relation-cell__avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ffffff;
  background: #EEF2F0;
  flex-shrink: 0;
}

.relation-cell__value {
  /* R4-batch4 像素级对齐：参考图数值更突出（30rpx → 36rpx） */
  font-size: 36rpx;
  font-weight: 800;
  color: #222222;
  line-height: 1.1;
}

.relation-cell__label {
  /* R4-batch4 像素级对齐：参考图标签字号（18rpx → 22rpx），更易读 */
  font-size: 22rpx;
  color: #888E8B;
  text-align: center;
  line-height: 1.3;
}
</style>
