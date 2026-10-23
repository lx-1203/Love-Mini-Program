<template>
  <view class="favorites-page" :style="menuStyleVars">
    <view class="favorites-header">
      <view
        class="favorites-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.back')"
        @tap="goBack"
      >
        <!-- R11-L10-D19：热区 88rpx，64rpx 白圆底移进 __back-circle（同域 location.vue:294-315 配方）
             R14-L10-D20（可达性 P1，2026-10-22）：圆底里那枚 ICONS_COMMON.BACK 是 common/back.svg 的
             栅格图（stroke #94A3B8 蓝灰，24 viewBox 里折线只占 x9..15 / y6..18，留白过大），旧 :196 还把它
             压到 36rpx×36rpx（比 location.vue 当年实测的 40rpx 更小）⇒ 帧上白圆里只剩一道浅灰痕，与圆底
             几乎分不开；本页 navigationStyle=custom、无系统返回栏，这枚是唯一退出口。
             按 location.vue:189-193 / album.vue:686-691 已验证配方换成 52rpx 深色 ‹ 字形（同域 other.vue:515
             同一枚字形），未新增素材。 -->
        <view class="favorites-header__back-circle">
          <text class="favorites-header__back-glyph">‹</text>
        </view>
      </view>
      <text class="favorites-header__title">{{ t('profile.favoritesTitle', { n: favorites.length }) }}</text>
    </view>

    <view v-if="loading" class="favorites-state">
      <SkeletonBlock variant="list" :rows="3" :label="t('common.loading')" />
    </view>

    <!-- R6-B56/D01（素材缺失 P1）+ R6-B56/D02（可达性 P2，2026-10-20）：
         原自绘空态卡有两个毛病——① 80rpx 图标位绑裸常量 IMAGE_PATHS.ICONS_EMOJI.BOOKMARK
         （=/static/assets/icons/bookmark.svg，images.ts:679 未过 resolveMediaUrl；real 包内
         icons/ 只剩 common/register/tabbar，根级那枚不在包里 ⇒ 实测 x=20..360/y=118..210
         色差命中 0 像素，图标位空占着，文字整体下沉 27px）；② 副标题把用户指向"帖子页"
         却 0 个可点热区（实测卡内 y=246..284 色差命中 0）。
         按两条 defect 的建议改法：改复用 EmptyState（自带 120rpx 图标 + hasAction 分支 +
         按钮 min-height 88rpx 已在组件侧修好），图标换 real 包内实存的
         ICONS_COMMON.STAR（dist 实测 static/assets/icons/common/star.png 在包），
         动作文案复用既有键 village.history.backToVillage（"去广场逛逛"），跳村口列表页。
         未新增 locale、未造素材路径。 -->
    <!-- R7-L10-D16（颜色token P3，2026-10-21）：空态主视觉落外来色——原 ICONS_COMMON.STAR
         是 /static/assets/icons/common/star.png，由 common/star.svg 栅格化而来，描边写死
         #94A3B8（= 帧实测字形像素 (148,162,184) 蓝灰档），与本页薄荷绿底 + 白卡 + 品牌绿
         按钮（同帧实测 (54,201,154)）不同色系。换成仓内既有、已登记、且真在 real 包内的
         品牌绿星标：ICONS_EMOJI.STAR = assets/svg-spec/03-icons/star.svg（描边 #36C99A，
         即 --c-brand 真值；dist/build/mp-weixin-real/static/assets/svg-spec/03-icons/star.svg
         实存，且 svg-spec 属 localPrefixes 恒走包内路径，不会 404）。未新增素材、未改组件。 -->
    <!-- R14-L10-D22（颜色token P2，2026-10-22）：上面 R7-L10-D16 那轮为去掉蓝灰外来色，把空态主视觉
         换成 ICONS_EMOJI.STAR = assets/svg-spec/03-icons/star.svg（描边写死 #36C99A = --c-brand 主绿）。
         色族脏了，但语义用反了：本页空态说的是「收藏 / 喜欢的帖子」（:46 的 favoritesEmptyDesc 原文
         「喜欢的帖子会出现在这里」），按 §1.1 原则 2「喜欢」语义全站归心动粉 #FF6B81；主绿应当只留给
         :47 那颗行动按钮（EmptyState.vue:230 --c-brand-800）。现改绑仓内既有、已在 IN_PACKAGE_ASSETS
         双登记的 ICONS_EMOJI.DOUBLE_HEART = assets/icons/common/heart-filled.svg
         （fill|stroke #FF6B81，逐字等于 --c-romance-500 真值 design-variables.scss:41），
         与 :44 原星标的加载路径同级（svg-spec 与 icons/common 都在 localPrefixes，且本值经
         EmptyState.vue:93 的 resolveMediaUrl），real 档不空源；未新增素材、未改组件、未改文案。 -->
    <!-- R14-L10-D23（位置 P2，2026-10-22）：:145 那条 R11-L10-D18 注释写「改明确 height:100vh，
         EmptyState 的 flex:1 0 auto 才有伸展对象」，帧读数证明没生效（块中心 y≈231，可用区中心
         y≈454）。根因是已知机制 §1/§3：mp-weixin 里 EmptyState 的 `flex:1 0 auto` 挂在组件**内部**
         .empty 上，而 .favorites-page 的 flex 子项是组件**宿主节点**（拿不到那条声明）⇒ .empty 只按
         自身内容高（40+内容+40≈255px）排在页头下面。宿主节点跨边界不可靠（§1 已证 custom-class/
         root-class 恒无效），故在宿主侧加一层纯宿主 view 作可解析高度的容器，靠它自己的
         flex:1 + justify-content:center 把空态块落到可用区中线；EmptyState 内部声明一律不动。 -->
    <view v-else-if="favorites.length === 0" class="favorites-empty-slot">
      <EmptyState
        :image="IMAGE_PATHS.ICONS_EMOJI.DOUBLE_HEART"
        :title="t('profile.favoritesEmpty')"
        :description="t('profile.favoritesEmptyDesc')"
        :action-text="t('village.history.backToVillage')"
        @action="goVillage"
      />
    </view>

    <scroll-view v-else scroll-y class="favorites-list">
      <view
        v-for="post in favorites"
        :key="post.id"
        class="favorite-card card-base"
        @tap="openPost(post.id)"
      >
        <view v-if="post.images && post.images.length > 0" class="favorite-card__cover">
          <SafeImage :src="resolveMediaUrl(post.images[0])" custom-class="favorite-card__cover-img" mode="aspectFill" />
        </view>
        <view class="favorite-card__body">
          <view class="favorite-card__author">
            <image class="favorite-card__avatar" :src="resolveMediaUrl(post.author.avatar)" mode="aspectFill" alt="" />
            <text class="favorite-card__name">{{ post.author.name }}</text>
            <text class="favorite-card__campus" v-if="post.author.campusName">{{ post.author.campusName }}</text>
          </view>
          <text class="favorite-card__title">{{ post.title }}</text>
          <text class="favorite-card__content">{{ post.content }}</text>
          <view class="favorite-card__meta">
            <text class="favorite-card__count">{{ t('profile.favoritesCount', { n: post.favorites }) }}</text>
            <view class="favorite-card__unfav press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap.stop="unfavorite(post.id)">
              <text class="favorite-card__unfav-text">{{ t('profile.unfavorite') }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="list-bottom-spacer" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useVillageStore } from "../../../stores/village";
