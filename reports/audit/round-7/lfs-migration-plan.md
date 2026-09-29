# LFS 迁移方案与代价（只出方案，不执行）

生成于 2026-09-29。用户要求："这个你先告诉我具体要怎么做、有什么风险，我看完再决定" ——
所以**本文件是我给你的决策材料，盘上没有发生任何迁移**。

## 0. 先量现状（每条都是本机实跑，不是估计）

| 项 | 实测值 | 怎么量的 |
|---|---|---|
| Git LFS 客户端 | **已装**：`git-lfs/3.4.1 (windows amd64; go 1.20.11)` | `git lfs version`；`which git-lfs` ⇒ `/mingw64/bin/git-lfs` |
| `filter.lfs.*` 配置 | **已完整配好 4 条**：clean / smudge / process / `required=true` ⇒ "装 LFS"这步早就完成了，缺的只是规则文件与被迁对象 | `git config --get-regexp 'filter.lfs'` |
| `.gitattributes` 是否入库 | **未入库**（0 个跟踪文件） | `git ls-files .gitattributes \| wc -l` |
| 提交总数 | **339**（此处原写 665 是错的：那条 `du`/`ls-files` 串在同一命令里超时截断，我把半截输出当计数读了。已按 `git rev-list --count HEAD` 复量） | `git rev-list --count HEAD` |
| 远端 | **有，且是公开 GitHub 仓**：`origin = git@github.com:lx-1203/Love-Mini-Program.git`；refs 里除 `main`/`origin/main`/`origin/xingji` 外还有 `reasonix/delivery-20260805-…` 与 `worktree-agent-general-purpose-72d31d9b`（**另一个 agent 的 worktree 分支仍在**） | `git remote -v`、`git for-each-ref` |
| 是否已被重写过的残迹 | **没有**：`refs/original/*` 空、`.git/filter-repo` 不存在。但有一个手工备份 ref `original/refs/heads/main → d060d6f9`，只含 **14** 个提交（早期快照，与今天 339 个不同链） | `git for-each-ref 'refs/original/*'`、`git rev-list --count original/refs/heads/main` |
| `.git` 体积 | **1070 MB** | `du -sk .git` |
| `reports/screenshots` 盘上体积 | **751 MB** | `du -sk reports/screenshots` |
| 已跟踪的帧文件 | **834**（png/jpg/jpeg） | `git ls-files -- reports/screenshots \| grep -cE '\.(png\|jpe?g)$'` |
| 未跟踪的证据目录/文件 | 100+ 条目（本轮终验留在盘上的产物） | `git status --short \| grep -c '^??'` |

另两条与本决策直接相关的既有事实：
- **99% 的"png"其实是 JPEG 字节**（早前实测 826/835），文件名却是 `.png` ⇒ 迁 LFS 前不改正，
  LFS 的 include 规则与日后任何按扩展名的处理都会踩坑。
- 清单里的绝对路径已经改成仓库相对路径并加了 fail-closed 闸（commit `6b83945c`），
  所以裁定 4 的**第二半已完成**，剩下的只有"帧进 LFS"这半。
- `.gitattributes` 候选件我放在 `​.zcode/tmp/lane-relpath/gitattributes.candidate`，
  故意没放进仓库根：**git 即使在该文件未被跟踪时也会读它**，放进去就等于在没人审核时改变全仓行为。

## 1. 为什么这件事有风险，而且风险是结构性的

本仓库的整套 QA 判定**建立在"提交号"上**，不是建立在文件内容上。门禁读 `gitSha` 的地方：

- `scripts/qa/verify-provenance-all.mjs` —— 逐帧比较 `帧 mtime` 与 `所记提交的时间`，判 `CONSISTENT / PRE_STAMP / STALE / UNRESOLVABLE`；
- `scripts/qa/verify-evidence-corpus.mjs` —— 按 manifest 顶层 `gitSha` 判"可解析的历史"还是"不可核实"；
- `scripts/qa/verify-band-freshness.mjs` —— 产物档位带 `mode@sha8`（如 `real@f0677920`）；
- `scripts/qa/verify-real-coverage.mjs`、`exec-frames-to-corpus.mjs:70`（行内 `bandSha`）、
  `r-exec-cli.mjs` 每次开腿的 `GIT_SHA`。

**`git filter-repo` / `bfg` 重写历史会给每一个提交重新算号。** 339 个提交全变，
于是盘上所有 `gitSha=…`、`bandSha=…`、`real@f0677920` 这类引用**同时指向不存在的对象**。
后果不是"变慢"，是：

