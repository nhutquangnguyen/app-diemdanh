import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Node.js runtime - this is a batch endpoint that combines multiple queries
// Not latency-critical, optimized for reducing total number of edge requests

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

/**
 * Batch endpoint to fetch all dashboard data in a single request
 * Reduces 4-5 separate API calls into 1 call
 * GET /api/dashboard-data?storeId=xxx&date=YYYY-MM-DD
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    // Calculate date range for check-ins
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    console.log(`📊 [DASHBOARD BATCH] Fetching all data for store ${storeId}`);

    // Execute all queries in parallel (single round trip)
    const [storeResult, staffResult, shiftsResult, schedulesResult, checkInsResult] = await Promise.all([
      // Store details
      supabaseAdmin
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single(),

      // Staff list
      supabaseAdmin
        .from('staff')
        .select('*')
        .eq('store_id', storeId)
        .order('name'),

      // Shift templates
      supabaseAdmin
        .from('shift_templates')
        .select('*')
        .eq('store_id', storeId)
        .order('start_time'),

      // Today's schedules
      supabaseAdmin
        .from('staff_schedules')
        .select('*')
        .eq('store_id', storeId)
        .eq('scheduled_date', date),

      // Today's check-ins
      supabaseAdmin
        .from('check_ins')
        .select('*')
        .eq('store_id', storeId)
        .gte('check_in_time', startDate.toISOString())
        .lte('check_in_time', endDate.toISOString())
        .order('check_in_time', { ascending: false }),
    ]);

    // Check for errors
    if (storeResult.error) throw new Error(`Store fetch failed: ${storeResult.error.message}`);
    if (staffResult.error) throw new Error(`Staff fetch failed: ${staffResult.error.message}`);
    if (shiftsResult.error) throw new Error(`Shifts fetch failed: ${shiftsResult.error.message}`);
    if (schedulesResult.error) throw new Error(`Schedules fetch failed: ${schedulesResult.error.message}`);
    if (checkInsResult.error) throw new Error(`Check-ins fetch failed: ${checkInsResult.error.message}`);

    const response = {
      store: storeResult.data,
      staff: staffResult.data || [],
      shifts: shiftsResult.data || [],
      schedules: schedulesResult.data || [],
      checkIns: checkInsResult.data || [],
      meta: {
        fetchedAt: new Date().toISOString(),
        date,
        storeId,
      },
    };

    console.log(`✅ [DASHBOARD BATCH] Success: ${staffResult.data?.length || 0} staff, ${checkInsResult.data?.length || 0} check-ins`);

    return NextResponse.json(response, {
      headers: {
        // Cache for 2 minutes on CDN
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });

  } catch (error) {
    console.error('❌ [DASHBOARD BATCH] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
