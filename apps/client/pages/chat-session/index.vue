<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import BottomActionBar from "../../src/components/common/BottomActionBar.vue";
import StatusState from "../../src/components/common/StatusState.vue";
import ChatBubble from "../../src/components/chat/ChatBubble.vue";
import { useChatStore } from "../../src/stores/chat";
import { usePageAccess } from "../../src/composables/usePageAccess";
import { chatPageRequirements } from "../../src/config/page-access";

const chatStore = useChatStore();
const draft = ref("想不想交换一条轻松一点的校园散步路线？");
const sessionId = ref<string | null>(null);
const pageErrorMessage = ref<string | null>(null);

usePageAccess(chatPageRequirements);

onLoad((query) => {
  if (query && typeof query.sessionId === "string" && query.sessionId.trim().length > 0) {
    sessionId.value = query.sessionId;
    pageErrorMessage.value = null;
    return;
  }

  pageErrorMessage.value = "缺少会话标识，请从聊天列表或匹配结果进入。";
  chatStore.activeSession = null;
});

onShow(() => {
  if (!sessionId.value) {
    return;
  }

  void chatStore.loadSession(sessionId.value);
});

async function sendText() {
  if (!draft.value.trim()) {
    return;
  }

  await chatStore.sendText(draft.value);
  draft.value = "";
}
</script>

<template>
  <AppShell
    title="临时聊天"
    :subtitle="chatStore.activeSession?.partnerHeadline || '当前只支持文字、语音、表情和系统卡片。'"
    :show-tab-bar="false"
  >
    <SectionCard title="会话状态" compact>
      <StatusState
        v-if="chatStore.activeSession"
        tone="brand"
        :label="chatStore.activeSession.contactExchangeLabel"
      />
      <text class="meta-copy">
        {{ chatStore.activeSession?.availabilityHint || '24 小时倒计时和联系方式交换都由状态机驱动。' }}
      </text>
    </SectionCard>

    <SectionCard title="消息" compact>
      <view v-if="pageErrorMessage" class="meta-copy">{{ pageErrorMessage }}</view>
      <view v-else-if="chatStore.loadingSession" class="meta-copy">正在加载聊天详情...</view>
      <view v-else-if="chatStore.errorMessage" class="meta-copy">{{ chatStore.errorMessage }}</view>
      <view v-else class="chat-list">
        <ChatBubble
          v-for="message in chatStore.activeSession?.messages || []"
          :key="message.id"
          :sender="message.sender"
          :kind="message.kind"
          :body="message.body"
          :sent-at="message.sentAt"
          :duration-seconds="message.durationSeconds"
        />
        <text v-if="!chatStore.activeSession?.messages.length" class="meta-copy">
          会话刚建立，还没有消息。
        </text>
      </view>
    </SectionCard>

    <SectionCard title="操作" compact>
      <view v-if="pageErrorMessage" class="meta-copy">{{ pageErrorMessage }}</view>
      <template v-else>
        <textarea
          v-model="draft"
          class="draft"
          maxlength="240"
          :disabled="chatStore.activeSession?.phase === 'closed'"
        />
        <BottomActionBar
          primary-label="发送文字"
          secondary-label="同意交换"
          @primary="sendText"
          @secondary="chatStore.acceptExchange('self')"
        />
        <BottomActionBar
          primary-label="发送语音"
          secondary-label="结束会话"
          @primary="chatStore.sendVoice(8)"
          @secondary="chatStore.endSession()"
        />
      </template>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.meta-copy {
  color: var(--td-text-color-secondary);
  font-size: 24rpx;
  line-height: 1.6;
}

.chat-list {
  display: grid;
  gap: 16rpx;
}

.draft {
  width: 100%;
  min-height: 180rpx;
  padding: 18rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: var(--td-bg-app-page);
}
</style>
