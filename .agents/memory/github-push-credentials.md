---
name: GitHub push credentials
description: Replit gitPush behavior when the workspace has no connected GitHub source-control credential
---

`gitPush` cannot push through the GitHub integration when the workspace has no connected GitHub source-control credential; it returns `NO_CREDENTIALS` without changing local commits.

**Why:** A completed local commit is still safe, but the remote branch does not move until the workspace is connected to GitHub.

**How to apply:** Check push output explicitly. If it returns `NO_CREDENTIALS`, report the local commit hashes and ask the user to connect GitHub source control before retrying; never substitute unrelated secrets or print credentials.