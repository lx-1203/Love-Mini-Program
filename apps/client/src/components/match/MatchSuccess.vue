<script setup lang="ts">
// MP-R2-...-MATCH-SUCCESS-009：启用 virtualHost 使宿主不产生包裹节点，
// 根 min-height:100% 与 actions 的 margin-top:auto 高度链成立（CTA 锚底）
defineOptions({ options: { virtualHost: true } });
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import type { MatchReason } from "../../types/match";

// R10-P1-004：头像加载失败时落本地默认头像（纯 <image> 无 SafeImage 兜底链）
const myAvatarFailed = ref(false);
const partnerAvatarFailed = ref(false);
function onMyAvatarError() {
  myAvatarFailed.value = true;
}
function onPartnerAvatarError() {
  partnerAvatarFailed.value = true;
}

const props = withDefaults(
  defineProps<{
    myAvatar: string;
    partnerAvatar: string;
    partnerName: string;
    reasons: MatchReason[];
  }>(),
  {
    myAvatar: "",
    partnerAvatar: "",
    partnerName: "",
    reasons: () => [],
  }
);

const emit = defineEmits<{
  (e: "chat"): void;
  (e: "explore"): void;
  (e: "share"): void;
}>();

const { t } = useI18n();

const scoreIcons = [IMAGE_PATHS.ICONS_EMOJI.RUN, IMAGE_PATHS.ICONS_EMOJI.MUSIC, IMAGE_PATHS.ICONS_EMOJI.BOOK, IMAGE_PATHS.ICONS_EMOJI.FOOD];
// 2026-08-25 P0：默认匹配度与参考图对齐（90/85/80/79），最后一项"生活方式 79%"而非 95%
const defaultScores = [90, 85, 80, 79];

/** 2026-08-25 P1：始终展示 4 行匹配度（规格书 7.8）。
 *  后端 reasons 可能只有 1~2 项（如 mock 只返"同校"+"共同兴趣"），
 *  缺项用默认标签补全，保证 旅行/音乐/电影/生活方式 四行都可见。 */
const DEFAULT_REASON_LABELS = ["旅行爱好", "音乐品味", "电影偏好", "生活方式"];
const displayReasons = computed<MatchReason[]>(() => {
  const result: MatchReason[] = [];
  for (let i = 0; i < 4; i++) {
    const src = props.reasons[i];
    result.push({
      type: (src?.type ?? `default-${i}`) as MatchReason["type"],
      text: src?.text ?? DEFAULT_REASON_LABELS[i] ?? "共同点",
    });
  }
  return result;
});

function getScorePercent(index: number): number {
  return defaultScores[index % defaultScores.length] ?? 0;
}

function getScoreIcon(index: number): string {
  return scoreIcons[index % scoreIcons.length] ?? '';
}
</script>

