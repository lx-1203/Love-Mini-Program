<!-- ============================================================
  HomePage - 首页设计稿
  基于原项目 HomePage 重构，全面使用 Design Tokens
  设计亮点：
  1. 顶部欢迎区采用渐变背景 + 毛玻璃效果
  2. 课表摘要用时间轴可视化展示
  3. 推荐的人卡片增加"匹配度温度"标签
  4. 各区块采用 SectionCard 统一包裹
============================================================ -->
<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../tokens';
import AppShell from '../components/AppShell.vue';
import SectionCard from '../components/SectionCard.vue';
import StatusState from '../components/StatusState.vue';
import EducationBadge from '../components/EducationBadge.vue';

const t = computed(() => designTokens);

// 模拟数据
const todaySchedule = [
  { time: '08:00-09:35', name: '高等数学', location: 'A-101', status: 'past' },
  { time: '10:00-11:35', name: '英语', location: 'B-203', status: 'current' },
  { time: '14:00-15:35', name: '数据结构', location: 'C-305', status: 'upcoming' },
];

const recommendedPeople = [
  { name: '小雨', major: '计算机学院', matchScore: 92, tags: ['摄影', '音乐'], school: '海南大学', degree: '本科', verified: true },
  { name: '阿杰', major: '经管学院', matchScore: 87, tags: ['篮球', '旅行'], school: '海南大学', degree: '本科', verified: true },
];

const hotTopics = [
  { title: '期末复习搭子', count: 128 },
  { title: '周末电影约', count: 86 },
];

const welcomeStyle = computed(() => ({
  background: t.value.color.gradient.brand,
  borderRadius: `${t.value.component.card.radius}rpx`,
  padding: `${t.value.spacing[6]}rpx`,
  marginBottom: `${t.value.spacing[4]}rpx`,
  color: t.value.color.text.inverse,
  boxShadow: t.value.shadow.brand,
}));

const timelineDotStyle = (status: string) => {
  const colors = {
    past: t.value.color.neutral[300],
    current: t.value.color.brand[400],
    upcoming: t.value.color.secondary[400],
  };
  return {
    width: `${t.value.spacing[3]}rpx`,
    height: `${t.value.spacing[3]}rpx`,
    borderRadius: `${t.value.radius.full}rpx`,
    background: colors[status as keyof typeof colors],
    boxShadow: status === 'current' ? `0 0 8rpx ${colors.current}` : 'none',
  };
};

const matchScoreStyle = (score: number) => {
  const hue = score > 90 ? 350 : score > 80 ? 20 : 45;
  return {
    background: `hsl(${hue}, 85%, 95%)`,
    color: `hsl(${hue}, 70%, 45%)`,
  };
};
</script>

