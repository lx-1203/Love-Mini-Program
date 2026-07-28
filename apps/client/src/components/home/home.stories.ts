import type { Meta, StoryObj } from '@storybook/vue3';
import ActivityCard from './ActivityCard.vue';
import ActivityScroll from './ActivityScroll.vue';
import HomeBanner from './HomeBanner.vue';
import HomeHeader from './HomeHeader.vue';
import PeopleScroll from './PeopleScroll.vue';
import PersonCard from './PersonCard.vue';
import WallSection from './WallSection.vue';
import WelcomeBanner from './WelcomeBanner.vue';

/**
 * Home 组件库 Stories（P9 / Task 9.1.2）
 * 覆盖 apps/client/src/components/home/ 下 8 个首页组件
 */

const meta: Meta = { title: 'Home', tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;

export const ActivityCardStory: StoryObj<typeof ActivityCard> = {
  name: 'ActivityCard',
  render: (args) => ({ components: { ActivityCard }, setup: () => ({ args }), template: '<ActivityCard v-bind="args" />' }),
  argTypes: {
    activity: { control: 'object', description: '活动对象 {id,title,time,location,participants}' },
    compact: { control: 'boolean', description: '紧凑模式' },
  },
  args: { activity: { id: '1', title: '周末电影之夜', time: '2026-07-30 19:00', location: '学生活动中心', participants: 12 }, compact: false },
};

export const ActivityScrollStory: StoryObj<typeof ActivityScroll> = {
  name: 'ActivityScroll',
  render: (args) => ({ components: { ActivityScroll }, setup: () => ({ args }), template: '<ActivityScroll v-bind="args" />' }),
  argTypes: {
    activities: { control: 'array', description: '活动列表' },
    loading: { control: 'boolean', description: '加载中' },
  },
  args: { activities: [], loading: false },
};

export const HomeBannerStory: StoryObj<typeof HomeBanner> = {
  name: 'HomeBanner',
  render: (args) => ({ components: { HomeBanner }, setup: () => ({ args }), template: '<HomeBanner v-bind="args" />' }),
  argTypes: {
    banners: { control: 'array', description: 'Banner 列表 [{id,imageUrl,link}]' },
    autoplay: { control: 'boolean', description: '自动播放' },
    interval: { control: 'number', description: '切换间隔（ms）' },
  },
  args: { banners: [], autoplay: true, interval: 4000 },
};

export const HomeHeaderStory: StoryObj<typeof HomeHeader> = {
  name: 'HomeHeader',
  render: (args) => ({ components: { HomeHeader }, setup: () => ({ args }), template: '<HomeHeader v-bind="args" />' }),
  argTypes: {
    title: { control: 'text', description: '标题' },
    showBack: { control: 'boolean', description: '是否显示返回按钮' },
    transparent: { control: 'boolean', description: '透明背景' },
  },
  args: { title: '校园恋爱', showBack: false, transparent: false },
};

export const PeopleScrollStory: StoryObj<typeof PeopleScroll> = {
  name: 'PeopleScroll',
  render: (args) => ({ components: { PeopleScroll }, setup: () => ({ args }), template: '<PeopleScroll v-bind="args" />' }),
  argTypes: {
    people: { control: 'array', description: '人物列表' },
    loading: { control: 'boolean', description: '加载中' },
  },
  args: { people: [], loading: false },
};

export const PersonCardStory: StoryObj<typeof PersonCard> = {
  name: 'PersonCard',
  render: (args) => ({ components: { PersonCard }, setup: () => ({ args }), template: '<PersonCard v-bind="args" />' }),
  argTypes: {
    person: { control: 'object', description: '人物对象 {id,name,avatar,age,school,tags}' },
    layout: { control: 'select', options: ['vertical', 'horizontal'], description: '布局方向' },
  },
  args: { person: { id: '1', name: '小红', avatar: '', age: 20, school: '清华大学', tags: ['文艺', '猫咪'] }, layout: 'vertical' },
};

export const WallSectionStory: StoryObj<typeof WallSection> = {
  name: 'WallSection',
  render: (args) => ({ components: { WallSection }, setup: () => ({ args }), template: '<WallSection v-bind="args" />' }),
  argTypes: {
    title: { control: 'text', description: '区块标题' },
    posts: { control: 'array', description: '帖子列表' },
  },
  args: { title: '表白墙', posts: [] },
};

export const WelcomeBannerStory: StoryObj<typeof WelcomeBanner> = {
  name: 'WelcomeBanner',
  render: (args) => ({ components: { WelcomeBanner }, setup: () => ({ args }), template: '<WelcomeBanner v-bind="args" />' }),
  argTypes: {
    userName: { control: 'text', description: '用户名' },
    subtitle: { control: 'text', description: '副标题' },
  },
  args: { userName: '小明', subtitle: '今天也要加油哦' },
};
