import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const compose = readFileSync(
  new URL("../docker-compose.yml", import.meta.url),
  "utf8",
);
assert.match(
  compose,
  /APP_AES_SECRET:\s*\$\{APP_AES_SECRET:\?[^}]*\}/u,
  "compose API must require APP_AES_SECRET without a weak default",
);
assert.match(
  compose,
  /WEBSOCKET_ALLOWED_ORIGIN_PATTERNS:\s*\$\{WEBSOCKET_ALLOWED_ORIGIN_PATTERNS:\?[^}]*\}/u,
  "compose API must require WEBSOCKET_ALLOWED_ORIGIN_PATTERNS without a weak default",
);

const envExample = readFileSync(
  new URL("../.env.example", import.meta.url),
  "utf8",
);
assert.match(
  envExample,
  /^APP_AES_SECRET=<PLACEHOLDER>$/mu,
  ".env.example must document APP_AES_SECRET",
);
assert.match(
  envExample,
  /^WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=$/mu,
  ".env.example must document WEBSOCKET_ALLOWED_ORIGIN_PATTERNS",
);

console.log("deployment config contract ok");