<template>
  <view class="match-success">
    <view class="match-success__hero">
      <!-- 漂浮爱心装饰（参考图对齐，SVG 复用 heart-filled，颜色由 class 控制） -->
      <image class="match-success__float-heart match-success__float-heart--1" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <image class="match-success__float-heart match-success__float-heart--2" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <image class="match-success__float-heart match-success__float-heart--3" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <image class="match-success__float-heart match-success__float-heart--4" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <image class="match-success__float-heart match-success__float-heart--5" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <view class="match-success__title-row">
        <image class="match-success__title-heart match-success__title-heart--left" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
        <text class="match-success__title">{{ t('matchSuccess.title') }}</text>
        <image class="match-success__title-heart match-success__title-heart--right" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      </view>
      <text class="match-success__subtitle">
        {{ t('matchSuccess.matchedWith', { name: partnerName || t('discover.partnerDefaultName') }) }}
      </text>
      <text class="match-success__subtitle match-success__subtitle--hint">
        {{ t('matchSuccess.matchedHint') }}
      </text>

      <view class="match-success__avatars">
        <view class="match-success__avatar-wrap">
          <view class="match-success__ripple match-success__ripple--1"></view>
          <view class="match-success__ripple match-success__ripple--2"></view>
          <image class="match-success__avatar" :src="myAvatarFailed ? IMAGE_PATHS.DEFAULT_AVATAR : myAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" @error="onMyAvatarError" />
        </view>
        <view class="match-success__heart">
          <view class="match-success__heart-circle">
            <!-- MP-R1-SUBPACKAGES-...-MATCH-SUCCESS-101：粉渐变圆底上粉色 SVG 通道差≤15
                 （对比度≈1:1），理想图主视觉为白心。原引白色填充变体
                 heart-filled-white.svg，但该文件从未迁移到后端 app-assets
                 （media_asset 0 行）→ real 模式 404 空白，故改回 heart-filled.svg
                 + 下方 __heart-circle-icon 的 brightness/invert 反色。 -->
            <image class="match-success__heart-circle-icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
          </view>
        </view>
        <view class="match-success__avatar-wrap">
          <view class="match-success__ripple match-success__ripple--1"></view>
          <view class="match-success__ripple match-success__ripple--2"></view>
          <image class="match-success__avatar" :src="partnerAvatarFailed ? IMAGE_PATHS.DEFAULT_AVATAR : partnerAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" @error="onPartnerAvatarError" />
        </view>
      </view>

      <!-- 2026-08-25 P1：始终展示 4 行（displayReasons 已补全缺项） -->
      <view v-if="displayReasons.length > 0" class="match-success__score-card">
        <text class="match-success__score-title">{{ t('matchSuccess.scoreTitle') }}</text>
        <view class="match-success__score-list">
          <view
            v-for="(reason, index) in displayReasons"
            :key="`${reason.type}-${index}`"
            class="match-success__score-item"
          >
            <!-- R1-L06-D06（圆角 P2）：图标外面补一层圆角方块底衬，行首才有视觉锚点；
                 理想图末行（生活方式）为粉底，其余三行绿底。 -->
            <view
              class="match-success__score-icon-box"
              :class="index === displayReasons.length - 1 ? 'match-success__score-icon-box--pink' : 'match-success__score-icon-box--green'"
            >
              <image class="match-success__score-icon" :src="getScoreIcon(index)" mode="aspectFit" alt="" />
            </view>
            <text class="match-success__score-label">{{ reason.text }}</text>
            <!-- R1-L06-D05（尺寸比例 P2）：百分比与其下的进度条收进右栏，
                 不再让 __score-track 以 width:100% 横穿整张卡片压在标签行正下方。 -->
            <view class="match-success__score-value">
              <text class="match-success__score-percent">匹配度 {{ getScorePercent(index) }}%</text>
              <view class="match-success__score-track">
                <view class="match-success__score-fill" :style="{ width: getScorePercent(index) + '%' }"></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="match-success__actions">
      <view
        class="match-success__primary press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        role="button"
        :aria-label="t('matchSuccess.sayHi')"
        @tap="emit('chat')"
      >
        <text class="match-success__primary-text">{{ t('matchSuccess.sayHi') }}</text>
      </view>
      <view
        class="match-success__secondary press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        role="button"
        :aria-label="t('matchSuccess.explore')"
        @tap="emit('explore')"
      >
        <text class="match-success__secondary-text">{{ t('matchSuccess.explore') }}</text>
      </view>
      <view class="match-success__share" hover-class="match-success__share--pressed" @tap="emit('share')">
        <image class="match-success__share-icon" :src="IMAGE_PATHS.ICONS_SOCIAL.SHARE" mode="aspectFit" alt="" /><text class="match-success__share-text">分享喜悦</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* MP-R2-...-MATCH-SUCCESS-009：宿主撑满 */
:host {
  flex: 1;
  min-height: 100%;
}

.match-success {
  /* R1-L06-D01（位置 P1）：父级（page → .success-page）的 min-height:100% 无可解析的确定高度，
     于是本根节点的 min-height:100% 也退化成 auto ⇒ __actions 的 margin-top:auto 吃不到剩余空间，
     三枚动作悬在视口 62%~83% 处、下方残留约 15% 空带。改为组件根自证 100vh
     （顶部 nav 是 position:fixed 不占流高，不会与 100vh 争高度），锚底链才成立。 */
  flex: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  /* R4：110rpx 起排使标题行与微信胶囊（状态栏下 47-83px real 带）叠压，下移至胶囊带以下 */
  /* R1-L06-D01：动作块底沿与 safe-area 间距按理想图收到 60rpx 一档 */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 120rpx) 48rpx calc(60rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  /* R1-L06-D02（颜色token P2）：删掉组件内第二条渐变 linear-gradient(180deg,#E8FBF2,#F0FFF5)（无粉色端）。
     页面层 match-success.vue:182 的 var(--c-gradient-match)（theme/design-variables.scss:179/390）
     是唯一来源；两层渐变在「分享喜悦」下方撞出一条可见横向色带接缝、接缝以下突然转粉。 */
}

