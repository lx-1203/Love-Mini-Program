<script setup lang="ts">
import { onMounted } from "vue";
import { useSessionStore } from "./stores/session";

const sessionStore = useSessionStore();

onMounted(async () => {
  await sessionStore.bootstrap();
});
</script>

<template>
  <view class="app-container">
    <router-view />
  </view>
</template>

<style>
.app-container {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
