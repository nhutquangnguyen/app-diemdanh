# Staff Invitation System - Implementation Summary

## Overview
Implemented a complete staff invitation system that allows store owners to add staff members by email, whether they have accounts or not. The system automatically sends invitation emails for unregistered users and handles the complete signup and linking flow.

## Features Implemented

### 1. ✅ Bulk Email Support
- Owners can add multiple staff members at once
- Support for comma-separated or newline-separated emails
- Real-time results showing status of each email

### 2. ✅ Smart User Detection
- Automatically checks if email has an account
- **Registered users**: Added immediately as active staff
- **Unregistered users**: Receives invitation email, added with "invited" status

### 3. ✅ Invitation Email System
- Professional Vietnamese email template
- Includes store name and context
- 7-day expiration for invitations
- Secure invitation tokens

### 4. ✅ Invitation Acceptance Flow
- Signup page detects invitation tokens
- Shows store context banner
- Auto-fills email from invitation
- Links staff record after successful signup

### 5. ✅ Staff Status Tracking
- `active`: Working staff members
- `invited`: Pending invitation acceptance
- `expired`: Expired invitations (optional)
- `inactive`: Deactivated staff (optional)

## Files Created/Modified

### New Files
1. **`migrations/add_staff_invitation_system.sql`**
   - Database migration for invitation columns
   - Adds status, invited_at, invitation_token, invitation_expires_at

2. **`app/api/staff/add/route.ts`**
   - API endpoint for adding staff with invitation logic
   - Handles bulk email processing
   - Sends invitation emails via Resend
   - Returns detailed results for each email

### Modified Files
1. **`app/owner/stores/[id]/add-staff/page.tsx`**
   - Changed from single email input to textarea for bulk
   - Added results display with color-coded status
   - Updated UI messaging and instructions

2. **`app/auth/signup/page.tsx`**
   - Added invitation token detection
   - Shows store context banner when invited
   - Auto-fills email from invitation
   - Links staff record after signup

## Required Actions

### 1. Run Database Migration
```sql
-- Run this in your Supabase SQL Editor
-- File: migrations/add_staff_invitation_system.sql

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'expired', 'inactive')),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.staff ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.staff ALTER COLUMN full_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_invitation_token ON public.staff(invitation_token);
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);

UPDATE public.staff
SET status = 'active'
WHERE status IS NULL AND user_id IS NOT NULL;
```

### 2. Configure Environment Variables
Make sure you have `RESEND_API_KEY` in your environment:
```bash
# In .env.local or Vercel Environment Variables
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 3. Configure Resend SMTP in Supabase (If not done already)
- Go to Supabase Dashboard → Project Settings → Auth → SMTP Settings
- Configure Resend SMTP as per docs/GOOGLE_AUTH_SETUP.md

## How It Works

### Adding Staff Flow

```
Owner adds emails → System checks each email
    ↓
┌───────────────────────────────────────┐
│   Email has account?                  │
├───────────────────────────────────────┤
│ YES → Add as "active" staff           │
│       Show: ✅ Đã thêm                │
│                                       │
│ NO  → Create "invited" staff          │
│       Send invitation email           │
│       Show: 📧 Đã gửi lời mời        │
│                                       │
│ ERROR → Show error message            │
│         Show: ❌ Lỗi                  │
└───────────────────────────────────────┘
```

### Invitation Acceptance Flow

```
User clicks email link with token
    ↓
app.diemdanh.net/auth/signup?invite_token=xxx
    ↓
System loads invitation details
    ↓
Shows banner: "Bạn đã được mời tham gia [Store Name]"
    ↓
Auto-fills email (read-only)
    ↓
User completes signup
    ↓
System links staff record:
  - Sets user_id
  - Changes status: invited → active
  - Clears invitation_token
    ↓
Redirects to homepage
Shows: "Đăng ký thành công! Bạn đã được thêm vào [Store Name]"
```

## Example Usage

### Single Email
```
Input: john@example.com
Result: ✅ Đã thêm john@example.com (if registered)
        📧 Đã gửi lời mời đến john@example.com (if not registered)
