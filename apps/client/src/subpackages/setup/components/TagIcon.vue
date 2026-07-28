<template>
  <view class="tag-icon" aria-hidden="true">
    <!-- 阅读 -->
    <svg
      v-if="name === 'reading'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 19.5V5.5C4 4.4 4.4 3.5 6 3.5H20V17.5H6C5.45 17.5 4 17.5 4 19.5Z"
        stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"
      />
      <path
        d="M4 19.5C4 17.5 5.45 17.5 6 17.5H20"
        stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"
      />
      <path
        d="M8 8.5H16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
      />
      <path
        d="M8 11.5H14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
      />
    </svg>

    <!-- 运动 -->
    <svg
      v-else-if="name === 'sports'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/>
      <path d="M12 4C12 4 14 8 14 12C14 16 12 20 12 20" stroke="currentColor" stroke-width="1.6"/>
      <path d="M12 4C12 4 10 8 10 12C10 16 12 20 12 20" stroke="currentColor" stroke-width="1.6"/>
      <path d="M4 12H20" stroke="currentColor" stroke-width="1.6"/>
    </svg>

    <!-- 音乐 -->
    <svg
      v-else-if="name === 'music'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="7" cy="18" r="3" stroke="currentColor" stroke-width="1.6"/>
      <path d="M10 18V5L21 7V16" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.6"/>
      <path d="M10 12L21 14" stroke="currentColor" stroke-width="1.6"/>
    </svg>

    <!-- 电影 -->
    <svg
      v-else-if="name === 'movie'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <path d="M8 6V18" stroke="currentColor" stroke-width="1.6"/>
      <path d="M16 6V18" stroke="currentColor" stroke-width="1.6"/>
      <path d="M2 10H8" stroke="currentColor" stroke-width="1.6"/>
      <path d="M16 10H22" stroke="currentColor" stroke-width="1.6"/>
      <path d="M2 14H8" stroke="currentColor" stroke-width="1.6"/>
      <path d="M16 14H22" stroke="currentColor" stroke-width="1.6"/>
    </svg>

    <!-- 旅行 -->
    <svg
      v-else-if="name === 'travel'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 15L7 13L11 19L15 10L21 7L18 14L13 18L9 12L3 15Z"
        stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"
      />
      <path
        d="M15 10L20 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
      />
    </svg>

    <!-- 摄影 -->
    <svg
      v-else-if="name === 'photography'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 8H6L8 5H16L18 8H20V19H4V8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="12" cy="13" r="1.5" fill="currentColor"/>
    </svg>

    <!-- 游戏 -->
    <svg
      v-else-if="name === 'gaming'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 7H18C20.4 7 22 8.5 22 10.5V17.5C22 19 21 20 19.5 20C18.5 20 18 19.5 17.5 18.5L16 16H8L6.5 18.5C6 19.5 5.5 20 4.5 20C3 20 2 19 2 17.5V10.5C2 8.5 3.6 7 6 7Z"
        stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"
      />
      <circle cx="8" cy="12" r="1" fill="currentColor"/>
      <circle cx="16" cy="12" r="1" fill="currentColor"/>
      <path d="M13 11V13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M14 12H12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M18 11V13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M19 12H17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>

    <!-- 美食 -->
    <svg
      v-else-if="name === 'cooking'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 12H19C19 12 20 12 20 13V16C20 18 18 20 15 20H9C6 20 4 18 4 16V13C4 12 5 12 5 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M7 12V10C7 7.5 8.5 6 11 6H13C15.5 6 17 7.5 17 10V12" stroke="currentColor" stroke-width="1.6"/>
      <path d="M12 6V3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M9 4L8 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M15 4L16 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>

    <!-- 绘画 -->
    <svg
      v-else-if="name === 'painting'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/>
      <path d="M12 8V4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12 20V16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M16 12H20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M4 12H8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>

    <!-- 舞蹈 -->
    <svg
      v-else-if="name === 'dance'"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="14" cy="5" r="2" stroke="currentColor" stroke-width="1.6"/>
      <path d="M12 9L10 13L14 16L12 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 13L6 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M14 16L18 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
}>();
</script>

<style scoped lang="scss">
.tag-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: inherit;
  flex-shrink: 0;
}
</style>
