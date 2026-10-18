<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";
import MyMore, { type MoreItem } from "./mine/MyMore.vue";

const emit = defineEmits<{ (e: "goLogin"): void }>();

/** 2026-08-25 P0：返回上一页（规格书 11.1） */
function goBack() {
  uni.navigateBack({ delta: 1 }).catch(() => {
    uni.switchTab({ url: "/pages/home/index" }).catch(() => {
      uni.reLaunch({ url: "/pages/home/index" });
    });
  });
}

/* R2b-L03-D02（文案）：四列标签与图标按理想图 未登录个人主页.png 口径收口
   「我喜欢 / 喜欢我的 / 我赞 / 访客」，与本页已登录态 MyStats 同一套词
   （pages/profile/index.vue:688 注释已把该口径写死给 MyStats）。
   此前是「关注/粉丝/获赞/匹配」四项全错，图标也跟着错（第 1 列人形、第 4 列实心红心，
   理想图是空心紫心 + 蓝色眼睛）。色档沿用同页已登录态用过的四枚，不新造颜色。
   TODO(跨车道)：理想状态是与 MyStats.vue 共用同一份常量，本组件先按同口径对齐。 */
const STATS = [
  { label: "我喜欢", iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE, color: "#A29BFE" },
  { label: "喜欢我的", iconSrc: IMAGE_PATHS.ICONS_EMOJI.GROUP, color: "#FF6B81" },
  { label: "我赞", iconSrc: IMAGE_PATHS.ICONS_EMOJI.THUMBS_UP, color: "#FF9F43" },
  { label: "访客", iconSrc: IMAGE_PATHS.ICONS_EMOJI.EYE, color: "#4D8DFF" },
];

/* R2b-L03-D11（文案）：补 unit 量词，理想图四行右侧是「0人 ›」而非孤零零的「0」。
   R2b-L03-D12（颜色token）：底色彩排按理想图「粉 / 粉 / 粉 / 橙」归位
   （此前是 粉/橙/淡紫/蓝，整体错位一行），且不再写 #FF6B81FF.. 这类硬编码字面量，
   改走 --c-tint-pink-50 / --c-tint-orange-50 两枚 token。
   TODO(跨车道)：与 MyInteraction.vue 共用同一份色档。 */
const INTERACTIONS = [
  { label: "喜欢我的人", value: 0, unit: "人", iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, tint: "var(--c-tint-pink-50, #FCE4EC)" },
  { label: "我的匹配", value: 0, unit: "人", iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE, tint: "var(--c-tint-pink-50, #FCE4EC)" },
  { label: "我喜欢的人", value: 0, unit: "人", iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, tint: "var(--c-tint-pink-50, #FCE4EC)" },
  { label: "最近访客", value: 0, unit: "人", iconSrc: IMAGE_PATHS.ICONS_EMOJI.EYE, tint: "var(--c-tint-orange-50, #FFF3E0)" },
];

/* R2b-L03-D04（空态文案）：三枚占位块各自给「计数 + 量词」，理想图三档量词不同
   （篇 / 个地方 / 愿望），此前只有一个标题字符串数组、块内除 ＋ 外没有任何空态文本。 */
const STORIES = [
  { name: "生活日常", emptyCount: 0, unit: "篇" },
  { name: "旅行足迹", emptyCount: 0, unit: "个地方" },
  { name: "我的心愿", emptyCount: 0, unit: "个愿望" },
];

/* R2b-L03-D09（素材缺失）：游客态补「更多功能」模块。不另写一套——直接挂已登录态
   同一份 mine/MyMore.vue，items 与 pages/profile/index.vue:761 的 moreItems 同口径，
   游客点击一律走既有 emit('goLogin') 门禁。 */
const MORE_ITEMS: MoreItem[] = [
  { key: "favorites", label: "我的收藏" },
  { key: "visitors", label: "谁看过我" },
  { key: "album", label: "恋爱相册" },
  { key: "privacy", label: "隐私设置" },
];
</script>

