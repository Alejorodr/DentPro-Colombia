param(
  [Parameter(Mandatory=$true)]
  [string]$TaskFile,

  [Parameter(Mandatory=$true)]
  [string]$OutputFile
)

$ErrorActionPreference = "Stop"

$prompt = @"
You are an external code reviewer.

Read this task brief:
$TaskFile

Review the current repository and current git diff.

Rules:
- Do not modify files.
- Do not run destructive commands.
- Focus only on the task brief.
- Return a concise report.

Output format:
STATUS: APPROVED | CHANGES_REQUIRED | BLOCKED

CRITICAL:
- ...

IMPORTANT:
- ...

MINOR:
- ...

MISSING_TESTS:
- ...

FILES_REVIEWED:
- ...

FINAL_VERDICT:
One paragraph maximum.
"@

codex exec --sandbox read-only --output-last-message "$OutputFile" $prompt