import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const filePaths = process.argv.slice(2);

assert.ok(filePaths.length > 0, "usage: node tools/lint-openapi.mjs <openapi-file> ...");

let totalOperations = 0;
const seenOperationIds = new Set();

for (const filePath of filePaths) {
  const raw = readFileSync(filePath, "utf8");
  const document = parse(raw);

  assert.ok(document && typeof document === "object", "openapi document must be an object");
  assert.match(String(document.openapi || ""), /^3\./u, "openapi version must be 3.x");
  assert.ok(document.paths && typeof document.paths === "object", "paths must be defined");
  assert.ok(
    document.components && typeof document.components === "object",
    "components must be defined"
  );
  assert.ok(
    document.components.schemas && typeof document.components.schemas === "object",
    "components.schemas must be defined"
  );

  const schemaNames = new Set(Object.keys(document.components.schemas));
  const operations = [];
  const httpMethods = ["get", "post", "put", "patch", "delete"];

  for (const [pathName, pathItem] of Object.entries(document.paths)) {
    assert.ok(pathName.startsWith("/"), `${pathName} must start with /`);

    for (const method of httpMethods) {
      const operation = pathItem?.[method];

      if (!operation) {
        continue;
      }

      operations.push(`${method.toUpperCase()} ${pathName}`);
      assert.equal(
        typeof operation.summary,
        "string",
        `${method.toUpperCase()} ${pathName} must define summary`
      );
      assert.ok(
        operation.summary.trim().length > 0,
        `${method.toUpperCase()} ${pathName} summary must not be empty`
      );
      assert.equal(
        typeof operation.operationId,
        "string",
        `${method.toUpperCase()} ${pathName} must define operationId`
      );
      assert.ok(
        operation.operationId.trim().length > 0,
        `${method.toUpperCase()} ${pathName} operationId must not be empty`
      );
    }
  }

  assert.ok(operations.length > 0, "openapi document must contain at least one operation");

  function walk(node) {
    if (Array.isArray(node)) {
      for (const entry of node) {
        walk(entry);
      }
      return;
    }

    if (!node || typeof node !== "object") {
      return;
    }

    if (typeof node.operationId === "string") {
      assert.ok(
        !seenOperationIds.has(node.operationId),
        `duplicate operationId detected: ${node.operationId}`
      );
      seenOperationIds.add(node.operationId);
    }

    if (typeof node.$ref === "string" && node.$ref.startsWith("#/components/schemas/")) {
      const schemaName = node.$ref.slice("#/components/schemas/".length);
      assert.ok(schemaNames.has(schemaName), `missing schema reference: ${node.$ref}`);
    }

    for (const value of Object.values(node)) {
      walk(value);
    }
  }

  walk(document);

  totalOperations += operations.length;
}

console.log(`openapi lint ok (${totalOperations} operations)`);
