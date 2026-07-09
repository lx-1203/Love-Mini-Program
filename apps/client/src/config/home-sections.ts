export interface HomeSection {
  id: string;
  title: string;
  type: 'recommended' | 'activity' | 'village' | 'daily-question' | 'checkin';
  order: number;
  enabled: boolean;
}

export const homeSections: HomeSection[] = [
  { id: 'recommended', title: '推荐的人', type: 'recommended', order: 1, enabled: true },
  { id: 'activity', title: '校园活动', type: 'activity', order: 2, enabled: true },
  { id: 'village', title: '村口动态', type: 'village', order: 3, enabled: true },
  { id: 'daily-question', title: '每日一问', type: 'daily-question', order: 4, enabled: true },
  { id: 'checkin', title: '每日签到', type: 'checkin', order: 5, enabled: true },
];
