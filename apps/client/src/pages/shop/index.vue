<script setup lang="ts">
/**
 * 逛逛页 - 校内商品/票务/优惠券展示
 */
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { openAppPath } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";

// 分类标签
const categories = ref([
  { id: "all", name: "全部" },
  { id: "ticket", name: "活动票务" },
  { id: "food", name: "餐饮美食" },
  { id: "goods", name: "校园周边" },
  { id: "creative", name: "文创周边" },
]);
const activeCategory = ref("all");

// 商品列表（模拟）
const shopItems = ref([
  {
    id: "1",
    title: "校园音乐节早鸟票",
    price: 99,
    originalPrice: 129,
    sales: 56,
    image: IMAGE_PATHS.PRODUCTS.TICKET_1,
    category: "ticket",
    tag: "热销",
  },
  {
    id: "2",
    title: "校园文创帆布袋",
    price: 29.9,
    originalPrice: 39.9,
    sales: 128,
    image: IMAGE_PATHS.PRODUCTS.MERCH_1,
    category: "creative",
    tag: "新品",
  },
  {
    id: "3",
    title: "食堂午餐优惠券",
    price: 9.9,
    originalPrice: 15,
    sales: 234,
    image: IMAGE_PATHS.PRODUCTS.FOOD_1,
    category: "food",
    tag: "限时",
  },
  {
    id: "4",
    title: "校徽纪念徽章",
    price: 19.9,
    originalPrice: 25,
    sales: 89,
    image: IMAGE_PATHS.PRODUCTS.MERCH_2,
    category: "goods",
    tag: "",
  },
  {
    id: "5",
    title: "篮球赛门票",
    price: 15,
    originalPrice: 20,
    sales: 45,
    image: IMAGE_PATHS.PRODUCTS.TICKET_2,
    category: "ticket",
    tag: "",
  },
  {
    id: "6",
    title: "校园手绘地图",
    price: 12.9,
    originalPrice: 18,
    sales: 167,
    image: IMAGE_PATHS.PRODUCTS.FOOD_2,
    category: "creative",
    tag: "推荐",
  },
]);

const filteredItems = computed(() => {
  if (activeCategory.value === "all") return shopItems.value;
  return shopItems.value.filter((item) => item.category === activeCategory.value);
});

import { computed } from "vue";

function goToDetail(itemId: string) {
  openAppPath(`/subpackages/shop/detail/index?id=${itemId}`);
}
</script>

<template>
  <view class="shop-page page-fade-in">
    <!-- 页面标题 -->
    <view class="shop-header">
      <text class="shop-header__title">逛逛</text>
    </view>

    <!-- 分类标签 -->
    <view class="category-bar">
      <scroll-view scroll-x class="category-scroll" show-scrollbar="false">
        <view class="category-list">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="category-item press-feedback list-item"
            :class="{ 'category-item--active': activeCategory === cat.id }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="activeCategory = cat.id"
          >
            <text class="category-item__text">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 商品网格 -->
    <scroll-view scroll-y class="shop-scroll">
      <view class="shop-grid">
        <view
          v-for="item in filteredItems"
          :key="item.id"
          class="shop-card press-feedback list-item"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="goToDetail(item.id)"
        >
          <view class="shop-card__image-wrap">
            <SafeImage :src="item.image" custom-class="shop-card__image" mode="aspectFill" />
            <view v-if="item.tag" class="shop-card__tag">
              <text>{{ item.tag }}</text>
            </view>
          </view>
          <view class="shop-card__info">
            <text class="shop-card__title">{{ item.title }}</text>
            <view class="shop-card__price-row">
              <text class="shop-card__price">¥{{ item.price }}</text>
              <text class="shop-card__original-price">¥{{ item.originalPrice }}</text>
            </view>
            <text class="shop-card__sales">已售 {{ item.sales }}</text>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="shop-footer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: #3FCF8E;
$green-light: #E8F9F1;
$pink-primary: #EC4899;
$pink-light: #FCE7F3;
$gold-vip: #C9A36A;
$white: #FFFFFF;
$bg-page: #F4F6FA;
$text-primary: #1F2937;
$text-secondary: #6B7280;
$text-tertiary: #9CA3AF;
$border-light: #F3F4F6;
$card-soft-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

.shop-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(180deg, #F0FDF8 0%, $bg-page 40%);
}

/* ========== 页面标题 ========== */
.shop-header {
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  background: transparent;
  z-index: 10;
}

.shop-header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: $text-primary;
  // #ifdef H5
  background: linear-gradient(135deg, $green-primary, $pink-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // #endif
  // #ifndef H5
  color: #3FCF8E; // mp-weixin 降级：使用纯色（取渐变中间色）
  // #endif
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
  border-radius: 999px;
  background: $white;
  border: 2rpx solid transparent;
  box-shadow: $card-soft-shadow;
  transition: all 0.2s ease;
}

.category-item:active {
  transform: scale(0.96);
}

.category-item__text {
  font-size: 26rpx;
  color: $text-secondary;
  font-weight: 500;
}

.category-item--active {
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  border: 2rpx solid transparent;
  box-shadow: 0 4rpx 16rpx rgba(63, 207, 142, 0.3);
}

.category-item--active .category-item__text {
  color: $white;
  font-weight: 700;
}

/* ========== 滚动区域 ========== */
.shop-scroll {
  flex: 1;
  overflow: hidden;
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
  background: $white;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: $card-soft-shadow;
  border: none;
  transition: all 0.15s ease;
}

.shop-card:active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

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
  border-radius: 999px;
  background: linear-gradient(135deg, $pink-primary, #F472B6);
  box-shadow: 0 4rpx 12rpx rgba(236, 72, 153, 0.3);
}

.shop-card__tag text {
  font-size: 20rpx;
  color: $white;
  font-weight: 700;
}

.shop-card__info {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.shop-card__title {
  font-size: 26rpx;
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
  font-size: 36rpx;
  font-weight: 800;
  color: $pink-primary;
}

.shop-card__original-price {
  font-size: 22rpx;
  color: $text-tertiary;
  text-decoration: line-through;
}

.shop-card__sales {
  font-size: 22rpx;
  color: $text-tertiary;
}

/* ========== 底部留白 ========== */
.shop-footer {
  height: 60rpx;
}
</style>
