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

// CREATE shift
export async function POST(request: Request) {
  console.log('➕ [SHIFTS API] POST called');

  try {
    const body = await request.json();
    const { userId, storeId, shiftData } = body;

    console.log('➕ [SHIFTS API] Request:', { userId, storeId, shiftData });

    if (!userId || !storeId || !shiftData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is store owner
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('owner_id')
      .eq('id', storeId)
      .single();

    if (storeError || !store || store.owner_id !== userId) {
      return NextResponse.json(
        { error: 'Only store owner can create shifts' },
        { status: 403 }
      );
    }

    // Create shift
    const { data, error } = await supabaseAdmin
      .from('shift_templates')
      .insert([{
        store_id: storeId,
        ...shiftData,
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ [SHIFTS API] Create error:', error);
      return NextResponse.json(
        { error: 'Failed to create shift', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [SHIFTS API] Shift created:', data.id);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('❌ [SHIFTS API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// UPDATE shift
export async function PUT(request: Request) {
  console.log('✏️ [SHIFTS API] PUT called');

  try {
    const body = await request.json();
    const { userId, shiftId, shiftData } = body;

    console.log('✏️ [SHIFTS API] Request:', { userId, shiftId, shiftData });

    if (!userId || !shiftId || !shiftData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get shift and verify ownership
    const { data: shift, error: fetchError } = await supabaseAdmin
      .from('shift_templates')
      .select('store_id, stores!inner(owner_id)')
      .eq('id', shiftId)
      .single();

    if (fetchError || !shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    const storeOwnerId = (shift.stores as any)?.owner_id;
    if (storeOwnerId !== userId) {
      return NextResponse.json(
        { error: 'Only store owner can update shifts' },
        { status: 403 }
      );
    }

    // Update shift
    const { data, error } = await supabaseAdmin
      .from('shift_templates')
      .update({
        ...shiftData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) {
      console.error('❌ [SHIFTS API] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update shift', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [SHIFTS API] Shift updated:', data.id);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('❌ [SHIFTS API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE shift
export async function DELETE(request: Request) {
  console.log('🗑️ [SHIFTS API] DELETE called');

  try {
    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId');
    const userId = searchParams.get('userId');

    console.log('🗑️ [SHIFTS API] Request:', { userId, shiftId });

    if (!userId || !shiftId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get shift and verify ownership
    const { data: shift, error: fetchError } = await supabaseAdmin
      .from('shift_templates')
      .select('store_id, stores!inner(owner_id)')
      .eq('id', shiftId)
      .single();

    if (fetchError || !shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    const storeOwnerId = (shift.stores as any)?.owner_id;
    if (storeOwnerId !== userId) {
      return NextResponse.json(
        { error: 'Only store owner can delete shifts' },
        { status: 403 }
      );
    }

    // Delete shift
    const { error } = await supabaseAdmin
      .from('shift_templates')
      .delete()
      .eq('id', shiftId);

    if (error) {
      console.error('❌ [SHIFTS API] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete shift', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [SHIFTS API] Shift deleted');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [SHIFTS API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
