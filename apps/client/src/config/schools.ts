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
import { isDev } from "./env";

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
  /**
   * 该校专业目录（可选；缺省时使用通用专业目录 MAJORS 兜底）。
   *
   * 2026-10-27 后端补真源（本次接线）：新表 {@code school_majors}
   * （database/flyway/sql/V2026.10.27.0001__create_school_majors.sql）+
   * CampusView.majors（apps/api/.../clientconfig/CampusView.java）+ 客户端镜像
   * services/config.ts 的 CampusView.majors。数据分两档：
   * - school_code = 具体高校编码（大写，如 NJU）＝按校专属目录；
   * - school_code = '*' ＝通用基线档（67 条，即本文件 MAJORS 的同源入库）。
   * **当前库里只有基线档**：没有任何权威来源（教育部学科备案 / 各校本科招生专业目录）
   * 被导入过，所以后端对 17 所学校一律回退基线并记一行日志。也就是说这个字段现在
   * 下发的是「通用目录」而不是「这所学校开什么专业」，展示层不得把它包装成按校事实。
   *
   * ✅ 口径已统一（2026-10-28 产品裁定＝统一到字典，两处均已接线，不再是待决项）：
   * 1. subpackages/setup/campus/index.vue（注册页第 2 步）：专业＝字典 picker；
   * 2. subpackages/campus/campus/certification.vue（学生证认证页）：专业原为**自由文本 input**，
   *    现已改为与注册页**同一个数据源**的 <picker mode="selector">——同样调 loadSchools()
   *    取列表、同样用 getMajorsForSchool(schools.find(s => s.name === 校名)) 出选项，
   *    本字段因此同时供两条路径消费（选项为空时两页都回退 MAJORS）。
   *
   * 旧值兜底策略（这条统一的承重约束：**不许卡住任何已提交过的用户**）：
   * 认证页历史上吃自由文本，campus_certifications.major（VARCHAR(100)，后端
   * CampusController 只 @Size(max=100)、**无字典校验**）里留过不在本字典内的行。认证页把
   * 「当前已提交值不在字典里」的那一项**临时前置进 picker 选项首位**，故旧值仍原样可见、
   * 仍原样可提交，不会被 picker 静默改成字典内的另一个专业；已认证态的只读回显渲染原始
   * 字符串，不经字典、不经 picker，同样保真。注册页则沿用其原有的「历史值不在选项内就留空」。
   *
   * ⇒ 结论仍未变的部分：因为历史行可以是字典外文本、且后端不校验字典，任何「按 major
   * 统计/分组」的需求仍要先做值域清洗（只有本次之后新提交的值才保证落在字典内）。
   */
  majors?: string[];
  /** majors 的来源档：`"school"` 按校真源 / `"baseline"` 通用基线 / undefined 未知（本地常量或旧响应） */
  majorsSource?: string;
  /** 校园圈封面图（可选；未上传时渲染浅绿背景+学校名字，上传后渲染图片——保留上传能力） */
  coverUrl?: string;
}

