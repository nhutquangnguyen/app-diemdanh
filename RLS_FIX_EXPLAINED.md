# 🔒 RLS Problem & Solution - Staff Account Linking

## 🔴 The Real Problem

You said you signed up **using the invitation link**, but the staff record still wasn't linked. Here's why:

### What Happened:

1. ✅ You clicked the invitation link
2. ✅ You signed up successfully
3. ✅ User account created: `4b19c79a-5288-4018-ac7e-04a148fb6206`
4. ❌ **The client-side code tried to update the staff table**
5. ❌ **RLS (Row Level Security) blocked the update silently**
6. ❌ Staff record remained unlinked:
   - `user_id: null`
   - `status: "invited"`
   - `invitation_token` still present

### Root Cause:

The signup code ran **client-side** with the user's session (anon key). RLS policies on the `staff` table blocked the update because:
- The new user doesn't "own" the staff record yet
- RLS policies only allow certain operations
- The error was caught and logged to console (not shown to user)

## ✅ The Solution

### Created Server-Side API Route with Service Role

**File: `/app/api/staff/link-account/route.ts`**

This API route:
- ✅ Runs **server-side**
- ✅ Uses **service role key** (bypasses RLS)
- ✅ Has permission to update staff records
- ✅ Works for all signup methods (email, Google OAuth, invitation links)

### How It Works:

```typescript
// Server-side with service role (bypasses RLS!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // <- This bypasses RLS
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Now we can update staff records
await supabaseAdmin
  .from('staff')
  .update({ user_id, status: 'active', ... })
  .eq('email', email);
```

## 📋 Steps to Fix

### Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard**
2. Navigate to **Project Settings** → **API**
3. Find the **`service_role` key** (it's marked as "secret")
4. Copy it

### Step 2: Add to Environment Variables

Add to `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```

⚠️ **IMPORTANT**: Never commit this to git! It's a secret key.

### Step 3: Fix Existing User (SQL)

Run this in **Supabase SQL Editor** to fix `camuccon2k3@gmail.com`:

```sql
UPDATE public.staff
SET
  user_id = '4b19c79a-5288-4018-ac7e-04a148fb6206',
  full_name = 'Vy2',
  status = 'active',
  invitation_token = NULL
WHERE
  email = 'camuccon2k3@gmail.com'
  AND user_id IS NULL;

-- Verify
SELECT email, display_name, status, user_id FROM public.staff
WHERE email = 'camuccon2k3@gmail.com';
```

### Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 5: Test New Signups

Try signing up a new user - the API route will now successfully link staff records!

## 🎯 What's Fixed

### Before (Broken):
```
User signs up → Client tries to update staff table → RLS blocks it → Staff record unlinked
```

### After (Fixed):
```
User signs up → Calls server API → Service role bypasses RLS → Staff record linked ✅
```

## 🧪 Testing

After deploying:

1. **Test existing user**: Run the SQL fix above
2. **Test new invitation signup**: Create new invite → Sign up → Should auto-link
3. **Test Google OAuth**: Sign up with Google → Should auto-link
4. **Test direct signup**: Sign up without invitation → Should still link if email matches

## 🚀 Deploy to Production

Don't forget to add `SUPABASE_SERVICE_ROLE_KEY` to:
- **Vercel Environment Variables** (for production)
- Keep it secret!

## 📝 Technical Details

### Files Changed:

1. **`/app/api/staff/link-account/route.ts`** (NEW)
   - Server-side API with service role permissions
   - Handles auto-linking for all signup methods

2. **`/app/auth/signup/page.tsx`** (UPDATED)
   - Calls the new API route instead of direct Supabase update
   - Works for both invitation and direct signups

3. **`/app/auth/callback/route.ts`** (UPDATED)
   - Calls the new API route for OAuth signups
   - Auto-links Google sign-ins

4. **`.env.local`** (UPDATED)
   - Added `SUPABASE_SERVICE_ROLE_KEY` placeholder

### Why Service Role Key is Safe:

- ✅ Only used **server-side** (never exposed to client)
- ✅ API routes run on Vercel Edge (secure)
- ✅ Not included in browser JavaScript bundle
- ✅ Protected by Next.js server environment

## 📞 Support

If issues persist:
1. Check server logs for API errors
2. Verify service role key is correct
3. Check Supabase RLS policies on `staff` table
4. Ensure dev server restarted after adding env variable