<template>
  <view class="not-logged-profile">
    <!-- 2026-08-26 P0：顶部 ‹ 返回 + 应用图标 + 设置（规格书 11.1 / 11.2） -->
    <view class="nlp-topbar">
      <view
        class="nlp-topbar__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="'返回'"
        @tap="goBack"
      >
        <text class="nlp-topbar__icon">‹</text>
      </view>
      <view class="nlp-topbar__right">
        <view
          class="nlp-topbar__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="'应用中心'"
          @tap="emit('goLogin')"
        >
          <image class="nlp-topbar__icon" :src="IMAGE_PATHS.ICONS_EMOJI.MOBILE" mode="aspectFit" alt="" />
        </view>
        <view
          class="nlp-topbar__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="'设置'"
          @tap="emit('goLogin')"
        >
          <image class="nlp-topbar__icon" :src="IMAGE_PATHS.ICONS_EMOJI.SETTINGS" mode="aspectFit" alt="" />
        </view>
      </view>
    </view>

    <!-- 头部：点击登录 -->
    <view class="nlp-header" @tap="emit('goLogin')">
      <!-- R2b-L03-D01（素材缺失）：理想图「点击登录」左侧是一枚浅灰圆形头像占位（内含人形剪影），
           此前模板里根本没有这个节点，画面左缘直接顶到「点击登录」四个字。
           尺寸档对齐已登录态 MyHeader 的 168rpx 头像；字形复用 IMAGE_PATHS.ICONS_EMOJI.USER
           （static/assets/icons/common/user.svg，已确认存在，且走 ICONS_BASE 基址、real 档可解析）。 -->
      <view class="nlp-header__avatar">
        <image class="nlp-header__avatar-img" :src="IMAGE_PATHS.ICONS_EMOJI.USER" mode="aspectFit" alt="" />
      </view>
      <view class="nlp-header__info">
        <text class="nlp-header__title">点击登录</text>
        <text class="nlp-header__sub">登录后遇见心动的TA</text>
      </view>
      <text class="nlp-header__arrow">›</text>
    </view>

    <!-- 资料完整度 -->
    <!-- R2b-L03-D06（位置）：卡内三段结构对齐理想图与已登录态 MyCompletion——
         第一行只有标题；第二行「进度条 + 右侧百分比 + 最右绿色去完善胶囊」同一基线；
         第三行灰色说明文案独占末行。此前 0% 挤在标题行、去完善按钮又因
         align-self:flex-end 掉到说明下面另起一行，卡内变成四段。 -->
    <view class="nlp-card nlp-completion">
      <text class="nlp-completion__title">资料完整度</text>
      <view class="nlp-completion__row">
        <view class="nlp-completion__bar">
          <view class="nlp-completion__bar-inner" />
        </view>
        <text class="nlp-completion__percent">0%</text>
        <view class="nlp-completion__btn" @tap.stop="emit('goLogin')">
          <text class="nlp-completion__btn-text">去完善</text>
        </view>
      </view>
      <text class="nlp-completion__tip">完善资料可以获得更多曝光和匹配机会</text>
    </view>

    <!-- 统计 -->
    <view class="nlp-card nlp-stats">
      <view v-for="s in STATS" :key="s.label" class="nlp-stats__col">
        <view class="nlp-stats__icon" :style="{ background: `${s.color}1F` }">
          <image class="nlp-stats__icon-img" :src="s.iconSrc" mode="aspectFit" alt="" />
        </view>
        <text class="nlp-stats__value">0</text>
        <text class="nlp-stats__label">{{ s.label }}</text>
      </view>
    </view>

    <!-- 我的故事 -->
    <!-- R2b-L03-D03（尺寸比例）：一行四枚等分且全部收在容器内。
         旧口径：单枚固定 220rpx ⇒ 4×220 + 3×16(gap) = 928rpx，而内容盒只有
         750 − 2×24(页面左右 padding) = 702rpx，超宽 226rpx，外层又是 scroll-view scroll-x
         ⇒ 帧上只见 3 枚，第 4 枚「添加故事」整块推到屏幕外。
         新口径：去掉 scroll-x，四枚 flex:1 1 0 + gap 16rpx 等分 ⇒
         单枚 = (100% − 3×16rpx)/4 = (702 − 48)/4 = 163.5rpx，四枚合计 4×163.5 + 48 = 702rpx
         恰好等于容器。宽度按百分比/弹性分配，与视口物理宽度无关 ⇒ 375pt（1rpx=0.5px，
         内容盒 351px、单枚 81.75px）到更宽机型都不会溢出；min-width:0 + 允许收缩兜住亚像素取整。
         R2b-L03-D04：块内补「计数 + 量词」；R2b-L03-D10：名称/计数移到色块内左下角。 -->
    <view class="nlp-section">
      <text class="nlp-section__title">我的故事</text>
      <view class="nlp-stories">
        <view v-for="s in STORIES" :key="s.name" class="nlp-story" @tap="emit('goLogin')">
          <view class="nlp-story__img">
            <text class="nlp-story__plus">＋</text>
            <view class="nlp-story__caption">
              <text class="nlp-story__name">{{ s.name }}</text>
              <text class="nlp-story__count">{{ s.emptyCount }}{{ s.unit }}</text>
            </view>
          </view>
        </view>
        <view class="nlp-story nlp-story--add" @tap="emit('goLogin')">
          <view class="nlp-story__img">
            <view class="nlp-story__add-body">
              <text class="nlp-story__plus">＋</text>
              <text class="nlp-story__add-label">添加故事</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的互动 -->
    <view class="nlp-section">
      <text class="nlp-section__title">我的互动</text>
      <view class="nlp-card nlp-interactions">
        <view
          v-for="(item, i) in INTERACTIONS"
          :key="item.label"
          class="nlp-interaction"
          :class="{ 'nlp-interaction--last': i === INTERACTIONS.length - 1 }"
          @tap="emit('goLogin')"
        >
          <view class="nlp-interaction__icon" :style="{ background: item.tint }">
            <image class="nlp-interaction__icon-img" :src="item.iconSrc" mode="aspectFit" alt="" />
          </view>
          <text class="nlp-interaction__label">{{ item.label }}</text>
          <text class="nlp-interaction__value">{{ item.value }}{{ item.unit }}</text>
          <text class="nlp-interaction__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- R2b-L03-D09（素材缺失）：理想图在 tabBar 之上还有一张「更多功能」卡（四枚图标 + 文字），
         游客态此前在「我的互动」之后直接就是固定登录条，整段模块在 DOM 里不存在，
         两帧之间那条 ≈110px 空白带正是它的位置。复用已登录态同一份 MyMore.vue，不另写一套。 -->
    <view class="nlp-more">
      <MyMore :items="MORE_ITEMS" @tap="emit('goLogin')" />
    </view>

    <!-- R2b-L03-D07（层级遮挡）：登录 CTA 不再 fixed。 -->
    <view class="nlp-footer-btn" @tap="emit('goLogin')">
      <text class="nlp-footer-btn__text">登录</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.not-logged-profile {
  min-height: 100vh;
  background: linear-gradient(180deg, #E8FBF3 0%, #EEF7F2 40%);
  /* R12-IND-PROFILE-INDEX-001/MP-R1-PAGES-PROFILE-INDEX-002：未登录态此前固定
     32rpx 顶距，顶部三枚 64rpx 圆钮直接顶入状态栏/胶囊带（真机截图与时钟同高实证）；
     对齐已登录态 MyHeader.vue:96-98 口径让位状态栏。--statusbar 已由页面根注入。 */
  /* MP-R2-PROFILE-024 → R2b-L03-D07：底部留白收敛为「仅 tabBar 高度」。
     原口径是给一颗 fixed 登录条让位（custom-tab-bar 面板 184rpx+2env + CTA 抬升 16rpx
     + 钮高 92rpx = 292rpx+2env，再叠 108rpx），而那颗 fixed 条在长图里正好永久压在
     「我的故事」宫格下半截上。CTA 已改回文档流末尾的常规块 ⇒ 只需清到 tabBar 顶缘。
     回退值同步去掉重复的 env()（真值走 --tab-bar-total-h，见 theme/design-variables.scss:462）。 */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 32rpx) 24rpx var(--tab-bar-total-h, calc(184rpx + env(safe-area-inset-bottom)));
}

