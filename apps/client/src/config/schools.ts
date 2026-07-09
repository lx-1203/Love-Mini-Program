/**
 * 学校列表配置
 * 集中管理所有可选学校，方便增删改
 */
export interface School {
  id: string;
  name: string;
  /** 所在城市 */
  city?: string;
}

export const SCHOOLS: School[] = [
  { id: 'pku', name: '北京大学', city: '北京' },
  { id: 'thu', name: '清华大学', city: '北京' },
  { id: 'fudan', name: '复旦大学', city: '上海' },
  { id: 'zju', name: '浙江大学', city: '杭州' },
];

/** 默认选中的学校 ID */
export const DEFAULT_SCHOOL_ID = 'pku';

/** 根据 ID 获取学校名称 */
export function getSchoolName(id: string): string {
  return SCHOOLS.find(s => s.id === id)?.name ?? SCHOOLS[0].name;
}
