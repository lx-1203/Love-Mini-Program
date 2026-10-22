<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import SwipeContainer from "../common/swipe/SwipeContainer.vue";
import SafeImage from "../common/SafeImage.vue";
import MatchInfo from "./MatchInfo.vue";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";
import type { MatchCardUser } from "../../types/match";

const props = withDefaults(
  defineProps<{
    user: MatchCardUser;
    disabled?: boolean;
  }>(),
  { disabled: false }
);

const emit = defineEmits<{
  /* MP-R1-PAGES-DISCOVER-INDEX-005：对外点击事件由 "tap" 更名 "card-tap"，
     与原生 tap 冒泡脱钩，防止 mp-weixin 端单次点击双通道重复触发 */
  (e: "card-tap"): void;
  (e: "swipe-left"): void;
  (e: "swipe-right"): void;
}>();

const { t } = useI18n();

/* 2026-09-12：无照片用户的卡片兜底从默认头像升级为匹配卡主视觉
   （match-card-hero，含底部文字预留层；有照片用户不受影响） */
const photo = computed(() => props.user.photo || props.user.avatar || IMAGE_PATHS.MATCH_CARD.HERO);

/* MP-R3AUDIT-DISCOVER-MATCHCARD-BLANK-001（2026-10-16）：主视觉兜底底层。
   原图走 SafeImage 时，http 源会被本地化成 downloadFile（SafeImage.vue:136-213）；
   该下载失败时只翻回 localizingHttp 标记，displaySrc 永久停在空串，而 onError 又被
   同一标记抑制 ⇒ 既不渲染原图、也永不切 fallback，卡面只剩 .match-card 占位底色
   （巡检帧 hero 区实测 mean 242.1 / sd 3.71 ≈ #EEF7F2，与兜底素材同区 mean 202.1 / sd 42.7 不符）。
   本层直出包内 HERO：resolveMediaUrl 对 app-assets http 源恒返回 /static/{rel}
   （utils/media.ts 的 http+APP_ASSET_PREFIX 分支），mock / real 两档都是包内路径，
   不经过 downloadFile。原图加载成功时被不透明照片完全覆盖，健康路径零视觉变化。 */
const heroBase = computed(() => resolveMediaUrl(IMAGE_PATHS.MATCH_CARD.HERO));

const onlineText = computed(() => {
  if (props.user.onlineStatus === "online" || props.user.activeStatusText === "online" || props.user.activeStatusText === "just_now") return t("matchV1.online");
  return "";
});

const distanceText = computed(() => {
  const raw = props.user.distanceText;
  if (raw && raw.trim().length > 0) {
    const value = raw.trim();
    // 纯数字（如 "1.2"）：自动补 km 单位 → "1.2km"
    if (/^\d+(\.\d+)?$/.test(value)) return `${value}km`;
    // 已带单位（"km" / "米"）或 "同校" 等非数值文案：原样保留
    return value;
  }
  if (props.user.isSameSchool) return t("matchV1.sameSchool");
  /* R2b-L01-D02（文案 P1，上一轮修得不对）：理想图《寻觅匹配卡片页面》左上为距离数值胶囊「5km」，
     「附近」一词只属于顶部分段（推荐/附近）。上一轮 R1-B10 用 t("discover.nearby") 兜底把语义换成了
     范围标签，属同轴未对齐。MatchCardUser 无独立数值 distance 字段（types/match.ts 仅有 distanceText），
     故距离缺失时返回空串隐藏胶囊（模板 v-if="distanceText" 已保证不占位），不再回填「附近」。 */
  return "";
});

const isOnline = computed(() => props.user.onlineStatus === "online" || props.user.activeStatusText === "online" || props.user.activeStatusText === "just_now");

/* R11-L01-D15（可达性 P1）：推荐接口不下发 distanceText（MatchCardUser 只有这一列），
   原实现缺数据即整块隐藏左上胶囊 ⇒ 「离我多远」这项判据凭空消失、页头也没有替代出口。
   后端补列之前，先在原位落一枚「距离未知」占位胶囊（discover.distanceUnknown 为既有键），
   不编造公里数；有真值时文案与样式逐像素不变。 */
const hasDistance = computed(() => distanceText.value.length > 0);
const distanceDisplay = computed(() => distanceText.value || t("discover.distanceUnknown"));

</script>

