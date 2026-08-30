import type { Meta, StoryObj } from '@storybook/vue3';
import CardSwiper from './CardSwiper.vue';
import CardDetailOverlay from './CardDetailOverlay.vue';
import AdvancedFilter from './AdvancedFilter.vue';
import FilterDrawer from './FilterDrawer.vue';
import LongPressMenu from './LongPressMenu.vue';

/**
 * Discover 组件库 Stories（P9 / Task 9.1.2）
 * 覆盖 apps/client/src/components/discover/ 下 5 个匹配/筛选组件
 */

const meta: Meta = { title: 'Discover', tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;

export const CardSwiperStory: StoryObj<typeof CardSwiper> = {
  name: 'CardSwiper',
  render: (args) => ({ components: { CardSwiper }, setup: () => ({ args }), template: '<CardSwiper v-bind="args" />' }),
  argTypes: {
    cards: { control: 'array', description: '卡片数据列表 [{id,name,avatar,...}]' },
    currentIndex: { control: 'number', description: '当前卡片索引' },
    swipeable: { control: 'boolean', description: '是否可滑动' },
  },
  args: {
    cards: [
      { id: '1', name: '小红', avatar: '', age: 20, school: '清华大学' },
      { id: '2', name: '小蓝', avatar: '', age: 21, school: '北京大学' },
    ],
    currentIndex: 0,
    swipeable: true,
  },
};

export const CardDetailOverlayStory: StoryObj<typeof CardDetailOverlay> = {
  name: 'CardDetailOverlay',
  render: (args) => ({ components: { CardDetailOverlay }, setup: () => ({ args }), template: '<CardDetailOverlay v-bind="args" />' }),
  argTypes: {
    visible: { control: 'boolean', description: '是否可见' },
    user: { control: 'object', description: '用户详情对象' },
  },
  args: { visible: true, user: { id: '1', name: '小红', age: 20, bio: '喜欢读书与旅行' } },
};

export const AdvancedFilterStory: StoryObj<typeof AdvancedFilter> = {
  name: 'AdvancedFilter',
  render: (args) => ({ components: { AdvancedFilter }, setup: () => ({ args }), template: '<AdvancedFilter v-bind="args" />' }),
  argTypes: {
    visible: { control: 'boolean', description: '是否可见' },
    filters: { control: 'object', description: '当前筛选值 {ageRange,school,gender,...}' },
  },
  args: { visible: true, filters: { ageRange: [18, 25], school: '', gender: 'female' } },
};

export const FilterDrawerStory: StoryObj<typeof FilterDrawer> = {
  name: 'FilterDrawer',
  render: (args) => ({ components: { FilterDrawer }, setup: () => ({ args }), template: '<FilterDrawer v-bind="args" />' }),
  argTypes: {
    visible: { control: 'boolean', description: '是否可见' },
    position: { control: 'select', options: ['left', 'right', 'bottom'], description: '弹出位置' },
  },
  args: { visible: true, position: 'right' },
};

export const LongPressMenuStory: StoryObj<typeof LongPressMenu> = {
  name: 'LongPressMenu',
  render: (args) => ({ components: { LongPressMenu }, setup: () => ({ args }), template: '<LongPressMenu v-bind="args" />' }),
  argTypes: {
    visible: { control: 'boolean', description: '是否可见' },
    actions: { control: 'array', description: '操作列表 [{key,label,danger}]' },
  },
  args: {
    visible: true,
    actions: [
      { key: 'report', label: '举报', danger: true },
      { key: 'block', label: '拉黑', danger: true },
      { key: 'cancel', label: '取消', danger: false },
    ],
  },
};
