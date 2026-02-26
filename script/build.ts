import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { execSync } from "child_process";

try {
  console.log("pushing database schema...");
  execSync("npx drizzle-kit push --force", { stdio: "inherit" });
} catch (e) {
  console.warn("db:push warning:", e);
}

const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "memoizee",
  "multer",
  "nanoid",
  "nodemailer",
  "officeparser",
  "openai",
  "openid-client",
  "p-limit",
  "p-retry",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    banner: {
      js: [
        `const { createRequire: __bundled_createRequire } = require("module");`,
        `const __bundled_require = __bundled_createRequire(__filename);`,
        `const __bundled_import_meta_url = require("url").pathToFileURL(__filename).href;`,
        `if (typeof globalThis.import_meta_url === "undefined") { globalThis.import_meta_url = __bundled_import_meta_url; }`,
      ].join("\n"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.dirname": "__dirname",
      "import.meta.filename": "__filename",
      "import.meta.url": "__bundled_import_meta_url",
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
