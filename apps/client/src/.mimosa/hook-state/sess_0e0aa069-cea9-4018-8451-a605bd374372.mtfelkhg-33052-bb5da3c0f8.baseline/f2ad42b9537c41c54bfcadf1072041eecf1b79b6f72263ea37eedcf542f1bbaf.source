import type { Meta, StoryObj } from '@storybook/vue3';
import LikeBurst from './LikeBurst.vue';
import MatchGuideOverlay from './MatchGuideOverlay.vue';
import PostReportDialog from './PostReportDialog.vue';
import SocialProgressIndicator from './SocialProgressIndicator.vue';
import WallPostCard from './WallPostCard.vue';

/**
 * Social 组件库 Stories（P9 / Task 9.1.2）
 * 覆盖 apps/client/src/components/social/ 下 5 个社交互动组件
 */

const meta: Meta = { title: 'Social', tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;

export const LikeBurstStory: StoryObj<typeof LikeBurst> = {
  name: 'LikeBurst',
  render: (args) => ({ components: { LikeBurst }, setup: () => ({ args }), template: '<LikeBurst v-bind="args" />' }),
  argTypes: {
    active: { control: 'boolean', description: '是否激活动画' },
    count: { control: 'number', description: '爆裂粒子数' },
  },
  args: { active: true, count: 12 },
};

export const MatchGuideOverlayStory: StoryObj<typeof MatchGuideOverlay> = {
  name: 'MatchGuideOverlay',
  render: (args) => ({ components: { MatchGuideOverlay }, setup: () => ({ args }), template: '<MatchGuideOverlay v-bind="args" />' }),
  argTypes: {
    visible: { control: 'boolean', description: '是否可见' },
    step: { control: 'number', description: '当前步骤（0-3）' },
    userName: { control: 'text', description: '用户名' },
  },
  args: { visible: true, step: 0, userName: '小红' },
};

export const PostReportDialogStory: StoryObj<typeof PostReportDialog> = {
  name: 'PostReportDialog',
  render: (args) => ({ components: { PostReportDialog }, setup: () => ({ args }), template: '<PostReportDialog v-bind="args" />' }),
  argTypes: {
    visible: { control: 'boolean', description: '是否可见' },
    postId: { control: 'text', description: '帖子 ID' },
  },
  args: { visible: true, postId: 'post-123' },
};

export const SocialProgressIndicatorStory: StoryObj<typeof SocialProgressIndicator> = {
  name: 'SocialProgressIndicator',
  render: (args) => ({ components: { SocialProgressIndicator }, setup: () => ({ args }), template: '<SocialProgressIndicator v-bind="args" />' }),
  argTypes: {
    progress: { control: 'number', description: '进度（0-100）' },
    label: { control: 'text', description: '标签' },
  },
  args: { progress: 60, label: '社交进度' },
};

export const WallPostCardStory: StoryObj<typeof WallPostCard> = {
  name: 'WallPostCard',
  render: (args) => ({ components: { WallPostCard }, setup: () => ({ args }), template: '<WallPostCard v-bind="args" />' }),
  argTypes: {
    post: { control: 'object', description: '帖子对象 {id,author,content,images,likes,comments}' },
    showActions: { control: 'boolean', description: '是否显示操作区' },
  },
  args: {
    post: {
      id: '1',
      author: { name: '小明', avatar: '' },
      content: '今天天气真好，想找人一起去操场散步~',
      images: [],
      likes: 12,
      comments: 3,
    },
    showActions: true,
  },
};
