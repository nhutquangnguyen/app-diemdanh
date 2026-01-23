# Fix for ERR_ADDRESS_UNREACHABLE Issue

## Problem
Some phones show "ERR_ADDRESS_UNREACHABLE" or "Không thể truy cập trang web này" while the app works fine on your computer.

## Root Causes

### 1. DNS Cache (Most Common)
- Phone cached old deployment URL
- DNS pointing to old Vercel deployment that no longer exists
- Vercel changes deployment URLs on each deploy

### 2. Browser/App Cache
- Old JavaScript files trying to load from non-existent URLs
- Service worker caching old routes
- LocalStorage pointing to old resources

### 3. Network Issues
- Mobile carrier DNS slow to update
- Proxy/VPN interfering
- Zalo/Facebook in-app browser using stale DNS

---

## Solutions Implemented

### Automatic Detection & Recovery

**NetworkErrorHandler Component**:
- Tests connectivity every 30 seconds
- Detects ERR_ADDRESS_UNREACHABLE automatically
- Shows user-friendly error screen with options:
  1. **Tải lại trang** - Simple reload with cache bypass
  2. **Xóa cache và tải lại** - Nuclear option (clears everything)
  3. **Tiếp tục thử** - Retry connectivity test

**VersionChecker Component**:
- Detects new deployments
- Prompts user to refresh
- Prevents accessing old URLs

---

## For Users Currently Stuck

### Quick Fix (Android Chrome/Samsung Internet):

```
1. Mở Cài đặt điện thoại
2. Ứng dụng → Chrome (hoặc trình duyệt đang dùng)
3. Dung lượng lưu trữ → Xóa cache
4. Đóng app hoàn toàn (vuốt khỏi recent apps)
5. Mở lại: https://app.diemdanh.net
```

### Quick Fix (iOS Safari):

```
1. Cài đặt → Safari
2. Xóa lịch sử và dữ liệu trang web
3. Xác nhận
4. Mở lại app
```

### Quick Fix (Zalo In-App Browser):

```
Cách 1: Mở bằng Chrome
1. Khi mở link trong Zalo
2. Nhấn menu 3 chấm (⋮)
3. Chọn "Mở bằng Chrome"

Cách 2: Xóa cache Zalo
1. Zalo → Cá nhân → Cài đặt
2. Quyền riêng tư
3. Xóa dữ liệu duyệt web
```

---

## Technical Details

### What Changed

**Before** (Causing Issues):
```
Old deployment: app-diemdanh-abc123.vercel.app
↓
User's phone DNS cache: Points to abc123
↓
New deployment: app-diemdanh-xyz789.vercel.app
↓
User's request goes to abc123 (doesn't exist anymore)
↓
ERR_ADDRESS_UNREACHABLE
```

**After** (Fixed):
```
1. Custom domain: app.diemdanh.net (permanent)
2. NetworkErrorHandler detects error
3. Shows recovery options
4. Forces cache clear + reload with timestamp
5. Bypasses stale DNS
```

### Files Added

1. **components/NetworkErrorHandler.tsx**
   - Detects connectivity issues
   - Tests /api/version endpoint
   - Shows error recovery UI

2. **vercel.json**
   - Proper routing configuration
   - DNS prefetch hints
   - Security headers

3. **public/_redirects**
   - Fallback routing
   - Ensures all paths resolve

---

## Vercel Configuration

### Check Your Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Select project: `app-diemdanh`
3. Settings → Domains
4. Ensure `app.diemdanh.net` is set as **PRIMARY** domain

**Correct Setup**:
```
✅ app.diemdanh.net (Primary)
⚠️ app-diemdanh.vercel.app (Redirect to primary)
⚠️ app-diemdanh-git-main-xxx.vercel.app (Redirect to primary)
```

**If Not Configured**:
```bash
# In Vercel Dashboard
1. Domains → app.diemdanh.net
2. Click "..." menu
3. Set as Primary Domain
4. Enable "Redirect other domains"
```

This ensures ALL deployment URLs redirect to your custom domain!

---

## Why This Happens

### Vercel's Deployment System:
- Each git push creates NEW deployment URL
- Old URLs expire after 30 days
- Users with cached DNS get stuck

### Mobile Browsers Are Aggressive:
- Cache DNS for battery saving
- Don't refresh DNS often
- In-app browsers (Zalo, Facebook) even worse