import { IMAGE_PATHS } from "../../../config/images";
import SafeImage from "../../../components/common/SafeImage.vue";
// R6-B56/D01+D02：空态改复用统一 EmptyState（图标 + 文案 + 动作按钮三段齐）
import EmptyState from "../../../components/common/EmptyState.vue";
import { resolveMediaUrl } from "../../../utils/media";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
// R6-B56/D02：空态动作入口跳村口列表页（同域其他页一致走 openAppPath）
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
// R11-G2：注入 --statusbar（本页样式使用 var(--statusbar, env(...))，DevTools env 恒 0 必须由 JS 注入）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();
const villageStore = useVillageStore();
const { posts, loading } = storeToRefs(villageStore);

const favorites = computed(() => posts.value.filter((p) => p.isFavorite));

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: "/pages/profile/index" }) });
}

function openPost(id: string) {
  villageStore.setCurrentPost(id);
  uni.navigateTo({ url: `/subpackages/village/village/detail?id=${id}` });
}

/** R6-B56/D02：空态动作——副标题指的路径给出真入口（村口帖子列表） */
function goVillage() {
  openAppPath(ROUTES.TAB.VILLAGE);
}

async function unfavorite(id: string) {
  // MP-R2-FAVORITES-001：取消收藏失败 toast（原裸 await，rejection 未处理 + UI 静默还原）
  try {
    await villageStore.toggleFavorite(id);
    uni.showToast({ title: t("profile.unfavoriteDone"), icon: "none" });
  } catch (error) {
    uni.showToast({
      title: error instanceof Error && error.message ? error.message : t("common.operationFailed"),
      icon: "none",
    });
  }
}

