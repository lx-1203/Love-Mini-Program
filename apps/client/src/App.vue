<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { useSessionStore } from "./stores/session";

const sessionStore = useSessionStore();

onLaunch(() => {
  void sessionStore.bootstrap();
});
</script>

<style lang="scss">
@use "./uni.scss" as *;

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
</style>
