# Edge Runtime Optimization Strategy

## Current Situation
You have **17 edge runtime API routes** that are called frequently. Here's how to reduce edge access costs:

---

## 🎯 Strategy 1: Aggressive Client-Side Caching (Highest Impact)

### What We Already Have
✅ React Query with 5-minute stale time

### What to Add

#### A. Increase Cache Times for Static Data
```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});
```

**Optimize per data type:**
```typescript
// hooks/useQueries.ts

// Staff data (changes rarely) - 15 minutes
export function useStaff(storeId: string) {
  return useQuery({
    queryKey: queryKeys.staff(storeId),
    queryFn: async () => { /* ... */ },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Store settings (changes rarely) - 30 minutes
export function useStore(storeId: string) {
  return useQuery({
    queryKey: queryKeys.store(storeId),
    queryFn: async () => { /* ... */ },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

// Shifts (changes rarely) - 1 hour
export function useShifts(storeId: string) {
  return useQuery({
    queryKey: queryKeys.shifts(storeId),
    queryFn: async () => { /* ... */ },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 120, // 2 hours
  });
}

// Check-ins (changes frequently) - 1 minute
export function useCheckIns(params: CheckInsParams) {
  return useQuery({
    queryKey: queryKeys.checkIns(params),
    queryFn: async () => { /* ... */ },
    staleTime: 1000 * 60 * 1, // 1 minute (current data)
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}
```

**Expected Reduction:** 60-70% fewer API calls

---

## 🎯 Strategy 2: Direct Supabase Queries (Bypass Edge Routes)

### Why This Works
- Supabase client calls go directly to Supabase (not your edge functions)
- No edge compute costs
- Faster (no middleware layer)

### Implementation

**CURRENT APPROACH (Uses Edge):**
```typescript
// ❌ Goes through your edge API
const response = await fetch('/api/salary/calculate', {
  method: 'POST',
  body: JSON.stringify({ userId, storeId, staffId, month })
});
```

**OPTIMIZED APPROACH (Direct Supabase):**
```typescript
// ✅ Direct to Supabase (no edge cost)
const { data: staff } = await supabase
  .from('staff')
  .select('*')
  .eq('id', staffId)
  .single();

const { data: schedules } = await supabase
  .from('staff_schedules')
  .select('*')
  .eq('staff_id', staffId);

// Calculate on client (or only use edge for complex calculations)
const salary = calculateStaffMonthlySalary(staff, store, month, schedules, ...);
```

**When to Keep Edge Routes:**
- Operations requiring **service role key** (bypassing RLS)
- Complex calculations that would slow mobile devices
- Operations requiring server-side secrets

**When to Use Direct Supabase:**
- Read operations with proper RLS policies
- Simple CRUD operations
- Real-time subscriptions

**Expected Reduction:** 40-50% fewer edge calls

---

## 🎯 Strategy 3: Implement Request Deduplication

### Problem
Multiple components request the same data simultaneously.

### Solution: React Query Already Handles This!
But ensure you're using it everywhere:

```typescript
// ❌ BAD: Direct fetch (no deduplication)
useEffect(() => {
  fetch('/api/staff/list').then(...)
}, []);

// ✅ GOOD: React Query deduplicates automatically
const { data: staff } = useStaff(storeId);
```

**Expected Reduction:** 30-40% fewer duplicate calls

---

## 🎯 Strategy 4: Batch API Requests

### Current Problem
```typescript
// ❌ 3 separate edge calls
const staff = await fetch('/api/staff/list?storeId=123');
const shifts = await fetch('/api/shifts?storeId=123');
const schedules = await fetch('/api/schedules?storeId=123');
```

### Solution: Create Batch Endpoint
```typescript
// ✅ 1 edge call
const data = await fetch('/api/store-data-batch?storeId=123');
// Returns: { staff, shifts, schedules, checkIns }
```

**Example Implementation:**
```typescript
// app/api/store-data-batch/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');

  const [staff, shifts, schedules, checkIns] = await Promise.all([
    supabaseAdmin.from('staff').select('*').eq('store_id', storeId),
    supabaseAdmin.from('shift_templates').select('*').eq('store_id', storeId),
    supabaseAdmin.from('staff_schedules').select('*').eq('store_id', storeId),
    supabaseAdmin.from('check_ins').select('*').eq('store_id', storeId).gte('check_in_time', today),
  ]);

  return NextResponse.json({ staff, shifts, schedules, checkIns });
}
```

**Expected Reduction:** 50-60% fewer edge calls

---

## 🎯 Strategy 5: Local Storage / IndexedDB Caching

### For Rarely-Changing Data
```typescript
// hooks/usePersistedQuery.ts
import { useQuery } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

// Store data persists across page refreshes
export function usePersistedStore(storeId: string) {
  return useQuery({
    queryKey: ['store', storeId],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('*').eq('id', storeId).single();
      return data;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

// In App setup
persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
});
```

