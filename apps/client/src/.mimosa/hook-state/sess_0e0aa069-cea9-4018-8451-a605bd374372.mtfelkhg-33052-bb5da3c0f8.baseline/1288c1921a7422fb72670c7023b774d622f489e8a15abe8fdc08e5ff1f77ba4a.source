import type { Meta, StoryObj } from '@storybook/vue3';
import TagSelector from './TagSelector.vue';

/**
 * Profile 组件 Stories（P9 / Task 9.1.2）
 *
 * 覆盖 apps/client/src/components/profile/ 下的组件 Props 说明与可视化预览。
 */

const meta: Meta = {
  title: 'Profile',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};
export default meta;

// ============ TagSelector ============
export const TagSelectorStory: StoryObj<typeof TagSelector> = {
  name: 'TagSelector',
  render: (args) => ({
    components: { TagSelector },
    setup() { return { args }; },
    template: '<TagSelector v-bind="args" />',
  }),
  argTypes: {
    modelValue: {
      control: 'object',
      description: '各分组的已选标签值，按 groupKey 索引（interest/personality/lifestyle/relationship）',
    },
  },
  args: {
    modelValue: {
      interest: ['电影', '音乐'],
      personality: ['INTJ'],
      lifestyle: ['早睡早起'],
      relationship: ['寻找长线关系'],
    },
  },
};