onShow(() => {
  // 登录态需要 token；未登录时由 mock/回退数据提供
  void villageStore.fetchPosts({}, true).catch(() => {
    /* mock/回退数据兜底 */
  });
});
</script>

<style scoped lang="scss">
.favorites-page {
  /* R11-L10-D18（位置 P2）：R7-L10-D17 补的 min-height:100vh 在本帧读数里未生效——
     内容中心仍在 y≈218、可用区中心 y=407。mp-weixin 下 min-height 不给 flex 子项
     可解析高度，改明确 height:100vh（页面根节点，navigationStyle=custom 即整屏），
     EmptyState 的 flex:1 0 auto 才有伸展对象；头部照常占位，空态落在剩余可用区居中。 */
  height: 100vh;
  background: var(--c-bg-page, #EEF7F2);
  /* R11-L10-D21（间距 P3）：横向内衬原 --sp-6=24rpx，比 §1.4 页边距档少 8rpx；
     与 privacy.vue:318 同角色容器同取 --page-padding=32rpx。纵向不动页头。 */
  padding: 0 var(--page-padding, 32rpx);
  /* R7-L10-D17 在宿主侧补的 flex 列保留；但它同时依赖的 min-height:100vh 在 mp-weixin 下
     给不出可解析高度（R11-L10-D18 复拍内容中心仍是 y≈218），已由上面的 height:100vh 取代。
     .favorites-list 的 flex:1 继续随 flex 列生效。 */
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.favorites-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 16rpx) 0 24rpx;
}

