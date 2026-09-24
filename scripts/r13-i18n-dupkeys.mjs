/* Report exact duplicate literal keys within the same object, via the TypeScript AST. */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const ts = createRequire(import.meta.url)("D:/6/恋爱小程序/node_modules/.pnpm/typescript@5.3.3/node_modules/typescript");

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const dups = [];
  const lineOf = (p) => sf.getLineAndCharacterOfPosition(p).line + 1;
  const keyName = (k) => (ts.isStringLiteral(k) || ts.isIdentifier(k)) ? k.text : k.getText();

  const walk = (node, path) => {
    if (ts.isObjectLiteralExpression(node)) {
      const seen = new Map();
      for (const prop of node.properties) {
        if (!prop.name) continue;
        const name = keyName(prop.name);
        if (seen.has(name)) {
          dups.push({ path: [...path, name].join("."), firstLine: lineOf(seen.get(name).pos), firstText: seen.get(name).getText(), againLine: lineOf(prop.pos), againText: prop.getText() });
        } else {
          seen.set(name, prop);
        }
      }
      for (const prop of node.properties) {
        if (!prop.name) continue;
        const name = keyName(prop.name);
        if (ts.isPropertyAssignment(prop)) walk(prop.initializer, [...path, name]);
      }
      return;
    }
    node.forEachChild((c) => walk(c, path));
  };
  walk(sf, []);

  console.log(`### ${file}: ${dups.length} duplicate key(s)`);
  for (const d of dups) {
    console.log(`  ${d.path}`);
    console.log(`    first  L${d.firstLine}: ${d.firstText.replace(/\s+/g, " ").slice(0, 90)}`);
    console.log(`    again  L${d.againLine}: ${d.againText.replace(/\s+/g, " ").slice(0, 90)}`);
  }
}
