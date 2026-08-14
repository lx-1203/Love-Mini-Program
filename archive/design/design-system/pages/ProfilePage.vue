<!-- ============================================================
  ProfilePage - 个人中心页设计稿
  设计亮点：
  1. 顶部采用渐变背景 + 头像叠加
  2. 资料完成度用环形进度条展示
  3. 功能入口采用图标网格布局
  4. 设置项采用统一列表样式
============================================================ -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { designTokens } from '../tokens';
import AppShell from '../components/AppShell.vue';
import SectionCard from '../components/SectionCard.vue';
import StatusState from '../components/StatusState.vue';
import EducationBadge from '../components/EducationBadge.vue';

const t = computed(() => designTokens);

const profile = ref({
  name: '小明',
  major: '计算机学院',
  grade: '大二',
  completion: 75,
  verified: true,
  school: '海南大学',
  degree: '本科',
});

const interestTags = ['摄影', '音乐', '旅行', '篮球', '编程', '电影'];

const menuItems = [
  { icon: '👤', label: '基础资料', desc: '昵称、头像、个性签名', color: t.value.color.brand[400] },
  { icon: '🏫', label: '学校认证', desc: '海南大学 · 已认证', color: t.value.color.secondary[400] },
  { icon: '📅', label: '课表管理', desc: '导入或手动编辑课表', color: t.value.color.accent[400] },
  { icon: '🏷️', label: '兴趣标签', desc: '摄影、音乐、旅行', color: t.value.color.brand[400] },
  { icon: '💬', label: '聊天设置', desc: '消息通知、隐私设置', color: t.value.color.secondary[400] },
  { icon: '📋', label: '反馈建议', desc: '帮助我们做得更好', color: t.value.color.accent[400] },
];

const completionStyle = computed(() => ({
  width: '120rpx',
  height: '120rpx',
  borderRadius: `${t.value.radius.full}rpx`,
  background: `conic-gradient(${t.value.color.brand[400]} ${profile.value.completion}%, ${t.value.color.border.light} 0)`,
  display: 'grid',
  placeItems: 'center',
  position: 'relative',
}));

const avatarInnerStyle = computed(() => ({
  width: '104rpx',
  height: '104rpx',
  borderRadius: `${t.value.radius.full}rpx`,
  background: t.value.color.gradient.brand,
  display: 'grid',
  placeItems: 'center',
  color: t.value.color.text.inverse,
  fontSize: `${t.value.typography.size.h1}rpx`,
  fontWeight: t.value.typography.weight.bold,
}));

const menuItemStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: `${t.value.spacing[3]}rpx`,
  padding: `${t.value.spacing[3]}rpx 0`,
  borderBottom: `1rpx solid ${t.value.color.border.light}`,
}));

const iconWrapStyle = (color: string) => ({
  width: `${t.value.component.button.height.sm}rpx`,
  height: `${t.value.component.button.height.sm}rpx`,
  borderRadius: `${t.value.radius.lg}rpx`,
  background: `${color}15`,
  display: 'grid',
  placeItems: 'center',
  fontSize: `${t.value.typography.size.h4}rpx`,
  color,
});
</script>

