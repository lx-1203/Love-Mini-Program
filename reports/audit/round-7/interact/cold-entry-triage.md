# round-7 执行轮 FAILED 归属（冷启动守卫 vs 未解释）

- 生成：`scripts/qa/triage-cold-entry.mjs`（HEAD 0d59f6a0，输入 reports/audit/round-7/interact/exec-results.json）
- 输入 FAILED 行数：45；按 (页 -> 实际落点) 归并后 8 组
- 分桶：GUARD_COLD_ENTRY=34｜UNEXPLAINED=11

| 用例页 | 实际落点 | 行数 | 判定 | 依据 |
| --- | --- | --- | --- | --- |
| `subpackages/campus/campus/index` | `subpackages/campus/campus/hub` | 8 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 subpackages/campus/campus/hub 的导航（行 202，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/discover-extra/discover/matching` | `pages/discover/index` | 17 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 pages/discover/index 的导航（行 69，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/village/village/tag-posts` | `subpackages/village/village/index` | 2 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 subpackages/village/village/index 的导航（行 258，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/setup/campus/index` | `pages/discover/index` | 6 | UNEXPLAINED | 页面内没有导航语句，App.vue/常见守卫载体里也找不到指向 pages/discover/index 的导航 ⇒ 弹走原因未定，这条是开口 |
| `subpackages/setup/recommend-pref/index` | `pages/discover/index` | 5 | UNEXPLAINED | 页面内没有导航语句，App.vue/常见守卫载体里也找不到指向 pages/discover/index 的导航 ⇒ 弹走原因未定，这条是开口 |
| `subpackages/vip/index` | `pages/profile/index` | 2 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 pages/profile/index 的导航（行 63,265，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/vip/promo-code` | `pages/profile/index` | 1 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 pages/profile/index 的导航（行 39,186，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/vip/bills` | `pages/profile/index` | 4 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 pages/profile/index 的导航（行 42,162，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |

## 判读口径
- `GUARD_COLD_ENTRY` 只说明「这一组用例不能靠冷启动直达取证」，**不说明页面功能正常**；
  这些用例的真伪仍要靠交互路径（先导航进来再看）复测，属于 §16 的交互切片欠款。
- `UNEXPLAINED` / `GUARD_OTHER` / `NO_SOURCE` 一律算本轮范围内的开口，不许并进守卫桶蒙过去。