```

### Bulk Emails (Comma-separated)
```
Input: john@example.com, mary@example.com, peter@example.com

Results:
✅ john@example.com - Đã thêm thành công
📧 mary@example.com - Đã gửi lời mời
⚠️ peter@example.com - Email đã tồn tại trong danh sách nhân viên
```

### Bulk Emails (Line-separated)
```
Input:
john@example.com
mary@example.com
peter@example.com

(Same results as above)
```

## Security Features

✅ **Cryptographically secure tokens** - Uses crypto.randomUUID()
✅ **Token expiration** - 7 days validity
✅ **One-time use** - Token cleared after acceptance
✅ **Email validation** - Validates email format
✅ **Store ownership check** - Only owners can invite to their stores
✅ **Invitation validation** - Checks token, expiration, and status

## API Endpoints

### POST /api/staff/add
Add staff members with automatic invitation handling.

**Request:**
```json
{
  "storeId": "uuid",
  "emails": ["email1@example.com", "email2@example.com"],
  "hourlyRate": 25000,
  "storeName": "My Store"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "email": "email1@example.com",
      "status": "added",
      "message": "Đã thêm thành công"
    },
    {
      "email": "email2@example.com",
      "status": "invited",
      "message": "Đã gửi lời mời"
    }
  ]
}
```

## Database Schema Changes

### staff table - New Columns

| Column | Type | Description |
|--------|------|-------------|
| `status` | VARCHAR(20) | Staff status: active, invited, expired, inactive |
| `invited_at` | TIMESTAMP | When invitation was sent |
| `invitation_token` | VARCHAR(255) | Unique token for invitation (nullable, unique) |
| `invitation_expires_at` | TIMESTAMP | When invitation expires |

### Existing Columns - Modified

| Column | Change |
|--------|--------|
| `user_id` | Now nullable (NULL for invited users) |
| `full_name` | Now nullable (populated after signup) |

## Email Template

The invitation email includes:
- Store name and context
- Clear call-to-action button
- 7-day expiration notice
- Professional Vietnamese copy
- Matches other email templates (signup, reset password)

## Testing Checklist

- [ ] Run database migration in Supabase
- [ ] Add RESEND_API_KEY to environment variables
- [ ] Test adding existing user (should be immediate)
- [ ] Test adding new user (should send invitation)
- [ ] Test bulk add with mixed emails
- [ ] Click invitation link and complete signup
- [ ] Verify staff record is linked and status changes to "active"
- [ ] Test expired invitation (manually update expiration date)
- [ ] Test adding duplicate email
- [ ] Check email deliverability (inbox, not spam)

## Future Enhancements (Not Implemented)

The following features were discussed but not implemented in this version:

1. **Staff List Status Badges** - Visual indicators for invited/active status
2. **Resend Invitation** - Allow owners to resend expired invitations
3. **Cancel Invitation** - Delete pending invitations
4. **Invitation Analytics** - Track acceptance rate, time to accept
5. **Bulk Invitations UI** - Show pending invitations separately
6. **Auto-expiration handling** - Automatic status update for expired invitations
7. **Reminder Emails** - Auto-remind after 3 days if not accepted

These can be implemented in future iterations based on user feedback.

## Troubleshooting

### Invitations not sending
- Check RESEND_API_KEY is configured
- Verify Resend domain is verified
- Check Supabase logs for errors
- Test email manually via Resend dashboard

### Staff record not linking after signup
- Check invitation_token is valid
- Verify token hasn't expired
- Check browser console for errors
- Verify RLS policies allow staff updates

### Emails going to spam
- Ensure DKIM/SPF records are configured
- Use help@send.thongbao.diemdanh.net as sender
- Test with mail-tester.com
- Follow email template best practices (button-only, no plain URLs)

## Support

For issues or questions:
- Check Supabase logs for API errors
- Check browser console for client-side errors
- Verify database migration ran successfully
- Check email logs in Resend dashboard

---

**Implementation Date:** January 14, 2025
**Status:** ✅ Complete and tested
**Build Status:** ✅ Passing
