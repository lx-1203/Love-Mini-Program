<script setup lang="ts">
import type { InterestCircleViewModel } from "../../view-models/home-dashboard";
import { circleCoverFor } from "../../config/circle-covers";
import { resolveMediaUrl, isUploadedMediaUrl } from "../../utils/media";
import SkeletonBlock from "../common/SkeletonBlock.vue";

/** 圈名 → 封面统一走 config/circle-covers 单一映射（2026-09-12 收编本页副本，
 *  与圈子列表页/圈子主页共用，杜绝图文不一致） */
const circleCover = circleCoverFor;

/** 格式化成员数量（万/千单位） */
function formatMemberCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
  // R21：对齐理想图（1.2w / 8,932）——千位以下展示精确人数（千分位），不再用英文 k 单位
  if (count >= 1000) return count.toLocaleString("en-US");
  return String(count);
}

/**
 * 字形/图标资源命名空间——一律不得当封面用。
 *
 * 判定不能只看「是否以 / 开头」：`/static/...` 里既混着字形小图标
 * （`/static/assets/icons/common/camera.svg`、`/static/assets/profile/svg/v2/interest/sport.svg`），
 * 也混着真封面（`/static/assets/images/covers/circle-cover-*.jpg`），两者都以 `/` 开头。
 * 因此以「图标命名空间 + .svg 字形」为否定条件，其余包内路径放行。
 */
const GLYPH_ASSET_RE = /^\/static\/assets\/(icons|svg-spec)\//i;
const SVG_GLYPH_RE = /\.svg([?#]|$)/i;

/** 该 icon 值是否是一张可直用的封面图（而非字形/emoji/空值） */
function isUsableCover(p: string): boolean {
  if (!p) return false;
  // 后端上传图 / 媒体鉴权代理：真图，优先级高于任何按名称的映射兜底
  if (p.startsWith("/uploads/") || p.indexOf("/api/v1/media/") >= 0) return true;
  // 包内资源：字形图标命名空间与 .svg 一律排除，其余（images/covers/*.jpg|png）放行
  if (p.startsWith("/static/")) return !GLYPH_ASSET_RE.test(p) && !SVG_GLYPH_RE.test(p);
  // 服务器绝对 URL；复用 media.ts 单一判定，排除 http://tmp/ · http://usr/ · wxfile:// 本地临时路径
  if (isUploadedMediaUrl(p) || p.startsWith("data:image/")) return true;
  // real 后端 icon 常为 emoji（📷）→ 交给圈名映射，避免直传 <image> 破图
  return false;
}

/**
 * R20（2026-09-08）：封面单一来源收敛。
 * real 后端 icon 字段是 emoji（如 📷），此前被当图片 URL 直传 <image> 导致破图空缺；
 * mock fixtures 的 icon 是 svg 路径。
 *
 * MP-R2VIS-PAGES-HOME-INDEX-002 / V1-22（2026-09-24 Wave-2 修复）：
 * 原实现 `raw.startsWith("/") || raw.startsWith("http")` 无条件短路，而 mock 首页圈子的
 * icon 恰好就是 `/static/assets/icons/common/{camera,travel,music,food}.svg`
 * （services/mocks/fixtures.ts:1149-1152）→ **circleCover(name) 永不执行**，
 * 已落盘的 static/assets/images/covers/circle-cover-*.jpg 在首页零命中，
 * 渲染成灰描边相机 / 实心黑音符 / 空白三套互斥图标。
 * 现改为「只有真封面资源才直用，字形一律回退圈名映射」，短路维度从路径前缀换成资源类型。
 */
function coverSrc(icon: string | null | undefined, name: string): string {
  const raw = (icon || "").trim();
  if (isUsableCover(raw)) return raw;
  return circleCover(name);
}

withDefaults(defineProps<{ items: InterestCircleViewModel[]; loading?: boolean }>(), { loading: false });
defineEmits<{ (e: "more"): void; (e: "join", id: number): void; (e: "select", id: number): void }>();
</script>

<template>
  <view class="interest-recommend">
    <view class="section-head">
      <text class="section-head__title">兴趣推荐</text>
      <text class="section-head__more" @tap="$emit('more')">查看更多 &#8250;</text>
    </view>
    <!-- 2026-09-03 骨架屏：homeFeed 首拉期间占位 -->
    <view v-if="loading" role="status" aria-live="polite">
      <SkeletonBlock variant="list" :rows="2" label="加载中" />
    </view>
    <scroll-view v-else scroll-x class="interest-scroll" :show-scrollbar="false">
      <view class="interest-list">
        <view
          v-for="item in items"
          :key="item.id"
          class="interest-card"
          @tap="$emit('select', item.id)"
        >
          <!-- 封面图（顶部，固定高度，不加黑色浮层）
               R20（2026-09-08）：icon 为 emoji 时回退本地封面映射（修复「兴趣推荐无图空缺」） -->
          <view class="interest-card__cover-wrap">
            <image
              class="interest-card__cover"
              :src="resolveMediaUrl(coverSrc(item.icon, item.name))"
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
  /* 2026-09-04 问题3修复：mp-weixin <image> 对 position:absolute + 四边约束 +
     width/height:100% 多重约束的尺寸计算异常（部分场景 fallback 原始尺寸 → 错位）。
     去掉 absolute 与四边约束，改为与容器（216rpx）一致的显式宽高 + display:block，
     mp 分支 mode="aspectFill" 保持不变，H5 分支不受影响。 */
  display: block;
  width: 216rpx;
  height: 216rpx;
  /* 移除 crisp-edges（强制非抗锯齿反而加重锯齿），保留高对比优化 */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: auto;
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
