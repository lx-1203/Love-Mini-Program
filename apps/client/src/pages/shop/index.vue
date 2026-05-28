<script setup lang="ts">
/**
 * 逛逛页 - 校内商品/票务/优惠券展示
 */
import { ref } from "vue";
import { openAppPath } from "../../utils/navigation";

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
    image: "https://picsum.photos/300/300?random=10",
    category: "ticket",
    tag: "热销",
  },
  {
    id: "2",
    title: "校园文创帆布袋",
    price: 29.9,
    originalPrice: 39.9,
    sales: 128,
    image: "https://picsum.photos/300/300?random=11",
    category: "creative",
    tag: "新品",
  },
  {
    id: "3",
    title: "食堂午餐优惠券",
    price: 9.9,
    originalPrice: 15,
    sales: 234,
    image: "https://picsum.photos/300/300?random=12",
    category: "food",
    tag: "限时",
  },
  {
    id: "4",
    title: "校徽纪念徽章",
    price: 19.9,
    originalPrice: 25,
    sales: 89,
    image: "https://picsum.photos/300/300?random=13",
    category: "goods",
    tag: "",
  },
  {
    id: "5",
    title: "篮球赛门票",
    price: 15,
    originalPrice: 20,
    sales: 45,
    image: "https://picsum.photos/300/300?random=14",
    category: "ticket",
    tag: "",
  },
  {
    id: "6",
    title: "校园手绘地图",
    price: 12.9,
    originalPrice: 18,
    sales: 167,
    image: "https://picsum.photos/300/300?random=15",
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
  <view class="shop-page">
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
            class="category-item"
            :class="{ 'category-item--active': activeCategory === cat.id }"
            @click="activeCategory = cat.id"
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
          class="shop-card"
          @click="goToDetail(item.id)"
        >
          <view class="shop-card__image-wrap">
            <image class="shop-card__image" :src="item.image" mode="aspectFill" />
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
.shop-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 页面标题 ========== */
.shop-header {
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  background: linear-gradient(to bottom, var(--td-bg-app-page), transparent);
  z-index: 10;
}

.shop-header__title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

/* ========== 分类标签 ========== */
.category-bar {
  padding: 0 32rpx 16rpx;
}

.category-scroll {
  width: 100%;
}

.category-list {
  display: flex;
  gap: 16rpx;
  padding-right: 32rpx;
}

.category-item {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid var(--td-border-level-1-color);
}

.category-item__text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
}

.category-item--active {
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
  border: 1px solid transparent;
}

.category-item--active .category-item__text {
  color: #ffffff;
  font-weight: 600;
}

/* ========== 滚动区域 ========== */
.shop-scroll {
  flex: 1;
  overflow: hidden;
}

/* ========== 商品网格 ========== */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  padding: 0 32rpx;
}

.shop-card {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
}

.shop-card__image-wrap {
  position: relative;
  width: 100%;
  height: 300rpx;
}

.shop-card__image {
  width: 100%;
  height: 100%;
  background: var(--td-bg-color-surface);
}

.shop-card__tag {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.shop-card__tag text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 600;
}

.shop-card__info {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.shop-card__title {
  font-size: 26rpx;
  color: var(--td-text-color-primary);
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
  font-size: 32rpx;
  font-weight: 700;
  color: #ef4444;
}

.shop-card__original-price {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  text-decoration: line-through;
}

.shop-card__sales {
  font-size: 20rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 底部留白 ========== */
.shop-footer {
  height: 40rpx;
}
</style>
