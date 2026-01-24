import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

export const ZEBU_HOME = join(homedir(), ".zdev");
export const CONFIG_PATH = join(ZEBU_HOME, "config.json");
export const WORKTREES_DIR = join(ZEBU_HOME, "worktrees");
export const SEEDS_DIR = join(ZEBU_HOME, "seeds");

export interface WorktreeAllocation {
  project: string;
  projectPath: string;
  branch: string;
  webDir: string;  // Subdirectory containing package.json
  frontendPort: number;
  convexPort: number;
  funnelPath: string;
  pids: {
    frontend?: number;
    convex?: number;
  };
  started: string;
}

export interface zdevConfig {
  nextFrontendPort: number;
  nextConvexPort: number;
  // File patterns to auto-copy from main project to worktree
  copyPatterns: string[];
  // Docker host IP - how Traefik reaches host services
  // Default 172.17.0.1 works for standard Docker on Linux
  dockerHostIp: string;
  // Dev domain for public URLs (e.g., "dev.example.com")
  devDomain: string;
  // Traefik dynamic config directory
  traefikConfigDir: string;
  allocations: Record<string, WorktreeAllocation>;
}

const DEFAULT_CONFIG: zdevConfig = {
  nextFrontendPort: 5173,
  nextConvexPort: 3210,
  copyPatterns: [
    ".env.local",
    ".env.development",
    ".env.development.local",
  ],
  dockerHostIp: "172.17.0.1",
  devDomain: "dev.web3citadel.com",
  traefikConfigDir: "/infra/traefik/dynamic",
  allocations: {},
};

export function ensurezdevDirs(): void {
  if (!existsSync(ZEBU_HOME)) {
    mkdirSync(ZEBU_HOME, { recursive: true });
  }
  if (!existsSync(WORKTREES_DIR)) {
    mkdirSync(WORKTREES_DIR, { recursive: true });
  }
  if (!existsSync(SEEDS_DIR)) {
    mkdirSync(SEEDS_DIR, { recursive: true });
  }
}

export function loadConfig(): zdevConfig {
  ensurezdevDirs();
  
  if (!existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  
  try {
    const data = readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: zdevConfig): void {
  ensurezdevDirs();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function allocatePorts(config: zdevConfig): { frontend: number; convex: number } {
  const frontend = config.nextFrontendPort;
  const convex = config.nextConvexPort;
  
  config.nextFrontendPort = frontend + 1;
  config.nextConvexPort = convex + 1;
  
  return { frontend, convex };
}

export function getWorktreePath(name: string): string {
  return join(WORKTREES_DIR, name);
}

export function getSeedPath(projectName: string): string {
  return join(SEEDS_DIR, `${projectName}.zip`);
}
