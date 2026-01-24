import { existsSync, rmSync } from "fs";
import { resolve } from "path";
import {
  isGitRepo,
  getRepoName,
  removeWorktree,
  killProcess,
  isProcessRunning,
  traefikRemoveRoute,
} from "../utils.js";
import {
  loadConfig,
  saveConfig,
  getWorktreePath,
} from "../config.js";

export interface CleanOptions {
  project?: string;
  force?: boolean;
}

export async function clean(
  featureName: string,
  options: CleanOptions = {}
): Promise<void> {
  const config = loadConfig();
  
  // Find the allocation or worktree
  let worktreeName: string | undefined;
  let allocation;
  let projectPath: string | undefined;
  
  if (options.project) {
    projectPath = resolve(options.project);
    const repoName = isGitRepo(projectPath) ? getRepoName(projectPath) : options.project;
    worktreeName = `${repoName}-${featureName}`;
    allocation = config.allocations[worktreeName];
  } else {
    // Search for matching feature across all projects
    for (const [name, alloc] of Object.entries(config.allocations)) {
      if (name.endsWith(`-${featureName}`)) {
        worktreeName = name;
        allocation = alloc;
        projectPath = alloc.projectPath;
        break;
      }
    }
    
    // If not found in allocations, try to find by worktree name pattern
    if (!worktreeName) {
      // Try common pattern
      const entries = Object.keys(config.allocations);
      console.error(`❌ Feature "${featureName}" not found in active allocations`);
      if (entries.length > 0) {
        console.log(`\nActive features:`);
        entries.forEach(e => console.log(`   - ${e}`));
      }
      process.exit(1);
    }
  }
  
  const worktreePath = getWorktreePath(worktreeName);
  
  console.log(`🐂 Cleaning feature: ${featureName}`);
  
  // Stop processes if still running
  if (allocation) {
    if (allocation.pids.frontend && isProcessRunning(allocation.pids.frontend)) {
      console.log(`\n🛑 Stopping frontend...`);
      killProcess(allocation.pids.frontend);
    }
    
    if (allocation.pids.convex && isProcessRunning(allocation.pids.convex)) {
      console.log(`🛑 Stopping Convex...`);
      killProcess(allocation.pids.convex);
    }
    
    if (allocation.funnelPath) {
      console.log(`🔗 Removing Traefik route...`);
      traefikRemoveRoute(allocation.funnelPath);
    }
    
    projectPath = allocation.projectPath;
  }
  
  // Remove worktree
  if (existsSync(worktreePath)) {
    console.log(`\n🗑️  Removing worktree...`);
    
    if (projectPath && isGitRepo(projectPath)) {
      const result = removeWorktree(projectPath, worktreePath);
      if (!result.success) {
        if (options.force) {
          console.log(`   Git worktree remove failed, force removing directory...`);
          rmSync(worktreePath, { recursive: true, force: true });
        } else {
          console.error(`   Failed to remove worktree: ${result.error}`);
          console.log(`   Use --force to force remove`);
          process.exit(1);
        }
      }
    } else if (options.force) {
      rmSync(worktreePath, { recursive: true, force: true });
    } else {
      console.error(`   Cannot remove worktree: project path unknown`);
      console.log(`   Use --force to force remove, or specify --project`);
      process.exit(1);
    }
    
    console.log(`   Worktree removed`);
  } else {
    console.log(`\n   Worktree already removed`);
  }
  
  // Remove from config
  if (worktreeName && config.allocations[worktreeName]) {
    delete config.allocations[worktreeName];
    saveConfig(config);
  }
  
  console.log(`\n✅ Feature "${featureName}" cleaned up`);
}
