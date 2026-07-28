import type { Meta, StoryObj } from '@storybook/vue3';
import Avatar from './Avatar.vue';
import Button from './Button.vue';
import SafeImage from './SafeImage.vue';
import Tag from './Tag.vue';
import Toast from './Toast.vue';
import EmptyState from './EmptyState.vue';
import ErrorState from './ErrorState.vue';
import Skeleton from './Skeleton.vue';
import SectionCard from './SectionCard.vue';
import SectionHeader from './SectionHeader.vue';
import StatusState from './StatusState.vue';
import UnreadBadge from './UnreadBadge.vue';
import VerificationBadge from './VerificationBadge.vue';
import EducationBadge from './EducationBadge.vue';
import MatchCountChip from './MatchCountChip.vue';
import BaseTabs from './BaseTabs.vue';
import BottomActionBar from './BottomActionBar.vue';
import Card from './Card.vue';
import HeartParticles from './HeartParticles.vue';
import LockScreen from './LockScreen.vue';
import PageStateContainer from './PageStateContainer.vue';
import Ripple from './Ripple.vue';
import ShareCard from './ShareCard.vue';
import VirtualList from './VirtualList.vue';

/**
 * Common 组件库 Stories（P9 / Task 9.1.2）
 *
 * 覆盖 apps/client/src/components/common/ 下 23 个通用组件的 Props 说明与可视化预览。
 * 每个 Story 对应一个组件，可通过 controls 面板调节 Props 实时查看效果。
 */

const meta: Meta = {
  title: 'Common',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};
export default meta;

// ============ Avatar ============
export const AvatarStory: StoryObj<typeof Avatar> = {
  name: 'Avatar',
  render: (args) => ({
    components: { Avatar },
    setup() { return { args }; },
    template: '<Avatar v-bind="args" />',
  }),
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'], description: '头像尺寸' },
    src: { control: 'text', description: '头像图片 URL' },
    name: { control: 'text', description: '用户名（用于 alt 文本）' },
    online: { control: 'boolean', description: '是否在线' },
    vip: { control: 'boolean', description: '是否 VIP' },
    ring: { control: 'boolean', description: '是否显示边框' },
    vipRing: { control: 'boolean', description: '是否显示 VIP 边框' },
    liveDot: { control: 'select', options: [false, 'green', 'red'], description: '直播指示点' },
  },
  args: {
    size: 'md',
    src: '',
    name: '小明',
    online: false,
    vip: false,
    ring: false,
    vipRing: false,
    liveDot: false,
  },
};

// ============ Button ============
export const ButtonStory: StoryObj<typeof Button> = {
  name: 'Button',
  render: (args) => ({
    components: { Button },
    setup() { return { args }; },
    template: '<Button v-bind="args">按钮</Button>',
  }),
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'ghost', 'wechat', 'danger', 'success', 'romance', 'text'], description: '按钮变体' },
    size: { control: 'select', options: ['sm', 'md', 'lg'], description: '按钮尺寸' },
    block: { control: 'boolean', description: '是否块级宽度' },
    loading: { control: 'boolean', description: '加载中状态' },
    disabled: { control: 'boolean', description: '禁用状态' },
    ripple: { control: 'boolean', description: '是否启用涟漪效果' },
  },
  args: { variant: 'primary', size: 'md', block: false, loading: false, disabled: false, ripple: true },
};

// ============ SafeImage ============
export const SafeImageStory: StoryObj<typeof SafeImage> = {
  name: 'SafeImage',
  render: (args) => ({
    components: { SafeImage },
    setup() { return { args }; },
    template: '<SafeImage v-bind="args" />',
  }),
  argTypes: {
    src: { control: 'text', description: '图片 URL' },
    fallback: { control: 'text', description: '加载失败时的占位图' },
    mode: { control: 'select', options: ['aspectFill', 'aspectFit', 'scaleToFill', 'widthFix'], description: '裁剪模式' },
    alt: { control: 'text', description: 'alt 文本（无障碍）' },
    lazyLoad: { control: 'boolean', description: '是否懒加载' },
  },
  args: { src: '', fallback: '', mode: 'aspectFill', alt: '图片', lazyLoad: true },
};

