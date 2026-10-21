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
    /** 后端真实匹配度（0-100）。缺省 ⇒ 不显示匹配度数字，见 scorePercent。 */
    matchScore?: number;
  }>(),
  {
    myAvatar: "",
    partnerAvatar: "",
    partnerName: "",
    reasons: () => [],
    matchScore: undefined,
  }
);

const emit = defineEmits<{
  (e: "chat"): void;
  (e: "explore"): void;
  (e: "share"): void;
}>();

const { t } = useI18n();

/* R8-L06-D02（素材缺失 P2）：首行图标原绑 ICONS_EMOJI.RUN = static/assets/icons/emoji/run.svg。
   emoji/ 只登记在 cdn-buckets.json 的 cdnPrefixes，不在 localPrefixes（icons/{tabbar,register,common}），
   real 档按引用裁剪后包内根本没有 emoji/ 目录（实测 dist/build/mp-weixin-real/static/assets/icons/
   只剩 common/register/tabbar + 根上几枚）⇒ 裸绑 404 ⇒ 首行底衬 ink=0，而 2/3/4 行走
   common/{music,book,food}.svg（包内）故有墨 —— 与 R6-L09-D01 同族机制。
   改指同族、三档树均在盘的 ICONS_COMMON.HIKING_SVG（common/hiking.svg，人形行进=慢跑语义）。
   另：common/book.svg、food.svg 同样不带显式 width/height 却能渲染 ⇒ 「缺宽高=0×0」不是本帧根因，
   run.svg 补宽高归素材车道（已在交件报告登记 HANDOFF）。 */
const scoreIcons = [IMAGE_PATHS.ICONS_COMMON.HIKING_SVG, IMAGE_PATHS.ICONS_EMOJI.MUSIC, IMAGE_PATHS.ICONS_EMOJI.BOOK, IMAGE_PATHS.ICONS_EMOJI.FOOD];

/* R10-L06-D01（文案 P0）：原实现在此写死 defaultScores=[90,85,80,79] 并用
   DEFAULT_REASON_LABELS 把 reasons 补满四行——那四个数是《匹配成功页面》设计稿里的示例占位值，
   对任何匹配对象都成立，等于向用户伪造契合度（冻结契约 MP-R1-MATCHING-REQ-01 明令禁止假百分比）。
   现改为：共同点只渲染后端真给的理由（拿不到 ⇒ 整卡隐藏，与 ops 用例
   SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json:172 的「理由卡整块隐藏」预期一致），
   匹配度只渲染 props.matchScore 这一个真值（由 view-models/match.ts:40 从 commonCircleCount 派生）。 */
const displayReasons = computed<MatchReason[]>(() =>
  (props.reasons || []).filter((r) => r && typeof r.text === "string" && r.text.trim().length > 0)
);

