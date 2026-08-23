<script setup lang="ts">
withDefaults(defineProps<{
  src?: string;
  auditStatus?: string;
  index?: number;
  editable?: boolean;
}>(), {
  src: "",
  auditStatus: "approved",
  index: 0,
  editable: false,
});

const emit = defineEmits<{
  (e: "tap", index: number): void;
  (e: "delete", index: number): void;
}>();
</script>

<template>
  <view class="photo-card" @tap="emit('tap', index)">
    <image v-if="src" class="photo-card__img" :src="src" mode="aspectFill" alt="" />
    <view v-else class="photo-card__empty">
      <text class="photo-card__empty-text">+</text>
    </view>
    <view v-if="src && auditStatus === 'pending'" class="photo-card__badge">
      <text class="photo-card__badge-text">审核中</text>
    </view>
    <view v-if="src && auditStatus === 'rejected'" class="photo-card__badge photo-card__badge--rejected">
      <text class="photo-card__badge-text">未通过</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.photo-card {
  position: relative;
  width: 216rpx;
  height: 216rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #E8FBF3;
}

.photo-card__img {
  width: 100%;
  height: 100%;
}

.photo-card__empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-card__empty-text {
  font-size: 64rpx;
  color: #36C99A;
}

.photo-card__badge {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 6rpx 0;
  background: rgba(32, 201, 151, 0.9);
}

.photo-card__badge--rejected {
  background: rgba(255, 111, 174, 0.9);
}

.photo-card__badge-text {
  font-size: 20rpx;
  color: #ffffff;
  text-align: center;
  display: block;
}
</style>



