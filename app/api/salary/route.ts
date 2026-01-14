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
    return { authorized: false, error: 'Only store owner can manage salary' };
  }

  return { authorized: true };
}

// CREATE/UPDATE salary operations
export async function POST(request: Request) {
  console.log('💰 [SALARY API] POST called');

  try {
    const body = await request.json();
    const { userId, storeId, operation, data } = body;

    console.log('💰 [SALARY API] Request:', { userId, storeId, operation });

    if (!userId || !storeId || !operation) {
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

    // Handle different salary operations
    switch (operation) {
      case 'update_confirmation': {
        const { confirmationId, status, paid_at } = data;
        const { data: result, error } = await supabaseAdmin
          .from('salary_confirmations')
          .update({ status, paid_at })
          .eq('id', confirmationId)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data: result });
      }

      case 'create_confirmation': {
        const { staffId, month, total_salary, status } = data;
        const { data: result, error } = await supabaseAdmin
          .from('salary_confirmations')
          .insert([{
            staff_id: staffId,
            store_id: storeId,
            month,
            total_salary,
            status,
            paid_at: status === 'paid' ? new Date().toISOString() : null,
          }])
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data: result });
      }

      case 'update_adjustment': {
        const { adjustmentId, type, amount, adjustment_date, description } = data;
        const { data: result, error } = await supabaseAdmin
          .from('salary_adjustments')
          .update({
            type,
            amount,
            adjustment_date,
            description,
          })
          .eq('id', adjustmentId)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data: result });
      }

      case 'create_adjustment': {
        const { staffId, type, amount, adjustment_date, description } = data;
        const { data: result, error } = await supabaseAdmin
          .from('salary_adjustments')
          .insert([{
            staff_id: staffId,
            store_id: storeId,
            type,
            amount,
            adjustment_date,
            description: description || null,
          }])
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ [SALARY API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE salary adjustment
export async function DELETE(request: Request) {
  console.log('🗑️ [SALARY API] DELETE called');

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const storeId = searchParams.get('storeId');
    const adjustmentId = searchParams.get('adjustmentId');

    console.log('🗑️ [SALARY API] Request:', { userId, storeId, adjustmentId });

    if (!userId || !storeId || !adjustmentId) {
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

    // Delete adjustment
    const { error, count } = await supabaseAdmin
      .from('salary_adjustments')
      .delete({ count: 'exact' })
      .eq('id', adjustmentId);

    if (error) {
      console.error('❌ [SALARY API] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete adjustment', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ [SALARY API] Deleted adjustment`);
    return NextResponse.json({ success: true, count });

  } catch (error) {
    console.error('❌ [SALARY API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