const scorePercent = computed<number | null>(() => {
  const raw = Number(props.matchScore);
  if (!Number.isFinite(raw)) return null;
  const clamped = Math.min(100, Math.max(0, Math.round(raw)));
  return clamped;
});

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

      <!-- R10-L06-D01（文案 P0）：匹配度从「每行一个假分数」改成「卡头一个真分数」。
           后端只有一个整体 matchScore，按行重复它同样是伪造 per-dimension 数值，故进度条只留一条。 -->
      <view v-if="displayReasons.length > 0" class="match-success__score-card">
        <view class="match-success__score-head">
          <text class="match-success__score-title">{{ t('matchSuccess.scoreTitle') }}</text>
          <text v-if="scorePercent !== null" class="match-success__score-percent">匹配度 {{ scorePercent }}%</text>
        </view>
        <view v-if="scorePercent !== null" class="match-success__score-track">
          <view class="match-success__score-fill" :style="{ width: scorePercent + '%' }"></view>
        </view>
        <view class="match-success__score-list">
          <view
            v-for="(reason, index) in displayReasons"
            :key="`${reason.type}-${index}`"
            class="match-success__score-item"
          >
            <!-- R1-L06-D06（圆角 P2）：图标外面补一层圆角方块底衬，行首才有视觉锚点；
                 理想图末行为粉底，其余绿底。 -->
            <view
              class="match-success__score-icon-box"
              :class="index === displayReasons.length - 1 ? 'match-success__score-icon-box--pink' : 'match-success__score-icon-box--green'"
            >
              <image class="match-success__score-icon" :src="getScoreIcon(index)" mode="aspectFit" alt="" />
            </view>
            <text class="match-success__score-label">{{ reason.text }}</text>
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
        <!-- R2b-L06-D08（颜色token P2）：理想图分享图标为「方框上箭头」上传式分享图标，
             原 ICONS_SOCIAL.SHARE 是灰蓝三点连线图标、与弱化深灰文字打架；换 ICONS_EMOJI.UPLOAD
             （static/assets/icons/common/upload.svg，已确认落盘） -->
        <image class="match-success__share-icon" :src="IMAGE_PATHS.ICONS_EMOJI.UPLOAD" mode="aspectFit" alt="" /><text class="match-success__share-text">分享喜悦</text>
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
  /* R2b-L06-D07（间距 P2）：__actions 靠 margin-top:auto 锚底后又被 safe-area+padding-bottom 顶起，
     实帧「分享喜悦」下沿距屏幕底约 89px（11% 屏高），理想图仅留 home indicator≈1.5%。
     把根 padding-bottom 由 60rpx 降到 16rpx（上一轮 R1-B11 收到 60rpx 仍偏高）。
     R8-L06-D08（间距 P2）：16rpx 再被 env(safe-area-inset-bottom)=34px 顶起 ⇒ 实帧墨迹下沿距画布底
     50px（14rpx+7px __share 下内衬+34px env），理想图仅 19px。锚底链要生效必须只留常量：
     padding-bottom 归到 24rpx（12px）⇒ 7+12=19px 正合理想实测落点（env 一档由 home indicator
     让位改由 __share 自身内衬吸收，与理想图同口径）。 */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 120rpx) 48rpx 24rpx;
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
  /* R8-L06-D04（字号 P1）：72rpx 档实测字面高 35px、单字步进 35px，比理想图折算（26.6px / 28px 步进）
     大 25%~31%，并把标题压到胶囊带下仅 29px 起排。档位表里 56rpx 有现成令牌
     --fs-7xl（design-variables.scss:571「大标题 28pt = 56rpx」，缺陷卡写的 --fs-5xl 实值只有 44rpx=22px
     会小过理想图），取 --fs-7xl 后字面高≈28px、步进≈28px 对齐理想图折算。 */
  font-size: var(--fs-7xl, 56rpx);
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
  /* R2b-L06-D02（颜色token P2）：原 color:#36C99A 是死属性——heart-filled.svg 烘焙 fill=#FF6B81，
     mp/H5 的 <image> 不响应 CSS color（同文件 __heart-circle-icon 已用 filter 反色得到白心）。
     改用 filter 把已渲染位图从粉（hue≈351°）转到绿（hue≈161°，+170°），并补饱和/压暗逼近 --c-brand(#36C99A)。 */
  filter: hue-rotate(170deg) saturate(1.25) brightness(0.9);
}

