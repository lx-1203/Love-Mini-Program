import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface VipPlan {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  duration: string;
  features: string[];
  isPopular?: boolean;
}

export const useVipStore = defineStore("vip", () => {
  const isVip = ref(false);
  const expireDate = ref<string | null>(null);

  const plans = ref<VipPlan[]>([
    {
      id: "monthly",
      name: "月度会员",
      price: 18,
      originalPrice: 28,
      duration: "1个月",
      features: ["专属标识", "解锁空档查看", "优先推荐"],
    },
    {
      id: "quarterly",
      name: "季度会员",
      price: 48,
      originalPrice: 84,
      duration: "3个月",
      features: ["专属标识", "解锁空档查看", "优先推荐", "隐身浏览", "消息加速"],
      isPopular: true,
    },
    {
      id: "yearly",
      name: "年度会员",
      price: 128,
      originalPrice: 336,
      duration: "12个月",
      features: ["专属标识", "解锁空档查看", "优先推荐", "隐身浏览", "消息加速", "专属客服"],
    },
  ]);

  const selectedPlan = ref<string>("quarterly");

  const currentPlan = computed(() => {
    return plans.value.find((p) => p.id === selectedPlan.value);
  });

  function selectPlan(planId: string) {
    selectedPlan.value = planId;
  }

  return {
    isVip,
    expireDate,
    plans,
    selectedPlan,
    currentPlan,
    selectPlan,
  };
});
