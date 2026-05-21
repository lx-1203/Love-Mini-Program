export interface HomeRecommendedPersonSeed {
  id: string;
  name: string;
  initials: string;
  headline: string;
  commonGround: string;
  availability: string;
}

export const homeRecommendedPeople: HomeRecommendedPersonSeed[] = [
  {
    id: "person-1",
    name: "林安",
    initials: "林",
    headline: "工业设计大三，偏好低压力的第一轮聊天。",
    commonGround: "共同兴趣：电影夜和安静的咖啡馆路线",
    availability: "合适时间：今晚 19:00 之后",
  },
  {
    id: "person-2",
    name: "周沐",
    initials: "周",
    headline: "更适合从音乐话题切入，再配一段短距离校园散步。",
    commonGround: "节奏接近：更喜欢短时见面和明确时段",
    availability: "合适时间：周五 16:00-18:00",
  },
  {
    id: "person-3",
    name: "许诺",
    initials: "许",
    headline: "喜欢直接定计划、边界清楚、气氛放松的咖啡聊天。",
    commonGround: "共同偏好：校园人多时也接受室内兜底",
    availability: "合适时间：周末下午",
  },
];
