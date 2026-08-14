<!-- ============================================================
  ChatSessionPage - 聊天详情页设计稿
  设计亮点：
  1. 顶部会话信息栏采用毛玻璃 + 渐变边框
  2. 消息气泡增加 sender="system" 的渐变提示
  3. 底部输入区增加语音/表情/更多操作切换
  4. 24小时倒计时用环形进度条展示
============================================================ -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { designTokens } from '../tokens';
import AppShell from '../components/AppShell.vue';
import ChatBubble from '../components/ChatBubble.vue';
import BottomActionBar from '../components/BottomActionBar.vue';

const t = computed(() => designTokens);

const messages = ref([
  { sender: 'system' as const, kind: 'system' as const, body: '你们已成功匹配，开始聊天吧！', sentAt: '14:00' },
  { sender: 'peer' as const, kind: 'text' as const, body: '你好呀，看到你也喜欢摄影', sentAt: '14:02' },
  { sender: 'self' as const, kind: 'text' as const, body: '对呀！你平时拍什么类型比较多？', sentAt: '14:03', status: 'read' as const },
  { sender: 'peer' as const, kind: 'voice' as const, durationSeconds: 8, sentAt: '14:05' },
  { sender: 'self' as const, kind: 'text' as const, body: '哈哈，我也觉得校园里的光影特别好看', sentAt: '14:06', status: 'sent' as const },
]);

const timeLeft = ref(18); // 小时
const progress = computed(() => (timeLeft.value / 24) * 100);

const inputMode = ref<'text' | 'voice'>('text');
const inputText = ref('');

const headerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${t.value.spacing[3]}rpx ${t.value.layout.pagePadding}rpx`,
  background: t.value.color.gradient.brand,
  borderBottom: `1rpx solid ${t.value.color.border.light}`,
}));

const countdownStyle = computed(() => ({
  width: '48rpx',
  height: '48rpx',
  borderRadius: `${t.value.radius.full}rpx`,
  background: `conic-gradient(${t.value.color.brand[400]} ${progress.value}%, ${t.value.color.border.light} 0)`,
  display: 'grid',
  placeItems: 'center',
  position: 'relative',
}));

const inputAreaStyle = computed(() => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  padding: `${t.value.spacing[3]}rpx ${t.value.layout.pagePadding}rpx`,
  paddingBottom: `${t.value.spacing[3] + t.value.layout.safeBottom}rpx`,
  background: t.value.color.bg.container,
  borderTop: `1rpx solid ${t.value.color.border.light}`,
  display: 'flex',
  alignItems: 'center',
  gap: `${t.value.spacing[2]}rpx`,
}));

const inputStyle = computed(() => ({
  flex: 1,
  height: `${t.value.component.input.height}rpx`,
  borderRadius: `${t.value.component.input.radius}rpx`,
  background: t.value.color.bg.surface,
  padding: `0 ${t.value.spacing[3]}rpx`,
  fontSize: `${t.value.typography.size.body}rpx`,
  color: t.value.color.text.primary,
}));

function sendMessage() {
  if (!inputText.value.trim()) return;
  messages.value.push({
    sender: 'self',
    kind: 'text',
    body: inputText.value,
    sentAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    status: 'sending',
  });
  inputText.value = '';
}
</script>

<template>
  <AppShell title="聊天" :show-tab-bar="false">
    <!-- 会话头部 -->
    <view :style="headerStyle">
      <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[3]}rpx` }">
        <view :style="{
          width: `${t.component.avatar.sm}rpx`,
          height: `${t.component.avatar.sm}rpx`,
          borderRadius: `${t.radius.full}rpx`,
          background: t.color.gradient.brand,
          display: 'grid',
          placeItems: 'center',
          color: t.color.text.inverse,
          fontSize: `${t.typography.size.body}rpx`,
          fontWeight: t.typography.weight.bold,
        }">
          小
        </view>
        <view>
          <text :style="{ fontSize: `${t.typography.size.body}rpx`, fontWeight: t.typography.weight.semibold, display: 'block', color: t.color.text.inverse }">
            小雨
          </text>
          <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: 'rgba(255,255,255,0.85)' }">
            计算机学院 · 在线
          </text>
        </view>
      </view>

      <!-- 24h 倒计时 -->
      <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[2]}rpx` }">
        <view :style="countdownStyle">
          <view :style="{
            width: '40rpx',
            height: '40rpx',
            borderRadius: `${t.radius.full}rpx`,
            background: t.color.bg.container,
            display: 'grid',
            placeItems: 'center',
            fontSize: `${t.typography.size.overline}rpx`,
            fontWeight: t.typography.weight.bold,
            color: t.color.text.primary,
          }">
            {{ timeLeft }}
          </view>
        </view>
        <text :style="{ fontSize: `${t.typography.size.overline}rpx`, color: t.color.text.tertiary }">h</text>
      </view>
    </view>

    <!-- 消息列表 -->
    <view :style="{ padding: `${t.spacing[4]}rpx`, display: 'flex', flexDirection: 'column', gap: `${t.spacing[2]}rpx`, paddingBottom: '140rpx' }">
      <ChatBubble
        v-for="(msg, index) in messages"
        :key="index"
        :sender="msg.sender"
        :kind="msg.kind"
        :body="msg.body"
        :duration-seconds="msg.durationSeconds"
        :sent-at="msg.sentAt"
        :status="msg.status"
      />
    </view>

    <!-- 输入区 -->
    <view :style="inputAreaStyle">
      <view
        :style="{
          width: `${t.component.button.height.sm}rpx`,
          height: `${t.component.button.height.sm}rpx`,
          borderRadius: `${t.radius.full}rpx`,
          background: t.color.bg.surface,
          display: 'grid',
          placeItems: 'center',
          fontSize: `${t.typography.size.h4}rpx`,
          color: t.color.text.secondary,
        }"
        @click="inputMode = inputMode === 'text' ? 'voice' : 'text'"
      >
        {{ inputMode === 'text' ? '🎤' : '⌨' }}
      </view>

      <input
        v-if="inputMode === 'text'"
        v-model="inputText"
        :style="inputStyle"
        placeholder="说点什么..."
        placeholder-style="color: #9BA3B4"
        confirm-type="send"
        @confirm="sendMessage"
      />
      <view
        v-else
        :style="{ ...inputStyle, display: 'grid', placeItems: 'center', color: t.color.text.tertiary }"
      >
        按住说话
      </view>

      <view
        :style="{
          width: `${t.component.button.height.sm}rpx`,
          height: `${t.component.button.height.sm}rpx`,
          borderRadius: `${t.radius.full}rpx`,
          background: inputText ? t.color.gradient.brand : t.color.bg.surface,
          display: 'grid',
          placeItems: 'center',
          fontSize: `${t.typography.size.h4}rpx`,
          color: inputText ? t.color.text.inverse : t.color.text.brand,
          transition: `all ${t.motion.duration.fast}ms`,
        }"
        @click="sendMessage"
      >
        ↑
      </view>
    </view>
  </AppShell>
</template>
