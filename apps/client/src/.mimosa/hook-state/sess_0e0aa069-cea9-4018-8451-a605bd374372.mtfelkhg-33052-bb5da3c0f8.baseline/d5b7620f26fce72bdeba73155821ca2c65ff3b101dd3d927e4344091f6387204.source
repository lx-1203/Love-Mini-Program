import type { Meta, StoryObj } from '@storybook/vue3';
import SetupProgress from './SetupProgress.vue';

/**
 * Setup 组件 Stories（P9 / Task 9.1.2）
 *
 * 覆盖 apps/client/src/components/setup/ 下的组件 Props 说明与可视化预览。
 */

const meta: Meta = {
  title: 'Setup',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};
export default meta;

// ============ SetupProgress ============
export const SetupProgressStory: StoryObj<typeof SetupProgress> = {
  name: 'SetupProgress',
  render: (args) => ({
    components: { SetupProgress },
    setup() { return { args }; },
    template: '<SetupProgress v-bind="args" />',
  }),
  argTypes: {
    currentStep: {
      control: 'number',
      description: '当前步骤（1-based，1~totalSteps），越界自动 clamp',
    },
    totalSteps: {
      control: 'number',
      description: '总步骤数（默认 5）',
    },
  },
  args: {
    currentStep: 3,
    totalSteps: 5,
  },
};
