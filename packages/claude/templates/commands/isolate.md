# Isolated Development Agent (Orchestrator)

Creates an isolated development environment using a fixed worker slot. Each worker owns dedicated resources (worktree, ports) that it can aggressively manage.

## Usage

```
/isolate <worker-number> <feature-description>
```

Examples:
```
/isolate 1 Add a "mark all as read" button to notifications
/isolate 2 Fix the profile image upload bug
/isolate 3 Add dark mode toggle to settings
/isolate 4 Refactor authentication flow
```

---

## CRITICAL: Orchestrator Pattern

**YOU ARE AN ORCHESTRATOR, NOT A DOER.**

Your ONLY jobs are:
1. Clean up and prepare your worker's resources
2. Spawn sub-agents to do actual work
3. Monitor sub-agent results
4. Log activity when done
5. NEVER let sub-agents give up - if they fail, fix the issue and spawn again

**PROTECT YOUR CONTEXT** - Never do file reading, code writing, or exploration yourself. Spawn sub-agents for everything.

---

## Worker Resource Assignments

Each worker has FIXED, DEDICATED resources. You OWN these - clean them up aggressively.

Worker resources are defined by convention:

| Worker | Worktree | Port Base |
|--------|----------|-----------|
| 1 | `../<app>-worktrees/worker-1` | 3001, 19001 |
| 2 | `../<app>-worktrees/worker-2` | 3002, 19002 |
| 3 | `../<app>-worktrees/worker-3` | 3003, 19003 |
| 4 | `../<app>-worktrees/worker-4` | 3004, 19004 |

---

## Phase 1: Clean Up & Prepare Resources

You OWN your worker's resources. Clean them up without hesitation.

### 1.1 Kill Any Processes on Your Ports

```bash
# Kill anything on your ports
lsof -ti :$PORT_1 | xargs kill -9 2>/dev/null || true
lsof -ti :$PORT_2 | xargs kill -9 2>/dev/null || true
```

### 1.2 Sync and Reset Your Worktree

```bash
cd $WORKTREE_PATH

# Discard any uncommitted changes
git checkout -- .
git clean -fd

# Fetch latest main
git fetch origin main

# Reset branch to latest main
git checkout worker-$N-branch 2>/dev/null || git checkout -b worker-$N-branch
git reset --hard origin/main

# Verify we're synced
git log -1 --oneline origin/main
git log -1 --oneline HEAD
# These should show the same commit

# Ensure dependencies are up to date
pnpm install
```

### 1.3 Log Start of Work

Update `.claude/workspace-resources.md` with a START entry:

```
[TIMESTAMP] WORKER-$N START: "<feature description>"
```

### 1.4 Create Feature Branch

```bash
cd $WORKTREE_PATH

# Create a feature branch from current position
FEATURE_SLUG=$(echo "<feature>" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-50)
git checkout -b "feature/$FEATURE_SLUG"
```

---

## Phase 2: Development (SUB-AGENT)

**Spawn a sub-agent** for development work:

```
Task tool with subagent_type="general-purpose":

"You are developing a feature in an isolated worktree.

## Context
- Worktree: $WORKTREE_PATH
- Feature: <feature description>

## Instructions
1. cd to the worktree: cd $WORKTREE_PATH
2. Search the codebase to understand existing patterns
3. Plan your implementation
4. Write tests first (if applicable)
5. Implement the feature
6. Run type checks: pnpm typecheck
7. Run tests: pnpm test
8. Commit frequently with atomic commits

## Commit Format
git commit -m '<type>: <description>

Co-Authored-By: Claude <noreply@anthropic.com>'

## Report Back
When done, report:
- Files modified
- Number of commits
- Test results
- Any issues or concerns
"
```

**On sub-agent completion:**
- If successful: proceed to Phase 3
- If failed with fixable issue: spawn another sub-agent to fix it
- If blocked: investigate why, fix it yourself (briefly), then re-spawn

---

## Phase 3: Testing (SUB-AGENT)

### 3.1 Start Development Servers

```bash
cd $WORKTREE_PATH

# Start dev servers
pnpm dev &

# Wait and verify
sleep 30
curl -sf "http://localhost:$PORT_1/" > /dev/null && echo "Server OK" || echo "Server not ready"
```

### 3.2 Spawn Testing Sub-agent

**Spawn a sub-agent** for UI testing:

