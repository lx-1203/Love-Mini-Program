export interface MatchFormField {
  key: string;
  label: string;
  required: boolean;
}

export const matchFormFields: MatchFormField[] = [
  { key: 'preference', label: '匹配偏好', required: true },
  { key: 'timeRange', label: '可聊时间', required: false },
];