**Expected Reduction:** 20-30% fewer calls (especially on page reloads)

---

## 🎯 Strategy 6: Use Supabase Realtime Instead of Polling

### Current Issue
If you're polling for updates, you're making repeated edge calls.

### Solution: Supabase Realtime Subscriptions
```typescript
// hooks/useRealtimeCheckIns.ts
export function useRealtimeCheckIns(storeId: string) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  useEffect(() => {
    // Initial fetch (1 edge call)
    supabase
      .from('check_ins')
      .select('*')
      .eq('store_id', storeId)
      .then(({ data }) => setCheckIns(data || []));

    // Subscribe to changes (no edge calls, uses Supabase WebSocket)
    const subscription = supabase
      .channel(`check_ins:${storeId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'check_ins', filter: `store_id=eq.${storeId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCheckIns(prev => [...prev, payload.new as CheckIn]);
          } else if (payload.eventType === 'UPDATE') {
            setCheckIns(prev => prev.map(c => c.id === payload.new.id ? payload.new as CheckIn : c));
          } else if (payload.eventType === 'DELETE') {
            setCheckIns(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [storeId]);

  return checkIns;
}
```

**Expected Reduction:** 80-90% fewer calls for real-time data

---

## 🎯 Strategy 7: Optimize Edge Routes to Node.js Runtime

### Analysis
Not all routes need edge runtime. Edge is best for:
- Global low-latency (users worldwide)
- Streaming responses
- Simple, fast operations

### Recommendation
Convert these to Node.js runtime (free tier):
```typescript
// app/api/salary/calculate/route.ts
// ❌ Remove this line for non-critical routes
// export const runtime = 'edge';

// ✅ Use default Node.js runtime (no edge costs)
export async function POST(request: Request) {
  // ... same code
}
```

**Keep Edge For:**
- Authentication endpoints (low latency critical)
- Check-in/checkout (user experience critical)

**Move to Node.js:**
- Salary calculations (can tolerate 100-200ms extra)
- Report generation
- Schedule generation (already slow, won't notice difference)

**Expected Savings:** 30-40% reduction in edge costs

---

## 🎯 Strategy 8: Implement HTTP Caching Headers

### Add Cache Headers to API Routes
```typescript
// app/api/staff/route.ts
export async function GET(request: Request) {
  const data = await fetchStaff();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      // Cache for 5 minutes, serve stale up to 10 minutes while revalidating
    },
  });
}
```

**Expected Reduction:** 40-50% fewer executions (CDN serves cached responses)

---

## 📊 Combined Impact Estimate

| Strategy | Reduction | Difficulty | Priority |
|----------|-----------|------------|----------|
| 1. Aggressive caching | 60-70% | Easy | 🔥 High |
| 2. Direct Supabase | 40-50% | Medium | 🔥 High |
| 3. Request deduplication | 30-40% | Easy | 🔥 High |
| 4. Batch requests | 50-60% | Medium | Medium |
| 5. LocalStorage cache | 20-30% | Medium | Low |
| 6. Realtime subscriptions | 80-90% | Medium | Medium |
| 7. Node.js runtime | 30-40% | Easy | 🔥 High |
| 8. HTTP cache headers | 40-50% | Easy | 🔥 High |

**Total Estimated Reduction: 70-85% fewer edge invocations**

---

## 🚀 Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Increase React Query cache times per data type
2. ✅ Add HTTP cache headers to API routes
3. ✅ Convert non-critical routes to Node.js runtime
4. ✅ Ensure all data fetching uses React Query (no raw fetch)

### Phase 2: Medium Effort (4-6 hours)
5. Create batch API endpoint for dashboard data
6. Replace polling with Supabase realtime subscriptions
7. Migrate read-only operations to direct Supabase queries

### Phase 3: Advanced (8+ hours)
8. Implement LocalStorage/IndexedDB persistence
9. Add service worker for offline caching
10. Implement GraphQL endpoint for flexible batching

---

## 💰 Cost Savings Estimate

**Current Edge Invocations (Estimated):**
- 100 active users/day × 50 actions/user = 5,000 invocations/day
- 150,000 invocations/month

**After Optimization:**
- 70% reduction = 45,000 invocations/month
- **105,000 fewer invocations/month**

**Vercel Edge Pricing:**
- First 100k requests: Free
- Additional: $0.65 per 1M requests

**Monthly Savings:**
- Staying within free tier or significant cost reduction if already paid

---

## 🛠️ Next Steps

Would you like me to implement:
1. **Phase 1 Quick Wins** (highest ROI, easiest implementation)?
2. **Batch API endpoint** for the dashboard?
3. **Realtime subscriptions** for check-ins?
4. **All of the above**?

Let me know which approach you'd like to start with!
