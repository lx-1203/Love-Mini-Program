<script setup lang="ts">
/**
 * @deprecated 匹配页已降级为废弃页面，仅供参考回滚使用。
 * 迁移路径：match → likes（喜欢页）+ discover（寻觅页）
 * 原话题匹配/一键速配逻辑已融入卡片喜欢系统。
 * 请使用 /pages/likes/index 和 /pages/discover/index 作为新的匹配入口。
 */
import MatchPage from "../../../pages/match/index.vue";
</script>

<template>
  <MatchPage />
</template>