<template>
  <AppShell title="我的" current-tab="profile">
    <!-- 个人信息卡片 -->
    <SectionCard variant="gradient">
      <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[4]}rpx` }">
        <!-- 头像 + 完成度 -->
        <view :style="completionStyle">
          <view :style="avatarInnerStyle">
            {{ profile.name[0] }}
          </view>
        </view>

        <view :style="{ flex: 1 }">
          <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[2]}rpx`, flexWrap: 'wrap' }">
            <text :style="{ fontSize: `${t.typography.size.h2}rpx`, fontWeight: t.typography.weight.bold, color: t.color.text.inverse }">
              {{ profile.name }}
            </text>
            <EducationBadge :school="profile.school" :degree="profile.degree" :verified="profile.verified" size="sm" />
            <StatusState v-if="profile.verified" label="已认证" tone="success" size="sm" dot />
          </view>
          <text :style="{ fontSize: `${t.typography.size.bodySm}rpx`, color: 'rgba(255,255,255,0.8)', marginTop: `${t.spacing[1]}rpx`, display: 'block' }">
            {{ profile.major }} · {{ profile.grade }}
          </text>
          <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: 'rgba(255,255,255,0.6)', marginTop: `${t.spacing[1]}rpx`, display: 'block' }">
            资料完成度 {{ profile.completion }}%
          </text>
        </view>
      </view>
    </SectionCard>

    <!-- 功能入口 -->
    <SectionCard title="个人设置">
      <view :style="{ display: 'flex', flexDirection: 'column' }">
        <view
          v-for="item in menuItems"
          :key="item.label"
          :style="menuItemStyle"
        >
          <view :style="iconWrapStyle(item.color)">
            {{ item.icon }}
          </view>
          <view :style="{ flex: 1 }">
            <text :style="{ fontSize: `${t.typography.size.body}rpx`, fontWeight: t.typography.weight.medium, color: t.color.text.primary, display: 'block' }">
              {{ item.label }}
            </text>
            <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: t.color.text.secondary, marginTop: `${t.spacing[1]}rpx` }">
              {{ item.desc }}
            </text>
          </view>
          <text :style="{ fontSize: `${t.typography.size.h4}rpx`, color: t.color.text.quaternary }">›</text>
        </view>
      </view>
    </SectionCard>

    <!-- 兴趣图谱可视化 -->
    <SectionCard title="兴趣图谱" subtitle="我的兴趣标签可视化">
      <view :style="{ display: 'flex', flexWrap: 'wrap', gap: `${t.spacing[3]}rpx`, alignItems: 'center', justifyContent: 'center', padding: `${t.spacing[2]}rpx` }">
        <view
          v-for="(tag, index) in interestTags"
          :key="tag"
          :style="{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: `${t.spacing[1]}rpx`,
          }"
        >
          <view :style="{
            width: `${48 + (interestTags.length - index) * 8}rpx`,
            height: `${48 + (interestTags.length - index) * 8}rpx`,
            borderRadius: `${t.radius.full}rpx`,
            background: index % 2 === 0 ? t.color.gradient.brand : t.color.gradient.secondary,
            display: 'grid',
            placeItems: 'center',
            color: t.color.text.inverse,
            fontSize: `${t.typography.size.caption}rpx`,
            fontWeight: t.typography.weight.medium,
            boxShadow: t.shadow.sm,
          }">
            {{ tag[0] }}
          </view>
          <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: t.color.text.secondary }">{{ tag }}</text>
        </view>
      </view>
      <!-- 连线示意 -->
      <view :style="{ marginTop: `${t.spacing[3]}rpx`, padding: `${t.spacing[3]}rpx`, borderRadius: `${t.radius.lg}rpx`, background: t.color.bg.surface }">
        <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[2]}rpx`, marginBottom: `${t.spacing[2]}rpx` }">
          <view :style="{ width: `${t.spacing[3]}rpx`, height: `${t.spacing[3]}rpx`, borderRadius: `${t.radius.full}rpx`, background: t.color.gradient.brand }" />
          <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: t.color.text.secondary }">核心兴趣</text>
        </view>
        <view :style="{ display: 'flex', alignItems: 'center', gap: `${t.spacing[2]}rpx` }">
          <view :style="{ width: `${t.spacing[3]}rpx`, height: `${t.spacing[3]}rpx`, borderRadius: `${t.radius.full}rpx`, background: t.color.gradient.secondary }" />
          <text :style="{ fontSize: `${t.typography.size.caption}rpx`, color: t.color.text.secondary }">关联兴趣</text>
        </view>
      </view>
    </SectionCard>

    <!-- 退出登录 -->
    <view :style="{
      marginTop: `${t.spacing[6]}rpx`,
      padding: `${t.spacing[4]}rpx`,
      textAlign: 'center',
    }">
      <text :style="{ fontSize: `${t.typography.size.body}rpx`, color: t.color.error }">
        退出登录
      </text>
    </view>
  </AppShell>
</template>
