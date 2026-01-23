import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Node.js runtime to reduce Vercel Edge Request costs
// export const runtime = 'edge';

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

export async function POST(request: Request) {
  console.log('✏️ [UPDATE-STAFF API] Called');

  try {
    const body = await request.json();
    const { userId, staffId, salaryType, hourRate, monthlyRate, dailyRate, name } = body;

    console.log('✏️ [UPDATE-STAFF API] Request:', { userId, staffId, salaryType, hourRate, monthlyRate, dailyRate, name });

    if (!userId || !staffId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get staff record and verify ownership
    const { data: staffRecord, error: fetchError } = await supabaseAdmin
      .from('staff')
      .select('store_id, stores!inner(owner_id)')
      .eq('id', staffId)
      .single();

    if (fetchError || !staffRecord) {
      console.error('❌ [UPDATE-STAFF API] Staff not found:', fetchError);
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Check if the current user is the store owner
    const storeOwnerId = (staffRecord.stores as any)?.owner_id;
    if (storeOwnerId !== userId) {
      console.error('❌ [UPDATE-STAFF API] User is not the store owner');
      return NextResponse.json(
        { error: 'Only store owner can update staff information' },
        { status: 403 }
      );
    }

    // Update staff info
    const updateData: any = {};
    if (salaryType !== undefined) updateData.salary_type = salaryType;
    if (hourRate !== undefined) updateData.hour_rate = hourRate;
    if (monthlyRate !== undefined) updateData.monthly_rate = monthlyRate;
    if (dailyRate !== undefined) updateData.daily_rate = dailyRate;
    if (name !== undefined) updateData.name = name;

    const { data, error } = await supabaseAdmin
      .from('staff')
      .update(updateData)
      .eq('id', staffId)
      .select()
      .single();

    if (error) {
      console.error('❌ [UPDATE-STAFF API] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update staff', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [UPDATE-STAFF API] Staff updated successfully');
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('❌ [UPDATE-STAFF API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
