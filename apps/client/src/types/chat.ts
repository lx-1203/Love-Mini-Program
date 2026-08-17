/**
 * 聊天破冰数据模型。
 *
 * 与普通聊天输入框解耦：恋爱聊天在输入区上方展示“你们共同喜欢”与“推荐开场”。
 */

export type BreakQuestionType =
  | "common_interest"
  | "same_school"
  | "same_activity"
  | "icebreaker";

export interface BreakQuestionItem {
  type: BreakQuestionType;
  /** 展示句，例如“你们都喜欢摄影” */
  text: string;
  /** 点击后直接发送的开场白，例如“聊聊最近拍过最好看的照片？” */
  actionText: string;
}