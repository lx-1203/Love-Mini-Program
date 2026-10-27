/**
 * 出图/核查脚本共用的 puppeteer 启动器。
 *
 * 两件事必须集中管，否则每条脚本各写一遍就会漂移：
 *   1. 仓内 puppeteer 未自带 Chrome（admin-browser-verify 首跑实测报缺），
 *      按序回退 环境变量 → 本机 Chrome → Edge；都拿不到再让 puppeteer 自己报。
 *   2. 每次启动独占一个 --user-data-dir，回收孤儿进程时可按该目录精确过滤，
 *      不会误杀别人正开着的 Chrome。
 */
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

export function chromePath() {
  return (
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    CHROME_CANDIDATES.find((p) => existsSync(p)) ||
    undefined
  );
}

/** 本次调用独占的 user-data-dir（回收时按它过滤，见 reapStaleBrowsers） */
export function makeUserDataDir() {
  return mkdtempSync(join(tmpdir(), "qoder-board-"));
}

export async function puppeteerLaunch({ extraArgs = [] } = {}) {
  const userDataDir = makeUserDataDir();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", `--user-data-dir=${userDataDir}`, ...extraArgs],
  });
  return Object.assign(browser, { __userDataDir: userDataDir });
}

/**
 * 回收本脚本族遗留的孤儿 Chrome：只杀命令行里带 qoder-board- 的那个 user-data-dir。
 * 绝不做全局 chrome.exe 清理——那会连用户自己开着的窗口一起干掉。
 */
export function reapHint(userDataDir) {
  return `taskkill /F /T /FI "IMAGENAME eq chrome.exe" /FI "COMMANDLINE eq *${basename(userDataDir)}*"`;
}

function basename(p) {
  return resolve(p).split(/[\\/]/).pop();
}

export const carrierDir = dirname(fileURLToPath(import.meta.url));
