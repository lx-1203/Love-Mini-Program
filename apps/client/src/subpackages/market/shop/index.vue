<script setup lang="ts">
/**
 * 逛逛页 - 校内商品/票务/优惠券展示
 */
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useCheckInStore } from "../../../stores/checkin";
import { IMAGE_PATHS } from "../../../config/images";
import SafeImage from "../../../components/common/SafeImage.vue";
// 3-H 商品 real 链路：GET /products（mock 分支保留本地商品源）
import { useMock } from "../../../stores/helpers/use-mock";
import { request } from "../../../services/http";
import { resolveMediaUrl } from "../../../utils/media";

const { t } = useI18n();

// Task D：签到积分余额展示（进入页面时拉取最新余额）
const checkInStore = useCheckInStore();
onShow(() => {
  void checkInStore.fetchStatus();
  void fetchShopItems();
});

// 分类标签
const categories = computed(() => [
  { id: "all", name: t("shop.categoryAll") },
  { id: "ticket", name: t("shop.categoryTicket") },
  { id: "food", name: t("shop.categoryFood") },
  { id: "goods", name: t("shop.categoryGoods") },
  { id: "creative", name: t("shop.categoryCreative") },
]);
const activeCategory = ref("all");

/**
 * 返回上一页（自定义导航栏返回键，navigationStyle: custom 无系统返回栏）。
 * 无上一页时（如从 reLaunch/直达进入）回退到首页 tab。
 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: "/pages/home/index" });
  }
}

/** 商品项 */
interface ShopItem {
  id: string;
  title: string;
  price: number;
  originalPrice: number;
  sales: number;
  image: string;
  category: string;
  tag: string;
}

/**
 * 后端商品视图（GET /products 响应项，3-H）。
 */
interface ProductView {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string | null;
  category: string;
  sales: number | null;
  stock: number | null;
  createdAt: string | null;
}

/**
 * 后端商品分页视图（GET /products 响应载荷，3-H）。
 * 注意：后端页码从 0 开始（Spring PageRequest），首屏传 page=0。
 */
