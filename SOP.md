# zdev SOP

Standard Operating Procedure for `zdev` - Multi-agent worktree development.

## Overview

zdev manages isolated development environments for Convex + Vite projects:
- Each feature gets its own git worktree
- Separate port allocations (no conflicts)
- Optional public preview URLs via Traefik
- Automatic config file copying (.env.local, etc.)

## Requirements

- **Convex** backend (uses `convex dev`, `convex export/import`)
- **Vite-based** frontend (TanStack Start, plain Vite, etc.)
- **Bun** runtime
- **Git** repository

## Commands Reference

### Initialize Project
```bash
zdev init [path]
  -s, --seed    Create initial seed snapshot
```

### Start Feature
```bash
zdev start <feature> [options]
  -p, --project <path>      Project path (default: .)
  --port <number>           Specific frontend port
  --local                   Skip public URL setup
  -s, --seed                Import seed data
  -b, --base-branch <ref>   Base branch (default: origin/main)
  -w, --web-dir <dir>       Web subdirectory (auto-detected)
```

### Stop Feature
```bash
zdev stop <feature> [options]
  -p, --project <path>      Project path
  -k, --keep                Keep worktree, just stop servers
```

### List Features
```bash
zdev list
  --json    Output as JSON
```

### Clean Feature
```bash
zdev clean <feature> [options]
  -p, --project <path>      Project path
  -f, --force               Force remove
```

### Seed Data
```bash
zdev seed export [path]     Export current Convex state
zdev seed import [path]     Import seed into current worktree
```

### Configuration
```bash
zdev config [options]
  -l, --list               Show current config
  -s, --set <key=value>    Set config value
  -a, --add <pattern>      Add file pattern to copy
  -r, --remove <pattern>   Remove file pattern
```

## Config Options

| Key | Default | Description |
|-----|---------|-------------|
| `devDomain` | (empty) | Domain for preview URLs |
| `dockerHostIp` | `172.17.0.1` | Docker host IP for Traefik |
| `traefikConfigDir` | `/infra/traefik/dynamic` | Traefik file provider path |
| `copyPatterns` | `.env.local`, etc. | Files to auto-copy |

## Typical Workflow

```bash
# 1. Setup project (one-time)
cd my-convex-project
zdev init --seed

# 2. Start feature
zdev start add-auth -p .

# 3. Work on feature
cd ~/.zdev/worktrees/project-add-auth
# ... make changes, commit, push ...

# 4. Stop when done for the day
zdev stop add-auth -p /path/to/project

# 5. Clean up after PR merged
zdev clean add-auth -p /path/to/project
```

## Multi-Agent Usage

Multiple agents can work simultaneously:

```bash
# Agent A
zdev start feature-auth -p ./project
# Gets port 5173, https://project-feature-auth.dev.example.com

# Agent B  
zdev start feature-billing -p ./project
# Gets port 5174, https://project-feature-billing.dev.example.com

# Check status
zdev list
```

## Troubleshooting

### Port conflict
```bash
zdev config --list  # Check nextFrontendPort
# Manually specify port:
zdev start feature --port 5200
```

### Worktree already exists
```bash
zdev clean feature -p ./project --force
```

### No public URL
```bash
# Check config
zdev config --list

# Set domain
zdev config --set devDomain=dev.example.com
zdev config --set traefikConfigDir=/etc/traefik/dynamic
```
