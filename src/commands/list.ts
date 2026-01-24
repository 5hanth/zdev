import { existsSync } from "fs";
import {
  loadConfig,
  getWorktreePath,
  ZEBU_HOME,
  WORKTREES_DIR,
} from "../config.js";
import { isProcessRunning, getTraefikStatus } from "../utils.js";

export interface ListOptions {
  json?: boolean;
}

export async function list(options: ListOptions = {}): Promise<void> {
  const config = loadConfig();
  const allocations = Object.entries(config.allocations);
  
  if (options.json) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }
  
  console.log(`🐂 zdev Status\n`);
  console.log(`📁 Home: ${ZEBU_HOME}`);
  console.log(`📁 Worktrees: ${WORKTREES_DIR}`);
  
  const traefikStatus = getTraefikStatus();
  if (traefikStatus.running) {
    console.log(`🔗 Traefik: running (*.${traefikStatus.devDomain || 'dev.example.com'})`);
  } else {
    console.log(`🔗 Traefik: not running`);
  }
  
  console.log(`\n${"─".repeat(60)}`);
  
  if (allocations.length === 0) {
    console.log(`\nNo active features.\n`);
    console.log(`Start one with: zdev start <feature-name> --project <path>`);
    return;
  }
  
  console.log(`\n📋 Active Features (${allocations.length}):\n`);
  
  for (const [name, alloc] of allocations) {
    const worktreePath = getWorktreePath(name);
    const worktreeExists = existsSync(worktreePath);
    
    const frontendRunning = alloc.pids.frontend
      ? isProcessRunning(alloc.pids.frontend)
      : false;
    const convexRunning = alloc.pids.convex
      ? isProcessRunning(alloc.pids.convex)
      : false;
    
    const statusEmoji = frontendRunning && convexRunning ? "🟢" : 
                        frontendRunning || convexRunning ? "🟡" : "🔴";
    
    console.log(`${statusEmoji} ${name}`);
    console.log(`   Project:  ${alloc.project}`);
    console.log(`   Branch:   ${alloc.branch}`);
    console.log(`   Path:     ${worktreePath} ${worktreeExists ? "" : "(missing)"}`);
    console.log(`   Local:    http://localhost:${alloc.frontendPort}`);
    
    if (alloc.funnelPath && traefikStatus.devDomain) {
      console.log(`   Public:   https://${alloc.funnelPath}.${traefikStatus.devDomain}`);
    }
    
    console.log(`   Frontend: ${frontendRunning ? `running (PID: ${alloc.pids.frontend})` : "stopped"}`);
    console.log(`   Convex:   ${convexRunning ? `running (PID: ${alloc.pids.convex})` : "stopped"}`);
    console.log(`   Started:  ${new Date(alloc.started).toLocaleString()}`);
    console.log();
  }
  
  console.log(`${"─".repeat(60)}`);
  console.log(`\nCommands:`);
  console.log(`   zdev stop <feature>    Stop servers for a feature`);
  console.log(`   zdev clean <feature>   Remove worktree after merge`);
}