/* 2026-08-26 P0：顶部 ‹ 返回 + 应用图标 + 设置（规格书 11.1 / 11.2）
   R12-IND-PROFILE-INDEX-001：右侧按钮组横向避让微信胶囊（约 96px 量级） */
.nlp-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx calc(var(--capsule-right, 7px) + 96px) 24rpx 8rpx;
}

.nlp-topbar__right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.nlp-topbar__btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nlp-topbar__icon {
  font-size: 32rpx;
  line-height: 1;
  color: #36C99A;
}

.nlp-topbar__btn:nth-child(2) .nlp-topbar__icon,
.nlp-topbar__btn:nth-child(3) .nlp-topbar__icon {
  font-size: 28rpx;
  color: #6B7571;
}

.nlp-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 16rpx;
}

/* R2b-L03-D01（素材缺失）：头部左侧 168rpx 圆形头像占位（浅灰底 + 人形剪影），
   尺寸档对齐已登录态 MyHeader；info 改为其右侧的 flex:1 列。 */
.nlp-header__avatar {
  width: 168rpx;
  height: 168rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--c-neutral-100, #EEF2F0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nlp-header__avatar-img {
  width: 88rpx;
  height: 88rpx;
}

.nlp-header__info {
  flex: 1;
  min-width: 0;
}

