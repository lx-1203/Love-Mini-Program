import { IMAGE_PATHS } from "@/config/images";

export interface HomeRecommendedPersonSeed {
  id: string;
  name: string;
  initials: string;
  headline: string;
  commonGround: string;
  availability: string;
  avatarUrl: string;
  /** headline 的 i18n key（config.homeRecommendedPeople.{id}.headline），展示层优先经 t() 渲染 */
  headlineKey?: string;
  /** commonGround 的 i18n key（config.homeRecommendedPeople.{id}.commonGround） */
  commonGroundKey?: string;
  /** availability 的 i18n key（config.homeRecommendedPeople.{id}.availability） */
  availabilityKey?: string;
}

// 9 人素材角色表（v3 冻结 · 与 config/people-role.ts、docs/design/people-fixture.json 同源）。
// 展示文案 i18n 化（config.homeRecommendedPeople.*，zh/en 同步）；name/initials 为人名/姓氏，保持原样。
export const homeRecommendedPeople: HomeRecommendedPersonSeed[] = [
  { id: "person-1", name: "林晓", initials: "林", headline: "北京大学 · 大三 · 工业设计", headlineKey: "config.homeRecommendedPeople.person1.headline", commonGround: "共同兴趣：电影夜和安静的咖啡馆路线", commonGroundKey: "config.homeRecommendedPeople.person1.commonGround", availability: "合适时间：今晚 19:00 之后", availabilityKey: "config.homeRecommendedPeople.person1.availability", avatarUrl: IMAGE_PATHS.PEOPLE.AVATAR_1 },
  { id: "person-2", name: "夏言", initials: "夏", headline: "清华大学 · 研一 · 建筑学", headlineKey: "config.homeRecommendedPeople.person2.headline", commonGround: "节奏接近：更喜欢短时见面和明确时段", commonGroundKey: "config.homeRecommendedPeople.person2.commonGround", availability: "合适时间：周五 16:00-18:00", availabilityKey: "config.homeRecommendedPeople.person2.availability", avatarUrl: IMAGE_PATHS.PEOPLE.AVATAR_2 },
  { id: "person-3", name: "阿辰", initials: "阿", headline: "复旦大学 · 大二 · 日语系", headlineKey: "config.homeRecommendedPeople.person3.headline", commonGround: "共同偏好：校园人多时也接受室内兜底", commonGroundKey: "config.homeRecommendedPeople.person3.commonGround", availability: "合适时间：周末下午", availabilityKey: "config.homeRecommendedPeople.person3.availability", avatarUrl: IMAGE_PATHS.PEOPLE.AVATAR_3 },
  { id: "person-4", name: "小满", initials: "小", headline: "浙江大学 · 大四 · 新闻传播", headlineKey: "config.homeRecommendedPeople.person4.headline", commonGround: "你们都选了摄影话题", commonGroundKey: "config.homeRecommendedPeople.person4.commonGround", availability: "合适时间：每天傍晚", availabilityKey: "config.homeRecommendedPeople.person4.availability", avatarUrl: IMAGE_PATHS.PEOPLE.AVATAR_4 },
  { id: "person-5", name: "Luna", initials: "L", headline: "中国人民大学 · 大一 · 设计", headlineKey: "config.homeRecommendedPeople.person5.headline", commonGround: "你们都选了旅行话题", commonGroundKey: "config.homeRecommendedPeople.person5.commonGround", availability: "合适时间：下午没课的时候", availabilityKey: "config.homeRecommendedPeople.person5.availability", avatarUrl: IMAGE_PATHS.PEOPLE.AVATAR_5 },
  { id: "person-6", name: "草莓", initials: "草", headline: "南京大学 · 大三 · 法学", headlineKey: "config.homeRecommendedPeople.person6.headline", commonGround: "你们都选了美食话题", commonGroundKey: "config.homeRecommendedPeople.person6.commonGround", availability: "合适时间：周二、周四晚上", availabilityKey: "config.homeRecommendedPeople.person6.availability", avatarUrl: IMAGE_PATHS.PEOPLE.AVATAR_6 },
  { id: "person-7", name: "苏奈", initials: "苏", headline: "武汉大学 · 研二 · 医学", headlineKey: "config.homeRecommendedPeople.person7.headline", commonGround: "你们都选了户外话题", commonGroundKey: "config.homeRecommendedPeople.person7.commonGround", availability: "合适时间：周末全天", availabilityKey: "config.homeRecommendedPeople.person7.availability", avatarUrl: IMAGE_PATHS.PEOPLE.AVATAR_7 },
  { id: "person-8", name: "周岚", initials: "周", headline: "上海交通大学 · 大三 · 电影研究", headlineKey: "config.homeRecommendedPeople.person8.headline", commonGround: "你们都选了电影话题", commonGroundKey: "config.homeRecommendedPeople.person8.commonGround", availability: "合适时间：周六下午", availabilityKey: "config.homeRecommendedPeople.person8.availability", avatarUrl: IMAGE_PATHS.PEOPLE.AVATAR_8 },
  { id: "person-9", name: "林晚", initials: "林", headline: "中山大学 · 大二 · 摄影", headlineKey: "config.homeRecommendedPeople.person9.headline", commonGround: "你们都选了摄影话题", commonGroundKey: "config.homeRecommendedPeople.person9.commonGround", availability: "合适时间：周三、周五晚上", availabilityKey: "config.homeRecommendedPeople.person9.availability", avatarUrl: IMAGE_PATHS.PEOPLE.AVATAR_9 },
];
