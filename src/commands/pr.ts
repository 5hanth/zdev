import { existsSync, readFileSync } from "fs";
import { resolve, basename } from "path";
import { run, isGitRepo, getRepoName } from "../utils.js";
import { loadConfig, type WorktreeAllocation } from "../config.js";

export interface PrOptions {
  title?: string;
  body?: string;
  draft?: boolean;
  web?: boolean;
  ai?: boolean;  // Use AI (Claude) to generate title/body
}

/**
 * Use Claude to generate PR title and description from diff
 */
function generateWithAI(diff: string, commits: string[], worktreePath: string): { title: string; body: string } | null {
  // Check if claude CLI is available
  const claudeCheck = run("which", ["claude"]);
  if (!claudeCheck.success) {
    return null;
  }

  const prompt = `You are generating a GitHub PR title and description.

Based on the following git diff and commit messages, generate:
1. A concise PR title (max 72 chars, no quotes)
2. A brief description of the changes (2-4 bullet points)

Commit messages:
${commits.map(c => `- ${c}`).join("\n")}

Diff summary (first 3000 chars):
${diff.slice(0, 3000)}

Respond in this exact format:
TITLE: <your title here>
BODY:
- <bullet point 1>
- <bullet point 2>
- <bullet point 3>`;

  const result = run("claude", ["-p", prompt, "--no-input"], { 
    cwd: worktreePath,
    env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: "zdev" }
  });

  if (!result.success || !result.stdout) {
    return null;
  }

  const output = result.stdout.trim();
  const titleMatch = output.match(/TITLE:\s*(.+)/);
  const bodyMatch = output.match(/BODY:\s*([\s\S]+)/);

  if (!titleMatch) {
    return null;
  }

  return {
    title: titleMatch[1].trim().replace(/^["']|["']$/g, ""),
    body: bodyMatch ? bodyMatch[1].trim() : "",
  };
}

/**
 * Generate a smart PR title based on changed files and commits
 */
function generateSmartTitle(files: string[], commits: string[], featureName: string): string {
  const components = new Set<string>();
  const areas = new Set<string>();
  
  for (const file of files) {
    if (!file.match(/\.(tsx?|jsx?|css|scss)$/)) continue;
    
    const componentMatch = file.match(/components\/([^/]+)\/([^/]+)\.(tsx?|jsx?)$/);
    if (componentMatch) {
      components.add(componentMatch[2].replace(/\.(tsx?|jsx?)$/, ""));
      continue;
    }
    
    const singleComponent = file.match(/components\/([^/]+)\.(tsx?|jsx?)$/);
    if (singleComponent) {
      components.add(singleComponent[1]);
      continue;
    }
    
    const routeMatch = file.match(/routes\/(.+)\.(tsx?|jsx?)$/);
    if (routeMatch) {
      const routeName = routeMatch[1].replace(/[[\]$_.]/g, " ").trim();
      if (routeName && routeName !== "index") {
        areas.add(routeName);
      }
      continue;
    }
    
    const pathParts = file.split("/");
    if (pathParts.length > 1) {
      const folder = pathParts[pathParts.length - 2];
      if (!["src", "web", "app", "lib", "utils"].includes(folder)) {
        areas.add(folder);
      }
    }
  }
  
  const items = [...components, ...areas].slice(0, 3);
  
  if (items.length > 0) {
    let action = "Update";
    const commitText = commits.join(" ").toLowerCase();
    if (commitText.includes("fix")) action = "Fix";
    else if (commitText.includes("add") || commitText.includes("new")) action = "Add";
    else if (commitText.includes("refactor")) action = "Refactor";
    else if (commitText.includes("improve") || commitText.includes("enhance")) action = "Improve";
    else if (commitText.includes("mobile") || commitText.includes("responsive")) action = "Improve";
    
    return `${action} ${items.join(", ")}`;
  }
  
  if (commits.length > 0 && commits[0].length < 72) {
    return commits[0];
  }
  
  return featureName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function pr(
  featureName: string | undefined,
  projectPath: string = ".",
  options: PrOptions = {}
): Promise<void> {
  const fullPath = resolve(projectPath);

  let worktreePath = fullPath;
  let allocation: WorktreeAllocation | undefined;
  let projectName = getRepoName(fullPath) || basename(fullPath);

  const config = loadConfig();

  // Find allocation if featureName provided
  if (featureName) {
    const allocKey = `${projectName}-${featureName}`;
    allocation = config.allocations[allocKey];

    if (!allocation) {
      const found = Object.entries(config.allocations).find(
        ([key]) => key.endsWith(`-${featureName}`)
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
    // Detect from current directory
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

  // Check gh CLI
  const ghCheck = run("which", ["gh"]);
  if (!ghCheck.success) {
    console.error("❌ GitHub CLI (gh) not found. Install: https://cli.github.com");
    process.exit(1);
  }

  const authCheck = run("gh", ["auth", "status"], { cwd: worktreePath });
  if (!authCheck.success) {
    console.error("❌ Not authenticated with GitHub. Run: gh auth login");
    process.exit(1);
  }

  // Push branch
  console.log(`\n📤 Pushing branch...`);
  const pushResult = run("git", ["push", "-u", "origin", branch], { cwd: worktreePath });
  if (!pushResult.success && !pushResult.stderr.includes("Everything up-to-date")) {
    console.error(`   Failed to push: ${pushResult.stderr}`);
    process.exit(1);
  }
  console.log(`   Pushed to origin/${branch}`);

  // Get base branch
  const defaultBranch = run("git", ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"], { cwd: worktreePath });
  const baseBranch = defaultBranch.success ? defaultBranch.stdout.trim().replace("origin/", "") : "main";

  // Get commits and diff info
  const commitsResult = run("git", ["log", `origin/${baseBranch}..HEAD`, "--pretty=format:%s"], { cwd: worktreePath });
  const commits = commitsResult.success ? commitsResult.stdout.trim().split("\n").filter(Boolean) : [];

  const diffResult = run("git", ["diff", `origin/${baseBranch}..HEAD`], { cwd: worktreePath });
  const diff = diffResult.success ? diffResult.stdout : "";

  const diffStatResult = run("git", ["diff", `origin/${baseBranch}..HEAD`, "--shortstat"], { cwd: worktreePath });
  const diffStat = diffStatResult.success ? diffStatResult.stdout.trim() : "";

  const changedFilesResult = run("git", ["diff", `origin/${baseBranch}..HEAD`, "--name-only"], { cwd: worktreePath });
  const changedFiles = changedFilesResult.success ? changedFilesResult.stdout.trim().split("\n").filter(Boolean) : [];

  // Generate title and body
  let title = options.title;
  let aiBody = "";

  // Try AI generation if --ai flag or no title provided
  if (options.ai || (!title && diff.length > 0)) {
    console.log(`\n🤖 Generating PR content with AI...`);
    const aiResult = generateWithAI(diff, commits, worktreePath);
    if (aiResult) {
      if (!title) title = aiResult.title;
      aiBody = aiResult.body;
      console.log(`   Generated title: ${title}`);
    } else if (options.ai) {
      console.log(`   AI generation failed, using smart fallback`);
    }
  }

  // Fallback to smart title
  if (!title) {
    title = generateSmartTitle(changedFiles, commits, featureName || branch.replace(/^feature\//, ""));
  }

  // Build PR body
  let body = options.body || "";
  
  // Add preview URL
  if (allocation?.publicUrl) {
    body += `## Preview\n🔗 ${allocation.publicUrl}\n\n`;
  } else if (config.devDomain && featureName && projectName) {
    const previewUrl = `https://${projectName}-${featureName}.${config.devDomain}`;
    body += `## Preview\n🔗 ${previewUrl}\n\n`;
  }

  // Add AI-generated body or commits
  if (aiBody) {
    body += `## Changes\n${aiBody}\n\n`;
  } else if (commits.length > 0) {
    body += `## Changes\n`;
    commits.forEach((commit) => {
      body += `- ${commit}\n`;
    });
    body += "\n";
  }

  // Add stats
  if (diffStat) {
    body += `## Summary\n\`\`\`\n${diffStat}\n\`\`\`\n\n`;
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
  console.log(`   Title: ${title}`);
  
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
    if (prResult.stderr.includes("already exists")) {
      console.log(`   PR already exists for this branch`);
      const viewResult = run("gh", ["pr", "view", "--json", "url"], { cwd: worktreePath });
      if (viewResult.success) {
        try {
          const prData = JSON.parse(viewResult.stdout);
          console.log(`\n🔗 ${prData.url}`);
        } catch {}
      }
      return;
    }
    console.error(`   Failed: ${prResult.stderr}`);
    process.exit(1);
  }

  const prUrl = prResult.stdout.trim();
  
  console.log(`\n✅ Pull request created!`);
  console.log(`\n🔗 ${prUrl}`);

  if (allocation?.publicUrl) {
    console.log(`\n📱 Preview: ${allocation.publicUrl}`);
  }
}