.match-success__subtitle {
  margin-top: 12rpx;
  font-size: 32rpx;
  /* R10-L06-D03（颜色token P1）：副标题原写死 #999999，压实测页底 #EDF8F4 只有 2.62:1
     （32rpx=16px 正文档，不享大字号豁免），比理想图同句浅约两个色阶。
     改 --c-text-secondary #4A524E（压同底实测 7.42:1），与理想图深灰档对齐。 */
  color: var(--c-text-secondary, #4A524E);
  line-height: 1.5;
  text-align: center;
  max-width: 560rpx;
}

.match-success__subtitle--hint {
  margin-top: 4rpx;
  font-size: 28rpx;
  /* R10-L06-D04（颜色token P1）：「快去打个招呼吧~」原 #36C99A 压 #EDF8F4 = 1.94:1，
     且 §1.1.2 规定绿色=行动，这句话不是可点件却占用了行动色。
     与上一行同收 --c-text-secondary（7.42:1），绿色只留给下方「立即聊天」。 */
  color: var(--c-text-secondary, #4A524E);
  font-weight: 500;
}

.match-success__avatars {
  display: flex;
  align-items: center;
  /* R2b-L06-D03（位置 P1，上一轮修反了）：理想图两枚头像彼此分离、中间留约 10.6% 屏宽空白，
     心形徽标骑在空隙正中并各压两圆内缘一小截。上一轮把 gap 收成 0 再用负 margin 压成交叠，方向修反。
     R8-L06-D01（位置 P1）：gap 80rpx 档整行 232+80+(136−2×20)+80+232 = 720rpx > 内容盒 654rpx
     （750 − 2×48 内衬）⇒ 实帧左头像外沿 x=13、右头像外沿 x=366 双双溢出，徽标两侧各留 31px 空档。
     gap 收到 40rpx（232+40+96+40+232 = 640rpx ≤ 654rpx）行宽回到内容盒内；
     配合 __heart 的负 margin 由 −20rpx 提到 −60rpx，两圆内缘间距 = 2×40+16 = 96rpx，
     徽标圆 120rpx 各压内缘 12rpx ⇒ 既分离又骑压，与理想图空档折算 68rpx 同档。 */
  gap: 40rpx;
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
  /* R2b-L06-D03：负 margin 曾由 −74rpx 收到 −20rpx（当时 gap=80rpx，徽标浮在空档里没压到内缘）。
     R8-L06-D01 连带：gap 收为 40rpx 后把负 margin 提到 −60rpx，徽标圆（120rpx）各压两枚头像内缘
     约 12rpx（=6px），行总宽 560rpx 仍收在内容盒 654rpx 内、两圆之间还留 96rpx 净距不失分离。
     另补 position:relative —— 原 z-index:3 写在静态 flex 项上根本不入层叠上下文，
     一旦与后画的右头像交叠就会被盖住，吸顶/交叠都必须先定位。 */
  margin: 0 -60rpx;
  position: relative;
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

.match-success__score-head {
  /* R10-L06-D01：卡头一行——左标题、右唯一那个真匹配度。 */
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.match-success__score-title {
  /* R1-L06-D07（字号 P3）：26/500 → 32/700，与 26rpx 行文字拉开层级
     （卡建议的 --t-title-sm 在本仓不存在，实际档位表为 --fs-*，32rpx 档即 --fs-2xl，
     design-variables.scss:537） */
  font-size: var(--fs-2xl, 32rpx);
  color: #5f6f6b;
  font-weight: 700;
}

.match-success__score-list {
  display: flex;
  flex-direction: column;
  /* V-02（第五轮 QA）：行距加宽，避免相邻行视觉粘连 */
  gap: 24rpx;
}

.match-success__score-item {
  /* R10-L06-D01：行内只剩「底衬图标 + 真实共同点文案」——每行一个假分数已删。 */
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

.match-success__score-percent {
  display: block;
  font-size: var(--fs-md, 26rpx);
  /* R10-L06-D05（颜色token P1）：卡里唯一的读数文字原取 #36C99A 压白卡 = 2.10:1。
     按卡取 --c-brand-800 #156B51（白底 6.45:1；卡建议的 brand-700 只有 4.14:1 仍不足，不停在那档）。
     §11.2 口径：本读数已是 R10-L06-D01 收口后的唯一真值（props.matchScore 派生），
     本次只动色档，没有恢复每行一个百分比，也不动 displayReasons 的判据。 */
  color: var(--c-brand-800, #156B51);
  font-weight: 700;
  text-align: right;
}

.match-success__score-track {
  /* R10-L06-D01：整卡唯一一条进度条，宽度即真 matchScore。 */
  width: 100%;
  height: 12rpx;
  margin-bottom: 24rpx;
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
  /* R8-L06-D03（颜色token P1）：主按钮原画成 135° 渐变（#36C99A→#22a976，实帧左上 #35C898 →
     右下 #24AC79，ΔB31 的斜向明暗），理想图同区六个取样点全落 #1DB97D~#23BB7D（Δ≤4）是一条平色
     ⇒ 渐变整条去掉改单色，不再有色带。R8 当时选的 --c-brand-600 #2AAE83 只把白字抬到 2.81:1，
     色档位由下面 R10-L06-D06 接管（同轴未修净，不是回归）。 */
  background: var(--c-brand-800, #156B51);
  /* R10-L06-D06（颜色token P1）：底色压到 --c-brand-800 #156B51 ⇒ 白字 6.45:1
     （已知机制 §2 采用档，R9 对 BottomActionBar.vue:104 做的是同一条裁定）。
     本按钮在 R8 就已按理想图实测收成单色，本次只是把已实色的档位压深，
     不属于 §11.3 点名的「把主 CTA 渐变翻成实色」。
     代价：比理想图实测的 #21BA7B 深两档，属"可达性 > 位图像素"的在册取舍。 */
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
  /* R8-L06-D06（颜色token P1）：次按钮原只写 2rpx 描边 #dce5e2（1px，压在浅底上不可见），
     自身没有底色 ⇒ 实帧按钮内部取样 #F6F5F6~#FAF3F7 与按钮外页面底 #F5F5F7 同值（Δ≤3），
     读成「只有一行字」。理想图同区是 #FFFFFF 卡片白、外底 #F2F6F2（明度差 13）。
     补 --c-bg-container 白底 + 全站卡片阴影，并把与底色撞色的描边换成同族白卡语义（去掉边框）。 */
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 8rpx 24rpx rgba(15, 23, 42, 0.06));
  text-align: center;
}

.match-success__secondary-text {
  font-size: 28rpx;
  /* R10-L06-D07（颜色token P2）：「继续探索」原写死 #8a9694 压白按钮 = 3.06:1，
     落在 3–4.5 的次级文字带、比主按钮还难读。改 --c-text-tertiary #6B7571
     （design-variables.scss:125 真值，白底 4.76:1）⇒ 过 4.5:1 且仍弱于主按钮白字 6.45:1。 */
  color: var(--c-text-tertiary, #6B7571);
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
  /* R2b-L06-D08（颜色token P2）：理想图「分享喜悦」为深灰（#4B5563 档）弱化文字，刻意不做强调；
     原品牌绿 #36C99A/600 读起来像第三个主按钮。改走 --c-text-secondary（#4A524E）+ 字重 500。 */
  color: var(--c-text-secondary, #4B5563);
  font-weight: 500;
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
  /* R2b-L06-D09（层级遮挡 P2）：漂浮爱心是纯装饰，理想图导航栏/返回钮周边应干净。
     统一 pointer-events:none 且不抢导航层（fixed nav 为 z-index:20），避免与可点返回钮叠在同一区域。 */
  pointer-events: none;
  z-index: 1;
}

/* V-02（第五轮 QA）：漂浮爱心装饰位置微调，避免遮挡标题/头像/匹配卡 */
/* R2b-L06-D09：--1 原 top:120rpx 落点正好压在 fixed 导航栏的返回圆底上（心形被圆底切掉下半截）。
   下移到胶囊带以下（≥260rpx），避开返回钮。 */
.match-success__float-heart--1 { top: 260rpx; left: 40rpx; animation-delay: 0s; }
.match-success__float-heart--2 { top: 180rpx; right: 48rpx; animation-delay: 0.6s; width: 32rpx; height: 32rpx; }
.match-success__float-heart--3 { top: 300rpx; left: 24rpx; animation-delay: 1.2s; width: 30rpx; height: 30rpx; opacity: 0.5; }
.match-success__float-heart--4 { top: 460rpx; right: 32rpx; animation-delay: 1.8s; width: 44rpx; height: 44rpx; opacity: 0.6; }
.match-success__float-heart--5 { top: 560rpx; left: 64rpx; animation-delay: 2.4s; width: 28rpx; height: 28rpx; opacity: 0.4; }

@keyframes match-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-24rpx); }
}

</style>