// ============ Tag ============
export const TagStory: StoryObj<typeof Tag> = {
  name: 'Tag',
  render: (args) => ({
    components: { Tag },
    setup() { return { args }; },
    template: '<Tag v-bind="args">标签</Tag>',
  }),
  argTypes: {
    type: { control: 'select', options: ['default', 'primary', 'success', 'warning', 'danger'], description: '标签类型' },
    size: { control: 'select', options: ['sm', 'md', 'lg'], description: '尺寸' },
    closable: { control: 'boolean', description: '是否可关闭' },
  },
  args: { type: 'primary', size: 'md', closable: false },
};

// ============ Toast ============
export const ToastStory: StoryObj<typeof Toast> = {
  name: 'Toast',
  render: (args) => ({
    components: { Toast },
    setup() { return { args }; },
    template: '<Toast v-bind="args" />',
  }),
  argTypes: {
    message: { control: 'text', description: '提示文案' },
    type: { control: 'select', options: ['info', 'success', 'warning', 'error'], description: '类型' },
    duration: { control: 'number', description: '显示时长（ms）' },
  },
  args: { message: '操作成功', type: 'success', duration: 2000 },
};

// ============ EmptyState ============
export const EmptyStateStory: StoryObj<typeof EmptyState> = {
  name: 'EmptyState',
  render: (args) => ({
    components: { EmptyState },
    setup() { return { args }; },
    template: '<EmptyState v-bind="args" />',
  }),
  argTypes: {
    title: { control: 'text', description: '空状态标题' },
    description: { control: 'text', description: '辅助说明' },
    image: { control: 'text', description: '占位图 URL' },
  },
  args: { title: '暂无数据', description: '下拉刷新试试', image: '' },
};

// ============ ErrorState ============
export const ErrorStateStory: StoryObj<typeof ErrorState> = {
  name: 'ErrorState',
  render: (args) => ({
    components: { ErrorState },
    setup() { return { args }; },
    template: '<ErrorState v-bind="args" />',
  }),
  argTypes: {
    title: { control: 'text', description: '错误标题' },
    description: { control: 'text', description: '错误详情' },
    retryText: { control: 'text', description: '重试按钮文案' },
  },
  args: { title: '加载失败', description: '网络异常，请重试', retryText: '重试' },
};

// ============ Skeleton ============
export const SkeletonStory: StoryObj<typeof Skeleton> = {
  name: 'Skeleton',
  render: (args) => ({
    components: { Skeleton },
    setup() { return { args }; },
    template: '<Skeleton v-bind="args" />',
  }),
  argTypes: {
    type: { control: 'select', options: ['line', 'circle', 'rect'], description: '骨架类型' },
    width: { control: 'text', description: '宽度' },
    height: { control: 'text', description: '高度' },
    animated: { control: 'boolean', description: '是否动画' },
  },
  args: { type: 'line', width: '100%', height: '20px', animated: true },
};

// ============ SectionCard ============
export const SectionCardStory: StoryObj<typeof SectionCard> = {
  name: 'SectionCard',
  render: (args) => ({
    components: { SectionCard },
    setup() { return { args }; },
    template: '<SectionCard v-bind="args"><p>内容区域</p></SectionCard>',
  }),
  argTypes: {
    title: { control: 'text', description: '区块标题' },
    padding: { control: 'text', description: '内边距' },
    shadow: { control: 'select', options: ['sm', 'md', 'lg'], description: '阴影层级' },
  },
  args: { title: '区块标题', padding: '24rpx', shadow: 'sm' },
};

// ============ SectionHeader ============
export const SectionHeaderStory: StoryObj<typeof SectionHeader> = {
  name: 'SectionHeader',
  render: (args) => ({
    components: { SectionHeader },
    setup() { return { args }; },
    template: '<SectionHeader v-bind="args" />',
  }),
  argTypes: {
    title: { control: 'text', description: '标题' },
    subtitle: { control: 'text', description: '副标题' },
    showMore: { control: 'boolean', description: '是否显示"更多"' },
  },
  args: { title: '今日推荐', subtitle: '为你精选', showMore: true },
};

