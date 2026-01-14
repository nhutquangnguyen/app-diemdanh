# Staff Linking Fix - Auto-Link Staff Records to User Accounts

## Problem

When staff members sign up **without using the invitation link**, their staff record doesn't get linked to their user account, resulting in:
- ❌ `user_id: null` in staff table
- ❌ `status: "invited"` instead of `"active"`
- ❌ User can't access stores they were invited to

Example: `camuccon2k3@gmail.com`
- User exists: UID `4b19c79a-5288-4018-ac7e-04a148fb6206`
- Staff record exists but NOT linked (user_id is null)

## Root Cause

The old signup flow only linked staff records when users signed up **with an invitation token** in the URL. When users:
1. Received an invitation email
2. But signed up directly at `/auth/signup` (without clicking the email link)
3. The auto-linking code never ran

## Solution Implemented

### ✅ 1. Enhanced Signup Flow (`app/auth/signup/page.tsx`)
Now **always checks** for matching staff records by email, regardless of invitation token:

```typescript
// Auto-link any staff records with matching email
if (data.user) {
  const { data: staffRecords } = await supabase
    .from('staff')
    .select('*, stores(name)')
    .eq('email', formData.email)
    .is('user_id', null); // Only unlinked records

  if (staffRecords && staffRecords.length > 0) {
    // Update ALL matching staff records
    await supabase
      .from('staff')
      .update({
        user_id: data.user.id,
        full_name: formData.fullName,
        status: 'active',
        invitation_token: null,
      })
      .eq('email', formData.email)
      .is('user_id', null);
  }
}
```

### ✅ 2. Enhanced OAuth Callback (`app/auth/callback/route.ts`)
Auto-links staff records when users sign in with Google:

```typescript
// Auto-link any staff records with matching email (for Google OAuth users)
if (sessionData?.user) {
  const userEmail = sessionData.user.email;

  const { data: staffRecords } = await supabase
    .from('staff')
    .select('id')
    .eq('email', userEmail)
    .is('user_id', null);

  if (staffRecords && staffRecords.length > 0) {
    await supabase
      .from('staff')
      .update({
        user_id: sessionData.user.id,
        full_name: userName || null,
        status: 'active',
        invitation_token: null,
      })
      .eq('email', userEmail)
      .is('user_id', null);
  }
}
```

## Immediate Fix for Existing Data

### Fix for camuccon2k3@gmail.com:

Run this SQL in Supabase SQL Editor:

```sql
-- Fix the specific user
UPDATE public.staff
SET
  user_id = '4b19c79a-5288-4018-ac7e-04a148fb6206',
  full_name = 'Vy2',
  status = 'active',
  invitation_token = NULL
WHERE
  email = 'camuccon2k3@gmail.com'
  AND user_id IS NULL;
```

### Fix ALL Unlinked Staff Records:

This query automatically links ALL staff records that have matching user accounts:

```sql
-- Find and link all staff records where user exists but not linked
UPDATE public.staff s
SET
  user_id = u.id,
  full_name = COALESCE(s.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  status = 'active',
  invitation_token = NULL
FROM auth.users u
WHERE
  s.email = u.email
  AND s.user_id IS NULL
  AND u.deleted_at IS NULL;

-- Check results
SELECT
  email,
  display_name,
  status,
  user_id,
  user_id IS NOT NULL as is_linked
FROM public.staff
WHERE email IN (SELECT email FROM auth.users WHERE deleted_at IS NULL)
ORDER BY created_at DESC;
```

## Testing

After applying the fixes:

1. ✅ Existing unlinked users: Run SQL query above to fix
2. ✅ New email signups: Auto-link works automatically
3. ✅ New Google OAuth signups: Auto-link works automatically
4. ✅ Invitation link signups: Still works as before

## Benefits

- 🎯 Users can sign up any way they want (direct, Google, invitation link)
- 🔗 Staff records automatically link regardless of signup method
- 🚀 No manual intervention needed for future signups
- ✅ Backwards compatible with existing invitation flow
