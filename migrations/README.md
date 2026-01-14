# Database Migrations

## Quick Fix: Run All Staff Fixes

To fix the status mismatch issue and enable display_name feature:

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `run_all_staff_fixes.sql`
3. Paste and click "Run"
4. Check the results table at the end to verify all staff have correct status

This single migration will:
- ✅ Add invitation system columns (status, invited_at, invitation_token, invitation_expires_at)
- ✅ Add display_name column with auto-update trigger
- ✅ Sync old is_active column with new status column
- ✅ Fix invited staff who have created accounts (like camuccon2k3@gmail.com)

## Verification

After running, you should see:
- `camuccon2k3@gmail.com` with status='active' (not 'invited')
- All staff have display_name populated
- Status badges show correctly in UI

## Individual Migrations

If you prefer to run them separately, run in this order:
1. `add_staff_invitation_system.sql`
2. `add_display_name_to_staff.sql`
3. `sync_status_with_is_active.sql`
4. `fix_invited_staff_with_accounts.sql`
