import type { Meta, StoryObj } from '@storybook/vue3';
import TopicSelector from './TopicSelector.vue';

/**
 * Village 组件 Stories（P9 / Task 9.1.2）
 *
 * 覆盖 apps/client/src/components/village/ 下的组件 Props 说明与可视化预览。
 */

const meta: Meta = {
  title: 'Village',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};
export default meta;

// ============ TopicSelector ============
export const TopicSelectorStory: StoryObj<typeof TopicSelector> = {
  name: 'TopicSelector',
  render: (args) => ({
    components: { TopicSelector },
    setup() { return { args }; },
    template: '<TopicSelector v-bind="args" />',
  }),
  argTypes: {
    modelValue: {
      control: 'array',
      description: '已选话题名称列表（不含 # 前缀，最多 3 个）',
    },
  },
  args: {
    modelValue: ['校园生活', '运动健身'],
  },
};
