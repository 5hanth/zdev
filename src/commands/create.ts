import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { run } from "../utils.js";

export interface CreateOptions {
  convex?: boolean;
  flat?: boolean;
}

const ZEBU_INDEX_PAGE = `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#e8e8e8',
        padding: '2rem',
      }}
    >
      <div
        style={{
          fontSize: '6rem',
          marginBottom: '1rem',
        }}
      >
        🐂
      </div>
      <h1
        style={{
          fontSize: '3rem',
          fontWeight: 700,
          margin: 0,
          background: 'linear-gradient(90deg, #00d9ff, #00ff88)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Ready to build
      </h1>
      <p
        style={{
          fontSize: '1.25rem',
          color: '#888',
          marginTop: '1rem',
          textAlign: 'center',
        }}
      >
        Your TanStack Start app is ready.
        <br />
        Edit <code style={{ color: '#00d9ff', background: '#1a1a2e', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>app/routes/index.tsx</code> to get started.
      </p>
    </div>
  )
}
`;

const CONVEX_PROVIDER = `import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
`;

const ROUTER = `import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
`;

const ROOT_ROUTE = `/// <reference types="vite/client" />
import {
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import * as React from 'react'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <Scripts />
      </body>
    </html>
  )
}
`;

const SETUP_SCRIPT = `#!/bin/bash
# .zdev/setup.sh - Runs after worktree creation
# Edit this to customize your setup (change package manager, add commands, etc.)

set -e

# Install dependencies
bun install

# Add any other setup commands below:
# bunx prisma generate
# cp ../.env.local .
`;

