# Zebu Development SOP

Standard Operating Procedure for multi-agent parallel feature development.

## First-Time Setup (once per machine)

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Login to Convex
bunx convex login
```

## Vite Project Configuration

For public URLs to work, your Vite projects need `allowedHosts: true`:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    allowedHosts: true,  // Required for Traefik reverse proxy
  },
  // ... plugins, etc.
})
```

**Why?** Vite blocks requests from unknown hosts by default. When accessing via `https://feature.dev.yourdomain.com`, Vite sees a different host than `localhost` and blocks it.

Zebu attempts to auto-patch this, but adding it to your project template ensures it works out of the box.

## Stack
- **Runtime:** Bun
- **Framework:** TanStack + Effect
- **Backend:** Convex
- **Package Manager:** bun

## Quick Start

```bash
# Install zebu globally (or use bunx zebu)
bun add -g zebu

# Initialize a project
cd your-project
zebu init

# Start a feature
zebu start my-feature -p ./your-project

# List active features
zebu list

# Stop a feature
zebu stop my-feature

# Clean up after PR merge
zebu clean my-feature
```

## Directory Structure

```
~/.zebu/
├── config.json              # Global config (ports, allocations)
├── seeds/
│   └── {project}.zip        # Seed data per project
└── worktrees/
    └── {project}-{feature}/ # Feature worktrees

{project}/
└── .zebu/
    └── project.json         # Project-specific config
```

## Workflow

### 1. Initialize Project (once per project)

```bash
cd /path/to/your-project
zebu init
zebu init --seed  # Also export current data as seed
```

### 2. Start Feature Work

```bash
zebu start feature-name -p /path/to/project

# Options:
#   --seed         Import seed data into worktree
#   --no-funnel    Skip Tailscale Funnel setup
#   --port 5173    Use specific port
#   --web-dir web  Specify subdirectory with package.json
```

This will:
1. Create worktree at `~/.zebu/worktrees/{project}-{feature}/`
2. Run `bun install` (auto-detects web/, frontend/, etc.)
3. Start `bunx convex dev` (background)
4. Start `bun dev --port XXXX` (background)
5. Setup Tailscale Funnel (unless --no-funnel)

### 3. Access Your Feature

- **Local:** http://localhost:{port}
- **Funnel:** https://{machine}.ts.net/{project}-{feature}

### 4. Stop Feature (keep worktree)

```bash
zebu stop feature-name
zebu stop feature-name --keep  # Keep worktree, just stop servers
```

### 5. Clean Up (after PR merge)

```bash
zebu clean feature-name
zebu clean feature-name --force  # Force remove even if dirty
```

## Seed Data Management

```bash
# Export current Convex data as seed
zebu seed export -p /path/to/project

# Import seed into worktree
cd ~/.zebu/worktrees/project-feature
zebu seed import
```

Seeds are stored at `~/.zebu/seeds/{project}.zip`

## Port Allocation

Zebu auto-allocates ports:
- Frontend: 5173, 5174, 5175, ...
- Convex: 3210, 3211, 3212, ...

## Multi-Agent Coordination

### Before Starting Work

1. Run `zebu list` to see active features
2. Avoid working on same files as another agent
3. If ports conflict, specify with `--port`

### Naming Conventions

- Worktree: `{project}-{feature}`
- Branch: `feature/{feature}`

### Project Detection

Zebu auto-detects web directories in this order:
1. `web/`
2. `frontend/`
3. `app/`
4. `client/`
5. `packages/web/`
6. `apps/web/`
7. Root `package.json`

Override with `--web-dir`.

## Tailscale Funnel

Funnel URLs are public — anyone with the link can access.
Funnel does NOT count against your Tailscale user/device quota.

```bash
# Skip funnel for local-only dev
zebu start feature --no-funnel
```

## Troubleshooting

### Convex auth issues
```bash
bunx convex login
```

### Port in use
```bash
zebu start feature --port 5200
```

### Worktree stuck
```bash
zebu clean feature --force
```

### Check process status
```bash
zebu list --json
```

---

*Last updated: 2026-01-24*
