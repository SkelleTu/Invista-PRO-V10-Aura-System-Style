import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

// Production-safe Vite bridge: keep Vite and vite.config out of the production
// module graph. They are loaded only when setupVite() is actually used.
const productionSafeVite = `import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(\`\${formattedTime} [\${source}] \${message}\`);
}

export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer, createLogger } = await import("vite");
  const { default: viteConfig } = await import("../vite.config");
  const viteLogger = createLogger();
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        \`src="/src/main.tsx"\`,
        \`src="/src/main.tsx?v=\${nanoid()}"\`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(\`Could not find the build directory: \${distPath}, make sure to build the client first\`);
  }
  app.use(express.static(distPath));
}
`;
fs.writeFileSync(path.join(root, "server/vite.ts"), productionSafeVite);

// Production build must not import Vite at all. Keep the logger/static serving
// used by production in separate modules so esbuild cannot pull Vite into dist.
const loggerSource = [
  'export function log(message: string, source = "express") {',
  '  const formattedTime = new Date().toLocaleTimeString("en-US", {',
  '    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,',
  '  });',
  '  console.log(formattedTime + " [" + source + "] " + message);',
  '}',
  ''
].join("\\n");
fs.writeFileSync(path.join(root, "server/logger.ts"), loggerSource);

const staticServerSource = [
  'import express, { type Express } from "express";',
  'import fs from "fs";',
  'import path from "path";',
  '',
  'export function serveStatic(app: Express) {',
  '  const distPath = path.resolve(import.meta.dirname, "public");',
  '  if (!fs.existsSync(distPath)) {',
  '    throw new Error("Could not find the build directory: " + distPath + ", make sure to build the client first");',
  '  }',
  '  app.use(express.static(distPath));',
  '}',
  ''
].join("\\n");
fs.writeFileSync(path.join(root, "server/static-server.ts"), staticServerSource);

const indexPath = path.join(root, "server/index.ts");
let indexSource = fs.readFileSync(indexPath, "utf8");
indexSource = indexSource.replace(
  'if (app.get("env") === "development") {\\n    setupVite(app, server).catch((e: any) => console.warn("⚠️ Vite setup error:", e));\\n  } else {\\n    serveStatic(app);\\n  }',
  'if (app.get("env") === "development") {\\n    import("./vite").then(({ setupVite }) => setupVite(app, server)).catch((e: any) => console.warn("⚠️ Vite setup error:", e));\\n  } else {\\n    serveStatic(app);\\n  }'
);
indexSource = indexSource.replace(
  'import { setupVite, serveStatic, log } from "./vite";',
  'import { log } from "./logger";\\nimport { serveStatic } from "./static-server";'
);
fs.writeFileSync(indexPath, indexSource);
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
