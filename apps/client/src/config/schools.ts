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
  /** 学校名（中文兜底；作为纯数据使用时保留，展示层优先用 nameKey 经 t() 渲染） */
  name: string;
  /** 学校名的 i18n key（config.schools.{id}.name，zh/en 同步） */
  nameKey?: string;
  /** 所在城市 */
  city?: string;
  /** 城市名的 i18n key（config.schools.{id}.city，zh/en 同步） */
  cityKey?: string;
}

// 展示文案 i18n 化（i18n-data-review #10）：学校名/城市已抽为 i18n key（config.schools.*，zh/en 同步）。
// 说明（#49）：当前仅 4 所名校，覆盖面不足且与 pages/home/index.vue 内联学校数组重复，
// 属数据层面问题，另见 loadSchools() 优先使用后端 /api/v1/config/campuses 返回。
export const SCHOOLS: School[] = [
  { id: 'pku', name: '北京大学', nameKey: 'config.schools.pku.name', city: '北京', cityKey: 'config.schools.pku.city' },
  { id: 'thu', name: '清华大学', nameKey: 'config.schools.thu.name', city: '北京', cityKey: 'config.schools.thu.city' },
  { id: 'fudan', name: '复旦大学', nameKey: 'config.schools.fudan.name', city: '上海', cityKey: 'config.schools.fudan.city' },
  { id: 'zju', name: '浙江大学', nameKey: 'config.schools.zju.name', city: '杭州', cityKey: 'config.schools.zju.city' },
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
  } catch (error) {
    // 后端不可达或返回异常：回退到本地静态默认值，保证功能可用性。
    // infra R2-00122: 失败不再完全静默——输出告警便于联调排查与运营感知
    //（学校列表长期缺失时无任何信号，原审计项要求失败上报）；
    // 生产环境的请求错误由 http 层统一错误通道处理。
    console.warn("[schools] loadSchools 后端拉取失败，回退本地静态列表:", error);
    return SCHOOLS;
  }
}

