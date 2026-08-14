<script setup lang="ts">
/**
 * 商品详情页（3-H 商品）
 *
 * 从逛逛页（pages/shop/index）点击商品进入，按 id 加载详情：
 * - mock 模式：本地 mock 商品目录（与 shop 页 mock 源、后端种子数据一致）
 * - real 模式：GET /products/{id}（404 时展示空态 + 返回）
 *
 * 页面结构：顶部导航栏 → 商品大图 → 名称/价格/销量/库存 → 商品介绍 → 底部购买栏。
 */
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import SafeImage from "../../../components/common/SafeImage.vue";
import EmptyState from "../../../components/common/EmptyState.vue";
import { IMAGE_PATHS } from "../../../config/images";
import { useMock } from "../../../stores/helpers/use-mock";
import { request } from "../../../services/http";
import { resolveMediaUrl } from "../../../utils/media";

const { t } = useI18n();

/**
 * 后端商品视图（GET /products/{id} 响应载荷，3-H）。
 */
interface ProductDetail {
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

/** 当前商品 ID（onLoad 从 query 读取） */
const productId = ref("");

/**
 * 商品详情。
 * mock 分支额外携带 titleKey/descKey（i18n 文案键）；real 分支直接使用后端 name/description。
 */
type ProductWithMockKeys = ProductDetail & { titleKey?: string; descKey?: string };
const product = ref<ProductWithMockKeys | null>(null);

/** 加载中 */
const loading = ref(false);

/** 加载失败（网络/服务异常，展示错误态 + 重试） */
const error = ref(false);

/** 商品不存在（404，展示空态 + 返回） */
const notFound = ref(false);

/** 商品展示图（resolveMediaUrl 解析：mock:// 演示态 / 鉴权代理真实 URL） */
const productImage = computed(() =>
  product.value ? resolveMediaUrl(product.value.imageUrl) : ""
);

/** 分类展示文案（复用 shop 分类 Tab 文案） */
const categoryLabel = computed(() => {
  const map: Record<string, string> = {
    ticket: t("shop.categoryTicket"),
    food: t("shop.categoryFood"),
    goods: t("shop.categoryGoods"),
    creative: t("shop.categoryCreative"),
  };
  return product.value ? (map[product.value.category] ?? "") : "";
});

/**
 * Mock 商品目录（与 shop 页 buildMockShopItems、后端种子数据对齐），
 * 仅 mock 模式使用：real 模式由后端返回完整数据。
 */
interface MockProduct {
  id: string;
  titleKey: string;
  descKey: string;
  price: number;
  originalPrice: number;
  sales: number;
  stock: number;
  image: string;
  category: string;
}

const mockCatalog: MockProduct[] = [
  {
    id: "1",
    titleKey: "shop.productTicket1",
    descKey: "shop.detailDescTicket1",
    price: 99,
    originalPrice: 129,
    sales: 56,
    stock: 200,
    image: IMAGE_PATHS.PRODUCTS.TICKET_1,
    category: "ticket",
  },
  {
    id: "2",
    titleKey: "shop.productCreative1",
    descKey: "shop.detailDescCreative1",
    price: 29.9,
    originalPrice: 39.9,
    sales: 128,
    stock: 300,
    image: IMAGE_PATHS.PRODUCTS.MERCH_1,
    category: "creative",
  },
  {
    id: "3",
    titleKey: "shop.productFood1",
    descKey: "shop.detailDescFood1",
    price: 9.9,
    originalPrice: 15,
    sales: 234,
    stock: 500,
    image: IMAGE_PATHS.PRODUCTS.FOOD_1,
    category: "food",
  },
  {
    id: "4",
    titleKey: "shop.productGoods1",
    descKey: "shop.detailDescGoods1",
    price: 19.9,
    originalPrice: 25,
    sales: 89,
    stock: 400,
    image: IMAGE_PATHS.PRODUCTS.MERCH_2,
    category: "goods",
  },
  {
    id: "5",
    titleKey: "shop.productTicket2",
    descKey: "shop.detailDescTicket2",
    price: 15,
    originalPrice: 20,
    sales: 45,
    stock: 150,
    image: IMAGE_PATHS.PRODUCTS.TICKET_2,
    category: "ticket",
  },
  {
    id: "6",
    titleKey: "shop.productCreative2",
    descKey: "shop.detailDescCreative2",
    price: 12.9,
    originalPrice: 18,
    sales: 167,
    stock: 260,
    image: IMAGE_PATHS.PRODUCTS.FOOD_2,
    category: "creative",
  },
];

/** 商品名称（mock 取 i18n 文案；real 取后端 name） */
const productName = computed(() => {
  const p = product.value;
  if (!p) return "";
  return p.titleKey ? t(p.titleKey) : p.name;
});

/** 商品介绍（mock 取 i18n 文案；real 取后端 description） */
const productDescription = computed(() => {
  const p = product.value;
  if (!p) return "";
  return p.descKey ? t(p.descKey) : p.description;
});

/**
 * 加载商品详情。
 * @param id 商品 ID（query 传入）
 */
async function loadProduct(id: string): Promise<void> {
  loading.value = true;
  error.value = false;
  notFound.value = false;
  try {
    if (useMock()) {
      // mock：本地目录查找（无记录视为不存在）
      const mock = mockCatalog.find((m) => m.id === id);
      if (mock) {
        product.value = {
          id: Number(mock.id),
          name: "",
          description: "",
          price: mock.price,
          originalPrice: mock.originalPrice,
          imageUrl: mock.image,
          category: mock.category,
          sales: mock.sales,
          stock: mock.stock,
          createdAt: null,
          // mock 专有字段：i18n 文案键（见 productName / productDescription）
          titleKey: mock.titleKey,
          descKey: mock.descKey,
        };
      } else {
        notFound.value = true;
      }
      return;
    }
    const view = await request<ProductDetail>({
      url: `/products/${encodeURIComponent(id)}`,
      method: "GET",
    });
    product.value = view;
  } catch (loadError) {
    // 404：商品不存在或已下架 → 空态 + 返回；其余错误 → 错误态 + 重试
    const status =
      loadError !== null &&
      typeof loadError === "object" &&
      "status" in loadError
        ? (loadError as { status: number }).status
        : 0;
    if (status === 404) {
      notFound.value = true;
    } else {
      error.value = true;
    }
  } finally {
    loading.value = false;
  }
}

/** 返回上一页（无上一页时回首页 tab） */
function goBack(): void {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: "/pages/home/index" });
  }
}

