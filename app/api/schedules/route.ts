import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Create admin client with service role (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to verify store ownership
async function verifyStoreOwnership(userId: string, storeId: string) {
  const { data: store, error } = await supabaseAdmin
    .from('stores')
    .select('owner_id')
    .eq('id', storeId)
    .single();

  if (error || !store) {
    return { authorized: false, error: 'Store not found' };
  }

  if (store.owner_id !== userId) {
    return { authorized: false, error: 'Only store owner can manage schedules' };
  }

  return { authorized: true };
}

// CREATE schedules (bulk insert)
export async function POST(request: Request) {
  console.log('➕ [SCHEDULES API] POST called');

  try {
    const body = await request.json();
    const { userId, storeId, schedules } = body;

    console.log('➕ [SCHEDULES API] Request:', { userId, storeId, schedulesCount: schedules?.length });

    if (!userId || !storeId || !schedules || !Array.isArray(schedules)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { authorized, error: authError } = await verifyStoreOwnership(userId, storeId);
    if (!authorized) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    // Insert schedules
    const { data, error } = await supabaseAdmin
      .from('staff_schedules')
      .insert(schedules)
      .select();

    if (error) {
      console.error('❌ [SCHEDULES API] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create schedules', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    console.log(`✅ [SCHEDULES API] Created ${data.length} schedule(s)`);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('❌ [SCHEDULES API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE schedules
export async function DELETE(request: Request) {
  console.log('🗑️ [SCHEDULES API] DELETE called');

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const storeId = searchParams.get('storeId');
    const scheduleIds = searchParams.get('scheduleIds');
    const scheduleId = searchParams.get('scheduleId');
    const staffId = searchParams.get('staffId');
    const scheduledDates = searchParams.get('scheduledDates');
    const scheduledDate = searchParams.get('scheduledDate');

    console.log('🗑️ [SCHEDULES API] Request:', {
      userId, storeId, scheduleIds, scheduleId, staffId, scheduledDates, scheduledDate
    });

    if (!userId || !storeId) {
      return NextResponse.json(
        { error: 'Missing userId or storeId' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { authorized, error: authError } = await verifyStoreOwnership(userId, storeId);
    if (!authorized) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    let query = supabaseAdmin.from('staff_schedules').delete({ count: 'exact' });

    // Handle different delete scenarios
    if (scheduleIds) {
      // Delete specific schedule IDs
      const ids = scheduleIds.split(',');
      query = query.in('id', ids);
    } else if (scheduleId) {
      // Delete single schedule
      query = query.eq('id', scheduleId);
    } else if (staffId && scheduledDates) {
      // Delete by staff and multiple dates
      const dates = scheduledDates.split(',');
      query = query.eq('store_id', storeId).eq('staff_id', staffId).in('scheduled_date', dates);
    } else if (scheduledDate && staffId) {
      // Delete by date and staff
      query = query.eq('store_id', storeId).eq('scheduled_date', scheduledDate).eq('staff_id', staffId);
    } else if (scheduledDate) {
      // Delete all schedules for a specific date
      query = query.eq('store_id', storeId).eq('scheduled_date', scheduledDate);
    } else {
      return NextResponse.json(
        { error: 'Must specify scheduleIds, scheduleId, scheduledDate, or staffId+scheduledDates' },
        { status: 400 }
      );
    }

    const { error, count } = await query;

    if (error) {
      console.error('❌ [SCHEDULES API] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete schedules', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ [SCHEDULES API] Deleted ${count} schedule(s)`);
    return NextResponse.json({ success: true, count });

  } catch (error) {
    console.error('❌ [SCHEDULES API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
