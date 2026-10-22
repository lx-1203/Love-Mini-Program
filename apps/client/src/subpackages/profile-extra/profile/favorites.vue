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
        <!-- R11-L10-D19：热区 88rpx，64rpx 白圆底移进 __back-circle（同域 location.vue:294-315 配方） -->
        <view class="favorites-header__back-circle">
          <image class="favorites-header__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
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
    <EmptyState
      v-else-if="favorites.length === 0"
      :image="IMAGE_PATHS.ICONS_EMOJI.STAR"
      :title="t('profile.favoritesEmpty')"
      :description="t('profile.favoritesEmptyDesc')"
      :action-text="t('village.history.backToVillage')"
      @action="goVillage"
    />

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
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-container, #FFFFFF);
  /* 白圆压薄荷页底只有 ≈1.08:1；补卡片描边让「可点圆钮」的边界可见
     （同域 album.vue:672-681 / location.vue:304-315 的圆底均带此描边）。 */
  border: var(--c-border-card);
}

.favorites-header__back-icon { width: 36rpx; height: 36rpx; }
.favorites-header__title {
  font-size: var(--fs-xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1E1E1E);
}

.favorites-state { padding: 120rpx 0; text-align: center; }
.favorites-state__text { color: var(--c-text-secondary, #666666); font-size: 26rpx; }

.favorites-empty { margin-top: 40rpx; padding: 80rpx 40rpx; text-align: center; }
.favorites-empty__icon { width: 80rpx; height: 80rpx; margin-bottom: 16rpx; }
.favorites-empty__title { font-size: 30rpx; font-weight: 600; color: var(--c-text-primary, #1E1E1E); display: block; }
.favorites-empty__desc { font-size: 24rpx; color: var(--c-text-secondary, #666666); margin-top: 8rpx; }

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