/** 立即购买（占位：支付功能暂未开放） */
function handleBuyNow(): void {
  uni.showToast({ title: t("shop.buyUnavailable"), icon: "none" });
}

onLoad((query) => {
  const rawId = query?.id;
  if (typeof rawId === "string" && rawId.length > 0) {
    productId.value = rawId;
    void loadProduct(rawId);
  } else {
    notFound.value = true;
  }
});
</script>

<template>
  <view class="product-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view
        class="nav-bar__back press-feedback"
        hover-class="nav-bar__back--hover"
        hover-stay-time="100"
        role="button"
        :aria-label="t('common.backAria')"
        @tap="goBack"
      >
        <image class="nav-bar__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
      </view>
      <text class="nav-bar__title">{{ t('shop.detailTitle') }}</text>
      <view class="nav-bar__placeholder" />
    </view>

    <!-- 顶部安全区占位 -->
    <view class="safe-top" />

    <!-- 加载态 -->
    <view v-if="loading" class="product-state" role="status" aria-live="polite">
      <view class="product-state__spinner" />
      <text class="product-state__text">{{ t("shop.loading") }}</text>
    </view>

    <!-- 错误态（重试） -->
    <view v-else-if="error" class="product-state" role="alert">
      <text class="product-state__text">{{ t("shop.loadFailed") }}</text>
      <view
        class="product-state__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.retry')"
        @tap="loadProduct(productId)"
      >
        <text class="product-state__btn-text">{{ t("common.retry") }}</text>
      </view>
    </view>

    <!-- 空态（商品不存在/已下架） -->
    <view v-else-if="notFound" class="product-state">
      <EmptyState :title="t('shop.detailNotFound')" :desc="t('shop.detailNotFoundDesc')" />
      <view
        class="product-state__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('shop.detailBackShop')"
        @tap="goBack"
      >
        <text class="product-state__btn-text">{{ t('shop.detailBackShop') }}</text>
      </view>
    </view>

    <!-- 商品详情 -->
    <template v-else-if="product">
      <scroll-view scroll-y class="product-scroll">
        <!-- 商品大图 -->
        <view class="product-hero">
          <SafeImage :src="productImage" custom-class="product-hero__image" mode="aspectFill" :lazy-load="true" />
        </view>

        <!-- 名称 / 价格 / 销量 -->
        <view class="product-main">
          <text class="product-main__name">{{ productName }}</text>
          <view class="product-main__price-row">
            <text class="product-main__price">¥{{ product.price }}</text>
            <text v-if="product.originalPrice && product.originalPrice > 0" class="product-main__original-price">¥{{ product.originalPrice }}</text>
          </view>
          <view class="product-main__meta">
            <text class="product-main__meta-text">{{ t('shop.salesLabel', { n: product.sales ?? 0 }) }}</text>
            <text v-if="categoryLabel" class="product-main__meta-text">{{ categoryLabel }}</text>
            <text class="product-main__meta-text">{{ t('shop.stockLabel', { n: product.stock ?? 0 }) }}</text>
          </view>
        </view>

        <!-- 商品介绍 -->
        <view class="product-desc">
          <text class="product-desc__title">{{ t('shop.detailDescTitle') }}</text>
          <text class="product-desc__body">{{ productDescription || t('shop.detailDescEmpty') }}</text>
        </view>

        <!-- 底部留白（避免被购买栏遮挡） -->
        <view class="product-footer" />
      </scroll-view>

      <!-- 底部购买栏 -->
      <view class="product-buybar">
        <view
          class="product-buybar__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('shop.buyNow')"
          @tap="handleBuyNow"
        >
          <text class="product-buybar__btn-text">{{ t('shop.buyNow') }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.product-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-bg-page);
  box-sizing: border-box;
}

