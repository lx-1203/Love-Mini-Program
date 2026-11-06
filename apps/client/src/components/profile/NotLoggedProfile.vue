<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import { PROFILE_STATS } from "../../config/profile-stats";
import MyMore, { type MoreItem } from "./mine/MyMore.vue";

// audit-r15 批 3-B：模板与数据表（STATS/INTERACTIONS/STORIES/MORE_ITEMS）裸中文迁 i18n
// （profile.notLogged.* 命名空间；同文复用 profile.*/profile.myStory.* 既有键）
const { t } = useI18n();

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
   「我喜欢 / 喜欢我的 / 我赞 / 访客」，与本页已登录态 MyStats 同一套词。
   此前是「关注/粉丝/获赞/匹配」四项全错，图标也跟着错（第 1 列人形、第 4 列实心红心，
   理想图是空心紫心 + 蓝色眼睛）。色档沿用同页已登录态用过的四枚，不新造颜色。
   2026-10-26 对齐理想图（已登录个人主页.png，P5#4）：四枚字形换为实心彩色图标
   （紫色实心心/粉色双人/橙色实心拇指/蓝色实心眼，config/images.ts 七枚字形登记），
   原细描边线性字形与理想图「实心彩色」不符。
   R16-2（2026-11-05 跨车道共享，原 TODO 划除）：常量收口到 config/profile-stats.ts
   单一真相源（与 MyStats 已登录态同一份），本组件按展示形态映射。 */
const STATS = PROFILE_STATS.map((s) => ({
  label: t(s.labelKey),
  iconSrc: s.iconSrc,
  color: s.color,
}));

/* R2b-L03-D11（文案）：补 unit 量词，理想图四行右侧是「0人 ›」而非孤零零的「0」。
   R2b-L03-D12（颜色token）：底色彩排按理想图「粉 / 粉 / 粉 / 橙」归位
   （此前是 粉/橙/淡紫/蓝，整体错位一行），且不再写 #FF6B81FF.. 这类硬编码字面量，
   改走 --c-tint-pink-50 / --c-tint-orange-50 两枚 token。
   R16-2 裁定（原 TODO(跨车道) 划除）：不与 MyInteraction.vue 并案——后者是
   Record<key,{iconSrc,color}> 按行键取色映射形态、本组件是展示行数组，数据形态与
   生命周期（未登录静态 vs 已登录动态取数）均不同，强并会制造跨态耦合；色值本身
   已全部走 token（--c-tint-*），不存在字面量漂移面。 */
const INTERACTIONS = [
  // 2026-10-26 对齐理想图（P5#5）：「喜欢我的人」= 粉色双人剪影（原实心红心与第 3 行重复）；
  // 「最近访客」= 橙色圆环准星（原橙色眼睛）；「我喜欢的人」保留实心心形
  { label: t("profile.notLogged.likedByMeStat"), value: 0, unit: t("profile.notLogged.unitPeople"), iconSrc: IMAGE_PATHS.ICONS_COMMON.USERS_FILL_PINK_SVG, tint: "var(--c-tint-pink-50, #FCE4EC)" },
  { label: t("profile.myMatches"), value: 0, unit: t("profile.notLogged.unitPeople"), iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE, tint: "var(--c-tint-pink-50, #FCE4EC)" },
  { label: t("profile.notLogged.iLikedStat"), value: 0, unit: t("profile.notLogged.unitPeople"), iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, tint: "var(--c-tint-pink-50, #FCE4EC)" },
  { label: t("profile.notLogged.recentVisitors"), value: 0, unit: t("profile.notLogged.unitPeople"), iconSrc: IMAGE_PATHS.ICONS_COMMON.TARGET_FILL_ORANGE_SVG, tint: "var(--c-tint-orange-50, #FFF3E0)" },
];

/* R2b-L03-D04（空态文案）：三枚占位块各自给「计数 + 量词」，理想图三档量词不同
   （篇 / 个地方 / 愿望），此前只有一个标题字符串数组、块内除 ＋ 外没有任何空态文本。 */
const STORIES = [
  { name: t("profile.myStory.categoryDaily"), emptyCount: 0, unit: t("profile.myStory.unitDaily") },
  { name: t("profile.myStory.categoryTravel"), emptyCount: 0, unit: t("profile.myStory.unitTravel") },
  { name: t("profile.myStory.categoryWish"), emptyCount: 0, unit: t("profile.myStory.unitWish") },
];

/* R2b-L03-D09（素材缺失）：游客态补「更多功能」模块。不另写一套——直接挂已登录态
   同一份 mine/MyMore.vue，items 与 pages/profile/index.vue:761 的 moreItems 同口径，
   游客点击一律走既有 emit('goLogin') 门禁。 */
