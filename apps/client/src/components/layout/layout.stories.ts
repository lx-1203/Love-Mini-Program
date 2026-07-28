import type { Meta, StoryObj } from '@storybook/vue3';
import AppShell from './AppShell.vue';
import ChatHeader from './ChatHeader.vue';
import TabBar from './TabBar.vue';

/**
 * Layout 组件库 Stories（P9 / Task 9.1.2）
 * 覆盖 apps/client/src/components/layout/ 下 3 个布局组件
 */

const meta: Meta = { title: 'Layout', tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;

export const AppShellStory: StoryObj<typeof AppShell> = {
  name: 'AppShell',
  render: (args) => ({ components: { AppShell }, setup: () => ({ args }), template: '<AppShell v-bind="args"><p style="padding:24rpx">页面内容</p></AppShell>' }),
  argTypes: {
    showHeader: { control: 'boolean', description: '是否显示头部' },
    showTabBar: { control: 'boolean', description: '是否显示底部 Tab' },
    headerTitle: { control: 'text', description: '头部标题' },
  },
  args: { showHeader: true, showTabBar: true, headerTitle: '校园恋爱' },
};

export const ChatHeaderStory: StoryObj<typeof ChatHeader> = {
  name: 'ChatHeader',
  render: (args) => ({ components: { ChatHeader }, setup: () => ({ args }), template: '<ChatHeader v-bind="args" />' }),
  argTypes: {
    title: { control: 'text', description: '对方用户名' },
    subtitle: { control: 'text', description: '副标题（如"在线"）' },
    avatar: { control: 'text', description: '头像 URL' },
    showBack: { control: 'boolean', description: '是否显示返回' },
  },
  args: { title: '小红', subtitle: '在线', avatar: '', showBack: true },
};

export const TabBarStory: StoryObj<typeof TabBar> = {
  name: 'TabBar',
  render: (args) => ({ components: { TabBar }, setup: () => ({ args }), template: '<TabBar v-bind="args" />' }),
  argTypes: {
    active: { control: 'select', options: ['home', 'discover', 'messages', 'profile'], description: '当前激活的 Tab' },
    unreadCount: { control: 'number', description: '未读消息数' },
  },
  args: { active: 'home', unreadCount: 0 },
};
