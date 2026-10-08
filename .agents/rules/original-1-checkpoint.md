# ORIGINAL 1 Checkpoint Rule

Whenever the user says:
- "revert till original 1"
- "revert to original 1"
- "original 1"
- "original"

It refers strictly to the exact baseline state at Git Commit `9c9182f` (and Git Tag / Branch `original-1`).

### Baseline Commit Details:
- **Commit SHA**: `9c9182f`
- **Git Branch**: `original-1`
- **Git Tag**: `original-1`
- **Commit Message**: `fix: prevent project name and user names from appearing as machine folders or categories`
- **Timestamp**: Wed Oct 7 13:47:28 2026 +0530

When requested to revert to "original 1", reset the workspace strictly to this state:
```bash
git reset --hard original-1
git push -f origin main
```
No more updates, no less, exactly this baseline website.
