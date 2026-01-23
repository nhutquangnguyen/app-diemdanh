import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSmartSchedule } from '@/lib/smartSchedule';
import type {
  SmartScheduleShift,
  SmartScheduleAvailability,
} from '@/types';

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
    return { authorized: false, error: 'Only store owner can generate schedules' };
  }

  return { authorized: true };
}

/**
 * Generate smart schedule using AI algorithm (server-side for better performance)
 * POST /api/schedule/generate
 * Body: { userId, storeId, shifts, availability, staffList, allowMultipleShiftsPerDay }
 */
export async function POST(request: Request) {
  console.log('📅 [SCHEDULE GENERATE API] POST called');

  try {
    const body = await request.json();
    const {
      userId,
      storeId,
      shifts,
      availability,
      staffList,
      allowMultipleShiftsPerDay = true
    } = body;

    console.log('📅 [SCHEDULE GENERATE API] Request:', {
      userId,
      storeId,
      shiftsCount: shifts?.length,
      staffCount: staffList?.length
    });

    if (!userId || !storeId || !shifts || !availability || !staffList) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, storeId, shifts, availability, staffList' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { authorized, error: authError } = await verifyStoreOwnership(userId, storeId);
    if (!authorized) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    // Validate data types
    if (!Array.isArray(shifts) || !Array.isArray(staffList) || typeof availability !== 'object') {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    console.log('📅 [SCHEDULE GENERATE API] Starting algorithm...');
    const startTime = Date.now();

    // Run the smart schedule algorithm
    const result = generateSmartSchedule(
      shifts as SmartScheduleShift[],
      availability as SmartScheduleAvailability,
      staffList as string[],
      allowMultipleShiftsPerDay
    );

    const duration = Date.now() - startTime;
    console.log(`✅ [SCHEDULE GENERATE API] Algorithm completed in ${duration}ms`);
    console.log(`📊 [SCHEDULE GENERATE API] Fairness score: ${result.stats.fairnessScore}`);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        duration,
        shiftsProcessed: shifts.length,
        staffCount: staffList.length
      }
    });

  } catch (error) {
    console.error('❌ [SCHEDULE GENERATE API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
