import { existsSync } from "fs";
import { resolve } from "path";
import {
  isGitRepo,
  getRepoName,
  killProcess,
  isProcessRunning,
  traefikRemoveRoute,
} from "../utils.js";
import {
  loadConfig,
  saveConfig,
  getWorktreePath,
} from "../config.js";

export interface StopOptions {
  project?: string;
  keep?: boolean;  // Keep worktree, just stop servers
}

export async function stop(
  featureName: string,
  options: StopOptions = {}
): Promise<void> {
  const config = loadConfig();
  
  // Find the allocation
  let worktreeName: string | undefined;
  let allocation;
  
  if (options.project) {
    const projectPath = resolve(options.project);
    const repoName = isGitRepo(projectPath) ? getRepoName(projectPath) : options.project;
    worktreeName = `${repoName}-${featureName}`;
    allocation = config.allocations[worktreeName];
  } else {
    // Search for matching feature across all projects
    for (const [name, alloc] of Object.entries(config.allocations)) {
      if (name.endsWith(`-${featureName}`)) {
        worktreeName = name;
        allocation = alloc;
        break;
      }
    }
  }
  
  if (!worktreeName || !allocation) {
    console.error(`❌ Feature "${featureName}" not found`);
    console.log(`\nRun 'zdev list' to see active features`);
    process.exit(1);
  }
  
  console.log(`🐂 Stopping feature: ${featureName}`);
  console.log(`   Project: ${allocation.project}`);
  
  // Stop frontend
  if (allocation.pids.frontend && isProcessRunning(allocation.pids.frontend)) {
    console.log(`\n🛑 Stopping frontend (PID: ${allocation.pids.frontend})...`);
    if (killProcess(allocation.pids.frontend)) {
      console.log(`   Frontend stopped`);
    } else {
      console.error(`   Failed to stop frontend`);
    }
  }
  
  // Stop Convex
  if (allocation.pids.convex && isProcessRunning(allocation.pids.convex)) {
    console.log(`\n🛑 Stopping Convex (PID: ${allocation.pids.convex})...`);
    if (killProcess(allocation.pids.convex)) {
      console.log(`   Convex stopped`);
    } else {
      console.error(`   Failed to stop Convex`);
    }
  }
  
  // Remove Traefik route
  if (allocation.funnelPath) {
    console.log(`\n🔗 Removing Traefik route...`);
    if (traefikRemoveRoute(allocation.funnelPath)) {
      console.log(`   Route removed`);
    } else {
      console.error(`   Failed to remove route (may already be removed)`);
    }
  }
  
  // Remove allocation from config
  delete config.allocations[worktreeName];
  saveConfig(config);
  
  const worktreePath = getWorktreePath(worktreeName);
  
  if (options.keep) {
    console.log(`\n✅ Feature "${featureName}" stopped (worktree kept)`);
    console.log(`   Worktree: ${worktreePath}`);
    console.log(`\n   To remove worktree: zdev clean ${featureName}`);
  } else {
    console.log(`\n✅ Feature "${featureName}" stopped`);
    console.log(`\n   Worktree still exists at: ${worktreePath}`);
    console.log(`   To remove: zdev clean ${featureName} --project ${allocation.projectPath}`);
  }
}
