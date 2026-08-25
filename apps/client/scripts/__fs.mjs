import { existsSync, cpSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
console.log("FS_IMPORT_OK", existsSync("package.json"));
