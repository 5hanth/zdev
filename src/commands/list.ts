import { existsSync } from "fs";
import {
  loadConfig,
  getWorktreePath,
  ZEBU_HOME,
  WORKTREES_DIR,
} from "../config.js";
import { isProcessRunning, getTraefikStatus, run } from "../utils.js";

// Get tmux sessions matching a pattern
function getTmuxSessions(pattern: string): string[] {
  const socketDir = process.env.CLAWDBOT_TMUX_SOCKET_DIR || "/tmp/clawdbot-tmux-sockets";
  const socket = `${socketDir}/clawdbot.sock`;
  
  // Try clawdbot socket first
  let result = run("tmux", ["-S", socket, "list-sessions", "-F", "#{session_name}"]);
  
  if (!result.success) {
    // Fall back to default tmux socket
    result = run("tmux", ["list-sessions", "-F", "#{session_name}"]);
  }
  
  if (!result.success) return [];
  
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .filter(name => name.toLowerCase().includes(pattern.toLowerCase()));
}

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
  
  console.log(`\n${"-".repeat(60)}`);
  
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
    
    // Check for tmux sessions related to this feature
    const featureSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const tmuxSessions = getTmuxSessions(featureSlug);
    const hasTmux = tmuxSessions.length > 0;
    
    const isRunning = frontendRunning || convexRunning || hasTmux;
    const isFullyRunning = (frontendRunning && convexRunning) || (hasTmux && tmuxSessions.length >= 2);
    
    const statusEmoji = isFullyRunning ? "🟢" : isRunning ? "🟡" : "🔴";
    
    console.log(`${statusEmoji} ${name}`);
    console.log(`   Project:  ${alloc.project}`);
    console.log(`   Branch:   ${alloc.branch}`);
    console.log(`   Path:     ${worktreePath} ${worktreeExists ? "" : "(missing)"}`);
    console.log(`   Local:    http://localhost:${alloc.frontendPort}`);
    
    if (alloc.funnelPath && traefikStatus.devDomain) {
      console.log(`   Public:   https://${alloc.funnelPath}.${traefikStatus.devDomain}`);
    }
    
    // Show PID-based status
    if (alloc.pids.frontend || alloc.pids.convex) {
      console.log(`   Frontend: ${frontendRunning ? `running (PID: ${alloc.pids.frontend})` : "stopped"}`);
      console.log(`   Convex:   ${convexRunning ? `running (PID: ${alloc.pids.convex})` : "stopped"}`);
    }
    
    // Show tmux sessions if any
    if (hasTmux) {
      console.log(`   Tmux:     ${tmuxSessions.join(", ")}`);
    } else if (!frontendRunning && !convexRunning) {
      console.log(`   Servers:  stopped`);
    }
    
    console.log(`   Started:  ${new Date(alloc.started).toLocaleString()}`);
    console.log();
  }
  
  console.log(`${"-".repeat(60)}`);
  console.log(`\nCommands:`);
  console.log(`   zdev stop <feature>    Stop servers for a feature`);
  console.log(`   zdev clean <feature>   Remove worktree after merge`);
}