.match-success__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.match-success__title {
  font-size: 72rpx;
  font-weight: 700;
  color: #36C99A;
}

.match-success__title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.match-success__title-heart {
  width: 40rpx;
  height: 40rpx;
  color: #FF9DB5;
}

.match-success__title-heart--left {
  color: #FF9DB5;
}

.match-success__title-heart--right {
  color: #36C99A;
}

.match-success__subtitle {
  margin-top: 12rpx;
  font-size: 32rpx;
  color: #999999;
  line-height: 1.5;
  text-align: center;
  max-width: 560rpx;
}

.match-success__subtitle--hint {
  margin-top: 4rpx;
  font-size: 28rpx;
  color: #36C99A;
  font-weight: 500;
}

.match-success__avatars {
  display: flex;
  align-items: center;
  /* R1-L06-D03（尺寸比例 P1）：gap 32 → 0，交叠关系改由 __heart 的负 margin 给出。
     原三列并列把「头像-心-头像」撕开一道约 176rpx 空槽，心形徽标落在槽里没有压盖任何头像。 */
  gap: 0;
  margin-top: 64rpx;
  position: relative;
}

.match-success__avatar-wrap {
  position: relative;
  /* R3（MSUCCESS-004）：160→192rpx，主视觉加权对齐理想图（庆祝时刻头像过弱）
     R1-L06-D03：192→232rpx（理想图头像直径各≈31% 屏宽，232/750≈31%） */
  width: 232rpx;
  height: 232rpx;
}

.match-success__avatar {
  width: 232rpx;
  height: 232rpx;
  border-radius: 50%;
  border: 6rpx solid #ffffff;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.12);
  background: #f0f2f5;
  position: relative;
  z-index: 2;
}

.match-success__ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2rpx solid rgba(54, 201, 154, 0.25);
  z-index: 1;
  animation: ripple-expand 2.4s ease-out infinite;
}

.match-success__ripple--1 {
  /* R1-L06-D03 连带：200→240rpx（原 200rpx 在头像提到 232rpx 后会缩到头像以内，涟漪不可见） */
  width: 240rpx;
  height: 240rpx;
  animation-delay: 0s;
}

.match-success__ripple--2 {
  /* R1-L06-D03 连带：240→288rpx，与 232rpx 头像保持原 192rpx 档的外扩比例 */
  width: 288rpx;
  height: 288rpx;
  animation-delay: 1.2s;
}

.match-success__heart {
  /* R3（MSUCCESS-004）：100→136rpx，连接心形与头像比例对齐理想图 */
  width: 136rpx;
  height: 136rpx;
  /* R1-L06-D03：136rpx 盒宽两侧各收 74rpx ⇒ 两枚头像内缘重叠量 = 136 - 74*2 = -12rpx，
     与理想图量测一致；心形徽标坐正交叠点，靠 z-index:3 压住两头像。 */
  margin: 0 -74rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  flex-shrink: 0;
}

.match-success__heart-circle {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B81 0%, #FF4D6D 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(255, 77, 109, 0.35);
  animation: heart-pulse 1.6s ease-in-out infinite;
}

.match-success__heart-circle-icon {
  width: 44rpx;
  height: 44rpx;
  // mp <image> 不响应 CSS `color` 染色（原 `color:#fff` 是死属性），
  // 但 filter 作用于已渲染位图：brightness(0) 压黑 → invert(1) 洗白，
  // 与源 SVG 的 fill/stroke 配色无关，恒得纯白心。
  filter: brightness(0) invert(1);
}

.match-success__score-card {
  margin-top: 40rpx;
  width: 100%;
  padding: 32rpx;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(54, 201, 154, 0.10);
}