// ============ StatusState ============
export const StatusStateStory: StoryObj<typeof StatusState> = {
  name: 'StatusState',
  render: (args) => ({
    components: { StatusState },
    setup() { return { args }; },
    template: '<StatusState v-bind="args" />',
  }),
  argTypes: {
    status: { control: 'select', options: ['loading', 'empty', 'error', 'success'], description: '状态' },
    title: { control: 'text', description: '标题' },
    description: { control: 'text', description: '说明' },
  },
  args: { status: 'loading', title: '加载中', description: '请稍候' },
};

// ============ UnreadBadge ============
export const UnreadBadgeStory: StoryObj<typeof UnreadBadge> = {
  name: 'UnreadBadge',
  render: (args) => ({
    components: { UnreadBadge },
    setup() { return { args }; },
    template: '<UnreadBadge v-bind="args" />',
  }),
  argTypes: {
    count: { control: 'number', description: '未读数量' },
    max: { control: 'number', description: '最大显示数字（超过显示 N+）' },
    type: { control: 'select', options: ['number', 'dot'], description: '类型' },
  },
  args: { count: 5, max: 99, type: 'number' },
};

// ============ VerificationBadge ============
export const VerificationBadgeStory: StoryObj<typeof VerificationBadge> = {
  name: 'VerificationBadge',
  render: (args) => ({
    components: { VerificationBadge },
    setup() { return { args }; },
    template: '<VerificationBadge v-bind="args" />',
  }),
  argTypes: {
    type: { control: 'select', options: ['idcard', 'student', 'video', 'phone'], description: '认证类型' },
    verified: { control: 'boolean', description: '是否已认证' },
    size: { control: 'select', options: ['sm', 'md', 'lg'], description: '尺寸' },
  },
  args: { type: 'idcard', verified: true, size: 'sm' },
};

// ============ EducationBadge ============
export const EducationBadgeStory: StoryObj<typeof EducationBadge> = {
  name: 'EducationBadge',
  render: (args) => ({
    components: { EducationBadge },
    setup() { return { args }; },
    template: '<EducationBadge v-bind="args" />',
  }),
  argTypes: {
    level: { control: 'select', options: ['bachelor', 'master', 'phd', 'highschool'], description: '学历' },
    verified: { control: 'boolean', description: '是否已验证' },
  },
  args: { level: 'bachelor', verified: true },
};

// ============ MatchCountChip ============
export const MatchCountChipStory: StoryObj<typeof MatchCountChip> = {
  name: 'MatchCountChip',
  render: (args) => ({
    components: { MatchCountChip },
    setup() { return { args }; },
    template: '<MatchCountChip v-bind="args" />',
  }),
  argTypes: {
    count: { control: 'number', description: '匹配次数' },
    label: { control: 'text', description: '文案' },
  },
  args: { count: 12, label: '今日匹配' },
};

// ============ BaseTabs ============
export const BaseTabsStory: StoryObj<typeof BaseTabs> = {
  name: 'BaseTabs',
  render: (args) => ({
    components: { BaseTabs },
    setup() { return { args }; },
    template: '<BaseTabs v-bind="args" />',
  }),
  argTypes: {
    tabs: { control: 'object', description: '标签页列表 [{key,label}]' },
    activeKey: { control: 'text', description: '当前激活 key' },
    type: { control: 'select', options: ['line', 'card', 'pill'], description: '样式' },
  },
  args: {
    tabs: [{ key: 'all', label: '全部' }, { key: 'liked', label: '喜欢我' }],
    activeKey: 'all',
    type: 'line',
  },
};

// ============ BottomActionBar ============
export const BottomActionBarStory: StoryObj<typeof BottomActionBar> = {
  name: 'BottomActionBar',
  render: (args) => ({
    components: { BottomActionBar },
    setup() { return { args }; },
    template: '<BottomActionBar v-bind="args" />',
  }),
  argTypes: {
    visible: { control: 'boolean', description: '是否可见' },
    safeArea: { control: 'boolean', description: '是否适配底部安全区' },
  },
  args: { visible: true, safeArea: true },
};

