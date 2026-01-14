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
  console.log('🔗 [LINK-ACCOUNT API] Called');

  try {
    const body = await request.json();
    const { userId, email, fullName, invitationToken } = body;

    console.log('🔗 [LINK-ACCOUNT API] Request body:', { userId, email, fullName, hasToken: !!invitationToken });

    if (!userId || !email) {
      console.error('❌ [LINK-ACCOUNT API] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
      console.error('❌ [LINK-ACCOUNT API] Service role key not configured!');
      return NextResponse.json(
        { error: 'Server configuration error: Service role key missing' },
        { status: 500 }
      );
    }

    console.log('✅ [LINK-ACCOUNT API] Service role key configured');

    // Find and update staff records with matching email or invitation token
    const query = supabaseAdmin
      .from('staff')
      .update({
        user_id: userId,
        full_name: fullName || null,
        status: 'active',
        invitation_token: null,
      })
      .is('user_id', null);

    // Match by invitation token if provided, otherwise by email
    if (invitationToken) {
      console.log('🔗 [LINK-ACCOUNT API] Matching by invitation token');
      query.eq('invitation_token', invitationToken);
    } else {
      console.log('🔗 [LINK-ACCOUNT API] Matching by email');
      query.eq('email', email);
    }

    const { data: updatedStaff, error } = await query.select('id, store_id, stores(name)');

    if (error) {
      console.error('❌ [LINK-ACCOUNT API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to link staff account', details: error.message },
        { status: 500 }
      );
    }

    if (!updatedStaff || updatedStaff.length === 0) {
      console.warn('⚠️ [LINK-ACCOUNT API] No staff records found to link');
      return NextResponse.json(
        { success: true, linked: false, message: 'No staff records found to link' },
        { status: 200 }
      );
    }

    console.log(`✅ [LINK-ACCOUNT API] Successfully linked ${updatedStaff.length} staff record(s)`);

    // Return success with store information
    return NextResponse.json({
      success: true,
      linked: true,
      staffRecords: updatedStaff,
      storeNames: updatedStaff.map(s => (s.stores as any)?.name).filter(Boolean),
    });

  } catch (error) {
    console.error('❌ [LINK-ACCOUNT API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