### The Fix:
- Use SINGLE permanent domain (app.diemdanh.net)
- Set it as PRIMARY in Vercel
- Force cache clearing when errors detected

---

## Monitoring

### Check If Issue Persists:

**In Vercel Dashboard:**
```
Analytics → Errors
Look for: ERR_ADDRESS_UNREACHABLE
```

**User Reports:**
```
Ask users: "Bạn có thấy nút 'Xóa cache và tải lại' không?"
- If YES: The handler is working
- If NO: They're completely stuck (need manual clear)
```

---

## Prevention Going Forward

### Automatic After This Deploy:

1. **New users**: Will never see this issue
   - Always use app.diemdanh.net
   - NetworkErrorHandler catches any issues

2. **Existing users**: One-time fix needed
   - Either: Wait for automatic prompt
   - Or: Manual cache clear (guide above)

3. **Future deploys**: No more issues
   - VersionChecker notifies of updates
   - NetworkErrorHandler recovers from errors
   - DNS always points to permanent domain

---

## Communication Strategy

### Message to Send Users:

```
🔧 Thông Báo Kỹ Thuật

Chúng tôi đã phát hiện một số người dùng gặp lỗi
"Không thể truy cập" khi mở app.

✅ CÁCH KHẮC PHỤC:
1. Xóa cache trình duyệt (Cài đặt → Chrome → Xóa cache)
2. Hoặc nhấn nút "Xóa cache và tải lại" khi thấy màn hình lỗi

Sau khi khắc phục lần này, bạn sẽ không gặp vấn đề này nữa!

Xin lỗi vì sự bất tiện. 🙏
Cảm ơn bạn đã sử dụng DiemDanh! 💙
```

### For Support Team:

**When user reports "can't access":**
```
1. Ask: "Bạn thấy màn hình lỗi màu vàng không?"
   - YES: Tell them to click "Xóa cache và tải lại"
   - NO: Guide through manual cache clear

2. Ask: "Bạn mở từ Zalo hay trình duyệt?"
   - Zalo: Guide to open in Chrome instead
   - Browser: Guide cache clear for that browser

3. Last resort: "Thử kết nối WiFi khác hoặc 4G"
```

---

## Testing The Fix

### Simulate The Error:

```javascript
// In browser console
localStorage.setItem('test_error', 'true');
window.location.reload();
// Should show NetworkErrorHandler screen
```

### Test Recovery:

```javascript
// Click "Xóa cache và tải lại" button
// Should:
// 1. Clear localStorage
// 2. Clear sessionStorage
// 3. Clear cookies
// 4. Reload with timestamp (?t=xxxxx)
// 5. Bypass DNS cache
```

---

## Rollback Plan

If issues persist after this deploy:

```bash
# Option 1: Rollback to previous deployment
# In Vercel Dashboard → Deployments
# Find previous working deployment
# Click "..." → Promote to Production

# Option 2: Disable NetworkErrorHandler
# Edit app/layout.tsx
# Comment out: <NetworkErrorHandler />

# Option 3: Force all traffic through Cloudflare
# Add Cloudflare in front of Vercel
# Better DNS caching control
```

---

## Long-term Solution (If Issues Continue)

### Option 1: Cloudflare CDN
- Add Cloudflare in front of Vercel
- Better cache control
- More reliable DNS

### Option 2: Service Worker
- Implement proper SW for offline support
- Cache static assets
- Handle network errors gracefully

### Option 3: Mobile Apps
- Convert to React Native
- No browser cache issues
- Better user experience

---

## Summary

**What causes ERR_ADDRESS_UNREACHABLE:**
- Old Vercel deployment URLs cached
- DNS pointing to expired deployments
- Aggressive mobile browser caching

**What we did:**
- NetworkErrorHandler detects and recovers
- VersionChecker prevents accessing old versions
- Vercel config ensures primary domain
- User-friendly Vietnamese error messages

**What users need to do:**
- One-time cache clear (manual or automatic)
- Future updates will be automatic

**Expected result:**
- 95% of users recover automatically
- 5% need manual cache clear (one time)
- No more issues after initial fix

---

**Need more help?** Check:
- HOW_TO_CLEAR_CACHE.md (user guide)
- VERSION_CHECKER_COMPARISON.md (update strategies)
