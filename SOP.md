# zdev Agent Workflow

How to use zdev when working on features. This is your operational guide.

## Before Starting Any Feature

```bash
# Check what's already running
zdev list
```

If your feature already exists, just `cd` to the worktree path shown.

## Starting a New Feature

```bash
# Start feature with public URL
zdev start <feature-name> -p /path/to/project

# Start without public URL (local only)
zdev start <feature-name> -p /path/to/project --local

# Start with seed data
zdev start <feature-name> -p /path/to/project --seed
```

After starting:
1. Note the worktree path (e.g., `~/.zdev/worktrees/project-feature`)
2. Note the local URL (e.g., `http://localhost:5173`)
3. Note the public URL if available (e.g., `https://project-feature.dev.example.com`)
4. `cd` to the worktree path to begin work

## While Working

You're in an isolated git worktree with its own:
- Branch (`feature/<name>`)
- Node modules
- Convex dev instance
- Port allocation

Work normally. Commit often. Push when ready for review.

```bash
git add .
git commit -m "description"
git push -u origin feature/<name>
```

## Stopping Work (End of Session)

```bash
# Stop servers but keep worktree (resume later)
zdev stop <feature-name> -p /path/to/project --keep

# Or just leave it running if you'll be back soon
```

## Resuming Work

```bash
# Check status
zdev list

# If stopped, restart
zdev start <feature-name> -p /path/to/project

# If already running, just cd to the worktree
cd ~/.zdev/worktrees/project-feature
```

## After PR is Merged

```bash
# Clean up completely
zdev clean <feature-name> -p /path/to/project
```

This removes:
- The worktree
- The Traefik route
- The port allocation

## Quick Reference

| Task | Command |
|------|---------|
| See what's running | `zdev list` |
| Start feature | `zdev start NAME -p PATH` |
| Stop (keep files) | `zdev stop NAME -p PATH --keep` |
| Stop (full) | `zdev stop NAME -p PATH` |
| Remove after merge | `zdev clean NAME -p PATH` |

## Troubleshooting

**"Feature already exists"** → It's already running. Use `zdev list` to find the worktree path.

**Port conflict** → Specify a port: `zdev start NAME --port 5200`

**No public URL** → Either use `--local` or configure Traefik (see README).

**Convex not working** → Make sure you've run `bunx convex dev` once in the main project to select a Convex project.
