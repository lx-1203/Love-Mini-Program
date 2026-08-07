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
  /** 该校专业目录（可选；缺省时使用通用专业目录 MAJORS 兜底） */
  majors?: string[];
}

// 展示文案 i18n 化（i18n-data-review #10）：学校名/城市已抽为 i18n key（config.schools.*，zh/en 同步）。
// 说明（#49）：当前仅 4 所名校，覆盖面不足且与 pages/home/index.vue 内联学校数组重复，
// 属数据层面问题，另见 loadSchools() 优先使用后端 /api/v1/config/campuses 返回。
export const SCHOOLS: School[] = [
  { id: 'pku', name: '北京大学', nameKey: 'config.schools.pku.name', city: '北京', cityKey: 'config.schools.pku.city' },
  { id: 'thu', name: '清华大学', nameKey: 'config.schools.thu.name', city: '北京', cityKey: 'config.schools.thu.city' },
  { id: 'ruc', name: '中国人民大学', city: '北京' },
  { id: 'fudan', name: '复旦大学', nameKey: 'config.schools.fudan.name', city: '上海', cityKey: 'config.schools.fudan.city' },
  { id: 'sjtu', name: '上海交通大学', city: '上海' },
  { id: 'tongji', name: '同济大学', city: '上海' },
  { id: 'zju', name: '浙江大学', nameKey: 'config.schools.zju.name', city: '杭州', cityKey: 'config.schools.zju.city' },
  { id: 'nju', name: '南京大学', city: '南京' },
  { id: 'whu', name: '武汉大学', city: '武汉' },
  { id: 'sysu', name: '中山大学', city: '广州' },
  { id: 'szu', name: '深圳大学', city: '深圳' },
];

/** 默认选中的学校 ID */
export const DEFAULT_SCHOOL_ID = 'pku';

/**
 * 通用专业目录（2026-08-07 校园认证表单升级）。
 *
 * 学校未配置专属专业目录（School.majors）时使用此列表兜底，
 * 覆盖常见文理工医艺学科，按通用学科门类平铺。
 */
export const MAJORS: string[] = [
  // 工学
  "计算机科学与技术", "软件工程", "电子信息工程", "通信工程", "人工智能",
  "自动化", "电气工程及其自动化", "机械工程", "机械设计制造及其自动化",
  "土木工程", "建筑学", "城乡规划", "材料科学与工程", "能源与动力工程",
  "航空航天工程", "车辆工程", "环境工程", "化学工程与工艺", "生物医学工程",
  // 理学
  "数学与应用数学", "信息与计算科学", "物理学", "应用物理学", "化学",
  "应用化学", "生物科学", "生物技术", "统计学", "地理科学",
  // 经管
  "经济学", "金融学", "金融工程", "国际经济与贸易", "会计学",
  "财务管理", "市场营销", "工商管理", "人力资源管理", "信息管理与信息系统",
  "电子商务", "物流管理",
  // 法学与人文社科
  "法学", "社会学", "新闻学", "传播学", "汉语言文学",
  "英语", "日语", "翻译", "历史学", "哲学", "心理学", "教育学",
  // 医学与农学
  "临床医学", "口腔医学", "药学", "护理学", "农学", "园艺学",
  // 艺术与设计
  "工业设计", "视觉传达设计", "环境设计", "数字媒体艺术", "产品设计",
  "音乐表演", "舞蹈学", "播音与主持艺术",
];

/** 根据 ID 获取学校名称 */
export function getSchoolName(id: string): string {
  // 修复（严格模式 noUncheckedIndexedAccess）：SCHOOLS[0] 索引访问返回 School | undefined，
  // 此处追加可选链兜底，确保未匹配时仍返回非空字符串。
  return SCHOOLS.find(s => s.id === id)?.name ?? SCHOOLS[0]?.name ?? '';
}

/**
 * 提取学校列表去重后的城市列表（保持原顺序）。
 * 校园认证表单「城市」选择器选项：只展示存在高校的城市，保证三级联动每一级都有结果。
 */
export function getCities(schools: School[]): string[] {
  const seen = new Set<string>();
  const cities: string[] = [];
  for (const s of schools) {
    const city = s.city;
    if (city && !seen.has(city)) {
      seen.add(city);
      cities.push(city);
    }
  }
  return cities;
}

/** 按城市筛选学校列表（保留原顺序） */
export function getSchoolsByCity(schools: School[], city: string): School[] {
  return schools.filter((s) => s.city === city);
}

/** 获取某校的专业目录（学校未配置时回退通用目录） */
export function getMajorsForSchool(school: School | undefined): string[] {
  return school?.majors && school.majors.length > 0 ? school.majors : MAJORS;
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