export async function create(
  projectName: string,
  options: CreateOptions = {}
): Promise<void> {
  const targetPath = resolve(projectName);
  
  if (existsSync(targetPath)) {
    console.error(`❌ Directory already exists: ${targetPath}`);
    process.exit(1);
  }
  
  console.log(`🐂 Creating new project: ${projectName}`);
  console.log(`   Convex: ${options.convex ? 'yes' : 'no'}`);
  console.log(`   Structure: ${options.flat ? 'flat' : 'monorepo'}`);
  
  // Clone start-basic template
  console.log(`\n📥 Cloning TanStack Start template...`);
  const cloneResult = run("npx", [
    "-y",
    "gitpick",
    "TanStack/router/tree/main/examples/react/start-basic",
    projectName,
  ]);
  
  if (!cloneResult.success) {
    console.error(`❌ Failed to clone template: ${cloneResult.stderr}`);
    process.exit(1);
  }
  console.log(`   Template cloned`);
  
  // Determine web directory
  let webPath: string;
  
  if (options.flat) {
    webPath = targetPath;
  } else {
    // Monorepo: move everything into web/
    console.log(`\n📁 Setting up monorepo structure...`);
    const webDir = join(targetPath, "web");
    const tempDir = join(targetPath, "_temp_web");
    
    // Move all files to temp, then to web/
    mkdirSync(tempDir, { recursive: true });
    
    const files = readdirSync(targetPath);
    for (const file of files) {
      if (file !== "_temp_web") {
        renameSync(join(targetPath, file), join(tempDir, file));
      }
    }
    
    renameSync(tempDir, webDir);
    webPath = webDir;
    
    // Create root package.json for workspace
    const rootPackageJson = {
      name: projectName,
      private: true,
      workspaces: ["web"],
      scripts: {
        dev: "cd web && bun dev",
        build: "cd web && bun run build",
      },
    };
    writeFileSync(
      join(targetPath, "package.json"),
      JSON.stringify(rootPackageJson, null, 2)
    );
    
    console.log(`   Created web/ subdirectory`);
  }
  
  // Clean up demo routes, components, and utils
  console.log(`\n🧹 Cleaning up demo files...`);
  const srcDir = join(webPath, "src");
  const routesDir = join(srcDir, "routes");
  
  // Clean all routes
  if (existsSync(routesDir)) {
    rmSync(routesDir, { recursive: true, force: true });
    mkdirSync(routesDir, { recursive: true });
  }
  
  // Remove demo components, utils, and styles
  const componentsDir = join(srcDir, "components");
  const utilsDir = join(srcDir, "utils");
  const stylesDir = join(srcDir, "styles");
  if (existsSync(componentsDir)) {
    rmSync(componentsDir, { recursive: true, force: true });
  }
  if (existsSync(utilsDir)) {
    rmSync(utilsDir, { recursive: true, force: true });
  }
  if (existsSync(stylesDir)) {
    rmSync(stylesDir, { recursive: true, force: true });
  }
  
  // Remove generated route tree (will be regenerated)
  const routeTreePath = join(srcDir, "routeTree.gen.ts");
  if (existsSync(routeTreePath)) {
    rmSync(routeTreePath);
  }
  
  // Remove app/ directory if it exists (we use src/)
  const appDir = join(webPath, "app");
  if (existsSync(appDir)) {
    rmSync(appDir, { recursive: true, force: true });
  }
  
  // Add clean router, root, and Zebu-themed index route
  writeFileSync(join(srcDir, "router.tsx"), ROUTER);
  writeFileSync(join(routesDir, "__root.tsx"), ROOT_ROUTE);
  writeFileSync(join(routesDir, "index.tsx"), ZEBU_INDEX_PAGE);
  console.log(`   Cleaned demo files, added index route`);
  
  // Update package.json name
  const pkgPath = join(webPath, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    pkg.name = options.flat ? projectName : `${projectName}-web`;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }
  
  // Add Convex if requested
  if (options.convex) {
    console.log(`\n🔧 Setting up Convex...`);
    
    // Add Convex dependencies
    const addResult = run("bun", ["add", "convex", "convex-react"], { cwd: webPath });
    if (!addResult.success) {
      console.error(`   Failed to add Convex deps: ${addResult.stderr}`);
    } else {
      console.log(`   Added convex dependencies`);
    }
    
    // Initialize Convex
    const initResult = run("bunx", ["convex", "init"], { cwd: webPath });
    if (!initResult.success) {
      console.log(`   Note: Run 'bunx convex dev' to complete Convex setup`);
    } else {
      console.log(`   Initialized Convex`);
    }
    
    // Create ConvexClientProvider
    const componentsDir = join(webPath, "app", "components");
    mkdirSync(componentsDir, { recursive: true });
    writeFileSync(join(componentsDir, "ConvexClientProvider.tsx"), CONVEX_PROVIDER);
    console.log(`   Created ConvexClientProvider`);
    
    // Create .env.local template
    writeFileSync(
      join(webPath, ".env.local.example"),
      "VITE_CONVEX_URL=your_convex_url_here\n"
    );
    console.log(`   Created .env.local.example`);
    
    // Note: User needs to manually wrap their app with the provider
    console.log(`\n   ⚠️  To complete Convex setup:`);
    console.log(`      1. cd ${options.flat ? projectName : projectName + '/web'}`);
    console.log(`      2. bunx convex dev  (select/create project)`);
    console.log(`      3. Wrap your app with <ConvexClientProvider> in app/root.tsx`);
  }
  
  // Create .zdev/setup.sh for worktree setup
  console.log(`\n📜 Creating setup script...`);
  const zdevDir = join(targetPath, ".zdev");
  mkdirSync(zdevDir, { recursive: true });
  const setupScriptPath = join(zdevDir, "setup.sh");
  writeFileSync(setupScriptPath, SETUP_SCRIPT, { mode: 0o755 });
  console.log(`   Created .zdev/setup.sh`);
  
  // Install dependencies (initial setup)
  console.log(`\n📦 Installing dependencies...`);
  const installResult = run("bun", ["install"], { cwd: webPath });
  if (!installResult.success) {
    console.error(`   Failed to install: ${installResult.stderr}`);
  } else {
    console.log(`   Dependencies installed`);
  }
  
  // Initialize git
  console.log(`\n📚 Initializing git...`);
  run("git", ["init"], { cwd: targetPath });
  run("git", ["add", "."], { cwd: targetPath });
  run("git", ["commit", "-m", "Initial commit from zdev create"], { cwd: targetPath });
  console.log(`   Git initialized`);
  
  // Summary
  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Project "${projectName}" created!\n`);
  console.log(`📁 Location: ${targetPath}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   cd ${projectName}`);
  if (!options.flat) {
    console.log(`   cd web`);
  }
  if (options.convex) {
    console.log(`   bunx convex dev    # Setup Convex project`);
  }
  console.log(`   bun dev            # Start dev server`);
  console.log(`${"─".repeat(50)}`);
}
