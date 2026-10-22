<script setup lang="ts">
import { computed } from "vue";
import { IMAGE_PATHS } from "../../../config/images";

const props = withDefaults(
  defineProps<{
    liked?: boolean;
    matched?: boolean;
    blocked?: boolean;
    loading?: boolean;
    /** 2026-09-05 R18：关注状态（点击切换 已关注/关注） */
    following?: boolean;
  }>(),
  { liked: false, matched: false, blocked: false, loading: false, following: false }
);

const emit = defineEmits<{
  (e: "like"): void;
  (e: "message"): void;
  /* MP-R1-OTHER-002 的「送心动卡」入口在 R2b-L06-D22 里按理想图移出底栏：
     理想图底栏只有 喜欢 / 打招呼 / 关注 三枚，入口改挂 PublicIdentity（WhisperComposeSheet 链路不变） */
  (e: "follow"): void;
}>();

const likeLabel = computed(() => {
  if (props.blocked) return "已屏蔽";
  if (props.liked) return "已喜欢";
  return "喜欢";
});

const followLabel = computed(() => (props.following ? "已关注" : "关注"));

/** MP-R1-REQ23-001：CTA 按状态机切换——互喜(matched)时主钮切「发消息」绿钮直达会话
 *  （需求口径：陌生=喜欢TA粉 / 互喜=发消息绿），原 matched prop 声明后从未消费 */
const helloLabel = computed(() => (props.matched ? "发消息" : "打招呼"));
</script>

<template>
  <view class="relationship-cta">
    <view class="relationship-cta__bar">
      <view
        class="relationship-cta__btn relationship-cta__btn--like"
        :class="{ 'relationship-cta__btn--disabled': blocked || loading }"
        hover-class="relationship-cta__btn--pressed"
        @tap="emit('like')"
      >
        <image class="relationship-cta__heart" :src="IMAGE_PATHS.ICONS_V2.HEART_PINK" mode="aspectFit" alt="" />
        <text class="relationship-cta__text relationship-cta__text--like">{{ likeLabel }}</text>
      </view>

      <view class="relationship-cta__btn relationship-cta__btn--hello" :class="{ 'relationship-cta__btn--matched': matched }" hover-class="relationship-cta__btn--pressed" @tap="emit('message')">
        <image class="relationship-cta__bubble" :src="IMAGE_PATHS.ICONS_EMOJI.COMMENT" mode="aspectFit" alt="" />
        <text class="relationship-cta__text">{{ helloLabel }}</text>
      </view>

      <view
        class="relationship-cta__btn relationship-cta__btn--follow"
        :class="{ 'relationship-cta__btn--following': following }"
        hover-class="relationship-cta__btn--pressed"
        @tap="emit('follow')"
      >
        <!-- R7-L10-D06（颜色 token P3 · 【R6 已批过，未落地】）：原来这枚星标是
             <image src="ICONS_EMOJI.STAR">（assets/svg-spec/03-icons/star.svg）。
             mp 的 <image> 载独立 SVG 时 CSS color 传不进去（同 R6/F1 对 33 枚 SVG 的结论），
             包内那份 SVG 的描边按 currentColor 解析成默认黑 ⇒ 帧上实测星标像素 (81,81,81)/(88,88,88) 深灰，
             而下方「关注」文字是品牌绿，同一枚钮两种色，且理想图（他人显示主页.png 底栏第三枚，
             理想 x≈820 实测 (33,184,127)）是绿星标。
             本车道不许改素材，故把描线星改成仓内既有范式「文字字形 + 令牌色」（同
             matching.vue 的 ‹ 、other.vue 顶栏的 ···）：☆ 与理想图同为空心五角描线星，
             color 直接吃 --c-brand，染色这一步不再依赖 <image>。 -->
        <text class="relationship-cta__star" aria-hidden="true">☆</text>
        <text class="relationship-cta__text relationship-cta__text--follow">{{ followLabel }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.relationship-cta {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.97);
  border-top: 1rpx solid #EEF1F5;
  box-shadow: 0 -8rpx 30rpx rgba(0, 0, 0, 0.05);
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom) + 20rpx);
}

.relationship-cta__bar {
  display: flex;
  gap: 16rpx;
}

.relationship-cta__btn {
  height: 92rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.relationship-cta__btn--pressed {
  opacity: 0.85;
}

.relationship-cta__btn--like {
  flex: 1;
  /* R2b-L06-D21：理想图「喜欢」是浅粉底（#FDE7EE 档）+ 粉字 + 粉心、无描边，
     整条只保留「打招呼」一枚实心强调。上一轮 R1-B20 反向改成了高饱和粉渐变实心 + 白字，
     与右侧「心动卡」的粉描边形成两处粉色强强调 —— 本轮按理想图回退为浅粉 tint。 */
  background: var(--c-tint-pink-50, #FCE4EC);
  box-shadow: none;
}

.relationship-cta__btn--hello {
  /* R2b-L06-D22：底栏回到理想图的 3 枚布局，主按钮「打招呼」权重最大 */
  flex: 1.15;
  background: var(--c-brand, #36C99A);
  box-shadow: 0 8rpx 20rpx rgba(54, 201, 154, 0.3);
}

/* MP-R1-REQ23-001：互喜态「发消息」绿主钮（与匹配成功页/匹配中心 CTA 状态机同口径） */
.relationship-cta__btn--matched {
  background: var(--c-brand, #36C99A);
  border-color: var(--c-brand, #36C99A);
}

.relationship-cta__btn--follow {
  flex: 1;
  background: #ffffff;
  border: 2rpx solid var(--c-line, #EEF2F0);
}

/* 2026-09-05 R18：已关注态（灰绿弱化，与白描边"关注"区分） */
.relationship-cta__btn--following {
  background: #E8FBF3;
  border-color: #A9E5CE;
}

.relationship-cta__btn--disabled {
  opacity: 0.55;
}

.relationship-cta__heart {
  width: 30rpx;
  height: 30rpx;
  color: var(--c-love, #FF6B81);
}

.relationship-cta__bubble {
  width: 28rpx;
  height: 28rpx;
  color: #ffffff;
}

.relationship-cta__star {
  /* R7-L10-D06：由 <image>（30rpx 见框）改为文字字形，尺寸改由字号锁定；
     品牌绿仍走 --c-brand 令牌，与下方 .relationship-cta__text--follow 同色同档。 */
  font-size: 32rpx;
  line-height: 1;
  color: var(--c-brand, #36C99A);
}

.relationship-cta__text {
  font-size: 28rpx;
  font-weight: 700;
  color: #FFFFFF;
}

/* R2b-L06-D21：浅粉底上的「喜欢」必须是粉字（原白字白心是为实心渐变底写的）。
   R11-L10-D04（可达性 P1）：--c-love #FF6B81 压 --c-tint-pink-50 #FCE4EC 实测 2.27:1，
   28rpx 正文级标签不达 4.5:1；与同页身份卡「喜欢」同值收深到 #B3264A（5.30:1），
   同一动作两处不再出现两种可读档。 */
.relationship-cta__text.relationship-cta__text--like {
  color: #B3264A;
}

/* R11-L10-D04：--c-brand #36C99A 压白底实测 2.10:1，同样不达 4.5:1；
   与身份卡「打招呼」（PublicIdentity.vue:284）同档收 --c-brand-800 #156B51（6.45:1），
   沿用本页已验证的深色系，不新增色值。 */
.relationship-cta__text.relationship-cta__text--follow {
  color: var(--c-brand-800, #156B51);
}
</style>
