import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, basename, join } from "path";
import {
  isGitRepo,
  getRepoName,
  gitFetch,
  createWorktree,
  runBackground,
  traefikAddRoute,
  getTraefikStatus,
  run,
} from "../utils.js";
import {
  loadConfig,
  saveConfig,
  allocatePorts,
  getWorktreePath,
  getSeedPath,
  type WorktreeAllocation,
} from "../config.js";

export interface StartOptions {
  port?: number;
  local?: boolean;  // Skip public URL setup
  seed?: boolean;
  baseBranch?: string;
  webDir?: string;  // Subdirectory containing package.json (e.g., "web")
}

/**
 * Detect the web/frontend directory in a project.
 * Looks for common patterns: web/, frontend/, app/, or root package.json
 */
function detectWebDir(worktreePath: string): string {
  // Check common subdirectory names
  const commonDirs = ["web", "frontend", "app", "client", "packages/web", "apps/web"];
  
  for (const dir of commonDirs) {
    const packagePath = join(worktreePath, dir, "package.json");
    if (existsSync(packagePath)) {
      return dir;
    }
  }
  
  // Check root
  if (existsSync(join(worktreePath, "package.json"))) {
    return ".";
  }
  
  // Default to web/ if nothing found (will fail gracefully)
  return "web";
}

