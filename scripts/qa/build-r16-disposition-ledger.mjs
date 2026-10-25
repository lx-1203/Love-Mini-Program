#!/usr/bin/env node
/**
 * 生成 R16 214 条缺陷的当前 HEAD 处置台账。
 *
 * 本脚本只读取：fixlist-R16.json、defects-R16.md、baseline-manifest.json、源码与基准图字节。
 * 它不重跑 UI、不比较截图、不关闭任何缺陷。所有条目默认保留为
 * UNVERIFIED_AT_CURRENT_HEAD，直到有当前 SHA 的帧、源码和回归证据。
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const roundDir = join(repo, "reports/audit/mp-fidelity-2026-10-18");
const fixlistPath = join(roundDir, "fixlist-R16.json");
const defectsPath = join(roundDir, "defects-R16.md");
const manifestPath = join(roundDir, "baseline-manifest.json");
const outPath = join(repo, "reports/audit/2026-10-25-r16-disposition-ledger.json");

const fixlist = JSON.parse(readFileSync(fixlistPath, "utf8"));
const defectsMd = readFileSync(defectsPath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();

const severityById = new Map();
const axisById = new Map();
const batchById = new Map();
const sourceById = new Map();
const headingRe =
  /^###\s+(R\d+[A-Za-z]*?-L\d+-D\d+)\s+(P[0-3])\s*\/\s*([^\s]+)\s+批次\s+(\S+)\s*$/gm;
let match;
while ((match = headingRe.exec(defectsMd))) {
  const [, id, severity, axis, batch] = match;
  severityById.set(id, severity);
  axisById.set(id, axis);
  batchById.set(id, batch);
  const block = defectsMd.slice(match.index, defectsMd.indexOf("\n## ", match.index + 1) > 0
    ? defectsMd.indexOf("\n## ", match.index + 1)
    : defectsMd.length);
  const source = block.match(/^- 源码证据：`([^`]+)`/m);
  if (source) {
    const raw = source[1];
    const trailingLine = raw.match(/^(.*?):(\d+)$/);
    sourceById.set(id, {
      path: trailingLine ? trailingLine[1] : raw,
      line: trailingLine ? Number(trailingLine[2]) : null,
    });
  }
}

const batchByDefect = new Map();
for (const batch of fixlist.batches ?? []) {
  for (const id of batch.defects ?? []) {
    batchByDefect.set(id, {
      batchId: batch.batch_id,
      pages: batch.pages ?? [],
      files: batch.files ?? [],
      axes: batch.axes ?? [],
      ownerLane: batch.owner_lane,
    });
  }
}

const allIds = [...batchByDefect.keys()];
const missingSource = [];
const rows = allIds.map((id) => {
  const batch = batchByDefect.get(id);
  const source = sourceById.get(id) ?? null;
  let anchorStatus = "NO_ANCHOR_RECORDED";
  let anchorReason = null;
  if (source) {
    const absolute = join(repo, source.path);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      anchorStatus = "SOURCE_UNAVAILABLE";
      anchorReason = "源码证据路径在 HEAD 不存在或不是文件";
      missingSource.push(id);
    } else {
      const lines = readFileSync(absolute, "utf8").split(/\r?\n/).length;
      if (source.line != null && source.line > lines) {
        anchorStatus = "SOURCE_LINE_OUT_OF_RANGE";
        anchorReason = `记录行 ${source.line} > 当前文件行数 ${lines}`;
        missingSource.push(id);
      } else {
        anchorStatus = "ANCHOR_PRESENT_UNVERIFIED";
      }
    }
  }
  return {
    id,
    severity: severityById.get(id) ?? null,
    axis: axisById.get(id) ?? null,
    batchId: batch.batchId,
    pages: batch.pages,
    files: batch.files,
    ownerLane: batch.ownerLane,
    sourceEvidence: source,
    sourceAnchorStatus: anchorStatus,
    sourceAnchorReason: anchorReason,
    status: "UNVERIFIED_AT_CURRENT_HEAD",
    statusReason: "未在本次收口中重跑当前 HEAD 的 UI 帧、像素对照与对应回归；不承接历史 PASS/闭账",
    requiredEvidence: [
      "current-sha source anchor read",
      "current-sha frame vs ideal baseline",
      "fix visibility or explicit not-visible finding",
      "targeted regression or named NOT_SHOOTABLE reason",
    ],
    evidence: null,
  };
});

const baselineRows = (manifest.rows ?? []).map((row) => {
  const absolute = join(repo, row.rel);
  if (!existsSync(absolute)) {
    return { ...row, integrity: "MISSING" };
  }
  const actual = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  return {
    ...row,
    actualSha256: actual,
    integrity: actual === row.sha256 ? "MATCH" : "DRIFT",
  };
});

const severityCounts = rows.reduce((acc, row) => {
  const key = row.severity ?? "UNKNOWN";
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
const statusCounts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});
const anchorCounts = rows.reduce((acc, row) => {
  acc[row.sourceAnchorStatus] = (acc[row.sourceAnchorStatus] ?? 0) + 1;
  return acc;
}, {});

const ledger = {
  schema: "r16-disposition-ledger/v1",
  generatedAt: new Date().toISOString(),
  generatedFromHead: head,
  sources: {
    fixlist: "reports/audit/mp-fidelity-2026-10-18/fixlist-R16.json",
    defects: "reports/audit/mp-fidelity-2026-10-18/defects-R16.md",
    baselineManifest: "reports/audit/mp-fidelity-2026-10-18/baseline-manifest.json",
  },
  summary: {
    total: rows.length,
    fixlistDeclared: fixlist.defects,
    severity: severityCounts,
    status: statusCounts,
    sourceAnchor: anchorCounts,
    missingSourceAnchors: missingSource.length,
    baselineImages: baselineRows.length,
    baselineMatch: baselineRows.filter((row) => row.integrity === "MATCH").length,
    baselineDrift: baselineRows.filter((row) => row.integrity !== "MATCH").length,
  },
  boundaries: [
    "默认状态 UNVERIFIED_AT_CURRENT_HEAD：本文件不关闭任何历史缺陷，也不把 R16 8/8 收口门外推为全产品验收。",
    "源码锚点存在只说明路径/行号可读，不说明该行仍能复现缺陷。",
    "基准图字节 MATCH 只证明比对输入未变，不证明 UI 与基准一致。",
    "状态只能由当前 SHA 的帧证据 + 逐条复判升级，升级前必须保留 evidence 字段。",
  ],
  baselineIntegrity: baselineRows,
  rows,
};

if (rows.length !== fixlist.defects) {
  throw new Error(`缺陷数不守恒: rows=${rows.length}, fixlist=${fixlist.defects}`);
}
if (!rows.every((row) => row.status === "UNVERIFIED_AT_CURRENT_HEAD")) {
  throw new Error("首次生成不得提前关闭任何缺陷");
}
writeFileSync(outPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
console.log(
  `R16_LEDGER_OK total=${rows.length} P2=${severityCounts.P2 ?? 0} P3=${severityCounts.P3 ?? 0} ` +
    `baseline=${ledger.summary.baselineMatch}/${ledger.summary.baselineImages} ` +
    `sourceUnavailable=${missingSource.length} out=${outPath}`,
);