.favorites-header__back {
  /* R11-L10-D19（可达性 P1）：原热区 64rpx=32px，仅为 88rpx 口径的 73%；本页无系统
     返回栏（navigationStyle=custom），这枚白圆是唯一退出口 ⇒ 热区提到 88rpx，
     视觉圆底尺寸不动、移入 __back-circle。 */
  width: 88rpx;
  height: 88rpx;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorites-header__back-circle {
  width: 64rpx;
  height: 64rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  /* R14-L10-D24（圆角 P3）：原 var(--r-circle, 50%) 里的 --r-circle 在 design-variables.scss
     0 命中（全站圆底真令牌是 --r-full: 9999rpx，:448/:204），这条 var() 恒走兜底 ⇒ 与同域
     album.vue:675 / location.vue:317 / tasks.vue:542 三处写法不同轨。渲染色值不变（两者都圆），
     纯代码口径收口。 */
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-container, #FFFFFF);
  /* 白圆压薄荷页底只有 ≈1.08:1；补卡片描边让「可点圆钮」的边界可见
     （同域 album.vue:672-681 / location.vue:304-315 的圆底均带此描边）。 */
  border: var(--c-border-card);
}

/* R14-L10-D20（可达性 P1）：原 .favorites-header__back-icon（36rpx×36rpx 蓝灰 PNG）换成
   52rpx 深色 ‹ 字形。52rpx 高于字号档位上限 --fs-5xl=44rpx，按同域 location.vue:330-335 /
   album.vue:686-691 / other.vue:515 既有口径保留为固定布局尺寸，不写永不生效的假兜底。
   深色字形压白圆底：--c-text-primary #1A1E1C 对 #FFFFFF 实算 16.85:1（远过 4.5:1），
   而原 PNG 可见带高≈8px、字形墨色实测 ≈1.6:1。 */
.favorites-header__back-glyph {
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1;
  color: var(--c-text-primary);
}

.favorites-header__title {
  /* R14-L10-D21（字号 P2）：原 var(--fs-xl, 32rpx) —— 令牌真值是 30rpx=15px（:565），
     兜底 32rpx 是假兜底，且 15px 比 §1.3 页头档下限 26px 低 11px，帧上「我的收藏（0）」
     明显比同分包同批收敛过的 location/privacy/album 三页（均 var(--fs-7xl)=56rpx=28px）
     小一圈。归同域页头档 --fs-7xl，并删假兜底（同 location.vue:345 / album.vue:699）。 */
  font-size: var(--fs-7xl);
  font-weight: 700;
  color: var(--c-text-primary, #1E1E1E);
}

/* R14-L10-D23（位置 P2）：空态槽 —— 纯宿主 view，给 EmptyState 一个高度可解析的居中容器。
   .favorites-page 已是 height:100vh + flex 列，本槽 flex:1 1 auto 取到「页头以下的全部可用区」
   （实算：视口 814px − 页头 (statusbar+16rpx padding+88rpx 热区+24rpx 下衬) ≈ 814 − 95 = 719px），
   justify-content:center 把空态块中心落到 y≈95+719/2=454（原实测 y≈231，下移 ≈223px ⇒ 复拍门可见）。 */
.favorites-empty-slot {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.favorites-state { padding: 120rpx 0; text-align: center; }

/* R14-L10-D25（尺寸比例 P3）：原 :204 .favorites-state__text 与 :206-209 .favorites-empty{,__icon,
   __title,__desc} 五条规则在本文件模板段（改前 1..141 行）grep 命中 0 次——空态自 R6-B56/D01 起
   已整体改走 <EmptyState>（渲染的是组件内部 .empty / .empty-icon，图标 120rpx，EmptyState.vue:170），
   这套死样式里写死的 80rpx×80rpx 与帧上真正渲出的 120rpx 差 40rpx，照它调图标必然调不到东西上。
   按卡删除，空态尺寸只在 EmptyState 侧维护。删除体本身不改画面（零像素），故不作为任何缺陷的
   唯一修复面：同页 D20/D21/D22/D23 四条都有各自的画面落点。 */

.favorites-list { /* MP-R2-FAVORITES-002：高度随页头自适应 */ flex: 1; min-height: 0; }
.favorite-card {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  margin-top: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-lg, 20rpx);
  box-shadow: var(--s-card-soft);
}
.favorite-card__cover {
  width: 160rpx;
  height: 160rpx;
  border-radius: var(--r-md, 16rpx);
  overflow: hidden;
  flex-shrink: 0;
}
.favorite-card__cover-img { width: 100%; height: 100%; }
.favorite-card__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.favorite-card__author { display: flex; align-items: center; gap: 8rpx; }
.favorite-card__avatar { width: 40rpx; height: 40rpx; border-radius: 50%; }
.favorite-card__name { font-size: 24rpx; font-weight: 600; color: var(--c-text-primary, #1E1E1E); }
.favorite-card__campus { font-size: 20rpx; color: var(--c-text-tertiary, #999999); }
.favorite-card__title { font-size: 28rpx; font-weight: 700; color: var(--c-text-primary, #1E1E1E); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.favorite-card__content {
  font-size: 24rpx; color: var(--c-text-secondary, #666666);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.favorite-card__meta { display: flex; align-items: center; justify-content: space-between; margin-top: 4rpx; }
.favorite-card__count { font-size: 22rpx; color: var(--c-text-tertiary, #999999); }
.favorite-card__unfav {
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  border: 2rpx solid var(--c-brand-500, #2DB98A);
  color: var(--c-brand-500, #2DB98A);
  font-size: 22rpx;
}
.favorite-card__unfav-text { color: inherit; }
.list-bottom-spacer { height: 60rpx; }
</style>