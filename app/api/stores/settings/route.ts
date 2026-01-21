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

export async function POST(request: Request) {
  console.log('⚙️ [STORE-SETTINGS API] Called');

  try {
    const body = await request.json();
    const { userId, storeId, settings } = body;

    console.log('⚙️ [STORE-SETTINGS API] Request:', { userId, storeId, settings });

    if (!userId || !storeId || !settings) {
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
      .is('deleted_at', null)
      .single();

    if (storeError || !store) {
      console.error('❌ [STORE-SETTINGS API] Store not found:', storeError);
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    if (store.owner_id !== userId) {
      console.error('❌ [STORE-SETTINGS API] User is not the store owner');
      return NextResponse.json(
        { error: 'Only store owner can update settings' },
        { status: 403 }
      );
    }

    // Update store settings
    const { data, error } = await supabaseAdmin
      .from('stores')
      .update(settings)
      .eq('id', storeId)
      .select()
      .single();

    if (error) {
      console.error('❌ [STORE-SETTINGS API] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update store settings', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [STORE-SETTINGS API] Settings updated successfully');
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('❌ [STORE-SETTINGS API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
