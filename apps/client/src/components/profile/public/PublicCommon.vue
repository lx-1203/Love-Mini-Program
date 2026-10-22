<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../../config/images";
// R2b-L06-D16/D20：标签 value → 中文展示文案的唯一映射源（与兴趣标签同一口径）
import { tagLabelFor } from "../../../utils/tag-label";

const props = withDefaults(defineProps<{ commonInterests: string[] }>(), {
  commonInterests: () => [],
});

const { t } = useI18n();

/**
 * R2b-L06-D20（需新建）：理想图（他人显示主页.png「我们有 3 个共同点」）是
 * 「圆形图标 + 粗体主标题 + 灰色副标题」的 3 列卡片，而原实现是 InterestTag 胶囊横向滚动流
 * （2026-09-06 标签化改版把图标方案改掉了），与理想图不是同一个组件，即便有数据也对不上。
 * 这里按理想图重建卡片结构。
 *
 * 数据口径：契约仍是 relation.commonInterests: string[]（后端 UserProfileDTO.Relation 同名字段）。
 * 条目两种形态：
 *   1) "旅行"            —— 后端 buildCommonInterests 的兴趣交集 / 同校·同城·同龄
 *   2) "旅行/去过12个国家" —— api/profile.ts deriveCommonInterests 的「标签/副标题」约定
 * 斜杠后段就是理想图的副标题位。**后端没有结构化的 commonPoints（title/subtitle/icon）字段**，
 * 所以副标题只在数据真的带 "/" 时才渲染，未知条目不编造副标题。
 */
interface CommonPoint {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
}

/** 后端 buildCommonInterests 产出的关系型共同点：不套「都喜欢」前缀 */
const RELATION_POINTS = new Set(["同校", "同城", "同龄"]);

/** 共同点 → 图标（全部取 config/images.ts 已登记、且本地 static 实存的 lucide 图标） */
const TAG_ICON_KEYS: Array<{ keys: string[]; icon: string }> = [
  { keys: ["旅行", "travel"], icon: IMAGE_PATHS.ICONS_EMOJI.PLANE },
  { keys: ["音乐", "music"], icon: IMAGE_PATHS.ICONS_EMOJI.MUSIC },
  { keys: ["电影", "movie", "movies", "film"], icon: IMAGE_PATHS.ICONS_EMOJI.CLAPPER },
  { keys: ["美食", "烹饪", "cooking", "food", "foodie"], icon: IMAGE_PATHS.ICONS_EMOJI.FOOD },
  { keys: ["阅读", "读书", "reading", "book"], icon: IMAGE_PATHS.ICONS_EMOJI.BOOK },
  { keys: ["摄影", "photography"], icon: IMAGE_PATHS.ICONS_EMOJI.CAMERA_ICON },
  { keys: ["运动", "健身", "跑步", "夜跑", "sports", "fitness", "running", "jogging"], icon: IMAGE_PATHS.ICONS_EMOJI.RUN },
  { keys: ["游戏", "gaming", "games"], icon: IMAGE_PATHS.ICONS_EMOJI.GAMEPAD },
  { keys: ["猫咪", "猫", "宠物", "萌宠", "cat", "pets", "pet_lover"], icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_CAT },
  { keys: ["舞蹈", "dance"], icon: IMAGE_PATHS.ICONS_EMOJI.MUSIC },
];

function iconFor(label: string): string {
  const lower = label.toLowerCase();
  for (const group of TAG_ICON_KEYS) {
    if (group.keys.some((k) => k === label || k.toLowerCase() === lower)) return group.icon;
  }
  return IMAGE_PATHS.ICONS_EMOJI.SPARKLES;
}

const points = computed<CommonPoint[]>(() =>
  props.commonInterests
    .map((raw, index) => {
      const [tagPart, subtitlePart] = String(raw ?? "").split("/").map((s) => s.trim());
      if (!tagPart) return null;
      const label = tagLabelFor(tagPart, t);
      return {
        key: `${label}-${index}`,
        title: RELATION_POINTS.has(label) ? label : `都喜欢${label}`,
        subtitle: subtitlePart || "",
        icon: iconFor(label),
      } satisfies CommonPoint;
    })
    .filter((p): p is CommonPoint => p !== null),
);

const count = computed(() => points.value.length);
</script>

<template>
  <view class="public-common">
    <view class="public-common__head">
      <text v-if="count" class="public-common__title">
        我们有 <text class="public-common__num">{{ count }}</text> 个共同点
      </text>
      <text v-else class="public-common__title">我们还没有共同点</text>
    </view>

    <!-- 理想图：3 张等宽卡片（图标圆 + 主标题 + 副标题） -->
    <view v-if="count" class="public-common__grid">
      <view v-for="point in points" :key="point.key" class="public-common__card">
        <view class="public-common__icon-box">
          <image class="public-common__icon" :src="point.icon" mode="aspectFit" :alt="point.title" />
        </view>
        <view class="public-common__text">
          <text class="public-common__card-title">{{ point.title }}</text>
          <text v-if="point.subtitle" class="public-common__card-sub">{{ point.subtitle }}</text>
        </view>
      </view>
    </view>

    <!-- R2b-L06-D18/D20：无共同点时保留标题 + 空态行，不再 v-if 隐藏整节 -->
    <text v-else class="public-common__empty">还没有匹配到的共同点，先打个招呼聊聊看</text>
  </view>
</template>

<style scoped lang="scss">
.public-common {
  margin: 24rpx 24rpx 0;
  padding: 28rpx 32rpx;
  border-radius: 40rpx;
  background: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.public-common__head {
  margin-bottom: 18rpx;
}

.public-common__title {
  font-size: 30rpx;
  font-weight: 700;
  color: #333A37;
}

.public-common__num {
  color: #FF6B81;
}

/* 3 列等宽（mp-weixin 用 flex + calc，不用 grid 以免低版本基础库掉列） */
.public-common__grid {
  display: flex;
  flex-wrap: wrap;
}

.public-common__card {
  display: flex;
  align-items: center;
  gap: 12rpx;
  width: calc(100% / 3);
  min-width: 0;
  padding: 8rpx 8rpx 8rpx 0;
  box-sizing: border-box;
}

.public-common__icon-box {
  /* 理想图圆片折算约 46~52rpx，取 56rpx（再大就把两行文字挤成省略号） */
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--c-tint-gray-50, #F3F4F6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.public-common__icon {
  width: 28rpx;
  height: 28rpx;
}

.public-common__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.public-common__card-title {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-common__card-sub {
  margin-top: 4rpx;
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary, #6B7571);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-common__empty {
  font-size: 26rpx;
  /* R11-L10-D05（可达性 P1）：--c-text-quaternary #9AA39F 压白卡只有 2.59:1，
     既低于正文 4.5:1 也低于 3:1 非文字底线。改与本页卡内副标题同档
     --c-text-tertiary #6B7571（白底 4.76:1），与 PublicIdentity「资料暂未完善」上一轮同一条改法。 */
  color: var(--c-text-tertiary, #6B7571);
}
</style>
