import { readFileSync, writeFileSync } from "fs";

export interface PatchResult {
  patched: boolean;
  reason: string;
}

/**
 * Patch a Vite config file to include `server.allowedHosts` with the given devDomain.
 *
 * Handles these real-world patterns:
 *   1. `export default defineConfig({ ... })`
 *   2. `const config = defineConfig({ ... }); export default config`
 *   3. `export default { ... }` (plain object, no defineConfig)
 *   4. Existing `server:` block — merges allowedHosts into it
 *   5. Existing `allowedHosts` array — appends domain if missing
 *
 * Skip conditions:
 *   - File already contains the domain pattern string
 *   - `allowedHosts` is set to `true` or `"all"` (already permissive)
 *   - devDomain is empty
 */
export function patchViteAllowedHosts(
  viteConfigPath: string,
  devDomain: string
): PatchResult {
  if (!devDomain) {
    return { patched: false, reason: "no devDomain configured" };
  }

  let content: string;
  try {
    content = readFileSync(viteConfigPath, "utf-8");
  } catch {
    return { patched: false, reason: "could not read vite config" };
  }

  const domainPattern = `.${devDomain}`;

  // Skip if domain pattern already present in the file
  if (content.includes(domainPattern)) {
    return { patched: false, reason: "domain already present" };
  }

  // Skip if allowedHosts is already set to a permissive value
  if (/allowedHosts\s*:\s*true/.test(content)) {
    return { patched: false, reason: "already allows all hosts (true)" };
  }
  if (/allowedHosts\s*:\s*["']all["']/.test(content)) {
    return { patched: false, reason: 'already allows all hosts ("all")' };
  }

  const entry = `"${domainPattern}"`;
  let patched = false;

  // Case 1: Existing allowedHosts array — append our domain
  if (/allowedHosts\s*:\s*\[/.test(content)) {
    content = content.replace(
      /(allowedHosts\s*:\s*\[)/,
      `$1${entry}, `
    );
    patched = true;
  }
  // Case 2: Existing server block without allowedHosts — inject allowedHosts
  else if (/server\s*:\s*\{/.test(content)) {
    content = content.replace(
      /(server\s*:\s*\{)/,
      `$1\n    allowedHosts: [${entry}],`
    );
    patched = true;
  }
  // Case 3: defineConfig({ — add server block
  else if (/defineConfig\s*\(\s*\{/.test(content)) {
    content = content.replace(
      /(defineConfig\s*\(\s*\{)/,
      `$1\n  server: {\n    allowedHosts: [${entry}],\n  },`
    );
    patched = true;
  }
  // Case 4: export default { — add server block
  else if (/export\s+default\s*\{/.test(content)) {
    content = content.replace(
      /(export\s+default\s*\{)/,
      `$1\n  server: {\n    allowedHosts: [${entry}],\n  },`
    );
    patched = true;
  }

  if (!patched) {
    return { patched: false, reason: "unrecognized config format" };
  }

  try {
    writeFileSync(viteConfigPath, content);
  } catch {
    return { patched: false, reason: "could not write vite config" };
  }

  return { patched: true, reason: "added allowedHosts" };
}
