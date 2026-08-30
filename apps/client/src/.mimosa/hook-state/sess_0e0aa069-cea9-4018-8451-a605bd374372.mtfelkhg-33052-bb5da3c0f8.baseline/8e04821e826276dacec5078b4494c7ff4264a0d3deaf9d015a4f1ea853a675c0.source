import type { Meta, StoryObj } from '@storybook/vue3';
import LoginIllustration from './LoginIllustration.vue';
import LoginLogo from './LoginLogo.vue';
import PhoneBtn from './PhoneBtn.vue';
import TermsText from './TermsText.vue';
import WechatBtn from './WechatBtn.vue';

/**
 * Login 组件库 Stories（P9 / Task 9.1.2）
 * 覆盖 apps/client/src/components/login/ 下 5 个登录组件
 */

const meta: Meta = { title: 'Login', tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;

export const LoginIllustrationStory: StoryObj<typeof LoginIllustration> = {
  name: 'LoginIllustration',
  render: (args) => ({ components: { LoginIllustration }, setup: () => ({ args }), template: '<LoginIllustration v-bind="args" />' }),
  argTypes: {
    variant: { control: 'select', options: ['default', 'night', 'romance'], description: '插画变体' },
  },
  args: { variant: 'default' },
};

export const LoginLogoStory: StoryObj<typeof LoginLogo> = {
  name: 'LoginLogo',
  render: (args) => ({ components: { LoginLogo }, setup: () => ({ args }), template: '<LoginLogo v-bind="args" />' }),
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'], description: '尺寸' },
    withText: { control: 'boolean', description: '是否显示文字' },
  },
  args: { size: 'lg', withText: true },
};

export const PhoneBtnStory: StoryObj<typeof PhoneBtn> = {
  name: 'PhoneBtn',
  render: (args) => ({ components: { PhoneBtn }, setup: () => ({ args }), template: '<PhoneBtn v-bind="args" />' }),
  argTypes: {
    disabled: { control: 'boolean', description: '禁用状态' },
    loading: { control: 'boolean', description: '加载中' },
  },
  args: { disabled: false, loading: false },
};

export const TermsTextStory: StoryObj<typeof TermsText> = {
  name: 'TermsText',
  render: (args) => ({ components: { TermsText }, setup: () => ({ args }), template: '<TermsText v-bind="args" />' }),
  argTypes: {
    agreed: { control: 'boolean', description: '是否已同意' },
    version: { control: 'select', options: ['compact', 'full'], description: '版本' },
  },
  args: { agreed: false, version: 'compact' },
};

export const WechatBtnStory: StoryObj<typeof WechatBtn> = {
  name: 'WechatBtn',
  render: (args) => ({ components: { WechatBtn }, setup: () => ({ args }), template: '<WechatBtn v-bind="args" />' }),
  argTypes: {
    disabled: { control: 'boolean', description: '禁用状态' },
    loading: { control: 'boolean', description: '加载中' },
  },
  args: { disabled: false, loading: false },
};
