# AUDITOR 写拦截前提审计：admin/ 下是否存在「GET 改库」

按 HTTP 方法分级拦写（`SecurityConfig` 里四条 `POST/PUT/PATCH/DELETE /api/v1/admin/**` 只放行
ADMIN/SUPER_ADMIN）成立的**唯一前提**是：没有 GET 端点会写库。若有，AUDITOR 就能借一次 GET 完成写操作。
本文件记录该前提的审计过程与结论；`SecurityConfig.java` 的注释引用了本结论。

## 命令

在 `apps/api/src/main/java/com/campuslove/api` 下执行（逐文件把 `@GetMapping` 到下一个 mapping
注解之间的方法体当作一个块，在块内搜变异标记）：

```bash
for f in $(grep -rl '@GetMapping' admin/); do awk -v F="$f" '
/@GetMapping/{inGet=1; start=NR; buf=""; next}
/@(Post|Put|Patch|Delete)Mapping/{inGet=0}
inGet{buf=buf $0 "\n"; if ($0 ~ /\.(save|saveAll|deleteById|delete\(|update\(|execute\(|persist|merge|flush)/ || $0 ~ /jdbcTemplate|@Modifying|recalc|reset[A-Z]|increment|clear\(/) {printf "%s:%d  GET-block mutation: %s\n", F, NR, $0}}
' "$f"; done
```

覆盖范围：`admin/` 下 **71 个 `@GetMapping` 注解**。

## 命中 4 处，逐条判定

| 位置 | 命中内容 | 判定 | 依据 |
|---|---|---|---|
| `admin/AdminActivityController.java:445` | `activityRepository.save(activity)` | **假阳性** | 该行在私有方法 `setPublished(Long,boolean)`（:434）内，调用方是 `@PostMapping("/{id}/publish")`（:310）与 `@PostMapping("/{id}/unpublish")`（:325）。awk 把它算进了上方 :389 的 GET 块。 |
| `admin/AdminPromoCodeController.java:278` | `promoCodeRepository.save(promo)` | **假阳性** | 该行在私有方法 `createPromoCode(...)`（:259）内，调用方是 `@PostMapping("/batch")`（:141）。awk 把它算进了上方 :219 的 `@GetMapping("/export")` 块。 |
| `admin/circle/EvidenceController.java:91` | `jdbcTemplate.query(sql, ...)` | **假阳性** | `query` 是读操作，命中只因标记里含 `jdbcTemplate`。 |
| `admin/circle/EvidenceController.java:108` | `jdbcTemplate.query(sql, ...)` | **假阳性** | 同上（`getUsersInCircle`）。 |

## 结论

**未发现任何 GET 端点写库**，按 HTTP 方法分级的写拦截可采纳。

## 残留风险（须知悉）

1. 本审计是文本级启发式：若某 GET 通过多层私有方法间接写库，且写操作所在行的关键字不在标记集内，会漏检。
2. 后续新增 admin 端点时该前提可能被破坏。任何把副作用挂到 GET 上的改动，都会让 AUDITOR 获得写能力——
   复审时应重跑上面的命令。
3. 类级 `@PreAuthorize` 已放宽到含 AUDITOR（33 个 controller），因此**兜底只剩这条方法规则**；
   它不再是"锦上添花"，而是 AUDITOR 只读语义的唯一屏障。若将来引入非 REST 语义的写入口
   （如 GraphQL、内部转发、`/error` 派发），需单独复核。
