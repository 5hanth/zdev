import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { patchViteConfig, patchViteAllowedHosts } from "./vite-patch.js";
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

// ═══════════════════════════════════════════════════════════════════
// allowedHosts
// ═══════════════════════════════════════════════════════════════════

describe("allowedHosts", () => {
  it("skips when devDomain is not provided", () => {
    writeConfig(`export default defineConfig({ plugins: [] })`);
    const result = patchViteConfig(configPath, { serverPort: 5173 });
    expect(result.actions).not.toContain(expect.stringContaining("allowedHosts"));
  });

  it("skips when domain already present", () => {
    writeConfig(`export default defineConfig({
  server: { allowedHosts: ["${DOMAIN_PATTERN}"] },
})`);
    const result = patchViteConfig(configPath, { devDomain: DEV_DOMAIN });
    expect(result.actions).toContain("allowedHosts: domain already present");
  });

  it("skips when allowedHosts is true", () => {
    writeConfig(`export default defineConfig({
  server: { allowedHosts: true },
})`);
    const result = patchViteConfig(configPath, { devDomain: DEV_DOMAIN });
    expect(result.actions).toContain("allowedHosts: already allows all (true)");
  });

  it('skips when allowedHosts is "all"', () => {
    writeConfig(`export default defineConfig({
  server: { allowedHosts: "all" },
})`);
    const result = patchViteConfig(configPath, { devDomain: DEV_DOMAIN });
    expect(result.actions).toContain('allowedHosts: already allows all ("all")');
  });

  it("injects server block into defineConfig", () => {
    writeConfig(`export default defineConfig({
  plugins: [],
})`);
    const result = patchViteConfig(configPath, { devDomain: DEV_DOMAIN });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
  });

  it("injects into variable-assigned defineConfig", () => {
    writeConfig(`const config = defineConfig({
  plugins: [],
})
export default config`);
    const result = patchViteConfig(configPath, { devDomain: DEV_DOMAIN });
    expect(result.patched).toBe(true);
    expect(readConfig()).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
  });

  it("injects into plain export default object", () => {
    writeConfig(`export default {
  plugins: [],
}`);
    const result = patchViteConfig(configPath, { devDomain: DEV_DOMAIN });
    expect(result.patched).toBe(true);
    expect(readConfig()).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
  });

  it("merges into existing server block", () => {
    writeConfig(`export default defineConfig({
  server: {
    host: "0.0.0.0",
  },
})`);
    const result = patchViteConfig(configPath, { devDomain: DEV_DOMAIN });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    expect(out).toContain(`host: "0.0.0.0"`);
  });

  it("appends to existing allowedHosts array", () => {
    writeConfig(`export default defineConfig({
  server: {
    allowedHosts: ["other.example.com"],
  },
})`);
    const result = patchViteConfig(configPath, { devDomain: DEV_DOMAIN });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain(`"${DOMAIN_PATTERN}"`);
    expect(out).toContain(`"other.example.com"`);
  });
});

// ═══════════════════════════════════════════════════════════════════
// server.port
// ═══════════════════════════════════════════════════════════════════

describe("server.port", () => {
  it("injects port into existing server block", () => {
    writeConfig(`export default defineConfig({
  server: {
    host: "0.0.0.0",
  },
})`);
    const result = patchViteConfig(configPath, { serverPort: 5188 });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain("port: 5188,");
    expect(out).toContain(`host: "0.0.0.0"`);
  });

  it("creates server block with port in defineConfig", () => {
    writeConfig(`export default defineConfig({
  plugins: [],
})`);
    const result = patchViteConfig(configPath, { serverPort: 5188 });
    expect(result.patched).toBe(true);
    expect(readConfig()).toContain("port: 5188,");
  });

  it("creates server block with port in plain export", () => {
    writeConfig(`export default {
  plugins: [],
}`);
    const result = patchViteConfig(configPath, { serverPort: 5188 });
    expect(result.patched).toBe(true);
    expect(readConfig()).toContain("port: 5188,");
  });

  it("replaces existing server.port", () => {
    writeConfig(`export default defineConfig({
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
})`);
    const result = patchViteConfig(configPath, { serverPort: 5188 });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain("port: 5188");
    expect(out).not.toContain("3000");
  });
});

// ═══════════════════════════════════════════════════════════════════
// devtools port
// ═══════════════════════════════════════════════════════════════════

