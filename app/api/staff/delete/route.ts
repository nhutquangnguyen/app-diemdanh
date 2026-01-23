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
  console.log('🗑️ [DELETE-STAFF API] Called');

  try {
    const body = await request.json();
    const { staffId, userId } = body;

    console.log('🗑️ [DELETE-STAFF API] Request body:', { staffId, userId });

    if (!staffId || !userId) {
      console.error('❌ [DELETE-STAFF API] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
      console.error('❌ [DELETE-STAFF API] Service role key not configured!');
      return NextResponse.json(
        { error: 'Server configuration error: Service role key missing' },
        { status: 500 }
      );
    }

    // First, get the staff record to check store ownership
    const { data: staffRecord, error: fetchError } = await supabaseAdmin
      .from('staff')
      .select('store_id, stores!inner(owner_id)')
      .eq('id', staffId)
      .single();

    if (fetchError || !staffRecord) {
      console.error('❌ [DELETE-STAFF API] Staff not found:', fetchError);
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    console.log('🗑️ [DELETE-STAFF API] Staff record:', staffRecord);

    // Check if the current user is the store owner
    const storeOwnerId = (staffRecord.stores as any)?.owner_id;
    if (storeOwnerId !== userId) {
      console.error('❌ [DELETE-STAFF API] User is not the store owner');
      return NextResponse.json(
        { error: 'Only store owner can delete staff members' },
        { status: 403 }
      );
    }

    // Delete the staff member using service role (bypasses RLS)
    const { error: deleteError, count } = await supabaseAdmin
      .from('staff')
      .delete({ count: 'exact' })
      .eq('id', staffId);

    if (deleteError) {
      console.error('❌ [DELETE-STAFF API] Database error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete staff member', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`✅ [DELETE-STAFF API] Successfully deleted staff. Rows affected: ${count}`);

    return NextResponse.json({
      success: true,
      deleted: true,
      count,
    });

  } catch (error) {
    console.error('❌ [DELETE-STAFF API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
