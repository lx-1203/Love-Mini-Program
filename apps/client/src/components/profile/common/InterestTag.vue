<script setup lang="ts">
import { computed } from "vue";

/**
 * 胶囊配色档（parked.md「兴趣标签的理想配色」/ R2b-L06-D16 同节的配色残留）。
 * 依据 = 素材/理想效果图/他人显示主页.png「兴趣标签」行的逐像素取色：
 *   旅行/摄影/音乐/电影 → #E8F8F1 薄荷（= 本组件既有默认档 brand）
 *   美食               → #FEF2E5 橙奶，文字最深像素 #673912、字形均值 #7C5129
 *   猫咪               → #F8F3EC 米色，文字 #33302E（与默认正文色同档，无需另给色）
 */
type InterestTint = "brand" | "warm" | "cream";

const props = withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
    /** 显式指定配色档；不传时按 label 自动取档（见 tintByLabel） */
    tint?: InterestTint | "";
  }>(),
  { active: false, tint: "" },
);

const emit = defineEmits<{ (e: "tap", label: string): void }>();

/**
 * 词表沿用仓内既有标签词汇，不新增语义：
 *   warm  ← 美食/美食家（config/profile-tags.ts 的 cooking / foodie，en: Food / Foodie；
 *            utils/tag-label.ts 别名 food / foods）
 *   cream ← 猫咪/宠物（PublicCommon.vue TAG_ICON_KEYS 已有的 cat / pets / pet_lover 同义组，
 *            en: Pet lover）
 * 其余（旅行/摄影/音乐/电影/阅读/运动/游戏/绘画/舞蹈…）留在 brand 薄荷档，与理想图一致。
 *
 * 为什么在组件内按 label 兜一档：唯一消费方 PublicInterest.vue 只传 :label（同批改调用方
 * 属另一车道），只加 prop 而无人传＝真机上不生效。显式 tint 优先级更高，调用方接上后
 * 把 label 取档让位给它即可。
 */
const WARM_LABELS = new Set(["美食", "美食家", "cooking", "food", "foods", "foodie", "food lover"]);
const CREAM_LABELS = new Set(["猫咪", "猫", "宠物", "萌宠", "宠物控", "cat", "cats", "pet", "pets", "pet_lover", "pet lover"]);

function tintByLabel(label: string): InterestTint {
  const key = (label ?? "").trim().toLowerCase();
  if (WARM_LABELS.has(key)) return "warm";
  if (CREAM_LABELS.has(key)) return "cream";
  return "brand";
}

const resolvedTint = computed<InterestTint>(() => props.tint || tintByLabel(props.label));
</script>

<template>
  <view
    class="interest-tag"
    :class="[`interest-tag--${resolvedTint}`, { 'interest-tag--active': active }]"
    hover-class="interest-tag--pressed"
    @tap="emit('tap', label)"
  >
    <text class="interest-tag__text">{{ label }}</text>
  </view>
</template>

<style scoped lang="scss">
.interest-tag {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: #E8FBF3;
  border: 1rpx solid rgba(32, 201, 151, 0.12);
}

/* ---------- 配色档（理想图取色，全部走既有 token，不新增色值） ----------
   brand 档无独立规则：即上面的既有默认样式（实测理想图 #E8F8F1 同档），
   零像素变化，避免把已定稿的薄荷胶囊顺手改色。 */

/* warm（美食枚）：实测底 #FEF2E5 ↔ --c-tint-orange-50 #FFF3E0（同 Material orange 50 档，
   深色档在 tokens.scss:291 自动落 #2A2117）。文字实测字形均值 #7C5129 ↔
   --c-state-ongoing-text #8A5A00：选它而不是更贴近的 --c-text-warning-dark #92400E，
   是因为后者在 tokens.scss 深色块里没有覆盖，深底上会变成「深棕压深棕」不可读，
   而前者深色档自动翻成 #FFD479（tokens.scss:302）。 */
.interest-tag--warm {
  background: var(--c-tint-orange-50, #FFF3E0);
  border-color: var(--c-warning-border-tint, rgba(245, 158, 11, 0.2));
}

.interest-tag--warm .interest-tag__text {
  color: var(--c-state-ongoing-text, #8A5A00);
}

/* cream（猫咪枚）：实测底 #F8F3EC ↔ --c-tint-cream-50 #FFF8E7（深色档 #2B241A）。
   文字实测 #33302E 与既有正文色同档，故不覆写 .interest-tag__text，深色档随正文翻转。 */
.interest-tag--cream {
  background: var(--c-tint-cream-50, #FFF8E7);
  border-color: var(--c-warning-border-tint, rgba(245, 158, 11, 0.2));
}

/* 以下必须排在配色档之后：与 --warm/--cream 同权重，靠源码顺序压过它们 */
.interest-tag--active {
  background: linear-gradient(135deg, #6BE3B8 0%, #36C99A 100%);
}

.interest-tag--active .interest-tag__text {
  color: #ffffff;
}

.interest-tag--pressed {
  opacity: 0.8;
}

.interest-tag__text {
  font-size: 24rpx;
  color: #333333;
  font-weight: 600;
}
</style>
