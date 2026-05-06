# 2026-05-07 Responsive Table Columns

## Context

- Request: apply the 품목관리 page behavior, where lower-priority table columns disappear as the layout narrows, to every table page.
- Existing baseline: `items-page__table` already has page-specific responsive column hiding.
- New shared policy lives at the end of `src/styles/main.css`.

## Current Implementation

- `.page-table` now uses `container-type: inline-size` with `container-name: atlas-page-table`.
- Shared grid-table policy excludes `.items-page__table` so the original 품목관리 tuning remains intact.
- For `.page-table__row > span`, middle/later columns are hidden progressively:
  - container <= 1240px: hide columns 8-11 except final column
  - container <= 1040px: hide columns 5-7 except final column
  - container <= 760px: keep first two columns and final column
- Native `<table>` elements get a viewport-based fallback with the same general rule.

## Verification

- `npm run build` passed.

## Follow-Up Notes

- If a page has a table where the final column is not action/status, add a page-specific override or explicit priority classes.
- If a table uses scoped CSS with hard `min-width`, the shared CSS uses `!important` where needed, but a heavily custom table may still need targeted tuning.
