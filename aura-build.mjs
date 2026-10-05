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
    }',
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
    'console.log("🔐 Tentativa de login:", { identifier: req.body.identifier });',
    'const validatedData = loginSchema.parse(req.body);',
    'req.body.email = validatedData.identifier;'
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
