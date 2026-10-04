import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const copy = (a, b) => {
  fs.mkdirSync(path.dirname(b), { recursive: true });
  fs.copyFileSync(a, b);
};

copy(
  path.join(root, "aura-assets/AuraVisualLayer.tsx"),
  path.join(root, "client/src/components/AuraVisualLayer.tsx")
);
copy(
  path.join(root, "aura-assets/aura-system.css"),
  path.join(root, "client/src/aura-system.css")
);

let p = path.join(root, "client/src/App.tsx");
let s = fs.readFileSync(p, "utf8");

if (!s.includes('AuraVisualLayer')) {
  s = s.replace(
    'import AiAssistant from "@/components/AiAssistant";',
    'import AiAssistant from "@/components/AiAssistant";\nimport { AuraVisualLayer } from "@/components/AuraVisualLayer";'
  );
  s = s.replace(
    '    <>\n      <Router />',
    '    <>\n      <AuraVisualLayer />\n      <Router />'
  );
  fs.writeFileSync(p, s);
}

p = path.join(root, "client/src/pages/auth-page.tsx");
s = fs.readFileSync(p, "utf8");

if (!s.includes('className="aura-auth')) {
  s = s.replace(
    '<div className="min-h-screen flex flex-col">',
    '<div className="aura-auth min-h-screen flex flex-col">'
  );
  fs.writeFileSync(p, s);
}

p = path.join(root, "client/src/index.css");
s = fs.readFileSync(p, "utf8");

// CSS @import rules must be at the beginning of the stylesheet.
// The previous build appended this import after existing rules, which caused
// the Aura stylesheet to be ignored by the browser.
if (!s.includes('@import url("./aura-system.css");')) {
  s = '@import url("./aura-system.css");\n' + s;
  fs.writeFileSync(p, s);
}
