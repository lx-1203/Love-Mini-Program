import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ledger = JSON.parse(
  readFileSync(
    new URL("../reports/audit/2026-10-25-r16-disposition-ledger.json", import.meta.url),
    "utf8",
  ),
);
const fixlist = JSON.parse(
  readFileSync(
    new URL(
      "../reports/audit/mp-fidelity-2026-10-18/fixlist-R16.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const manifest = JSON.parse(
  readFileSync(
    new URL(
      "../reports/audit/mp-fidelity-2026-10-18/baseline-manifest.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

assert.equal(ledger.schema, "r16-disposition-ledger/v1");
assert.equal(ledger.summary.total, fixlist.defects, "ledger must account for every R16 defect");
assert.equal(ledger.rows.length, fixlist.defects);
assert.equal(ledger.summary.severity.P2, 150);
assert.equal(ledger.summary.severity.P3, 64);
assert.equal(ledger.rows.filter((r) => r.status === "UNVERIFIED_AT_CURRENT_HEAD").length, 214);
assert.ok(
  ledger.rows.every((r) => r.evidence === null && r.status.startsWith("UNVERIFIED")),
  "historical defects must not be silently closed without current-SHA evidence",
);
assert.equal(
  ledger.summary.sourceAnchor.ANCHOR_PRESENT_UNVERIFIED,
  214,
  "every defect must carry a readable source anchor at snapshot time",
);
assert.equal(ledger.summary.baselineImages, manifest.rows.length);
assert.equal(ledger.summary.baselineDrift, 0, "ideal baseline bytes must match manifest");
assert.equal(ledger.summary.baselineMatch, manifest.rows.length);

console.log("R16 disposition ledger contract ok");
