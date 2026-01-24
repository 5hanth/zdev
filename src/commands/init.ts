import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve, basename } from "path";
import { isGitRepo, getRepoName, run } from "../utils.js";
import { getSeedPath, SEEDS_DIR } from "../config.js";

export interface InitOptions {
  seed?: boolean;
}

export async function init(projectPath: string = ".", options: InitOptions = {}): Promise<void> {
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
  console.log(`🐂 Initializing zdev for: ${repoName}`);
  
  // Create .zdev directory in project
  const zdevDir = resolve(fullPath, ".zdev");
  if (!existsSync(zdevDir)) {
    mkdirSync(zdevDir, { recursive: true });
    console.log(`   Created ${zdevDir}`);
  }
  
  // Create project config
  const projectConfig = {
    name: repoName,
    path: fullPath,
    initialized: new Date().toISOString(),
  };
  
  const configPath = resolve(zdevDir, "project.json");
  writeFileSync(configPath, JSON.stringify(projectConfig, null, 2));
  console.log(`   Created project config`);
  
  // Check for existing .gitignore and add .zdev if needed
  const gitignorePath = resolve(fullPath, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".zdev")) {
      writeFileSync(gitignorePath, content + "\n.zdev/\n");
      console.log(`   Added .zdev/ to .gitignore`);
    }
  }
  
  // Create seed if requested
  if (options.seed) {
    console.log(`\n📦 Creating seed data...`);
    
    // Check if convex directory exists
    const convexDir = resolve(fullPath, "convex");
    if (!existsSync(convexDir)) {
      console.log(`   No convex/ directory found, skipping seed`);
    } else {
      const seedPath = getSeedPath(repoName);
      const result = run("bunx", ["convex", "export", "--path", seedPath], {
        cwd: fullPath,
      });
      
      if (result.success) {
        console.log(`   Seed saved to: ${seedPath}`);
      } else {
        console.error(`   Failed to create seed: ${result.stderr}`);
      }
    }
  }
  
  console.log(`\n✅ zdev initialized for ${repoName}`);
  console.log(`\nNext steps:`);
  console.log(`   zdev start <feature-name>   Start working on a feature`);
  console.log(`   zdev list                   List active worktrees`);
}
