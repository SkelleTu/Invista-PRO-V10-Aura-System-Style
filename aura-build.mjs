import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const copy = (source, destination) => {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
};

const replaceRequired = (source, before, after, label) => {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    throw new Error(`Aura integration anchor not found: ${label}. Refusing to report a successful build without applying the visual layer.`);
  }
  return source.replace(before, after);
};

// Aura is presentation-only. All behavior, authentication, API, storage,
// dependency and trading logic remains sourced from the pinned Invista core.
copy(
  path.join(root, "aura-assets/AuraVisualLayer.tsx"),
  path.join(root, "client/src/components/AuraVisualLayer.tsx")
);
copy(
  path.join(root, "aura-assets/aura-system.css"),
  path.join(root, "client/src/aura-system.css")
);

// Mount Aura explicitly before the canonical router content. The Suspense
// wrapper is part of the current canonical AppContent and must be preserved.
const appPath = path.join(root, "client/src/App.tsx");
let app = fs.readFileSync(appPath, "utf8");
app = replaceRequired(
  app,
  'import AiAssistant from "@/components/AiAssistant";',
  'import AiAssistant from "@/components/AiAssistant";\nimport { AuraVisualLayer } from "@/components/AuraVisualLayer";',
  "App.tsx Aura import"
);
app = replaceRequired(
  app,
  "    <>\n      <Suspense",
  "    <>\n      <AuraVisualLayer />\n      <Suspense",
  "AppContent visual-layer mount"
);
fs.writeFileSync(appPath, app);

// Add only Aura's stylesheet; keep the canonical stylesheet and Tailwind
// processing intact.
const indexCssPath = path.join(root, "client/src/index.css");
let indexCss = fs.readFileSync(indexCssPath, "utf8");
if (!indexCss.includes('@import url("./aura-system.css");')) {
  indexCss = '@import url("./aura-system.css");\n' + indexCss;
  fs.writeFileSync(indexCssPath, indexCss);
}

// Add a visual-only hook to the authentication wrapper without changing
// authentication markup, state, validation, or request handling.
const authPagePath = path.join(root, "client/src/pages/auth-page.tsx");
let authPage = fs.readFileSync(authPagePath, "utf8");
authPage = replaceRequired(
  authPage,
  '<div className="min-h-screen flex flex-col">',
  '<div className="aura-auth min-h-screen flex flex-col">',
  "authentication page visual hook"
);
fs.writeFileSync(authPagePath, authPage);

// Fail closed if any required visual integration did not actually land.
if (
  !app.includes('import { AuraVisualLayer } from "@/components/AuraVisualLayer";') ||
  !app.includes("<AuraVisualLayer />") ||
  !indexCss.includes('@import url("./aura-system.css");') ||
  !authPage.includes('className="aura-auth')
) {
  throw new Error("Aura presentation integration is incomplete.");
}

console.log("OK: Aura visual layer is imported and mounted; presentation-only hooks verified.");