const MORE_ITEMS: MoreItem[] = [
  { key: "favorites", label: t("profile.notLogged.myFavorites") },
  { key: "visitors", label: t("profile.visitorsTitle") },
  { key: "album", label: t("profile.notLogged.loveAlbum") },
  { key: "privacy", label: t("profile.notLogged.privacySettings") },
];
</script>

<template>
  <view class="not-logged-profile">
    <!-- 2026-08-26 P0：顶部 ‹ 返回 + 应用中心 + 设置（规格书 11.1 / 11.2）
         R8-L02-D17（层级遮挡 P1）：本行改 position:sticky 吸顶（见样式），滚动时给内容让出胶囊带。 -->
    <view class="nlp-topbar">
      <view
        class="nlp-topbar__btn nlp-topbar__btn--bare press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.back')"
        @tap="goBack"
      >
        <text class="nlp-topbar__glyph nlp-topbar__glyph--back">‹</text>
      </view>
      <view class="nlp-topbar__right">
        <!-- R8-L02-D12（素材缺失 P2）：右上第一枚原绑 ICONS_EMOJI.MOBILE（common/mobile.svg 手机轮廓），
             与理想图的四方格不同形，且「手机」在本页没有任何指向（无设备/绑定入口）。
             改复用已登录态 MyHeader.vue:6 同一枚「▦」四方格字形（文本 glyph，不引新素材、
             不踩 real 档 icons/emoji 未打包那条 404 路径），MOBILE 素材从本页摘除。
             2026-10-26 对齐理想图（未登录个人主页.png，P6#2）：「▦」文本改为二维码图标
             （定位角块+点阵，与已登录态 MyHeader 同一枚 ICONS_COMMON.QR_CODE_SVG）；
             P5#1/P6：三枚导航钮撤白色圆底改裸图标（未登录理想图头部即为无底裸图标）。 -->
        <view
          class="nlp-topbar__btn nlp-topbar__btn--bare press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('profile.notLogged.appCenterAria')"
          @tap="emit('goLogin')"
        >
          <image class="nlp-topbar__qr" :src="IMAGE_PATHS.ICONS_COMMON.QR_CODE_SVG" mode="aspectFit" alt="" />
        </view>
        <view
          class="nlp-topbar__btn nlp-topbar__btn--bare press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('common.settingsAria')"
          @tap="emit('goLogin')"
        >
          <image class="nlp-topbar__icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.SETTINGS" mode="aspectFit" alt="" />
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
        <!-- 2026-10-26 对齐理想图（P6#3）：占位头像为灰色实心人形剪影
             （原 common/user.svg 细线描边人形，形态不符） -->
        <image class="nlp-header__avatar-img" :src="IMAGE_PATHS.ICONS_COMMON.USER_FILL_SVG" mode="aspectFit" alt="" />
      </view>
      <view class="nlp-header__info">
        <text class="nlp-header__title">{{ t('profile.notLogged.tapToLogin') }}</text>
        <text class="nlp-header__sub">{{ t('profile.notLogged.loginSubtitle') }}</text>
      </view>
      <!-- R8-L02-D14（需新建 P1）：游客态头部右侧原只有一枚 44rpx「›」，模板里根本没有「编辑资料」
           节点 ⇒ 理想图/规范要求的白底绿字入口在本页完全缺失，游客无法从「我的」进入资料填写。
           补同档入口（复用已登录态 MyHeader.vue:277-293 的 .my-header__edit 胶囊口径，热区提到
           全站 88rpx 触控下限），游客点击走本页既有 emit('goLogin') 门禁，不新造链路、不编造字段。
           2026-10-26 对齐理想图（P6#5）：白底黑字无边框胶囊，撤右侧「›」箭头（P5#2 同判）。 -->
      <view
        class="nlp-header__edit press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('profile.editProfile')"
        @tap.stop="emit('goLogin')"
      >
        <text class="nlp-header__edit-text">{{ t('profile.editProfile') }}</text>
      </view>
    </view>

    <!-- 资料完整度 -->
    <!-- R2b-L03-D06（位置）：卡内三段结构对齐理想图与已登录态 MyCompletion——
         第一行只有标题；第二行「进度条 + 右侧百分比 + 最右绿色去完善胶囊」同一基线；
         第三行灰色说明文案独占末行。此前 0% 挤在标题行、去完善按钮又因
         align-self:flex-end 掉到说明下面另起一行，卡内变成四段。 -->
    <view class="nlp-card nlp-completion">
      <text class="nlp-completion__title">{{ t('profile.notLogged.completionTitle') }}</text>
      <view class="nlp-completion__row">
        <view class="nlp-completion__bar">
          <view class="nlp-completion__bar-inner" />
        </view>
        <text class="nlp-completion__percent">0%</text>
        <view class="nlp-completion__btn" @tap.stop="emit('goLogin')">
          <text class="nlp-completion__btn-text">{{ t('profile.completeBannerAction') }}</text>
        </view>
      </view>
      <text class="nlp-completion__tip">{{ t('profile.notLogged.completionTip') }}</text>
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
      <text class="nlp-section__title">{{ t('profile.myStory.title') }}</text>
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
              <text class="nlp-story__add-label">{{ t('profile.myStory.addStory') }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的互动 -->
    <view class="nlp-section">
      <text class="nlp-section__title">{{ t('profile.notLogged.interactionTitle') }}</text>
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

    <!-- R2b-L03-D07（层级遮挡）：登录 CTA 不再 fixed。
         R8-L02-D16（位置 P1）：这条文档流通栏实心绿「登录」条理想图里并不存在——
         它与头部「点击登录」是同一动作的两处入口，并把页面整体拉长约 124rpx，
         使「更多功能」卡被顶到接近首屏折叠线以下。按缺陷卡建议移除通栏条，
         登录入口收敛为头部「点击登录」+ R8-L02-D14 新增的「编辑资料」胶囊。 -->
  </view>
</template>

<style scoped lang="scss">
.not-logged-profile {
  min-height: 100vh;
  /* 2026-10-26 对齐理想图（P5#7 同判）：头部渐变取样 rgb(202,242,223)，原 #E8FBF3 起点饱和度低，
     起点加深到 #CAF2DF；底部净空收敛（P6#7：更多功能卡与 tabBar 间留白偏大，收 48rpx，
     仍保留 --tab-bar-total-h 主让位档） */
  background: linear-gradient(180deg, #CAF2DF 0%, #EEF7F2 40%);
  padding: 32rpx 24rpx calc(var(--tab-bar-total-h, calc(184rpx + env(safe-area-inset-bottom))) - 48rpx);
}

/* 2026-08-26 P0：顶部 ‹ 返回 + 应用中心 + 设置（规格书 11.1 / 11.2）
   R12-IND-PROFILE-INDEX-001：右侧按钮组横向避让微信胶囊（约 96px 量级）
   R8-L02-D17（层级遮挡 P1）：本行原为文档流元素 ⇒ 滚到「我的故事」时第 4 枚虚线卡的
   「添加故事」标签升到 y≈32-46，与系统胶囊（x≈272-370 / y≈28-60）几乎完全重叠、右半被盖住
   （同一轴 R2b-L03-D07 把 fixed 登录条改文档流后换个元素复发）。修法落在「页头的定位契约」上：
   topbar 改 position:sticky 吸顶（top:0 + z-index 高于卡片层），并把自身背景补成不透明的页面顶色
   var(--c-bg-brand)=#E8FBF2（与本页渐变起点 #E8FBF3 Δ≤3，肉眼接缝不可见）——
   吸顶高度 = --statusbar + 16rpx 上衬 + 64rpx 钮 + 24rpx 下衬 ≈ 状态栏下 52px，
   覆盖整条胶囊带，滚动内容改从底板下沿穿过，不再印进状态栏/胶囊里。 */
.nlp-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 16rpx) calc(var(--capsule-right, 7px) + 96px) 24rpx 8rpx;
  background: var(--c-bg-brand, #E8FBF3);
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

/* 2026-10-26 对齐理想图（P5#1/P6#2）：头部三枚导航钮为无底裸图标（撤白色圆底） */
.nlp-topbar__btn--bare {
  background: transparent;
}

/* 2026-10-26：二维码图标（与已登录态 MyHeader 同一枚素材） */
.nlp-topbar__qr {
  width: 40rpx;
  height: 40rpx;
}

/* R8-L02-D13（颜色token P2）：返回 ‹ 原 #36C99A 品牌绿，是整排最重的墨，
   理想图恰好相反（返回件弱化、右侧两枚为重黑）。‹ 与 ▦ 都是文本字形，直接走令牌：
   返回 → --c-text-tertiary #6B7571（弱化档），右侧 → --c-text-primary #1A1E1C（重黑档）。 */
.nlp-topbar__glyph {
  font-size: 30rpx;
  line-height: 1;
  color: var(--c-text-primary, #1A1E1C);
}

.nlp-topbar__glyph--back {
  font-size: 32rpx;
  color: var(--c-text-tertiary, #6B7571);
}

/* R8-L02-D13 连带：设置那一枚是 <image> 外链 SVG，mp 的 image 不响应 CSS color
   （原 :259-263 的 nth-child 染色从落不了画，且 nth-child(3) 根本不匹配 —— 两枚图钮在
   __right 子容器里，不是 .nlp-topbar 的第 2/3 子元素）。素材烘焙描边 #94A3B8，
   用 filter 对已渲染位图做「去饱和 + 压暗」逼近 --c-text-primary：
   saturate(0) → 161 灰阶，再 ×0.34 → ≈#373737（对 #1A1E1C 同档，浅绿底上 ≥11:1）。
   尺寸此前靠 flex 收缩被动铺满 64rpx 圆钮（实测 32px 出血），现按同页已登录态
   MyHeader 的 34rpx/56rpx 比例给 40rpx，与左侧 ▦ 字形同重量。 */
.nlp-topbar__icon-img {
  width: 40rpx;
  height: 40rpx;
  filter: saturate(0) brightness(0.34);
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

/* R8-L02-D14：头部白底绿字「编辑资料」胶囊。
   底/影走令牌 --c-bg-container + --card-shadow（与同页 .nlp-card 同族），
   字色不走 --c-brand/--c-brand-700（#1F8D6A 对白底只有 4.14:1），取 --c-brand-800 #156B51
   = 6.45:1，仍是「绿字」且达 WCAG 4.5:1 正文下限；热区补全站 88rpx 口径。 */
.nlp-header__edit {
  flex-shrink: 0;
  min-height: 88rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 26rpx;
  border-radius: 999rpx;
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 8rpx 24rpx rgba(15, 23, 42, 0.06));
}

.nlp-header__edit-text {
  font-size: 26rpx;
  font-weight: 600;
  /* 2026-10-26 对齐理想图（P5#2/P6#5）：白底黑字胶囊（原品牌深绿字 #156B51，
     理想图为黑字；黑色对白底对比度 15:1，仅升不降） */
  color: var(--c-text-primary, #1A1E1C);
}

.nlp-card {
  border-radius: 32rpx;
  background: var(--c-bg-container);
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
  /* 2026-10-26 对齐理想图（未登录个人主页.png，P6#4）：「0%」为黑色
     （原 R10 取 --c-brand-800 绿档压对比度——黑色 var(--c-text-primary) #1A1E1C 对白底 14.7:1，
     对比度只升不降，色相随理想图归黑） */
  color: var(--c-text-primary, #1A1E1C);
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
  /* R10-L02-D09（颜色token P1）：这是完整度卡唯一的主行动，白字 22rpx 压 --c-brand #36C99A
     仅 2.10:1（正文级需 4.5:1）。底色收 --c-brand-800 #156B51 ⇒ 纯白 6.45:1、
     与本页页头「编辑」文字/百分比读数同一档品牌绿，实心主 CTA 角色不变
     （§11.3：共享主 CTA 渐变不再翻回实色，这里本来就是实色底，只深不浅）。 */
  background: var(--c-brand-800, #156B51);
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
  /* R10-L02-D10（尺寸比例 P2）：原 300rpx 在 378px 帧上单枚实测 163.5×300rpx = 82×150px
     （1:1.83），每卡比理想图高约 30px，四张叠加页头后把「我的互动」整段挤出首屏。
     收到 240rpx（=120px，缺陷卡给的落点）⇒ 163.5×240 = 1:1.47，回到竖版封面档，
     等分口径（flex:1 1 0 + gap 16rpx）不动，四枚仍恰好铺满 702rpx 内容盒。 */
  height: 240rpx;
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
  background: var(--c-bg-container);
}

/* R2b-L03-D05：＋ 同步降到 --c-text-quaternary
   2026-10-26 对齐理想图（P6#6）：占位「＋」升级为带底纹的半透明大号图形——
   字号加大 + 透明度压低 + 浅色圆形底纹垫底，不再是一枚细线小加号 */
.nlp-story__plus {
  position: relative;
  z-index: 1;
  font-size: 88rpx;
  font-weight: 300;
  line-height: 1;
  color: var(--c-text-quaternary, #9AA39F);
  opacity: 0.55;
}

.nlp-story__img::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 42%;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: rgba(154, 163, 159, 0.12);
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
  /* R10-L02-D11（颜色token P2）：「0人」是每行唯一的计数数据，原硬写 #9AA39F
     （= --c-text-quaternary 真值，design-variables.scss:126）压白底仅 2.59:1，
     低于非文字 3:1 底线。改 --c-text-secondary #4A524E = 8.06:1（L=0.08029 ⇒ 1.05/0.13029），
     与左侧标签 #333A37 拉开一档层级，数据位不再是「灰到读不出」。 */
  color: var(--c-text-secondary, #4A524E);
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

/* R2b-L03-D07 → R8-L02-D16：整条通栏「登录」CTA 已从模板移除（理想图无此条、
   与头部入口重复、并把「更多功能」卡顶到折叠线以下），故 .nlp-footer-btn 两条样式一并删除。
   页面底部让位仍由根节点 padding-bottom: var(--tab-bar-total-h) 承担（见 :224 口径）。 */
</style>