- `verify-provenance-all`：`commitDate(sha)` 取不到 ⇒ 大量帧落进 `UNRESOLVABLE`，门红；
- `verify-evidence-corpus`：`resolvableOlder` 全部转 `unresolvable` ⇒ 门红（这条现在只有 1 个红项，
  重写后会变成几十项）；
- `verify-band-freshness`：产物带名里的 `sha8` 不再对应任何提交 ⇒ 判据失效；
- 本轮已经落账的证据（含我刚提交的 19 份读数件、守卫车道的 `exec-guest-real-guard-r10`）
  **全部失去出处** —— 这是不可逆的：老提交号一旦不存在，就没有第二份记录能对账。

一句话：**重写历史会把本项目的证据链从"可核"直接降到"不可核"，而这正是这套工作流唯一的价值所在。**

## 2. 如果仍要迁，代价最小的做法（分三步，每步都可停）

### 步骤 A（无风险，建议先做，且**不改历史**）
只让**今后**新增的帧走 LFS，历史一动不动：

```bash
# 1) 装 hooks（已装客户端，这步只写本地 .git/hooks 与 config）
git lfs install --local
# 2) 把规则写成入库的一份 .gitattributes —— 注意：这一步才开始改变全仓行为，需你过目内容
cp .zcode/tmp/lane-relpath/gitattributes.candidate .gitattributes
git add .gitattributes && git commit -m "chore(lfs): 帧类产物今后走 LFS（只对未来生效，不改历史）"
# 3) 验证：放一张新帧，确认 git lfs status 认它
```

- 影响面：`.git` 仍是 1070 MB（历史里的大对象没走），但**增量停止**。 clone 变慢的问题只解决一半。
- 可逆：删掉 `.gitattributes` 并提交即可；没有对象被移动。
- 代价：几分钟，无历史损失。

### 步骤 B（要改历史，**必须在克隆里演练**）
真要把 1070 MB 降下来，只能重写。安全做法是**绝不动主仓**：

```bash
# 0) 先做一个冷备份（这一步不可省）
cp -a .git /d/备份/恋爱小程序-.git-$(date +%Y%m%d-%H%M).bak
# 1) 全新克隆到别处，演练在克隆里做
git clone file:///d/6/恋爱小程序 /d/tmp/lfs-dryrun && cd /d/tmp/lfs-dryrun
git lfs install --local
git lfs migrate import --include="*.png,*.jpg,*.jpeg" --everything   # ← 这一步重新计算所有提交号
# 2) 在演练仓里把 12 条门禁全部跑一遍，看证据链掉到什么程度
# 3) 只有演练结果你能接受，才谈下一步
```

演练必须回答的三个问题（我现在无法替它回答，因为没跑）：
1. `PROV_FRAMES_UNRESOLVABLE` 会从 0 涨到多少？（预期：接近 9184 全量）
2. `CORPUS_EXPIRED_GITSHA` 之外，`unresolvable` 会吃进多少个 manifest？（当前 53 个 manifest 有帧）
3. 三档产物的 `mode@sha8` 还能不能解析？

### 步骤 C（推远端，风险最高，我不会做）
远端不是空的本地仓，而是 **`git@github.com:lx-1203/Love-Mini-Program.git`（公开 GitHub 仓）**，
`git push --force-with-lease` 会：
- 让**所有其它克隆/工作树**与远端失联（本地历史与远端历史不再是同一条链）；本仓 refs 里现在就有
  `worktree-agent-general-purpose-72d31d9b` 与 `reasonix/delivery-20260805-…` 两条非主线引用，
  另有 `.qoder/worktrees/agent-general-purpose-72d31d9b/` 这份实打实的工作树副本 ——
  "只有我这一个工作树"这个前提**不成立**；
- 若别人（或你自己另一份工作树）有未推的提交，那些提交与重写后的历史**无法简单合并**；
- 远端一旦接收，旧历史通常不可恢复；GitHub 侧还会保留 fork/缓存的旧对象一段时间，
  **已推出去的帧不会因为本地迁了 LFS 就消失**；
- 附带事实：`original/refs/heads/main → d060d6f9` 只含 14 个提交，说明早先有人手工留过一份
  不同链的快照。它不是 filter-repo 的残迹（`refs/original/` 空、无 `.git/filter-repo`），
  但强推后这类手工 ref 更容易被误当成"可回滚的备份"。

补充一条降低意外的事实：本机 LFS **已经完全装好**（clean/smudge/process/required 四条齐），
所以步骤 A 里那句 `git lfs install --local` 近似无操作 —— 真正改变行为的只有 `.gitattributes` 入库那一步。

## 3. 我看到的第三条路（既不炸证据链，也能减体积）

