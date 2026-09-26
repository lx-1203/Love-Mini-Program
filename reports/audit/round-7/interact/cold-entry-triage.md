# round-7 执行轮 FAILED 归属（冷启动守卫 vs 未解释）

- 生成：`scripts/qa/triage-cold-entry.mjs`（HEAD 36058ff3，输入 reports/audit/round-7/interact/exec-results.json）
- 输入 FAILED 行数：134；按 (页 -> 实际落点) 归并后 9 组
- 分桶：GUARD_COLD_ENTRY=114｜GUARD_GLOBAL=20

| 用例页 | 实际落点 | 行数 | 判定 | 依据 |
| --- | --- | --- | --- | --- |
| `pages/login/index` | `pages/discover/index` | 37 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 pages/discover/index 的导航（行 89,120,519，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/campus/campus/index` | `subpackages/campus/campus/hub` | 20 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 subpackages/campus/campus/hub 的导航（行 202，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/discover-extra/discover/matching` | `pages/discover/index` | 23 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 pages/discover/index 的导航（行 69，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/village/village/tag-posts` | `subpackages/village/village/index` | 9 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 subpackages/village/village/index 的导航（行 258，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/setup/campus/index` | `pages/discover/index` | 11 | GUARD_GLOBAL | 页面内无任何导航；全局载体 guards/session-guard.ts:93 里有指向 pages/discover/index 的导航 ⇒ 归全局守卫 |
| `subpackages/setup/recommend-pref/index` | `pages/discover/index` | 9 | GUARD_GLOBAL | 页面内无任何导航；全局载体 guards/session-guard.ts:93 里有指向 pages/discover/index 的导航 ⇒ 归全局守卫 |
| `subpackages/vip/index` | `pages/profile/index` | 11 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 pages/profile/index 的导航（行 63,265，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/vip/promo-code` | `pages/profile/index` | 8 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 pages/profile/index 的导航（行 39,186，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |
| `subpackages/vip/bills` | `pages/profile/index` | 6 | GUARD_COLD_ENTRY | 页面自身代码里出现指向 pages/profile/index 的导航（行 42,162，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证 |

## 判读口径
- `GUARD_COLD_ENTRY` 只说明「这一组用例不能靠冷启动直达取证」，**不说明页面功能正常**；
  这些用例的真伪仍要靠交互路径（先导航进来再看）复测，属于 §16 的交互切片欠款。
- `UNEXPLAINED` / `GUARD_OTHER` / `NO_SOURCE` 一律算本轮范围内的开口，不许并进守卫桶蒙过去。
