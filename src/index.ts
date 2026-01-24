#!/usr/bin/env bun
import { Command } from "commander";
import { create } from "./commands/create.js";
import { init } from "./commands/init.js";
import { start } from "./commands/start.js";
import { stop } from "./commands/stop.js";
import { list } from "./commands/list.js";
import { clean } from "./commands/clean.js";
import { seedExport, seedImport } from "./commands/seed.js";
import { configCmd } from "./commands/config.js";

const program = new Command();

program
  .name("zdev")
  .description("🐂 zdev - Multi-agent worktree development environment")
  .version("0.1.0");

// zdev create
program
  .command("create <name>")
  .description("Create a new TanStack Start project")
  .option("--convex", "Add Convex backend integration")
  .option("--flat", "Flat structure (no monorepo)")
  .action(async (name, options) => {
    await create(name, {
      convex: options.convex,
      flat: options.flat,
    });
  });

// zdev init
program
  .command("init [path]")
  .description("Initialize zdev for a project")
  .option("-s, --seed", "Create initial seed data from current Convex state")
  .action(async (path, options) => {
    await init(path, options);
  });

// zdev start
program
  .command("start <feature>")
  .description("Start working on a feature (creates worktree, starts servers)")
  .option("-p, --project <path>", "Project path (default: current directory)", ".")
  .option("--port <number>", "Frontend port (auto-allocated if not specified)", parseInt)
  .option("--local", "Local only - skip public URL setup via Traefik")
  .option("-s, --seed", "Import seed data into the new worktree")
  .option("-b, --base-branch <branch>", "Base branch to create from", "origin/main")
  .option("-w, --web-dir <dir>", "Subdirectory containing package.json (auto-detected if not specified)")
  .action(async (feature, options) => {
    await start(feature, options.project, {
      port: options.port,
      local: options.local,
      seed: options.seed,
      baseBranch: options.baseBranch,
      webDir: options.webDir,
    });
  });

// zdev stop
program
  .command("stop <feature>")
  .description("Stop servers for a feature")
  .option("-p, --project <path>", "Project path (to disambiguate features)")
  .option("-k, --keep", "Keep worktree, just stop servers")
  .action(async (feature, options) => {
    await stop(feature, options);
  });

// zdev list
program
  .command("list")
  .description("List active features and their status")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    await list(options);
  });

// zdev clean
program
  .command("clean <feature>")
  .description("Remove a feature worktree (use after PR is merged)")
  .option("-p, --project <path>", "Project path")
  .option("-f, --force", "Force remove even if git worktree fails")
  .action(async (feature, options) => {
    await clean(feature, options);
  });

// zdev seed
const seedCmd = program
  .command("seed")
  .description("Manage seed data for projects");

seedCmd
  .command("export [path]")
  .description("Export current Convex data as seed")
  .action(async (path) => {
    await seedExport(path);
  });

seedCmd
  .command("import [path]")
  .description("Import seed data into current worktree")
  .action(async (path) => {
    await seedImport(path);
  });

// zdev config
program
  .command("config")
  .description("View and manage zdev configuration")
  .option("-a, --add <pattern>", "Add a file pattern to auto-copy")
  .option("-r, --remove <pattern>", "Remove a file pattern")
  .option("-s, --set <key=value>", "Set a config value (devDomain, dockerHostIp, traefikConfigDir)")
  .option("-l, --list", "List current configuration")
  .action(async (options) => {
    await configCmd(options);
  });

// zdev status (alias for list)
program
  .command("status")
  .description("Show zdev status (alias for list)")
  .action(async () => {
    await list({});
  });

program.parse();
