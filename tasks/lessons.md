# Lessons Learned

> Updated whenever a mistake is made or a better approach is discovered.
> Each lesson should prevent the same mistake from recurring.

## Project-Specific

_(none yet — will be populated as development progresses)_

## Known Lovable Migration Gotchas

1. **Migration SQL is fragile**: Lovable generates migrations without `IF NOT EXISTS`, causing failures on re-run. Always scan for and fix these.
2. **jsonb_set on null columns**: Lovable migrations use `jsonb_set` without null checks. Must wrap with `COALESCE(col, '{}'::jsonb)`.
3. **Enum mismatches**: Migration files sometimes reference enum values that don't exist in the enum definition. Must cross-reference.
4. **Return type changes**: `CREATE OR REPLACE FUNCTION` fails silently when return type changes. Need `DROP FUNCTION IF EXISTS ... CASCADE` before.
5. **RLS policies reference missing columns**: Some policies reference columns added in later migrations. Order matters.
