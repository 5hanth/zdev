import { existsSync, readFileSync } from "fs";
import { resolve, basename } from "path";
import { run, isGitRepo, getRepoName } from "../utils.js";
import { loadConfig, type WorktreeAllocation } from "../config.js";

export interface PrOptions {
  title?: string;
  body?: string;
  draft?: boolean;
  web?: boolean;
}

export async function pr(
  featureName: string | undefined,
  projectPath: string = ".",
  options: PrOptions = {}
): Promise<void> {
  const fullPath = resolve(projectPath);

  // Check if we're in a worktree or need to find one
  let worktreePath = fullPath;
  let allocation: WorktreeAllocation | undefined;
  let projectName = getRepoName(fullPath) || basename(fullPath);

  const config = loadConfig();

  // If featureName provided, find the allocation
  if (featureName) {
    const allocKey = `${projectName}-${featureName}`;
    allocation = config.allocations[allocKey];

    if (!allocation) {
      // Try to find by just feature name
      const found = Object.entries(config.allocations).find(
        ([key, alloc]) => key.endsWith(`-${featureName}`)
      );
      if (found) {
        allocation = found[1];
        projectName = allocation.project;
      }
    }

    if (allocation) {
      worktreePath = allocation.worktreePath || resolve(config.worktreesDir, `${projectName}-${featureName}`);
    }
  } else {
    // Try to detect from current directory
    const cwd = process.cwd();
    const found = Object.entries(config.allocations).find(
      ([_, alloc]) => alloc.worktreePath === cwd || cwd.startsWith(alloc.worktreePath || "")
    );
    if (found) {
      allocation = found[1];
      featureName = found[0].split("-").slice(1).join("-");
      projectName = allocation.project;
      worktreePath = allocation.worktreePath || cwd;
    }
  }

  if (!isGitRepo(worktreePath)) {
    console.error(`❌ Not a git repository: ${worktreePath}`);
    process.exit(1);
  }

  // Get current branch
  const branchResult = run("git", ["branch", "--show-current"], { cwd: worktreePath });
  if (!branchResult.success || !branchResult.stdout.trim()) {
    console.error("❌ Could not determine current branch");
    process.exit(1);
  }
  const branch = branchResult.stdout.trim();

  console.log(`🐂 Creating PR for: ${branch}`);
  if (allocation) {
    console.log(`   Project: ${projectName}`);
    console.log(`   Feature: ${featureName}`);
  }

  // Check if gh CLI is available
  const ghCheck = run("which", ["gh"]);
  if (!ghCheck.success) {
    console.error("❌ GitHub CLI (gh) not found. Install: https://cli.github.com");
    process.exit(1);
  }

  // Check if authenticated
  const authCheck = run("gh", ["auth", "status"], { cwd: worktreePath });
  if (!authCheck.success) {
    console.error("❌ Not authenticated with GitHub. Run: gh auth login");
    process.exit(1);
  }

  // Push branch if not pushed
  console.log(`\n📤 Pushing branch...`);
  const pushResult = run("git", ["push", "-u", "origin", branch], { cwd: worktreePath });
  if (!pushResult.success) {
    // Check if it's just "already up to date"
    if (!pushResult.stderr.includes("Everything up-to-date")) {
      console.error(`   Failed to push: ${pushResult.stderr}`);
      process.exit(1);
    }
    console.log(`   Already up to date`);
  } else {
    console.log(`   Pushed to origin/${branch}`);
  }

  // Build PR title
  let title = options.title;
  if (!title) {
    // Generate from feature name or branch
    const featureForTitle = featureName || branch.replace(/^feature\//, "");
    title = featureForTitle
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Build PR body
  let body = options.body || "";
  
  // Add preview URL if we have allocation
  if (allocation && allocation.publicUrl) {
    const previewSection = `## Preview\n🔗 ${allocation.publicUrl}\n\n`;
    body = previewSection + body;
  } else if (config.devDomain && featureName && projectName) {
    // Try to construct preview URL
    const previewUrl = `https://${projectName}-${featureName}.${config.devDomain}`;
    const previewSection = `## Preview\n🔗 ${previewUrl}\n\n`;
    body = previewSection + body;
  }

  // Add footer
  if (!body.includes("Created with zdev")) {
    body = body.trim() + "\n\n---\n*Created with [zdev](https://github.com/5hanth/zdev)*";
  }

  // Check if PR already exists
  const existingPr = run("gh", ["pr", "view", branch, "--json", "url"], { cwd: worktreePath });
  if (existingPr.success) {
    try {
      const prData = JSON.parse(existingPr.stdout);
      console.log(`\n✅ PR already exists!`);
      console.log(`\n🔗 ${prData.url}`);
      return;
    } catch {
      // Continue to create
    }
  }

  // Create PR
  console.log(`\n📝 Creating pull request...`);
  
  const prArgs = ["pr", "create", "--title", title, "--body", body];
  
  if (options.draft) {
    prArgs.push("--draft");
  }
  
  if (options.web) {
    prArgs.push("--web");
    const webResult = run("gh", prArgs, { cwd: worktreePath });
    if (!webResult.success) {
      console.error(`   Failed: ${webResult.stderr}`);
      process.exit(1);
    }
    console.log(`   Opened in browser`);
    return;
  }

  const prResult = run("gh", prArgs, { cwd: worktreePath });
  
  if (!prResult.success) {
    // Check if it's because PR already exists
    if (prResult.stderr.includes("already exists")) {
      console.log(`   PR already exists for this branch`);
      const viewResult = run("gh", ["pr", "view", "--json", "url"], { cwd: worktreePath });
      if (viewResult.success) {
        try {
          const prData = JSON.parse(viewResult.stdout);
          console.log(`\n🔗 ${prData.url}`);
        } catch {
          // Ignore
        }
      }
      return;
    }
    console.error(`   Failed: ${prResult.stderr}`);
    process.exit(1);
  }

  // Extract PR URL from output
  const prUrl = prResult.stdout.trim();
  
  console.log(`\n✅ Pull request created!`);
  console.log(`\n🔗 ${prUrl}`);

  // Show preview URL again for easy access
  if (allocation?.publicUrl) {
    console.log(`\n📱 Preview: ${allocation.publicUrl}`);
  }
}
