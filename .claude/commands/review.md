---
description: Review the current changes with the code reviewer and the security reviewer
allowed-tools: Read, Grep, Glob, Bash(git *), Agent
---

Review the current uncommitted changes (`git diff` and `git diff --staged`; if both are empty, review
the last commit).

Launch the `code-reviewer` and `security-reviewer` agents in parallel on the same change. If any
migration file changed, also launch `migration-reviewer`. Then merge the reports into one list ordered
by severity, with duplicates removed and each item as `file:line`, problem, fix. Do not edit files.