<template>
  <SwipeContainer
    class="match-card-swipe"
    :disabled="disabled"
    @card-tap="emit('card-tap')"
    @swipe-left="emit('swipe-left')"
    @swipe-right="emit('swipe-right')"
  >
    <view class="match-card">
      <image
        class="match-card__hero"
        :src="heroBase"
        mode="aspectFill"
        alt=""
      />

      <slot name="photo">
        <SafeImage
          class="match-card__photo"
          :src="photo"
          :fallback="IMAGE_PATHS.MATCH_CARD.HERO"
          mode="aspectFill"
          root-class="match-card__photo-root"
          custom-class="match-card__photo-img"
          :lazy-load="false"
          alt=""
        />
      </slot>

      <view class="match-card__overlay" />

      <!-- 距离标签：左上角粉色胶囊 + 白字；无真值时落「距离未知」占位（R11-L01-D15） -->
      <view class="match-card__distance" :class="{ 'match-card__distance--unknown': !hasDistance }">
        <text class="match-card__distance-text">{{ distanceDisplay }}</text>
      </view>

      <!-- 在线状态：右上角绿色胶囊 + 白字 -->
      <slot name="online-badge">
        <view v-if="onlineText" class="match-card__online">
          <text class="match-card__online-dot" :class="{ 'match-card__online-dot--away': !isOnline }" />
          <text class="match-card__online-text">{{ onlineText }}</text>
        </view>
      </slot>

      <!-- 匹配度徽章：右下角实心粉圆（R21：mp-weixin 对内联 conic-gradient 支持不稳，
           曾致样式串被当文本渲染；理想图本就是实心圆环徽章，percent+label 全部收进圆内） -->
      <slot name="match-score">
        <view class="match-card__score">
          <view class="match-card__score-ring">
            <view class="match-card__score-ring-inner">
              <text class="match-card__score-value">{{ user.matchScore }}%</text>
              <text class="match-card__score-label">{{ t('matchV1.matchScore') }}</text>
            </view>
          </view>
        </view>
      </slot>

      <slot name="info">
        <view class="match-card__info">
          <MatchInfo :user="user" />
        </view>
      </slot>

      <slot name="extra" />
    </view>
  </SwipeContainer>
</template>

<style scoped lang="scss">
.match-card-swipe {
  width: 100%;
  height: 100%;
}

.match-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 48rpx;
  overflow: hidden;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：图未就位时的卡底占位色，取最接近的页面底 token
     --c-bg-page=#EEF7F2（原裸写 #eef3f1，G 通道相差 4） */
  background: var(--c-bg-page, #EEF7F2);
  box-shadow: 0 16rpx 40rpx rgba(26, 55, 48, 0.16);
}