<template>
  <AppShell title="校园恋爱" current-tab="home">
    <!-- 欢迎区 -->
    <view :style="welcomeStyle">
      <text :style="{ fontSize: `${t.typography.size.h2}rpx`, fontWeight: t.typography.weight.bold }">
        下午好，同学
      </text>
      <text :style="{ fontSize: `${t.typography.size.bodySm}rpx`, opacity: 0.9, marginTop: `${t.spacing[2]}rpx`, display: 'block' }">
        今天有 3 节课，2 个空闲时段可以认识新朋友
      </text>
    </view>

    <!-- 课表摘要 -->
    <SectionCard title="今日课表" subtitle="基于你的空闲时间推荐" variant="default">
      <view :style="{ display: 'flex', flexDirection: 'column', gap: `${t.spacing[3]}rpx` }">
        <view
          v-for="(item, index) in todaySchedule"
          :key="index"
          :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[3]}rpx` }"
        >
          <view :style="timelineDotStyle(item.status)" />
          <view :style="{ flex: 1 }">
            <text :style="{ fontSize: `${t.typography.size.body}rpx`, fontWeight: t.typography.weight.medium, color: item.status === 'past' ? t.color.text.quaternary : t.color.text.primary }">
              {{ item.name }}
            </text>
            <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: t.color.text.tertiary, marginLeft: `${t.spacing[2]}rpx` }">
              {{ item.time }} · {{ item.location }}
            </text>
          </view>
          <StatusState
            v-if="item.status === 'current'"
            label="进行中"
            tone="warning"
            size="sm"
            dot
            pulse
          />
        </view>
      </view>
    </SectionCard>

    <!-- 资料补全提示 -->
    <SectionCard
      title="完善资料"
      subtitle="资料完整度 60%，完善后匹配更精准"
      variant="gradient"
      clickable
    >
      <view :style="{ display: 'flex', gap: `${t.spacing[2]}rpx`, marginTop: `${t.spacing[3]}rpx` }">
        <StatusState label="基础资料" tone="success" size="sm" />
        <StatusState label="学校认证" tone="success" size="sm" />
        <StatusState label="课表导入" tone="warning" size="sm" />
        <StatusState label="兴趣标签" tone="neutral" size="sm" />
      </view>
    </SectionCard>

    <!-- 推荐的人 -->
    <SectionCard title="推荐的人" subtitle="基于课表重叠与兴趣匹配">
      <view :style="{ display: 'flex', flexDirection: 'column', gap: `${t.spacing[3]}rpx` }">
        <view
          v-for="person in recommendedPeople"
          :key="person.name"
          :style="{
            display: 'flex',
            alignItems: 'center',
            gap: `${t.spacing[3]}rpx`,
            padding: `${t.spacing[3]}rpx`,
            borderRadius: `${t.radius.lg}rpx`,
            background: t.color.bg.surface,
          }"
        >
          <view :style="{
            width: `${t.component.avatar.md}rpx`,
            height: `${t.component.avatar.md}rpx`,
            borderRadius: `${t.radius.full}rpx`,
            background: t.color.gradient.brand,
            display: 'grid',
            placeItems: 'center',
            color: t.color.text.inverse,
            fontSize: `${t.typography.size.h3}rpx`,
            fontWeight: t.typography.weight.bold,
          }">
            {{ person.name[0] }}
          </view>
          <view :style="{ flex: 1 }">
            <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[2]}rpx`, flexWrap: 'wrap' }">
              <text :style="{ fontSize: `${t.typography.size.body}rpx`, fontWeight: t.typography.weight.semibold }">
                {{ person.name }}
              </text>
              <EducationBadge :school="person.school" :degree="person.degree" :verified="person.verified" size="sm" />
              <text :style="{ fontSize: `${t.typography.size.overline}rpx`, ...matchScoreStyle(person.matchScore), padding: `${t.spacing[1]}rpx ${t.spacing[2]}rpx`, borderRadius: `${t.radius.sm}rpx` }">
                {{ person.matchScore }}° 匹配
              </text>
            </view>
            <!-- 兴趣图谱预览 -->
            <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[2]}rpx`, marginTop: `${t.spacing[1]}rpx` }">
              <view
                v-for="(tag, idx) in person.tags"
                :key="tag"
                :style="{
                  width: `${t.spacing[3]}rpx`,
                  height: `${t.spacing[3]}rpx`,
                  borderRadius: `${t.radius.full}rpx`,
                  background: idx === 0 ? t.value.color.gradient.brand : t.value.color.gradient.secondary,
                  opacity: 0.85,
                }"
              />
              <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: t.color.text.secondary }">
                {{ person.tags.join(' · ') }}
              </text>
            </view>
          </view>
          <view :style="{
            width: `${t.component.button.height.sm}rpx`,
            height: `${t.component.button.height.sm}rpx`,
            borderRadius: `${t.radius.full}rpx`,
            background: t.color.gradient.brand,
            display: 'grid',
            placeItems: 'center',
            color: t.color.text.inverse,
            fontSize: `${t.typography.size.h4}rpx`,
          }">
            →
          </view>
        </view>
      </view>
    </SectionCard>

    <!-- 讨论热度 -->
    <SectionCard title="讨论热度" subtitle="大家都在聊什么">
      <view :style="{ display: 'flex', flexWrap: 'wrap', gap: `${t.spacing[2]}rpx` }">
        <view
          v-for="topic in hotTopics"
          :key="topic.title"
          :style="{
            padding: `${t.spacing[2]}rpx ${t.spacing[3]}rpx`,
            borderRadius: `${t.radius.full}rpx`,
            background: t.color.bg.brand,
            color: t.color.text.brand,
            fontSize: `${t.typography.size.bodySm}rpx`,
          }"
        >
          {{ topic.title }}
          <text :style="{ fontSize: `${t.typography.size.overline}rpx`, opacity: 0.7, marginLeft: `${t.spacing[1]}rpx` }">
            {{ topic.count }}
          </text>
        </view>
      </view>
    </SectionCard>

    <!-- 活动入口 -->
    <SectionCard
      title="校园活动"
      subtitle="发现身边的精彩"
      variant="interactive"
      clickable
    >
      <view :style="{ display: 'flex', gap: `${t.spacing[3]}rpx`, overflow: 'scroll' }">
        <view
          v-for="i in 3"
          :key="i"
          :style="{
            minWidth: '280rpx',
            height: '160rpx',
            borderRadius: `${t.radius.lg}rpx`,
            background: i === 1 ? t.color.gradient.secondary : i === 2 ? t.color.gradient.sunset : t.color.gradient.warmCool,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: `${t.spacing[3]}rpx`,
            color: t.color.text.inverse,
          }"
        >
          <text :style="{ fontSize: `${t.typography.size.body}rpx`, fontWeight: t.typography.weight.semibold }">
            {{ ['周末电影夜', '图书馆自习组', '校园音乐节'][i - 1] }}
          </text>
          <text :style="{ fontSize: `${t.typography.size.caption}rpx`, opacity: 0.8, marginTop: `${t.spacing[1]}rpx` }">
            {{ ['周五 19:00', '每天 14:00', '下周六 18:00'][i - 1] }}
          </text>
        </view>
      </view>
    </SectionCard>
  </AppShell>
</template>
