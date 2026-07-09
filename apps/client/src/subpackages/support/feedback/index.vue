<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import StatusState from "../../../components/common/StatusState.vue";
import { useFeedbackStore } from "../../../stores/feedback";
import {
  toSubmissionStatusLabel,
  toSubmissionStatusTone,
} from "../../../view-models/feedback";

const feedbackStore = useFeedbackStore();
const activeType = ref<"feedback" | "suggestion" | "activity_proposal">("feedback");
const form = reactive({
  title: "",
  content: "",
  contactWechat: "",
  attachments: [],
  expectedCity: null,
  expectedCampus: null,
});

onMounted(() => {
  void feedbackStore.load();
});

async function submit() {
  if (activeType.value === "feedback") {
    await feedbackStore.submitIssue(form);
  } else if (activeType.value === "suggestion") {
    await feedbackStore.submitSuggestion(form);
  } else {
    await feedbackStore.submitActivityProposal(form);
  }
  form.title = "";
  form.content = "";
  form.contactWechat = "";
}
</script>

<template>
  <AppShell title="反馈中心" subtitle="反馈、建议和活动提案共用一个入口。" :show-tab-bar="false">
    <SectionCard title="新建提交" compact>
      <view class="chips">
        <text class="chip" @tap="activeType = 'feedback'">反馈</text>
        <text class="chip" @tap="activeType = 'suggestion'">建议</text>
        <text class="chip" @tap="activeType = 'activity_proposal'">活动提案</text>
      </view>
      <input v-model="form.title" class="field" placeholder="标题" />
      <textarea v-model="form.content" class="field field--textarea" maxlength="280" />
      <input v-model="form.contactWechat" class="field" placeholder="选填微信号" />
      <BottomActionBar primary-label="提交" @primary="submit" />
    </SectionCard>

    <SectionCard title="提交记录" compact>
      <view v-for="item in feedbackStore.submissions" :key="item.id" class="submission">
        <view class="submission__top">
          <text class="submission__title">{{ item.title }}</text>
          <StatusState
            :tone="toSubmissionStatusTone(item.status)"
            :label="toSubmissionStatusLabel(item.status)"
          />
        </view>
        <text class="submission__summary">{{ item.latestReplySummary }}</text>
      </view>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.chip {
  padding: 12rpx 18rpx;
  border-radius: 999px;
  background: var(--c-bg-brand);
  color: var(--c-brand-700);
}

.field {
  width: 100%;
  min-height: 88rpx;
  padding: 18rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: var(--c-bg-page);
}

.field--textarea {
  min-height: 180rpx;
}

.submission {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 18rpx 0;
  border-top: 1px solid var(--c-border-light);
}

.submission:first-child {
  padding-top: 0;
  border-top: 0;
}

.submission__top {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.submission__title {
  font-weight: 700;
}

.submission__summary {
  color: var(--c-text-secondary);
  line-height: 1.6;
}
</style>
