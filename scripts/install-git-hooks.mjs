#!/usr/bin/env node
/**
 * install-git-hooks.mjs — 一键安装 git pre-commit 钩子（2026-09-03 落地 7）
 *
 * 设计：
 * 1. 通过 `git config core.hooksPath scripts/git-hooks` 让 git 直接读仓库内 hooks
 * 2. 不依赖 husky/lint-staged，避免 pnpm 装包风险
 * 3. 跨平台：Windows / Linux / macOS 都支持
 * 4. 可幂等多次执行（每次重写配置 + 校验可执行权限）
 *
 * 用法：
 *   node scripts/install-git-hooks.mjs           安装
 *   node scripts/install-git-hooks.mjs --uninstall  卸载（恢复默认 .git/hooks）
 *
 * 卸载后 git 会回到默认 .git/hooks 路径，原本仓库内任何 pre-existing hook 仍生效
 */
import { spawnSync } from "node:child_process";
import { existsSync, chmodSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const HOOKS_DIR = resolve(REPO_ROOT, "scripts/git-hooks");

function gitCfg(...args) {
  const r = spawnSync("git", ["config", ...args], { cwd: REPO_ROOT, stdio: ["ignore", "inherit", "inherit"] });
  return r.status === 0;
}

function gitCfgGet(key) {
  const r = spawnSync("git", ["config", "--get", key], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8",
  });
  return r.status === 0 ? (r.stdout || "").trim() : null;
}

if (process.argv.includes("--uninstall")) {
  const current = gitCfgGet("core.hooksPath");
  if (current && current.includes("scripts/git-hooks")) {
    if (gitCfg("--unset", "core.hooksPath")) {
      console.log("[hooks] 已卸载：恢复默认 .git/hooks 路径");
    } else {
      console.error("[hooks] 卸载失败：git config --unset core.hooksPath 失败");
      process.exit(1);
    }
  } else {
    console.log(`[hooks] 当前 core.hooksPath 未指向 scripts/git-hooks（${current || "未设置"}），无需卸载`);
  }
  process.exit(0);
}

// 安装流程
console.log("[hooks] 开始安装 pre-commit 钩子...");

// 1) 检查 hooks 目录与可执行权限
if (!existsSync(HOOKS_DIR)) {
  console.error(`[hooks] FAIL: ${HOOKS_DIR} 不存在`);
  process.exit(1);
}
const PRE_COMMIT = resolve(HOOKS_DIR, "pre-commit");
if (!existsSync(PRE_COMMIT)) {
  console.error(`[hooks] FAIL: ${PRE_COMMIT} 不存在`);
  process.exit(1);
}

// 2) Unix 文件系统下确保可执行；Windows Git Bash 同样支持 +x（NTFS 上是 metadata 标记）
try {
  const st = statSync(PRE_COMMIT);
  // 任何现有文件均强制 +x（属主可执行位）
  chmodSync(PRE_COMMIT, st.mode | 0o111);
  console.log(`[hooks] 已确保 ${PRE_COMMIT} 可执行`);
} catch (e) {
  console.warn(`[hooks] WARN: chmod 失败（${e.message}）；Windows 下通常无需，git 可直接调用`);
}

// 3) 设置 core.hooksPath（相对仓库根的路径，git 会自动相对于 worktree 解析）
if (!gitCfg("core.hooksPath", "scripts/git-hooks")) {
  console.error("[hooks] FAIL: git config core.hooksPath scripts/git-hooks 失败");
  process.exit(1);
}

// 4) 校验写入
const final = gitCfgGet("core.hooksPath");
if (final === "scripts/git-hooks") {
  console.log(`[hooks] 安装成功：core.hooksPath = ${final}`);
  console.log(`[hooks] 钩子目录：${HOOKS_DIR}`);
  console.log("[hooks] 触发条件：git commit 时自动跑 apps/client mp-image strict lint");
  console.log("[hooks] 仅对 apps/client/ 下的 staged 文件生效（作用域过滤）");
  console.log("[hooks] 卸载：node scripts/install-git-hooks.mjs --uninstall");
} else {
  console.error(`[hooks] FAIL: 写入失败，当前值为 ${final}`);
  process.exit(1);
}