// ============ Card ============
export const CardStory: StoryObj<typeof Card> = {
  name: 'Card',
  render: (args) => ({
    components: { Card },
    setup() { return { args }; },
    template: '<Card v-bind="args"><p>卡片内容</p></Card>',
  }),
  argTypes: {
    padding: { control: 'text', description: '内边距' },
    radius: { control: 'select', options: ['sm', 'md', 'lg', 'xl'], description: '圆角' },
    shadow: { control: 'select', options: ['none', 'sm', 'md', 'lg'], description: '阴影' },
  },
  args: { padding: '24rpx', radius: 'md', shadow: 'sm' },
};

// ============ HeartParticles ============
export const HeartParticlesStory: StoryObj<typeof HeartParticles> = {
  name: 'HeartParticles',
  render: (args) => ({
    components: { HeartParticles },
    setup() { return { args }; },
    template: '<HeartParticles v-bind="args" />',
  }),
  argTypes: {
    active: { control: 'boolean', description: '是否激活粒子动画' },
    count: { control: 'number', description: '粒子数量' },
  },
  args: { active: true, count: 20 },
};

// ============ LockScreen ============
export const LockScreenStory: StoryObj<typeof LockScreen> = {
  name: 'LockScreen',
  render: (args) => ({
    components: { LockScreen },
    setup() { return { args }; },
    template: '<LockScreen v-bind="args" />',
  }),
  argTypes: {
    visible: { control: 'boolean', description: '是否显示' },
    title: { control: 'text', description: '标题' },
  },
  args: { visible: true, title: '请输入密码' },
};

// ============ PageStateContainer ============
export const PageStateContainerStory: StoryObj<typeof PageStateContainer> = {
  name: 'PageStateContainer',
  render: (args) => ({
    components: { PageStateContainer },
    setup() { return { args }; },
    template: '<PageStateContainer v-bind="args"><p>页面内容</p></PageStateContainer>',
  }),
  argTypes: {
    loading: { control: 'boolean', description: '加载中' },
    error: { control: 'boolean', description: '错误状态' },
    empty: { control: 'boolean', description: '空状态' },
  },
  args: { loading: false, error: false, empty: false },
};

// ============ Ripple ============
export const RippleStory: StoryObj<typeof Ripple> = {
  name: 'Ripple',
  render: (args) => ({
    components: { Ripple },
    setup() { return { args }; },
    template: '<Ripple v-bind="args" />',
  }),
  argTypes: {
    color: { control: 'color', description: '涟漪颜色' },
    duration: { control: 'number', description: '动画时长（ms）' },
  },
  args: { color: '#FF6B9D', duration: 600 },
};

// ============ ShareCard ============
export const ShareCardStory: StoryObj<typeof ShareCard> = {
  name: 'ShareCard',
  render: (args) => ({
    components: { ShareCard },
    setup() { return { args }; },
    template: '<ShareCard v-bind="args" />',
  }),
  argTypes: {
    title: { control: 'text', description: '分享标题' },
    desc: { control: 'text', description: '描述' },
    imageUrl: { control: 'text', description: '分享图 URL' },
  },
  args: { title: '我在校园恋爱小程序遇见了你', desc: '快来认识我吧', imageUrl: '' },
};

// ============ VirtualList ============
export const VirtualListStory: StoryObj<typeof VirtualList> = {
  name: 'VirtualList',
  render: (args) => ({
    components: { VirtualList },
    setup() { return { args }; },
    template: '<VirtualList v-bind="args" />',
  }),
  argTypes: {
    items: { control: 'object', description: '列表项数组' },
    itemHeight: { control: 'number', description: '每项高度（px）' },
    height: { control: 'text', description: '容器高度' },
  },
  args: { items: Array.from({ length: 100 }, (_, i) => i), itemHeight: 60, height: '400px' },
};
