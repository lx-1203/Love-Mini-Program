import type { Meta, StoryObj } from '@storybook/vue3';
import ChatBubble from './ChatBubble.vue';
import ChatItem from './ChatItem.vue';
import HeartSignal from './HeartSignal.vue';
import IcebreakerSuggestions from './IcebreakerSuggestions.vue';
import RedPacketBubble from './RedPacketBubble.vue';
import VoiceMessageBubble from './VoiceMessageBubble.vue';
import VoicePill from './VoicePill.vue';
import VoiceRecorder from './VoiceRecorder.vue';

/**
 * Chat 组件库 Stories（P9 / Task 9.1.2）
 * 覆盖 apps/client/src/components/chat/ 下 8 个聊天相关组件
 */

const meta: Meta = {
  title: 'Chat',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;

export const ChatBubbleStory: StoryObj<typeof ChatBubble> = {
  name: 'ChatBubble',
  render: (args) => ({ components: { ChatBubble }, setup: () => ({ args }), template: '<ChatBubble v-bind="args">你好，今天一起吃饭吗？</ChatBubble>' }),
  argTypes: {
    type: { control: 'select', options: ['text', 'image', 'voice', 'video', 'system'], description: '消息类型' },
    direction: { control: 'select', options: ['sent', 'received'], description: '消息方向' },
    time: { control: 'text', description: '时间戳显示' },
    showAvatar: { control: 'boolean', description: '是否显示头像' },
  },
  args: { type: 'text', direction: 'sent', time: '14:32', showAvatar: true },
};

export const ChatItemStory: StoryObj<typeof ChatItem> = {
  name: 'ChatItem',
  render: (args) => ({ components: { ChatItem }, setup: () => ({ args }), template: '<ChatItem v-bind="args" />' }),
  argTypes: {
    message: { control: 'object', description: '消息对象 {id,type,content,direction,timestamp}' },
    showAvatar: { control: 'boolean', description: '是否显示头像' },
  },
  args: { message: { id: '1', type: 'text', content: '你好', direction: 'sent', timestamp: Date.now() }, showAvatar: true },
};

export const HeartSignalStory: StoryObj<typeof HeartSignal> = {
  name: 'HeartSignal',
  render: (args) => ({ components: { HeartSignal }, setup: () => ({ args }), template: '<HeartSignal v-bind="args" />' }),
  argTypes: {
    visible: { control: 'boolean', description: '是否可见' },
    userName: { control: 'text', description: '对方用户名' },
  },
  args: { visible: true, userName: '小明' },
};

export const IcebreakerSuggestionsStory: StoryObj<typeof IcebreakerSuggestions> = {
  name: 'IcebreakerSuggestions',
  render: (args) => ({ components: { IcebreakerSuggestions }, setup: () => ({ args }), template: '<IcebreakerSuggestions v-bind="args" />' }),
  argTypes: {
    suggestions: { control: 'array', description: '破冰话题列表' },
    visible: { control: 'boolean', description: '是否可见' },
  },
  args: { suggestions: ['你最近在追什么剧？', '周末一起去图书馆吗？', '你喜欢吃什么？'], visible: true },
};

export const RedPacketBubbleStory: StoryObj<typeof RedPacketBubble> = {
  name: 'RedPacketBubble',
  render: (args) => ({ components: { RedPacketBubble }, setup: () => ({ args }), template: '<RedPacketBubble v-bind="args" />' }),
  argTypes: {
    amount: { control: 'number', description: '金额（分）' },
    greeting: { control: 'text', description: '祝福语' },
    direction: { control: 'select', options: ['sent', 'received'], description: '方向' },
    opened: { control: 'boolean', description: '是否已打开' },
  },
  args: { amount: 520, greeting: '一见钟情', direction: 'sent', opened: false },
};

export const VoiceMessageBubbleStory: StoryObj<typeof VoiceMessageBubble> = {
  name: 'VoiceMessageBubble',
  render: (args) => ({ components: { VoiceMessageBubble }, setup: () => ({ args }), template: '<VoiceMessageBubble v-bind="args" />' }),
  argTypes: {
    duration: { control: 'number', description: '时长（秒）' },
    direction: { control: 'select', options: ['sent', 'received'], description: '方向' },
    playing: { control: 'boolean', description: '是否正在播放' },
    url: { control: 'text', description: '音频 URL' },
  },
  args: { duration: 5, direction: 'received', playing: false, url: '' },
};

export const VoicePillStory: StoryObj<typeof VoicePill> = {
  name: 'VoicePill',
  render: (args) => ({ components: { VoicePill }, setup: () => ({ args }), template: '<VoicePill v-bind="args" />' }),
  argTypes: {
    recording: { control: 'boolean', description: '是否录音中' },
    duration: { control: 'number', description: '已录时长（秒）' },
  },
  args: { recording: false, duration: 0 },
};

export const VoiceRecorderStory: StoryObj<typeof VoiceRecorder> = {
  name: 'VoiceRecorder',
  render: (args) => ({ components: { VoiceRecorder }, setup: () => ({ args }), template: '<VoiceRecorder v-bind="args" />' }),
  argTypes: {
    visible: { control: 'boolean', description: '是否显示' },
    maxDuration: { control: 'number', description: '最大时长（秒）' },
  },
  args: { visible: true, maxDuration: 60 },
};
