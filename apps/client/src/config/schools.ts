/**
 * 学校列表配置
 * 集中管理所有可选学校，方便增删改
 *
 * Task 3.6.1：新增 loadSchools() 异步从后端 /api/v1/config/campuses 拉取，
 * 失败时回退到本地 SCHOOLS 静态默认值，保证首屏渲染不阻塞。
 * 调用方应在用户进入「校园认证 / 校区筛选」页面时调用 loadSchools() 刷新列表，
 * 同步引用 SCHOOLS 仅作为初始渲染兜底。
 */
import { loadCampuses } from "../services/config";

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
  // 修复（严格模式 noUncheckedIndexedAccess）：SCHOOLS[0] 索引访问返回 School | undefined，
  // 此处追加可选链兜底，确保未匹配时仍返回非空字符串。
  return SCHOOLS.find(s => s.id === id)?.name ?? SCHOOLS[0]?.name ?? '';
}

/**
 * 从后端动态加载学校列表（Task 3.6.1）。
 *
 * 调用 GET /api/v1/config/campuses，返回学校视图列表。
 * 失败时回退到本地 SCHOOLS 静态默认值，保证功能可用性。
 *
 * @returns 学校列表（后端数据或本地兜底）
 */
export async function loadSchools(): Promise<School[]> {
  try {
    const campuses = await loadCampuses();
    if (campuses.length === 0) {
      return SCHOOLS;
    }
    return campuses.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city ?? undefined,
    }));
  } catch (_e) {
    // 后端不可达或返回异常：回退到本地静态默认值
    return SCHOOLS;
  }
}

