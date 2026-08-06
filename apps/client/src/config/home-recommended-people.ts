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

// 展示文案 i18n 化（i18n-data-review #7）：headline/commonGround/availability 抽为 i18n key
// （config.homeRecommendedPeople.*，zh/en 同步）；name/initials 为人名/姓氏，保持原样。
export const homeRecommendedPeople: HomeRecommendedPersonSeed[] = [
  {
    id: "person-1",
    name: "林安",
    initials: "林",
    headline: "工业设计大三，偏好低压力的第一轮聊天。",
    headlineKey: "config.homeRecommendedPeople.person1.headline",
    commonGround: "共同兴趣：电影夜和安静的咖啡馆路线",
    commonGroundKey: "config.homeRecommendedPeople.person1.commonGround",
    availability: "合适时间：今晚 19:00 之后",
    availabilityKey: "config.homeRecommendedPeople.person1.availability",
    avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_1,
  },
  {
    id: "person-2",
    name: "周沐",
    initials: "周",
    headline: "更适合从音乐话题切入，再配一段短距离校园散步。",
    headlineKey: "config.homeRecommendedPeople.person2.headline",
    commonGround: "节奏接近：更喜欢短时见面和明确时段",
    commonGroundKey: "config.homeRecommendedPeople.person2.commonGround",
    availability: "合适时间：周五 16:00-18:00",
    availabilityKey: "config.homeRecommendedPeople.person2.availability",
    avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_2,
  },
  {
    id: "person-3",
    name: "许诺",
    initials: "许",
    headline: "喜欢直接定计划、边界清楚、气氛放松的咖啡聊天。",
    headlineKey: "config.homeRecommendedPeople.person3.headline",
    commonGround: "共同偏好：校园人多时也接受室内兜底",
    commonGroundKey: "config.homeRecommendedPeople.person3.commonGround",
    availability: "合适时间：周末下午",
    availabilityKey: "config.homeRecommendedPeople.person3.availability",
    avatarUrl: IMAGE_PATHS.AVATARS.AVATAR_3,
  },
];