.match-success__score-title {
  /* R1-L06-D07（字号 P3）：26/500 → 32/700，与 26rpx 行文字拉开层级
     （卡建议的 --t-title-sm 在本仓不存在，实际档位表为 --fs-*，32rpx 档即 --fs-2xl，
     design-variables.scss:537） */
  font-size: var(--fs-2xl, 32rpx);
  color: #5f6f6b;
  text-align: center;
  margin-bottom: 24rpx;
  font-weight: 700;
}

.match-success__score-list {
  display: flex;
  flex-direction: column;
  /* V-02（第五轮 QA）：4 行匹配度行距加宽，避免进度条视觉粘连 */
  gap: 24rpx;
}

.match-success__score-item {
  /* R1-L06-D05：两列结构——左「底衬图标 + 标签」｜右「百分比 + 其下进度条」，
     替掉原「文字行 + 满宽条」的八段节奏。 */
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.match-success__score-icon-box {
  /* R1-L06-D06：64rpx 圆角方块底衬；理想图圆角 18-20rpx ⇒ 取现存 --r-lg 档（20rpx，
     design-variables.scss:201/445），无需新 token。 */
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-lg, 20rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.match-success__score-icon-box--green {
  background: var(--c-tint-green-50, #E8F5E9);
}

.match-success__score-icon-box--pink {
  background: var(--c-tint-pink-50, #FCE4EC);
}

.match-success__score-icon {
  /* R1-L06-D06：裸图标 36 → 32rpx，坐进底衬正中 */
  width: 32rpx;
  height: 32rpx;
}

.match-success__score-label {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-md, 26rpx);
  color: #3a4a44;
  font-weight: 500;
}

.match-success__score-value {
  /* R1-L06-D05：右栏定宽 = 卡内宽 590rpx（750 - 页边距 96 - 卡内衬 64）的约 45%，
     与理想图「条只占右半栏」一致；进度条 width:100% 现在落进这一栏。 */
  width: 264rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.match-success__score-percent {
  display: block;
  font-size: var(--fs-md, 26rpx);
  color: #36C99A;
  font-weight: 700;
  text-align: right;
}

.match-success__score-track {
  width: 100%;
  height: 12rpx;
  background: #F0F0F0;
  border-radius: 999rpx;
  overflow: hidden;
}

.match-success__score-fill {
  height: 100%;
  background: linear-gradient(90deg, #36C99A 0%, #22a976 100%);
  border-radius: 999rpx;
  transition: width 0.8s ease-out;
}

.match-success__actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.match-success__primary {
  padding: 24rpx 0;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #36C99A 0%, #22a976 100%);
  text-align: center;
}

.match-success__primary-text {
  font-size: 30rpx;
  font-weight: 800;
  color: #ffffff;
}

.match-success__secondary {
  padding: 22rpx 0;
  border-radius: 999rpx;
  border: 2rpx solid #dce5e2;
  text-align: center;
}

.match-success__secondary-text {
  font-size: 28rpx;
  color: #8a9694;
}

.match-success__share-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 6rpx;
}
.match-success__share {
  padding: 14rpx 0;
  text-align: center;
}

.match-success__share--pressed {
  opacity: 0.7;
}

.match-success__share-text {
  font-size: 26rpx;
  color: #36C99A;
  font-weight: 600;
}

@keyframes ripple-expand {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 0;
  }
}

@keyframes heart-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
.match-success__float-heart {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
  color: #FF6B81;
  opacity: 0.7;
  animation: match-float 3.2s ease-in-out infinite;
}

/* V-02（第五轮 QA）：漂浮爱心装饰位置微调，避免遮挡标题/头像/匹配卡 */
.match-success__float-heart--1 { top: 120rpx; left: 40rpx; animation-delay: 0s; }
.match-success__float-heart--2 { top: 180rpx; right: 48rpx; animation-delay: 0.6s; width: 32rpx; height: 32rpx; }
.match-success__float-heart--3 { top: 300rpx; left: 24rpx; animation-delay: 1.2s; width: 30rpx; height: 30rpx; opacity: 0.5; }
.match-success__float-heart--4 { top: 460rpx; right: 32rpx; animation-delay: 1.8s; width: 44rpx; height: 44rpx; opacity: 0.6; }
.match-success__float-heart--5 { top: 560rpx; left: 64rpx; animation-delay: 2.4s; width: 28rpx; height: 28rpx; opacity: 0.4; }

@keyframes match-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-24rpx); }
}

</style>
