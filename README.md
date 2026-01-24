# 🐂 zdev

Multi-agent worktree development environment for cloud dev with preview URLs.

Built for [Clawdbot](https://docs.clawd.bot) users who want to run multiple AI coding agents on different features simultaneously.

## Features

- **Worktree Management** — Isolated git worktrees per feature
- **Port Allocation** — Automatic port assignment, no conflicts
- **Preview URLs** — Public HTTPS URLs via Traefik (optional)
- **Config Auto-Copy** — `.env.local` and other files copied automatically
- **Vite Support** — Auto-patches `allowedHosts` for external access
- **Multi-Agent Ready** — Multiple agents can work on different features

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
- [Convex](https://convex.dev) — `bunx convex login`

### Optional (for preview URLs)
- [Traefik](https://traefik.io) with file provider
- DNS wildcard record (`*.dev.yourdomain.com`)

See [Traefik Setup](#traefik-setup-for-preview-urls) below.

## Quick Start

```bash
# 1. Initialize your project
cd your-project
zdev init

# 2. Setup Convex (once per project)
cd web  # or wherever package.json is
bunx convex dev  # select project, then Ctrl+C

# 3. Start a feature
zdev start my-feature -p /path/to/project

# 4. Access your feature
# Local: http://localhost:5173
# Public: https://project-my-feature.dev.yourdomain.com (if Traefik configured)
```

## Commands

### `zdev start <feature>`
Create worktree and start dev servers.

```bash
zdev start auth -p ./my-project
zdev start auth -p ./my-project --no-funnel  # skip Traefik
zdev start auth -p ./my-project --port 3000  # specific port
```

### `zdev list`
Show active features and status.

### `zdev stop <feature>`
Stop dev servers (keeps worktree).

### `zdev clean <feature>`
Remove worktree completely (after PR merged).

### `zdev config`
View and manage configuration.

```bash
zdev config                              # view all
zdev config --set devDomain=dev.example.com
zdev config --set dockerHostIp=172.17.0.1
zdev config --add ".env.production"      # add copy pattern
zdev config --remove ".env.development"  # remove pattern
```

## Configuration

zdev stores config in `~/.zdev/config.json`:

| Setting | Default | Description |
|---------|---------|-------------|
| `devDomain` | `dev.web3citadel.com` | Domain for preview URLs |
| `dockerHostIp` | `172.17.0.1` | How Traefik reaches host services |
| `traefikConfigDir` | `/infra/traefik/dynamic` | Traefik dynamic config path |
| `copyPatterns` | `[".env.local", ...]` | Files auto-copied to worktrees |

## Directory Structure

```
~/.zdev/
├── config.json           # Global configuration
├── seeds/                # Project seed data (optional)
└── worktrees/
    ├── myapp-feature-a/  # Feature worktree
    └── myapp-feature-b/  # Another feature
```

## Local-Only Mode

Don't have Traefik? zdev works fine with just localhost:

```bash
zdev start my-feature -p ./project --no-funnel
# Access at http://localhost:PORT
```

## Traefik Setup (for Preview URLs)

If you want public preview URLs like `https://feature.dev.yourdomain.com`:

### 1. Add file provider to Traefik

```bash
# Traefik command flags
--providers.file.directory=/path/to/dynamic
--providers.file.watch=true

# Volume mount
-v /path/to/dynamic:/etc/traefik/dynamic:ro
```

### 2. Setup DNS

Add wildcard A record:
```
*.dev.yourdomain.com → your-server-ip
```

### 3. Configure zdev

```bash
zdev config --set devDomain=dev.yourdomain.com
zdev config --set traefikConfigDir=/path/to/dynamic
```

### Docker Host IP

zdev needs to tell Traefik how to reach your dev servers. Default is `172.17.0.1` (Docker's bridge gateway).

Check your setup:
```bash
# Standard Docker
ip -4 addr show docker0 | grep inet

# Custom network
docker network inspect your-network | grep Gateway
```

Update if needed:
```bash
zdev config --set dockerHostIp=172.19.0.1
```

## For Clawdbot Users

zdev is designed for [Clawdbot](https://docs.clawd.bot) cloud dev environments.

**Recommended setup:**
1. Follow [Clawdbot docs](https://docs.clawd.bot) to setup your gateway
2. Install Traefik with file provider (see above)
3. Configure DNS wildcard for your domain
4. Use zdev to manage multi-agent development

Each agent can work on a different feature with isolated worktrees and preview URLs.

## Vite Projects

zdev auto-patches `vite.config.ts` to add:
```typescript
server: {
  allowedHosts: true,
}
```

This is required for Traefik reverse proxy to work. The change is marked with `git update-index --skip-worktree` so it won't be committed.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Blocked host" in browser | Check vite.config has `allowedHosts: true` |
| 502 Bad Gateway | Check frontend is running: `zdev list` |
| Convex errors | Run `bunx convex dev` in worktree |
| Port conflicts | Use `--port` flag |
| Can't reach from Traefik | Check `dockerHostIp` config |

## License

MIT