interface ProductPageView {
  items: ProductView[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 商品列表（R4-00038：mock 模式以本地源驱动；real 模式走 GET /products）。
 */
const shopItems = ref<ShopItem[]>([]);
/** 商品加载中 */
const shopLoading = ref(false);
/** 商品加载失败 */
const shopError = ref(false);

/**
 * 将后端商品视图映射为页面商品项。
 * 图片经 resolveMediaUrl 解析（mock:// 演示态 / 鉴权代理真实 URL）。
 */
function toShopItem(p: ProductView): ShopItem {
  return {
    id: String(p.id),
    title: p.name,
    price: Number(p.price) || 0,
    originalPrice: p.originalPrice != null ? Number(p.originalPrice) : 0,
    sales: p.sales ?? 0,
    image: resolveMediaUrl(p.imageUrl),
    category: p.category,
    tag: "",
  };
}

/**
 * 本地 mock 商品源（2026-08-10 B8 已接后端：real 模式走 GET /products，
 * 商品数据由 admin 端商品管理维护；本函数仅 mock 模式使用，演示数据）。
 */
function buildMockShopItems(): ShopItem[] {
  return [
    {
      id: "1",
      title: t("shop.productTicket1"),
      price: 99,
      originalPrice: 129,
      sales: 56,
      image: IMAGE_PATHS.PRODUCTS.TICKET_1,
      category: "ticket",
      tag: t("shop.tagHot"),
    },
    {
      id: "2",
      title: t("shop.productCreative1"),
      price: 29.9,
      originalPrice: 39.9,
      sales: 128,
      image: IMAGE_PATHS.PRODUCTS.MERCH_1,
      category: "creative",
      tag: t("shop.tagNew"),
    },
    {
      id: "3",
      title: t("shop.productFood1"),
      price: 9.9,
      originalPrice: 15,
      sales: 234,
      image: IMAGE_PATHS.PRODUCTS.FOOD_1,
      category: "food",
      tag: t("shop.tagLimited"),
    },
    {
      id: "4",
      title: t("shop.productGoods1"),
      price: 19.9,
      originalPrice: 25,
      sales: 89,
      image: IMAGE_PATHS.PRODUCTS.MERCH_2,
      category: "goods",
      tag: "",
    },
    {
      id: "5",
      title: t("shop.productTicket2"),
      price: 15,
      originalPrice: 20,
      sales: 45,
      image: IMAGE_PATHS.PRODUCTS.TICKET_2,
      category: "ticket",
      tag: "",
    },
    {
      id: "6",
      title: t("shop.productCreative2"),
      price: 12.9,
      originalPrice: 18,
      sales: 167,
      image: IMAGE_PATHS.PRODUCTS.FOOD_2,
      category: "creative",
      tag: t("shop.tagRecommended"),
    },
  ];
}

/**
 * 拉取商品列表（加载态 + 失败重试 + 空态）。
 * - mock：保留本地 mock 商品源；
 * - real（3-H）：GET /products?category=&page=0&pageSize=20（后端页码从 0 开始）。
 */
async function fetchShopItems(): Promise<void> {
  if (shopLoading.value) return;
  shopLoading.value = true;
  shopError.value = false;
  try {
    if (useMock()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      shopItems.value = buildMockShopItems();
    } else {
      const page = await request<ProductPageView, Record<string, unknown>>({
        url: "/products",
        method: "GET",
        data: {
          category: activeCategory.value === "all" ? undefined : activeCategory.value,
          page: 0,
          pageSize: 20,
        },
      });
      shopItems.value = (page.items ?? []).map(toShopItem);
    }
  } catch (_e) {
    shopError.value = true;
  } finally {
    shopLoading.value = false;
  }
}

const filteredItems = computed(() => {
  if (activeCategory.value === "all") return shopItems.value;
  return shopItems.value.filter((item) => item.category === activeCategory.value);
});

/**
 * 切换分类。
 * mock：本地过滤（现有行为）；real：按分类重新拉取（后端支持 category 筛选）。
 */
function selectCategory(id: string) {
  activeCategory.value = id;
  if (!useMock()) {
    void fetchShopItems();
  }
}

/**
 * 点击商品 → 详情页（3-H）。
 * 详情页位于分包 subpackages/market/detail/index，按商品 id 加载。
 */
function goToDetail(itemId: string) {
  uni.navigateTo({
    url: `/subpackages/market/detail/index?id=${encodeURIComponent(itemId)}`,
  });
}
</script>

<template>
  <view class="shop-page">
    <!-- 页面标题（2026-08-09：左侧补返回键） -->
    <view class="shop-header">
      <view class="shop-header__top">
        <view
          class="shop-header__back press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('common.back')"
          @tap="goBack"
        >
          <image class="shop-header__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
        </view>
        <text class="shop-header__title">{{ t('shop.pageTitle') }}</text>
      </view>
    </view>

    <!-- Task D：当前积分余额展示条 -->
    <view class="shop-points-bar">
      <view class="shop-points-bar__left">
        <image class="shop-points-bar__icon" :src="IMAGE_PATHS.ICONS_EMOJI.GIFT" mode="aspectFit" alt="" lazy-load />
        <text class="shop-points-bar__label">{{ t('shop.pointsBarTitle') }}</text>
      </view>
      <view class="shop-points-bar__right">
        <text class="shop-points-bar__value">{{ checkInStore.pointsBalance }}</text>
        <text class="shop-points-bar__hint">{{ t('discover.pointsHint') }}</text>
      </view>
    </view>

    <!-- 分类标签 -->
    <view class="category-bar">
      <scroll-view scroll-x class="category-scroll" show-scrollbar="false">
        <view class="category-list" role="list">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="category-item press-feedback"
            :class="{ 'category-item--active': activeCategory === cat.id }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="selectCategory(cat.id)"
          >
            <text class="category-item__text">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 商品网格 -->
    <scroll-view scroll-y class="shop-scroll">
      <!-- R4-00038：加载态 -->
      <view v-if="shopLoading" class="shop-state" role="status" aria-live="polite">
        <view class="shop-state__spinner" />
        <text class="shop-state__text">{{ t("shop.loading") }}</text>
      </view>

      <!-- 错误态（含重试） -->
      <view v-else-if="shopError" class="shop-state" role="alert">
        <text class="shop-state__text">{{ t("shop.loadFailed") }}</text>
        <view
          class="shop-state__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('common.retry')"
          @tap="fetchShopItems"
        >
          <text class="shop-state__btn-text">{{ t("common.retry") }}</text>
        </view>
      </view>

      <!-- 空态 -->
      <view v-else-if="filteredItems.length === 0" class="shop-state">
        <text class="shop-state__text">{{ t("shop.empty") }}</text>
      </view>

      <view v-else class="shop-grid">
        <view
          v-for="item in filteredItems"
          :key="item.id"
          class="shop-card press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="goToDetail(item.id)"
        >
          <view class="shop-card__image-wrap">
            <SafeImage :src="item.image" custom-class="shop-card__image" mode="aspectFill" :lazy-load="true" />
            <view v-if="item.tag" class="shop-card__tag">
              <text>{{ item.tag }}</text>
            </view>
          </view>
          <view class="shop-card__info">
            <text class="shop-card__title">{{ item.title }}</text>
            <view class="shop-card__price-row">
              <text class="shop-card__price">¥{{ item.price }}</text>
              <text v-if="item.originalPrice > 0" class="shop-card__original-price">¥{{ item.originalPrice }}</text>
            </view>
            <text class="shop-card__sales">{{ t('shop.salesLabel', { n: item.sales }) }}</text>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="shop-footer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand);
$green-light: var(--c-brand-50);
$pink-primary: var(--c-romance-500);
$pink-light: var(--c-romance-100);
$gold-vip: var(--c-vip-from);
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
$text-secondary: var(--c-neutral-500);
$text-tertiary: var(--c-neutral-400);
$border-light: var(--c-tint-gray-50);
$card-soft-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.shop-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: linear-gradient(180deg, var(--c-tint-green-50) 0%, $bg-page 40%);
}

/* ========== 页面标题 ========== */
.shop-header {
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  background: transparent;
  z-index: 10;
}

/* 2026-08-09：返回键 + 标题（同一行） */
.shop-header__top {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.shop-header__back {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container, #ffffff);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shop-header__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.shop-header__title {
  font-size: var(--fs-5xl, 44rpx);
  font-weight: 800;
  color: $text-primary;
  // #ifdef H5
  background: linear-gradient(135deg, $green-primary, $pink-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // #endif
  // #ifndef H5
  color: var(--c-brand); // mp-weixin 降级：使用纯色（取渐变中间色）
  // #endif
}

/* ========== Task D：积分余额展示条 ========== */
.shop-points-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 24rpx 20rpx;
  padding: 20rpx 28rpx;
  border-radius: var(--r-xl, 24rpx);
  background: linear-gradient(135deg, $gold-vip, var(--c-vip-border-light, #d9b97c));
  box-shadow: 0 4rpx 16rpx var(--c-vip-border-tint, rgba(201, 163, 106, 0.35));
  border: none;
}

.shop-points-bar__left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.shop-points-bar__icon {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
  /* R4-02275：金色渐变条上图标，反色文字 token（深色模式自动反转为深色） */
  color: var(--c-text-inverse);
}

.shop-points-bar__label {
  font-size: var(--fs-md, 26rpx);
  font-weight: 700;
  /* R4-02276：金色渐变条上文字，反色文字 token */
  color: var(--c-text-inverse);
}

.shop-points-bar__right {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  flex-shrink: 0;
}

.shop-points-bar__value {
  font-size: var(--fs-4xl, 40rpx);
  font-weight: 800;
  /* R4-02277：金色渐变条上数字，反色文字 token */
  color: var(--c-text-inverse);
  line-height: 1;
}

.shop-points-bar__hint {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 500;
  /* R4-02535：深底叠层文字改用 token */
  color: var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85));
  white-space: nowrap;
}

/* ========== 分类标签 ========== */
.category-bar {
  padding: 0 24rpx 24rpx;
}

.category-scroll {
  width: 100%;
}

.category-list {
  display: flex;
  gap: 16rpx;
  padding-right: 24rpx;
}

.category-item {
  flex-shrink: 0;
  padding: 16rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R4-02279：分类 chip 底色，容器背景 token（深色模式转深色面） */
  background: var(--c-bg-container);
  border: 2rpx solid transparent;
  box-shadow: $card-soft-shadow;
  transition: all var(--d-normal, 200ms) ease;
}

/* #ifdef H5 */
.category-item:active {
  transform: scale(0.96);
}
/* #endif */

.category-item__text {
  font-size: var(--fs-md, 26rpx);
  color: $text-secondary;
  font-weight: 500;
}

.category-item--active {
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  border: 2rpx solid transparent;
  box-shadow: 0 4rpx 16rpx var(--c-brand-border-tint-stronger);
}

.category-item--active .category-item__text {
  /* R4-02280：绿色渐变 chip 上文字，反色文字 token */
  color: var(--c-text-inverse);
  font-weight: 700;
}

/* ========== 滚动区域 ========== */
.shop-scroll {
  flex: 1;
  overflow: hidden;
}

/* ========== R4-00038：加载/错误/空态 ========== */
.shop-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: 120rpx 40rpx;
}

.shop-state__spinner {
  width: 56rpx;
  height: 56rpx;
  border: 4rpx solid var(--c-neutral-100);
  border-top-color: var(--c-brand);
  border-radius: 50%;
  animation: shop-spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes shop-spin {
  to { transform: rotate(360deg); }
}

.shop-state__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.shop-state__btn {
  min-height: 80rpx;
  padding: 0 var(--sp-8);
  border-radius: var(--r-full);
  background: var(--c-brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shop-state__btn-text {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-inverse);
}

/* ========== 商品网格 ========== */
.shop-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 0 24rpx;
}

.shop-card {
  width: calc(50% - 10rpx);
  /* R4-02281：商品卡底色，容器背景 token（深色模式转深色面） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  overflow: hidden;
  box-shadow: $card-soft-shadow;
  border: none;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.shop-card:active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 20rpx var(--c-black-shadow-sm);
}
/* #endif */

.shop-card__image-wrap {
  position: relative;
  width: 100%;
  height: 300rpx;
}

.shop-card__image {
  width: 100%;
  height: 100%;
  background: $bg-page;
}

.shop-card__tag {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $pink-primary, var(--c-romance-400));
  box-shadow: 0 4rpx 12rpx var(--s-romance);
}

.shop-card__tag text {
  font-size: var(--fs-xs, 20rpx);
  /* R4-02282：粉色渐变标签上文字，反色文字 token */
  color: var(--c-text-inverse);
  font-weight: 700;
}

.shop-card__info {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.shop-card__title {
  font-size: var(--fs-md, 26rpx);
  color: $text-primary;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shop-card__price-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.shop-card__price {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 800;
  color: $pink-primary;
}

.shop-card__original-price {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  text-decoration: line-through;
}

.shop-card__sales {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

/* ========== 底部留白 ========== */
.shop-footer {
  height: 60rpx;
}
</style>