export async function start(
  featureName: string,
  projectPath: string = ".",
  options: StartOptions = {}
): Promise<void> {
  const fullPath = resolve(projectPath);
  
  if (!existsSync(fullPath)) {
    console.error(`❌ Path does not exist: ${fullPath}`);
    process.exit(1);
  }
  
  if (!isGitRepo(fullPath)) {
    console.error(`❌ Not a git repository: ${fullPath}`);
    process.exit(1);
  }
  
  const repoName = getRepoName(fullPath);
  const worktreeName = `${repoName}-${featureName}`;
  const worktreePath = getWorktreePath(worktreeName);
  const branchName = `feature/${featureName}`;
  const baseBranch = options.baseBranch || "origin/main";
  
  console.log(`🐂 Starting feature: ${featureName}`);
  console.log(`   Project: ${repoName}`);
  console.log(`   Branch: ${branchName}`);
  
  // Load config
  const config = loadConfig();
  
  // Check if already exists
  if (config.allocations[worktreeName]) {
    console.error(`\n❌ Feature "${featureName}" already exists for ${repoName}`);
    console.log(`   Run: zdev stop ${featureName} --project ${fullPath}`);
    process.exit(1);
  }
  
  // Fetch latest
  console.log(`\n📥 Fetching latest from origin...`);
  if (!gitFetch(fullPath)) {
    console.error(`   Failed to fetch, continuing anyway...`);
  }
  
  // Create worktree
  console.log(`\n🌳 Creating worktree...`);
  if (existsSync(worktreePath)) {
    console.error(`   Worktree path already exists: ${worktreePath}`);
    process.exit(1);
  }
  
  const worktreeResult = createWorktree(fullPath, worktreePath, branchName, baseBranch);
  if (!worktreeResult.success) {
    console.error(`   Failed to create worktree: ${worktreeResult.error}`);
    process.exit(1);
  }
  console.log(`   Created: ${worktreePath}`);
  
  // Detect web directory
  const webDir = options.webDir || detectWebDir(worktreePath);
  const webPath = webDir === "." ? worktreePath : join(worktreePath, webDir);
  
  console.log(`\n📁 Web directory: ${webDir === "." ? "(root)" : webDir}`);
  
  // Copy configured files from main project to worktree
  if (config.copyPatterns && config.copyPatterns.length > 0) {
    console.log(`\n📋 Copying config files...`);
    const mainWebPath = webDir === "." ? fullPath : join(fullPath, webDir);
    
    for (const pattern of config.copyPatterns) {
      const srcPath = join(mainWebPath, pattern);
      const destPath = join(webPath, pattern);
      
      if (existsSync(srcPath) && !existsSync(destPath)) {
        try {
          const content = readFileSync(srcPath);
          writeFileSync(destPath, content);
          console.log(`   Copied ${pattern}`);
        } catch (e) {
          console.log(`   Could not copy ${pattern}`);
        }
      }
    }
  }

  // Run setup script if exists
  const setupScriptPath = join(worktreePath, ".zdev", "setup.sh");
  if (existsSync(setupScriptPath)) {
    console.log(`\n📦 Running setup script...`);
    const setupResult = run("bash", [setupScriptPath], { cwd: webPath });
    if (!setupResult.success) {
      console.error(`   Setup script failed: ${setupResult.stderr}`);
    } else {
      console.log(`   Setup complete`);
    }
  } else {
    console.log(`\n⚠️  No .zdev/setup.sh found, skipping setup`);
    console.log(`   Create one in your project to automate dependency installation`);
  }
  
  // Check if this is a Convex project
  const hasConvex = existsSync(join(webPath, "convex")) || existsSync(join(worktreePath, "convex"));
  
  // Import seed data if requested, exists, and is a Convex project
  const seedPath = getSeedPath(repoName);
  if (options.seed && hasConvex && existsSync(seedPath)) {
    console.log(`\n🌱 Importing seed data...`);
    const seedResult = run("bunx", ["convex", "import", seedPath], {
      cwd: webPath,
    });
    if (seedResult.success) {
      console.log(`   Seed data imported`);
    } else {
      console.error(`   Failed to import seed: ${seedResult.stderr}`);
    }
  }
  
  // Allocate ports
  const ports = options.port
    ? { frontend: options.port, convex: hasConvex ? options.port + 100 : 0 }
    : allocatePorts(config, hasConvex);
  
  console.log(`\n🔌 Allocated ports:`);
  console.log(`   Frontend: ${ports.frontend}`);
  if (hasConvex) {
    console.log(`   Convex: ${ports.convex}`);
  }
  
  // Start Convex dev (only if this is a Convex project)
  let convexPid: number | undefined;
  if (hasConvex) {
    console.log(`\n🚀 Starting Convex dev server...`);
    convexPid = runBackground(
      "bunx",
      ["convex", "dev", "--tail-logs", "disable"],
      { cwd: webPath }
    );
    console.log(`   Convex PID: ${convexPid}`);
    
    // Wait a moment for Convex to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  
  // Patch vite.config to allow external hosts (for Traefik access)
  const viteConfigTsPath = join(webPath, "vite.config.ts");
  const viteConfigJsPath = join(webPath, "vite.config.js");
  const viteConfigPath = existsSync(viteConfigTsPath) ? viteConfigTsPath : 
                         existsSync(viteConfigJsPath) ? viteConfigJsPath : null;
  
  if (viteConfigPath) {
    try {
      let viteConfig = readFileSync(viteConfigPath, "utf-8");
      
      // Only patch if allowedHosts not already present
      if (!viteConfig.includes("allowedHosts")) {
        // Find defineConfig({ and insert server config after it
        if (viteConfig.includes("defineConfig({")) {
          viteConfig = viteConfig.replace(
            /defineConfig\(\{/,
            "defineConfig({\n  server: {\n    allowedHosts: true,\n  },"
          );
          writeFileSync(viteConfigPath, viteConfig);
          console.log(`   Patched ${basename(viteConfigPath)} for external access`);
          
          // Mark file as skip-worktree so it won't be committed
          run("git", ["update-index", "--skip-worktree", basename(viteConfigPath)], { cwd: webPath });
        }
      }
    } catch (e) {
      console.log(`   Could not patch vite config (non-critical)`);
    }
  }

  // Start frontend (bind to all interfaces for Docker/Traefik access)
  console.log(`\n🌐 Starting frontend dev server...`);
  const frontendPid = runBackground(
    "bun",
    ["dev", "--port", String(ports.frontend), "--host", "0.0.0.0"],
    { cwd: webPath }
  );
  console.log(`   Frontend PID: ${frontendPid}`);
  
  // Setup Traefik route for public URL
  let routePath = "";
  let publicUrl = "";
  
  if (!options.local) {
    const traefikStatus = getTraefikStatus();
    
    if (traefikStatus.running && traefikStatus.devDomain) {
      routePath = worktreeName;
      console.log(`\n🔗 Setting up Traefik route...`);
      
      // Wait for frontend to be ready
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      if (traefikAddRoute(worktreeName, ports.frontend)) {
        publicUrl = `https://${worktreeName}.${traefikStatus.devDomain}`;
        console.log(`   Public URL: ${publicUrl}`);
      } else {
        console.error(`   Failed to setup Traefik route`);
      }
    } else {
      console.log(`\n⚠️  Traefik not configured or devDomain not set, skipping public URL`);
      console.log(`   Run: zdev config --set devDomain=dev.yourdomain.com`);
    }
  }
  
  // Save allocation
  const allocation: WorktreeAllocation = {
    project: repoName,
    projectPath: fullPath,
    branch: branchName,
    webDir,
    frontendPort: ports.frontend,
    convexPort: ports.convex,
    funnelPath: routePath,
    pids: {
      frontend: frontendPid,
      convex: convexPid,
    },
    started: new Date().toISOString(),
  };
  
  config.allocations[worktreeName] = allocation;
  saveConfig(config);
  
  // Summary
  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Feature "${featureName}" is ready!\n`);
  console.log(`📁 Worktree: ${worktreePath}`);
  console.log(`🌐 Local:    http://localhost:${ports.frontend}`);
  if (publicUrl) {
    console.log(`🔗 Public:   ${publicUrl}`);
  }
  console.log(`\n📝 Commands:`);
  console.log(`   cd ${worktreePath}`);
  console.log(`   zdev stop ${featureName} --project ${fullPath}`);
  console.log(`${"─".repeat(50)}`);
}
