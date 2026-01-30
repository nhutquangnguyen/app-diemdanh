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
  console.log('🔗 [STUDENT LINK-ACCOUNT API] Called');

  try {
    const body = await request.json();
    const { userId, email, fullName, invitationToken } = body;

    console.log('🔗 [STUDENT LINK-ACCOUNT API] Request body:', { userId, email, fullName, hasToken: !!invitationToken });

    if (!userId || !email) {
      console.error('❌ [STUDENT LINK-ACCOUNT API] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
      console.error('❌ [STUDENT LINK-ACCOUNT API] Service role key not configured!');
      return NextResponse.json(
        { error: 'Server configuration error: Service role key missing' },
        { status: 500 }
      );
    }

    console.log('✅ [STUDENT LINK-ACCOUNT API] Service role key configured');

    // Find and update student records with matching email or invitation token
    const query = supabaseAdmin
      .from('students')
      .update({
        user_id: userId,
        full_name: fullName || null,
        status: 'active',
        invitation_token: null,
      })
      .is('user_id', null);

    // Match by invitation token if provided, otherwise by email
    if (invitationToken) {
      console.log('🔗 [STUDENT LINK-ACCOUNT API] Matching by invitation token');
      query.eq('invitation_token', invitationToken);
    } else {
      console.log('🔗 [STUDENT LINK-ACCOUNT API] Matching by email');
      query.eq('email', email);
    }

    const { data: updatedStudents, error } = await query.select('id, class_id, stores:class_id(name)');

    if (error) {
      console.error('❌ [STUDENT LINK-ACCOUNT API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to link student account', details: error.message },
        { status: 500 }
      );
    }

    if (!updatedStudents || updatedStudents.length === 0) {
      console.warn('⚠️ [STUDENT LINK-ACCOUNT API] No student records found to link');
      return NextResponse.json(
        { success: true, linked: false, message: 'No student records found to link' },
        { status: 200 }
      );
    }

    console.log(`✅ [STUDENT LINK-ACCOUNT API] Successfully linked ${updatedStudents.length} student record(s)`);

    // Return success with class information
    return NextResponse.json({
      success: true,
      linked: true,
      studentRecords: updatedStudents,
      classNames: updatedStudents.map(s => (s.stores as any)?.name).filter(Boolean),
    });

  } catch (error) {
    console.error('❌ [STUDENT LINK-ACCOUNT API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