// 展示文案 i18n 化（i18n-data-review #10）：学校名/城市已抽为 i18n key（config.schools.*，zh/en 同步）。
// 说明（#49）：当前仅 4 所名校，覆盖面不足且与 pages/home/index.vue 内联学校数组重复，
// 属数据层面问题，另见 loadSchools() 优先使用后端 /api/v1/config/campuses 返回。
export const SCHOOLS: School[] = [
  { id: 'pku', name: '北京大学', nameKey: 'config.schools.pku.name', city: '北京', cityKey: 'config.schools.pku.city' },
  { id: 'thu', name: '清华大学', nameKey: 'config.schools.thu.name', city: '北京', cityKey: 'config.schools.thu.city' },
  { id: 'ruc', name: '中国人民大学', nameKey: 'config.schools.ruc.name', city: '北京', cityKey: 'config.schools.ruc.city' },
  { id: 'fudan', name: '复旦大学', nameKey: 'config.schools.fudan.name', city: '上海', cityKey: 'config.schools.fudan.city' },
  { id: 'sjtu', name: '上海交通大学', nameKey: 'config.schools.sjtu.name', city: '上海', cityKey: 'config.schools.sjtu.city' },
  { id: 'tongji', name: '同济大学', nameKey: 'config.schools.tongji.name', city: '上海', cityKey: 'config.schools.tongji.city' },
  { id: 'zju', name: '浙江大学', nameKey: 'config.schools.zju.name', city: '杭州', cityKey: 'config.schools.zju.city' },
  { id: 'nju', name: '南京大学', nameKey: 'config.schools.nju.name', city: '南京', cityKey: 'config.schools.nju.city' },
  { id: 'whu', name: '武汉大学', nameKey: 'config.schools.whu.name', city: '武汉', cityKey: 'config.schools.whu.city' },
  { id: 'sysu', name: '中山大学', nameKey: 'config.schools.sysu.name', city: '广州', cityKey: 'config.schools.sysu.city' },
  { id: 'szu', name: '深圳大学', nameKey: 'config.schools.szu.name', city: '深圳', cityKey: 'config.schools.szu.city' },
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

/** 获取某校的专业目录（按校目录缺失时回退通用目录 MAJORS） */
export function getMajorsForSchool(school: School | undefined): string[] {
  // 优先级：后端按校档 > 后端通用基线档（两者都由 loadSchools() 装进 school.majors）
  // > 本地静态 SCHOOLS 的 majors（当前 11 所全未填，等于直通）> 本地通用目录 MAJORS。
  // 最后一档是本文件唯一的兜底，绝不下发空数组：空 picker 会被用户读成
  // 「这所学校没有专业」，而事实只是「字典没数据」。
  return school?.majors && school.majors.length > 0 ? school.majors : MAJORS;
}

/**
 * 后端校区与本地静态学校的对齐（跨源匹配）。
 *
 * 已实测两个口径对不齐，必须按下面的顺序兜底，且**对不齐时不许崩**（返回 undefined，
 * 调用方落到回退分支）：
 * - 后端 id 是 schools.code 大写（PKU/THU/FDU/…），本地 id 是小写 slug（pku/fudan/…），
 *   且两者并非简单大小写关系：本地 `fudan` ↔ 后端 `FDU`、本地 `tongji` ↔ 后端 `TJU`
 *   ⇒ 先按大小写不敏感的 id 比，比不上再按**中文全等 name** 兜底（name 是两源共同的稳定键，
 *   schools.name 上有唯一约束）。
 * - 本地独有「深圳大学」（后端 schools 表 17 所里没有它）；后端独有 6 所
 *   （广州大学/四川大学/华中科技大学/西安交通大学/哈尔滨工业大学/南开大学）。
 *   两源的并集与差集都会随种子变动，所以匹配失败是**预期路径**，不是异常。
 */
function matchLocalSchool(campus: { id: string; name: string }): School | undefined {
  const byId = SCHOOLS.find((s) => s.id.toLowerCase() === campus.id.toLowerCase());
  return byId ?? SCHOOLS.find((s) => s.name === campus.name);
}

/**
 * 从后端动态加载学校列表（Task 3.6.1；专业目录 2026-10-27 接入 school_majors 真源）。
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
    // 取 id/name/city/majors + city 空值归一。majors 自 2026-10-27 起在 CampusView 契约里
    //（后端 school_majors 表：按校档命中给按校目录，否则后端自己回退通用基线档），
    // 这里把它带进前端 School 对象，供 setup/campus 三级联动的第三级 picker 消费。
    // nameKey/cityKey/coverUrl 仍不在 CampusView 契约里（后端不下发 i18n key 与封面），
    // 只有本地静态 SCHOOLS 带 ⇒ 走后端分支时这三项为 undefined，消费方按 name 直显
    //（本域 setup/campus 的三级联动就取 s.name）。
    return campuses.map((c) => {
      const local = matchLocalSchool(c);
      // 后端没给目录（null / 缺键 / 空数组）时不硬回退 MAJORS，而是先看本地静态有没有配过
      // 这所学校的专属目录；都没有才留 undefined，交给 getMajorsForSchool() 兜到 MAJORS。
      const backendMajors = c.majors && c.majors.length > 0 ? c.majors : undefined;
      const localMajors = local?.majors && local.majors.length > 0 ? local.majors : undefined;
      return {
        id: c.id,
        name: c.name,
        city: c.city ?? local?.city,
        majors: backendMajors ?? localMajors,
        // 只有"后端给的目录"才谈得上档位；本地静态配过的那几所属于本仓库内置常量，
        // 不给 majorsSource（消费方据此只对后端档位做文案区分）。
        majorsSource: backendMajors ? (c.majorsSource ?? undefined) : undefined,
        // 对齐到本地静态项时顺带补回 i18n key / 封面，让已收录的 11 所继续走 t() 渲染；
        // 对不齐（后端独有那 6 所）就是 undefined，消费方按 name 直显，不崩。
        nameKey: local?.nameKey,
        cityKey: local?.cityKey,
        coverUrl: local?.coverUrl,
      };
    });
  } catch (error) {
    // 后端不可达或返回异常：回退到本地静态默认值，保证功能可用性。
    // 注意本地 11 所都没填 majors，所以这条分支下专业目录恒回退 MAJORS（本文件内兜底）。
    // infra R2-00122: 失败不再完全静默——输出告警便于联调排查与运营感知
    //（学校列表长期缺失时无任何信号，原审计项要求失败上报）；
    // 生产环境的请求错误由 http 层统一错误通道处理。
    // 诊断日志仅在开发环境输出（R4-00529）
    if (isDev) {
      console.warn("[schools] loadSchools 后端拉取失败，回退本地静态列表:", error);
    }
    return SCHOOLS;
  }
}