```
Task tool with subagent_type="general-purpose":

"You are testing a feature.

## Context
- Feature: <feature description>
- Expected behavior: <what should happen>
- App URL: http://localhost:$PORT_1

## Instructions
1. Use available testing tools (Playwright for web, iOS Simulator MCP for mobile)
2. Navigate to the relevant screen
3. Test the new feature thoroughly
4. Check for:
   - Feature works as expected
   - No crashes or errors
   - UI looks correct
   - Edge cases handled

## IMPORTANT
- You MUST complete testing. Do not say 'cannot test because X'
- If something is broken, report WHAT is broken and HOW to fix it
- Take screenshots as evidence

## Report Back
- Test results (PASS/FAIL for each test case)
- Screenshots taken
- Issues found (with specific details)
- Suggested fixes if any issues found
"
```

**On sub-agent completion:**
- If tests pass: proceed to Phase 4
- If tests fail with issues: spawn a dev sub-agent to fix, then re-test
- If sub-agent says "can't test": DO NOT ACCEPT THIS. Ask WHY and fix the blocker

### 3.3 Cleanup Servers

After testing completes:

```bash
# Kill the dev process
kill $DEV_PID 2>/dev/null || true

# Force kill anything on your ports (safety cleanup)
lsof -ti :$PORT_1 | xargs kill -9 2>/dev/null || true
lsof -ti :$PORT_2 | xargs kill -9 2>/dev/null || true
```

---

## Phase 4: Create PR (SUB-AGENT)

**Spawn a sub-agent** for PR creation:

```
Task tool with subagent_type="general-purpose":

"You are creating a PR for a completed feature.

## Context
- Worktree: $WORKTREE_PATH
- Feature: <feature description>

## Instructions
1. cd to worktree: cd $WORKTREE_PATH
2. Ensure all changes committed: git status
3. Run final tests: pnpm test
4. Push branch: git push -u origin HEAD
5. Create PR against main:

gh pr create --base main --title '<feature title>' --body '## Summary
<bullet points>

## Test Plan
- [ ] Test steps

## Screenshots
<if UI changes>

Generated with [Claude Code](https://claude.com/claude-code)'

## Report Back
- PR number
- PR URL
- Any issues
"
```

---

## Phase 5: Review Cycle

After PR is created, invoke the review-cycle skill:

```
Use the Skill tool: /review-cycle <PR_NUMBER>
```

This handles:
- Waiting for bot reviews
- Fixing issues
- Iterating until approved

---

## Phase 6: Log Completion

### 6.1 Update Activity Log

Update `.claude/workspace-resources.md` with an END entry:

```
[TIMESTAMP] WORKER-$N END: "<feature description>" - PR #<number>
```

### 6.2 Final Report

```markdown
## Worker $N Development Complete

**Feature:** <description>
**PR:** #<number> (<url>)
**Branch:** <branch-name>

### Resources Used
- Worktree: $WORKTREE_PATH
- Ports: $PORT_1, $PORT_2

### Development Summary
- Sub-agents spawned: X
- Files modified: Y
- Commits: Z

### Testing Summary
- Test result: PASS/FAIL

### Review Status
- PR created: Yes
- Review cycle started: Yes

### Next Steps
1. Monitor PR for review completion
2. Merge to main when approved
```

---

## Error Recovery

### Sub-agent Says "Can't Do X"

**NEVER ACCEPT THIS.** Instead:
1. Ask the sub-agent WHY it can't do X
2. Identify the blocker
3. Fix the blocker yourself (minimal work)
4. Spawn a new sub-agent with updated instructions

### Server Won't Start

```bash
# You own these ports - kill everything
lsof -ti :$PORT_1 | xargs kill -9
lsof -ti :$PORT_2 | xargs kill -9

# Also check for node zombies
pkill -f "node.*$WORKTREE_PATH" 2>/dev/null || true
```

### Worktree Issues

```bash
# You own this worktree - force reset
cd $WORKTREE_PATH
git checkout -- .
git clean -fd
git fetch origin main
git reset --hard origin/main
pnpm install
```

---

## Safety Rules

1. **You OWN your resources** - Kill/reset without hesitation
2. **NEVER do dev work yourself** - Spawn sub-agents
3. **NEVER accept "can't test"** - Fix blockers and retry
4. **ALWAYS log activity** - Start and end entries
5. **ALWAYS base PRs on main** - Single protected branch
6. **COMMIT frequently in sub-agents** - Atomic commits
7. **KILL servers after testing** - Clean up your ports
