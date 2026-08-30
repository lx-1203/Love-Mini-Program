export interface HomeSection {
  id: string;
  /** 区块标题（中文兜底；展示层请优先用 titleKey 经 t() 渲染） */
  title: string;
  /** 区块标题的 i18n key（config.homeSections.{id}.title，zh/en 同步） */
  titleKey?: string;
  type: 'recommended' | 'activity' | 'village' | 'daily-question' | 'checkin';
  order: number;
  enabled: boolean;
}

// 展示文案 i18n 化（i18n-data-review #13）：5 个区块标题已抽为 i18n key（config.homeSections.*，zh/en 同步）。
// 注意：本配置当前无页面直接引用（首页区块由后端配置驱动），如后续接入展示，
// 必须通过 titleKey 经 t() 渲染，勿直接输出 title 中文兜底值。
export const homeSections: HomeSection[] = [
  { id: 'recommended', title: '推荐的人', titleKey: 'config.homeSections.recommended.title', type: 'recommended', order: 1, enabled: true },
  { id: 'activity', title: '校园活动', titleKey: 'config.homeSections.activity.title', type: 'activity', order: 2, enabled: true },
  { id: 'village', title: '村口动态', titleKey: 'config.homeSections.village.title', type: 'village', order: 3, enabled: true },
  { id: 'daily-question', title: '每日一问', titleKey: 'config.homeSections.dailyQuestion.title', type: 'daily-question', order: 4, enabled: true },
  { id: 'checkin', title: '每日签到', titleKey: 'config.homeSections.checkin.title', type: 'checkin', order: 5, enabled: true },
];