.match-card__hero {
  /* 兜底主视觉底层：与 .match-card__photo-root 同几何，DOM 在前 ⇒ 永远在照片之下 */
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.match-card__photo-root {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.match-card__photo-img {
  width: 100%;
  height: 100%;
  display: block;
}

.match-card__overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 62%;
  background: linear-gradient(
    180deg,
    rgba(13, 19, 19, 0) 0%,
    rgba(13, 19, 19, 0.25) 42%,
    rgba(10, 14, 14, 0.7) 100%
  );
  pointer-events: none;
}

.match-card__distance {
  position: absolute;
  top: 28rpx;
  left: 28rpx;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  /* 对齐理想图《寻觅匹配卡片页面》：距离胶囊为浅白底 + 粉字（原为粉底白字，配色反转）
     MP-R1-PAGES-DISCOVER-INDEX-011：白底/阴影走等值 token（--c-overlay-bg-solid=rgba(255,255,255,.9)
     与原 .92 同档，--c-black-shadow-lg=rgba(0,0,0,.12) 等值） */
  background: var(--c-overlay-bg-solid, rgba(255, 255, 255, 0.9));
  box-shadow: 0 6rpx 16rpx var(--c-black-shadow-lg, rgba(0, 0, 0, 0.12));
  /* 距离文字不换行、不截断，保证胶囊完整展示 */
  white-space: nowrap;
}

.match-card__distance-text {
  font-size: 22rpx;
  font-weight: 700;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：喜欢=粉底色统一走 --c-love（等值 #FF6B81），
     原工作树把 var(--c-neutral-0) 改成裸 #FF6B81 属新增裸写，此处收口 */
  color: var(--c-love, #FF6B81);
}

/* R11-L01-D15：未知态改中性字色（--c-text-secondary 压 90% 白胶囊最坏合成 ≈#E6E6E6
   实算 6.45:1 ≥4.5:1），不与有真值的粉字混同；胶囊位置/尺寸不变 */
.match-card__distance--unknown .match-card__distance-text {
  color: var(--c-text-secondary, #4A524E);
}

.match-card__online {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  /* 对齐理想图：在线胶囊为白底 + 绿点 + 绿字（原为绿底白字，配色反转）
     MP-R1-PAGES-DISCOVER-INDEX-011：与距离胶囊同源走等值 token */
  background: var(--c-overlay-bg-solid, rgba(255, 255, 255, 0.9));
  box-shadow: 0 6rpx 16rpx var(--c-black-shadow-lg, rgba(0, 0, 0, 0.12));
}

.match-card__online-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--c-brand, #36C99A);
}

.match-card__online-dot--away {
  /* MP-R1-PAGES-DISCOVER-INDEX-011：离开态淡绿点原为 rgba(54,201,154,.55)（落在白胶囊上合成
     ≈#90E1C8），等档 token 为 --c-brand-200=#A3EBCF */
  background: var(--c-brand-200, #A3EBCF);
}

.match-card__online-text {
  font-size: 22rpx;
  font-weight: 700;
  /* R11-L01-D14（颜色token P1）：--c-brand #36C99A 压 90% 白胶囊实测 2.11:1，
     卡片唯一的在线状态读不出来。按 §2 实测档取 --c-brand-800（#156B51，白底 6.45:1；
     卡上建议的 brand-700 只有 4.14:1 仍不达标）。绿点保留 --c-brand 作氛围色。 */
  color: var(--c-brand-800, #156B51);
}

/* 匹配度徽章：右下角实心粉圆（R21：conic-gradient 在 mp-weixin 内联样式不稳，弃用） */
.match-card__score {
  position: absolute;
  right: 28rpx;
  bottom: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.match-card__score-ring {
  position: relative;
  /* R3：128→160rpx，label 18→22rpx —— 原尺寸下「匹配度」糊化不可读（judged 截图证据） */
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：等值渐变 token 写法保持，
     R8-L01-D07（颜色族错配 P1）：档口由 --c-gradient-romance(#FF6B81→#FF8DA1) 换成
     --c-gradient-brand(#36C99A→#55D5A7, design-variables.scss:171) —— 匹配度属「成功/在线」语义绿系，
     与 XunmiMatchRing.vue:44 的 conic 绿环同两档，romance 粉只留给「喜欢」指示。 */
  background: var(--c-gradient-brand, linear-gradient(135deg, #36C99A 0%, #55D5A7 100%));
  /* R8-L01-D07：投影同步换绿系，消掉 rgba(255,90,145,.3) 这笔粉投影字面量
     —— 直接取既有令牌 --s-brand（= $shadow-brand, design-variables.scss:508），不再需要新增 token。 */
  box-shadow: var(--s-brand, 0 8rpx 32rpx rgba(54, 201, 154, 0.25));
}

.match-card__score-ring-inner {
  position: absolute;
  /* R3：内圈 104→132rpx（文字实际容器），value/label 同步放大后「匹配度」不再糊化 */
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
  /* R8-L01-D07 连带项：绿环中心的底由黑色 scrim 换成白罩档 --c-overlay-bg-solid（同 TodayRecommendationCard.vue:244 口径）。
     原因：换绿后若沿用 --c-black-shadow-lg(rgba(0,0,0,.12))，中心实测 #2FB188，
     白字只有 2.71:1（连大字号 3:1 线都不过），深色字压中绿也只有 6.2:1 一档、发闷；
     白罩后中心实测 ≈#ECFAF5，配 --c-brand-800 文字 = 5.96:1（≥4.5:1），环体读成「绿环 + 白心 + 绿字」。 */
  background: var(--c-overlay-bg-solid, rgba(255, 255, 255, 0.9));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.match-card__score-value {
  font-size: 40rpx;
  font-weight: 700;
  /* R8-L01-D07：白字改 --c-brand-800 #156B51（对 0.9 白罩中心实测 5.96:1 ≥4.5:1；
     原白字在绿心白罩上只有 1.07:1，换绿即不可读） */
  color: var(--c-brand-800, #156B51);
  line-height: 1.1;
}

.match-card__score-label {
  font-size: 22rpx;
  font-weight: 500;
  /* R8-L01-D07：同上，rgba(255,255,255,0.95) 字面量 → 同档绿深令牌（小字号需 ≥4.5:1） */
  color: var(--c-brand-800, #156B51);
}

.match-card__info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  /* R11-L01-D16（间距 P2）：原来预留 170rpx 给右侧绝对定位的匹配度环，
     但环在右、文字在左并无争位关系，底部拖出约 85rpx 空带。
     现底部内衬降到 --sp-7(32rpx)，文字贴卡底。 */
  padding: 40rpx 32rpx var(--sp-7, 32rpx);
}

.match-card :deep(.match-info) {
  /* R11-L01-D16：文字列收到约 60%（内容盒 686rpx → 412rpx），
     让右下 160rpx 匹配度环不再与简介末行争同一带 */
  width: 100%;
  max-width: 60%;
}
</style>





