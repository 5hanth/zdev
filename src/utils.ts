import { spawn, spawnSync, type SpawnOptions } from "child_process";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { basename, resolve } from "path";

export function run(
  command: string,
  args: string[],
  options?: SpawnOptions
): { success: boolean; stdout: string; stderr: string; code: number | null } {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    ...options,
  });
  
  return {
    success: result.status === 0,
    stdout: (result.stdout as string) || "",
    stderr: (result.stderr as string) || "",
    code: result.status,
  };
}

export function runBackground(
  command: string,
  args: string[],
  options?: SpawnOptions
): number | undefined {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    ...options,
  });
  
  child.unref();
  return child.pid;
}

export function isGitRepo(path: string): boolean {
  return existsSync(resolve(path, ".git"));
}

export function getRepoName(path: string): string {
  const result = run("git", ["remote", "get-url", "origin"], { cwd: path });
  if (result.success) {
    // Extract repo name from URL
    const url = result.stdout.trim();
    const match = url.match(/\/([^\/]+?)(\.git)?$/);
    if (match) return match[1];
  }
  return basename(resolve(path));
}

export function gitFetch(repoPath: string): boolean {
  const result = run("git", ["fetch", "origin"], { cwd: repoPath });
  return result.success;
}

export function createWorktree(
  repoPath: string,
  worktreePath: string,
  branch: string,
  baseBranch: string = "origin/main"
): { success: boolean; error?: string } {
  const result = run(
    "git",
    ["worktree", "add", worktreePath, "-b", branch, baseBranch],
    { cwd: repoPath }
  );
  
  if (!result.success) {
    return { success: false, error: result.stderr };
  }
  return { success: true };
}

export function removeWorktree(
  repoPath: string,
  worktreePath: string
): { success: boolean; error?: string } {
  const result = run("git", ["worktree", "remove", worktreePath, "--force"], {
    cwd: repoPath,
  });
  
  if (!result.success) {
    return { success: false, error: result.stderr };
  }
  
  // Prune worktree references
  run("git", ["worktree", "prune"], { cwd: repoPath });
  
  return { success: true };
}

export function listWorktrees(repoPath: string): string[] {
  const result = run("git", ["worktree", "list", "--porcelain"], {
    cwd: repoPath,
  });
  
  if (!result.success) return [];
  
  const worktrees: string[] = [];
  const lines = result.stdout.split("\n");
  
  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      worktrees.push(line.replace("worktree ", ""));
    }
  }
  
  return worktrees;
}

import { loadConfig } from "./config.js";

export function traefikAddRoute(name: string, port: number): boolean {
  const config = loadConfig();
  const configPath = `${config.traefikConfigDir}/${name}.yml`;
  const subdomain = name;
  
  const traefikConfig = `# zdev auto-generated config for ${name}
http:
  routers:
    ${name}:
      rule: "Host(\`${subdomain}.${config.devDomain}\`)"
      entrypoints:
        - websecure
      service: ${name}
      tls:
        certResolver: myresolver

  services:
    ${name}:
      loadBalancer:
        servers:
          - url: "http://${config.dockerHostIp}:${port}"
`;

  try {
    writeFileSync(configPath, traefikConfig);
    return true;
  } catch {
    return false;
  }
}

export function traefikRemoveRoute(name: string): boolean {
  const zdevConfig = loadConfig();
  const configPath = `${zdevConfig.traefikConfigDir}/${name}.yml`;
  
  try {
    if (existsSync(configPath)) {
      unlinkSync(configPath);
    }
    return true;
  } catch {
    return false;
  }
}

export function getTraefikStatus(): { baseUrl?: string; running: boolean; devDomain?: string } {
  const config = loadConfig();
  // Check if Traefik is responding
  const result = run("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://localhost:8080/api/overview"]);
  
  const running = result.success && result.stdout.trim() === "200";
  
  return {
    running,
    baseUrl: running ? `https://*.${config.devDomain}` : undefined,
    devDomain: config.devDomain,
  };
}

// Legacy Tailscale functions (kept for compatibility)
export function tailscaleServe(path: string, port: number): boolean {
  const result = run("tailscale", [
    "funnel",
    "--bg",
    "--set-path",
    path,
    `http://127.0.0.1:${port}`,
  ]);
  return result.success;
}

export function tailscaleRemove(path: string): boolean {
  const result = run("tailscale", ["funnel", "--set-path", path, "off"]);
  return result.success;
}

export function getTailscaleStatus(): { baseUrl?: string; running: boolean } {
  const result = run("tailscale", ["status", "--json"]);
  
  if (!result.success) {
    return { running: false };
  }
  
  try {
    const status = JSON.parse(result.stdout);
    const dnsName = status.Self?.DNSName?.replace(/\.$/, "");
    return {
      running: true,
      baseUrl: dnsName ? `https://${dnsName}` : undefined,
    };
  } catch {
    return { running: false };
  }
}

export function killProcess(pid: number): boolean {
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
