import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const helper = join(repo, "scripts/qa/final-verify-summary.sh");
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";

function runSummary(files) {
  const dir = mkdtempSync(join(tmpdir(), "final-summary-"));
  try {
    for (const [name, code] of Object.entries(files)) {
      writeFileSync(join(dir, `${name}.exit`), code, "utf8");
    }
    const script = [
      `source "${helper.replace(/\\/g, "/")}"`,
      'final_verify_summarize "$FIXDIR" "abc1234" "def5678"',
    ].join("\n");
    const r = spawnSync(bash, ["-c", script], {
      cwd: repo,
      env: { ...process.env, FIXDIR: dir.replace(/\\/g, "/") },
      encoding: "utf8",
    });
    assert.equal(r.status, 0, `summary helper failed: ${r.stderr}`);
    const lines = (r.stdout || "").trim().split(/\r?\n/);
    const fail = Number(lines.pop());
    const summary = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
    return { fail, summary, output: r.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const green = runSummary({ alpha: "0", beta: "0" });
assert.equal(green.fail, 0, "all-zero exits must report zero reds");
assert.deepEqual(green.summary.gates, { alpha: 0, beta: 0 });

const red = runSummary({ alpha: "0", beta: "2", gamma: "bogus" });
assert.equal(red.fail, 2, "non-zero and invalid exit files must both count as red");
assert.deepEqual(red.summary.reds.sort(), ["beta", "gamma"]);
assert.equal(red.summary.gates.gamma, 2, "invalid exit must be normalized to numeric 2 in JSON");
assert.match(red.output, /RED: beta exit=2/);
assert.match(red.output, /RED: gamma exit=invalid/);

const empty = runSummary({});
assert.equal(empty.fail, 0);
assert.deepEqual(empty.summary.gates, {});

const main = readFileSync(
  new URL("../scripts/qa/run-final-verify-v33.sh", import.meta.url),
  "utf8",
);
assert.match(main, /source\s+.*final-verify-summary\.sh/u, "main must reuse the tested summary helper");
assert.match(main, /rm -f "\$OUT"\/\*\.exit/u, "main must clear stale .exit files before a run");

const emitIndex = main.indexOf("g emit-round-bill");
const genIndex = main.indexOf("g gen-round8-report");
const lastSummaryIndex = main.lastIndexOf("final_verify_summarize");
assert.ok(emitIndex >= 0 && genIndex >= 0, "report producer and generator must both be wired");
assert.ok(
  lastSummaryIndex > emitIndex && lastSummaryIndex > genIndex,
  "final summary must be computed after emit-round-bill and gen-round8-report",
);
assert.match(main, /exit "\$FAIL"/u, "red QA runs must return a non-zero process exit");

console.log("final verify summary contract ok");
