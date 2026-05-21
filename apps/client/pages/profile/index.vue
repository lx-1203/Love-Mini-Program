<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import StatusState from "../../src/components/common/StatusState.vue";
import { useSessionStore } from "../../src/stores/session";
import { toProfileCompletion } from "../../src/view-models/profile";
import { usePageAccess } from "../../src/composables/usePageAccess";
import { openAppPath } from "../../src/utils/navigation";

const sessionStore = useSessionStore();
const { userSession } = storeToRefs(sessionStore);

usePageAccess({
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
});

const completion = computed(() =>
  userSession.value ? toProfileCompletion(userSession.value) : []
);

function open(url: string) {
  openAppPath(url);
}
</script>

<template>
  <AppShell
    title="我的"
    subtitle="完成度清单、资料设置和支持入口都放在这里。"
    current-tab="profile"
  >
    <SectionCard title="完成情况" compact>
      <view v-for="item in completion" :key="item.id" class="row">
        <text>{{ item.title }}</text>
        <StatusState :tone="item.done ? 'success' : 'warning'" :label="item.done ? '已完成' : '待完成'" />
      </view>
    </SectionCard>

    <SectionCard title="继续完善" compact>
      <view class="link-row" @click="open('/subpackages/setup/profile/index')">基础资料</view>
      <view class="link-row" @click="open('/subpackages/setup/campus/index')">学校信息</view>
      <view class="link-row" @click="open('/subpackages/setup/schedule/index')">时间安排</view>
    </SectionCard>

    <SectionCard title="支持入口" compact>
      <view class="link-row" @click="open('/subpackages/support/feedback/index')">反馈中心</view>
      <view class="link-row" @click="open('/pages/discussions/index')">讨论圈</view>
      <view class="link-row" @click="open('/pages/activities/index')">活动</view>
      <view class="link-row" @click="open('/pages/chat/index')">聊天列表</view>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.row,
.link-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-top: 1px solid var(--td-border-level-1-color);
}

.row:first-child,
.link-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.link-row {
  color: var(--td-text-color-primary);
}
</style>
