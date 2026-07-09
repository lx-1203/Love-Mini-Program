<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { useSessionStore } from "./src/stores/session";

const sessionStore = useSessionStore();

onLaunch(() => {
  void sessionStore.bootstrap();
});
</script>

<style lang="scss">
page {
  background: var(--td-bg-app-page, #f4f7fb);
  color: var(--td-text-color-primary, #111827);
  font-family:
    "Segoe UI",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    sans-serif;
}

/* ================================================================
   页面过渡动画
   页面切换时内容从 opacity: 0 淡入到 1，持续 250ms
   ================================================================ */
/* 全局页面容器在进入时自动淡入 */
page {
  animation: page-fade-in 250ms cubic-bezier(0.4, 0, 0.2, 1) both;
}
</style>
