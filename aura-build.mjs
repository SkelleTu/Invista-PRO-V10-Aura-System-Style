import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const copy = (source, destination) => {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
};

// Aura is a presentation layer only.
// The canonical functional source is the exact InvistaPro-V10 main branch
// cloned by the wrapper build in package.json. This script must never mutate
// backend, authentication, database, API, dependency, or business logic.

copy(
  path.join(root, "aura-assets/AuraVisualLayer.tsx"),
  path.join(root, "client/src/components/AuraVisualLayer.tsx")
);

copy(
  path.join(root, "aura-assets/aura-system.css"),
  path.join(root, "client/src/aura-system.css")
);

// Mount the Aura visual layer without changing application behavior.
const appPath = path.join(root, "client/src/App.tsx");
let app = fs.readFileSync(appPath, "utf8");

if (!app.includes('AuraVisualLayer')) {
  app = app.replace(
    'import AiAssistant from "@/components/AiAssistant";',
    'import AiAssistant from "@/components/AiAssistant";\nimport { AuraVisualLayer } from "@/components/AuraVisualLayer";'
  );
  app = app.replace(
    '    <>\n      <Router />',
    '    <>\n      <AuraVisualLayer />\n      <Router />'
  );
  fs.writeFileSync(appPath, app);
}

// Add only the Aura visual stylesheet. No route, auth, schema, server,
// dependency, or runtime files are modified here.
const indexCssPath = path.join(root, "client/src/index.css");
let indexCss = fs.readFileSync(indexCssPath, "utf8");

if (!indexCss.includes('@import url("./aura-system.css");')) {
  indexCss = '@import url("./aura-system.css");\n' + indexCss;
  fs.writeFileSync(indexCssPath, indexCss);
}

// Give the authentication page its Aura-specific styling hook only.
// The authentication flow and markup remain canonical.
const authPagePath = path.join(root, "client/src/pages/auth-page.tsx");
let authPage = fs.readFileSync(authPagePath, "utf8");

if (!authPage.includes('className="aura-auth')) {
  authPage = authPage.replace(
    '<div className="min-h-screen flex flex-col">',
    '<div className="aura-auth min-h-screen flex flex-col">'
  );
  fs.writeFileSync(authPagePath, authPage);
}

console.log("OK: Aura build applied presentation-only assets and hooks.");
