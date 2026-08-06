# 脚本继续润色与版本能力设计 QA

- Source visual truth: `/var/folders/2z/y_fszd8x3hd3lgcj2p196fjh0000gn/T/codex-clipboard-8dc7b2a0-19df-4b15-b8ea-d76b3ed1c43b.png`
- Implementation screenshot: `/private/tmp/script-polish-qa.png`
- Combined comparison: `/private/tmp/script-polish-comparison.png`
- Route: `http://localhost:4000/workspace?projectId=5&step=storyboard`
- Test account: `demo@ai-script.local`
- State: logged in, opened an existing script through “继续润色”, enabled annotation mode, opened version history.

## Requested outcomes

1. AI polish conversations are reconstructed from persisted script versions, so reopening the script does not lose prior modification instructions and summaries.
2. “批注修改” enables per-cell comments without changing the table structure; comments are summarized in the right panel and sent together as one modification request.
3. “历史版本” lists generated, AI-polished, manually saved, and restored versions. Any non-current version can be restored, and the restore action creates a new audit version.

## Visual comparison findings

- The original table and right-side AI workbench remain in their established dark green theme and existing layout.
- Requested controls are placed in the top action group next to “人工编辑” and “恢复原稿”, avoiding a new navigation pattern.
- Per-cell annotation affordances use compact comment icons at the cell corner, preventing the table content and row heights from being distorted.
- The history dialog uses the same modal, border, typography, and green status language as the surrounding workspace.
- No actionable clipping, overlap, contrast, or spacing issue remains in the tested desktop viewport.

## Functional verification

- Logged in with the supplied email/password and opened a real project script.
- Added a per-cell comment, verified its summary and persistence after reopening, then removed the test comment.
- Opened history and verified the current version metadata and disabled current-version restore state.
- `web/front-web`: `npm run build` passed.
- `server`: `mvn test` passed, 35 tests, 0 failures, 0 errors.
- Backend history reuses `ai_script_version`; no SQL migration is required.

final result: passed
