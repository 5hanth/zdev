import { readFileSync, writeFileSync } from "fs";

export interface PatchResult {
  patched: boolean;
  actions: string[];
}

export interface PatchViteConfigOptions {
  /** Domain for server.allowedHosts (e.g. "dev.web3citadel.com" → [".dev.web3citadel.com"]) */
  devDomain?: string;
  /** Port to inject as server.port */
  serverPort?: number;
  /** Port for TanStack devtools eventBusConfig (avoids EADDRINUSE on 42069) */
  devtoolsPort?: number;
}

/**
 * Patch a Vite config file for zdev worktree use.
 *
 * Handles:
 *   - server.allowedHosts: inject dot-prefix wildcard for devDomain
 *   - server.port: inject allocated port so TanStack/Nitro picks it up
 *   - devtools(): inject unique eventBusConfig.port to avoid conflicts
 *
 * Config patterns supported:
 *   - `export default defineConfig({ ... })`
 *   - `const config = defineConfig({ ... })`
 *   - `export default { ... }`
 *   - Existing `server:` block — merges into it
 */
export function patchViteConfig(
  viteConfigPath: string,
  options: PatchViteConfigOptions
): PatchResult {
  const actions: string[] = [];

  let content: string;
  try {
    content = readFileSync(viteConfigPath, "utf-8");
  } catch {
    return { patched: false, actions: ["could not read vite config"] };
  }

  const original = content;

  // ── 1. server.allowedHosts ──────────────────────────────────────
  if (options.devDomain) {
    content = patchAllowedHosts(content, options.devDomain, actions);
  }

  // ── 2. server.port ──────────────────────────────────────────────
  if (options.serverPort) {
    content = patchServerPort(content, options.serverPort, actions);
  }

  // ── 3. devtools eventBusConfig.port ─────────────────────────────
  if (options.devtoolsPort) {
    content = patchDevtoolsPort(content, options.devtoolsPort, actions);
  }

  // Write only if something changed
  if (content === original) {
    return { patched: false, actions: actions.length ? actions : ["no changes needed"] };
  }

  try {
    writeFileSync(viteConfigPath, content);
  } catch {
    return { patched: false, actions: ["could not write vite config"] };
  }

  return { patched: true, actions };
}

// ── allowedHosts ────────────────────────────────────────────────────

function patchAllowedHosts(content: string, devDomain: string, actions: string[]): string {
  const domainPattern = `.${devDomain}`;

  // Skip if domain already present
  if (content.includes(domainPattern)) {
    actions.push("allowedHosts: domain already present");
    return content;
  }

  // Skip if already permissive
  if (/allowedHosts\s*:\s*true/.test(content)) {
    actions.push("allowedHosts: already allows all (true)");
    return content;
  }
  if (/allowedHosts\s*:\s*["']all["']/.test(content)) {
    actions.push('allowedHosts: already allows all ("all")');
    return content;
  }

  const entry = `"${domainPattern}"`;

  // Append to existing array
  if (/allowedHosts\s*:\s*\[/.test(content)) {
    content = content.replace(/(allowedHosts\s*:\s*\[)/, `$1${entry}, `);
    actions.push("allowedHosts: appended domain");
    return content;
  }

  // Add to existing server block
  if (/server\s*:\s*\{/.test(content)) {
    content = content.replace(
      /(server\s*:\s*\{)/,
      `$1\n    allowedHosts: [${entry}],`
    );
    actions.push("allowedHosts: added to server block");
    return content;
  }

  // No server block — will be created by ensureServerBlock below or by port patch
  // Defer to after server block exists
  content = ensureServerBlock(content);
  if (/server\s*:\s*\{/.test(content)) {
    content = content.replace(
      /(server\s*:\s*\{)/,
      `$1\n    allowedHosts: [${entry}],`
    );
    actions.push("allowedHosts: created server block");
  } else {
    actions.push("allowedHosts: unrecognized config format");
  }

  return content;
}

// ── server.port ─────────────────────────────────────────────────────

function patchServerPort(content: string, port: number, actions: string[]): string {
  // Replace existing server.port
  if (/server\s*:\s*\{[^}]*\bport\s*:/.test(content)) {
    content = content.replace(
      /(server\s*:\s*\{[^}]*\bport\s*:\s*)\d+/,
      `$1${port}`
    );
    actions.push(`server.port: replaced with ${port}`);
    return content;
  }

  // Add port to existing server block
  if (/server\s*:\s*\{/.test(content)) {
    content = content.replace(
      /(server\s*:\s*\{)/,
      `$1\n    port: ${port},`
    );
    actions.push(`server.port: injected ${port}`);
    return content;
  }

  // No server block — create one
  content = ensureServerBlock(content);
  if (/server\s*:\s*\{/.test(content)) {
    content = content.replace(
      /(server\s*:\s*\{)/,
      `$1\n    port: ${port},`
    );
    actions.push(`server.port: created server block with port ${port}`);
  } else {
    actions.push("server.port: unrecognized config format");
  }

  return content;
}

// ── devtools port ───────────────────────────────────────────────────

function patchDevtoolsPort(content: string, port: number, actions: string[]): string {
  // No devtools import/call — skip
  if (!content.includes("devtools")) {
    actions.push("devtools: not found, skipped");
    return content;
  }

  // Already has eventBusConfig with a port — replace the port number
  if (/devtools\s*\([^)]*eventBusConfig\s*:\s*\{[^}]*port\s*:/.test(content)) {
    content = content.replace(
      /(devtools\s*\([^)]*eventBusConfig\s*:\s*\{[^}]*port\s*:\s*)\d+/,
      `$1${port}`
    );
    actions.push(`devtools: updated eventBusConfig.port to ${port}`);
    return content;
  }

  // devtools() with empty args — inject full config
  if (/devtools\s*\(\s*\)/.test(content)) {
    content = content.replace(
      /devtools\s*\(\s*\)/,
      `devtools({ eventBusConfig: { port: ${port} } })`
    );
    actions.push(`devtools: injected eventBusConfig.port ${port}`);
    return content;
  }

  // devtools({ ... }) with args but no eventBusConfig — add it
  if (/devtools\s*\(\s*\{/.test(content)) {
    content = content.replace(
      /(devtools\s*\(\s*\{)/,
      `$1 eventBusConfig: { port: ${port} },`
    );
    actions.push(`devtools: added eventBusConfig.port ${port}`);
    return content;
  }

  actions.push("devtools: unrecognized call pattern");
  return content;
}

// ── helpers ─────────────────────────────────────────────────────────

/**
 * Ensure a `server: {}` block exists in the config.
 * Tries defineConfig({ then export default {.
 */
function ensureServerBlock(content: string): string {
  if (/server\s*:\s*\{/.test(content)) {
    return content; // already exists
  }

  if (/defineConfig\s*\(\s*\{/.test(content)) {
    return content.replace(
      /(defineConfig\s*\(\s*\{)/,
      `$1\n  server: {\n  },`
    );
  }

  if (/export\s+default\s*\{/.test(content)) {
    return content.replace(
      /(export\s+default\s*\{)/,
      `$1\n  server: {\n  },`
    );
  }

  return content;
}

// ── Legacy wrapper (backward compat) ────────────────────────────────

/** @deprecated Use patchViteConfig instead */
export function patchViteAllowedHosts(
  viteConfigPath: string,
  devDomain: string
): { patched: boolean; reason: string } {
  const result = patchViteConfig(viteConfigPath, { devDomain });
  return {
    patched: result.patched,
    reason: result.actions.join("; "),
  };
}
