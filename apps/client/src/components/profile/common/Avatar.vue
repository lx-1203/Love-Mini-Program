<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
  src?: string;
  size?: number;
  name?: string;
}>(), {
  src: "",
  size: 96,
  name: "",
});

const emit = defineEmits<{ (e: "tap"): void }>();

const initial = computed(() => (props.name || "?").charAt(0));
</script>

<template>
  <view
    class="profile-avatar"
    :style="{ width: `${size}rpx`, height: `${size}rpx` }"
    @tap="emit('tap')"
  >
    <image
      v-if="src"
      class="profile-avatar__img"
      :src="src"
      mode="aspectFill"
      alt=""
    />
    <text v-else class="profile-avatar__initial">{{ initial }}</text>
  </view>
</template>

<style scoped lang="scss">
.profile-avatar {
  overflow: hidden;
  border-radius: 50%;
  background: #DFF8EF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar__img {
  width: 100%;
  height: 100%;
}

.profile-avatar__initial {
  font-size: 36rpx;
  font-weight: 700;
  color: #36C99A;
}
</style>



