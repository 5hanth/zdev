import { existsSync } from "fs";
import { resolve } from "path";
import { isGitRepo, getRepoName, run } from "../utils.js";
import { getSeedPath, ensurezdevDirs } from "../config.js";

export interface SeedOptions {
  project?: string;
}

export async function seedExport(
  projectPath: string = ".",
  options: SeedOptions = {}
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
  const seedPath = getSeedPath(repoName);
  
  console.log(`🐂 Exporting seed data for: ${repoName}`);
  
  ensurezdevDirs();
  
  const result = run("bunx", ["convex", "export", "--path", seedPath], {
    cwd: fullPath,
  });
  
  if (result.success) {
    console.log(`\n✅ Seed exported to: ${seedPath}`);
  } else {
    console.error(`\n❌ Failed to export seed:`);
    console.error(result.stderr);
    process.exit(1);
  }
}

export async function seedImport(
  projectPath: string = ".",
  options: SeedOptions = {}
): Promise<void> {
  const fullPath = resolve(projectPath);
  
  if (!existsSync(fullPath)) {
    console.error(`❌ Path does not exist: ${fullPath}`);
    process.exit(1);
  }
  
  // Try to determine project name from .zdev/project.json or git
  let repoName: string;
  
  const projectConfigPath = resolve(fullPath, ".zdev", "project.json");
  if (existsSync(projectConfigPath)) {
    try {
      const config = JSON.parse(await Bun.file(projectConfigPath).text());
      repoName = config.name;
    } catch {
      repoName = getRepoName(fullPath);
    }
  } else if (isGitRepo(fullPath)) {
    repoName = getRepoName(fullPath);
  } else {
    console.error(`❌ Cannot determine project name`);
    process.exit(1);
  }
  
  const seedPath = getSeedPath(repoName);
  
  if (!existsSync(seedPath)) {
    console.error(`❌ No seed found for ${repoName}`);
    console.log(`   Expected: ${seedPath}`);
    console.log(`\n   Create one with: zdev seed export --project <main-repo-path>`);
    process.exit(1);
  }
  
  console.log(`🐂 Importing seed data for: ${repoName}`);
  console.log(`   From: ${seedPath}`);
  
  const result = run("bunx", ["convex", "import", "--replace", seedPath], {
    cwd: fullPath,
  });
  
  if (result.success) {
    console.log(`\n✅ Seed imported successfully`);
  } else {
    console.error(`\n❌ Failed to import seed:`);
    console.error(result.stderr);
    process.exit(1);
  }
}