/* ==================== 顶部导航栏 ==================== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background: var(--c-bg-container);
  box-shadow: 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  position: relative;
  z-index: 1;
}

.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-container);
  border: var(--c-border-card);

  &--hover {
    background: var(--c-bg-page);
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.nav-bar__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.nav-bar__placeholder {
  width: 64rpx;
  height: 64rpx;
}

/* ==================== 安全区占位 ==================== */
.safe-top {
  height: calc(constant(safe-area-inset-top) + 0rpx);
  height: calc(env(safe-area-inset-top) + 0rpx);
  flex-shrink: 0;
}

/* ==================== 加载/错误/空态 ==================== */
.product-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: 120rpx 40rpx;
}

.product-state__spinner {
  width: 56rpx;
  height: 56rpx;
  border: 4rpx solid var(--c-neutral-100);
  border-top-color: var(--c-brand);
  border-radius: 50%;
  animation: product-spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes product-spin {
  to { transform: rotate(360deg); }
}

.product-state__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.product-state__btn {
  min-height: 80rpx;
  padding: 0 var(--sp-8);
  border-radius: var(--r-full);
  background: var(--c-brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-state__btn-text {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-inverse);
}

/* ==================== 滚动区域 ==================== */
.product-scroll {
  flex: 1;
  overflow: hidden;
}

/* ==================== 商品大图 ==================== */
.product-hero {
  width: 100%;
  height: 520rpx;
  background: var(--c-bg-container);
}

.product-hero__image {
  width: 100%;
  height: 100%;
}

/* ==================== 名称 / 价格 / 销量 ==================== */
.product-main {
  margin: 24rpx;
  padding: 32rpx;
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.product-main__name {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.4;
}

.product-main__price-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}

.product-main__price {
  font-size: var(--fs-5xl, 44rpx);
  font-weight: 800;
  color: var(--c-romance-500, #F4586C);
}

.product-main__original-price {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
  text-decoration: line-through;
}

.product-main__meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.product-main__meta-text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
}

/* ==================== 商品介绍 ==================== */
.product-desc {
  margin: 0 24rpx 24rpx;
  padding: 32rpx;
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.product-desc__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.product-desc__body {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  line-height: 1.7;
}

/* ==================== 底部留白 ==================== */
.product-footer {
  height: 160rpx;
}

/* ==================== 底部购买栏 ==================== */
.product-buybar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  background: var(--c-bg-container);
  box-shadow: 0 -2rpx 12rpx var(--c-neutral-shadow-xs);
  z-index: 10;
}

.product-buybar__btn {
  height: 96rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-300) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx var(--c-brand-border-tint-stronger);
}

.product-buybar__btn-text {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 600;
  color: var(--c-text-inverse);
}
</style>
