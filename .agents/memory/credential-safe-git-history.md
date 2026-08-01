---
name: Credential-safe Git history
description: Protects GitHub-connected projects from accidentally committing uploaded Firebase service-account credentials.
---

Uploaded Firebase service-account files can be detected by GitHub push protection even when they are not used by the frontend. Remove them from the full branch history before pushing; do not use an unblock link for private credentials.

**Why:** A local commit that added an uploaded service-account file caused the entire push to be rejected, including unrelated UI and authentication fixes.

**How to apply:** Keep service-account JSON/text files outside tracked project files and use the environment secrets flow for server-side credentials.