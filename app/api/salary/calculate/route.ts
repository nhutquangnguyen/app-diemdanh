import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateStaffMonthlySalary } from '@/lib/salaryCalculations';

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

// Helper function to verify store ownership or staff membership
async function verifyAccess(userId: string, storeId: string) {
  // Check if user is the store owner
  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('owner_id')
    .eq('id', storeId)
    .single();

  if (store && store.owner_id === userId) {
    return { authorized: true, role: 'owner' };
  }

  // Check if user is a staff member
  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .single();

  if (staff) {
    return { authorized: true, role: 'staff', staffId: staff.id };
  }

  return { authorized: false, error: 'Access denied' };
}

/**
 * Calculate salary for staff members
 * POST /api/salary/calculate
 * Body: { userId, storeId, staffId?, month }
 */
export async function POST(request: Request) {
  console.log('💰 [SALARY CALCULATE API] POST called');

  try {
    const body = await request.json();
    const { userId, storeId, staffId, month } = body;

    console.log('💰 [SALARY CALCULATE API] Request:', { userId, storeId, staffId, month });

    if (!userId || !storeId || !month) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, storeId, month' },
        { status: 400 }
      );
    }

    // Verify access
    const { authorized, role, staffId: userStaffId, error: authError } = await verifyAccess(userId, storeId);
    if (!authorized) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    // If user is staff, they can only see their own salary
    const targetStaffId = role === 'staff' ? userStaffId : staffId;

    if (!targetStaffId) {
      return NextResponse.json(
        { error: 'staffId is required for salary calculation' },
        { status: 400 }
      );
    }

    // Fetch staff details
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('id', targetStaffId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Fetch store settings
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Fetch schedules for the month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from('staff_schedules')
      .select('*')
      .eq('staff_id', targetStaffId)
      .gte('scheduled_date', startDate.toISOString().split('T')[0])
      .lte('scheduled_date', endDate.toISOString().split('T')[0]);

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      return NextResponse.json(
        { error: 'Failed to fetch schedules' },
        { status: 500 }
      );
    }

    // Fetch shift templates for the store
    const { data: shifts, error: shiftsError } = await supabaseAdmin
      .from('shift_templates')
      .select('*')
      .eq('store_id', storeId);

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      return NextResponse.json(
        { error: 'Failed to fetch shifts' },
        { status: 500 }
      );
    }

    // Fetch check-ins for the month
    const { data: checkIns, error: checkInsError } = await supabaseAdmin
      .from('check_ins')
      .select('*')
      .eq('staff_id', targetStaffId)
      .gte('check_in_time', startDate.toISOString())
      .lte('check_in_time', endDate.toISOString());

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
      return NextResponse.json(
        { error: 'Failed to fetch check-ins' },
        { status: 500 }
      );
    }

    // Fetch salary adjustments for the month
    const { data: adjustments, error: adjustmentsError } = await supabaseAdmin
      .from('salary_adjustments')
      .select('*')
      .eq('staff_id', targetStaffId)
      .eq('month', month);

    if (adjustmentsError) {
      console.error('Error fetching adjustments:', adjustmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch adjustments' },
        { status: 500 }
      );
    }

    // Calculate salary using the existing function
    // Function signature: calculateStaffMonthlySalary(staff, store, month, schedules, shifts, checkIns, adjustments)
    const salaryResult = calculateStaffMonthlySalary(
      staff,
      store,
      month,
      schedules || [],
      shifts || [],
      checkIns || [],
      adjustments || []
    );

    console.log('✅ [SALARY CALCULATE API] Calculation complete:', {
      staffId: targetStaffId,
      month,
      finalAmount: salaryResult.final_amount
    });

    return NextResponse.json({
      success: true,
      data: salaryResult
    });

  } catch (error) {
    console.error('❌ [SALARY CALCULATE API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
