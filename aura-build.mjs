import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

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
].join(String.fromCharCode(10));
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
].join(String.fromCharCode(10));
fs.writeFileSync(path.join(root, "server/static-server.ts"), staticServerSource);

const indexPath = path.join(root, "server/index.ts");
let indexSource = fs.readFileSync(indexPath, "utf8");
indexSource = indexSource.replace(
  'import { setupVite, serveStatic, log } from "./vite";',
  'import { log } from "./logger";' + String.fromCharCode(10) + 'import { serveStatic } from "./static-server";'
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


// ─────────────────────────────────────────────────────────────────────────────
// RENDER OBSERVABILITY HARDENING
// Replace the legacy /api/status memory snapshot (heap only) with a truthful
// process + cgroup memory report. The old endpoint made the UI appear to have
// a fixed 50MB budget, which was not the Render container limit and hid RSS,
// external memory and the actual cgroup limit.
// ─────────────────────────────────────────────────────────────────────────────
{
  const routesPath = path.join(root, "server/routes.ts");
  let routes = fs.readFileSync(routesPath, "utf8");

  const legacyMemoryBlock = `memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }`;

  const hardenedMemoryBlock = `memory: (() => {
        const usage = process.memoryUsage();
        const fsSync = fs;
        const readCgroup = (file) => {
          try {
            const value = fsSync.readFileSync(file, "utf8").trim();
            if (!value || value === "max") return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
          } catch (_) {
            return null;
          }
        };

        const cgroupCurrent = readCgroup("/sys/fs/cgroup/memory.current")
          ?? readCgroup("/sys/fs/cgroup/memory/memory.usage_in_bytes");
        const cgroupLimit = readCgroup("/sys/fs/cgroup/memory.max")
          ?? readCgroup("/sys/fs/cgroup/memory/memory.limit_in_bytes");

        const mb = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
        const percentage = cgroupCurrent && cgroupLimit
          ? Math.round((cgroupCurrent / cgroupLimit) * 10000) / 100
          : null;

        return {
          rssBytes: usage.rss,
          rssMB: mb(usage.rss),
          heapUsedBytes: usage.heapUsed,
          heapUsedMB: mb(usage.heapUsed),
          heapTotalBytes: usage.heapTotal,
          heapTotalMB: mb(usage.heapTotal),
          externalBytes: usage.external,
          externalMB: mb(usage.external),
          arrayBuffersBytes: usage.arrayBuffers,
          arrayBuffersMB: mb(usage.arrayBuffers),
          processMemorySource: "node.process.memoryUsage",
          cgroupCurrentBytes: cgroupCurrent,
          cgroupCurrentMB: cgroupCurrent ? mb(cgroupCurrent) : null,
          cgroupLimitBytes: cgroupLimit,
          cgroupLimitMB: cgroupLimit ? mb(cgroupLimit) : null,
          cgroupUsedPercent: percentage,
          limitSource: cgroupLimit ? "linux.cgroup" : "unavailable",
          measuredAt: new Date().toISOString()
        };
      })()`;

  if (routes.includes(legacyMemoryBlock)) {
    routes = routes.replace(legacyMemoryBlock, hardenedMemoryBlock);
  }

  // Ensure the status endpoint identifies the actual deployment target instead
  // of the historical Replit label.
  routes = routes.replace(
    `server: 'replit',`,
    `server: process.env.RENDER === "true" || process.env.RENDER_SERVICE_ID ? "render" : "node",
      runtime: process.version,`
  );

  // The memory block needs fs in routes.ts. Add the import only once.
  if (routes.includes("const fs = await import") === false && !/^import fs from "fs";/m.test(routes)) {
    routes = `import fs from "fs";\n` + routes;
  }

  fs.writeFileSync(routesPath, routes);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH FIX: allow Skyvern/test automation to use the project's username
// ("SkelleTu") as well as a normal email address.
{
  const schemaPath = path.join(root, "shared/schema.ts");
  let schema = fs.readFileSync(schemaPath, "utf8");
  schema = schema.replace(
    /export const loginSchema = z\.object\(\{\s*email: z\.string\(\)\.email\("Email inválido"\),\s*password: z\.string\(\)\.min\(1, "Senha é obrigatória"\),\s*\}\);/,
    'export const loginSchema = z.object({\n  identifier: z.string().trim().min(1, "Email ou usuário é obrigatório"),\n  password: z.string().min(1, "Senha é obrigatória"),\n});'
  );
  fs.writeFileSync(schemaPath, schema);

  const authPath = path.join(root, "server/auth.ts");
  let auth = fs.readFileSync(authPath, "utf8");
  const authReplacement = [
    'async (identifier, password, done) => {',
    '  try {',
    '    const loginIdentifier = String(identifier || "").trim();',
    '    console.log("🔍 Buscando usuário por email/usuário:", loginIdentifier);',
    '',
    '    let user = await storage.getUserByEmail(loginIdentifier);',
    '',
    '    const configuredLoginUsername = String(process.env.LOGIN_USERNAME || "").trim().toLowerCase();',
    '    const configuredLoginEmail = String(process.env.LOGIN_EMAIL || "").trim();',
    '    if (!user && configuredLoginUsername && configuredLoginEmail && loginIdentifier.toLowerCase() === configuredLoginUsername) {',
    '      user = await storage.getUserByEmail(configuredLoginEmail);',
    '    }',
    '',
    '    if (!user && loginIdentifier && !loginIdentifier.includes("@")) {',
    '      const allUsers = await storage.getAllUsers();',
    '      const needle = loginIdentifier.toLowerCase();',
    '      user = allUsers.find((candidate: any) => {',
    '        const emailPrefix = String(candidate.email || "").split("@")[0].toLowerCase();',
    '        const fullName = String(candidate.nomeCompleto || "").trim().toLowerCase();',
    '        return emailPrefix === needle || fullName === needle;',
    '      });',
    '    }',
    '',
    '    if (!user) {',
    '      console.log("❌ Usuário não encontrado:", loginIdentifier);',
    '      return done(null, false, { message: "Usuário ou email não encontrado" });',
    '    }'
  ].join("\n");
  auth = auth.replace(/\{ usernameField: "email" \}/g, '{ usernameField: "identifier" }');

  auth = auth.replace(
    /async \(email, password, done\) => \{\s*try \{\s*console\.log\('🔍 Buscando usuário por email:', email\);\s*const user = await storage\.getUserByEmail\(email\);\s*if \(!user\) \{\s*console\.log\('❌ Usuário não encontrado:', email\);\s*return done\(null, false, \{ message: "Email não encontrado" \}\);\s*\}/s,
    authReplacement
  );
  auth = auth.replace(/console\.log\('👤 Usuário encontrado:', \{ id: user\.id, email: user\.email, aprovado: user\.contaAprovada \}\);/, 'console.log("👤 Usuário encontrado:", { id: user.id, email: user.email, aprovado: user.contaAprovada });');
  auth = auth.replace(/console\.log\('⏳ Conta não aprovada:', email\);/g, 'console.log("⏳ Conta não aprovada:", loginIdentifier);');
  auth = auth.replace(/console\.log\('🔐 Verificando senha para:', email\);/g, 'console.log("🔐 Verificando senha para:", loginIdentifier);');
  auth = auth.replace(/console\.log\('❌ Senha incorreta para:', email\);/g, 'console.log("❌ Senha incorreta para:", loginIdentifier);');
  auth = auth.replace(/console\.log\('✅ Login validado com sucesso para:', email\);/g, 'console.log("✅ Login validado com sucesso para:", loginIdentifier);');
  fs.writeFileSync(authPath, auth);

  const routesPath = path.join(root, "server/routes.ts");
  let routes = fs.readFileSync(routesPath, "utf8");
  const routeReplacement = [
    'const rawIdentifier = String(req.body.identifier ?? req.body.email ?? "").trim();',
    'const validatedData = loginSchema.parse({ identifier: rawIdentifier, password: req.body.password });',
    'req.body.identifier = validatedData.identifier;',
    'console.log("🔐 Tentativa de login:", { identifier: validatedData.identifier });'
  ].join("\n      ");
  routes = routes.replace(
    /console\.log\('🔐 Tentativa de login:', \{ email: req\.body\.email \}\);\s*const validatedData = loginSchema\.parse\(req\.body\);/,
    routeReplacement
  );
  fs.writeFileSync(routesPath, routes);

  const authPagePath = path.join(root, "client/src/pages/auth-page.tsx");
  let authPage = fs.readFileSync(authPagePath, "utf8");
  authPage = authPage.replace('<Label htmlFor="login-email">Email</Label>', '<Label htmlFor="login-identifier">Email ou usuário</Label>');
  authPage = authPage.replace(
    'id="login-email"\n                        type="email"\n                        {...loginForm.register("email")}\n                        placeholder="seu@email.com"',
    'id="login-identifier"\n                        type="text"\n                        autoComplete="username"\n                        {...loginForm.register("identifier")}\n                        placeholder="Email ou usuário"'
  );
  fs.writeFileSync(authPagePath, authPage);
}


// Accessibility and document metadata hardening for the Aura production build
{
  const indexHtmlPath = path.join(root, "client/index.html");
  if (fs.existsSync(indexHtmlPath)) {
    let indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
    indexHtml = indexHtml.replace(/<html\s+lang="[^"]*">/i, '<html lang="pt-BR">');
    if (!/<title>/i.test(indexHtml)) {
      indexHtml = indexHtml.replace(
        /<head>/i,
        '<head>\n    <title>InvistaPRO | Plataforma de Investimentos</title>'
      );
    }
    const sourceIcon = path.join(root, "client/src/assets/investpro-icon.png");
    const publicDir = path.join(root, "client/public");
    if (fs.existsSync(sourceIcon)) {
      fs.mkdirSync(publicDir, { recursive: true });
      fs.copyFileSync(sourceIcon, path.join(publicDir, "favicon.ico"));
      fs.copyFileSync(sourceIcon, path.join(publicDir, "favicon.png"));
    }
    if (!/rel=["']icon["']/i.test(indexHtml)) {
      indexHtml = indexHtml.replace(
        /<head>/i,
        '<head>\n    <link rel="icon" type="image/png" href="/favicon.png" />'
      );
    }
    fs.writeFileSync(indexHtmlPath, indexHtml);
  }

  const authPagePath = path.join(root, "client/src/pages/auth-page.tsx");
  let authPage = fs.readFileSync(authPagePath, "utf8");

  authPage = authPage.replace(
    '<form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3 sm:space-y-4">',
    '<form method="post" onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3 sm:space-y-4">'
  );
  authPage = authPage.replace(
    '<form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3 sm:space-y-4">',
    '<form method="post" onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3 sm:space-y-4">'
  );

  authPage = authPage.replace(
    'placeholder="Sua senha"\n                          className="h-10 sm:h-12 pr-10"',
    'placeholder="Sua senha"\n                          required\n                          autoComplete="current-password"\n                          className="h-10 sm:h-12 pr-10"'
  );
  authPage = authPage.replace(
    'placeholder="Email ou usuário"\n                        className="h-10 sm:h-12"',
    'placeholder="Email ou usuário"\n                        required\n                        autoComplete="username"\n                        className="h-10 sm:h-12"'
  );
  authPage = authPage.replace(
    '<EyeOff className="h-4 w-4" />',
    '<EyeOff className="h-4 w-4" aria-hidden="true" />'
  );
  authPage = authPage.replace(
    '<Eye className="h-4 w-4" />',
    '<Eye className="h-4 w-4" aria-hidden="true" />'
  );
  authPage = authPage.replace(
    'className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"',
    'className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"\n                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}'
  );

  fs.writeFileSync(authPagePath, authPage);
}


// END-TO-END FORENSIC MANIFEST
// Generated inside the canonical source tree before compilation. Every tracked
// platform file plus Aura build additions is inventoried with size + SHA-256.
{
  const ignored = new Set([".git", "node_modules", "dist"]);
  const entries = [];
  const classify = (relative) => {
    const p = relative.toLowerCase();
    if (/\.(ts|tsx|js|jsx|mjs|cjs|py|sh|sql|html|css|scss|json|yaml|yml|toml|xml|env|conf|config)$/i.test(p)) return { category: "source-or-config", inspectable: true };
    if (/\.(md|txt|pdf)$/i.test(p)) return { category: "documentation", inspectable: true };
    if (/\.(png|jpe?g|gif|webp|svg|ico|bmp|wav|mp3|oga|ttf|woff|zip|exe|ex5|hcc|chr|wnd|dat|lic|set|tpl|mq5)$/i.test(p)) return { category: "binary-or-asset", inspectable: false };
    return { category: "other", inspectable: true };
  };
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(absolute); continue; }
      const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
      const bytes = fs.readFileSync(absolute);
      const hash = crypto.createHash("sha256").update(bytes).digest("hex");
      const meta = classify(relative);
      const textContent = meta.inspectable && bytes.length <= 5_000_000 ? bytes.toString("utf8") : "";
      const count = (pattern) => (textContent.match(pattern) || []).length;
      const analysis = meta.inspectable ? {
        lines: textContent ? textContent.split(/\r?\n/).length : 0,
        imports: count(/^\s*import\b/gm),
        exports: count(/^\s*export\b/gm),
        networkCalls: count(/\bfetch\s*\(/g),
        timers: count(/\b(setInterval|setTimeout|setImmediate)\s*\(/g),
        websocketRefs: count(/\b(WebSocket|WebSocketServer)\b/g),
        processHandlers: count(/\bprocess\.on\s*\(/g),
        routeDefinitions: count(/\b(app|router)\.(get|post|put|patch|delete|use)\s*\(/g),
        errorLogging: count(/\bconsole\.(error|warn)\s*\(/g),
        throws: count(/\bthrow\s+new\b/g),
        todos: count(/\b(TODO|FIXME|HACK)\b/gi),
        credentialLikeLiterals: count(new RegExp("(?:password|secret|token|api[_-]?key|private[_-]?key)\\\\s*[:=]\\\\s*[\\\"'`][^\\\"'`]{4,}", "gi")),
      } : null;
      entries.push({ path: relative, size: bytes.length, sha256: hash, ...meta, analysis });
    }
  };
  walk(root);
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const canonicalSourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  fs.writeFileSync(path.join(root, "forensic-manifest.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    canonicalSourceCommit,
    root: "canonical-invista-source-plus-aura-build-assets",
    totalFiles: entries.length,
    analyzedFiles: entries.filter(x => x.inspectable).length,
    files: entries
  }));
  console.log("🔎 [FORENSIC] Manifesto ponta a ponta gerado:", entries.length, "arquivos");
}