describe("devtools port", () => {
  it("skips when no devtools call present", () => {
    writeConfig(`export default defineConfig({
  plugins: [react()],
})`);
    const result = patchViteConfig(configPath, { devtoolsPort: 42188 });
    expect(result.patched).toBe(false);
    expect(result.actions).toContain("devtools: not found, skipped");
  });

  it("injects eventBusConfig into devtools()", () => {
    writeConfig(`import { devtools } from '@tanstack/devtools-vite'
export default defineConfig({
  plugins: [
    devtools(),
    react(),
  ],
})`);
    const result = patchViteConfig(configPath, { devtoolsPort: 42188 });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain("devtools({ eventBusConfig: { port: 42188 } })");
    expect(out).not.toContain("devtools()");
  });

  it("updates existing eventBusConfig port", () => {
    writeConfig(`import { devtools } from '@tanstack/devtools-vite'
export default defineConfig({
  plugins: [
    devtools({ eventBusConfig: { port: 42070 } }),
    react(),
  ],
})`);
    const result = patchViteConfig(configPath, { devtoolsPort: 42188 });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain("port: 42188");
    expect(out).not.toContain("42070");
  });

  it("adds eventBusConfig to devtools with other args", () => {
    writeConfig(`import { devtools } from '@tanstack/devtools-vite'
export default defineConfig({
  plugins: [
    devtools({ logging: false }),
    react(),
  ],
})`);
    const result = patchViteConfig(configPath, { devtoolsPort: 42188 });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain("eventBusConfig: { port: 42188 }");
    expect(out).toContain("logging: false");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Combined patching (all three at once)
// ═══════════════════════════════════════════════════════════════════

describe("combined patching", () => {
  it("applies all three patches to clean-it style config", () => {
    writeConfig(`import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config`);
    const result = patchViteConfig(configPath, {
      devDomain: DEV_DOMAIN,
      serverPort: 5188,
      devtoolsPort: 42188,
    });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    expect(out).toContain("port: 5188,");
    expect(out).toContain("devtools({ eventBusConfig: { port: 42188 } })");
    expect(out).toContain("export default config");
    expect(result.actions.length).toBeGreaterThanOrEqual(3);
  });

  it("applies all three to nft-indexer-provisioner style (no devtools)", () => {
    writeConfig(`import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": "./src" },
  },
})`);
    const result = patchViteConfig(configPath, {
      devDomain: DEV_DOMAIN,
      serverPort: 5190,
      devtoolsPort: 42190,
    });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    expect(out).toContain("port: 5190,");
    expect(out).toContain("resolve:");
    // devtools not present — should skip
    expect(result.actions).toContain("devtools: not found, skipped");
  });

  it("handles nft-marketplace style (existing server + devtools port)", () => {
    writeConfig(`import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [
    devtools({ eventBusConfig: { port: 42070 } }),
    viteReact(),
  ],
})

export default config`);
    const result = patchViteConfig(configPath, {
      devDomain: DEV_DOMAIN,
      serverPort: 5192,
      devtoolsPort: 42192,
    });
    expect(result.patched).toBe(true);
    const out = readConfig();
    // allowedHosts: true → skip (already permissive)
    expect(result.actions).toContain("allowedHosts: already allows all (true)");
    // port injected
    expect(out).toContain("port: 5192,");
    // devtools port updated
    expect(out).toContain("port: 42192");
    expect(out).not.toContain("42070");
  });

  it("handles degen-safe style (extra options, no server block)", () => {
    writeConfig(`import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  plugins: [
    devtools(),
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
    const result = patchViteConfig(configPath, {
      devDomain: DEV_DOMAIN,
      serverPort: 5194,
      devtoolsPort: 42194,
    });
    expect(result.patched).toBe(true);
    const out = readConfig();
    expect(out).toContain(`allowedHosts: ["${DOMAIN_PATTERN}"]`);
    expect(out).toContain("port: 5194,");
    expect(out).toContain("devtools({ eventBusConfig: { port: 42194 } })");
    expect(out).toContain("optimizeDeps:");
    expect(out).toContain("ssr:");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════════════════════════

describe("edge cases", () => {
  it("returns error for non-existent file", () => {
    const result = patchViteConfig("/nonexistent/vite.config.ts", {
      devDomain: DEV_DOMAIN,
    });
    expect(result.patched).toBe(false);
    expect(result.actions).toContain("could not read vite config");
  });

  it("returns no changes for unrecognized format", () => {
    writeConfig(`// just a comment`);
    const result = patchViteConfig(configPath, { devDomain: DEV_DOMAIN, serverPort: 5188 });
    expect(result.patched).toBe(false);
  });

  it("is idempotent — second run makes no changes", () => {
    writeConfig(`export default defineConfig({
  plugins: [devtools()],
})`);
    const first = patchViteConfig(configPath, {
      devDomain: DEV_DOMAIN,
      serverPort: 5188,
      devtoolsPort: 42188,
    });
    expect(first.patched).toBe(true);
    const afterFirst = readConfig();

    const second = patchViteConfig(configPath, {
      devDomain: DEV_DOMAIN,
      serverPort: 5188,
      devtoolsPort: 42188,
    });
    expect(second.patched).toBe(false);
    expect(readConfig()).toBe(afterFirst);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Legacy wrapper
// ═══════════════════════════════════════════════════════════════════

describe("patchViteAllowedHosts (legacy)", () => {
  it("still works as before", () => {
    writeConfig(`export default defineConfig({ plugins: [] })`);
    const result = patchViteAllowedHosts(configPath, DEV_DOMAIN);
    expect(result.patched).toBe(true);
    expect(result.reason).toContain("allowedHosts");
  });
});