.nlp-header__title {
  font-size: 40rpx;
  font-weight: 800;
  color: #333A37;
}

.nlp-header__sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6B7571;
}

.nlp-header__arrow {
  font-size: 44rpx;
  color: #36C99A;
}

.nlp-card {
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.nlp-completion {
  display: flex;
  flex-direction: column;
  padding: 28rpx 32rpx;
}

/* R2b-L03-D06（位置）：进度条 + 百分比 + 去完善胶囊同一基线（原 __head 标题行不再放百分比） */
.nlp-completion__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
}

.nlp-completion__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.nlp-completion__percent {
  flex-shrink: 0;
  font-size: 30rpx;
  font-weight: 800;
  color: var(--c-brand, #36C99A);
}

/* R2b-L03-D05（颜色token）：轨道底不再复用「占位块字面量」，令牌化为 --c-brand-50 */
.nlp-completion__bar {
  flex: 1;
  min-width: 0;
  height: 10rpx;
  border-radius: 999rpx;
  background: var(--c-brand-50, #E8FAF3);
  overflow: hidden;
}

.nlp-completion__bar-inner {
  width: 0%;
  height: 100%;
  background: var(--c-brand, #36C99A);
}

.nlp-completion__tip {
  display: block;
  margin-top: 18rpx;
  font-size: 20rpx;
  color: #9AA39F;
}

.nlp-completion__btn {
  flex-shrink: 0;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36C99A);
  display: inline-flex;
}

.nlp-completion__btn-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}

.nlp-stats {
  display: flex;
  /* V-05（第五轮 QA）：未登录主页 4 icon 统计间距与已登录 MyStats 对齐 */
  padding: 32rpx 8rpx;
  margin-top: 24rpx;
}

.nlp-stats__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.nlp-stats__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nlp-stats__icon-text {
  font-size: 30rpx;
  font-weight: 800;
}

.nlp-stats__icon-img {
  width: 36rpx;
  height: 36rpx;
}

.nlp-stats__value {
  font-size: 34rpx;
  font-weight: 800;
  color: #333A37;
}

.nlp-stats__label {
  font-size: 22rpx;
  color: #9AA39F;
}

.nlp-section {
  margin-top: 32rpx;
}

.nlp-section__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

/* R2b-L03-D03（尺寸比例）：一行四枚等分、全部收在容器内，且不再有 scroll-x。
   旧口径单枚固定 220rpx ⇒ 4×220 + 3×16 = 928rpx > 内容盒 702rpx（超 226rpx），
   第 4 枚「添加故事」被推到屏幕外。 */
.nlp-stories {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  width: 100%;
}

.nlp-story {
  position: relative;
  /* 与缺陷卡给的 calc((100% - 3 * 16rpx) / 4) 等价：flex 先扣 3×16rpx gap 再四等分，
     702rpx 内容盒下单枚 163.5rpx、四枚合计 4×163.5 + 48 = 702rpx 恰好铺满零溢出。
     分配基于百分比 ⇒ 与视口物理宽度无关，375pt（1rpx=0.5px：盒 351px / 单枚 81.75px）
     到更宽机型同样收在容器内；flex-shrink 允许收缩 + min-width:0 兜住亚像素取整。 */
  flex: 1 1 0;
  min-width: 0;
}

.nlp-story__img {
  position: relative;
  /* 第 4 枚的 3rpx 虚线边必须算在等分宽内，否则盒宽溢出 6rpx ⇒ 最后一枚又被顶出去 */
  box-sizing: border-box;
  height: 300rpx;
  border-radius: 24rpx;
  /* R2b-L03-D05（颜色token）：占位块底色由品牌浅绿字面量改中性灰 token */
  background: var(--c-neutral-50, #F2F5F3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 理想图第 4 枚是中性灰虚线框（整页只有头部渐变与主按钮是品牌绿） */
.nlp-story--add .nlp-story__img {
  border: 3rpx dashed var(--c-neutral-300, #C2CAC6);
  background: #ffffff;
}

/* R2b-L03-D05：＋ 同步降到 --c-text-quaternary */
.nlp-story__plus {
  font-size: 56rpx;
  line-height: 1;
  color: var(--c-text-quaternary, #9AA39F);
}

/* R2b-L03-D10（位置）：名称与计数压在色块内左下角，块本身即一张「封面」。
   此前 __name 是色块下方的居中块级文本，帧上三枚色块与三行标题之间明显断开。
   注：缺陷卡另建议配 0→60% 黑色渐变底衬保白字对比——游客态这块是中性浅灰占位、
   理想图此处也是深色字（无封面照可压），加黑衬既掉对比又偏离理想图，故只取「绝对定位到块内左下」这一条。 */
.nlp-story__caption {
  position: absolute;
  left: 12rpx;
  right: 8rpx;
  bottom: 12rpx;
  text-align: left;
}

.nlp-story__name {
  display: block;
  font-size: 24rpx;
  color: var(--c-text-primary, #1A1E1C);
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* R2b-L03-D04（空态文案）：块内第二行计数（0篇 / 0个地方 / 0个愿望） */
.nlp-story__count {
  display: block;
  margin-top: 2rpx;
  font-size: 22rpx;
  color: var(--c-text-tertiary, #6B7571);
  line-height: 1.3;
}

/* 第 4 枚「添加故事」：＋ 与文字成组居中在虚线框内，不走左下角 caption */
.nlp-story__add-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.nlp-story__add-label {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--c-text-tertiary, #6B7571);
}

.nlp-interactions {
  overflow: hidden;
}

.nlp-interaction {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 26rpx 32rpx;
  border-bottom: 1rpx solid #EEF1F5;
}

.nlp-interaction--last {
  border-bottom: 0;
}

.nlp-interaction__icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nlp-interaction__icon-text {
  font-size: 26rpx;
  font-weight: 800;
}

.nlp-interaction__icon-img {
  width: 32rpx;
  height: 32rpx;
}

.nlp-interaction__label {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: #333A37;
}

.nlp-interaction__value {
  font-size: 26rpx;
  color: #9AA39F;
}

.nlp-interaction__arrow {
  font-size: 32rpx;
  color: #C6CDCC;
}

/* R2b-L03-D09（素材缺失）：「更多功能」模块宿主。MyMore 自带
   margin: var(--page-padding) var(--page-padding) 0（为无水平内边距的已登录页设计），
   本页容器已有 24rpx 左右 padding ⇒ 用等值负 margin 抵掉它的水平外边距，避免二次缩进；
   纵向 32rpx 间距由 MyMore 自身的 margin-top 给。 */
.nlp-more {
  margin: 0 calc(var(--page-padding, 32rpx) * -1);
}

/* R2b-L03-D07（层级遮挡）：登录 CTA 从 position: fixed 改为文档流末尾的常规块。
   原 bottom = 2×安全区 + 200rpx 的悬浮条在长图里永久压在「我的故事」宫格下半截上
   （上一轮 R1-B03 修的是 GlobalPublishFab，该组件带 v-if="isOwnProfile" 游客态不渲染，
   于是同一轴换了个元素继续存在）。让位间距一并挪到上方 padding-bottom 口径里。 */
.nlp-footer-btn {
  margin-top: 32rpx;
  height: 92rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36C99A);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nlp-footer-btn__text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
