# 🐂 zdev

Multi-agent worktree development environment for **Convex + Vite/TanStack** projects.

Built for [Clawdbot](https://docs.clawd.bot) users who want to run multiple AI coding agents on different features simultaneously.

> ⚠️ **Currently requires:** Convex backend + Vite-based frontend (TanStack Start, plain Vite, etc.)

## Features

- **Worktree Management** — Isolated git worktrees per feature
- **Port Allocation** — Automatic port assignment, no conflicts
- **Preview URLs** — Public HTTPS URLs via Traefik (optional)
- **Config Auto-Copy** — `.env.local` and other files copied automatically
- **Vite Support** — Auto-patches `allowedHosts` for external access
- **Convex Integration** — Runs `convex dev` per worktree with isolated state
- **Seed Data** — Export/import database state between worktrees

## Installation

```bash
# Run directly
bunx zdev

# Or install globally
bun add -g zdev
```

## Prerequisites

### Required
- [Bun](https://bun.sh) — `curl -fsSL https://bun.sh/install | bash`
- [Convex](https://convex.dev) account — `bunx convex login`
- Git repository with Convex + Vite project

### Optional (for public preview URLs)
- [Traefik](https://traefik.io) reverse proxy with file provider
- DNS wildcard record (`*.dev.yourdomain.com`)

See [Traefik Setup](#traefik-setup-for-preview-urls) below.

## Quick Start

```bash
# 1. Initialize your project
cd your-convex-project
zdev init

# 2. Setup Convex (once per project, if not already done)
cd web  # or wherever package.json is
bunx convex dev  # select project, then Ctrl+C

# 3. Start a feature
zdev start my-feature -p /path/to/project

# 4. Work on it
cd ~/.zdev/worktrees/project-my-feature

# 5. Stop when done
zdev stop my-feature -p /path/to/project
```

## Commands

### `zdev init [path]`
Initialize zdev for a project. Creates seed data from current Convex state.

```bash
zdev init                    # Current directory
zdev init ./my-project       # Specific path
zdev init -s                 # Also create seed snapshot
```

### `zdev start <feature>`
Start working on a feature. Creates worktree, installs deps, starts servers.

```bash
zdev start auth -p ./my-project
zdev start auth -p ./my-project --local      # Skip public URL
zdev start auth -p ./my-project --port 3000  # Specific port
zdev start auth -p ./my-project --seed       # Import seed data
zdev start auth --base-branch origin/develop # Different base
```

### `zdev stop <feature>`
Stop servers for a feature.

```bash
zdev stop auth -p ./my-project
zdev stop auth --keep        # Keep worktree, just stop servers
```

### `zdev list`
List all active features and their status.

```bash
zdev list
zdev list --json
```

### `zdev clean <feature>`
Remove a feature worktree completely (use after PR merged).

```bash
zdev clean auth -p ./my-project
zdev clean auth --force      # Force even if git fails
```

### `zdev seed export/import`
Manage database seed data.

```bash
zdev seed export             # Export current Convex state
zdev seed import             # Import into current worktree
```

### `zdev config`
View and manage configuration.

```bash
zdev config --list
zdev config --set devDomain=dev.example.com
zdev config --set traefikConfigDir=/etc/traefik/dynamic
zdev config --add .env.production
zdev config --remove .env.production
```

## Configuration

Config stored at `~/.zdev/config.json`:

| Key | Default | Description |
|-----|---------|-------------|
| `devDomain` | (empty) | Domain for preview URLs (e.g., `dev.example.com`) |
| `dockerHostIp` | `172.17.0.1` | How Traefik (in Docker) reaches host services |
| `traefikConfigDir` | `/infra/traefik/dynamic` | Directory where Traefik watches for route configs (see below) |
| `copyPatterns` | `.env.local`, etc. | Files to auto-copy to worktrees |

## Traefik Setup for Preview URLs

> **What's a "dynamic config directory"?**
> 
> Traefik can be configured to watch a folder for `.yml` files. Each file defines a route (e.g., "requests to `auth.dev.example.com` go to port 5173"). When you add/remove files, Traefik automatically updates its routing — no restart needed.
> 
> zdev uses this to create/remove routes on-the-fly as you start/stop features.

To get public HTTPS URLs for each feature:

### 1. DNS Wildcard
Add a wildcard A record pointing to your server:
```
*.dev.example.com → your-server-ip
```

### 2. Traefik with File Provider
Configure Traefik to watch a dynamic config directory:

```yaml
# traefik.yml
providers:
  file:
    directory: /etc/traefik/dynamic  # zdev writes route files here
    watch: true

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: you@example.com
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web
```

### 3. Configure zdev
```bash
zdev config --set devDomain=dev.example.com
zdev config --set traefikConfigDir=/etc/traefik/dynamic
zdev config --set dockerHostIp=172.17.0.1  # or host.docker.internal on Mac
```

### How It Works
When you run `zdev start my-feature`, it creates a file like `/etc/traefik/dynamic/project-my-feature.yml`:

```yaml
http:
  routers:
    project-my-feature:
      rule: "Host(`project-my-feature.dev.example.com`)"
      service: project-my-feature
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    project-my-feature:
      loadBalancer:
        servers:
          - url: "http://172.17.0.1:5173"  # Host port from Docker's perspective
```

Traefik watches the directory and automatically picks up the new route.

## Multi-Agent Workflow

1. **Agent A** works on auth: `zdev start auth -p ./project`
2. **Agent B** works on billing: `zdev start billing -p ./project`
3. Each gets isolated worktree + ports + preview URL
4. No conflicts, parallel development

## Directory Structure

```
~/.zdev/
├── config.json           # Global config
├── worktrees/            # All worktrees live here
│   ├── project-auth/
│   └── project-billing/
└── seeds/                # Seed data snapshots
    └── project.zip
```

## License

[WTFPL](LICENSE)
