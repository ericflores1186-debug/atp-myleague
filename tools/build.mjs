// Compiles ATPMyLeague.jsx into the playable pages and a node-loadable engine for the tests.
//   atp-myleague.html  the page as published (an HTML fragment, the format the Claude artifact host expects)
//   index.html         the same page as a complete document: open it in any browser or serve it with GitHub Pages
//   tools/engine.cjs   the game code for node, with React stubbed out (git-ignored)
// usage: npm run build
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
let code = fs.readFileSync(path.join(root, "ATPMyLeague.jsx"), "utf8");

// the page loads React and the icon set as UMD globals, so the imports become lookups
const reactImport = /^import React, \{([^}]+)\} from "react";$/m;
const iconImport = /^import \{([^}]+)\} from "lucide-react";$/m;
if (!reactImport.test(code) || !iconImport.test(code)) throw new Error("import lines not found");
const icons = iconImport.exec(code)[1].split(",").map((s) => s.trim()).filter(Boolean);
code = code
  .replace(reactImport, (all, names) => `const {${names}} = React;`)
  .replace(iconImport, ['const __icons = (typeof window !== "undefined" && window.LucideReact) || {};', "const __noIcon = () => null;", ...icons.map((n) => `const ${n} = __icons.${n} || __noIcon;`)].join("\n"));

const page = await transform(code, { loader: "jsx", format: "iife", globalName: "ATPMyLeagueApp", jsx: "transform", target: "es2020" });
const shell = fs.readFileSync(path.join(here, "shell.html"), "utf8");
if (!shell.includes("/*__BUNDLE__*/")) throw new Error("shell placeholder missing");
const html = shell.replace("/*__BUNDLE__*/", () => page.code.trimEnd() + "\n");
fs.writeFileSync(path.join(root, "atp-myleague.html"), html);

// the standalone page: everything before the app's root element goes in the head
const split = html.indexOf('<div id="root"');
fs.writeFileSync(
  path.join(root, "index.html"),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${html.slice(0, split)}</head>\n<body>\n${html.slice(split)}</body>\n</html>\n`
);

// the same code for node, with React stubbed: the tests only call the engine, never render
const engine = await transform(code, { loader: "jsx", format: "cjs", jsx: "transform", target: "es2020" });
const stub = 'const React = { createElement: () => null, Fragment: "f", useEffect() {}, useMemo: (f) => f(), useReducer: (r, s) => [s, () => {}], useRef: () => ({ current: null }), useState: (v) => [v, () => {}] };\n';
fs.writeFileSync(path.join(here, "engine.cjs"), stub + engine.code);

console.log(`built atp-myleague.html and index.html (${(html.length / 1024).toFixed(1)} KB)`);
