import type { Meta, StoryObj } from '@storybook/vue3';
import UnlockGuideModal from './UnlockGuideModal.vue';
import UnlockGuideOverlay from './UnlockGuideOverlay.vue';

/**
 * UnlockGuide 组件 Stories（P9 / Task 9.1.2）
 *
 * 覆盖根目录下的解锁引导组件 Props 说明与可视化预览。
 */

const meta: Meta = {
  title: 'UnlockGuide',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};
export default meta;

// ============ UnlockGuideModal ============
export const UnlockGuideModalStory: StoryObj<typeof UnlockGuideModal> = {
  name: 'UnlockGuideModal',
  render: (args) => ({
    components: { UnlockGuideModal },
    setup() { return { args }; },
    template: '<UnlockGuideModal v-bind="args" />',
  }),
  argTypes: {
    visible: { control: 'boolean', description: '弹窗是否可见（v-model:visible）' },
    pageTitle: { control: 'text', description: '当前页面/功能标题（保留兼容）' },
    featureName: { control: 'text', description: '锁定功能名称（如「喜欢列表」）' },
    completionPercent: { control: 'number', description: '当前资料完善度百分比（可选）' },
  },
  args: {
    visible: true,
    pageTitle: '喜欢列表',
    featureName: '喜欢列表',
    completionPercent: 40,
  },
};

// ============ UnlockGuideOverlay ============
export const UnlockGuideOverlayStory: StoryObj<typeof UnlockGuideOverlay> = {
  name: 'UnlockGuideOverlay',
  render: (args) => ({
    components: { UnlockGuideOverlay },
    setup() { return { args }; },
    template: '<UnlockGuideOverlay v-bind="args" />',
  }),
  argTypes: {
    visible: { control: 'boolean', description: '遮罩是否可见' },
    featureName: { control: 'text', description: '锁定功能名称' },
    completionPercent: { control: 'number', description: '资料完善度百分比' },
  },
  args: {
    visible: true,
    featureName: '消息列表',
    completionPercent: 60,
  },
};