**把帧从"必须进 git 的证据"改成"带内容哈希的外部证据库"**：
- manifest 里已经有 `contentHash`（本轮 834/834 帧带哈希，实测 `noHash=0`）；
- 于是可以：帧目录迁到仓外（或对象存储），仓内只提交 manifest + 每帧 sha256 + 相对路径；
- 门禁把"盘上存在 + 字节一致"改成"按 sha 到证据库可核"，`verify-evidence-corpus` 的判定轴不变；
- 效果：`.git` 可以随历史自然老化，**提交号一个都不动**，证据仍自证。

代价：`verify-evidence-corpus` / `verify-provenance-all` 需要新增一个"证据库可达"的判定入口（是真代码，
不是改阈值），并且要定义证据库失效时怎么判（必须判红，不许判绿）。

## 4. 给你的四个选项（我的推荐写在括号里）

1. **什么都不做**：体积继续涨，但证据链完整。（可接受，短期最安全）
2. **只做步骤 A**：未来帧走 LFS，不动历史，几分钟，可逆。（**推荐先做这个**）
3. **步骤 A + 第 3 节的外部证据库改造**：体积与可移植性都解决，代价是一把真代码刀 + 一轮门禁复量。（**推荐最终走这个**）
4. **步骤 B + C 全量迁移**：`.git` 从 1070 MB 降下来，但本轮与历轮所有按提交号的背书作废、远端需强推、
   其它工作树失联。（**不推荐**：它消灭的正是这套工作流赖以成立的东西）

需要你点头才动的具体动作：任何 `git lfs migrate … --everything`、任何 `git push --force*`、
以及把 `.gitattributes` 提交进仓库根。我不会自行执行其中任何一个。

## 5. 执行记录（2026-09-29，用户选 ③ ⇒ 做了 ②+③，**没做 ④**）

用户回复选定："②+把帧改成仓外证据库 + manifest 内 sha256 可核"。已照此落地，边界如下：

**做了**
- `.gitattributes` 入仓根（commit 见下）：只圈证据/归档/交付物像素，**不写** `* text=auto`；
  落地后脏项从 4 变 5（只有本文件自己）⇒ 确认没有全仓行尾重归一化。
- 新增 `scripts/qa/evidence-store.mjs`：按完整 sha256 把**被 manifest 引用**的帧导出到仓外库
  （默认 `D:/6/love-mini-evidence`，可用 `--store`/`QA_EVIDENCE_STORE` 改）。
  指纹直接沿用 `verify-evidence-corpus.mjs:34` 的 sha256 前 16 位，不开第二套权威；
  只按 manifest 取帧、不扫目录，免得库变成孤儿堆。库目录命中仓内 ⇒ exit 2。
  实测：引用行 7540 / 唯一字节对象 3497 / **142.1 MB**（对 751 MB 盘上语料 5.3× 收敛，因为重复字节塌成一枚）；
  `--verify` 双证=7540、仅库在=0、仅盘在=0、两边都无=0、哈希不符=0。
- `verify-evidence-corpus.mjs` 加三态判决：unconfigured ⇒ 判定与从前逐字节相同；
  reachable ⇒ 盘上缺帧可由库按哈希唯一命中背书（前缀碰撞不当命中）；
  **unreachable ⇒ PROBLEMS 1→2 且指名目录**（用户点名的硬条件）。库落在仓内同样判红。
- 负例 `scripts/qa/test-evidence-store-axis.mjs` 14 条全过，含关键反证 4c：
  同一"帧被挪开"状态**不给库** ⇒ missing 必须涨、必须多一条红。
  没有 4c，第 4 条的绿可能只是"门压根不看缺帧"。

**没做（仍然需要单独授权，我不会自行执行）**
- ❌ `git lfs migrate --everything`：0 次。历史一行没动，**339 个提交号全部原样**。
- ❌ 任何 `git push --force*`：0 次。远端 `origin` 未被写过。
- ❌ 没有从仓里删除任何一帧：盘上帧仍在原地，库是**副本**。
  等哪天要真按 ③ 减体积，动作应是"验证过库里有唯一命中 ⇒ 才把盘上那份挪出仓"，
  且必须先有那条挪出载具（带逐文件校验与回滚点）—— 本裁定没有授权我删证据。

**过程中我自己撞的两个坑（都写在代码注释里，免得重犯）**
1. 三态判决第一版放在 `CORPUS_PROBLEMS` 打印之后 ⇒ 不可达那跑仍报 PROBLEMS=1，
   红涨了却不进计数，等于没判。挪到打印前才对。
2. 导出计数第一版把"本轮内重复字节"和"库里已存在"合并成一个"已在库=4043"，
   而那一刻库根本不存在 ⇒ 读者会以为库已建好。拆成 `本轮内重复` / `库里有` 两个数。
