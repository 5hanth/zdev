import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { patchViteAllowedHosts } from "./vite-patch.js";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const DEV_DOMAIN = "dev.web3citadel.com";
const DOMAIN_PATTERN = ".dev.web3citadel.com";

let tmpDir: string;
let configPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "vite-patch-test-"));
  configPath = join(tmpDir, "vite.config.ts");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeConfig(content: string): string {
  writeFileSync(configPath, content);
  return configPath;
}

function readConfig(): string {
  return readFileSync(configPath, "utf-8");
}

describe("patchViteAllowedHosts", () => {
  // ── Skip conditions ─────────────────────────────────────────────

  it("skips when devDomain is empty", () => {
    writeConfig(`export default defineConfig({ plugins: [] })`);
    const result = patchViteAllowedHosts(configPath, "");
    expect(result.patched).toBe(false);
    expect(result.reason).toBe("no devDomain configured");
  });

  it("skips when file cannot be read", () => {
    const result = patchViteAllowedHosts("/nonexistent/vite.config.ts", DEV_DOMAIN);
    expect(result.patched).toBe(false);
    expect(result.reason).toBe("could not read vite config");
  });

  it("skips when domain pattern already present", () => {
    writeConfig(`
export default defineConfig({
  server: {
    allowedHosts: ["${DOMAIN_PATTERN}"],
  },
  plugins: [],
})`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(false);
    expect(result.reason).toBe("domain already present");
  });

  it("skips when allowedHosts is true", () => {
    writeConfig(`
export default defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [],
})`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(false);
    expect(result.reason).toBe("already allows all hosts (true)");
  });

  it('skips when allowedHosts is "all"', () => {
    writeConfig(`
export default defineConfig({
  server: {
    allowedHosts: "all",
  },
  plugins: [],
})`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(false);
    expect(result.reason).toBe('already allows all hosts ("all")');
  });

  it("returns unrecognized for non-matching format", () => {
    writeConfig(`// just a comment, no config object`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(false);
    expect(result.reason).toBe("unrecognized config format");
  });

  // ── Inline defineConfig ─────────────────────────────────────────

  it("injects server block into inline defineConfig", () => {
    writeConfig(`import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
})`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(true);
    const output = readConfig();
    expect(output).toContain(`server: {`);
    expect(output).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    expect(output).toContain(`plugins: [react()]`);
  });

  // ── Variable-assigned defineConfig ──────────────────────────────

  it("injects server block into variable-assigned defineConfig", () => {
    writeConfig(`import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  plugins: [
    viteReact(),
  ],
})

export default config`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(true);
    const output = readConfig();
    expect(output).toContain(`server: {`);
    expect(output).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    expect(output).toContain(`export default config`);
  });

  // ── Plain export default { } ────────────────────────────────────

  it("injects server block into plain export default object", () => {
    writeConfig(`export default {
  plugins: [],
}`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(true);
    const output = readConfig();
    expect(output).toContain(`server: {`);
    expect(output).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
  });

  // ── Existing server block, no allowedHosts ──────────────────────

  it("merges allowedHosts into existing server block", () => {
    writeConfig(`export default defineConfig({
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  plugins: [],
})`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(true);
    const output = readConfig();
    expect(output).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    expect(output).toContain(`port: 3000`);
    expect(output).toContain(`host: "0.0.0.0"`);
  });

  // ── Existing allowedHosts array, different domain ───────────────

  it("appends domain to existing allowedHosts array", () => {
    writeConfig(`export default defineConfig({
  server: {
    allowedHosts: ["other.example.com"],
  },
  plugins: [],
})`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(true);
    const output = readConfig();
    expect(output).toContain(`"${DOMAIN_PATTERN}"`);
    expect(output).toContain(`"other.example.com"`);
  });

  // ── Real-world configs from Workstellar repos ───────────────────

  it("patches nft-indexer-provisioner style config", () => {
    writeConfig(`import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { resolve } from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
})`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(true);
    const output = readConfig();
    expect(output).toContain(`server: {`);
    expect(output).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    // Preserve existing content
    expect(output).toContain(`plugins: [react(), tailwindcss()]`);
    expect(output).toContain(`resolve:`);
  });

  it("patches clean-it-platform style config (variable assignment)", () => {
    writeConfig(`import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(true);
    const output = readConfig();
    expect(output).toContain(`server: {`);
    expect(output).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    expect(output).toContain(`export default config`);
  });

  it("skips nft-marketplace style config (already has allowedHosts: true)", () => {
    writeConfig(`import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [
    viteReact(),
  ],
})

export default config`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(false);
    expect(result.reason).toBe("already allows all hosts (true)");
  });

  it("patches degen-safe style config (variable, no server block, extra options)", () => {
    writeConfig(`import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  plugins: [
    viteReact(),
  ],
  optimizeDeps: {
    include: ['@raydium-io/raydium-sdk-v2'],
  },
  ssr: {
    external: ['lodash'],
  },
})

export default config`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(true);
    const output = readConfig();
    expect(output).toContain(`server: {`);
    expect(output).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    expect(output).toContain(`optimizeDeps:`);
    expect(output).toContain(`ssr:`);
  });
});
