<!-- ============================================================
  MatchPage - 匹配页设计稿
  设计亮点：
  1. 状态展示采用大图标 + 渐变背景的情绪化设计
  2. 匹配成功时全屏渐变动画
  3. 进度条采用品牌渐变
  4. 状态切换有平滑过渡动效
============================================================ -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { designTokens } from '../tokens';
import AppShell from '../components/AppShell.vue';
import SectionCard from '../components/SectionCard.vue';
import StatusState from '../components/StatusState.vue';
import BottomActionBar from '../components/BottomActionBar.vue';
import EducationBadge from '../components/EducationBadge.vue';

const t = computed(() => designTokens);

const matchStatus = ref<'idle' | 'queued' | 'connected' | 'expired'>('idle');
const matchProgress = ref(0);

const statusConfig = {
  idle: {
    icon: '💫',
    title: '开始匹配',
    subtitle: '基于你的课表和兴趣，找到志同道合的同学',
    gradient: t.value.color.gradient.brand,
    buttonLabel: '立即匹配',
  },
  queued: {
    icon: '⏳',
    title: '匹配中...',
    subtitle: '正在为你寻找合适的人，请稍候',
    gradient: t.value.color.gradient.secondary,
    buttonLabel: '取消排队',
  },
  connected: {
    icon: '🎉',
    title: '匹配成功！',
    subtitle: '你们有 3 个共同兴趣，课表重叠 2 节课',
    gradient: t.value.color.gradient.brand,
    buttonLabel: '开始聊天',
  },
  expired: {
    icon: '💤',
    title: '匹配已过期',
    subtitle: '这次没有成功，再试一次吧',
    gradient: 'linear-gradient(135deg, #C4CBD8 0%, #9BA3B4 100%)',
    buttonLabel: '重新匹配',
  },
};

const currentStatus = computed(() => statusConfig[matchStatus.value]);

const heroStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${t.value.spacing[10]}rpx ${t.value.spacing[6]}rpx`,
  borderRadius: `${t.value.component.card.radius}rpx`,
  background: currentStatus.value.gradient,
  color: t.value.color.text.inverse,
  boxShadow: t.value.shadow.lg,
  transition: `all ${t.value.motion.duration.slow}ms ${t.value.motion.easing.default}`,
}));

const iconStyle = computed(() => ({
  fontSize: '80rpx',
  marginBottom: `${t.value.spacing[4]}rpx`,
  animation: matchStatus.value === 'queued' ? 'pulse 1.5s ease-in-out infinite' : 'none',
}));

const progressStyle = computed(() => ({
  width: '100%',
  height: '8rpx',
  borderRadius: `${t.value.radius.full}rpx`,
  background: 'rgba(255,255,255,0.3)',
  marginTop: `${t.value.spacing[4]}rpx`,
  overflow: 'hidden',
}));

const progressFillStyle = computed(() => ({
  width: `${matchProgress.value}%`,
  height: '100%',
  borderRadius: `${t.value.radius.full}rpx`,
  background: 'rgba(255,255,255,0.9)',
  transition: `width ${t.value.motion.duration.normal}ms ${t.value.motion.easing.default}`,
}));

function handleAction() {
  if (matchStatus.value === 'idle') {
    matchStatus.value = 'queued';
    matchProgress.value = 0;
    const interval = setInterval(() => {
      matchProgress.value += Math.random() * 15;
      if (matchProgress.value >= 100) {
        clearInterval(interval);
        matchStatus.value = 'connected';
      }
    }, 500);
  } else if (matchStatus.value === 'queued') {
    matchStatus.value = 'idle';
    matchProgress.value = 0;
  } else if (matchStatus.value === 'connected') {
    // 跳转聊天
    uni.navigateTo({ url: '/pages/chat-session/index' });
  } else if (matchStatus.value === 'expired') {
    matchStatus.value = 'idle';
  }
}
</script>

<template>
  <AppShell title="匹配" current-tab="match">
    <!-- 状态展示区 -->
    <view :style="heroStyle">
      <text :style="iconStyle">{{ currentStatus.icon }}</text>
      <text :style="{ fontSize: `${t.typography.size.h1}rpx`, fontWeight: t.typography.weight.bold, marginBottom: `${t.spacing[2]}rpx` }">
        {{ currentStatus.title }}
      </text>
      <text :style="{ fontSize: `${t.typography.size.bodySm}rpx`, opacity: 0.9, textAlign: 'center' }">
        {{ currentStatus.subtitle }}
      </text>

      <!-- 进度条 -->
      <view v-if="matchStatus === 'queued'" :style="progressStyle">
        <view :style="progressFillStyle" />
      </view>
    </view>

    <!-- 匹配详情（仅 connected 状态） -->
    <template v-if="matchStatus === 'connected'">
      <SectionCard title="匹配详情" subtitle="你们有很多共同点">
        <view :style="{ display: 'flex', flexDirection: 'column', gap: `${t.spacing[3]}rpx` }">
          <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[3]}rpx` }">
            <view :style="{
              width: `${t.component.avatar.lg}rpx`,
              height: `${t.component.avatar.lg}rpx`,
              borderRadius: `${t.radius.full}rpx`,
              background: t.color.gradient.brand,
              display: 'grid',
              placeItems: 'center',
              color: t.color.text.inverse,
              fontSize: `${t.typography.size.h2}rpx`,
              fontWeight: t.typography.weight.bold,
            }">
              小
            </view>
            <view>
              <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[2]}rpx` }">
                <text :style="{ fontSize: `${t.typography.size.h3}rpx`, fontWeight: t.typography.weight.semibold, display: 'block' }">
                  小雨
                </text>
                <EducationBadge school="海南大学" degree="本科" :verified="true" size="sm" />
              </view>
              <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: t.color.text.secondary }">
                计算机学院 · 大三
              </text>
            </view>
          </view>

          <view :style="{ display: 'flex', flexWrap: 'wrap', gap: `${t.spacing[2]}rpx`, marginTop: `${t.spacing[2]}rpx` }">
            <StatusState label="摄影" tone="brand" size="sm" />
            <StatusState label="音乐" tone="brand" size="sm" />
            <StatusState label="旅行" tone="secondary" size="sm" />
            <StatusState label="高数" tone="warning" size="sm" />
          </view>

          <view :style="{
            padding: `${t.spacing[3]}rpx`,
            borderRadius: `${t.radius.lg}rpx`,
            background: t.color.bg.secondary,
            marginTop: `${t.spacing[2]}rpx`,
          }">
            <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: t.color.text.secondary }">
              共同课程：高等数学、数据结构
            </text>
          </view>
        </view>
      </SectionCard>
    </template>

    <!-- 匹配历史 -->
    <SectionCard title="最近匹配" subtitle="查看历史记录">
      <view :style="{ display: 'flex', flexDirection: 'column', gap: `${t.spacing[3]}rpx` }">
        <view
          v-for="i in 2"
          :key="i"
          :style="{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${t.spacing[3]}rpx`,
            borderRadius: `${t.radius.lg}rpx`,
            background: t.color.bg.surface,
          }"
        >
          <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[3]}rpx` }">
            <view :style="{
              width: `${t.component.avatar.sm}rpx`,
              height: `${t.component.avatar.sm}rpx`,
              borderRadius: `${t.radius.full}rpx`,
              background: t.color.neutral[200],
              display: 'grid',
              placeItems: 'center',
              color: t.color.text.inverse,
              fontSize: `${t.typography.size.body}rpx`,
            }">
              ?
            </view>
            <text :style="{ fontSize: `${t.typography.size.bodySm}rpx`, color: t.color.text.secondary }">
              {{ ['匹配已过期', '已结束聊天'][i - 1] }}
            </text>
          </view>
          <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: t.color.text.quaternary }">
            {{ ['2天前', '5天前'][i - 1] }}
          </text>
        </view>
      </view>
    </SectionCard>
  </AppShell>

  <!-- 底部操作栏 -->
  <BottomActionBar
    :primary-label="currentStatus.buttonLabel"
    primary-type="primary"
    @primary="handleAction"
  />
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}
</style>
